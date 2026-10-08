import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HashtagLogo } from '../HashtagLogo';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    closeAuthModal,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    signInAsGuest,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(authModalMode);
    setErrorMsg(null);
    setEmail('');
    setPassword('');
  }, [authModalMode, authModalOpen]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!phone.trim()) throw new Error('Contact number is strictly required for account creation');
        const digits = phone.trim().replace(/[^0-9]/g, '');
        if (digits.length !== 10) {
          throw new Error('Please enter a valid 10-digit mobile number for delivery (e.g. 98XXXXXXXX)');
        }
        if (!email.trim()) throw new Error('Please enter your email address');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUpWithEmail(email, password, name, phone);
      } else {
        if (!email.trim() || !password.trim()) throw new Error('Please enter your email and password');
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        msg = 'Incorrect email or password. Please try again or create an account.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password should be at least 6 characters.';
      } else if (msg.includes('auth/operation-not-allowed')) {
        msg = 'Registration service is currently synchronizing. Please try again or continue as Guest.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b bg-gradient-to-r from-stone-50 via-amber-50/30 to-stone-50 text-stone-900 border-stone-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <HashtagLogo size="sm" />
            <button
              onClick={closeAuthModal}
              className="p-2 rounded-full hover:bg-stone-200/70 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2 tracking-wide uppercase bg-[#E31B23]/10 text-[#E31B23]">
              {mode === 'signup' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Get 100 Free VIP Points</span>
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5" />
                  <span>Hashtag Pizza Club</span>
                </>
              )}
            </div>
            <h2 id="auth-modal-title" className="font-display text-lg sm:text-xl font-bold text-stone-900">
              {mode === 'signup' ? 'Create Customer Account' : 'Sign In to Your Account'}
            </h2>
            <p className="text-xs mt-1 text-stone-500 leading-relaxed">
              {mode === 'signup'
                ? 'Join to earn points on every order, save favorite pizzas, and unlock exclusive discounts.'
                : 'Welcome back! Track active orders and redeem your loyalty points.'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 m-4 sm:m-5 bg-stone-100 rounded-xl text-xs font-bold text-stone-600">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-[#E31B23] shadow-xs'
                : 'hover:text-stone-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <X className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <div className="px-4 sm:px-6 pt-1 pb-2">
          <button
            type="button"
            onClick={async () => {
              setErrorMsg(null);
              setLoading(true);
              try {
                await signInWithGoogle();
              } catch (err: any) {
                setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-stone-200"></div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">or with email</span>
            <div className="flex-1 h-px bg-stone-200"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-6 space-y-3.5 sm:space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0047AB] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Contact Number <span className="text-[#E31B23]">*</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Required for Account
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 98XXXXXXXX (Nepal mobile)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0047AB] transition-all"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Used for delivery coordination, order status alerts, and VIP loyalty rewards.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0047AB] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0047AB] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-[#E31B23] hover:bg-[#c8141b] shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'signup' ? (
              <>
                <span>Register & Get 100 Points</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={() => signInAsGuest()}
              disabled={loading}
              className="text-stone-500 hover:text-stone-800 text-xs font-medium py-1 transition-colors cursor-pointer"
            >
              Or continue as Quick Guest (Order without password)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
