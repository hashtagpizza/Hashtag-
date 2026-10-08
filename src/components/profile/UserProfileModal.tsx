import React from 'react';
import {
  X,
  User as UserIcon,
  Star,
  MapPin,
  Crown,
  ChefHat,
  Bookmark,
  LogOut,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HashtagLogo } from '../HashtagLogo';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLoyalty?: () => void;
  onOpenMyOrders?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenLoyalty,
  onOpenMyOrders,
}) => {
  const { user, isAdmin, isStaff, logout, openAuthModal } = useAuth();

  if (!isOpen) return null;

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'HP';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header & Profile Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white border-b border-stone-800 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <HashtagLogo size="sm" />
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-sm sm:text-base font-black text-white shrink-0 shadow-lg ${
                  isAdmin
                    ? 'bg-amber-600 ring-2 ring-amber-400/40'
                    : isStaff
                    ? 'bg-[#0047AB] ring-2 ring-blue-400/40'
                    : 'bg-[#E31B23] ring-2 ring-red-400/40'
                }`}
              >
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    {user?.displayName || 'Hashtag Foodie'}
                  </h3>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Admin</span>
                    </span>
                  ) : isStaff ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      <ChefHat className="w-3 h-3 text-blue-400" />
                      <span>Staff</span>
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{user?.email || 'Registered Customer'}</p>
                {user?.phoneNumber && (
                  <p className="text-xs text-stone-400 font-mono mt-0.5">{user.phoneNumber}</p>
                )}
              </div>
            </div>

            {/* Loyalty Points Pill */}
            <div className="flex items-center gap-2 bg-stone-800/80 border border-stone-700 p-2.5 rounded-2xl self-start sm:self-auto">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-stone-400 uppercase font-black tracking-wider">
                  Loyalty Balance
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                    {user?.loyaltyPoints ?? 100} pts
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">
                    · {user?.tier || 'VIP'}
                  </span>
                </div>
              </div>
              {onOpenLoyalty && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLoyalty();
                  }}
                  className="ml-2 px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Perks →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Quick link to My Orders merged into Order Tray */}
          {onOpenMyOrders && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    My Orders & Live Status
                  </h4>
                  <p className="text-[11px] text-amber-800/80">
                    Track live kitchen orders, reorder favorites, and view digital tickets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMyOrders();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
              >
                Open Orders →
              </button>
            </div>
          )}

          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-stone-900">
              Account Details & Addresses
            </h4>
            <p className="text-xs text-stone-500">
              Manage your personal contact details and saved doorstep delivery pins.
            </p>
          </div>

          {/* Personal Details Card */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                  Full Name
                </span>
                <span className="font-bold text-stone-900">{user?.displayName || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                  Email Address
                </span>
                <span className="font-bold text-stone-900">{user?.email || 'None'}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                  Contact Phone
                </span>
                <span className="font-bold text-stone-900 font-mono">
                  {user?.phoneNumber || 'No phone saved'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                  VIP Tier
                </span>
                <span className="font-bold text-amber-700">{user?.tier || 'VIP Member'}</span>
              </div>
            </div>
          </div>

          {/* Saved Delivery Locations */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                <span>Saved Delivery Pins ({user?.savedAddresses?.length || 0}/5)</span>
              </h5>
            </div>

            {user?.savedAddresses && user.savedAddresses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {user.savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3 bg-white rounded-xl border border-stone-200 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-900">
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[9px] text-stone-400 font-bold">Default</span>
                      )}
                    </div>
                    <p className="font-semibold text-stone-800 truncate">{addr.address}</p>
                    <p className="text-[10px] text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span>{addr.landmark}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic bg-stone-50 p-3 rounded-xl border border-stone-200">
                No saved addresses yet. You can pin and save up to 5 locations in the Order Tray!
              </p>
            )}
          </div>

          {/* Sign Out Action */}
          <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Signed in securely with Firebase Auth
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
