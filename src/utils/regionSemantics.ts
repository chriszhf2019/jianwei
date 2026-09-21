import type { RegionMention, RegionScope } from '../types';

export const REGION_SCOPE_VALUES: RegionScope[] = [
  'mentioned',
  'event',
  'affected',
  'unspecified',
];

export const REGION_SCOPE_LABELS: Record<RegionScope, string> = {
  mentioned: '报道提及',
  event: '事件发生',
  affected: '实际受影响',
  unspecified: '范围未标',
};

export function normalizeRegionScope(value: unknown): RegionScope {
  const scope = String(value || '').trim();
  return REGION_SCOPE_VALUES.includes(scope as RegionScope)
    ? scope as RegionScope
    : 'unspecified';
}

export function regionScopeOf(mention: Pick<RegionMention, 'scope'> | null | undefined): RegionScope {
  return normalizeRegionScope(mention?.scope);
}

export function normalizeRegionMentions(value: unknown, max = 9): RegionMention[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, RegionMention>();
  for (const raw of value) {
    const region = String(raw?.region || '').trim();
    if (!region) continue;
    const scope = normalizeRegionScope(raw?.scope);
    const confidence = Math.max(0, Math.min(1, Number(raw?.confidence) || 0));
    const key = `${region}\u0000${scope}`;
    const current = byKey.get(key);
    if (!current || confidence > current.confidence) {
      byKey.set(key, { region, confidence, scope });
    }
  }
  return [...byKey.values()].slice(0, max);
}

/** 展示“主要地区”时优先事件发生地，其次实际受影响地，再回退到提及或旧数据。 */
export function primaryRegionMention(value: unknown): RegionMention | null {
  const mentions = normalizeRegionMentions(value);
  const priority: RegionScope[] = ['event', 'affected', 'mentioned', 'unspecified'];
  for (const scope of priority) {
    const candidate = mentions
      .filter((item) => item.scope === scope)
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (candidate) return candidate;
  }
  return null;
}
