import React from 'react';
import { Link2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { NewsArticle } from '../../types';
import { buildEvidenceProfile } from '../../utils/evidenceProfile';

interface EvidenceBadgeProps {
  article: NewsArticle;
  corpus?: readonly NewsArticle[];
  compact?: boolean;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  article,
  corpus = [],
  compact = false,
}) => {
  const evidence = buildEvidenceProfile(article, corpus);
  const corroborated = evidence.status === 'corroborated';
  const official = evidence.status === 'official-single';
  const cls = corroborated
    ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
    : official
      ? 'text-sky-800 bg-sky-50 border-sky-300'
      : evidence.status === 'single-source'
        ? 'text-stone-600 bg-stone-100 border-stone-300'
        : 'text-amber-800 bg-amber-50 border-amber-300';
  const Icon = corroborated || official ? ShieldCheck : evidence.status === 'single-source' ? Link2 : ShieldAlert;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold border rounded px-1.5 py-0.5 ${cls}`}
      title={evidence.note}
    >
      <Icon className="w-3 h-3" />
      {compact ? evidence.title : `可追溯性 · ${evidence.title}`}
      {corroborated && (
        <span className="font-normal opacity-75">
          · {evidence.independentSources} 源
        </span>
      )}
    </span>
  );
};
