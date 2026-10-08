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
  Check,
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
  Camera,
  Upload,
  Receipt,
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
  PIZZA_SIZE_ADDONS,
  DIPS_ADDONS,
  BEVERAGE_ADDONS,
} from './constants';
import { HashtagLogo } from './components/HashtagLogo';
import { ResilientImage } from './components/ResilientImage';
import { CrmPortal } from './components/crm/CrmPortal';
import { crmService } from './services/crmService';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { TableQrModal } from './components/tables/TableQrModal';
import { TableBanner } from './components/tables/TableBanner';
import { TableSelectorModal } from './components/tables/TableSelectorModal';
import { CustomerLoyaltyPassModal } from './components/loyalty/CustomerLoyaltyPassModal';
import { LoyaltyReward } from './types/crm';
import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { UserMenu } from './components/auth/UserMenu';
import { DeliveryLocationPicker } from './components/delivery/DeliveryLocationPicker';
import { HashtagAiBot } from './components/chat/HashtagAiBot';
import { gmailService } from './services/gmailService';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { OrderHistory } from './components/profile/OrderHistory';
import {
  OrderConfirmationTicketModal,
  OrderTicketData,
} from './components/orders/OrderConfirmationTicketModal';

interface CartItem {
  cartKey: string;
  item: MenuItem;
  sizeLabel?: string;
  unitPrice: number;
  quantity: number;
}

