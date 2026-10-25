import React from 'react';
import { Layers, ShieldAlert, Link2, ListTree } from 'lucide-react';
import type { NewsArticle } from '../../types';
import {
  ANALYSIS_FRAMEWORK_LABELS,
  extractAnalysisFramework,
  hasFrameworkContent,
} from '../../shared/analysisFramework';
import { SEVEN_W_ITEMS } from '../../utils/sevenElementsBrief';
import { MethodBadge } from './MethodBadge';

interface FrameworkOverviewCardProps {
  article: NewsArticle | Record<string, unknown>;
  /** 紧凑模式：贴链结果预览等场景 */
  compact?: boolean;
  className?: string;
}

/**
 * 框架总览卡：详情 enrich 与贴链 analyze 共用同一套产品口径
 * （摘要 / 定性 / 影响 / 风险 / 7W / 证据链）。
 */
export const FrameworkOverviewCard: React.FC<FrameworkOverviewCardProps> = ({
  article,
  compact = false,
  className = '',
}) => {
  const fw = extractAnalysisFramework(article);
  if (!hasFrameworkContent(fw)) return null;

  const hasSummary = Boolean(fw.summary);
  const hasVerdict = Boolean(fw.verdict);
  const hasImpact = Boolean(fw.impact);
  const hasRisks = fw.risks.length > 0;
  const hasSevenW = Boolean(fw.sevenW);
  const hasEvidence = fw.evidence.length > 0;
  // 只有摘要时不展示「框架总览」：避免一排“暂无”造成半成品感。
  if (!hasVerdict && !hasImpact && !hasRisks && !hasSevenW && !hasEvidence) return null;

  const presentCount = [hasSummary, hasVerdict, hasImpact, hasRisks, hasSevenW, hasEvidence].filter(Boolean).length;
  const evidencePreview = fw.evidence.slice(0, compact ? 2 : 3);

  return (
    <section
      className={`rounded-2xl border border-stone-300 bg-white shadow-xs overflow-hidden ${className}`}
      aria-label="分析框架总览"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-stone-950 text-stone-100">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-serif font-bold tracking-tight">框架总览</h3>
            <p className="text-[10px] text-stone-400 font-sans">
              已生成 {presentCount}/6 模块 · 模型推断，非已核验事实
            </p>
          </div>
        </div>
        <MethodBadge methodId="model_interpretation" compact />
      </div>

      <div className={`grid gap-3 p-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {hasSummary && <OverviewBlock label={ANALYSIS_FRAMEWORK_LABELS.summary} body={fw.summary} />}
        {hasVerdict && <OverviewBlock label={ANALYSIS_FRAMEWORK_LABELS.verdict} body={fw.verdict} emphasis />}
        {hasImpact && <OverviewBlock label={ANALYSIS_FRAMEWORK_LABELS.impact} body={fw.impact} />}
        {hasRisks && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-serif font-bold text-stone-700">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>{ANALYSIS_FRAMEWORK_LABELS.risks}</span>
            </div>
            <ul className="space-y-1">
              {fw.risks.slice(0, compact ? 3 : 5).map((r, i) => (
                <li key={i} className="text-xs text-stone-800 leading-relaxed font-sans list-disc ml-4">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {fw.sevenW && (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-serif font-bold text-stone-700">
              <ListTree className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>{ANALYSIS_FRAMEWORK_LABELS.sevenW}</span>
            </div>
            <div className={`grid gap-1.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {SEVEN_W_ITEMS.map((w) => {
                const v = fw.sevenW?.[w.key as keyof typeof fw.sevenW];
                if (!v || !String(v).trim()) return null;
                return (
                  <div key={w.key} className="flex items-start gap-2 text-[11px] font-sans">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full ${w.color} shrink-0`} />
                    <span>
                      <b className="text-stone-600">{w.label}：</b>
                      <span className="text-stone-800">{v}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {hasEvidence && (
      <div className="px-4 pb-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-serif font-bold text-stone-700">
              <Link2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{ANALYSIS_FRAMEWORK_LABELS.evidence} · {fw.evidence.length} 条</span>
            </div>
          </div>
          <ul className="space-y-2">
            {evidencePreview.map((ev) => (
              <li key={ev.id} className="text-xs text-stone-800 leading-relaxed border-l-2 border-emerald-400 pl-2">
                <span className="font-bold text-stone-900">{ev.claim}</span>
                {ev.sourceFact ? (
                  <span className="block text-stone-600 mt-0.5">依据：{ev.sourceFact}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
      )}
    </section>
  );
};

function OverviewBlock({
  label,
  body,
  emphasis = false,
}: {
  label: string;
  body: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 space-y-1 ${
        emphasis ? 'border-[#E3120B]/40 bg-red-50/40' : 'border-stone-200 bg-stone-50'
      }`}
    >
      <div className={`text-[11px] font-serif font-bold ${emphasis ? 'text-[#E3120B]' : 'text-stone-700'}`}>
        {label}
      </div>
      <p
        className={`text-xs leading-relaxed font-sans break-words ${
          emphasis ? 'font-serif font-bold text-stone-950 text-sm' : 'text-stone-800'
        }`}
      >
        {body}
      </p>
    </div>
  );
}

export default FrameworkOverviewCard;
