'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';
import { OwnerUser } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  ownerUser: OwnerUser | null;
  loading: boolean;
  token: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signOutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function removeCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Keep ID token and session cookie synchronized
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          setCookie('__session', idToken, 14);
          setCookie('firebase_token', idToken, 14);
          setUser(firebaseUser);

          const mappedOwner: OwnerUser = {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Owner',
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Khata Owner',
            createdAt: firebaseUser.metadata.creationTime
              ? new Date(firebaseUser.metadata.creationTime).toISOString()
              : new Date().toISOString(),
          };
          setOwnerUser(mappedOwner);
        } catch (err) {
          console.error('Error getting Firebase token:', err);
        }
      } else {
        setUser(null);
        setOwnerUser(null);
        setToken(null);
        removeCookie('__session');
        removeCookie('firebase_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const idToken = await res.user.getIdToken();
      setCookie('__session', idToken, 14);
      setCookie('firebase_token', idToken, 14);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) {
        await updateProfile(res.user, { displayName: name });
      }
      const idToken = await res.user.getIdToken();
      setCookie('__session', idToken, 14);
      setCookie('firebase_token', idToken, 14);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const idToken = await res.user.getIdToken();
      setCookie('__session', idToken, 14);
      setCookie('firebase_token', idToken, 14);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      removeCookie('__session');
      removeCookie('firebase_token');
      setUser(null);
      setOwnerUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!auth.currentUser) throw new Error('No user is currently signed in');
    await updateProfile(auth.currentUser, {
      displayName,
      ...(photoURL ? { photoURL } : {}),
    });
    // Trigger refresh
    setUser({ ...auth.currentUser });
    if (ownerUser) {
      setOwnerUser({
        ...ownerUser,
        name: displayName,
        username: displayName,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ownerUser,
        loading,
        token,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOutUser,
        resetPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
