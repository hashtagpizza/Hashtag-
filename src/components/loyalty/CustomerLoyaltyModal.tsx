import React, { useState } from 'react';
import {
  X,
  Star,
  Sparkles,
  Gift,
  Award,
  TrendingUp,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import { Customer, LoyaltyReward, LOYALTY_REWARDS_CATALOG, LoyaltyRedemption } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { HashtagLogo } from '../HashtagLogo';

interface CustomerLoyaltyModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated?: (updatedCustomer: Customer) => void;
}

export const CustomerLoyaltyModal: React.FC<CustomerLoyaltyModalProps> = ({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
}) => {
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<LoyaltyRedemption | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual points adjustment form
  const [showAdjustPoints, setShowAdjustPoints] = useState(false);
  const [pointsDelta, setPointsDelta] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('Special customer bonus');

  if (!isOpen || !customer) return null;

  const currentPoints = customer.loyaltyPoints ?? 0;
  const totalSpend = customer.totalSpend ?? 0;
  const totalOrders = customer.totalOrders ?? 0;

  // Next tier calculation
  let nextTierName = 'VIP Elite';
  let spendNeeded = 0;
  let percentToNext = 100;

  if (customer.tier === 'Bronze') {
    nextTierName = 'Silver';
    spendNeeded = Math.max(0, 2000 - totalSpend);
    percentToNext = Math.min(100, Math.round((totalSpend / 2000) * 100));
  } else if (customer.tier === 'Silver') {
    nextTierName = 'Gold';
    spendNeeded = Math.max(0, 5000 - totalSpend);
    percentToNext = Math.min(100, Math.round((totalSpend / 5000) * 100));
  } else if (customer.tier === 'Gold') {
    nextTierName = 'VIP';
    spendNeeded = Math.max(0, 10000 - totalSpend);
    percentToNext = Math.min(100, Math.round((totalSpend / 10000) * 100));
  }

  const handleRedeemReward = async (reward: LoyaltyReward) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const redemption = await crmService.redeemLoyaltyReward({
        customerId: customer.id,
        rewardId: reward.id,
        staffNotes: `Redeemed by staff via CRM profile for ${customer.name}`,
      });

      setRedeemSuccess(redemption);
      const updated: Customer = {
        ...customer,
        loyaltyPoints: Math.max(0, currentPoints - reward.pointsCost),
      };
      if (onCustomerUpdated) onCustomerUpdated(updated);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to redeem reward.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustPoints = async (isAddition: boolean) => {
    const delta = isAddition ? Math.abs(pointsDelta) : -Math.abs(pointsDelta);
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const newBalance = await crmService.adjustLoyaltyPoints({
        customerId: customer.id,
        pointsDelta: delta,
        reason: adjustReason.trim() || 'Manual CRM Adjustment',
      });
      const updated: Customer = {
        ...customer,
        loyaltyPoints: newBalance,
      };
      if (onCustomerUpdated) onCustomerUpdated(updated);
      setShowAdjustPoints(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to adjust points.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendWhatsAppRewardNotice = (redemption: LoyaltyRedemption) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `977${cleanPhone}` : cleanPhone;
    const text = `🎉 Namaste ${customer.name}! You just redeemed ${redemption.pointsDeducted} Loyalty Points at Hashtag Pizza Birgunj for: *${redemption.rewardTitle}* (${redemption.rewardValue}). Voucher Code: *${redemption.redemptionCode}*. Show this message to our counter staff or mention in your next order! Thank you for being our ${customer.tier} member! 🍕`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center font-black shadow-lg">
              <Star className="w-6 h-6 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {customer.name}
                </h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    customer.tier === 'VIP'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : customer.tier === 'Gold'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : customer.tier === 'Silver'
                      ? 'bg-slate-700/60 text-slate-200 border-slate-600'
                      : 'bg-amber-900/30 text-amber-400 border-amber-700/40'
                  }`}
                >
                  {customer.tier} Tier
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{customer.phone}</span>
                {customer.address && (
                  <>
                    <span>•</span>
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{customer.address}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Available Points
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {currentPoints.toLocaleString()}
                </span>
                <span className="text-xs text-amber-300 font-bold">pts</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Worth ~Rs. {Math.round(currentPoints * 1)} in perks
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Spend
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  Rs. {totalSpend.toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Lifetime in Birgunj
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Orders
              </span>
              <div className="text-2xl font-black text-white font-mono">
                {totalOrders}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Avg: Rs. {totalOrders > 0 ? Math.round(totalSpend / totalOrders) : 0}/order
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Action
              </span>
              <button
                onClick={() => setShowAdjustPoints(!showAdjustPoints)}
                className="mt-2 w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
              >
                {showAdjustPoints ? 'Close Adjustment' : '+/- Adjust Points'}
              </button>
            </div>
          </div>

          {/* Tier Progress Bar */}
          {customer.tier !== 'VIP' && (
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">
                  Progress to <strong className="text-amber-400">{nextTierName} Tier</strong>:
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Rs. {spendNeeded.toLocaleString()} more spend needed
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentToNext}%` }}
                />
              </div>
            </div>
          )}

          {/* Manual Points Adjustment Panel */}
          {showAdjustPoints && (
            <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-300">
                  Manual Points Modification (Staff Override)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Current: {currentPoints} pts
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Points Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Reason / Explanation
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Birthday gift, festival promo, customer goodwill"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAdjustPoints(true)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  + Add {pointsDelta} Points
                </button>
                <button
                  type="button"
                  disabled={isProcessing || currentPoints < pointsDelta}
                  onClick={() => handleAdjustPoints(false)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  - Deduct {pointsDelta} Points
                </button>
              </div>
            </div>
          )}

          {/* Success Banner if Redeemed */}
          {redeemSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white text-sm">
                    Reward Successfully Redeemed!
                  </p>
                  <p className="text-emerald-300">
                    Voucher: <strong className="font-mono bg-emerald-900/80 px-1.5 py-0.5 rounded text-white">{redeemSuccess.redemptionCode}</strong> · {redeemSuccess.rewardTitle} ({redeemSuccess.rewardValue})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => sendWhatsAppRewardNotice(redeemSuccess)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shrink-0 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl text-rose-200 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Rewards Catalog & Award Discounts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span>Available Loyalty Rewards & Discounts</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Award discounts or free items based on available points ({currentPoints} pts).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LOYALTY_REWARDS_CATALOG.map((reward) => {
                const canAfford = currentPoints >= reward.pointsCost;
                return (
                  <div
                    key={reward.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      canAfford
                        ? 'bg-slate-950/90 border-slate-700/80 hover:border-amber-400/60 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                          {reward.badge}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-800/40">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{reward.pointsCost} Pts</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-white">{reward.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {reward.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        {reward.type === 'free_item'
                          ? `🎁 Free: ${reward.freeItemName}`
                          : `💰 Flat Rs. ${reward.discountAmount} OFF`}
                      </span>

                      <button
                        type="button"
                        disabled={!canAfford || isProcessing}
                        onClick={() => handleRedeemReward(reward)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-sm active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'Award / Redeem' : 'Need More Pts'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Customer ID: {customer.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
