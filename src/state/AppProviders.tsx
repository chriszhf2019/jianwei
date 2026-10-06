import React from 'react';
import { AuthProvider } from './AuthContext';
import { UserPrefsProvider } from './UserPrefsContext';
import { CorpusProvider } from './CorpusContext';

/** 全局状态装配：鉴权 → 用户偏好 → 语料。 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserPrefsProvider>
        <CorpusProvider>{children}</CorpusProvider>
      </UserPrefsProvider>
    </AuthProvider>
  );
}
