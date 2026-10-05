import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  QrCode,
  DollarSign,
  CreditCard,
  User,
  Phone,
  CheckCircle2,
  X,
  Sparkles,
  ShoppingBag,
  Flame,
  Star,
  RefreshCw,
} from 'lucide-react';
import { MENU_ITEMS, MENU_CATEGORIES, MenuItem, MenuItemSize } from '../../constants';
import { crmService } from '../../services/crmService';
import { Customer } from '../../types/crm';

interface CartLine {
  item: MenuItem;
  selectedSize: MenuItemSize | null;
  unitPrice: number;
  quantity: number;
  notes?: string;
}

interface PosTerminalProps {
  onOrderPlaced?: (orderId: string) => void;
  customers: Customer[];
}

export const PosTerminal: React.FC<PosTerminalProps> = ({ onOrderPlaced, customers }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Fonepay/QR' | 'Card'>('Cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [pointsToDeduct, setPointsToDeduct] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any | null>(null);

  // Size Picker Modal state
  const [sizePickerItem, setSizePickerItem] = useState<MenuItem | null>(null);

  // Subscribe to live menu items from Firestore CMS
  useEffect(() => {
    const unsub = crmService.subscribeToMenuItems((remoteItems) => {
      if (remoteItems && remoteItems.length > 0) {
        const remoteIds = new Set(remoteItems.map((r) => r.id));
        const merged = [
          ...remoteItems,
          ...MENU_ITEMS.filter((i) => !remoteIds.has(i.id)),
        ];
        setMenuItems(merged);
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Customer match lookup
  const matchedCustomer = useMemo(() => {
    if (!customerPhone || customerPhone.length < 4) return null;
    return customers.find((c) => c.phone.includes(customerPhone.trim()));
  }, [customerPhone, customers]);

  // Sync customer name if matched
  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    if (c.address) setCustomerAddress(c.address);
  };

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat =
        activeCategory === 'all' ||
        (activeCategory === 'pizza' && item.category.startsWith('pizza')) ||
        (activeCategory === 'burger' && item.category.includes('burger')) ||
        (activeCategory === 'sides' && (item.category.includes('sides') || item.category.includes('cfc'))) ||
        (activeCategory === 'drinks' && item.category.includes('drinks')) ||
        item.category === activeCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  // Add item to cart
  const handleAddItem = (item: MenuItem, size?: MenuItemSize) => {
    const chosenSize = size || (item.sizes && item.sizes.length > 0 ? item.sizes[0] : null);
    const unitPrice = chosenSize ? chosenSize.price : item.price;

    setCartLines((prev) => {
      const existingIdx = prev.findIndex(
        (line) =>
          line.item.id === item.id &&
          line.selectedSize?.label === chosenSize?.label
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          item,
          selectedSize: chosenSize,
          unitPrice,
          quantity: 1,
        },
      ];
    });
  };

  const updateLineQty = (index: number, delta: number) => {
    setCartLines((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeLine = (index: number) => {
    setCartLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cartLines.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0);
  }, [cartLines]);

  const grandTotal = Math.max(0, subtotal - appliedDiscount);

  // Apply Points Redemption
  const handleRedeemPoints = (points: number, discountAmt: number) => {
    if (appliedDiscount > 0) {
      // Toggle off
      setAppliedDiscount(0);
      setPointsToDeduct(0);
    } else {
      setAppliedDiscount(discountAmt);
      setPointsToDeduct(points);
    }
  };

  // Place POS Order & Fire KOT
  const handlePunchOrder = async () => {
    if (cartLines.length === 0) return;
    setIsSubmitting(true);

    const itemsSummary = cartLines
      .map(
        (l) =>
          `${l.quantity}x ${l.item.name} (${l.selectedSize ? l.selectedSize.label : 'Regular'}, Rs. ${l.unitPrice})`
      )
      .join(', ');

    const finalCustomerName = customerName.trim() || `Table ${tableNumber} Guest`;
    const finalCustomerPhone = customerPhone.trim() || '9800000000';

    try {
      const orderId = await crmService.placeOrder({
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
        deliveryAddress:
          orderType === 'dine-in'
            ? `Table #${tableNumber} (Dine In Sitting)`
            : orderType === 'delivery'
            ? customerAddress || 'Birgunj City'
            : 'Takeaway Counter',
        itemsSummary,
        total: grandTotal,
        paymentMethod,
        notes: orderNotes.trim() || undefined,
        discountApplied: appliedDiscount > 0 ? appliedDiscount : undefined,
        pointsToDeduct: pointsToDeduct > 0 ? pointsToDeduct : undefined,
      });

      const placedRecord = {
        orderId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        orderType,
        tableNumber,
        deliveryAddress:
          orderType === 'dine-in' ? `Table #${tableNumber}` : customerAddress,
        items: [...cartLines],
        subtotal,
        discount: appliedDiscount,
        grandTotal,
        paymentMethod,
        date: new Date().toLocaleString(),
      };

      setLastPlacedOrder(placedRecord);
      setShowReceiptModal(true);

      // Reset POS Form
      setCartLines([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setOrderNotes('');
      setAppliedDiscount(0);
      setPointsToDeduct(0);

      if (onOrderPlaced) onOrderPlaced(orderId);
    } catch (err) {
      console.error('POS order error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Column: Menu Item Catalog & Filters */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 overflow-hidden">
        {/* Top Control Bar: Search & Category Pills */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search item, pizza, burger, sides..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="hidden sm:inline text-xs font-bold text-slate-400 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono">
              {filteredItems.length} Items
            </span>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'pizza', label: '🍕 Pizzas' },
              { id: 'burger', label: '🍔 Burgers' },
              { id: 'sides', label: '🍗 CFC & Sides' },
              { id: 'momo', label: '🥟 Momos' },
              { id: 'drinks', label: '🥤 Beverages' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredItems.map((item) => {
            const hasMultipleSizes = item.sizes && item.sizes.length > 1;
            const displayPrice = item.sizes ? item.sizes[0].price : item.price;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (hasMultipleSizes) {
                    setSizePickerItem(item);
                  } else {
                    handleAddItem(item);
                  }
                }}
                className="flex flex-col justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-850 transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        item.dietary === 'veg'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-red-950 text-red-400 border border-red-800/60'
                      }`}
                    >
                      {item.dietary}
                    </span>
                    {hasMultipleSizes && (
                      <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-900/60">
                        {item.sizes?.length} Sizes
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm">
                    Rs. {displayPrice}
                  </span>
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Order Cart & Billing Register */}
      <div className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 shrink-0">
        {/* Order Header: Order Type & Table Picker */}
        <div className="p-3.5 border-b border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-sm">POS Billing Register</span>
            </div>
            {cartLines.length > 0 && (
              <button
                onClick={() => setCartLines([])}
                className="text-[11px] font-semibold text-red-400 hover:text-red-300"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Service Type Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl text-xs font-bold">
            {(['dine-in', 'takeaway', 'delivery'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                  orderType === type
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type === 'dine-in' ? '🍽️ Dine In' : type === 'takeaway' ? '🥡 Takeaway' : '🛵 Delivery'}
              </button>
            ))}
          </div>

          {/* Table Number Selector (for Dine In) */}
          {orderType === 'dine-in' && (
            <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Select Table:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTableNumber(t)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tableNumber === t
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    T{t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer Lookup & Quick Info */}
          <div className="space-y-1.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {orderType === 'delivery' && (
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Delivery address in Birgunj"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            )}

            {/* Matched Customer Loyalty Alert */}
            {matchedCustomer && (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span className="font-bold text-amber-300">
                    {matchedCustomer.name} ({matchedCustomer.loyaltyPoints} pts)
                  </span>
                </div>
                {matchedCustomer.loyaltyPoints >= 50 && (
                  <button
                    type="button"
                    onClick={() => handleRedeemPoints(50, 100)}
                    className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                      appliedDiscount > 0
                        ? 'bg-red-500 text-white'
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {appliedDiscount > 0 ? 'Remove Rs.100' : 'Redeem -Rs.100'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Line Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px] lg:max-h-none">
          {cartLines.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <ShoppingBag className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
              <p className="text-xs font-semibold">Running bill is empty</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Click items from menu to add</p>
            </div>
          ) : (
            cartLines.map((line, idx) => (
              <div
                key={`${line.item.id}_${line.selectedSize?.label || 'def'}_${idx}`}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-white text-xs truncate">
                    {line.item.name}
                  </h5>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {line.selectedSize && (
                      <span className="text-amber-400 font-medium">
                        {line.selectedSize.label}
                      </span>
                    )}
                    <span>Rs. {line.unitPrice} each</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900">
                    <button
                      onClick={() => updateLineQty(idx, -1)}
                      className="p-1 hover:text-amber-400 text-slate-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 font-mono font-bold text-xs text-white">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => updateLineQty(idx, 1)}
                      className="p-1 hover:text-amber-400 text-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-mono font-bold text-xs text-white min-w-[55px] text-right">
                    Rs. {line.unitPrice * line.quantity}
                  </span>
                  <button
                    onClick={() => removeLine(idx)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Bill Calculation & Payment */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 space-y-3">
          {/* Notes */}
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Special Kitchen Instructions (e.g. extra oregano, crisp crust)"
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />

          {/* Payment Method Selector */}
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Payment Method
            </span>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl text-xs font-bold">
              {(['Cash', 'Fonepay/QR', 'Card'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    paymentMethod === method
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {method === 'Cash' ? (
                    <DollarSign className="w-3 h-3" />
                  ) : method === 'Fonepay/QR' ? (
                    <QrCode className="w-3 h-3" />
                  ) : (
                    <CreditCard className="w-3 h-3" />
                  )}
                  <span>{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">Rs. {subtotal}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>Loyalty Discount:</span>
                <span className="font-mono">-Rs. {appliedDiscount}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-black text-white pt-1">
              <span>Grand Total:</span>
              <span className="font-mono text-amber-400">Rs. {grandTotal}</span>
            </div>
          </div>

          {/* Fire KOT & Settle Button */}
          <button
            type="button"
            disabled={cartLines.length === 0 || isSubmitting}
            onClick={handlePunchOrder}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Punching Order...</span>
            ) : (
              <>
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Punch & Fire KOT to Kitchen (Rs. {grandTotal})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Size Picker Modal */}
      {sizePickerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-base">{sizePickerItem.name}</h3>
              <button
                onClick={() => setSizePickerItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">{sizePickerItem.description}</p>

            <div className="space-y-2 mb-4">
              {sizePickerItem.sizes?.map((size) => (
                <button
                  key={size.label}
                  onClick={() => {
                    handleAddItem(sizePickerItem, size);
                    setSizePickerItem(null);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500 flex items-center justify-between text-xs font-bold text-white transition-all cursor-pointer"
                >
                  <span>{size.label}</span>
                  <span className="font-mono text-amber-400">Rs. {size.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bill & Tax Invoice Print Modal */}
      {showReceiptModal && lastPlacedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 shadow-2xl overflow-hidden font-mono">
            {/* Thermal Print Receipt Template */}
            <div id="pos-thermal-invoice" className="border-b-2 border-dashed border-slate-300 pb-4 text-center">
              <h2 className="font-black text-lg text-slate-950 uppercase">HASHTAG PIZZA</h2>
              <p className="text-[11px] text-slate-600">RB Complex, Loharpatti Road, Adarshnagar</p>
              <p className="text-[11px] text-slate-600">Birgunj, Nepal · Tel: 9861370721</p>
              <p className="text-[11px] font-bold text-slate-800 mt-1">PAN NO: 619283741</p>

              <div className="my-2 border-t border-b border-slate-200 py-1.5 text-xs text-left">
                <div className="flex justify-between">
                  <span>Order: <strong>{lastPlacedOrder.orderId}</strong></span>
                  <span>{lastPlacedOrder.orderType.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Customer: {lastPlacedOrder.customerName}</span>
                  <span>{lastPlacedOrder.tableNumber ? `Table ${lastPlacedOrder.tableNumber}` : ''}</span>
                </div>
                <div className="text-[10px] text-slate-500">{lastPlacedOrder.date}</div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs my-3">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-1">Qty Item</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lastPlacedOrder.items.map((line: CartLine, i: number) => (
                    <tr key={i}>
                      <td className="py-1">
                        {line.quantity}x {line.item.name}
                        {line.selectedSize && <span className="text-[10px] text-slate-500 block">{line.selectedSize.label}</span>}
                      </td>
                      <td className="py-1 text-right">{line.unitPrice}</td>
                      <td className="py-1 text-right font-bold">{line.unitPrice * line.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-slate-300 pt-2 space-y-1 text-xs text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {lastPlacedOrder.subtotal}</span>
                </div>
                {lastPlacedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span>-Rs. {lastPlacedOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-950 border-t border-slate-400 pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>Rs. {lastPlacedOrder.grandTotal}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Paid Via:</span>
                  <span>{lastPlacedOrder.paymentMethod}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mt-4 text-center">
                *** THANK YOU FOR DINING WITH US ***<br />
                Follow @hashtagpizzabirgunj on Instagram!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Close & Next Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
