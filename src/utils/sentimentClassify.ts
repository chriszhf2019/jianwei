import { type SentimentLabel } from './corpusMetrics';

export interface ModelSentiment {
  label: SentimentLabel;
  evidence: string | null;
  evidenceStatus: 'quoted' | 'discarded' | 'absent';
  calibrationStatus: 'uncalibrated';
}

const LABEL_ALIASES: Record<string, SentimentLabel> = {
  positive: 'positive',
  negative: 'negative',
  mixed: 'mixed',
  neutral: 'neutral',
  偏正面: 'positive',
  正面: 'positive',
  偏负面: 'negative',
  负面: 'negative',
  多空交织: 'mixed',
  正负交织: 'mixed',
  交织: 'mixed',
  中性: 'neutral',
};

export function sentimentSourceText(title: string, summary: string): string {
  return `${title}\n${summary}`.trim();
}

function canonicalLabel(value: unknown): SentimentLabel | null {
  const text = String(value ?? '').trim();
  if (!text || text.length > 16) return null;
  return LABEL_ALIASES[text] || LABEL_ALIASES[text.toLowerCase()] || null;
}

/** 证据必须能在输入文本里逐字对上；大小写不同时回原文片段，不另造一句。 */
export function evidenceFromSource(quote: string, source: string): string | null {
  const raw = quote.trim().slice(0, 80);
  if (raw.length < 2 || !source) return null;
  const exact = source.indexOf(raw);
  if (exact >= 0) return source.slice(exact, exact + raw.length);
  const folded = source.toLowerCase().indexOf(raw.toLowerCase());
  if (folded >= 0) return source.slice(folded, folded + raw.length);
  return null;
}

/**
 * 只收下四分类和可选原文证据。概率、置信度和其他字段不进入结果。
 * 标签不在四类里则整条拒绝；证据对不上则保留标签并丢掉证据。
 */
export function acceptModelSentiment(raw: unknown, sourceText: string): ModelSentiment | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const label = canonicalLabel((raw as { label?: unknown }).label);
  if (!label) return null;
  const evidenceValue = (raw as { evidence?: unknown }).evidence;
  const evidenceRaw = typeof evidenceValue === 'string' ? evidenceValue.trim().slice(0, 80) : '';
  if (!evidenceRaw) {
    return { label, evidence: null, evidenceStatus: 'absent', calibrationStatus: 'uncalibrated' };
  }
  const quoted = evidenceFromSource(evidenceRaw, sourceText);
  if (!quoted) {
    return { label, evidence: null, evidenceStatus: 'discarded', calibrationStatus: 'uncalibrated' };
  }
  return { label, evidence: quoted, evidenceStatus: 'quoted', calibrationStatus: 'uncalibrated' };
}
