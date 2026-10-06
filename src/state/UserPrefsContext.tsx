import React, { createContext, useContext } from 'react';
import { useUserPrefsStore, type UserPrefsStore } from '../hooks/useUserPrefsStore';

const UserPrefsContext = createContext<UserPrefsStore | null>(null);

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
  const value = useUserPrefsStore();
  return <UserPrefsContext.Provider value={value}>{children}</UserPrefsContext.Provider>;
}

export function useUserPrefs(): UserPrefsStore {
  const ctx = useContext(UserPrefsContext);
  if (!ctx) throw new Error('useUserPrefs must be used within UserPrefsProvider');
  return ctx;
}
