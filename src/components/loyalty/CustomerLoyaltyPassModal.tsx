import React, { useState } from 'react';
import {
  X,
  Star,
  Sparkles,
  Gift,
  CheckCircle,
  Phone,
  Search,
  ArrowRight,
  TrendingUp,
  Tag,
  Award,
} from 'lucide-react';
import { Customer, LoyaltyReward, LOYALTY_REWARDS_CATALOG } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { HashtagLogo } from '../HashtagLogo';

interface CustomerLoyaltyPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  onApplyRewardToCart?: (reward: LoyaltyReward) => void;
  appliedRewardId?: string | null;
}

export const CustomerLoyaltyPassModal: React.FC<CustomerLoyaltyPassModalProps> = ({
  isOpen,
  onClose,
  defaultPhone = '',
  onApplyRewardToCart,
  appliedRewardId,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = phoneNumber.trim();
    if (clean.length < 7) {
      setErrorMessage('Please enter a valid mobile number (e.g. 98XXXXXXXX).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const found = await crmService.getCustomerByPhone(clean);
      setCustomer(found);
      if (!found) {
        setErrorMessage('No order history found for this phone number yet. Place your first order to get 50 bonus welcome points!');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const points = customer?.loyaltyPoints ?? 0;
  const spend = customer?.totalSpend ?? 0;
  const orders = customer?.totalOrders ?? 0;
  const tier = customer?.tier ?? 'Bronze';

  // Tier Progress Calculation
  let nextTier = 'Silver';
  let targetSpend = 2000;
  if (tier === 'Silver') {
    nextTier = 'Gold';
    targetSpend = 5000;
  } else if (tier === 'Gold') {
    nextTier = 'VIP';
    targetSpend = 10000;
  }

  const spendNeeded = Math.max(0, targetSpend - spend);
  const progressPercent = Math.min(100, Math.round((spend / targetSpend) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl text-stone-900 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#164699] via-[#1d57ba] to-[#164699] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-900 flex items-center justify-center font-black shadow-md">
              <Star className="w-5 h-5 fill-stone-900" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Hashtag VIP Club & Rewards
              </h2>
              <p className="text-xs text-blue-100">
                Earn 1 Point per Rs. 10 spent · Redeem for free pizza, momos & cash discounts!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-stone-50">
          {/* Phone Lookup Form */}
          <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Enter Your Mobile Number to View Points:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9861370721"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono focus:outline-none focus:border-[#164699]"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#164699] hover:bg-[#12397c] text-white font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Checking...' : 'Check Balance'}</span>
              </button>
            </div>
            {errorMessage && (
              <p className="text-xs text-rose-600 mt-2 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                {errorMessage}
              </p>
            )}
          </form>

          {/* Customer Profile Card if Found */}
          {customer ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Digital Membership Pass Card */}
              <div className="rounded-3xl p-6 bg-gradient-to-br from-[#164699] via-[#0d2f6e] to-stone-900 text-white shadow-xl relative overflow-hidden border border-blue-800">
                <div className="absolute right-0 top-0 w-56 h-56 bg-amber-400/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex items-start justify-between relative z-10 mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Hashtag Pizza Birgunj Member
                    </span>
                    <h3 className="text-xl font-black mt-0.5">{customer.name}</h3>
                    <p className="text-xs text-blue-200 font-mono mt-0.5">{customer.phone}</p>
                  </div>

                  <span
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm ${
                      tier === 'VIP'
                        ? 'bg-purple-500/30 text-purple-200 border-purple-400'
                        : tier === 'Gold'
                        ? 'bg-amber-400 text-stone-950 border-amber-300 font-extrabold'
                        : tier === 'Silver'
                        ? 'bg-slate-200 text-stone-900 border-white'
                        : 'bg-amber-900/40 text-amber-300 border-amber-700'
                    }`}
                  >
                    ★ {tier} Tier
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/15 relative z-10">
                  <div>
                    <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
                      Available Points
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                      {points.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
                      Total Spend
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                      Rs. {spend.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
                      Total Orders
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      {orders}
                    </span>
                  </div>
                </div>

                {tier !== 'VIP' && (
                  <div className="mt-5 pt-4 border-t border-white/10 relative z-10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-blue-200">
                      <span>
                        Next: <strong className="text-white font-bold">{nextTier} Tier</strong>
                      </span>
                      <span>Rs. {spendNeeded.toLocaleString()} spend remaining</span>
                    </div>
                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Redeemable Rewards Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span>Redeemable Discounts & Free Items</span>
                  </h4>
                  <span className="text-xs text-stone-500 font-medium">
                    Your Balance: <strong className="text-[#164699] font-mono">{points} Pts</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LOYALTY_REWARDS_CATALOG.map((reward) => {
                    const canAfford = points >= reward.pointsCost;
                    const isSelected = appliedRewardId === reward.id;

                    return (
                      <div
                        key={reward.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                            : canAfford
                            ? 'bg-white border-stone-200 hover:border-amber-400 shadow-xs'
                            : 'bg-stone-100/70 border-stone-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                              {reward.badge}
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              ★ {reward.pointsCost} Pts
                            </span>
                          </div>

                          <h5 className="font-bold text-sm text-stone-900">{reward.title}</h5>
                          <p className="text-xs text-stone-500 mt-1 leading-snug">
                            {reward.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-600">
                            {reward.type === 'free_item'
                              ? `🎁 Free: ${reward.freeItemName}`
                              : `💰 Rs. ${reward.discountAmount} Off Total`}
                          </span>

                          {onApplyRewardToCart && (
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => {
                                onApplyRewardToCart(reward);
                                onClose();
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : canAfford
                                  ? 'bg-[#164699] hover:bg-[#12397c] text-white shadow-xs'
                                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              }`}
                            >
                              {isSelected ? 'Applied ✓' : canAfford ? 'Claim in Order' : 'Need Points'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* How It Works Explainer if no customer has been loaded yet */
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>How Hashtag Pizza Loyalty Points Work:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-stone-900 font-bold flex items-center justify-center mb-2">
                    1
                  </div>
                  <h5 className="font-bold text-stone-900">Order & Savor</h5>
                  <p className="text-stone-600 mt-1">
                    Every order automatically records total spend and earns 1 point per Rs. 10.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                  <div className="w-7 h-7 rounded-xl bg-[#164699] text-white font-bold flex items-center justify-center mb-2">
                    2
                  </div>
                  <h5 className="font-bold text-stone-900">Unlock VIP Tiers</h5>
                  <p className="text-stone-600 mt-1">
                    Progress from Bronze to Silver, Gold, and VIP with priority oven queue and perks.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center mb-2">
                    3
                  </div>
                  <h5 className="font-bold text-stone-900">Free Food & Discounts</h5>
                  <p className="text-stone-600 mt-1">
                    Exchange points for free drinks, momos, chicken strips, or up to Rs. 500 discount vouchers!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>Think Food, Think Hashtag Pizza · RB Complex, Birgunj</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
