import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Crown,
  ChefHat,
  Star,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  QrCode,
  ArrowRight,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserMenuProps {
  onOpenCrm: () => void;
  onOpenTableQr: () => void;
  onOpenLoyalty: () => void;
  onOpenProfile?: () => void;
  onOpenMyOrders?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  onOpenCrm,
  onOpenTableQr,
  onOpenLoyalty,
  onOpenProfile,
  onOpenMyOrders,
}) => {
  const { user, loading, isAdmin, isStaff, logout, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-8 sm:h-9 w-16 sm:w-20 bg-stone-200/70 animate-pulse rounded-full" />
    );
  }

  // Not signed in state -> Clean, high-converting customer Sign In button
  if (!user) {
    return (
      <button
        onClick={() => openAuthModal('signin')}
        type="button"
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-stone-300 bg-white hover:border-[#0047AB] hover:text-[#0047AB] text-stone-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
        title="Sign in to your account"
      >
        <UserIcon className="w-3.5 h-3.5 text-stone-500" />
        <span>Sign In</span>
      </button>
    );
  }

  // Initials for avatar circle
  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'HP';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2.5 py-1 sm:py-1.5 rounded-full border border-stone-300 bg-white hover:border-stone-400 text-stone-800 text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
        aria-expanded={isOpen}
      >
        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black text-white shrink-0 ${
          isAdmin
            ? 'bg-amber-600'
            : isStaff
            ? 'bg-[#0047AB]'
            : 'bg-[#E31B23]'
        }`}>
          {initials}
        </div>
        <div className="hidden sm:flex flex-col items-start leading-none text-left">
          <span className="font-bold text-stone-900 max-w-[85px] truncate">
            {user.displayName?.split(' ')[0] || 'Member'}
          </span>
          <span className="text-[10px] text-stone-400">
            {isAdmin ? 'Admin' : isStaff ? 'Staff' : `${user.loyaltyPoints ?? 100} pts`}
          </span>
        </div>
        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User Profile Card */}
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5 mb-1">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0 ${
                isAdmin
                  ? 'bg-amber-600'
                  : isStaff
                  ? 'bg-[#0047AB]'
                  : 'bg-[#E31B23]'
              }`}>
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                  {user.displayName}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  {user.email || 'Customer'}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 border border-amber-500/30">
                  <Crown className="w-3 h-3 text-amber-600" />
                  <span>Admin</span>
                </span>
              ) : isStaff ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-[#0047AB] border border-blue-500/30">
                  <ChefHat className="w-3 h-3 text-[#0047AB]" />
                  <span>Staff</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                  <span>{user.tier || 'VIP'} · {user.loyaltyPoints ?? 100} pts</span>
                </span>
              )}
              {!isStaff && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenLoyalty();
                  }}
                  className="text-[11px] font-bold text-[#0047AB] hover:text-[#E31B23] transition-colors cursor-pointer"
                >
                  View Perks →
                </button>
              )}
            </div>
          </div>

          {/* Action List */}
          <div className="p-2 space-y-1">
            {/* ONLY revealed if actually authenticated as Admin or Staff */}
            {isStaff && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCrm();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <LayoutDashboard className="w-4 h-4 text-amber-300" />
                    <span>Store Management</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenTableQr();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors text-left cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-stone-500" />
                  <span>Table QR Codes</span>
                </button>
              </>
            )}

            {/* Customer Past Orders */}
            {onOpenMyOrders && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenMyOrders();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 text-xs font-bold transition-colors text-left cursor-pointer border border-amber-200/80"
              >
                <Package className="w-4 h-4 text-amber-700" />
                <span>My Orders</span>
              </button>
            )}

            {/* Customer VIP Pass */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenLoyalty();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors text-left cursor-pointer"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>My VIP Points & Rewards</span>
            </button>

            {/* Account Details & Saved Addresses */}
            {onOpenProfile && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenProfile();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors text-left cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-stone-500" />
                <span>Account Profile & Addresses</span>
              </button>
            )}
          </div>

          {/* Sign Out */}
          <div className="p-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 text-xs font-bold transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