export default function App() {
  const { user, isStaff, isAdmin, openAuthModal, logout } = useAuth();

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastAddedCartKey, setLastAddedCartKey] = useState<string | null>(null);

  // Checkout form state
  const [serviceType, setServiceType] = useState<'Delivery' | 'Take Away' | 'Dine In'>('Delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(40);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number>(0.8);
  const [deliveryLandmark, setDeliveryLandmark] = useState<string>('Adarshnagar (Near Ghantaghar)');
  const [deliveryTier, setDeliveryTier] = useState<string>('Up to 1.0 km: Rs. 40');
  const [isDeliveryOutOfRange, setIsDeliveryOutOfRange] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Profile Modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Merged Drawer state: 'tray' (Your Order Tray) or 'orders' (My Orders)
  const [drawerTab, setDrawerTab] = useState<'tray' | 'orders'>('tray');

  // Dedicated Responsive Order Confirmation Ticket state
  const [activeOrderTicket, setActiveOrderTicket] = useState<OrderTicketData | null>(null);
  const [isOrderTicketModalOpen, setIsOrderTicketModalOpen] = useState(false);

  // Table-side QR ordering state (Tables 1 - 10)
  const [selectedTable, setSelectedTable] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('table');
      if (param) {
        const val = parseInt(param, 10);
        if (val >= 1 && val <= 10) return val;
      }
    }
    return null;
  });
  const [isTableQrModalOpen, setIsTableQrModalOpen] = useState(false);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);

  // Live Menu Items from Firestore CMS
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);

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

  // Loyalty Rewards & Points state
  const [isLoyaltyPassOpen, setIsLoyaltyPassOpen] = useState(false);
  const [appliedLoyaltyReward, setAppliedLoyaltyReward] = useState<LoyaltyReward | null>(null);

  // Exact restaurant photo state
  const [customStoryPhoto, setCustomStoryPhoto] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hashtag_custom_interior_photo') || null;
    }
    return null;
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomStoryPhoto(result);
          try {
            localStorage.setItem('hashtag_custom_interior_photo', result);
          } catch (err) {
            console.warn('LocalStorage quota note:', err);
          }
          triggerToast('Loaded your exact Hashtag Pizza collage picture!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomStoryPhoto(result);
          try {
            localStorage.setItem('hashtag_custom_interior_photo', result);
          } catch (err) {
            console.warn('LocalStorage quota note:', err);
          }
          triggerToast('Loaded your exact Hashtag Pizza collage picture!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
    setLastAddedCartKey(cartKey);
    setTimeout(() => {
      setLastAddedCartKey((prev) => (prev === cartKey ? null : prev));
    }, 1800);
    triggerToast(`Added ${item.name}${sizeLabel ? ` (${sizeLabel})` : ''} to cart`);
  };

  const getItemCartQuantity = (item: MenuItem) => {
    const sizeIdx = getSelectedSizeIndex(item);
    const chosenSize = item.sizes && item.sizes[sizeIdx] ? item.sizes[sizeIdx] : undefined;
    const sizeLabel = chosenSize ? chosenSize.label : undefined;
    const cartKey = `${item.id}__${sizeLabel || 'standard'}`;
    const found = cart.find((c) => c.cartKey === cartKey);
    return { quantity: found ? found.quantity : 0, cartKey };
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

  const foodPayable = useMemo(() => {
    return Math.max(0, cartSubtotal - loyaltyDiscount);
  }, [cartSubtotal, loyaltyDiscount]);

  const finalPayable = useMemo(() => {
    const deliveryCost = serviceType === 'Delivery' ? deliveryFee : 0;
    return Math.max(0, foodPayable + deliveryCost);
  }, [foodPayable, serviceType, deliveryFee]);

  const pointsToEarn = useMemo(() => {
    // Loyalty points awarded strictly on food items order only (excludes delivery fee)
    return Math.floor(foodPayable / 10);
  }, [foodPayable]);

  // Detected Pizza sizes in cart (S, M, L) to show size-specific add-on suggestions
  const activePizzaSizesInCart = useMemo<'S' | 'M' | 'L'[]>(() => {
    const sizes = new Set<'S' | 'M' | 'L'>();
    for (const c of cart) {
      const isPizza =
        c.item.category?.toLowerCase().includes('pizza') ||
        c.item.id?.startsWith('p-') ||
        c.item.id?.startsWith('vc-') ||
        c.item.id?.startsWith('nc-') ||
        c.item.id?.startsWith('sp-') ||
        Boolean(c.item.sizes && c.item.sizes.length > 0);
      if (isPizza) {
        const label = (c.sizeLabel || '').toLowerCase();
        if (label.includes('large') || label.includes('(l)') || label === 'l' || label.includes('12')) {
          sizes.add('L');
        } else if (label.includes('medium') || label.includes('(m)') || label === 'm' || label.includes('9')) {
          sizes.add('M');
        } else {
          sizes.add('S');
        }
      }
    }
    return Array.from(sizes);
  }, [cart]);

  const [selectedAddonSize, setSelectedAddonSize] = useState<'S' | 'M' | 'L'>('S');

  // Auto-switch to first active pizza size when cart pizza sizes update
  useEffect(() => {
    if (activePizzaSizesInCart.length > 0 && !activePizzaSizesInCart.includes(selectedAddonSize)) {
      setSelectedAddonSize(activePizzaSizesInCart[0]);
    }
  }, [activePizzaSizesInCart, selectedAddonSize]);

  const getAddonInCartQuantity = (name: string, sizeLabel?: string) => {
    const itemId = `addon-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const cartKey = `${itemId}__${sizeLabel || 'standard'}`;
    return cart.find((c) => c.cartKey === cartKey)?.quantity || 0;
  };

  const handleAddAddon = (
    name: string,
    price: number,
    description: string,
    sizeLabel?: string,
    dietary: 'veg' | 'non-veg' = 'veg'
  ) => {
    const itemId = `addon-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const syntheticItem: MenuItem = {
      id: itemId,
      name,
      price,
      description,
      category: 'sides-pasta',
      highlightGroup: 'all',
      dietary,
      image: '',
    };
    const cartKey = `${itemId}__${sizeLabel || 'standard'}`;
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
          item: syntheticItem,
          sizeLabel,
          unitPrice: price,
          quantity: 1,
        },
      ];
    });
    setConfirmedOrderId(null);
    setLastAddedCartKey(cartKey);
    setTimeout(() => {
      setLastAddedCartKey((prev) => (prev === cartKey ? null : prev));
    }, 1800);
    triggerToast(`Added ${name} (Rs. ${price}) to your order!`);
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
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
  }, [menuItems, activeCategory, dietaryFilter, searchQuery]);

  const buildWhatsAppOrderUrl = (orderIdOverride?: string) => {
    const ticket = activeOrderTicket;
    const orderRef = orderIdOverride || confirmedOrderId || ticket?.orderId || 'NEW';
    const currentMode = ticket
      ? ticket.orderType === 'dine-in'
        ? 'Dine In'
        : ticket.orderType === 'delivery'
        ? 'Delivery'
        : 'Take Away'
      : serviceType;
    const currentTable = ticket?.tableNumber || selectedTable;
    const isTableDineIn = currentMode === 'Dine In' && currentTable;
    const currentName = ticket?.customerName || customerName;
    const currentPhone = ticket?.customerPhone || customerPhone;
    const currentAddress = ticket?.deliveryAddress || customerAddress;
    const currentLandmark = ticket?.deliveryLandmark || deliveryLandmark;
    const currentDistance = ticket?.deliveryDistanceKm || deliveryDistanceKm;
    const currentFee = ticket?.deliveryFee ?? (serviceType === 'Delivery' ? deliveryFee : 0);
    const currentNotes = ticket?.notes || orderNotes;
    const currentRewardTitle = ticket?.loyaltyRewardTitle || appliedLoyaltyReward?.title;
    const currentDiscount = ticket?.loyaltyDiscount || loyaltyDiscount;
    const currentSubtotal = ticket?.subtotal ?? cartSubtotal;
    const currentTotal = ticket?.total ?? finalPayable;
    const currentPoints = ticket?.pointsEarned ?? pointsToEarn;

    const itemLines =
      ticket && ticket.items && ticket.items.length > 0
        ? ticket.items.map(
            (c) =>
              `• ${c.quantity}x ${c.name}${c.sizeLabel ? ` (${c.sizeLabel})` : ''} — Rs. ${
                c.totalPrice
              }`
          )
        : cart.map(
            (c) =>
              `• ${c.quantity}x ${c.item.name}${
                c.sizeLabel ? ` (${c.sizeLabel})` : ''
              } — Rs. ${c.unitPrice * c.quantity}`
          );

    const lines = [
      isTableDineIn
        ? `*🍽️ HASHTAG PIZZA BIRGUNJ — TABLE #${currentTable} ORDER*`
        : `*🍕 HASHTAG PIZZA BIRGUNJ — OFFICIAL ORDER*`,
      `• Ticket ID: *${orderRef}*`,
      `• Service Mode: ${currentMode}${isTableDineIn ? ` (Table #${currentTable})` : ''}`,
      currentName ? `• Customer: ${currentName}` : null,
      currentPhone ? `• Mobile: ${currentPhone}` : null,
      isTableDineIn ? `• Location: Table #${currentTable} (Dine-in Sitting Area)` : null,
      currentMode === 'Delivery' && currentAddress
        ? `• Delivery Destination: ${currentAddress}${
            currentLandmark ? `\n• Landmark: ${currentLandmark}` : ''
          }\n• Road Distance: ${currentDistance} km (Birgunj Oneway Route)\n• Delivery Fee: Rs. ${currentFee}`
        : null,
      currentNotes ? `• Cooking Note: ${currentNotes}` : null,
      currentRewardTitle
        ? `• Loyalty Perk: ${currentRewardTitle}${
            currentDiscount ? ` (-Rs. ${currentDiscount})` : ''
          }`
        : null,
      `--------------------------------`,
      `*ORDERED ITEMS:*`,
      ...itemLines,
      appliedLoyaltyReward?.type === 'free_item'
        ? `• 1x ${appliedLoyaltyReward.freeItemName} (FREE Loyalty Perk) — Rs. 0`
        : null,
      `--------------------------------`,
      `• Food Subtotal: Rs. ${currentSubtotal}`,
      currentMode === 'Delivery' && currentFee > 0 ? `• Delivery Fee: +Rs. ${currentFee}` : null,
      currentDiscount > 0 ? `• Loyalty Discount: -Rs. ${currentDiscount}` : null,
      `*TOTAL PAYABLE: Rs. ${currentTotal}*`,
      `• Payment Mode: Cash / Fonepay QR (Pending upon receipt)`,
      `• Loyalty Earned: +${currentPoints} pts (1 pt / Rs. 10 on food only)`,
      `--------------------------------`,
      `Please confirm receipt and dispatch. Dhanyabad! 🙏`,
    ].filter(Boolean);

    return `https://api.whatsapp.com/send?phone=${CONTACT_INFO.whatsapp}&text=${encodeURIComponent(
      lines.join('\n')
    )}`;
  };

  const executeOrderPlacement = async (viaWhatsApp: boolean) => {
    if (cart.length === 0) {
      setFormError('Please add at least one item from the menu first.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Please enter your name and 10-digit mobile number so we can confirm your order.');
      return;
    }
    const phoneDigits = customerPhone.replace(/[^0-9]/g, '');
    if (phoneDigits.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number for delivery/contact (e.g. 98XXXXXXXX)');
      return;
    }
    if (serviceType === 'Delivery' && !customerAddress.trim()) {
      setFormError('Please pin your delivery location or provide an address in Birgunj.');
      return;
    }
    if (serviceType === 'Delivery' && (deliveryDistanceKm > 5.0 || isDeliveryOutOfRange)) {
      setFormError(
        'We will only deliver till 5 Km within Birgunj itself. We cannot deliver beyond Birgunj. Please pin your delivery address within 5 km or choose Take Away or Dine In.'
      );
      return;
    }
    setFormError(null);

    const itemsSummary = cart
      .map((c) => `${c.quantity}x ${c.item.name}${c.sizeLabel ? ` (${c.sizeLabel})` : ''}`)
      .join(', ');

    const orderTypeMap = {
      Delivery: 'delivery' as const,
      'Take Away': 'takeaway' as const,
      'Dine In': 'dine-in' as const,
    };

    const cartSnapshot = [...cart];
    const subtotalSnapshot = cartSubtotal;
    const finalPayableSnapshot = finalPayable;
    const foodPayableSnapshot = foodPayable;
    const pointsToEarnSnapshot = pointsToEarn;
    const deliveryFeeSnapshot = serviceType === 'Delivery' ? deliveryFee : 0;
    const loyaltyDiscountSnapshot = loyaltyDiscount;
    const rewardTitleSnapshot = appliedLoyaltyReward?.title;
    const deliveryAddressSnapshot = customerAddress.trim();
    const deliveryLandmarkSnapshot = deliveryLandmark;
    const distanceKmSnapshot = deliveryDistanceKm;
    const serviceTypeSnapshot = serviceType;
    const selectedTableSnapshot = selectedTable;
    const notesSnapshot = orderNotes.trim();

    try {
      const orderId = await crmService.placeOrder({
        userId: user?.uid,
        customerEmail: user?.email,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderType: orderTypeMap[serviceTypeSnapshot],
        tableNumber: serviceTypeSnapshot === 'Dine In' && selectedTableSnapshot ? selectedTableSnapshot : undefined,
        deliveryAddress:
          serviceTypeSnapshot === 'Delivery'
            ? `${deliveryAddressSnapshot} (Landmark: ${deliveryLandmarkSnapshot}, ${distanceKmSnapshot}km, Fee: Rs.${deliveryFeeSnapshot})`
            : serviceTypeSnapshot === 'Dine In'
            ? selectedTableSnapshot
              ? `Table #${selectedTableSnapshot} - Dine In Area`
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
        total: finalPayableSnapshot,
        foodTotal: foodPayableSnapshot,
        deliveryFee: deliveryFeeSnapshot,
        paymentMethod: 'Fonepay/QR',
        notes: [
          notesSnapshot,
          serviceTypeSnapshot === 'Delivery'
            ? `[Delivery: Rs. ${deliveryFeeSnapshot}, ${distanceKmSnapshot} km, ${deliveryTier}]`
            : '',
          appliedLoyaltyReward ? `[Loyalty Reward: ${appliedLoyaltyReward.title}]` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        loyaltyRewardApplied: appliedLoyaltyReward?.id,
        discountApplied: loyaltyDiscountSnapshot,
        pointsToDeduct: appliedLoyaltyReward?.pointsCost,
      });

      setConfirmedOrderId(orderId);

      // Persist order ID locally so Order History fetches it even for guest users
      try {
        const raw = localStorage.getItem('hashtag_my_orders');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        const updated = [orderId, ...existing.filter((id) => id !== orderId)].slice(0, 50);
        localStorage.setItem('hashtag_my_orders', JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }

      // Build dedicated responsive ticket data
      const ticketData: OrderTicketData = {
        orderId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: user?.email,
        orderType: orderTypeMap[serviceTypeSnapshot],
        tableNumber: serviceTypeSnapshot === 'Dine In' && selectedTableSnapshot ? selectedTableSnapshot : undefined,
        deliveryAddress: serviceTypeSnapshot === 'Delivery' ? deliveryAddressSnapshot : undefined,
        deliveryLandmark: serviceTypeSnapshot === 'Delivery' ? deliveryLandmarkSnapshot : undefined,
        deliveryDistanceKm: serviceTypeSnapshot === 'Delivery' ? distanceKmSnapshot : undefined,
        deliveryFee: deliveryFeeSnapshot,
        items: cartSnapshot.map((c) => ({
          name: c.item.name,
          quantity: c.quantity,
          sizeLabel: c.sizeLabel,
          unitPrice: c.unitPrice,
          totalPrice: c.unitPrice * c.quantity,
        })),
        itemsSummary,
        subtotal: subtotalSnapshot,
        loyaltyDiscount: loyaltyDiscountSnapshot > 0 ? loyaltyDiscountSnapshot : undefined,
        loyaltyRewardTitle: rewardTitleSnapshot,
        total: finalPayableSnapshot,
        pointsEarned: pointsToEarnSnapshot,
        paymentMethod: 'Cash / Fonepay / eSewa',
        paymentStatus: 'pending',
        status: 'new',
        createdAt: new Date().toISOString(),
        notes: notesSnapshot || undefined,
      };

      setActiveOrderTicket(ticketData);
      setIsOrderTicketModalOpen(true);
      setIsCartOpen(false);

      // Reset cart and checkout form
      setCart([]);
      setOrderNotes('');
      setAppliedLoyaltyReward(null);

      // Open WhatsApp directly if ordered via WhatsApp
      if (viaWhatsApp) {
        const waLink = buildWhatsAppOrderUrl(orderId);
        try {
          const a = document.createElement('a');
          a.href = waLink;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch {
          window.open(waLink, '_blank', 'noopener,noreferrer');
        }
      }

      triggerToast(
        viaWhatsApp
          ? `Order logged & WhatsApp opened! +${pointsToEarnSnapshot} loyalty pts earned.`
          : `Order confirmed! +${pointsToEarnSnapshot} loyalty pts earned.`
      );

      // Dispatch automated order confirmation via Gmail API if user email or Gmail token is active
      if (user?.email && gmailService.hasGmailAccess()) {
        gmailService
          .sendOrderConfirmationEmail({
            orderId,
            customerName: customerName.trim(),
            customerEmail: user.email,
            customerPhone: customerPhone.trim(),
            serviceType: serviceTypeSnapshot,
            itemsSummary,
            total: finalPayableSnapshot,
            deliveryAddress:
              serviceTypeSnapshot === 'Delivery' ? deliveryAddressSnapshot : undefined,
          })
          .catch((e) => console.warn('Gmail receipt dispatch error:', e));
      }
    } catch (err) {
      console.error('Order placement fallback note:', err);
      const randomCode = `HP-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmedOrderId(randomCode);

      // Persist fallback order ID locally so My Orders shows it
      try {
        const raw = localStorage.getItem('hashtag_my_orders');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        const updated = [randomCode, ...existing.filter((id) => id !== randomCode)].slice(0, 50);
        localStorage.setItem('hashtag_my_orders', JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }

      const fallbackTicket: OrderTicketData = {
        orderId: randomCode,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderType: orderTypeMap[serviceTypeSnapshot],
        tableNumber: serviceTypeSnapshot === 'Dine In' && selectedTableSnapshot ? selectedTableSnapshot : undefined,
        deliveryAddress: serviceTypeSnapshot === 'Delivery' ? deliveryAddressSnapshot : undefined,
        deliveryFee: deliveryFeeSnapshot,
        items: cartSnapshot.map((c) => ({
          name: c.item.name,
          quantity: c.quantity,
          sizeLabel: c.sizeLabel,
          unitPrice: c.unitPrice,
          totalPrice: c.unitPrice * c.quantity,
        })),
        itemsSummary,
        subtotal: subtotalSnapshot,
        total: finalPayableSnapshot,
        pointsEarned: pointsToEarnSnapshot,
        paymentMethod: 'Cash / Fonepay / eSewa',
        paymentStatus: 'pending',
        status: 'new',
        createdAt: new Date().toISOString(),
        notes: notesSnapshot || undefined,
      };

      setActiveOrderTicket(fallbackTicket);
      setIsOrderTicketModalOpen(true);
      setIsCartOpen(false);
      setCart([]);

      if (viaWhatsApp) {
        const waLink = buildWhatsAppOrderUrl(randomCode);
        try {
          const a = document.createElement('a');
          a.href = waLink;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch {
          window.open(waLink, '_blank', 'noopener,noreferrer');
        }
      }
    }
  };

  const handleConfirmDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeOrderPlacement(false);
  };

  const handleOrderViaWhatsApp = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    await executeOrderPlacement(true);
  };

  const handleViewPastOrderTicket = (pastOrder: any) => {
    const ticketData: OrderTicketData = {
      orderId: pastOrder.id,
      customerName: pastOrder.customerName,
      customerPhone: pastOrder.customerPhone,
      customerEmail: pastOrder.customerEmail,
      orderType: pastOrder.orderType,
      tableNumber: pastOrder.tableNumber,
      deliveryAddress: pastOrder.deliveryAddress,
      items: [
        {
          name: pastOrder.itemsSummary,
          quantity: 1,
          unitPrice: pastOrder.total,
          totalPrice: pastOrder.total,
        },
      ],
      itemsSummary: pastOrder.itemsSummary,
      subtotal: pastOrder.foodTotal || pastOrder.total,
      deliveryFee: pastOrder.deliveryFee || 0,
      loyaltyDiscount: pastOrder.discountApplied,
      total: pastOrder.total,
      pointsEarned: pastOrder.pointsEarned || 0,
      paymentMethod: pastOrder.paymentMethod || 'Cash / Fonepay / eSewa',
      paymentStatus: pastOrder.paymentStatus || 'pending',
      status: pastOrder.status || 'new',
      createdAt: pastOrder.createdAt,
      notes: pastOrder.notes,
    };
    setActiveOrderTicket(ticketData);
    setIsOrderTicketModalOpen(true);
  };

  const handleReorder = (itemsSummary: string) => {
    setIsProfileOpen(false);
    const lower = itemsSummary.toLowerCase();
    const matched = menuItems.find((m) => lower.includes(m.name.toLowerCase()));
    if (matched) {
      addToCart(matched);
      setIsCartOpen(true);
      triggerToast(`Reordered ${matched.name}! Added to order tray.`);
    } else {
      setIsCartOpen(true);
      triggerToast('Order tray opened — select your favorite pizzas!');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E31B23] selection:text-white overflow-x-hidden">
      {/* Top Bar Contract: 1-row, 3-zone header */}
      <header className="sticky top-0 z-40 h-16 sm:h-20 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
        <div className="max-w-[1280px] mx-auto h-full px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Brand Title / Original Hashtag Pizza Logo */}
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('hero');
            }}
            className="flex items-center gap-2 sm:gap-3 focus-visible:outline-2 focus-visible:outline-[#0047AB] rounded-lg shrink-0"
          >
            <HashtagLogo size="md" />
          </a>

          {/* Zone 2: Streamlined Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-5 lg:gap-8 text-sm font-semibold text-stone-700"
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

          {/* Zone 3: Streamlined Actions (Account / UserMenu + My Orders + Order Tray + Mobile Toggle) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* User Account & Role-Based Menu */}
            <UserMenu
              onOpenCrm={() => setIsCrmOpen(true)}
              onOpenTableQr={() => setIsTableQrModalOpen(true)}
              onOpenLoyalty={() => setIsLoyaltyPassOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenMyOrders={() => {
                setDrawerTab('orders');
                setIsCartOpen(true);
              }}
            />

            {/* High-Converting Responsive Order Tray Button (Hosts both Order Tray & My Orders tabs) */}
            <button
              onClick={() => {
                setDrawerTab('tray');
                setIsCartOpen(true);
              }}
              className="relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#E31B23] hover:bg-[#c8141b] text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Open order tray"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="hidden xs:inline">Order Tray</span>
              {totalCartItems > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] sm:min-w-[20px] h-4.5 sm:h-5 px-1 sm:px-1.5 rounded-full bg-white text-[#E31B23] text-[10px] sm:text-[11px] font-black font-mono">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Mobile Navigation Toggle */}
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-xl border border-stone-200 bg-white text-stone-800 hover:bg-stone-50 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
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
              className="md:hidden bg-[#FAF8F5] border-b border-stone-200 px-5 py-4 space-y-3 shadow-lg"
            >
              {/* Account Quick Card on Mobile */}
              <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0047AB] text-white flex items-center justify-center font-black text-xs">
                      {user ? (user.displayName?.[0] || 'U') : 'G'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900 leading-tight">
                        {user ? user.displayName : 'Guest Customer'}
                      </p>
                      <p className="text-[11px] text-stone-500 capitalize">
                        {user ? (user.role === 'admin' ? '👑 Owner' : user.role === 'staff' ? '👨‍🍳 Staff' : `⭐ ${user.tier || 'VIP'} Member`) : 'Sign in to earn points'}
                      </p>
                    </div>
                  </div>
                  {user ? (
                    <button
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        logout();
                      }}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        openAuthModal('signin');
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#0047AB] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col space-y-1 text-sm font-bold text-stone-800">
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    scrollToSection('interactive-menu');
                  }}
                  className="text-left py-2 px-1 hover:text-[#E31B23] transition-colors border-b border-stone-100 cursor-pointer"
                >
                  Menu & Deals
                </button>
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    scrollToSection('our-story');
                  }}
                  className="text-left py-2 px-1 hover:text-[#E31B23] transition-colors border-b border-stone-100 cursor-pointer"
                >
                  Our Story
                </button>
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    scrollToSection('kitchen-setup');
                  }}
                  className="text-left py-2 px-1 hover:text-[#E31B23] transition-colors border-b border-stone-100 cursor-pointer"
                >
                  Kitchen Setup & Sitting Area
                </button>
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    scrollToSection('footer-contact');
                  }}
                  className="text-left py-2 px-1 hover:text-[#E31B23] transition-colors border-b border-stone-100 cursor-pointer"
                >
                  Location & Contact
                </button>
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setDrawerTab('orders');
                    setIsCartOpen(true);
                  }}
                  className="text-left py-2 px-1 text-amber-900 font-bold flex items-center justify-between hover:text-[#E31B23] transition-colors border-b border-stone-100 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-700" />
                    <span>My Orders</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Live Status
                  </span>
                </button>
              </div>

              {/* Secondary Tools in Mobile Menu */}
              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setIsLoyaltyPassOpen(true);
                  }}
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 transition-colors cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>VIP Rewards</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setIsTableQrModalOpen(true);
                  }}
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-stone-600" />
                  <span>Table QR (10)</span>
                </button>
              </div>

              {/* Management link strictly if authenticated as staff/admin */}
              {isStaff && (
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setIsCrmOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 shadow-xs cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Store Management & Orders</span>
                </button>
              )}
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
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handlePhotoDrop}
                className="group relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 aspect-[16/10] sm:aspect-[4/3] shadow-2xl"
              >
                <ResilientImage
                  src={customStoryPhoto || ASSETS.founderKitchen}
                  fallbackSrcs={[
                    '/Hashtag Pizza_ A Vibrant Restaurant Collage.png',
                    '/Hashtag_Pizza_A_Vibrant_Restaurant_Collage.png',
                    '/interior_collage.png',
                    '/src/assets/images/hashtag_dining_sitting_1790958715120.jpg',
                  ]}
                  alt="Hashtag Pizza authentic interior dining area, counter, and open kitchen at RB Complex, Birgunj"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent pointer-events-none" />

                {/* 1-Click Upload Exact Collage Picture File */}
                <div className="absolute top-3 right-3 z-10">
                  <label
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 text-amber-300 text-xs font-bold border border-amber-500/40 shadow-xl cursor-pointer backdrop-blur-md transition-all active:scale-95"
                    title="Click to select your exact collage picture or drag & drop it here"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Exact Collage Picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pointer-events-none">
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
            Showing {filteredMenuItems.length} of {menuItems.length} dishes
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

                    {/* Responsive Add to Cart / In-Cart Quantity Stepper */}
                    {(() => {
                      const { quantity: inCartQty, cartKey } = getItemCartQuantity(item);
                      const isJustAdded = lastAddedCartKey === cartKey;

                      if (inCartQty > 0) {
                        return (
                          <div className="flex items-center gap-2 w-full">
                            {/* In-Card Quantity Stepper */}
                            <div className="flex items-center justify-between bg-stone-100 rounded-lg p-1 border border-stone-300 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartQuantity(cartKey, -1);
                                }}
                                className="w-8 h-8 rounded-md bg-white hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                                aria-label="Decrease quantity in cart"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono font-bold text-xs text-stone-900 px-1">
                                {inCartQty} in Cart
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartQuantity(cartKey, 1);
                                }}
                                className="w-8 h-8 rounded-md bg-[#E31B23] hover:bg-[#b8141b] text-white font-bold flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                                aria-label="Increase quantity in cart"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* View Cart Drawer */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCartOpen(true);
                              }}
                              className="py-2.5 px-3 rounded-lg bg-stone-900 hover:bg-[#0047AB] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                              title="View Cart Drawer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                              <span>Cart</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all duration-150 whitespace-nowrap cursor-pointer shadow-xs active:scale-95 ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white scale-[1.01]'
                              : 'bg-stone-900 hover:bg-[#E31B23] text-white'
                          }`}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-4 h-4 text-white" />
                              <span>Added to Cart!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>
                                Add to Cart
                                {activeSize ? ` (${activeSize.shortLabel})` : ''}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })()}
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

                    {(() => {
                      const { quantity: inCartQty, cartKey } = getItemCartQuantity(item);
                      const isJustAdded = lastAddedCartKey === cartKey;

                      if (inCartQty > 0) {
                        return (
                          <div className="inline-flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 border border-stone-300 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCartQuantity(cartKey, -1);
                              }}
                              className="w-7 h-7 rounded-md bg-white hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-xs text-stone-900">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCartQuantity(cartKey, 1);
                              }}
                              className="w-7 h-7 rounded-md bg-[#E31B23] hover:bg-[#b8141b] text-white font-bold flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap cursor-pointer shrink-0 ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-900 hover:bg-[#E31B23] text-white'
                          }`}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
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

            {/* Map Embed & Official Delivery Rates (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 h-[260px] relative shadow-lg">
                <iframe
                  title="Hashtag Pizza Birgunj Location — RB Complex, Adarshnagar"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3554.4984166249534!2d84.87895057530663!3d27.01444105574519!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3993546743903f6f%3A0xc3e65842813589b9!2sAdarsh%20Nagar%20Birgunj!5e0!3m2!1sen!2snp!4v1714574500000!5m2!1sen!2snp"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-cross-origin"
                />
              </div>

              {/* Official Delivery Rates Card */}
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 text-stone-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1.5">
                    <span>🛵 Birgunj Official Delivery Rates</span>
                  </span>
                  <span className="text-[10px] text-stone-400">One-way traffic compliant</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                    <p className="font-bold text-white">Up to 1.0 km: Rs. 40</p>
                    <p className="text-[10px] text-stone-400">Adarshnagar, Ghantaghar, Maisthan</p>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                    <p className="font-bold text-white">1.0 – 2.0 km: Rs. 50</p>
                    <p className="text-[10px] text-stone-400">Ranighat, Panitanki, Murli</p>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                    <p className="font-bold text-white">2.0 – 3.0 km: Rs. 60</p>
                    <p className="text-[10px] text-stone-400">Shreepur, Vishwa</p>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                    <p className="font-bold text-white">3.0 – 4.0 km: Rs. 70</p>
                    <p className="text-[10px] text-stone-400">Pipra, Powerhouse / Bypass</p>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                    <p className="font-bold text-white">4.0 – 5.0 km: Rs. 80</p>
                    <p className="text-[10px] text-stone-400">Birgunj Customs / Inarwa, Gandak</p>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                    <p className="font-bold text-white">&gt; 5.0 km: Rs. 80 + Rs. 15/km</p>
                    <p className="text-[10px] text-stone-400">Save up to 5 locations in checkout</p>
                  </div>
                </div>
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

      {/* PERSISTENT RESPONSIVE FLOATING CART & CHECKOUT BAR */}
      <AnimatePresence>
        {totalCartItems > 0 && !isCartOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-4 left-4 right-20 sm:left-auto sm:right-28 z-40"
          >
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3 px-4 py-3 bg-stone-950 hover:bg-black text-white rounded-2xl shadow-2xl border-2 border-amber-400 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer backdrop-blur-md"
              aria-label="View Cart and Checkout"
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-[#E31B23] flex items-center justify-center text-white shadow-md">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center font-mono shadow-xs">
                  {totalCartItems}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-extrabold text-white leading-tight flex items-center gap-1.5">
                  <span>Cart:</span>
                  <span className="text-amber-300 font-mono">Rs. {cartSubtotal}</span>
                </p>
                <p className="text-[11px] text-stone-300 font-medium">
                  {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} · Tap to View
                </p>
              </div>
              <div className="ml-1 pl-2 border-l border-stone-800 flex items-center text-amber-300 text-xs font-bold gap-1 shrink-0">
                <span className="hidden sm:inline">Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification for Cart Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed top-20 right-4 sm:right-6 z-50 bg-stone-950/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-stone-700/80 flex items-center gap-3 text-sm font-medium backdrop-blur-md"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <span>{toastMessage}</span>
            <button
              onClick={() => setIsCartOpen(true)}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 underline ml-2 whitespace-nowrap cursor-pointer"
            >
              View Cart →
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
              className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col"
              aria-label="Your Hashtag Pizza Order and Past Orders"
            >
              {/* Drawer Header with Merged Tabs: Your Order Tray & My Orders */}
              <div className="px-5 sm:px-6 py-4 border-b border-stone-200 shrink-0 bg-[#FAF8F5]">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-extrabold text-stone-900 leading-tight">
                      {drawerTab === 'tray' ? 'Your Order Tray' : 'My Orders & Live Status'}
                    </h2>
                    <p className="text-[11px] text-stone-500">
                      {CONTACT_INFO.address}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 cursor-pointer transition-colors"
                    aria-label="Close drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Merged Segmented Tab Switcher */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-stone-200/70 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('tray')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      drawerTab === 'tray'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Your Order Tray</span>
                    {totalCartItems > 0 && (
                      <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-[#E31B23] text-white text-[10px] font-black font-mono inline-flex items-center justify-center">
                        {totalCartItems}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerTab('orders')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      drawerTab === 'orders'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-700" />
                    <span>My Orders</span>
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              {drawerTab === 'orders' ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="mb-3.5">
                    <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
                      Live Kitchen & Past Orders
                    </h3>
                    <p className="text-xs text-stone-500">
                      Synced live from our Birgunj kitchen. Track prep status, view receipts, or reorder.
                    </p>
                  </div>
                  <OrderHistory
                    onReorder={handleReorder}
                    onCloseParent={() => setIsCartOpen(false)}
                    onViewTicket={handleViewPastOrderTicket}
                    phoneFilterOverride={user?.phoneNumber || customerPhone || undefined}
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {activeOrderTicket && cart.length === 0 ? (
                      <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-5 text-center space-y-3.5 shadow-xs">
                        <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                        <div>
                          <p className="text-[11px] font-mono uppercase text-emerald-800 font-bold tracking-wider">
                            Official Ticket #{activeOrderTicket.orderId}
                          </p>
                          <h3 className="font-display text-lg font-bold text-stone-900 mt-0.5">
                            Order Logged for Kitchen Prep!
                          </h3>
                          <p className="text-xs text-stone-600 mt-1">
                            {activeOrderTicket.orderType === 'dine-in'
                              ? `Table #${activeOrderTicket.tableNumber || 1} Dine-In`
                              : activeOrderTicket.orderType === 'delivery'
                              ? 'Birgunj Doorstep Delivery'
                              : 'Counter Takeaway'} · Total Rs. {activeOrderTicket.total}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsOrderTicketModalOpen(true)}
                            className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>View Full Ticket</span>
                          </button>

                          <a
                            href={buildWhatsAppOrderUrl()}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Open WhatsApp</span>
                          </a>
                        </div>
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setIsCartOpen(false);
                              scrollToSection('interactive-menu');
                            }}
                            className="px-4 py-2 rounded-xl bg-[#0047AB] text-white text-xs font-semibold cursor-pointer"
                          >
                            Browse Menu
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrawerTab('orders')}
                            className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer transition-colors"
                          >
                            View My Orders →
                          </button>
                        </div>
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

                {/* ORDER TRAY ADD-ONS & BEVERAGES SUGGESTIONS */}
                {cart.length > 0 && (
                  <div className="space-y-4 pt-3 border-t border-stone-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900">
                          Recommended Add-Ons & Dips
                        </h3>
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium">
                        Instant 1-Tap Add
                      </span>
                    </div>

                    {/* PIZZA SIZE SPECIFIC ADD-ONS */}
                    {activePizzaSizesInCart.length > 0 ? (
                      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🍕</span>
                            <div>
                              <p className="text-xs font-black text-stone-900">
                                Pizza Add-Ons ({selectedAddonSize === 'S' ? 'Small' : selectedAddonSize === 'M' ? 'Medium' : 'Large'} Size)
                              </p>
                              <p className="text-[10px] text-stone-500">
                                Suggestions tailored for selected pizza size in your tray
                              </p>
                            </div>
                          </div>

                          {/* Size Selector for Pizzas in Tray */}
                          {activePizzaSizesInCart.length > 1 && (
                            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-amber-300">
                              {activePizzaSizesInCart.map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => setSelectedAddonSize(sz)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                                    selectedAddonSize === sz
                                      ? 'bg-amber-400 text-stone-950 shadow-xs'
                                      : 'text-stone-600 hover:text-stone-900'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pizza Size Addon Items Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            {
                              name: `Cheese Burst ${selectedAddonSize === 'S' ? 'Small' : selectedAddonSize === 'M' ? 'Medium' : 'Large'}`,
                              label: 'Cheese Burst',
                              price: selectedAddonSize === 'S' ? 120 : selectedAddonSize === 'M' ? 200 : 300,
                              desc: 'Molten cheese stuffed crust',
                              dietary: 'veg' as const,
                            },
                            {
                              name: `Extra Cheese ${selectedAddonSize === 'S' ? 'Small' : selectedAddonSize === 'M' ? 'Medium' : 'Large'}`,
                              label: 'Extra Cheese',
                              price: selectedAddonSize === 'S' ? 80 : selectedAddonSize === 'M' ? 140 : 200,
                              desc: '100% mozzarella & cheddar layer',
                              dietary: 'veg' as const,
                            },
                            {
                              name: `Veg Topping ${selectedAddonSize === 'S' ? 'Small' : selectedAddonSize === 'M' ? 'Medium' : 'Large'}`,
                              label: 'Veg Topping',
                              price: selectedAddonSize === 'S' ? 40 : selectedAddonSize === 'M' ? 60 : 80,
                              desc: 'Crisp capsicum, corn, mushrooms',
                              dietary: 'veg' as const,
                            },
                            {
                              name: `Chicken Topping ${selectedAddonSize === 'S' ? 'Small' : selectedAddonSize === 'M' ? 'Medium' : 'Large'}`,
                              label: 'Chicken Topping',
                              price: selectedAddonSize === 'S' ? 60 : selectedAddonSize === 'M' ? 80 : 100,
                              desc: 'Juicy spiced chicken chunks',
                              dietary: 'non-veg' as const,
                            },
                          ].map((addon) => {
                            const sizeFullName = selectedAddonSize === 'S' ? 'Small' : selectedAddonSize === 'M' ? 'Medium' : 'Large';
                            const inCartQty = getAddonInCartQuantity(addon.name, sizeFullName);

                            return (
                              <div
                                key={addon.name}
                                className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-xs flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        addon.dietary === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                    />
                                    <p className="text-xs font-bold text-stone-900 truncate">
                                      {addon.label}{' '}
                                      <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                        {sizeFullName}
                                      </span>
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-stone-500 truncate mt-0.5">
                                    {addon.desc}
                                  </p>
                                  <p className="text-xs font-black text-[#E31B23] font-mono mt-0.5">
                                    Rs. {addon.price}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddAddon(
                                      addon.name,
                                      addon.price,
                                      addon.desc,
                                      sizeFullName,
                                      addon.dietary
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                                    inCartQty > 0
                                      ? 'bg-amber-400 hover:bg-amber-500 text-stone-950 shadow-xs'
                                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                                  }`}
                                >
                                  {inCartQty > 0 ? (
                                    <>
                                      <Check className="w-3 h-3 text-stone-950" />
                                      <span>+{inCartQty}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>Add</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* DIPS SECTION (Rs. 40 each) */}
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🥣</span>
                          <p className="text-xs font-bold text-stone-900">
                            Chef's Signature Dips
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-stone-600 font-mono bg-stone-200/70 px-1.5 py-0.5 rounded">
                          Rs. 40 Each
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { name: 'Cheesy Dip', desc: 'Melted creamy cheese dip' },
                          { name: 'Mayo Dip', desc: 'Garlic creamy mayonnaise' },
                          { name: 'Harisha Dip', desc: 'Zesty Moroccan spiced chilli' },
                          { name: 'Mint Mayo Dip', desc: 'Fresh mint & herb mayo' },
                        ].map((dip) => {
                          const inCartQty = getAddonInCartQuantity(dip.name);
                          return (
                            <div
                              key={dip.name}
                              className="bg-white p-2 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between gap-1.5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-stone-900 truncate">
                                  {dip.name}
                                </p>
                                <p className="text-[10px] font-black text-amber-700 font-mono">
                                  Rs. 40
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddAddon(dip.name, 40, dip.desc, undefined, 'veg')}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                  inCartQty > 0
                                    ? 'bg-amber-400 text-stone-950'
                                    : 'bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200'
                                }`}
                                title={`Add ${dip.name}`}
                              >
                                {inCartQty > 0 ? (
                                  <span className="text-[10px] font-black px-1">+{inCartQty}</span>
                                ) : (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* BEVERAGES SECTION (Bottles only - No Can) */}
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🍾</span>
                          <p className="text-xs font-bold text-stone-900">
                            Chilled Soft Drinks (Bottle Only · No Can)
                          </p>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono">
                          250ml & 750ml
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {[
                          {
                            name: 'Coke (250 ml Bottle)',
                            label: 'Coke 250ml Bottle',
                            price: 60,
                            desc: 'Chilled bottle · No can only bottle',
                          },
                          {
                            name: 'Sprite (250 ml Bottle)',
                            label: 'Sprite 250ml Bottle',
                            price: 60,
                            desc: 'Chilled bottle · No can only bottle',
                          },
                          {
                            name: 'Fanta (250 ml Bottle)',
                            label: 'Fanta 250ml Bottle',
                            price: 60,
                            desc: 'Chilled bottle · No can only bottle',
                          },
                          {
                            name: 'Coke (750 ml Bottle)',
                            label: 'Coke 750ml Sharing Bottle',
                            price: 120,
                            desc: 'Large chilled bottle',
                          },
                          {
                            name: 'Sprite (750 ml Bottle)',
                            label: 'Sprite 750ml Sharing Bottle',
                            price: 120,
                            desc: 'Large chilled bottle',
                          },
                        ].map((bev) => {
                          const inCartQty = getAddonInCartQuantity(bev.name);
                          return (
                            <div
                              key={bev.name}
                              className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-stone-900 truncate">
                                  {bev.label}
                                </p>
                                <p className="text-[10px] text-stone-500 truncate">
                                  {bev.desc}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-black text-[#E31B23] font-mono">
                                  Rs. {bev.price}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddAddon(bev.name, bev.price, bev.desc, undefined, 'veg')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    inCartQty > 0
                                      ? 'bg-amber-400 hover:bg-amber-500 text-stone-950'
                                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                                  }`}
                                >
                                  {inCartQty > 0 ? (
                                    <>
                                      <Check className="w-3 h-3 text-stone-950" />
                                      <span>+{inCartQty}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>Add</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                            <span>Select Your Table (1 – 10):</span>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                            {selectedTable ? `Table #${selectedTable}` : 'No Table Selected'}
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
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
                      <div className="pt-1">
                        <DeliveryLocationPicker
                          initialAddress={customerAddress}
                          currentFee={deliveryFee}
                          onLocationSelected={(loc) => {
                            setCustomerAddress(loc.address);
                            setDeliveryLandmark(loc.landmark);
                            setDeliveryFee(loc.deliveryFee);
                            setDeliveryDistanceKm(loc.distanceKm);
                            setDeliveryTier(loc.tierDescription);
                          }}
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

                  {/* Subtotal, Delivery Fee & Discount Breakdown */}
                  <div className="space-y-1.5 text-xs text-stone-600 pt-1 border-t border-stone-200">
                    <div className="flex items-center justify-between">
                      <span>Items Subtotal</span>
                      <span className="font-mono">Rs. {cartSubtotal}</span>
                    </div>

                    {serviceType === 'Delivery' && (
                      <div className="flex items-center justify-between text-stone-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                        <div>
                          <span className="font-bold">Birgunj Delivery Fee</span>
                          <p className="text-[10px] text-stone-500">
                            {deliveryDistanceKm} km · Oneway loop route ({deliveryTier.split(' (')[0]})
                          </p>
                        </div>
                        <span className="font-mono font-bold text-[#E31B23]">+Rs. {deliveryFee}</span>
                      </div>
                    )}

                    {loyaltyDiscount > 0 && (
                      <div className="flex items-center justify-between font-bold text-emerald-600">
                        <span>Loyalty Points Discount</span>
                        <span className="font-mono">-Rs. {loyaltyDiscount}</span>
                      </div>
                    )}
                  </div>

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
                      className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Confirm Order Ticket</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOrderViaWhatsApp}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Order Directly via WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.aside>
      </>
    )}
  </AnimatePresence>

  {/* Authentication & Authorization Modal */}
  <AuthModal />

  {/* User Profile Modal */}
  <UserProfileModal
    isOpen={isProfileOpen}
    onClose={() => setIsProfileOpen(false)}
    onOpenLoyalty={() => setIsLoyaltyPassOpen(true)}
    onOpenMyOrders={() => {
      setIsProfileOpen(false);
      setDrawerTab('orders');
      setIsCartOpen(true);
    }}
  />

  {/* Official Responsive Confirmation Order Ticket Modal */}
  <OrderConfirmationTicketModal
    isOpen={isOrderTicketModalOpen}
    onClose={() => setIsOrderTicketModalOpen(false)}
    order={activeOrderTicket}
    onViewOrderHistory={() => {
      setIsOrderTicketModalOpen(false);
      setDrawerTab('orders');
      setIsCartOpen(true);
    }}
  />

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

      {/* Gemini Powered Hashtag Pizza AI Bot */}
      <HashtagAiBot />
    </div>
  );
}
