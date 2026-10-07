import type { NewsArticle } from '../../types';

export interface UserSummary {
  username: string;
  totalLogins: number;
  totalAiAnalysis: number;
  totalArticleReads: number;
  totalDeposits: number;
  totalPredictions: number;
  lastActiveAt: string;
  recentActions: Array<{ action: string; at: string; detail?: string }>;
}

export interface ActivityStats {
  totalLogins: number;
  totalAiCalls: number;
  totalReads: number;
  totalDeposits: number;
  activeUsersCount: number;
  totalEventsLogged: number;
}

export interface AdminStatus {
  server: { startedAt: string; uptimeSec: number };
  rateLimit: { maxPerMinute: number; windowMs: number; guestPerMinute?: number; viewerPerMinute?: number };
  exposure?: { note?: string };
  aiUsage: any;
  caches: any;
  corpus: { corpus: string; demo: boolean; corpusSize: number; storage: any };
  feeds: { enabled: boolean; urls: string[]; lastIngest: any };
  backups: any;
}

export interface ServerSettings {
  userName: string;
  ai: {
    choice: 'auto' | 'gemini' | 'deepseek';
    provider: string;
    gemini: boolean;
    deepseek: boolean;
    geminiModel: string;
    deepseekModel: string;
    deepseekBaseUrl: string;
  };
  feeds: string[];
  sectorOverrides?: Record<string, { keywords: string[] }>;
}

export interface UserItem {
  id: string;
  username: string;
  role: 'admin' | 'analyst' | 'viewer';
  active: boolean;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  approvedBy?: string;
}

export interface AuditEvent {
  id: number;
  at: string;
  actor: string;
  action: string;
  entityType?: string;
  entityId?: string;
  status: string;
  metadata?: any;
}

export type AdminTab =
  | 'database'
  | 'behavior_logs'
  | 'keys'
  | 'feeds'
  | 'taxonomy'
  | 'users'
  | 'activity'
  | 'audit';
