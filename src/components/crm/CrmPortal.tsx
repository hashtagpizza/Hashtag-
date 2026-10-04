import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Flame,
  ShoppingBag,
  TrendingUp,
  Megaphone,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  MessageCircle,
  X,
  CreditCard,
  DollarSign,
  Tag,
  Star,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Receipt,
  Calendar,
  Filter,
  ArrowUpDown,
  CheckCircle,
  Eye,
  Copy,
  FileText,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  QrCode,
  Utensils,
  Gift,
  Award,
  ShieldCheck,
  Lock,
  Crown,
  ChefHat,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { crmService } from '../../services/crmService';
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
} from '../../types/crm';
import { HashtagLogo } from '../HashtagLogo';
import { TableQrModal } from '../tables/TableQrModal';
import { CustomerLoyaltyModal } from '../loyalty/CustomerLoyaltyModal';
import { MENU_ITEMS } from '../../constants';

interface CrmPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

// -----------------------------------------------------------------------------
// Audio Alert Synthesizer (Pizzeria Order Bell Chime)
// -----------------------------------------------------------------------------
function playKitchenOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Melodic high-clarity 4-tone kitchen service chime (D5 -> F#5 -> A5 -> D6)
    const tones = [
      { freq: 587.33, start: 0, duration: 0.18, vol: 0.28 },
      { freq: 739.99, start: 0.12, duration: 0.2, vol: 0.3 },
      { freq: 880.0, start: 0.24, duration: 0.25, vol: 0.32 },
      { freq: 1174.66, start: 0.38, duration: 0.65, vol: 0.36 },
    ];

    tones.forEach(({ freq, start, duration, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    });
  } catch (err) {
    console.warn('Audio chime non-fatal notice:', err);
  }
}

type TabType = 'dashboard' | 'orders' | 'customers' | 'loyalty' | 'campaigns' | 'analytics';

