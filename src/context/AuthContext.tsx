import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'hashtagpizzainfo@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
              isAnonymous: currUser.isAnonymous,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
            setUserProfile(profile);

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

            await setDoc(userRef, newProfile).catch((err) => {
              console.warn('Could not persist new user doc:', err);
            });
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.warn('Error fetching Firestore user record:', err);
          setUserProfile({
            uid: currUser.uid,
            email: currUser.email,
            displayName: currUser.displayName || 'Customer',
            role: (currUser.email && currUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'customer',
            loyaltyPoints: 100,
            tier: 'Bronze',
            isAnonymous: currUser.isAnonymous,
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      setAuthModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string, phone?: string) => {
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const res = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
      const cleanName = name?.trim() || 'Customer';
      if (res.user) {
        await updateProfile(res.user, { displayName: cleanName });
      }

      const isOwner = trimmedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const role: UserRole = isOwner ? 'admin' : 'customer';

      // Persist real record into Firestore 'users' collection
      const userDocRef = doc(db, 'users', res.user.uid);
      const initialProfileData = {
        uid: res.user.uid,
        email: trimmedEmail,
        displayName: cleanName,
        phoneNumber: phone?.trim() || null,
        role,
        loyaltyPoints: 100, // 100 welcome points
        tier: 'Bronze',
        address: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, initialProfileData);
      setUserProfile(initialProfileData as UserProfile);
      setAuthModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async (name?: string) => {
    setLoading(true);
    try {
      const res = await signInAnonymously(auth);
      const cleanName = name?.trim() || 'Guest Customer';
      if (res.user) {
        await updateProfile(res.user, { displayName: cleanName });
      }

      const guestProfile: UserProfile = {
        uid: res.user.uid,
        email: null,
        displayName: cleanName,
        role: 'customer',
        loyaltyPoints: 50,
        tier: 'Bronze',
        isAnonymous: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userDocRef = doc(db, 'users', res.user.uid);
      await setDoc(userDocRef, guestProfile).catch(() => {});
      setUserProfile(guestProfile);
      setAuthModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserAddress = async (address: string) => {
    if (!userProfile || !firebaseUser) return;
    setUserProfile((prev) => (prev ? { ...prev, address } : null));
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await updateDoc(userDocRef, { address, updatedAt: new Date().toISOString() }).catch(() => {});
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
    signUpWithEmail,
    signInAsGuest,
    logout,
    updateUserAddress,
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
