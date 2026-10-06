import React, { createContext, useContext } from 'react';
import { useCorpusStore, type CorpusStore } from '../hooks/useCorpusStore';

const CorpusContext = createContext<CorpusStore | null>(null);

export function CorpusProvider({ children }: { children: React.ReactNode }) {
  const value = useCorpusStore();
  return <CorpusContext.Provider value={value}>{children}</CorpusContext.Provider>;
}

export function useCorpus(): CorpusStore {
  const ctx = useContext(CorpusContext);
  if (!ctx) throw new Error('useCorpus must be used within CorpusProvider');
  return ctx;
}
