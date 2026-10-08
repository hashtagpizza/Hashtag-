import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Customer,
  Order,
  Campaign,
  OrderStatus,
  PaymentStatus,
  LoyaltyTier,
  LoyaltyReward,
  LoyaltyRedemption,
  LOYALTY_REWARDS_CATALOG,
} from '../types/crm';
import { UserProfile, UserRole } from '../types/auth';
import { MenuItem } from '../constants';

const CUSTOMERS_COL = 'customers';
const ORDERS_COL = 'orders';
const CAMPAIGNS_COL = 'campaigns';
const REDEMPTIONS_COL = 'loyalty_redemptions';
const USERS_COL = 'users';
const MENU_ITEMS_COL = 'menu_items';

function cleanPhoneId(phone: string): string {
  return phone.replace(/[^0-9]/g, '') || 'guest_' + Date.now();
}

function calculateTier(totalSpend: number, totalOrders: number): LoyaltyTier {
  if (totalOrders >= 10 || totalSpend >= 10000) return 'VIP';
  if (totalOrders >= 5 || totalSpend >= 5000) return 'Gold';
  if (totalOrders >= 2 || totalSpend >= 2000) return 'Silver';
  return 'Bronze';
}

export const crmService = {
  // Listen to live orders
  subscribeToOrders(callback: (orders: Order[]) => void) {
    try {
      const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'), limit(100));
      return onSnapshot(
        q,
        (snapshot) => {
          const orders: Order[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Order, 'id'>),
          }));
          callback(orders);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, ORDERS_COL);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, ORDERS_COL);
    }
  },

  // Listen to orders for a specific user (by userId, phone, email, or orderIds)
  subscribeToUserOrders(
    params: { userId?: string | null; phone?: string | null; email?: string | null; orderIds?: string[] },
    callback: (orders: Order[]) => void
  ) {
    try {
      const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'), limit(100));
      return onSnapshot(
        q,
        (snapshot) => {
          const allOrders: Order[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Order, 'id'>),
          }));

          const cleanTargetPhone = params.phone ? cleanPhoneId(params.phone) : '';
          const targetEmail = params.email ? params.email.trim().toLowerCase() : '';
          const targetIds = new Set(params.orderIds || []);

          const userOrders = allOrders.filter((order) => {
            if (targetIds.has(order.id)) return true;
            if (params.userId && (order as any).userId === params.userId) return true;
            if (targetEmail && (order as any).customerEmail?.toLowerCase() === targetEmail) return true;
            if (cleanTargetPhone && cleanPhoneId(order.customerPhone) === cleanTargetPhone) return true;
            return false;
          });

          callback(userOrders);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, ORDERS_COL);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, ORDERS_COL);
    }
  },

  // Fetch past orders once
  async fetchUserOrders(params: {
    userId?: string | null;
    phone?: string | null;
    email?: string | null;
    orderIds?: string[];
  }): Promise<Order[]> {
    try {
      const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const allOrders: Order[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Order, 'id'>),
      }));

      const cleanTargetPhone = params.phone ? cleanPhoneId(params.phone) : '';
      const targetEmail = params.email ? params.email.trim().toLowerCase() : '';
      const targetIds = new Set(params.orderIds || []);

      return allOrders.filter((order) => {
        if (targetIds.has(order.id)) return true;
        if (params.userId && (order as any).userId === params.userId) return true;
        if (targetEmail && (order as any).customerEmail?.toLowerCase() === targetEmail) return true;
        if (cleanTargetPhone && cleanPhoneId(order.customerPhone) === cleanTargetPhone) return true;
        return false;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, ORDERS_COL);
    }
  },

  // Listen to live customers
  subscribeToCustomers(callback: (customers: Customer[]) => void) {
    try {
      const q = query(collection(db, CUSTOMERS_COL), orderBy('updatedAt', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          const customers: Customer[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Customer, 'id'>),
          }));
          callback(customers);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, CUSTOMERS_COL);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, CUSTOMERS_COL);
    }
  },

  // Listen to campaigns
  subscribeToCampaigns(callback: (campaigns: Campaign[]) => void) {
    try {
      const q = query(collection(db, CAMPAIGNS_COL), orderBy('createdAt', 'desc'), limit(50));
      return onSnapshot(
        q,
        (snapshot) => {
          const campaigns: Campaign[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Campaign, 'id'>),
          }));
          callback(campaigns);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, CAMPAIGNS_COL);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, CAMPAIGNS_COL);
    }
  },

  // Place order from storefront or CRM with Loyalty points tracking & discount awards
  async placeOrder(params: {
    userId?: string;
    customerEmail?: string;
    customerName: string;
    customerPhone: string;
    orderType: 'dine-in' | 'takeaway' | 'delivery';
    tableNumber?: number;
    deliveryAddress?: string;
    itemsSummary: string;
    total: number;
    foodTotal?: number;
    deliveryFee?: number;
    paymentMethod: 'Cash' | 'Fonepay/QR' | 'Card';
    notes?: string;
    loyaltyRewardApplied?: string;
    discountApplied?: number;
    pointsToDeduct?: number;
  }): Promise<string> {
    const orderId = 'HTP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const now = new Date().toISOString();
    
    // Loyalty points awarded strictly on food items order only (excludes delivery fee)
    const foodOrderAmount = typeof params.foodTotal === 'number'
      ? params.foodTotal
      : Math.max(0, params.total - (params.deliveryFee || 0));
    const pointsEarned = Math.floor(Math.max(0, foodOrderAmount) / 10); // 1 point per Rs. 10 spent on food only

    const orderData: Omit<Order, 'id'> = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.customerEmail ? { customerEmail: params.customerEmail } : {}),
      customerName: params.customerName.trim().slice(0, 100),
      customerPhone: params.customerPhone.trim().slice(0, 20),
      orderType: params.orderType,
      ...(params.tableNumber ? { tableNumber: params.tableNumber } : {}),
      deliveryAddress: (params.deliveryAddress || '').slice(0, 250),
      itemsSummary: params.itemsSummary.slice(0, 1000),
      total: Math.max(0, Math.round(params.total)),
      paymentMethod: params.paymentMethod,
      paymentStatus: 'pending',
      status: 'new',
      notes: (params.notes || '').slice(0, 300),
      ...(params.loyaltyRewardApplied ? { loyaltyRewardApplied: params.loyaltyRewardApplied } : {}),
      ...(params.discountApplied ? { discountApplied: params.discountApplied } : {}),
      pointsEarned,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, ORDERS_COL, orderId), orderData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${ORDERS_COL}/${orderId}`);
    }

    // Upsert Customer in CRM & award loyalty points based on total spending
    const customerDocId = cleanPhoneId(params.customerPhone);
    try {
      const customerRef = doc(db, CUSTOMERS_COL, customerDocId);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        const cur = customerSnap.data() as Customer;
        const newTotalSpend = (cur.totalSpend || 0) + params.total;
        const newTotalOrders = (cur.totalOrders || 0) + 1;
        const currentPoints = cur.loyaltyPoints ?? 0;
        const deduct = params.pointsToDeduct || 0;
        const newPoints = Math.max(0, currentPoints + pointsEarned - deduct);
        const newLifetimePoints = (cur.lifetimePointsEarned || Math.floor((cur.totalSpend || 0) / 10)) + pointsEarned;
        const newTier = calculateTier(newTotalSpend, newTotalOrders);

        await updateDoc(customerRef, {
          name: params.customerName.trim().slice(0, 100),
          address: (params.deliveryAddress || cur.address || '').slice(0, 250),
          totalSpend: newTotalSpend,
          totalOrders: newTotalOrders,
          loyaltyPoints: newPoints,
          lifetimePointsEarned: newLifetimePoints,
          tier: newTier,
          updatedAt: now,
        });
      } else {
        const initialPoints = 50 + pointsEarned - (params.pointsToDeduct || 0); // 50 welcome bonus!
        const initialCustomer: Omit<Customer, 'id'> = {
          name: params.customerName.trim().slice(0, 100),
          phone: params.customerPhone.trim().slice(0, 20),
          address: (params.deliveryAddress || '').slice(0, 250),
          totalOrders: 1,
          totalSpend: params.total,
          loyaltyPoints: Math.max(0, initialPoints),
          lifetimePointsEarned: 50 + pointsEarned,
          tier: calculateTier(params.total, 1),
          notes: 'Customer ordered via Hashtag Pizza web platform',
          tags: ['Web Customer', 'Loyalty Member'],
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(customerRef, initialCustomer);
      }
    } catch (customerErr) {
      console.warn('Customer upsert non-fatal notice:', customerErr);
    }

    return orderId;
  },

  // Redeem Loyalty Reward (awards discounts or free items based on points)
  async redeemLoyaltyReward(params: {
    customerId: string;
    rewardId: string;
    staffNotes?: string;
  }): Promise<LoyaltyRedemption> {
    const customerRef = doc(db, CUSTOMERS_COL, params.customerId);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) {
      throw new Error('Customer not found in database.');
    }

    const customer = customerSnap.data() as Customer;
    const reward = LOYALTY_REWARDS_CATALOG.find((r) => r.id === params.rewardId);

    if (!reward) {
      throw new Error(`Reward ${params.rewardId} does not exist in catalog.`);
    }

    if ((customer.loyaltyPoints || 0) < reward.pointsCost) {
      throw new Error(
        `Insufficient points. Customer has ${customer.loyaltyPoints || 0} pts, but ${reward.title} requires ${reward.pointsCost} pts.`
      );
    }

    const now = new Date().toISOString();
    const newPoints = (customer.loyaltyPoints || 0) - reward.pointsCost;
    const redemptionId = 'HTP-RW-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const redemptionCode = 'HP-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const redemptionRecord: LoyaltyRedemption = {
      id: redemptionId,
      customerId: params.customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsDeducted: reward.pointsCost,
      redemptionCode,
      status: 'active',
      rewardType: reward.type,
      rewardValue:
        reward.type === 'free_item'
          ? reward.freeItemName || reward.title
          : reward.type === 'discount_amount'
          ? `Rs. ${reward.discountAmount} OFF`
          : `${reward.discountPercent}% OFF`,
      notes: params.staffNotes || 'Redeemed via Hashtag Pizza Loyalty Engine',
      createdAt: now,
    };

    // Deduct points from customer profile
    try {
      await updateDoc(customerRef, {
        loyaltyPoints: newPoints,
        updatedAt: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${CUSTOMERS_COL}/${params.customerId}`);
    }

    // Save redemption ticket
    try {
      await setDoc(doc(db, REDEMPTIONS_COL, redemptionId), redemptionRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${REDEMPTIONS_COL}/${redemptionId}`);
    }

    return redemptionRecord;
  },

  // Manual Points Adjustment by Manager / Staff
  async adjustLoyaltyPoints(params: {
    customerId: string;
    pointsDelta: number;
    reason: string;
  }): Promise<number> {
    const customerRef = doc(db, CUSTOMERS_COL, params.customerId);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) {
      throw new Error('Customer not found.');
    }

    const customer = customerSnap.data() as Customer;
    const newPoints = Math.max(0, (customer.loyaltyPoints || 0) + params.pointsDelta);
    const now = new Date().toISOString();

    const updatedNotes = `${customer.notes ? customer.notes + '\n' : ''}[${new Date().toLocaleDateString()}] Points adjusted by ${params.pointsDelta > 0 ? '+' : ''}${params.pointsDelta} pts (${params.reason})`;

    try {
      await updateDoc(customerRef, {
        loyaltyPoints: newPoints,
        notes: updatedNotes.slice(0, 1000),
        updatedAt: now,
      });
      return newPoints;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${CUSTOMERS_COL}/${params.customerId}`);
    }
  },

  // Subscribe to real-time redemptions
  subscribeToRedemptions(callback: (redemptions: LoyaltyRedemption[]) => void) {
    try {
      const q = query(collection(db, REDEMPTIONS_COL), orderBy('createdAt', 'desc'), limit(50));
      return onSnapshot(
        q,
        (snapshot) => {
          const records: LoyaltyRedemption[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<LoyaltyRedemption, 'id'>),
          }));
          callback(records);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, REDEMPTIONS_COL);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, REDEMPTIONS_COL);
    }
  },

  // Lookup customer profile by phone number (for Storefront & CRM)
  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const docId = cleanPhoneId(phone);
    try {
      const snap = await getDoc(doc(db, CUSTOMERS_COL, docId));
      if (snap.exists()) {
        return {
          id: snap.id,
          ...(snap.data() as Omit<Customer, 'id'>),
        };
      }
      return null;
    } catch (err) {
      console.warn('Customer phone lookup non-fatal note:', err);
      return null;
    }
  },

  // Update order status (pipeline advancement)
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const path = `${ORDERS_COL}/${orderId}`;
    try {
      await updateDoc(doc(db, ORDERS_COL, orderId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Update order payment status
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<void> {
    const path = `${ORDERS_COL}/${orderId}`;
    try {
      await updateDoc(doc(db, ORDERS_COL, orderId), {
        paymentStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Update customer details & notes
  async updateCustomer(
    customerId: string,
    updates: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'address' | 'notes' | 'loyaltyPoints' | 'tier' | 'tags'>>
  ): Promise<void> {
    const path = `${CUSTOMERS_COL}/${customerId}`;
    try {
      await updateDoc(doc(db, CUSTOMERS_COL, customerId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Add new Customer manually in CRM
  async createCustomer(customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    tier?: LoyaltyTier;
  }): Promise<string> {
    const customerId = cleanPhoneId(customer.phone);
    const path = `${CUSTOMERS_COL}/${customerId}`;
    const now = new Date().toISOString();
    const customerData: Omit<Customer, 'id'> = {
      name: customer.name.trim().slice(0, 100),
      phone: customer.phone.trim().slice(0, 20),
      email: (customer.email || '').slice(0, 100),
      address: (customer.address || '').slice(0, 250),
      totalOrders: 0,
      totalSpend: 0,
      loyaltyPoints: 50, // Welcome bonus points!
      tier: customer.tier || 'Bronze',
      notes: (customer.notes || 'Added directly via Hashtag Pizza CRM').slice(0, 500),
      tags: ['CRM Direct'],
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(doc(db, CUSTOMERS_COL, customerId), customerData);
      return customerId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  // Create CRM Campaign
  async createCampaign(campaign: {
    title: string;
    targetSegment: string;
    message: string;
    discountCode?: string;
    discountPercent?: number;
  }): Promise<string> {
    const campaignId = 'CMP-' + Date.now().toString(36).toUpperCase();
    const path = `${CAMPAIGNS_COL}/${campaignId}`;
    const now = new Date().toISOString();
    const data: Omit<Campaign, 'id'> = {
      title: campaign.title.slice(0, 150),
      targetSegment: campaign.targetSegment.slice(0, 100),
      message: campaign.message.slice(0, 1000),
      discountCode: (campaign.discountCode || '').slice(0, 30),
      discountPercent: campaign.discountPercent || 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(doc(db, CAMPAIGNS_COL, campaignId), data);
      return campaignId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  // Delete Campaign
  async deleteCampaign(campaignId: string): Promise<void> {
    const path = `${CAMPAIGNS_COL}/${campaignId}`;
    try {
      await deleteDoc(doc(db, CAMPAIGNS_COL, campaignId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // Zero fake dynamic data - all orders and records come strictly from real user interactions
  async seedIfEmpty(): Promise<void> {
    return;
  },

  // Subscribe to Users collection
  subscribeToUsers(callback: (users: UserProfile[]) => void) {
    try {
      const q = query(collection(db, USERS_COL), orderBy('createdAt', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          const users: UserProfile[] = snapshot.docs.map((docSnap) => ({
            uid: docSnap.id,
            ...(docSnap.data() as Omit<UserProfile, 'uid'>),
          }));
          callback(users);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, USERS_COL);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, USERS_COL);
    }
  },

  // Update user role (admin / staff / customer)
  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    const path = `${USERS_COL}/${uid}`;
    try {
      await updateDoc(doc(db, USERS_COL, uid), {
        role,
        updatedAt: new Date().toISOString(),
      });

      // Sync admins collection
      if (role === 'admin') {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {});
      } else {
        await deleteDoc(doc(db, 'admins', uid)).catch(() => {});
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Subscribe to Menu Items CMS
  subscribeToMenuItems(callback: (items: MenuItem[]) => void) {
    try {
      return onSnapshot(
        collection(db, MENU_ITEMS_COL),
        (snapshot) => {
          const items: MenuItem[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<MenuItem, 'id'>),
          }));
          callback(items);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, MENU_ITEMS_COL);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, MENU_ITEMS_COL);
    }
  },

  // Save or Update Menu Item
  async saveMenuItem(item: MenuItem): Promise<void> {
    const path = `${MENU_ITEMS_COL}/${item.id}`;
    try {
      await setDoc(doc(db, MENU_ITEMS_COL, item.id), item, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  // Delete Menu Item
  async deleteMenuItem(itemId: string): Promise<void> {
    const path = `${MENU_ITEMS_COL}/${itemId}`;
    try {
      await deleteDoc(doc(db, MENU_ITEMS_COL, itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // Toggle in-stock availability
  async toggleMenuItemStock(itemId: string, inStock: boolean): Promise<void> {
    const path = `${MENU_ITEMS_COL}/${itemId}`;
    try {
      await updateDoc(doc(db, MENU_ITEMS_COL, itemId), {
        inStock,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },
};
