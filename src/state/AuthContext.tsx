import React, { createContext, useContext } from 'react';
import { useAuthSession, type AuthSession } from '../hooks/useAuthSession';

const AuthContext = createContext<AuthSession | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthSession();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthSession {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
