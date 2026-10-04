export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'VIP';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpend: number;
  loyaltyPoints: number;
  lifetimePointsEarned?: number;
  tier: LoyaltyTier;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  pointsCost: number;
  type: 'discount_amount' | 'discount_percent' | 'free_item';
  discountAmount?: number;
  discountPercent?: number;
  freeItemName?: string;
  description: string;
  badge: string;
  tierRequirement?: LoyaltyTier;
}

export interface LoyaltyRedemption {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  rewardId: string;
  rewardTitle: string;
  pointsDeducted: number;
  redemptionCode: string;
  status: 'active' | 'used' | 'cancelled';
  rewardType: 'discount_amount' | 'discount_percent' | 'free_item';
  rewardValue: string;
  notes?: string;
  createdAt: string;
  usedAt?: string;
}

export const LOYALTY_REWARDS_CATALOG: LoyaltyReward[] = [
  {
    id: 'reward_coke',
    title: 'Free Chilled Soft Drink',
    pointsCost: 50,
    type: 'free_item',
    freeItemName: 'Coke / Sprite / Fanta (330ml Can)',
    description: 'Enjoy a crisp, ice-cold soda can with your meal.',
    badge: 'Drink Bonus',
  },
  {
    id: 'reward_discount_100',
    title: 'Rs. 100 Cash Discount',
    pointsCost: 100,
    type: 'discount_amount',
    discountAmount: 100,
    description: 'Instant Rs. 100 deducted from your total food bill.',
    badge: 'Quick Saver',
  },
  {
    id: 'reward_dip_fries',
    title: 'Free Peri-Peri French Fries',
    pointsCost: 120,
    type: 'free_item',
    freeItemName: 'Peri-Peri French Fries (Large)',
    description: 'Crispy golden fries tossed in aromatic spicy peri-peri rub.',
    badge: 'Appetizer',
  },
  {
    id: 'reward_momo',
    title: 'Free Nepali Chicken Momos',
    pointsCost: 150,
    type: 'free_item',
    freeItemName: 'Steamed / Fried Chicken Momo (6 Pcs)',
    description: 'Handcrafted juicy chicken momos served with spicy tomato timur chutney.',
    badge: 'Local Favorite',
  },
  {
    id: 'reward_discount_250',
    title: 'Rs. 250 Meal Discount',
    pointsCost: 250,
    type: 'discount_amount',
    discountAmount: 250,
    description: 'Rs. 250 flat discount voucher applicable to any order.',
    badge: 'High Value',
  },
  {
    id: 'reward_cfc_strips',
    title: 'Free Crispy Chicken Strips (6 Pcs)',
    pointsCost: 300,
    type: 'free_item',
    freeItemName: 'Boneless Crispy Chicken Strips (6 Pcs)',
    description: 'Fresh conveyor-fried boneless crispy tender chicken strips with creamy dip.',
    badge: "Chef's Special",
  },
  {
    id: 'reward_pizza_7',
    title: 'Free Margherita / Veggie Pizza (7")',
    pointsCost: 400,
    type: 'free_item',
    freeItemName: 'Margherita or Veggie Pizza (Regular 7")',
    description: 'Fresh artisan dough, San Marzano herb sauce, 100% pure mozzarella cheese.',
    badge: 'Free Pizza',
  },
  {
    id: 'reward_discount_500',
    title: 'Rs. 500 VIP Celebration Voucher',
    pointsCost: 500,
    type: 'discount_amount',
    discountAmount: 500,
    description: 'Rs. 500 flat celebration discount for family parties or large orders.',
    badge: 'VIP Elite',
  },
  {
    id: 'reward_pizza_9',
    title: "Free Supreme Oven Pizza (9\" Medium)",
    pointsCost: 750,
    type: 'free_item',
    freeItemName: "Hashtag Supreme Loaded Pizza (Medium 9\")",
    description: 'Loaded with chicken, pepperoni, bell peppers, olives, mushrooms and double cheese.',
    badge: 'Grand Feast',
  },
];

export type OrderType = 'dine-in' | 'takeaway' | 'delivery';
export type OrderStatus = 'new' | 'kitchen' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'Cash' | 'Fonepay/QR' | 'Card';
export type PaymentStatus = 'pending' | 'paid';

export interface OrderItemRecord {
  name: string;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  tableNumber?: number;
  deliveryAddress?: string;
  itemsSummary: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  notes?: string;
  loyaltyRewardApplied?: string;
  pointsEarned?: number;
  discountApplied?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  targetSegment: string;
  message: string;
  discountCode?: string;
  discountPercent?: number;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface CrmStats {
  todayRevenue: number;
  todayOrdersCount: number;
  activeKitchenOrders: number;
  totalCustomers: number;
  totalRevenueAllTime: number;
  averageOrderValue: number;
}