export const CrmPortal: React.FC<CrmPortalProps> = ({ isOpen, onClose }) => {
  const { user, isStaff, isAdmin, openAuthModal, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTableQrModal, setShowTableQrModal] = useState(false);
  const [loyaltyModalCustomer, setLoyaltyModalCustomer] = useState<Customer | null>(null);
  const [redemptions, setRedemptions] = useState<LoyaltyRedemption[]>([]);

  // Audio & Visual Alert state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('htp_crm_sound') !== 'false';
    } catch {
      return true;
    }
  });
  const [activeAlertOrder, setActiveAlertOrder] = useState<Order | null>(null);
  const initialLoadDoneRef = useRef(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const alertDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger alert function
  const triggerNewOrderAlert = (order: Order) => {
    setActiveAlertOrder(order);
    if (soundEnabled) {
      playKitchenOrderChime();
    }

    // Flash tab title
    try {
      const originalTitle = document.title;
      document.title = `🔔 (1) NEW ORDER! #${order.id} - Hashtag Pizza`;
      setTimeout(() => {
        document.title = originalTitle;
      }, 7000);
    } catch {}

    // Auto-dismiss after 15 seconds unless staff interacts with it
    if (alertDismissTimerRef.current) {
      clearTimeout(alertDismissTimerRef.current);
    }
    alertDismissTimerRef.current = setTimeout(() => {
      setActiveAlertOrder((curr) => (curr?.id === order.id ? null : curr));
    }, 15000);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('htp_crm_sound', next ? 'true' : 'false');
    } catch {}
    if (next) {
      playKitchenOrderChime();
    }
  };

  // Filters & Search
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTierFilter, setCustomerTierFilter] = useState<string>('all');

  // Dashboard & Past Orders Filter State
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<string>('all');
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState<string>('all');
  const [dashboardSort, setDashboardSort] = useState<'newest' | 'oldest' | 'highest'>('newest');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Modals
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form states
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    orderType: 'dine-in' as 'dine-in' | 'takeaway' | 'delivery',
    deliveryAddress: '',
    selectedItemId: MENU_ITEMS[0]?.id || '',
    selectedSizeIndex: 0,
    quantity: 1,
    paymentMethod: 'Fonepay/QR' as 'Cash' | 'Fonepay/QR' | 'Card',
    notes: '',
  });

  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    tier: 'Bronze' as LoyaltyTier,
  });

  const [newCampaignForm, setNewCampaignForm] = useState({
    title: '',
    targetSegment: 'All Birgunj Customers',
    message: '',
    discountCode: 'PIZZA10',
    discountPercent: 10,
  });

  // Subscribe to Firestore live streams
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    crmService.seedIfEmpty();

    const unsubOrders = crmService.subscribeToOrders((data) => {
      if (!initialLoadDoneRef.current) {
        // First snapshot upon opening CRM: record all existing IDs
        initialLoadDoneRef.current = true;
        knownOrderIdsRef.current = new Set(data.map((o) => o.id));
      } else {
        // Subsequent live snapshot from Firestore: check for any new order
        const incomingNewOrders = data.filter(
          (o) => !knownOrderIdsRef.current.has(o.id) && o.status === 'new'
        );

        if (incomingNewOrders.length > 0) {
          const latestOrder = incomingNewOrders[0];
          triggerNewOrderAlert(latestOrder);
        }

        // Add newly seen IDs to known set
        data.forEach((o) => knownOrderIdsRef.current.add(o.id));
      }

      setOrders(data);
      setLoading(false);
    });

    const unsubCustomers = crmService.subscribeToCustomers((data) => {
      setCustomers(data);
    });

    const unsubCampaigns = crmService.subscribeToCampaigns((data) => {
      setCampaigns(data);
    });

    const unsubRedemptions = crmService.subscribeToRedemptions((data) => {
      setRedemptions(data);
    });

    return () => {
      unsubOrders?.();
      unsubCustomers?.();
      unsubCampaigns?.();
      unsubRedemptions?.();
    };
  }, [isOpen]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => o.createdAt.slice(0, 10) === today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : o.total), 0);
    const activeKitchen = orders.filter((o) => o.status === 'new' || o.status === 'kitchen').length;
    const totalRevenueAll = orders.reduce((sum, o) => sum + o.total, 0);
    const aov = orders.length > 0 ? Math.round(totalRevenueAll / orders.length) : 0;

    return {
      todayOrdersCount: todayOrders.length,
      todayRevenue,
      activeKitchenOrders: activeKitchen,
      totalCustomers: customers.length,
      totalRevenueAll,
      averageOrderValue: aov,
    };
  }, [orders, customers]);

  // Filtered orders for Kanban pipeline
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.customerPhone.includes(orderSearch) ||
        order.id.toLowerCase().includes(orderSearch.toLowerCase());
      const matchStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  // Filtered & sorted past orders for Dashboard view
  const dashboardFilteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const q = dashboardSearch.trim().toLowerCase();
        const matchSearch =
          !q ||
          order.customerName.toLowerCase().includes(q) ||
          order.customerPhone.includes(q) ||
          order.id.toLowerCase().includes(q) ||
          order.itemsSummary.toLowerCase().includes(q) ||
          (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(q));

        const matchStatus =
          dashboardStatusFilter === 'all' || order.status === dashboardStatusFilter;

        const matchType =
          dashboardTypeFilter === 'all' || order.orderType === dashboardTypeFilter;

        return matchSearch && matchStatus && matchType;
      })
      .sort((a, b) => {
        if (dashboardSort === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (dashboardSort === 'highest') {
          return b.total - a.total;
        }
        // Default: newest first by timestamp
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [orders, dashboardSearch, dashboardStatusFilter, dashboardTypeFilter, dashboardSort]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchSearch =
        cust.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        cust.phone.includes(customerSearch) ||
        (cust.address || '').toLowerCase().includes(customerSearch.toLowerCase());
      const matchTier = customerTierFilter === 'all' || cust.tier === customerTierFilter;
      return matchSearch && matchTier;
    });
  }, [customers, customerSearch, customerTierFilter]);

  if (!isOpen) return null;

  // Authorization Guard: Staff & Owner only
  if (!isStaff) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden p-6 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Protected Staff & Manager Area</span>
            </div>

            <h2 className="font-display text-2xl font-bold text-stone-900 mb-2">
              Staff Authorization Required
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6">
              The CRM Portal, Live Kitchen Order Pipeline, and Customer Database are restricted to verified Hashtag Pizza staff and managers.
            </p>

            {user ? (
              <div className="w-full p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs mb-6 text-left">
                <p className="text-stone-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Currently Signed In
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-800">{user.displayName}</p>
                    <p className="text-stone-500">{user.email || 'Customer Account'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700 capitalize">
                    {user.role}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Sign In to Staff / Manager Account</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Return to Public Website
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'kitchen';
    if (currentStatus === 'new') nextStatus = 'kitchen';
    else if (currentStatus === 'kitchen') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'delivered';
    await crmService.updateOrderStatus(orderId, nextStatus);
  };

  const handleTogglePayment = async (orderId: string, current: PaymentStatus) => {
    const next: PaymentStatus = current === 'paid' ? 'pending' : 'paid';
    await crmService.updatePaymentStatus(orderId, next);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.customerName || !newOrderForm.customerPhone) return;

    const selectedItem = MENU_ITEMS.find((i) => i.id === newOrderForm.selectedItemId) || MENU_ITEMS[0];
    const size = selectedItem.sizes[newOrderForm.selectedSizeIndex] || selectedItem.sizes[0];
    const unitPrice = size ? size.price : selectedItem.price;
    const total = unitPrice * newOrderForm.quantity;
    const itemsSummary = `${newOrderForm.quantity}x ${selectedItem.name} (${size ? size.label : 'Regular'}, Rs. ${unitPrice})`;

    await crmService.placeOrder({
      customerName: newOrderForm.customerName,
      customerPhone: newOrderForm.customerPhone,
      orderType: newOrderForm.orderType,
      deliveryAddress: newOrderForm.deliveryAddress,
      itemsSummary,
      total,
      paymentMethod: newOrderForm.paymentMethod,
      notes: newOrderForm.notes,
    });

    setShowNewOrderModal(false);
    setNewOrderForm({
      customerName: '',
      customerPhone: '',
      orderType: 'dine-in',
      deliveryAddress: '',
      selectedItemId: MENU_ITEMS[0]?.id || '',
      selectedSizeIndex: 0,
      quantity: 1,
      paymentMethod: 'Fonepay/QR',
      notes: '',
    });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.phone) return;

    await crmService.createCustomer({
      name: newCustomerForm.name,
      phone: newCustomerForm.phone,
      email: newCustomerForm.email,
      address: newCustomerForm.address,
      notes: newCustomerForm.notes,
      tier: newCustomerForm.tier,
    });

    setShowNewCustomerModal(false);
    setNewCustomerForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      tier: 'Bronze',
    });
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignForm.title || !newCampaignForm.message) return;

    await crmService.createCampaign({
      title: newCampaignForm.title,
      targetSegment: newCampaignForm.targetSegment,
      message: newCampaignForm.message,
      discountCode: newCampaignForm.discountCode,
      discountPercent: Number(newCampaignForm.discountPercent),
    });

    setShowNewCampaignModal(false);
    setNewCampaignForm({
      title: '',
      targetSegment: 'All Birgunj Customers',
      message: '',
      discountCode: 'PIZZA10',
      discountPercent: 10,
    });
  };

  const openWhatsApp = (phone: string, text: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const fullPhone = clean.length === 10 ? '977' + clean : clean;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <HashtagLogo size="sm" variant="badge" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">HASHTAG PIZZA CRM</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Firestore
              </span>
            </div>
            <p className="text-xs text-slate-400">Birgunj Kitchen, Customer 360 & Loyalty Control Hub</p>
          </div>
        </div>

        {/* Global Quick Metrics */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Kitchen Queue:</span>
            <strong className="text-white text-sm">{stats.activeKitchenOrders} active</strong>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Today Sales:</span>
            <strong className="text-emerald-400 text-sm">Rs. {stats.todayRevenue.toLocaleString()}</strong>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <Users className="w-4 h-4 text-sky-400" />
            <span>Customers:</span>
            <strong className="text-white text-sm">{stats.totalCustomers}</strong>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Kitchen Audio Chime Toggle */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={
              soundEnabled
                ? 'Kitchen Audio Bell: ON (Click to Mute)'
                : 'Kitchen Audio Bell: Muted (Click to Enable)'
            }
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Chime ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </button>

          {/* Test Chime Button */}
          <button
            onClick={() => {
              playKitchenOrderChime();
              const sampleOrder = orders[0] || {
                id: 'HTP-NEW-DEMO',
                customerName: 'Suman Shrestha (Test Alert)',
                customerPhone: '9861370721',
                orderType: 'delivery',
                deliveryAddress: 'Main Road, Adarshnagar, Birgunj',
                itemsSummary: '1x Hashtag Special Chicken Pizza (Medium), 1x Boneless Strips (6 Pcs)',
                total: 1400,
                paymentMethod: 'Fonepay/QR',
                paymentStatus: 'paid',
                status: 'new',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              triggerNewOrderAlert(sampleOrder);
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 cursor-pointer"
            title="Simulate / Test New Order Visual & Audio Alert"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Alert</span>
          </button>

          {/* Table QR Code Stands Manager */}
          <button
            onClick={() => setShowTableQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#164699] hover:bg-[#12397c] text-white font-bold text-xs border border-blue-400/40 shadow-sm cursor-pointer"
            title="View, Print & Download QR Stands for All 8 Tables"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Table QR Stands (8)</span>
            <span className="sm:hidden">Tables</span>
          </button>

          <button
            onClick={() => setShowNewOrderModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-lg shadow-red-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>

          {/* Active Staff Identity Badge */}
          {user && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="flex flex-col text-right leading-none">
                <span className="text-xs font-bold text-white max-w-[120px] truncate">
                  {user.displayName?.split(' ')[0]}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">
                  {isAdmin ? '👑 Owner' : '👨‍🍳 Staff'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                title="Switch Staff Account"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close CRM Portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Prominent Visual Alert Banner when a new order arrives */}
      {activeAlertOrder && (
        <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 p-[2px] shadow-2xl shadow-red-600/30 shrink-0 animate-in slide-in-from-top-3 duration-200">
          <div className="bg-slate-950 px-4 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 text-red-400 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    NEW ORDER NOTIFICATION
                  </span>
                  <span className="font-mono text-xs font-bold text-white">#{activeAlertOrder.id}</span>
                  <span className="text-xs text-slate-400">
                    · {formatFullTimestamp(activeAlertOrder.createdAt).time}
                  </span>
                  <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {activeAlertOrder.orderType}
                  </span>
                </div>
                <div className="text-xs text-slate-200 font-semibold mt-0.5">
                  <strong className="text-white text-sm">{activeAlertOrder.customerName}</strong> (
                  {activeAlertOrder.customerPhone}) —{' '}
                  <span className="text-emerald-400 font-black">Rs. {activeAlertOrder.total}</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate max-w-2xl font-mono mt-0.5">
                  {activeAlertOrder.itemsSummary}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                onClick={() => {
                  setSelectedOrderForModal(activeAlertOrder);
                  setActiveAlertOrder(null);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                View Ticket
              </button>
              <button
                onClick={async () => {
                  await crmService.updateOrderStatus(activeAlertOrder.id, 'kitchen');
                  setActiveAlertOrder(null);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-md"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Send to Oven</span>
              </button>
              <button
                onClick={() => setActiveAlertOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="bg-slate-900/90 border-b border-slate-800 px-4 lg:px-8 py-2 flex items-center justify-between overflow-x-auto shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard & Past Orders</span>
            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px]">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Kitchen Pipeline</span>
            {stats.activeKitchenOrders > 0 && (
              <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {stats.activeKitchenOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer 360</span>
            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px]">
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('loyalty')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'loyalty'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400" />
            <span>Loyalty & Rewards</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-4 h-4 text-pink-400" />
            <span>Marketing Campaigns</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Sales & Analytics</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span className="text-slate-500">24" Conveyor Belt Oven:</span>
          <span className="text-amber-400 font-semibold">Active & Baking</span>
        </div>
      </nav>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-950 text-slate-100">
        {/* ============================================================== */}
        {/* TAB 0: DASHBOARD & PAST ORDERS FROM FIRESTORE */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Dashboard Welcome & Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Firestore Database Connected
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">Orders & Operations Dashboard</h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Real-time timeline of all past and current customer orders recorded from the Hashtag Pizza
                    Birgunj storefront and kitchen counter, including exact placement timestamps, statuses, and
                    fulfillment methods.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      crmService.seedIfEmpty();
                    }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    title="Sync with Firestore"
                  >
                    <RefreshCw className="w-4 h-4 text-sky-400" />
                    <span>Sync Database</span>
                  </button>

                  <button
                    onClick={() => setShowNewOrderModal(true)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Walk-in Order</span>
                  </button>
                </div>
              </div>

              {/* 6 Key Operational Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Recorded</div>
                  <div className="text-xl font-black text-white mt-0.5">{orders.length}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Past & live tickets</div>
                </div>

                <div className="bg-slate-950/70 border border-emerald-900/40 rounded-xl p-3.5">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Completed</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    {orders.filter((o) => o.status === 'delivered').length}
                  </div>
                  <div className="text-[11px] text-emerald-500/80 mt-0.5">Delivered to patrons</div>
                </div>

                <div className="bg-slate-950/70 border border-amber-900/40 rounded-xl p-3.5">
                  <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">In Conveyor Oven</div>
                  <div className="text-xl font-black text-amber-300 mt-0.5">
                    {orders.filter((o) => o.status === 'kitchen').length}
                  </div>
                  <div className="text-[11px] text-amber-500/80 mt-0.5">24" belt baking</div>
                </div>

                <div className="bg-slate-950/70 border border-sky-900/40 rounded-xl p-3.5">
                  <div className="text-[10px] text-sky-400 uppercase font-bold tracking-wider">Ready / Packing</div>
                  <div className="text-xl font-black text-sky-300 mt-0.5">
                    {orders.filter((o) => o.status === 'ready').length}
                  </div>
                  <div className="text-[11px] text-sky-500/80 mt-0.5">Counter dispatch</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Sales</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    Rs. {stats.totalRevenueAll.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Recorded volume</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avg Order Value</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5">
                    Rs. {stats.averageOrderValue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Per pizza ticket</div>
                </div>
              </div>
            </div>

            {/* Past Orders Filter & Search Toolbar */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search past orders by customer, phone, order ID, or pizza..."
                    value={dashboardSearch}
                    onChange={(e) => setDashboardSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {dashboardSearch && (
                    <button
                      onClick={() => setDashboardSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Fulfillment Type */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold">Type:</span>
                    <select
                      value={dashboardTypeFilter}
                      onChange={(e) => setDashboardTypeFilter(e.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900">All Fulfillment</option>
                      <option value="dine-in" className="bg-slate-900">Dine-In</option>
                      <option value="takeaway" className="bg-slate-900">Takeaway</option>
                      <option value="delivery" className="bg-slate-900">Delivery</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] text-slate-400 font-semibold">Sort:</span>
                    <select
                      value={dashboardSort}
                      onChange={(e) => setDashboardSort(e.target.value as any)}
                      className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="newest" className="bg-slate-900">Newest First</option>
                      <option value="oldest" className="bg-slate-900">Oldest First</option>
                      <option value="highest" className="bg-slate-900">Highest Amount</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-semibold mr-1 shrink-0">Filter Status:</span>
                {[
                  { id: 'all', label: 'All Orders', count: orders.length },
                  {
                    id: 'delivered',
                    label: 'Delivered / Completed',
                    count: orders.filter((o) => o.status === 'delivered').length,
                  },
                  {
                    id: 'kitchen',
                    label: 'In Conveyor Oven',
                    count: orders.filter((o) => o.status === 'kitchen').length,
                  },
                  {
                    id: 'ready',
                    label: 'Ready for Pickup',
                    count: orders.filter((o) => o.status === 'ready').length,
                  },
                  {
                    id: 'new',
                    label: 'New Incoming',
                    count: orders.filter((o) => o.status === 'new').length,
                  },
                  {
                    id: 'cancelled',
                    label: 'Cancelled',
                    count: orders.filter((o) => o.status === 'cancelled').length,
                  },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setDashboardStatusFilter(st.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      dashboardStatusFilter === st.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        dashboardStatusFilter === st.id ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Past Orders List Table & Responsive Cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-400" />
                    <span>Past & Active Orders Log</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Showing {dashboardFilteredOrders.length} of {orders.length} total orders stored in Firestore
                  </p>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Order ID & Type</th>
                      <th className="py-3 px-4">Timestamp (Date & Time)</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Ordered Items</th>
                      <th className="py-3 px-4">Amount & Payment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {dashboardFilteredOrders.map((order) => {
                      const timeInfo = formatFullTimestamp(order.createdAt);
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedOrderForModal(order)}
                        >
                          {/* Order ID & Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-white group-hover:text-blue-400 transition-colors">
                              {order.id}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-block uppercase text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {order.orderType}
                              </span>
                              {order.tableNumber && (
                                <span className="inline-block uppercase text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 font-mono">
                                  Table #{order.tableNumber}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Timestamp (Date & Time) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-white font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{timeInfo.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{timeInfo.time}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                {timeInfo.relative}
                              </span>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4 max-w-[180px]">
                            <div className="font-bold text-white truncate">{order.customerName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{order.customerPhone}</span>
                            </div>
                            {order.deliveryAddress && (
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {order.deliveryAddress}
                              </div>
                            )}
                          </td>

                          {/* Items Summary */}
                          <td className="py-3.5 px-4 max-w-[260px]">
                            <div className="text-slate-200 font-medium line-clamp-2 leading-relaxed">
                              {order.itemsSummary}
                            </div>
                            {order.notes && (
                              <div className="text-[10px] text-amber-300 italic truncate mt-0.5">
                                Note: {order.notes}
                              </div>
                            )}
                          </td>

                          {/* Amount & Payment */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-black text-emerald-400 text-sm">
                              Rs. {order.total.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePayment(order.id, order.paymentStatus);
                                }}
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                  order.paymentStatus === 'paid'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                                }`}
                                title="Click to toggle payment status"
                              >
                                {order.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({order.paymentMethod})
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <OrderStatusBadge status={order.status} />
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() =>
                                  openWhatsApp(
                                    order.customerPhone,
                                    `Namaste ${order.customerName}! Regarding your Hashtag Pizza order #${order.id} placed on ${timeInfo.date} at ${timeInfo.time} (Rs. ${order.total}). Status: ${order.status.toUpperCase()}.`
                                  )
                                }
                                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedOrderForModal(order)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                                title="View Receipt Ticket"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-800">
                {dashboardFilteredOrders.map((order) => {
                  const timeInfo = formatFullTimestamp(order.createdAt);
                  return (
                    <div
                      key={order.id}
                      className="p-4 space-y-2.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrderForModal(order)}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-white">{order.id}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{timeInfo.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{timeInfo.time}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                          {timeInfo.relative}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-sm text-white">{order.customerName}</div>
                        <div className="text-xs text-slate-400">{order.customerPhone}</div>
                      </div>

                      <div className="text-xs bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-200">
                        {order.itemsSummary}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                        <div>
                          <span className="text-slate-400 text-[10px]">Total: </span>
                          <strong className="text-emerald-400 font-black text-sm">
                            Rs. {order.total.toLocaleString()}
                          </strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePayment(order.id, order.paymentStatus);
                            }}
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded cursor-pointer ${
                              order.paymentStatus === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {order.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(
                                order.customerPhone,
                                `Namaste ${order.customerName}! Regarding your Hashtag Pizza order #${order.id}.`
                              );
                            }}
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
              {dashboardFilteredOrders.length === 0 && (
                <div className="py-16 text-center">
                  <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white">No past orders match your filter</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Try clearing the search query or changing the status filter to see all historical tickets.
                  </p>
                  <button
                    onClick={() => {
                      setDashboardSearch('');
                      setDashboardStatusFilter('all');
                      setDashboardTypeFilter('all');
                    }}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: ORDERS & CONVEYOR KITCHEN PIPELINE */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, or order ID..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {['all', 'new', 'kitchen', 'ready', 'delivered'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                      orderStatusFilter === st
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'kitchen' ? 'In Conveyor Oven' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Kanban Pipeline Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Column 1: New Orders */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="font-bold text-sm text-white">1. New Incoming</h3>
                  </div>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                    {filteredOrders.filter((o) => o.status === 'new').length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {filteredOrders
                    .filter((o) => o.status === 'new')
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAdvance={() => handleAdvanceStatus(order.id, order.status)}
                        onTogglePayment={() => handleTogglePayment(order.id, order.paymentStatus)}
                        onWhatsApp={() =>
                          openWhatsApp(
                            order.customerPhone,
                            `Namaste ${order.customerName}! We have received your Hashtag Pizza order #${order.id}. Total: Rs. ${order.total}. It will now be loaded into our 24" conveyor belt oven!`
                          )
                        }
                      />
                    ))}
                  {filteredOrders.filter((o) => o.status === 'new').length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-8">No incoming orders right now.</p>
                  )}
                </div>
              </div>

              {/* Column 2: Conveyor Kitchen */}
              <div className="bg-slate-900/70 border border-amber-900/30 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <h3 className="font-bold text-sm text-amber-300">2. In 24" Conveyor Oven</h3>
                  </div>
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                    {filteredOrders.filter((o) => o.status === 'kitchen').length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {filteredOrders
                    .filter((o) => o.status === 'kitchen')
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAdvance={() => handleAdvanceStatus(order.id, order.status)}
                        onTogglePayment={() => handleTogglePayment(order.id, order.paymentStatus)}
                        onWhatsApp={() =>
                          openWhatsApp(
                            order.customerPhone,
                            `Namaste ${order.customerName}! Your pizza is currently baking to perfection in our 24" conveyor oven and will be ready in ~5 minutes!`
                          )
                        }
                      />
                    ))}
                  {filteredOrders.filter((o) => o.status === 'kitchen').length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-8">Conveyor belt is currently free.</p>
                  )}
                </div>
              </div>

              {/* Column 3: Ready */}
              <div className="bg-slate-900/70 border border-emerald-900/30 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="font-bold text-sm text-emerald-300">3. Ready for Counter / Dispatch</h3>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    {filteredOrders.filter((o) => o.status === 'ready').length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {filteredOrders
                    .filter((o) => o.status === 'ready')
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAdvance={() => handleAdvanceStatus(order.id, order.status)}
                        onTogglePayment={() => handleTogglePayment(order.id, order.paymentStatus)}
                        onWhatsApp={() =>
                          openWhatsApp(
                            order.customerPhone,
                            `Namaste ${order.customerName}! Your hot Hashtag Pizza order #${order.id} is FRESH and READY! ${
                              order.orderType === 'dine-in'
                                ? 'Serving to your table.'
                                : order.orderType === 'takeaway'
                                ? 'Please pick up at our counter.'
                                : 'Our delivery rider is heading your way!'
                            }`
                          )
                        }
                      />
                    ))}
                  {filteredOrders.filter((o) => o.status === 'ready').length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-8">No orders awaiting pickup.</p>
                  )}
                </div>
              </div>

              {/* Column 4: Delivered / Completed */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <h3 className="font-bold text-sm text-slate-400">4. Completed</h3>
                  </div>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold">
                    {filteredOrders.filter((o) => o.status === 'delivered').length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {filteredOrders
                    .filter((o) => o.status === 'delivered')
                    .slice(0, 10)
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAdvance={() => {}}
                        onTogglePayment={() => handleTogglePayment(order.id, order.paymentStatus)}
                        onWhatsApp={() =>
                          openWhatsApp(
                            order.customerPhone,
                            `Namaste ${order.customerName}! Thank you for enjoying Hashtag Pizza Birgunj! We earned you loyalty points today. Hope to serve you again soon!`
                          )
                        }
                        isCompleted
                      />
                    ))}
                  {filteredOrders.filter((o) => o.status === 'delivered').length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-8">Completed orders appear here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: CUSTOMER 360 DIRECTORY */}
        {/* ============================================================== */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, address..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {['all', 'VIP', 'Gold', 'Silver', 'Bronze'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setCustomerTierFilter(tier)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        customerTierFilter === tier
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowNewCustomerModal(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Customer</span>
                </button>
              </div>
            </div>

            {/* Customers Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCustomers.map((cust) => (
                <div
                  key={cust.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all shadow-md group"
                >
                  <div>
                    {/* Header: Name and Tier */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-black text-base text-white group-hover:text-blue-400 transition-colors">
                          {cust.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{cust.phone}</span>
                        </div>
                      </div>
                      <TierBadge tier={cust.tier} />
                    </div>

                    {/* Address & Preferences */}
                    {cust.address && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-400 mt-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{cust.address}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {cust.notes && (
                      <p className="text-xs text-slate-300 italic mt-2.5 bg-slate-800/40 p-2 rounded-lg border-l-2 border-amber-500">
                        "{cust.notes}"
                      </p>
                    )}

                    {/* Tags */}
                    {cust.tags && cust.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {cust.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className="grid grid-cols-3 gap-2 text-center mb-3.5">
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Orders</div>
                        <div className="text-sm font-black text-white">{cust.totalOrders}</div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Spend</div>
                        <div className="text-sm font-black text-emerald-400">Rs. {cust.totalSpend}</div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Points</div>
                        <div className="text-sm font-black text-amber-400">{cust.loyaltyPoints}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          openWhatsApp(
                            cust.phone,
                            `Namaste ${cust.name}! Greetings from Hashtag Pizza Birgunj! You currently have ${cust.loyaltyPoints} loyalty points with us as a ${cust.tier} member.`
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoyaltyModalCustomer(cust)}
                        className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Award Discounts & Manage Loyalty Points"
                      >
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        <span>Perks</span>
                      </button>
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 bg-slate-900 rounded-xl border border-slate-800">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No customers matched your search.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: LOYALTY & REWARDS PROGRAM */}
        {/* ============================================================== */}
        {activeTab === 'loyalty' && (
          <div className="space-y-6">
            {/* Loyalty Program Overview */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 p-6 rounded-2xl border border-blue-900/40 shadow-xl">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
                  <Star className="w-4 h-4 fill-amber-400" />
                  Hashtag Pizza Birgunj Club
                </div>
                <h2 className="text-2xl font-black text-white">Automated Customer Loyalty & Tier Engine</h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Every order placed online, dine-in, or via takeaway earns customer points directly stored in
                  Firestore. Points are calculated at <strong>1 Point per Rs. 10 spent</strong> (10% reward tier).
                </p>
              </div>

              {/* Tier Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-900/90 border border-amber-900/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-600 uppercase">Tier 1</span>
                    <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded font-black">Bronze</span>
                  </div>
                  <h4 className="font-bold text-white text-base">New Diners</h4>
                  <p className="text-xs text-slate-400 mt-1">1 to 2 orders. 50 bonus welcome loyalty points upon registration.</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Tier 2</span>
                    <span className="text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-black">Silver</span>
                  </div>
                  <h4 className="font-bold text-white text-base">Regular Guests</h4>
                  <p className="text-xs text-slate-400 mt-1">2 to 4 orders or Rs. 2,000+ spend. Priority kitchen conveyor queuing.</p>
                </div>

                <div className="bg-slate-900/90 border border-amber-600/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase">Tier 3</span>
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-black">Gold</span>
                  </div>
                  <h4 className="font-bold text-white text-base">Pizza Aficionado</h4>
                  <p className="text-xs text-slate-400 mt-1">5 to 9 orders or Rs. 5,000+ spend. Free garlic dip + 10% promo codes.</p>
                </div>

                <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400 uppercase">Tier 4</span>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-black">VIP Elite</span>
                  </div>
                  <h4 className="font-bold text-white text-base">Hashtag Champions</h4>
                  <p className="text-xs text-slate-400 mt-1">10+ orders or Rs. 10,000+ spend. Free Birgunj city delivery + special gifts.</p>
                </div>
              </div>
            </div>

            {/* Top VIP Leaderboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-black text-lg text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Top Customer Leaderboard (Birgunj)
              </h3>
              <div className="divide-y divide-slate-800">
                {[...customers]
                  .sort((a, b) => b.totalSpend - a.totalSpend)
                  .slice(0, 5)
                  .map((c, i) => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                          #{i + 1}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-white">{c.name}</div>
                          <div className="text-xs text-slate-400">{c.phone} · {c.address || 'Birgunj'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <TierBadge tier={c.tier} />
                        <div className="text-right">
                          <div className="font-black text-sm text-emerald-400">Rs. {c.totalSpend.toLocaleString()}</div>
                          <div className="text-[11px] text-amber-400">{c.loyaltyPoints} Points</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLoyaltyModalCustomer(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Manage Points & Award Rewards"
                        >
                          <Gift className="w-3.5 h-3.5 text-amber-400" />
                          <span>Perks</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Loyalty Rewards & Discounts Catalog */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-white flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-400" />
                    <span>Official Loyalty Rewards & Discount Awards</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Discounts and free menu items awarded based on customer points balance (1 Pt / Rs. 10 spent).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {LOYALTY_REWARDS_CATALOG.map((reward) => (
                  <div
                    key={reward.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                          {reward.badge}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          ★ {reward.pointsCost} Pts
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white">{reward.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">{reward.description}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400">
                        {reward.type === 'free_item'
                          ? `🎁 Free: ${reward.freeItemName}`
                          : `💰 Rs. ${reward.discountAmount} Off`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (customers.length > 0) {
                            setLoyaltyModalCustomer(customers[0]);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Redeem / Award
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Redemptions & Awarded Discounts Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-black text-lg text-white mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>Recent Redemptions & Awarded Perks ({redemptions.length})</span>
              </h3>

              {redemptions.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <p>No rewards redeemed yet. Points accrue automatically with each placed order!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {redemptions.slice(0, 10).map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{r.customerName}</span>
                          <span className="text-[10px] font-mono bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">
                            {r.redemptionCode}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {r.rewardTitle} ({r.rewardValue}) · {r.customerPhone}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400 font-mono">-{r.pointsDeducted} pts</span>
                        <div className="text-[10px] text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MARKETING CAMPAIGNS */}
        {/* ============================================================== */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">Marketing & WhatsApp Broadcasts</h3>
                <p className="text-xs text-slate-400">Send personalized discounts and weekend promo alerts to Birgunj patrons.</p>
              </div>
              <button
                onClick={() => setShowNewCampaignModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Campaign</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => (
                <div key={camp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-black text-base text-white">{camp.title}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {camp.status}
                      </span>
                    </div>

                    <div className="text-xs text-blue-400 font-semibold mb-2">
                      Target Audience: {camp.targetSegment}
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                      {camp.message}
                    </div>

                    {camp.discountCode && (
                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <Tag className="w-4 h-4 text-amber-400" />
                        <span className="text-slate-400">Coupon:</span>
                        <strong className="text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {camp.discountCode}
                        </strong>
                        <span className="text-slate-500">({camp.discountPercent}% OFF)</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Created: {new Date(camp.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => {
                        const targetCust = customers[0]?.phone || '9861370721';
                        openWhatsApp(targetCust, camp.message);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Test WhatsApp Blast</span>
                    </button>
                  </div>
                </div>
              ))}

              {campaigns.length === 0 && (
                <p className="text-xs text-slate-500 text-center col-span-2 py-12">
                  No active marketing campaigns. Click "Create Campaign" to start!
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: SALES & KITCHEN ANALYTICS */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Today's Revenue</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">Rs. {stats.todayRevenue.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{stats.todayOrdersCount} orders placed today</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Lifetime Revenue</div>
                <div className="text-2xl font-black text-white mt-1">Rs. {stats.totalRevenueAll.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{orders.length} total recorded orders</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Average Order Value (AOV)</div>
                <div className="text-2xl font-black text-amber-400 mt-1">Rs. {stats.averageOrderValue.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Per transaction in Birgunj</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Conveyor Oven Efficiency</div>
                <div className="text-2xl font-black text-sky-400 mt-1">100% Uniform</div>
                <div className="text-xs text-slate-500 mt-1">24" commercial belt conveyor</div>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Types */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h4 className="font-black text-base text-white mb-4">Order Fulfillment Breakdown</h4>
                <div className="space-y-3">
                  {['dine-in', 'takeaway', 'delivery'].map((type) => {
                    const count = orders.filter((o) => o.orderType === type).length;
                    const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1 capitalize">
                          <span>{type}</span>
                          <span>{count} orders ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h4 className="font-black text-base text-white mb-4">Payment Methods (Birgunj)</h4>
                <div className="space-y-3">
                  {['Fonepay/QR', 'Cash', 'Card'].map((pm) => {
                    const count = orders.filter((o) => o.paymentMethod === pm).length;
                    const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                    return (
                      <div key={pm}>
                        <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                          <span>{pm}</span>
                          <span>{count} orders ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* MODAL: PAST ORDER RECEIPT / TICKET INSPECTOR */}
      {/* ================================================================== */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <HashtagLogo size="sm" variant="badge" />
                <div>
                  <h3 className="font-black text-lg text-white">Order Receipt Ticket</h3>
                  <div className="font-mono text-xs text-slate-400">{selectedOrderForModal.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timestamp & Status Strip */}
            <div className="bg-slate-950 rounded-xl p-3.5 my-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Current Status:</span>
                <OrderStatusBadge status={selectedOrderForModal.status} />
              </div>

              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-900">
                <span className="text-slate-400 font-semibold">Placed Timestamp:</span>
                <span className="font-mono text-white text-[11px]">
                  {formatFullTimestamp(selectedOrderForModal.createdAt).full} (
                  {formatFullTimestamp(selectedOrderForModal.createdAt).relative})
                </span>
              </div>

              {selectedOrderForModal.updatedAt && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                  <span className="text-slate-400 font-semibold">Last Updated:</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {formatFullTimestamp(selectedOrderForModal.updatedAt).full}
                  </span>
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="space-y-2 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <strong className="text-white">{selectedOrderForModal.customerName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Phone:</span>
                <div className="flex items-center gap-2">
                  <strong className="text-white font-mono">{selectedOrderForModal.customerPhone}</strong>
                  <button
                    onClick={() =>
                      openWhatsApp(
                        selectedOrderForModal.customerPhone,
                        `Namaste ${selectedOrderForModal.customerName}! Greetings from Hashtag Pizza Birgunj regarding your order #${selectedOrderForModal.id}.`
                      )
                    }
                    className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fulfillment Type:</span>
                <span className="uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[10px]">
                  {selectedOrderForModal.orderType}
                </span>
              </div>
              {selectedOrderForModal.deliveryAddress && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Address / Table:</span>
                  <span className="text-slate-200 text-right">{selectedOrderForModal.deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Order Items</h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedOrderForModal.itemsSummary}
              </div>
              {selectedOrderForModal.notes && (
                <div className="text-xs text-amber-300 italic mt-2 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/30">
                  Kitchen Note: {selectedOrderForModal.notes}
                </div>
              )}
            </div>

            {/* Payment & Total */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Total Amount</span>
                <span className="text-xl font-black text-emerald-400">
                  Rs. {selectedOrderForModal.total.toLocaleString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">
                  Payment: {selectedOrderForModal.paymentMethod}
                </span>
                <button
                  onClick={() => {
                    handleTogglePayment(selectedOrderForModal.id, selectedOrderForModal.paymentStatus);
                    setSelectedOrderForModal({
                      ...selectedOrderForModal,
                      paymentStatus: selectedOrderForModal.paymentStatus === 'paid' ? 'pending' : 'paid',
                    });
                  }}
                  className={`mt-1 px-2.5 py-1 rounded text-[10px] font-black uppercase transition-colors cursor-pointer ${
                    selectedOrderForModal.paymentStatus === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {selectedOrderForModal.paymentStatus === 'paid' ? '✓ PAID' : '⚠ PENDING (CLICK TO MARK PAID)'}
                </button>
              </div>
            </div>

            {/* Status Transition Control Buttons */}
            <div className="mb-4 pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 block mb-2">Update Order Status:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={async () => {
                    await crmService.updateOrderStatus(selectedOrderForModal.id, 'kitchen');
                    setSelectedOrderForModal({ ...selectedOrderForModal, status: 'kitchen' });
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                    selectedOrderForModal.status === 'kitchen'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  To Conveyor
                </button>
                <button
                  onClick={async () => {
                    await crmService.updateOrderStatus(selectedOrderForModal.id, 'ready');
                    setSelectedOrderForModal({ ...selectedOrderForModal, status: 'ready' });
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                    selectedOrderForModal.status === 'ready'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Mark Ready
                </button>
                <button
                  onClick={async () => {
                    await crmService.updateOrderStatus(selectedOrderForModal.id, 'delivered');
                    setSelectedOrderForModal({ ...selectedOrderForModal, status: 'delivered' });
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                    selectedOrderForModal.status === 'delivered'
                      ? 'bg-green-600 text-white border-green-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={async () => {
                    await crmService.updateOrderStatus(selectedOrderForModal.id, 'cancelled');
                    setSelectedOrderForModal({ ...selectedOrderForModal, status: 'cancelled' });
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                    selectedOrderForModal.status === 'cancelled'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  const receiptText = `HASHTAG PIZZA BIRGUNJ\nTicket: ${selectedOrderForModal.id}\nDate: ${
                    formatFullTimestamp(selectedOrderForModal.createdAt).full
                  }\nCustomer: ${selectedOrderForModal.customerName} (${selectedOrderForModal.customerPhone})\nFulfillment: ${
                    selectedOrderForModal.orderType
                  }\nItems: ${selectedOrderForModal.itemsSummary}\nTotal: Rs. ${selectedOrderForModal.total} (${
                    selectedOrderForModal.paymentMethod
                  } - ${selectedOrderForModal.paymentStatus.toUpperCase()})\nStatus: ${selectedOrderForModal.status.toUpperCase()}`;
                  navigator.clipboard.writeText(receiptText);
                  setCopiedOrderId(selectedOrderForModal.id);
                  setTimeout(() => setCopiedOrderId(null), 2500);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {copiedOrderId === selectedOrderForModal.id ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Ticket Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Receipt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderForModal(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: CREATE MANUAL ORDER */}
      {/* ================================================================== */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="font-black text-lg text-white">New Kitchen Order</h3>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Giri"
                    value={newOrderForm.customerName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9800000000"
                    value={newOrderForm.customerPhone}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Order Type</label>
                  <select
                    value={newOrderForm.orderType}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, orderType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="dine-in">Dine-In (Customer Seating Area)</option>
                    <option value="takeaway">Takeaway (Counter Pickup)</option>
                    <option value="delivery">Delivery (Birgunj Area)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Payment Method</label>
                  <select
                    value={newOrderForm.paymentMethod}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, paymentMethod: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Fonepay/QR">Fonepay / QR</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Card">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  Table Number or Delivery Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table #3 or Adarshnagar Main Road"
                  value={newOrderForm.deliveryAddress}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, deliveryAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              {/* Menu Item Selector */}
              <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <label className="text-xs text-amber-400 font-bold block">Select Pizza / Dish</label>
                <select
                  value={newOrderForm.selectedItemId}
                  onChange={(e) =>
                    setNewOrderForm({ ...newOrderForm, selectedItemId: e.target.value, selectedSizeIndex: 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  {MENU_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category})
                    </option>
                  ))}
                </select>

                {(() => {
                  const sel = MENU_ITEMS.find((i) => i.id === newOrderForm.selectedItemId) || MENU_ITEMS[0];
                  return (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Size & Price</label>
                        <select
                          value={newOrderForm.selectedSizeIndex}
                          onChange={(e) =>
                            setNewOrderForm({ ...newOrderForm, selectedSizeIndex: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        >
                          {sel.sizes.map((s, idx) => (
                            <option key={s.label} value={idx}>
                              {s.label} - Rs. {s.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={newOrderForm.quantity}
                          onChange={(e) =>
                            setNewOrderForm({ ...newOrderForm, quantity: Math.max(1, Number(e.target.value)) })
                          }
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Kitchen / Baking Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, conveyor crisp crust, extra napkins"
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/30"
                >
                  Create & Send to Kitchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: ADD NEW CUSTOMER */}
      {/* ================================================================== */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="font-black text-lg text-white">Add Customer to CRM</h3>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Khadka"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9812345678"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Delivery Address (Birgunj)</label>
                <input
                  type="text"
                  placeholder="e.g. Ghantaghar, Adarshnagar, Birgunj"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Preferences & Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Loves Chicken Chilly and extra cheese"
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: CREATE CAMPAIGN */}
      {/* ================================================================== */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="font-black text-lg text-white">Create Marketing Campaign</h3>
              <button
                onClick={() => setShowNewCampaignModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Birgunj Weekend Pizza Fest"
                  value={newCampaignForm.title}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Target Segment</label>
                <select
                  value={newCampaignForm.targetSegment}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, targetSegment: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="All Birgunj Customers">All Birgunj Customers</option>
                  <option value="Gold & VIP Loyalty Members">Gold & VIP Loyalty Members</option>
                  <option value="Vegetarian Diners">Vegetarian Diners</option>
                  <option value="Family Regulars">Family Regulars</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Discount Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. HASH15"
                  value={newCampaignForm.discountCode}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, discountCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Broadcast Message Template *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the WhatsApp/SMS copy to broadcast..."
                  value={newCampaignForm.message}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                >
                  Publish Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: EDIT CUSTOMER DETAILS */}
      {/* ================================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-black text-lg text-white">Edit Customer Profile</h3>
                <p className="text-xs text-slate-400">{selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={selectedCustomer.name}
                  onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Address in Birgunj</label>
                <input
                  type="text"
                  value={selectedCustomer.address || ''}
                  onChange={(e) => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Loyalty Tier</label>
                  <select
                    value={selectedCustomer.tier}
                    onChange={(e) =>
                      setSelectedCustomer({ ...selectedCustomer, tier: e.target.value as LoyaltyTier })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Loyalty Points</label>
                  <input
                    type="number"
                    value={selectedCustomer.loyaltyPoints}
                    onChange={(e) =>
                      setSelectedCustomer({
                        ...selectedCustomer,
                        loyaltyPoints: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Internal CRM Notes</label>
                <textarea
                  rows={3}
                  value={selectedCustomer.notes || ''}
                  onChange={(e) => setSelectedCustomer({ ...selectedCustomer, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await crmService.updateCustomer(selectedCustomer.id, {
                      name: selectedCustomer.name,
                      address: selectedCustomer.address,
                      tier: selectedCustomer.tier,
                      loyaltyPoints: selectedCustomer.loyaltyPoints,
                      notes: selectedCustomer.notes,
                    });
                    setSelectedCustomer(null);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Table-Side QR Stand Manager Modal */}
      <TableQrModal
        isOpen={showTableQrModal}
        onClose={() => setShowTableQrModal(false)}
      />

      {/* Customer Profile & Loyalty Rewards Engine Modal */}
      <CustomerLoyaltyModal
        customer={loyaltyModalCustomer}
        isOpen={!!loyaltyModalCustomer}
        onClose={() => setLoyaltyModalCustomer(null)}
        onCustomerUpdated={(updated) => {
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setLoyaltyModalCustomer(updated);
        }}
      />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Sub-Components & Formatters
// -----------------------------------------------------------------------------

function formatFullTimestamp(isoString: string): { full: string; relative: string; date: string; time: string } {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { full: isoString, relative: '', date: '', time: '' };

    const full = d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = 'Just now';
    if (diffDays > 0) relative = `${diffDays}d ago`;
    else if (diffHours > 0) relative = `${diffHours}h ago`;
    else if (diffMin > 0) relative = `${diffMin}m ago`;
    else if (diffSec > 10) relative = `${diffSec}s ago`;

    return { full, relative, date, time };
  } catch {
    return { full: isoString, relative: '', date: '', time: '' };
  }
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        <span>Delivered / Completed</span>
      </span>
    );
  }
  if (status === 'kitchen') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>In 24" Conveyor Oven</span>
      </span>
    );
  }
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>Ready for Dispatch</span>
      </span>
    );
  }
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <X className="w-3.5 h-3.5 text-rose-400" />
        <span>Cancelled</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
      <span>New Incoming</span>
    </span>
  );
}

function TierBadge({ tier }: { tier: LoyaltyTier }) {
  if (tier === 'VIP') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
        <Sparkles className="w-3 h-3 text-purple-400" />
        VIP
      </span>
    );
  }
  if (tier === 'Gold') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
        <Star className="w-3 h-3 text-amber-400" />
        Gold
      </span>
    );
  }
  if (tier === 'Silver') {
    return (
      <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
        Silver
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-900/30 text-amber-500 border border-amber-800/40 px-2 py-0.5 rounded-full">
      Bronze
    </span>
  );
}

interface OrderCardProps {
  order: Order;
  onAdvance: () => void | Promise<void>;
  onTogglePayment: () => void | Promise<void>;
  onWhatsApp: () => void;
  isCompleted?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onAdvance,
  onTogglePayment,
  onWhatsApp,
  isCompleted = false,
}) => {
  const timeFormatted = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-sm space-y-2.5 transition-all">
      {/* Top Header: ID & Time */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-slate-400">{order.id}</span>
        <span className="text-slate-500 flex items-center gap-1 text-[11px]">
          <Clock className="w-3 h-3" />
          {timeFormatted}
        </span>
      </div>

      {/* Customer Info */}
      <div>
        <div className="font-bold text-sm text-white">{order.customerName}</div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5">
          <span>{order.customerPhone}</span>
          <div className="flex items-center gap-1.5">
            <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {order.orderType}
            </span>
            {order.tableNumber && (
              <span className="uppercase text-[10px] font-black tracking-wider px-2 py-0.5 rounded bg-amber-400 text-stone-950 font-mono shadow-xs">
                Table #{order.tableNumber}
              </span>
            )}
          </div>
        </div>
        {order.deliveryAddress && (
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate">{order.deliveryAddress}</span>
          </div>
        )}
      </div>

      {/* Items Summary */}
      <div className="text-xs bg-slate-900 p-2 rounded-lg border border-slate-800/70 text-slate-200 font-medium">
        {order.itemsSummary}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="text-[11px] text-amber-300 italic bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30">
          Note: {order.notes}
        </div>
      )}

      {/* Total & Payment */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
        <div>
          <span className="text-slate-400 text-[11px]">Total: </span>
          <strong className="text-emerald-400 font-black text-sm">Rs. {order.total}</strong>
        </div>

        <button
          onClick={onTogglePayment}
          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
            order.paymentStatus === 'paid'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
          }`}
          title="Click to toggle payment status"
        >
          {order.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'} ({order.paymentMethod})
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onWhatsApp}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          title="Send WhatsApp update to customer"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>

        {!isCompleted && (
          <button
            onClick={onAdvance}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow"
          >
            <span>
              {order.status === 'new'
                ? 'To Oven'
                : order.status === 'kitchen'
                ? 'Mark Ready'
                : 'Complete'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
