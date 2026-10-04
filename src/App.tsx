/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShoppingBag,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  MessageCircle,
  Instagram,
  Facebook,
  Menu as MenuIcon,
  LayoutGrid,
  List,
  ExternalLink,
  Users,
  Flame,
  QrCode,
  Utensils,
  Star,
  Gift,
  Sparkles,
} from 'lucide-react';
import {
  ASSETS,
  BRAND_COPY,
  CONTACT_INFO,
  MENU_HIGHLIGHTS,
  MENU_CATEGORIES,
  MENU_ITEMS,
  TESTIMONIALS,
  MenuItem,
} from './constants';
import { HashtagLogo } from './components/HashtagLogo';
import { ResilientImage } from './components/ResilientImage';
import { CrmPortal } from './components/crm/CrmPortal';
import { crmService } from './services/crmService';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { TableQrModal } from './components/tables/TableQrModal';
import { TableBanner } from './components/tables/TableBanner';
import { TableSelectorModal } from './components/tables/TableSelectorModal';
import { CustomerLoyaltyPassModal } from './components/loyalty/CustomerLoyaltyPassModal';
import { LoyaltyReward } from './types/crm';

interface CartItem {
  cartKey: string;
  item: MenuItem;
  sizeLabel?: string;
  unitPrice: number;
  quantity: number;
}

