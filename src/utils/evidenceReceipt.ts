export type EvidenceState = 'located' | 'inferred' | 'missing';

/**
 * 证据收据三态：
 * - located：有可核验锚点（来源链接，或引句已与抓取正文精确匹配）。
 * - inferred：只有模型给出的依据/引句，但原文未提供可核验来源。
 * - missing：没有任何支撑依据。
 */
export function classifyEvidence(ev: {
  sourceUrl?: string | null;
  verificationNote?: string;
  sourceFact?: string;
  quote?: string;
}): EvidenceState {
  if (!!ev.sourceUrl || !!ev.verificationNote?.includes('精确匹配')) return 'located';
  if (!!ev.sourceFact || !!ev.quote) return 'inferred';
  return 'missing';
}

export const EVIDENCE_STATE_META: Record<
  EvidenceState,
  { label: string; badgeCls: string; dotCls: string; hint: string }
> = {
  located: {
    label: '已定位来源',
    badgeCls: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotCls: 'bg-emerald-500',
    hint: '有来源链接或已匹配的原文引句，可点击核验',
  },
  inferred: {
    label: '仅模型推断',
    badgeCls: 'text-amber-700 bg-amber-50 border-amber-200',
    dotCls: 'bg-amber-500',
    hint: '原文未提供可核验来源，属模型推断，不当作事实',
  },
  missing: {
    label: '未找到依据',
    badgeCls: 'text-stone-500 bg-stone-100 border-stone-200',
    dotCls: 'bg-stone-400',
    hint: '该结论没有任何支撑依据',
  },
};
