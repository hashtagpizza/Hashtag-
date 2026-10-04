export type UserRole = 'admin' | 'staff' | 'customer';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  role: UserRole;
  loyaltyPoints?: number;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  address?: string;
  isAnonymous?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: import('firebase/auth').User | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string, phone?: string) => Promise<void>;
  signInAsGuest: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserAddress: (address: string) => Promise<void>;
  authModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
}