export default function App() {
  // Menu filter & search state
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [menuLayout, setMenuLayout] = useState<'grid' | 'compact'>('grid');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});

  // Navigation & Cart Drawer state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([
    {
      cartKey: 'nvs-2__Medium (M)',
      item: MENU_ITEMS.find((i) => i.id === 'nvs-2') || MENU_ITEMS[0],
      sizeLabel: 'Medium (M)',
      unitPrice: 1050,
      quantity: 1,
    },
  ]);

  // Checkout form state
  const [serviceType, setServiceType] = useState<'Delivery' | 'Take Away' | 'Dine In'>('Delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Table-side QR ordering state (Tables 1 - 8)
  const [selectedTable, setSelectedTable] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('table');
      if (param) {
        const val = parseInt(param, 10);
        if (val >= 1 && val <= 8) return val;
      }
    }
    return null;
  });
  const [isTableQrModalOpen, setIsTableQrModalOpen] = useState(false);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);

  // Loyalty Rewards & Points state
  const [isLoyaltyPassOpen, setIsLoyaltyPassOpen] = useState(false);
  const [appliedLoyaltyReward, setAppliedLoyaltyReward] = useState<LoyaltyReward | null>(null);

  useEffect(() => {
    if (selectedTable) {
      setServiceType('Dine In');
    }
  }, [selectedTable]);

  useEffect(() => {
    const handlePopState = () => {
      const param = new URLSearchParams(window.location.search).get('table');
      if (param) {
        const val = parseInt(param, 10);
        if (val >= 1 && val <= 8) {
          setSelectedTable(val);
          setServiceType('Dine In');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileNavOpen(false);
  };

  const handleSelectHighlight = (targetCategory: string) => {
    setActiveCategory(targetCategory);
    setDietaryFilter('all');
    setSearchQuery('');
    scrollToSection('interactive-menu');
  };

  const getSelectedSizeIndex = (item: MenuItem): number => {
    if (!item.sizes || item.sizes.length === 0) return 0;
    return selectedSizes[item.id] ?? 0;
  };

  const handleSizeChange = (itemId: string, index: number) => {
    setSelectedSizes((prev) => ({ ...prev, [itemId]: index }));
  };

  const addToCart = (item: MenuItem) => {
    const sizeIdx = getSelectedSizeIndex(item);
    const chosenSize = item.sizes && item.sizes[sizeIdx] ? item.sizes[sizeIdx] : undefined;
    const unitPrice = chosenSize ? chosenSize.price : item.price;
    const sizeLabel = chosenSize ? chosenSize.label : undefined;
    const cartKey = `${item.id}__${sizeLabel || 'standard'}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.cartKey === cartKey);
      if (existing) {
        return prev.map((c) =>
          c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          cartKey,
          item,
          sizeLabel,
          unitPrice,
          quantity: 1,
        },
      ];
    });

    setConfirmedOrderId(null);
    triggerToast(`Added ${item.name}${sizeLabel ? ` (${sizeLabel})` : ''} to order`);
  };

  const updateCartQuantity = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.cartKey === cartKey ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const totalCartItems = useMemo(
    () => cart.reduce((acc, c) => acc + c.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((acc, c) => acc + c.unitPrice * c.quantity, 0),
    [cart]
  );

  const loyaltyDiscount = useMemo(() => {
    if (!appliedLoyaltyReward) return 0;
    if (appliedLoyaltyReward.type === 'discount_amount') {
      return appliedLoyaltyReward.discountAmount || 0;
    }
    return 0;
  }, [appliedLoyaltyReward]);

  const finalPayable = useMemo(() => {
    return Math.max(0, cartSubtotal - loyaltyDiscount);
  }, [cartSubtotal, loyaltyDiscount]);

  const pointsToEarn = useMemo(() => {
    return Math.floor(finalPayable / 10);
  }, [finalPayable]);

  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory;
      const matchesDietary =
        dietaryFilter === 'all' || item.dietary === dietaryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.tag && item.tag.toLowerCase().includes(q));
      return matchesCategory && matchesDietary && matchesSearch;
    });
  }, [activeCategory, dietaryFilter, searchQuery]);

  const buildWhatsAppOrderUrl = () => {
    const isTableDineIn = serviceType === 'Dine In' && selectedTable;
    const lines = [
      isTableDineIn
        ? `*🍽️ NEW DINE-IN ORDER — TABLE #${selectedTable}*`
        : `*NEW ORDER — HASHTAG PIZZA BIRGUNJ*`,
      `Service Mode: ${serviceType}${isTableDineIn ? ` (Table #${selectedTable})` : ''}`,
      customerName ? `Customer: ${customerName}` : null,
      customerPhone ? `Phone: ${customerPhone}` : null,
      isTableDineIn ? `Location: Table #${selectedTable} (Dine-in Sitting Area)` : null,
      serviceType === 'Delivery' && customerAddress
        ? `Delivery Address: ${customerAddress}`
        : null,
      orderNotes ? `Note: ${orderNotes}` : null,
      appliedLoyaltyReward
        ? `🎁 Loyalty Reward: ${appliedLoyaltyReward.title} (${
            appliedLoyaltyReward.type === 'free_item'
              ? `Free ${appliedLoyaltyReward.freeItemName}`
              : `-Rs. ${loyaltyDiscount}`
          })`
        : null,
      `--------------------------------`,
      ...cart.map(
        (c) =>
          `• ${c.quantity}x ${c.item.name}${
            c.sizeLabel ? ` (${c.sizeLabel})` : ''
          } — Rs. ${c.unitPrice * c.quantity}`
      ),
      appliedLoyaltyReward?.type === 'free_item'
        ? `• 1x ${appliedLoyaltyReward.freeItemName} (FREE Loyalty Perk) — Rs. 0`
        : null,
      `--------------------------------`,
      loyaltyDiscount > 0 ? `Subtotal: Rs. ${cartSubtotal}` : null,
      loyaltyDiscount > 0 ? `Loyalty Discount: -Rs. ${loyaltyDiscount}` : null,
      `*Total Payable: Rs. ${finalPayable}*`,
      `⭐ Points to be Earned: +${pointsToEarn} pts (1 pt / Rs. 10)`,
    ].filter(Boolean);

    return `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(
      lines.join('\n')
    )}`;
  };

  const handleConfirmDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setFormError('Please add at least one item from the menu first.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Please enter your name and phone number so we can confirm your order.');
      return;
    }
    if (serviceType === 'Delivery' && !customerAddress.trim()) {
      setFormError('Please provide your delivery landmark or address in Birgunj.');
      return;
    }
    setFormError(null);

    try {
      const itemsSummary = cart
        .map((c) => `${c.quantity}x ${c.item.name}${c.sizeLabel ? ` (${c.sizeLabel})` : ''}`)
        .join(', ');

      const orderTypeMap = {
        Delivery: 'delivery' as const,
        'Take Away': 'takeaway' as const,
        'Dine In': 'dine-in' as const,
      };

      const orderId = await crmService.placeOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderType: orderTypeMap[serviceType],
        tableNumber: serviceType === 'Dine In' && selectedTable ? selectedTable : undefined,
        deliveryAddress:
          serviceType === 'Delivery'
            ? customerAddress.trim()
            : serviceType === 'Dine In'
            ? selectedTable
              ? `Table #${selectedTable} - Dine In Area`
              : 'Dine In Sitting Area'
            : 'Counter Takeaway',
        itemsSummary: [
          itemsSummary,
          appliedLoyaltyReward?.type === 'free_item'
            ? `+ Free ${appliedLoyaltyReward.freeItemName} (Loyalty Perk)`
            : '',
        ]
          .filter(Boolean)
          .join(', '),
        total: finalPayable,
        paymentMethod: 'Fonepay/QR',
        notes: [
          orderNotes.trim(),
          appliedLoyaltyReward ? `[Loyalty Reward: ${appliedLoyaltyReward.title}]` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        loyaltyRewardApplied: appliedLoyaltyReward?.id,
        discountApplied: loyaltyDiscount,
        pointsToDeduct: appliedLoyaltyReward?.pointsCost,
      });

      setConfirmedOrderId(orderId);
      triggerToast(
        `Order confirmed! +${pointsToEarn} loyalty points credited to your phone number.`
      );
    } catch (err) {
      console.error('Order placement fallback note:', err);
      const randomCode = `HP-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmedOrderId(randomCode);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E31B23] selection:text-white">
      {/* PWA 1-Click Installation Announcement Bar for Android / iPhone */}
      <PWAInstallButton variant="banner" />

      {/* Top Bar Contract: 1-row, 3-zone header */}
      <header className="sticky top-0 z-40 h-20 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-[1280px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title / Original Hashtag Pizza Logo */}
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('hero');
            }}
            className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-[#0047AB] rounded-lg"
          >
            <HashtagLogo size="md" />
          </a>

          {/* Zone 2: Streamlined Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-stone-700"
          >
            <button
              onClick={() => scrollToSection('interactive-menu')}
              className="hover:text-[#E31B23] transition-colors py-1 whitespace-nowrap cursor-pointer"
            >
              Menu & Deals
            </button>
            <button
              onClick={() => scrollToSection('our-story')}
              className="hover:text-[#E31B23] transition-colors py-1 whitespace-nowrap cursor-pointer"
            >
              Our Story
            </button>
            <button
              onClick={() => scrollToSection('kitchen-setup')}
              className="hover:text-[#E31B23] transition-colors py-1 whitespace-nowrap cursor-pointer"
            >
              Kitchen & Sitting Area
            </button>
            <button
              onClick={() => scrollToSection('footer-contact')}
              className="hover:text-[#E31B23] transition-colors py-1 whitespace-nowrap cursor-pointer"
            >
              Location
            </button>
          </nav>

          {/* Zone 3: 2 Primary Actions (Order Tray + Popping Order Now CTA + CRM Button + PWA Install + Table QR + VIP Points) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* VIP Loyalty Points & Rewards */}
            <button
              onClick={() => setIsLoyaltyPassOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs font-black transition-all shadow-xs border border-amber-500/40 cursor-pointer whitespace-nowrap active:scale-95"
              title="Check Loyalty Points, Tiers & Redeem Free Food / Discounts"
            >
              <Star className="w-3.5 h-3.5 fill-stone-950" />
              <span className="hidden sm:inline">VIP Points</span>
              <span className="sm:hidden">Points</span>
            </button>

            {/* Table QR Code Stands Generator & Printer */}
            <button
              onClick={() => setIsTableQrModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-all shadow-xs border border-amber-300 cursor-pointer whitespace-nowrap"
              title="View & Print Table-Side QR Code Stands for All 8 Tables"
            >
              <QrCode className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">Table QR Stands</span>
              <span className="sm:hidden">Tables</span>
            </button>

            {/* PWA 1-Click Install Button */}
            <PWAInstallButton variant="header" />

            <button
              onClick={() => setIsCrmOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap border border-slate-700 hover:border-slate-500"
              title="Open Hashtag Pizza CRM, Orders & Kitchen Control"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CRM Portal</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white hover:border-stone-400 text-stone-900 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Open order tray"
            >
              <ShoppingBag className="w-4 h-4 text-[#0047AB]" />
              <span className="hidden sm:inline">Order Tray</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-[#E31B23]">
                ({totalCartItems})
              </span>
            </button>

            <motion.button
              onClick={() => setIsCartOpen(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg bg-[#E31B23] hover:bg-[#c8141b] text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Order Now</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="md:hidden p-2.5 rounded-lg border border-stone-200 bg-white text-stone-800"
              aria-label="Toggle Menu"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="md:hidden bg-[#FAF8F5] border-b border-stone-200 px-6 py-5 space-y-3 shadow-lg"
            >
              <div className="flex flex-col space-y-2 text-base font-semibold text-stone-800">
                <button
                  onClick={() => scrollToSection('interactive-menu')}
                  className="text-left py-2 border-b border-stone-200/60"
                >
                  Menu & Deals
                </button>
                <button
                  onClick={() => scrollToSection('our-story')}
                  className="text-left py-2 border-b border-stone-200/60"
                >
                  Our Story
                </button>
                <button
                  onClick={() => scrollToSection('kitchen-setup')}
                  className="text-left py-2 border-b border-stone-200/60"
                >
                  Kitchen Setup & Sitting Area
                </button>
                <button
                  onClick={() => scrollToSection('footer-contact')}
                  className="text-left py-2 border-b border-stone-200/60"
                >
                  Location & Contact
                </button>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsLoyaltyPassOpen(true);
                    }}
                    type="button"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs border border-amber-500/40 shadow-xs"
                  >
                    <Star className="w-4 h-4 fill-stone-950" />
                    <span>Hashtag VIP Club (Points & Free Rewards)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsTableQrModalOpen(true);
                    }}
                    type="button"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-amber-700" />
                    <span>Table QR Code Stands (8 Tables)</span>
                  </button>
                  <PWAInstallButton variant="compact" className="w-full justify-center py-2.5 text-xs font-bold" />
                </div>
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setIsCrmOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 mt-1 rounded-lg bg-slate-900 text-white font-bold text-xs border border-slate-700"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CRM Portal (Staff & Kitchen)</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Table-Side Dine-In Banner when a table QR code was scanned or table selected */}
      {selectedTable && (
        <TableBanner
          tableNumber={selectedTable}
          onChangeTable={() => setIsTableSelectorOpen(true)}
          onClearTable={() => setSelectedTable(null)}
          onOpenQrManager={() => setIsTableQrModalOpen(true)}
        />
      )}

      {/* 1. HERO SECTION: Full-width high-impact pizza showcase with clear CTA */}
      <section
        id="hero"
        className="relative min-h-[620px] lg:min-h-[680px] flex items-center bg-stone-950 text-white overflow-hidden"
      >
        {/* Full-Width High-Impact Background Image with Measured Contrast Scrim */}
        <div className="absolute inset-0 z-0">
          <ResilientImage
            src={ASSETS.heroPizza}
            alt="Hashtag Pizza loaded Supreme Pizza fresh from the oven"
            className="w-full h-full object-cover object-center scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/80 to-stone-950/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            {/* Unboxed Metadata Kicker (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium tracking-wide text-[#FFD700] mb-5">
              <span>{BRAND_COPY.secondaryTagline}</span>
              <span aria-hidden="true">·</span>
              <span className="text-stone-300">Dine In</span>
              <span aria-hidden="true">·</span>
              <span className="text-stone-300">Take Away</span>
              <span aria-hidden="true">·</span>
              <span className="text-stone-300">Delivery</span>
            </div>

            {/* Main Tagline */}
            <h1
              className="font-display text-4xl sm:text-6xl lg:text-[64px] font-extrabold tracking-tight text-white leading-[1.04] mb-6"
              style={{ textWrap: 'balance' }}
            >
              {BRAND_COPY.mainTagline}
            </h1>

            {/* Hook */}
            <p className="text-lg sm:text-xl text-stone-200 font-normal leading-relaxed mb-9 max-w-xl">
              {BRAND_COPY.heroHook} Hand-stretched daily dough, 100% real pulled
              mozzarella, and precision baking with our commercial 24-inch conveyor belt oven.
            </p>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => scrollToSection('interactive-menu')}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#E31B23] hover:bg-[#c8141b] text-white font-semibold text-base shadow-lg transition-transform active:scale-98 whitespace-nowrap cursor-pointer"
              >
                <span>Order Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <a
                href={`tel:${CONTACT_INFO.primaryPhone}`}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/25 text-white font-semibold text-base transition-colors whitespace-nowrap"
              >
                <Phone className="w-4 h-4 text-[#FFD700]" />
                <span className="font-mono tabular-nums">
                  {CONTACT_INFO.orderPhonesDisplay}
                </span>
              </a>
            </div>
          </div>

          {/* Bottom Proof & Offer Strip */}
          <div className="mt-16 pt-8 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-1">
                Monday & Wednesday Offer
              </p>
              <p className="text-stone-200 font-medium">
                Buy 1 Get 1 Free on Medium & Large Pizzas
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-1">
                Visit Our Kitchen
              </p>
              <p className="text-stone-200 font-medium">
                {CONTACT_INFO.address}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-1">
                Direct Online Perks
              </p>
              <p className="text-stone-200 font-medium font-mono tabular-nums">
                4.8/5 Local Rating · 5% Digital Cashback
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MENU HIGHLIGHTS: Visually driven grid (Pizza, Burger, Momo, CFC) */}
      <section
        id="highlights"
        className="py-20 lg:py-28 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0047AB] mb-2">
              01. Signature Categories
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Crafted Fresh in Our Open Kitchen
            </h2>
          </div>
          <p className="text-stone-600 text-base max-w-md leading-relaxed">
            “{BRAND_COPY.menuCallout}”
          </p>
        </div>

        {/* 4-Column Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MENU_HIGHLIGHTS.map((cat) => (
            <article
              key={cat.id}
              onClick={() => handleSelectHighlight(cat.targetCategory)}
              className="group bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-150"
            >
              {/* 4:3 High-Impact Category Image */}
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                <ResilientImage
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/65 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-baseline justify-between text-white">
                  <span className="text-xs font-medium text-stone-200">
                    {cat.subtitle}
                  </span>
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#FFD700]">
                    From Rs. {cat.startingPrice}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col flex-1">
                <div className="text-xs text-stone-500 mb-1.5 font-mono tabular-nums">
                  {cat.itemCount}
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-2 group-hover:text-[#E31B23] transition-colors">
                  {cat.title}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-5 flex-1">
                  {cat.description}
                </p>

                {/* Quick-View Signature Dishes */}
                <div className="pt-4 border-t border-stone-100 mb-5">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    Popular Picks
                  </p>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {cat.signatureDishes.join(' · ')}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0047AB] group-hover:text-[#E31B23] transition-colors">
                  <span>View {cat.title}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. OUR STORY: Bhasker's Founder Story + Craftsmanship + Local Proof */}
      <section
        id="our-story"
        className="py-20 lg:py-28 bg-stone-900 text-stone-100 border-y border-stone-800"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Visual & Founder Milestone */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 aspect-[16/10] sm:aspect-[4/3] shadow-2xl">
                <ResilientImage
                  src={ASSETS.founderKitchen}
                  fallbackSrcs={[
                    '/Hashtag Pizza_ A Vibrant Restaurant Collage.png',
                    '/Hashtag_Pizza_A_Vibrant_Restaurant_Collage.png',
                    '/interior_collage.png',
                    '/src/assets/images/hashtag_dining_sitting_1790958715120.jpg',
                  ]}
                  alt="Hashtag Pizza authentic interior dining area, counter, and open kitchen at RB Complex, Birgunj"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#FFD700] mb-1">
                      Est. 2022 · Adarshnagar, Birgunj
                    </p>
                    <p className="font-display text-lg font-bold text-white">
                      Hashtag Pizza Interior & Open Kitchen
                    </p>
                  </div>
                  <div className="font-mono tabular-nums text-xs text-stone-300">
                    RB Complex · Ground Floor
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Bhasker's Story */}
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#FFD700] mb-3">
                <span>02. Our Story</span>
                <span aria-hidden="true">·</span>
                <span>Homegrown in Birgunj</span>
              </div>

              <h2
                className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-6"
                style={{ textWrap: 'balance' }}
              >
                {BRAND_COPY.founderTitle}
              </h2>

              <blockquote className="text-lg sm:text-xl text-stone-100 font-medium leading-relaxed border-l-2 border-[#E31B23] pl-5 mb-6">
                “{BRAND_COPY.founderStoryPrimary}”
              </blockquote>

              <p className="text-base text-stone-300 leading-relaxed mb-8">
                {BRAND_COPY.founderStorySecondary}
              </p>

              {/* 4 Numbered Craftsmanship Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-stone-800">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    01. Hand-Stretched Daily Dough
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Proofed fresh every morning in our Birgunj kitchen—never frozen bases.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    02. 24-Inch Conveyor Belt Oven
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Automated conveyor belt baking for mathematically even crusts and perfect melt—no wood soot or stone burnt spots.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    03. Dedicated Kitchen Stations
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Hygienic prep lines, separate fryers for CFC, and live "Your Order Is Ready" digital screens.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    04. Cozy Customer Sitting Area
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Air-conditioned dining hall with light-wood tables, comfy booth seating, and warm ambient LED vibes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Claim-to-Proof Adjacency: Local Birgunj Testimonials */}
          <div className="mt-16 pt-12 border-t border-stone-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="font-display text-xl font-bold text-white">
                Trusted by Families & Foodies Across Birgunj
              </h3>
              <div className="text-xs text-stone-400 font-mono tabular-nums">
                4.8 / 5.0 Average Rating · 1,200+ Local Reviews
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.id}
                  className="bg-stone-950/70 border border-stone-800 rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#FFD700] font-mono tabular-nums mb-3">
                      <span>{t.rating}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-stone-400">{t.date}</span>
                    </div>
                    <p className="text-sm text-stone-200 leading-relaxed mb-5">
                      “{t.text}”
                    </p>
                  </div>
                  <div className="pt-3 border-t border-stone-800/80">
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-stone-400">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Inside Hashtag Pizza: Kitchen Setup & Customer Sitting Area */}
      <section
        id="kitchen-setup"
        className="py-20 lg:py-28 bg-[#F4F1EA] border-b border-stone-200"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#E31B23] mb-2">
                03. Kitchen Setup & Customer Ambiance
              </p>
              <h2
                className="font-display text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Engineered for Perfect Consistency & Real Comfort
              </h2>
            </div>
            <p className="text-stone-600 text-sm sm:text-base max-w-md leading-relaxed">
              Hashtag Pizza doesn't rely on unpredictable wood or stone deck ovens. We combine automated commercial conveyor belt baking with a cozy, air-conditioned dining experience at RB Complex.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: 24" Conveyor Belt Oven */}
            <article className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col hover:border-stone-300 transition-colors">
              <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
                <ResilientImage
                  src={ASSETS.conveyorOven}
                  alt="Commercial 24-inch conveyor belt pizza oven at Hashtag Pizza"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-2 font-medium">
                  <span className="text-[#0047AB] font-semibold">24" Conveyor Belt Oven</span>
                  <span aria-hidden="true">·</span>
                  <span>Automated Baking</span>
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-3">
                  Why 24" Conveyor Belt Over Wood/Stone?
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4 flex-1">
                  Wood and stone ovens often suffer from hot spots, burnt crusts, or undercooked dough. Our commercial 24-inch conveyor belt oven runs at digitally calibrated multi-zone temperatures. Every pizza travels smoothly through the heat chamber, emerging with a blistered golden crust, bubbly melted cheese, and zero burnt edges.
                </p>
                <div className="pt-4 border-t border-stone-100 text-xs text-stone-700 font-mono tabular-nums">
                  24-Inch Belt · Digital Heat Calibration · Uniform Bake
                </div>
              </div>
            </article>

            {/* Card 2: Customer Sitting & Dining Area */}
            <article className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col hover:border-stone-300 transition-colors">
              <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
                <ResilientImage
                  src={ASSETS.diningSitting}
                  alt="Hashtag Pizza customer sitting area with booth seating and light wood tables"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-2 font-medium">
                  <span className="text-[#E31B23] font-semibold">Customer Sitting Area</span>
                  <span aria-hidden="true">·</span>
                  <span>Dine-In Comfort</span>
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-3">
                  Comfortable Booth & Table Seating
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4 flex-1">
                  Designed for friends, students, and families, our Birgunj dining room offers spacious light-wood dining tables, cushioned booth bench seating, industrial chairs, warm ambient LED wall strip lighting, and refreshing air-conditioning away from the city heat.
                </p>
                <div className="pt-4 border-t border-stone-100 text-xs text-stone-700 font-mono tabular-nums">
                  Air-Conditioned · Padded Booths · Family & Squad Friendly
                </div>
              </div>
            </article>

            {/* Card 3: Kitchen Setup & Front Counter */}
            <article className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col hover:border-stone-300 transition-colors">
              <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
                <ResilientImage
                  src={ASSETS.storefrontExterior}
                  alt="Hashtag Pizza exterior entrance at RB Complex with illuminated logo sign"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-2 font-medium">
                  <span className="text-stone-800 font-semibold">Kitchen & Storefront</span>
                  <span aria-hidden="true">·</span>
                  <span>RB Complex Ground Floor</span>
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-3">
                  Hygienic Prep & Live Order Display
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4 flex-1">
                  Our kitchen operates with separate stations for pizza topping, burger prep, and high-temp CFC fryers. Orders are prepared fresh and tracked live on the overhead "Your Order Is Ready" digital token screen at the bright yellow counter.
                </p>
                <div className="pt-4 border-t border-stone-100 text-xs text-stone-700 font-mono tabular-nums">
                  Digital Token Screen · Separate Prep Lines · Quick Takeaway
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE MENU: Clean, searchable list of full menu with prices & instant ordering */}
      <section
        id="interactive-menu"
        className="py-20 lg:py-28 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Menu Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E31B23] mb-2">
              04. Interactive Full Menu
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Explore Our Complete Menu & Prices
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-2">
              Select your preferred pizza size (Small, Medium, Large) or dish style to add directly to your order.
            </p>
            <p className="text-xs text-stone-500 font-mono tabular-nums mt-1.5">
              Extras: Extra Cheese +Rs. 80 · Cheese Burst +Rs. 120 · Extra Veg Topping +Rs. 40 · Burger Extra Cheese/Fries +Rs. 50 · House Dips Rs. 40
            </p>
          </div>

          {/* Search & View Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[260px] sm:min-w-[300px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pizza, CFC, momo, burger..."
                className="w-full pl-10 pr-8 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0047AB]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dietary Segmented Control */}
            <div className="inline-flex items-center p-1 bg-stone-200/80 rounded-lg shrink-0">
              {(['all', 'veg', 'non-veg'] as const).map((diet) => (
                <button
                  key={diet}
                  onClick={() => setDietaryFilter(diet)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    dietaryFilter === diet
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {diet === 'all' ? 'All' : diet === 'veg' ? 'Veg' : 'Non-Veg'}
                </button>
              ))}
            </div>

            {/* Layout Toggle (Cards vs Compact Menu Sheet) */}
            <div className="inline-flex items-center p-1 bg-stone-200/80 rounded-lg shrink-0">
              <button
                onClick={() => setMenuLayout('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  menuLayout === 'grid'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Photo Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setMenuLayout('compact')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  menuLayout === 'compact'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Compact Menu Board View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Menu Sheet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-stone-200 no-scrollbar">
          {MENU_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#0047AB] text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Results Count & Reset */}
        <div className="flex items-center justify-between text-xs text-stone-500 mb-6">
          <div className="font-mono tabular-nums">
            Showing {filteredMenuItems.length} of {MENU_ITEMS.length} dishes
            {activeCategory !== 'all' &&
              ` · ${
                MENU_CATEGORIES.find((c) => c.id === activeCategory)?.name
              }`}
          </div>
          {(activeCategory !== 'all' || dietaryFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setActiveCategory('all');
                setDietaryFilter('all');
                setSearchQuery('');
              }}
              className="text-[#E31B23] font-semibold hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Empty Search State */}
        {filteredMenuItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <p className="font-display text-lg font-bold text-stone-900 mb-2">
              No menu items match "{searchQuery}"
            </p>
            <p className="text-sm text-stone-500 mb-6">
              Try searching for Margherita, Chicken Over-Chicken, CFC, Kurkure Momo, or Combo.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setDietaryFilter('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-[#0047AB] text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              Show Full Menu
            </button>
          </div>
        ) : menuLayout === 'grid' ? (
          /* PHOTO CARD GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenuItems.map((item) => {
              const selectedIdx = getSelectedSizeIndex(item);
              const activeSize =
                item.sizes && item.sizes[selectedIdx]
                  ? item.sizes[selectedIdx]
                  : undefined;
              const currentPrice = activeSize ? activeSize.price : item.price;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col hover:border-stone-300 transition-colors"
                >
                  {/* 4:3 Dish Image */}
                  <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
                    <ResilientImage
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Unboxed Metadata Line */}
                    <div className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
                      <span
                        className={
                          item.dietary === 'veg'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-rose-700 font-semibold'
                        }
                      >
                        {item.dietary === 'veg' ? 'Veg' : 'Non-Veg'}
                      </span>
                      {item.tag && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-stone-600 font-medium">
                            {item.tag}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Title & Price */}
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <h3 className="font-display text-lg font-bold text-stone-900 leading-snug">
                        {item.name}
                      </h3>
                      <span className="font-mono tabular-nums text-base font-semibold text-stone-900 shrink-0">
                        Rs. {currentPrice}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4 flex-1">
                      {item.description}
                    </p>

                    {/* Interactive Size Selector (if applicable) */}
                    {item.sizes && item.sizes.length > 0 && (
                      <div className="mb-4">
                        <div
                          className={`grid gap-1.5 p-1 bg-stone-100 rounded-lg ${
                            item.sizes.length === 2
                              ? 'grid-cols-2'
                              : item.sizes.length === 4
                              ? 'grid-cols-4'
                              : 'grid-cols-3'
                          }`}
                        >
                          {item.sizes.map((sz, idx) => (
                            <button
                              key={sz.label}
                              type="button"
                              onClick={() => handleSizeChange(item.id, idx)}
                              className={`py-1.5 px-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                selectedIdx === idx
                                  ? 'bg-white text-stone-900 shadow-xs'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                            >
                              <span className="block truncate">{sz.shortLabel}</span>
                              <span className="block font-mono tabular-nums text-[11px] text-stone-500">
                                Rs.{sz.price}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add to Order Button */}
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="w-full py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-[#E31B23] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        Add to Order
                        {activeSize ? ` (${activeSize.shortLabel})` : ''}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* COMPACT INTERACTIVE MENU SHEET VIEW (Like the Printed Menu Card) */
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-200 overflow-hidden">
            {filteredMenuItems.map((item) => {
              const selectedIdx = getSelectedSizeIndex(item);
              const activeSize =
                item.sizes && item.sizes[selectedIdx]
                  ? item.sizes[selectedIdx]
                  : undefined;
              const currentPrice = activeSize ? activeSize.price : item.price;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/80 transition-colors"
                >
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 text-xs text-stone-500 mb-0.5">
                      <span
                        className={
                          item.dietary === 'veg'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-rose-700 font-semibold'
                        }
                      >
                        {item.dietary === 'veg' ? 'Veg' : 'Non-Veg'}
                      </span>
                      {item.tag && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.tag}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-base font-bold text-stone-900">
                      {item.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0">
                    {item.sizes && item.sizes.length > 0 && (
                      <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-lg">
                        {item.sizes.map((sz, idx) => (
                          <button
                            key={sz.label}
                            type="button"
                            onClick={() => handleSizeChange(item.id, idx)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                              selectedIdx === idx
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            {sz.shortLabel}:{' '}
                            <span className="font-mono tabular-nums">
                              {sz.price}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="font-mono tabular-nums text-sm font-semibold text-stone-900 min-w-[76px] text-right">
                      Rs. {currentPrice}
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-[#E31B23] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. FOOTER & LOCATION HUB: Contact details, Birgunj map pin, and social links */}
      <footer
        id="footer-contact"
        className="bg-stone-950 text-stone-300 border-t border-stone-800"
      >
        {/* Upper Location & Order Callout */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Brand & Contact Details (7 Cols) */}
            <div className="lg:col-span-6 space-y-8">
              <div>
                <HashtagLogo size="lg" className="mb-5" />
                <p className="font-display text-2xl font-bold text-white mb-2">
                  {BRAND_COPY.mainTagline}
                </p>
                <p className="text-sm text-stone-400 max-w-md leading-relaxed">
                  {BRAND_COPY.secondaryTagline} {BRAND_COPY.heroHook}
                </p>
              </div>

              {/* Structured Contact Information */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <MapPin className="w-5 h-5 text-[#E31B23] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Location
                    </p>
                    <p className="text-base font-medium text-white">
                      {CONTACT_INFO.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Phone className="w-5 h-5 text-[#FFD700] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Order Now (Direct Call / WhatsApp)
                    </p>
                    <p className="text-base font-semibold text-white font-mono tabular-nums">
                      <a
                        href={`tel:${CONTACT_INFO.primaryPhone}`}
                        className="hover:text-[#FFD700] transition-colors"
                      >
                        {CONTACT_INFO.primaryPhone}
                      </a>
                      {' / '}
                      <a
                        href={`tel:${CONTACT_INFO.landline}`}
                        className="hover:text-[#FFD700] transition-colors"
                      >
                        {CONTACT_INFO.landline}
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Clock className="w-5 h-5 text-[#0047AB] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Service & Opening Hours
                    </p>
                    <p className="text-sm text-stone-200">
                      Dine In · Take Away · Delivery · {CONTACT_INFO.hours}
                    </p>
                  </div>
                </div>
              </div>

              {/* Social & Ordering Links */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E31B23] hover:bg-[#c8141b] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Order</span>
                </a>
                <a
                  href={CONTACT_INFO.takeAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Order on Take.App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={CONTACT_INFO.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <Instagram className="w-4 h-4 text-[#FFD700]" />
                  <span>{CONTACT_INFO.instagramHandle}</span>
                </a>
                <a
                  href={CONTACT_INFO.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <Facebook className="w-4 h-4 text-[#0047AB]" />
                  <span>Facebook</span>
                </a>
              </div>
            </div>

            {/* Map Embed (6 Cols) */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 h-[320px] relative">
                <iframe
                  title="Hashtag Pizza Birgunj Location — RB Complex, Adarshnagar"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3554.4984166249534!2d84.87895057530663!3d27.01444105574519!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3993546743903f6f%3A0xc3e65842813589b9!2sAdarsh%20Nagar%20Birgunj!5e0!3m2!1sen!2snp!4v1714574500000!5m2!1sen!2snp"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-cross-origin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Copyright Bar */}
        <div className="border-t border-stone-900 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <p>
              © {new Date().getFullYear()} Hashtag Pizza Birgunj. All rights reserved.
            </p>
            <p>
              RB Complex, Loharpatti, Adarshnagar, Birgunj · Dine In · Take Away · Delivery
            </p>
          </div>
        </div>
      </footer>

      {/* Toast Notification for Cart Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.16 }}
            className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl border border-stone-700 flex items-center gap-3 text-sm font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-[#FFD700] shrink-0" />
            <span>{toastMessage}</span>
            <button
              onClick={() => setIsCartOpen(true)}
              className="text-xs font-bold text-[#FFD700] underline ml-2 whitespace-nowrap cursor-pointer"
            >
              View Order
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SLIDE-OVER ORDER & CHECKOUT DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
              aria-label="Your Hashtag Pizza Order"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-stone-900">
                    Your Order Tray
                  </h2>
                  <p className="text-xs text-stone-500">
                    {CONTACT_INFO.address}
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                  aria-label="Close order drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {confirmedOrderId ? (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <div>
                      <p className="text-xs font-mono uppercase text-emerald-700 font-semibold">
                        Order Reference {confirmedOrderId}
                      </p>
                      <h3 className="font-display text-xl font-bold text-stone-900 mt-1">
                        Order Logged for Kitchen Prep!
                      </h3>
                      <p className="text-xs text-stone-600 mt-1">
                        {serviceType} · Total Rs. {cartSubtotal} (Cash / eSewa / Fonepay on {serviceType})
                      </p>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Click below to send your instant confirmation ticket to our Birgunj kitchen WhatsApp ({CONTACT_INFO.whatsappDisplay}) for immediate dispatch.
                    </p>
                    <a
                      href={buildWhatsAppOrderUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[#E31B23] hover:bg-[#c8141b] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Send Kitchen Ticket on WhatsApp</span>
                    </a>
                  </div>
                ) : null}

                {/* Itemized List */}
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <p className="font-display font-bold text-stone-800 mb-1">
                      Your order tray is empty
                    </p>
                    <p className="text-xs text-stone-500 mb-5">
                      Add pizzas, CFC buckets, burgers, or momos from the menu.
                    </p>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        scrollToSection('interactive-menu');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#0047AB] text-white text-xs font-semibold cursor-pointer"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((c) => (
                      <div
                        key={c.cartKey}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-stone-900 truncate">
                            {c.item.name}
                          </p>
                          <p className="text-xs text-stone-500 font-mono tabular-nums">
                            {c.sizeLabel ? `${c.sizeLabel} · ` : ''}Rs. {c.unitPrice} each
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(c.cartKey, -1)}
                            className="w-7 h-7 rounded-md bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            {c.quantity === 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="font-mono tabular-nums text-xs font-semibold w-5 text-center">
                            {c.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(c.cartKey, 1)}
                            className="w-7 h-7 rounded-md bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Service Type & Customer Details Form */}
                {cart.length > 0 && (
                  <form
                    id="checkout-form"
                    onSubmit={handleConfirmDirectOrder}
                    className="space-y-4 pt-4 border-t border-stone-200"
                  >
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                        Service Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-lg">
                        {(['Delivery', 'Take Away', 'Dine In'] as const).map(
                          (mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                setServiceType(mode);
                                if (mode === 'Dine In' && !selectedTable) {
                                  setSelectedTable(1);
                                }
                              }}
                              className={`py-2 px-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                serviceType === mode
                                  ? 'bg-white text-stone-900 shadow-xs'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                            >
                              {mode}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Table-Side Picker when Dine In is selected */}
                    {serviceType === 'Dine In' && (
                      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                            <Utensils className="w-3.5 h-3.5 text-amber-700" />
                            <span>Select Your Table (1 – 8):</span>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                            {selectedTable ? `Table #${selectedTable}` : 'No Table Selected'}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedTable(t)}
                              className={`py-2 px-1 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                                selectedTable === t
                                  ? 'bg-[#164699] text-white border-[#164699] shadow-xs scale-102'
                                  : 'bg-white text-stone-700 border-amber-200/80 hover:border-amber-400 hover:bg-amber-100/50'
                              }`}
                            >
                              Table {t}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-amber-900/80 pt-1 border-t border-amber-200/60">
                          <span>✨ Direct to Kitchen · Free WiFi</span>
                          <button
                            type="button"
                            onClick={() => setIsTableQrModalOpen(true)}
                            className="text-[#164699] hover:underline font-semibold flex items-center gap-1"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>View QR Stands</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Rohan Sharma"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#0047AB]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="98XXXXXXXX"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:border-[#0047AB]"
                        />
                      </div>
                    </div>

                    {serviceType === 'Delivery' && (
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Delivery Location in Birgunj *
                        </label>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="e.g. Adarshnagar, near Ghantaghar / Link Road"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#0047AB]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Cooking Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Extra spicy, extra oregano, BOGO choice..."
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#0047AB]"
                      />
                    </div>

                    {formError && (
                      <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                        {formError}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-stone-200 bg-stone-50 space-y-3">
                  {/* Loyalty Points Perks in Cart */}
                  {appliedLoyaltyReward ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-emerald-950">
                            Perk Applied: {appliedLoyaltyReward.title}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            {appliedLoyaltyReward.type === 'free_item'
                              ? `Free Item: ${appliedLoyaltyReward.freeItemName} (Rs. 0)`
                              : `Rs. ${appliedLoyaltyReward.discountAmount} Discount Applied (-${appliedLoyaltyReward.pointsCost} pts)`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAppliedLoyaltyReward(null)}
                        className="text-stone-400 hover:text-stone-700 text-xs font-bold px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsLoyaltyPassOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300/80 text-amber-950 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Have Loyalty Points? Redeem Discounts & Free Food</span>
                      </span>
                      <span className="text-[#164699] font-extrabold text-[11px]">View Perks →</span>
                    </button>
                  )}

                  {/* Subtotal & Discount Breakdown */}
                  {loyaltyDiscount > 0 && (
                    <div className="space-y-1 text-xs text-stone-600 pt-1 border-t border-stone-200">
                      <div className="flex items-center justify-between">
                        <span>Cart Subtotal</span>
                        <span className="font-mono">Rs. {cartSubtotal}</span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-emerald-600">
                        <span>Loyalty Points Discount</span>
                        <span className="font-mono">-Rs. {loyaltyDiscount}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-base font-bold text-stone-900 pt-1">
                    <div>
                      <span>Total Payable</span>
                      <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Earns +{pointsToEarn} loyalty points</span>
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-xl text-[#E31B23]">
                      Rs. {finalPayable}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500">
                    Pay via Cash on Delivery, eSewa, or Fonepay QR (5% cashback on Take.App orders).
                  </p>

                  <div className="grid grid-cols-1 gap-2.5 pt-1">
                    <button
                      type="submit"
                      form="checkout-form"
                      className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Confirm Order Ticket
                    </button>
                    <a
                      href={buildWhatsAppOrderUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[#E31B23] hover:bg-[#c8141b] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Order Directly via WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Hashtag Pizza CRM & Kitchen Control Modal */}
      <CrmPortal isOpen={isCrmOpen} onClose={() => setIsCrmOpen(false)} />

      {/* Customer Loyalty Pass & Rewards Modal */}
      <CustomerLoyaltyPassModal
        isOpen={isLoyaltyPassOpen}
        onClose={() => setIsLoyaltyPassOpen(false)}
        defaultPhone={customerPhone}
        appliedRewardId={appliedLoyaltyReward?.id}
        onApplyRewardToCart={(reward) => {
          setAppliedLoyaltyReward(reward);
          triggerToast(`Applied perk: ${reward.title}!`);
        }}
      />

      {/* Table-Side QR Code Stand Generator & Print Sheet Modal */}
      <TableQrModal
        isOpen={isTableQrModalOpen}
        onClose={() => setIsTableQrModalOpen(false)}
        onSelectTable={(t) => setSelectedTable(t)}
      />

      {/* Table Switcher Modal */}
      <TableSelectorModal
        isOpen={isTableSelectorOpen}
        onClose={() => setIsTableSelectorOpen(false)}
        currentTable={selectedTable}
        onSelectTable={(t) => {
          setSelectedTable(t === 0 ? null : t);
          if (t > 0) setServiceType('Dine In');
        }}
      />

      {/* PWA Offline Network Status Indicator & Phone Ordering Fallback */}
      <OfflineIndicator />
    </div>
  );
}
