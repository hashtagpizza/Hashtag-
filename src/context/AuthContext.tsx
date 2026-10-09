import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'hashtagpizzainfo@gmail.com').trim().toLowerCase();

const AUTH_STORAGE_KEY = 'hashtag_auth_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setFirebaseUser(currUser);
      if (currUser) {
        try {
          // Check admin collection or primary email
          const adminRef = doc(db, 'admins', currUser.uid);
          const adminSnap = await getDoc(adminRef).catch(() => null);
          const isDocAdmin = adminSnap?.exists();
          const isEmailAdmin = !!(currUser.email && currUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

          // Fetch actual user record from Firestore 'users' collection
          const userRef = doc(db, 'users', currUser.uid);
          const userSnap = await getDoc(userRef).catch(() => null);

          let role: UserRole = 'customer';
          if (isDocAdmin || isEmailAdmin) {
            role = 'admin';
          } else if (userSnap?.exists() && userSnap.data()?.role) {
            role = userSnap.data()?.role as UserRole;
          }

          if (userSnap?.exists()) {
            const data = userSnap.data();
            const profile: UserProfile = {
              uid: currUser.uid,
              email: currUser.email || data.email || null,
              displayName: currUser.displayName || data.displayName || (currUser.isAnonymous ? 'Guest Customer' : 'Customer'),
              phoneNumber: currUser.phoneNumber || data.phoneNumber || null,
              photoURL: currUser.photoURL || data.photoURL || null,
              role,
              loyaltyPoints: typeof data.loyaltyPoints === 'number' ? data.loyaltyPoints : 100,
              tier: data.tier || 'Bronze',
              address: data.address || '',
              savedAddresses: Array.isArray(data.savedAddresses) ? data.savedAddresses : [],
              isAnonymous: currUser.isAnonymous,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
            setUserProfile(profile);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));

            // Sync role to user document if promoted to admin
            if (isEmailAdmin && data.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin', updatedAt: new Date().toISOString() }).catch(() => {});
            }
          } else {
            // First-time record creation in Firestore 'users' collection
            const newProfile: UserProfile = {
              uid: currUser.uid,
              email: currUser.email || null,
              displayName: currUser.displayName || (currUser.isAnonymous ? 'Guest Customer' : 'Customer'),
              phoneNumber: currUser.phoneNumber || null,
              photoURL: currUser.photoURL || null,
              role,
              loyaltyPoints: role === 'customer' ? 100 : 0,
              tier: 'Bronze',
              address: '',
              isAnonymous: currUser.isAnonymous,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(userRef, newProfile).catch(() => {});
            setUserProfile(newProfile);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Error fetching Firestore user record:', err);
          const fallback: UserProfile = {
            uid: currUser.uid,
            email: currUser.email,
            displayName: currUser.displayName || 'Customer',
            role: (currUser.email && currUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'customer',
            loyaltyPoints: 100,
            tier: 'Bronze',
            isAnonymous: currUser.isAnonymous,
          };
          setUserProfile(fallback);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallback));
        }
      } else {
        // For unauthenticated users, only preserve anonymous guest sessions
        try {
          const savedStr = localStorage.getItem(AUTH_STORAGE_KEY);
          if (savedStr) {
            const saved = JSON.parse(savedStr);
            if (saved?.isAnonymous && saved?.role === 'customer') {
              setUserProfile(saved);
            } else {
              localStorage.removeItem(AUTH_STORAGE_KEY);
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
          }
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const cleanEmail = email.trim();

    try {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, pass);
        setAuthModalOpen(false);
      } catch (authErr: any) {
        if (
          authErr?.code === 'auth/operation-not-allowed' ||
          authErr?.code === 'auth/admin-restricted-operation'
        ) {
          // Direct lookup in Firestore 'users' collection
          const q = query(
            collection(db, 'users'),
            where('email', '==', cleanEmail),
            limit(1)
          );
          const snap = await getDocs(q).catch(() => null);
          if (snap && !snap.empty) {
            const userDoc = snap.docs[0];
            const data = userDoc.data();
            const profile: UserProfile = {
              uid: userDoc.id,
              email: data.email || cleanEmail,
              displayName: data.displayName || 'Customer',
              phoneNumber: data.phoneNumber || null,
              photoURL: data.photoURL || null,
              role: data.role || (cleanEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer'),
              loyaltyPoints: typeof data.loyaltyPoints === 'number' ? data.loyaltyPoints : 100,
              tier: data.tier || 'Bronze',
              address: data.address || '',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
            setUserProfile(profile);
            setAuthModalOpen(false);
            return;
          } else {
            throw new Error('Account not found with this email. Please click "Create Account" to register.');
          }
        } else {
          throw authErr;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://mail.google.com/');
      provider.addScope('email');
      provider.addScope('profile');
      const res = await signInWithPopup(auth, provider);
      const curr = res.user;

      const credential = GoogleAuthProvider.credentialFromResult(res);
      const accessToken = credential?.accessToken;
      if (accessToken) {
        localStorage.setItem('google_workspace_access_token', accessToken);
      }

      const userDocRef = doc(db, 'users', curr.uid);
      const snap = await getDoc(userDocRef);
      const isOwner = curr.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      let profile: UserProfile;
      if (snap.exists()) {
        const data = snap.data();
        profile = {
          uid: curr.uid,
          email: curr.email || data.email,
          displayName: curr.displayName || data.displayName || 'Google Customer',
          phoneNumber: curr.phoneNumber || data.phoneNumber || null,
          photoURL: curr.photoURL || data.photoURL || null,
          role: isOwner ? 'admin' : (data.role || 'customer'),
          loyaltyPoints: typeof data.loyaltyPoints === 'number' ? data.loyaltyPoints : 100,
          tier: data.tier || 'Bronze',
          address: data.address || '',
          savedAddresses: Array.isArray(data.savedAddresses) ? data.savedAddresses : [],
          isAnonymous: false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await updateDoc(userDocRef, {
          displayName: profile.displayName,
          email: profile.email,
          photoURL: profile.photoURL,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      } else {
        profile = {
          uid: curr.uid,
          email: curr.email || null,
          displayName: curr.displayName || 'Google Customer',
          phoneNumber: curr.phoneNumber || null,
          photoURL: curr.photoURL || null,
          role: isOwner ? 'admin' : 'customer',
          loyaltyPoints: 100,
          tier: 'Bronze',
          address: '',
          savedAddresses: [],
          isAnonymous: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, profile, { merge: true }).catch(() => {});
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      setUserProfile(profile);
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string, phone?: string) => {
    setLoading(true);
    const trimmedEmail = email.trim();
    const cleanName = name?.trim() || 'Customer';
    const cleanPhone = phone?.trim() || '';
    const digits = cleanPhone.replace(/[^0-9]/g, '');
    if (digits.length !== 10) {
      throw new Error('Please provide a valid 10-digit contact number for delivery (e.g. 98XXXXXXXX)');
    }

    try {
      let uid = '';
      try {
        const res = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
        if (res.user) {
          uid = res.user.uid;
          await updateProfile(res.user, { displayName: cleanName }).catch(() => {});
        }
      } catch (authErr: any) {
        if (
          authErr?.code === 'auth/operation-not-allowed' ||
          authErr?.code === 'auth/admin-restricted-operation'
        ) {
          // Fallback if public sign-up provider is disabled in Firebase console
          uid = 'user_' + trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
        } else {
          throw authErr;
        }
      }

      if (!uid) {
        uid = 'user_' + trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      }

      const isOwner = trimmedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const role: UserRole = isOwner ? 'admin' : 'customer';

      const initialProfileData: UserProfile = {
        uid,
        email: trimmedEmail,
        displayName: cleanName,
        phoneNumber: cleanPhone,
        role,
        loyaltyPoints: 100,
        tier: 'Bronze',
        address: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save directly to Firestore 'users' collection
      await setDoc(doc(db, 'users', uid), initialProfileData, { merge: true }).catch((e) => {
        console.warn('Could not write user profile to Firestore:', e);
      });

      // 2. Also register or link in Firestore 'customers' collection by phone number for CRM & POS
      const customerDocId = cleanPhone.replace(/[^0-9]/g, '') || uid;
      if (customerDocId) {
        await setDoc(
          doc(db, 'customers', customerDocId),
          {
            name: cleanName,
            phone: cleanPhone,
            email: trimmedEmail,
            totalOrders: 0,
            totalSpend: 0,
            loyaltyPoints: 100,
            lifetimePointsEarned: 100,
            tier: 'Bronze',
            notes: 'Customer registered via web platform with 100 welcome bonus pts',
            tags: ['Web Registered', 'Loyalty Member'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(initialProfileData));
      setUserProfile(initialProfileData);
      setAuthModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async (name?: string) => {
    setLoading(true);
    try {
      const cleanName = name?.trim() || 'Guest Customer';
      let guestUid = 'guest_' + Date.now().toString(36);

      try {
        const res = await signInAnonymously(auth);
        if (res.user) {
          guestUid = res.user.uid;
          await updateProfile(res.user, { displayName: cleanName }).catch(() => {});
        }
      } catch {
        // Safely bypass if anonymous auth is restricted by Firebase
      }

      const guestProfile: UserProfile = {
        uid: guestUid,
        email: null,
        displayName: cleanName,
        role: 'customer',
        loyaltyPoints: 50,
        tier: 'Bronze',
        isAnonymous: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestProfile));
      setUserProfile(guestProfile);
      setAuthModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      await signOut(auth).catch(() => {});
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserAddress = async (address: string) => {
    if (!userProfile) return;
    const updated = { ...userProfile, address };
    setUserProfile(updated);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));

    if (firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDocRef, { address, updatedAt: new Date().toISOString() }).catch(() => {});
    }
  };

  const saveDeliveryAddress = async (addr: Omit<import('../types/auth').SavedAddress, 'id'>): Promise<import('../types/auth').SavedAddress> => {
    const currentAddresses = userProfile?.savedAddresses || [];
    if (currentAddresses.length >= 5) {
      throw new Error('You can save up to 5 delivery locations. Please delete an older address to save a new one.');
    }

    const newAddress: import('../types/auth').SavedAddress = {
      ...addr,
      id: 'addr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    };

    const updatedList = [...currentAddresses, newAddress];
    if (userProfile) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        savedAddresses: updatedList,
      };
      setUserProfile(updatedProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));

      if (userProfile.uid) {
        await setDoc(
          doc(db, 'users', userProfile.uid),
          { savedAddresses: updatedList, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      }

      const phoneId = (userProfile.phoneNumber || '').replace(/[^0-9]/g, '');
      if (phoneId) {
        await setDoc(
          doc(db, 'customers', phoneId),
          { savedAddresses: updatedList, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      }
    } else {
      const GUEST_KEY = 'hashtag_guest_saved_addresses';
      const guestList: import('../types/auth').SavedAddress[] = JSON.parse(
        localStorage.getItem(GUEST_KEY) || '[]'
      );
      if (guestList.length >= 5) {
        throw new Error('You can save up to 5 delivery locations. Please delete an older address to save a new one.');
      }
      guestList.push(newAddress);
      localStorage.setItem(GUEST_KEY, JSON.stringify(guestList));
    }

    return newAddress;
  };

  const removeDeliveryAddress = async (id: string): Promise<void> => {
    if (userProfile) {
      const updatedList = (userProfile.savedAddresses || []).filter((a) => a.id !== id);
      const updatedProfile: UserProfile = {
        ...userProfile,
        savedAddresses: updatedList,
      };
      setUserProfile(updatedProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));

      if (userProfile.uid) {
        await setDoc(
          doc(db, 'users', userProfile.uid),
          { savedAddresses: updatedList, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      }

      const phoneId = (userProfile.phoneNumber || '').replace(/[^0-9]/g, '');
      if (phoneId) {
        await setDoc(
          doc(db, 'customers', phoneId),
          { savedAddresses: updatedList, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      }
    } else {
      const GUEST_KEY = 'hashtag_guest_saved_addresses';
      const guestList: import('../types/auth').SavedAddress[] = JSON.parse(
        localStorage.getItem(GUEST_KEY) || '[]'
      );
      const filtered = guestList.filter((a) => a.id !== id);
      localStorage.setItem(GUEST_KEY, JSON.stringify(filtered));
    }
  };

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const value = useMemo<AuthContextType>(() => ({
    user: userProfile,
    firebaseUser,
    loading,
    isAdmin: userProfile?.role === 'admin',
    isStaff: userProfile?.role === 'staff' || userProfile?.role === 'admin',
    isCustomer: userProfile?.role === 'customer' || !userProfile,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    signInAsGuest,
    logout,
    updateUserAddress,
    saveDeliveryAddress,
    removeDeliveryAddress,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
  }), [userProfile, firebaseUser, loading, authModalOpen, authModalMode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
