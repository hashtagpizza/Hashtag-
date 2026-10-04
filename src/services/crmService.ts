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

const CUSTOMERS_COL = 'customers';
const ORDERS_COL = 'orders';
const CAMPAIGNS_COL = 'campaigns';
const REDEMPTIONS_COL = 'loyalty_redemptions';

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
    customerName: string;
    customerPhone: string;
    orderType: 'dine-in' | 'takeaway' | 'delivery';
    tableNumber?: number;
    deliveryAddress?: string;
    itemsSummary: string;
    total: number;
    paymentMethod: 'Cash' | 'Fonepay/QR' | 'Card';
    notes?: string;
    loyaltyRewardApplied?: string;
    discountApplied?: number;
    pointsToDeduct?: number;
  }): Promise<string> {
    const orderId = 'HTP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const now = new Date().toISOString();
    const pointsEarned = Math.floor(Math.max(0, params.total) / 10); // 1 point per Rs. 10 spent

    const orderData: Omit<Order, 'id'> = {
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

  // Seed sample Birgunj customer and orders if database is brand new
  async seedIfEmpty(): Promise<void> {
    try {
      const snap = await getDocs(query(collection(db, ORDERS_COL), limit(1)));
      if (!snap.empty) return; // already initialized

      const now = new Date().toISOString();
      const past1 = new Date(Date.now() - 25 * 60 * 1000).toISOString();
      const past2 = new Date(Date.now() - 75 * 60 * 1000).toISOString();
      const past3 = new Date(Date.now() - 140 * 60 * 1000).toISOString();

      // Sample Birgunj Customers
      const sampleCustomers: Customer[] = [
        {
          id: '9861370721',
          name: 'Hashtag Pizzeria Birgunj (VIP Demo)',
          phone: '9861370721',
          email: 'hashtagpizzainfo@gmail.com',
          address: 'RB Complex, Loharpatti Road, Adarshnagar, Birgunj',
          totalOrders: 18,
          totalSpend: 19800,
          loyaltyPoints: 1980,
          tier: 'VIP',
          notes: 'Prefers conveyor oven crisp crust with extra oregano and jalapeño.',
          tags: ['VIP', 'Regular', 'Birgunj Core'],
          createdAt: past3,
          updatedAt: now,
        },
        {
          id: '9804821190',
          name: 'Sunil Shrestha',
          phone: '9804821190',
          email: 'sunil.birgunj@gmail.com',
          address: 'Main Road, Ghantaghar Chowk, Birgunj',
          totalOrders: 6,
          totalSpend: 6200,
          loyaltyPoints: 620,
          tier: 'Gold',
          notes: 'Family loves Hashtag Special Chicken Pizza and Chicken Chilly.',
          tags: ['Family Dine-in', 'Non-Veg Lover'],
          createdAt: past2,
          updatedAt: past1,
        },
        {
          id: '9812490012',
          name: 'Pooja Agarwal',
          phone: '9812490012',
          email: 'pooja.a@outlook.com',
          address: 'Ranighat Road, Near Durga Mandir, Birgunj',
          totalOrders: 4,
          totalSpend: 3450,
          loyaltyPoints: 345,
          tier: 'Silver',
          notes: 'Strictly Vegetarian: Veggie Supreme & Paneer Deluxe with Cheese Burst.',
          tags: ['Veg Regular'],
          createdAt: past2,
          updatedAt: past2,
        },
      ];

      for (const cust of sampleCustomers) {
        const { id, ...data } = cust;
        await setDoc(doc(db, CUSTOMERS_COL, id), data);
      }

      // Sample Initial Pipeline Orders
      const sampleOrders: Order[] = [
        {
          id: 'HTP-CONV-01',
          customerName: 'Sunil Shrestha',
          customerPhone: '9804821190',
          orderType: 'delivery',
          deliveryAddress: 'Main Road, Ghantaghar Chowk, Birgunj',
          itemsSummary: '1x Hashtag Special Chicken Pizza (Medium, Rs. 1050), 1x Boneless Chicken Strips (6 Pcs, Rs. 350)',
          total: 1400,
          paymentMethod: 'Fonepay/QR',
          paymentStatus: 'paid',
          status: 'kitchen',
          notes: 'Currently in 24" conveyor belt oven. Make it crispy.',
          createdAt: past1,
          updatedAt: now,
        },
        {
          id: 'HTP-DINE-02',
          customerName: 'Pooja Agarwal',
          customerPhone: '9812490012',
          orderType: 'dine-in',
          deliveryAddress: 'Table #4 (Window booth sitting)',
          itemsSummary: '1x Veggie Supreme Pizza (Medium, Rs. 900), 1x Stuffed Garlic Bread (Rs. 250), 2x Virgin Mojito (Rs. 300)',
          total: 1450,
          paymentMethod: 'Cash',
          paymentStatus: 'pending',
          status: 'ready',
          notes: 'Served in customer sitting area. Extra napkins.',
          createdAt: past2,
          updatedAt: past1,
        },
        {
          id: 'HTP-NEW-03',
          customerName: 'Amit Verma',
          customerPhone: '9845012345',
          orderType: 'takeaway',
          deliveryAddress: 'Pickup counter at RB Complex',
          itemsSummary: '2x Double Cheese Margherita (Medium, Rs. 1120), 1x Choco Lava Cake (Rs. 150)',
          total: 1270,
          paymentMethod: 'Fonepay/QR',
          paymentStatus: 'paid',
          status: 'new',
          notes: 'Will arrive in 15 mins by motorcycle.',
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const ord of sampleOrders) {
        const { id, ...data } = ord;
        await setDoc(doc(db, ORDERS_COL, id), data);
      }

      // Sample Initial Campaign
      const sampleCampaign: Campaign = {
        id: 'CMP-BIRGUNJ-WEEKEND',
        title: 'Birgunj Weekend Pizza Fest 15% OFF',
        targetSegment: 'Gold & VIP Loyalty Members',
        message: 'Namaste from Hashtag Pizza! Enjoy 15% OFF on all Large Conveyor-Baked Pizzas this weekend. Use code: HASH15 at counter or WhatsApp: 9861370721.',
        discountCode: 'HASH15',
        discountPercent: 15,
        status: 'active',
        createdAt: past2,
        updatedAt: past1,
      };
      const { id: campId, ...campData } = sampleCampaign;
      await setDoc(doc(db, CAMPAIGNS_COL, campId), campData);
    } catch (e) {
      console.warn('Seed non-fatal note:', e);
    }
  },
};
