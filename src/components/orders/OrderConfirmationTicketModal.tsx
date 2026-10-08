import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Printer,
  ShoppingBag,
  Clock,
  ChefHat,
  Bike,
  Utensils,
  MapPin,
  Sparkles,
  Phone,
  Share2,
  Calendar,
  Gift,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { HashtagLogo } from '../HashtagLogo';
import { CONTACT_INFO } from '../../constants';

export interface OrderTicketData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderType: 'delivery' | 'dine-in' | 'takeaway';
  tableNumber?: number;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryDistanceKm?: number;
  deliveryFee?: number;
  items: Array<{
    name: string;
    quantity: number;
    sizeLabel?: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  itemsSummary: string;
  subtotal: number;
  loyaltyDiscount?: number;
  loyaltyRewardTitle?: string;
  total: number;
  pointsEarned: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  notes?: string;
}

interface OrderConfirmationTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderTicketData | null;
  onViewOrderHistory?: () => void;
}

export const OrderConfirmationTicketModal: React.FC<OrderConfirmationTicketModalProps> = ({
  isOpen,
  onClose,
  order,
  onViewOrderHistory,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen || !order) return null;

  const handleCopyId = () => {
    navigator.clipboard?.writeText(order.orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const buildWhatsAppText = () => {
    const isTable = order.orderType === 'dine-in' && order.tableNumber;
    const lines = [
      isTable
        ? `*🍽️ HASHTAG PIZZA BIRGUNJ — TABLE #${order.tableNumber} ORDER TICKET*`
        : `*🍕 HASHTAG PIZZA BIRGUNJ — OFFICIAL ORDER TICKET*`,
      `• Ticket ID: *${order.orderId}*`,
      `• Service Mode: ${order.orderType.toUpperCase()}${
        order.tableNumber ? ` (Table #${order.tableNumber})` : ''
      }`,
      `• Customer: ${order.customerName}`,
      `• Mobile: ${order.customerPhone}`,
      order.orderType === 'delivery' && order.deliveryAddress
        ? `• Destination: ${order.deliveryAddress}${
            order.deliveryLandmark ? ` (Near ${order.deliveryLandmark})` : ''
          }\n• Route Distance: ${order.deliveryDistanceKm || '1.0'} km (Birgunj Loop)\n• Delivery Fee: Rs. ${
            order.deliveryFee || 40
          }`
        : null,
      order.notes ? `• Special Notes: ${order.notes}` : null,
      order.loyaltyRewardTitle
        ? `• Loyalty Perk: ${order.loyaltyRewardTitle}${
            order.loyaltyDiscount ? ` (-Rs. ${order.loyaltyDiscount})` : ''
          }`
        : null,
      `--------------------------------`,
      `*ORDERED ITEMS:*`,
      ...order.items.map(
        (i) =>
          `• ${i.quantity}x ${i.name}${i.sizeLabel ? ` (${i.sizeLabel})` : ''} — Rs. ${
            i.totalPrice
          }`
      ),
      `--------------------------------`,
      `• Food Subtotal: Rs. ${order.subtotal}`,
      order.orderType === 'delivery' && order.deliveryFee
        ? `• Delivery Fee: +Rs. ${order.deliveryFee}`
        : null,
      order.loyaltyDiscount ? `• Loyalty Discount: -Rs. ${order.loyaltyDiscount}` : null,
      `*TOTAL PAYABLE: Rs. ${order.total}*`,
      `• Payment Mode: ${order.paymentMethod} (Pending upon receipt)`,
      `• Loyalty Credit: +${order.pointsEarned} pts awarded`,
      `--------------------------------`,
      `Please confirm receipt and start conveyor prep. Dhanyabad! 🙏`,
    ].filter(Boolean);

    return lines.join('\n');
  };

  const whatsAppUrl = `https://api.whatsapp.com/send?phone=${
    CONTACT_INFO.whatsapp
  }&text=${encodeURIComponent(buildWhatsAppText())}`;

  const handleCopyOrderText = () => {
    navigator.clipboard?.writeText(buildWhatsAppText());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatTicketDate = (isoString: string) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Floating Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          aria-label="Close ticket modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Receipt Ticket Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          {/* Success Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-emerald-900">
              Order Confirmed & Logged for Kitchen Prep!
            </span>
          </div>

          {/* Authentic Restaurant Order Ticket Card */}
          <div
            id="printable-order-ticket"
            className="bg-[#FCFBF9] border-2 border-stone-300 rounded-2xl p-4 sm:p-5 shadow-inner relative space-y-4"
          >
            {/* Header: Logo, Address, Contact */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-300">
              <div className="flex justify-center mb-1">
                <HashtagLogo size="sm" />
              </div>
              <h3 className="font-mono text-xs font-black tracking-widest text-stone-900 uppercase">
                Hashtag Pizza Birgunj
              </h3>
              <p className="text-[11px] text-stone-500 leading-tight">
                {CONTACT_INFO.fullAddress}
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px] text-stone-500 font-mono">
                <span>Tel: {CONTACT_INFO.primaryPhone}</span>
                <span>·</span>
                <span>Landline: {CONTACT_INFO.landline}</span>
              </div>
            </div>

            {/* Ticket Metadata Bar: Order ID, Timestamp & Service Mode */}
            <div className="bg-stone-100/80 rounded-xl p-3 border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Official Ticket ID
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm sm:text-base font-black text-stone-900 tracking-wide">
                      {order.orderId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
                      title="Copy Ticket ID"
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Kitchen Logged</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-200">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <span>{formatTicketDate(order.createdAt)}</span>
                </span>
                <span className="font-bold text-stone-800">
                  {order.orderType === 'dine-in'
                    ? `🍽️ Dine-In (Table #${order.tableNumber || 1})`
                    : order.orderType === 'delivery'
                    ? '🛵 Birgunj Doorstep Delivery'
                    : '🛍️ Counter Takeaway'}
                </span>
              </div>
            </div>

            {/* Customer & Location Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-stone-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Customer
                </span>
                <span className="font-bold text-stone-900">{order.customerName}</span>
                <div className="font-mono text-stone-600 text-[11px]">
                  {order.customerPhone}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Destination / Table
                </span>
                {order.orderType === 'delivery' ? (
                  <div className="space-y-0.5">
                    <p className="font-semibold text-stone-800 line-clamp-2">
                      {order.deliveryAddress || 'Birgunj City Address'}
                    </p>
                    {order.deliveryLandmark && (
                      <p className="text-[10px] text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>Near {order.deliveryLandmark}</span>
                      </p>
                    )}
                  </div>
                ) : order.orderType === 'dine-in' ? (
                  <p className="font-bold text-[#164699]">
                    Table #{order.tableNumber || 1} — Dine-in Area
                  </p>
                ) : (
                  <p className="font-semibold text-stone-700">
                    Counter Pickup — RB Complex Birgunj
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Receipt Table */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-200">
                <span>Item & Options</span>
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center">Qty</span>
                  <span className="w-16 text-right">Amount</span>
                </div>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex items-start justify-between gap-2">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-stone-900 leading-tight">{item.name}</p>
                      {item.sizeLabel && (
                        <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded font-medium">
                          {item.sizeLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 font-mono">
                      <span className="w-8 text-center font-bold text-stone-700">
                        x{item.quantity}
                      </span>
                      <span className="w-16 text-right font-bold text-stone-900">
                        Rs. {item.totalPrice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions Note */}
            {order.notes && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-950">
                <span className="font-bold text-[10px] uppercase text-amber-700 block">
                  Cooking Note:
                </span>
                <span>{order.notes}</span>
              </div>
            )}

            {/* Ticket Perforation Dashed Line */}
            <div className="border-t-2 border-dashed border-stone-300 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Food Items Subtotal</span>
                <span className="font-mono">Rs. {order.subtotal}</span>
              </div>

              {order.orderType === 'delivery' && (
                <div className="flex justify-between text-stone-600">
                  <span>
                    Birgunj Delivery Fee ({order.deliveryDistanceKm || '1.0'} km loop)
                  </span>
                  <span className="font-mono text-[#E31B23]">
                    +Rs. {order.deliveryFee || 40}
                  </span>
                </div>
              )}

              {order.loyaltyDiscount ? (
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Loyalty Perk Discount</span>
                  <span className="font-mono">-Rs. {order.loyaltyDiscount}</span>
                </div>
              ) : null}

              {/* Grand Total */}
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-300 font-extrabold text-stone-900">
                <span className="text-sm uppercase tracking-wide">Grand Total Payable</span>
                <span className="font-mono text-xl text-[#E31B23]">
                  Rs. {order.total}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500">
                <span>Payment: {order.paymentMethod} (Pending)</span>
                {order.pointsEarned > 0 && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>+{order.pointsEarned} pts earned</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ticket Footer Barcode Simulation */}
            <div className="pt-2 text-center border-t border-stone-200 text-stone-400">
              <div className="font-mono tracking-[0.25em] text-[10px] uppercase">
                ||| | ||||| || |||| ||| ||||||| | |||
              </div>
              <p className="text-[10px] mt-0.5 text-stone-400">
                Thank you for choosing Hashtag Pizza Birgunj!
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Direct WhatsApp Send Link */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span>Send Ticket to Kitchen WhatsApp</span>
            </a>

            <div className="grid grid-cols-2 gap-2">
              {/* Copy WhatsApp Text */}
              <button
                type="button"
                onClick={handleCopyOrderText}
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copy full order details for WhatsApp or SMS"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold">Text Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-600" />
                    <span>Copy Order Text</span>
                  </>
                )}
              </button>

              {/* Print Ticket */}
              <button
                type="button"
                onClick={handlePrint}
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Print official kitchen receipt ticket"
              >
                <Printer className="w-3.5 h-3.5 text-stone-600" />
                <span>Print Receipt</span>
              </button>
            </div>

            {/* View In My Orders Tray */}
            {onViewOrderHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewOrderHistory();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Track Live in My Orders</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Bottom Close / Done Bar */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs shrink-0">
          <span className="text-stone-500 font-medium">
            Saved to your Birgunj order records
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Print Stylesheet for Physical Thermal Receipt Printing */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-order-ticket, #printable-order-ticket * {
              visibility: visible !important;
            }
            #printable-order-ticket {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 16px !important;
              background: #fff !important;
              color: #000 !important;
              border: 1px dashed #000 !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
