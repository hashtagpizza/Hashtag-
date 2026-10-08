import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  ChefHat,
  Bike,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  MessageCircle,
  Search,
  Filter,
  Calendar,
  Sparkles,
  MapPin,
  Utensils,
  Receipt,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { useAuth } from '../../context/AuthContext';
import { CONTACT_INFO } from '../../constants';

interface OrderHistoryProps {
  onReorder?: (itemsSummary: string) => void;
  onCloseParent?: () => void;
  phoneFilterOverride?: string;
  onViewTicket?: (order: Order) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  onReorder,
  onCloseParent,
  phoneFilterOverride,
  onViewTicket,
}) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePhoneLookup, setActivePhoneLookup] = useState<string>(
    phoneFilterOverride || user?.phoneNumber || ''
  );

  // Load orders from Firestore in real-time
  useEffect(() => {
    setLoading(true);

    // Retrieve locally remembered order IDs as fallback
    let localOrderIds: string[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('hashtag_my_orders');
        if (raw) localOrderIds = JSON.parse(raw);
      } catch {
        localOrderIds = [];
      }
    }

    const unsubscribe = crmService.subscribeToUserOrders(
      {
        userId: user?.uid,
        email: user?.email,
        phone: activePhoneLookup || user?.phoneNumber,
        orderIds: localOrderIds,
      },
      (fetchedOrders) => {
        setOrders(fetchedOrders);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user?.uid, user?.email, user?.phoneNumber, activePhoneLookup]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const buildWhatsAppTrackUrl = (order: Order) => {
    const text = `Namaste Hashtag Pizza Birgunj! 🍕\n\nI would like to track my order:\n• Order ID: *${order.id}*\n• Service: ${order.orderType.toUpperCase()}${order.tableNumber ? ` (Table #${order.tableNumber})` : ''}\n• Status: ${order.status.toUpperCase()}\n• Customer: ${order.customerName} (${order.customerPhone})\n• Total: Rs. ${order.total}\n\nPlease update me on the live preparation / delivery status. Dhanyabad!`;
    return `https://api.whatsapp.com/send?phone=${CONTACT_INFO.whatsapp}&text=${encodeURIComponent(text)}`;
  };

  /**
   * Dynamic visual status badge styling based on the Firestore status field
   * Supports: 'new', 'kitchen', 'ready', 'delivered', 'cancelled'
   */
  const getStatusBadge = (status: OrderStatus, orderType: string) => {
    switch (status) {
      case 'new':
        return {
          label: 'Order Placed',
          detail: 'Sent to Kitchen',
          icon: Clock,
          className:
            'bg-amber-100/90 text-amber-900 border-amber-300 ring-2 ring-amber-400/20',
          dotColor: 'bg-amber-500',
        };
      case 'kitchen':
        return {
          label: 'Preparing',
          detail: 'Conveyor Oven Baking',
          icon: ChefHat,
          className:
            'bg-sky-100/90 text-sky-900 border-sky-300 ring-2 ring-sky-400/20 animate-pulse',
          dotColor: 'bg-sky-500',
        };
      case 'ready':
        if (orderType === 'delivery') {
          return {
            label: 'Out for Delivery',
            detail: 'Rider on the Way',
            icon: Bike,
            className:
              'bg-indigo-100/90 text-indigo-900 border-indigo-300 ring-2 ring-indigo-400/20',
            dotColor: 'bg-indigo-500',
          };
        } else if (orderType === 'dine-in') {
          return {
            label: 'Ready to Serve',
            detail: 'Serving to Table',
            icon: Utensils,
            className:
              'bg-indigo-100/90 text-indigo-900 border-indigo-300 ring-2 ring-indigo-400/20',
            dotColor: 'bg-indigo-500',
          };
        } else {
          return {
            label: 'Ready for Pickup',
            detail: 'At Counter',
            icon: ShoppingBag,
            className:
              'bg-indigo-100/90 text-indigo-900 border-indigo-300 ring-2 ring-indigo-400/20',
            dotColor: 'bg-indigo-500',
          };
        }
      case 'delivered':
        return {
          label: orderType === 'delivery' ? 'Delivered' : 'Served & Enjoyed',
          detail: 'Completed',
          icon: CheckCircle2,
          className:
            'bg-emerald-100/90 text-emerald-900 border-emerald-300 ring-2 ring-emerald-400/20',
          dotColor: 'bg-emerald-500',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          detail: 'Order Voided',
          icon: XCircle,
          className:
            'bg-rose-100/90 text-rose-900 border-rose-300 ring-2 ring-rose-400/20',
          dotColor: 'bg-rose-500',
        };
      default:
        return {
          label: status,
          detail: 'In Progress',
          icon: Clock,
          className:
            'bg-stone-100 text-stone-800 border-stone-300 ring-2 ring-stone-400/20',
          dotColor: 'bg-stone-500',
        };
    }
  };

  const filteredOrders = orders.filter((o) => {
    // Status Filter
    if (statusFilter === 'active') {
      if (o.status !== 'new' && o.status !== 'kitchen' && o.status !== 'ready') {
        return false;
      }
    } else if (statusFilter === 'completed') {
      if (o.status !== 'delivered') return false;
    } else if (statusFilter === 'cancelled') {
      if (o.status !== 'cancelled') return false;
    }

    // Search Query (ID, Items, Phone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesItems = o.itemsSummary.toLowerCase().includes(q);
      const matchesPhone = o.customerPhone.includes(q);
      if (!matchesId && !matchesItems && !matchesPhone) return false;
    }

    return true;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent Order';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Status Filter & Phone Sync */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID or dish name..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#0047AB] focus:bg-white transition-colors"
            />
          </div>

          {/* Quick Phone Lookup Switcher if user phone differs */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="tel"
              value={activePhoneLookup}
              onChange={(e) => setActivePhoneLookup(e.target.value)}
              placeholder="Phone (98XXXXXXXX)"
              className="w-32 px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono tabular-nums focus:outline-none focus:border-[#0047AB] focus:bg-white"
              title="Lookup past orders placed under another phone number"
            />
            <span className="text-[10px] text-stone-400 uppercase font-bold">Sync</span>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', label: `All Orders (${orders.length})` },
            {
              id: 'active',
              label: `Active (${orders.filter((o) => ['new', 'kitchen', 'ready'].includes(o.status)).length})`,
            },
            {
              id: 'completed',
              label: `Completed (${orders.filter((o) => o.status === 'delivered').length})`,
            },
            {
              id: 'cancelled',
              label: `Cancelled (${orders.filter((o) => o.status === 'cancelled').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                statusFilter === tab.id
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Empty / Loading State */}
      {loading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-stone-200 bg-stone-50 animate-pulse space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-stone-200 rounded" />
                <div className="h-6 w-24 bg-stone-200 rounded-full" />
              </div>
              <div className="h-3 w-48 bg-stone-200 rounded" />
              <div className="h-3 w-full bg-stone-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h4 className="font-bold text-stone-900 text-sm">No Orders Found</h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No past orders match your current filters. Try changing status or search query.'
                : 'You have not placed any orders yet. Explore our handcrafted conveyor-belt pizzas, burgers, momos and drinks!'}
            </p>
          </div>
          {onCloseParent && (
            <button
              type="button"
              onClick={onCloseParent}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0047AB] hover:bg-[#003882] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Explore Hashtag Menu</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status, order.orderType);
            const IconComponent = badge.icon;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 hover:border-stone-300 shadow-xs hover:shadow-md transition-all p-4 space-y-3"
              >
                {/* Header: Order ID, Date & Visual Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-xs text-stone-900 tracking-wider">
                      {order.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(order.id, e)}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      title="Copy Order ID"
                    >
                      {copiedId === order.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-[11px] text-stone-400">·</span>
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      <span>{formatDate(order.createdAt)}</span>
                    </span>
                  </div>

                  {/* VISUAL STATUS BADGE WITH DYNAMIC STYLING */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all self-start sm:self-auto ${badge.className}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${badge.dotColor} shrink-0`} />
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* Service Mode & Delivery Address Info */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 font-bold uppercase text-[10px] tracking-wider">
                    {order.orderType === 'delivery'
                      ? '🛵 Doorstep Delivery'
                      : order.orderType === 'dine-in'
                      ? `🍽️ Dine-In ${order.tableNumber ? `(Table #${order.tableNumber})` : ''}`
                      : '🛍️ Counter Takeaway'}
                  </span>

                  {order.deliveryAddress && (
                    <span className="text-stone-500 text-[11px] flex items-center gap-1 truncate max-w-xs">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="truncate">{order.deliveryAddress}</span>
                    </span>
                  )}
                </div>

                {/* Items Summary */}
                <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/70 text-xs text-stone-800 space-y-1">
                  <p className="font-semibold text-stone-900 text-[11px] uppercase tracking-wider text-stone-500">
                    Order Contents:
                  </p>
                  <p className="leading-relaxed font-medium text-stone-700">
                    {order.itemsSummary}
                  </p>
                </div>

                {/* Footer: Total Amount, Loyalty Points & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-stone-500 font-medium">Total Paid:</span>
                    <span className="font-mono text-base font-extrabold text-[#E31B23]">
                      Rs. {order.total}
                    </span>
                    {order.pointsEarned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>+{order.pointsEarned} pts earned</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {/* View Ticket Modal */}
                    {onViewTicket && (
                      <button
                        type="button"
                        onClick={() => onViewTicket(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                        title="View official digital order ticket"
                      >
                        <Receipt className="w-3.5 h-3.5 text-stone-600" />
                        <span>View Ticket</span>
                      </button>
                    )}

                    {/* Track on WhatsApp */}
                    <a
                      href={buildWhatsAppTrackUrl(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live WhatsApp Status</span>
                    </a>

                    {/* Reorder Button if available */}
                    {onReorder && (
                      <button
                        type="button"
                        onClick={() => onReorder(order.itemsSummary)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
                        title="Re-add items to order tray"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reorder</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
