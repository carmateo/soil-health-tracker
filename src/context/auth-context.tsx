'use client';

import type { User } from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirebase } from './firebase-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserSettings } from '@/types/soil';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  settings: UserSettings | null;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { auth, db } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user settings
        const settingsRef = doc(db, 'userSettings', currentUser.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as UserSettings);
        } else {
          // Create default settings if they don't exist
          const defaultSettings: UserSettings = { defaultPrivacy: 'private' };
          await setDoc(settingsRef, defaultSettings);
          setSettings(defaultSettings);
        }
      } else {
        setSettings(null); // Clear settings on logout
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const settingsRef = doc(db, 'userSettings', user.uid);
    try {
      await setDoc(settingsRef, newSettings, { merge: true });
      setSettings((prev) => ({ ...(prev ?? { defaultPrivacy: 'private' }), ...newSettings }));
       console.log("Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings: ", error);
      // Optionally show an error toast to the user
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, settings, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
