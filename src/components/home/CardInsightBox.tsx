import React, { useState, useMemo } from 'react';
import {
  AiInterpretationData,
  GrayscaleAssessment,
  NewsArticle,
  RiskReviewData,
  SevenWSummary,
  TrendForecastData,
} from '../../types';
import { Sparkles, TrendingUp, ShieldAlert, Link2, Loader2, ListTree } from 'lucide-react';
import type { NewsSkill } from './HomeView';
import { findRelatedArticles } from '../../utils/relatedArticles';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { MethodBadge } from '../common/MethodBadge';
import { FeatureSummary } from '../common/FeatureSummary';
import type { FeatureSummaryId } from '../../utils/featureSummaries';

interface CardInsightBoxProps {
  article: NewsArticle;
  /** 关联背景源（同列表其他文章） */
  contextArticles?: NewsArticle[];
  onRunSkill: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  /** 点击“关联背景”某条 = 打开该文章详情 */
  onOpenArticle?: (article: NewsArticle) => void;
}

type SkillMode = 'interpret' | 'sevenw' | 'trend' | 'risk' | 'related';
type ModelSkillMode = Exclude<SkillMode, 'related'>;

const FIELD: Record<ModelSkillMode, string> = {
  interpret: 'aiInterpretation',
  sevenw: 'sevenWBrief',
  trend: 'trendForecastText',
  risk: 'riskReviewText',
};

const FEATURE_ID: Record<SkillMode, FeatureSummaryId> = {
  interpret: 'card-ai',
  sevenw: 'card-7w',
  trend: 'card-trend',
  risk: 'card-risk',
  related: 'card-related',
};

const TABS: Array<{ key: SkillMode; label: string; icon: React.ReactNode; tip: string }> = [
  { key: 'interpret', label: 'AI解读', icon: <Sparkles className="w-3 h-3" />, tip: '核心判断、关键依据、主要影响、判断边界' },
  { key: 'sevenw', label: '7W', icon: <ListTree className="w-3 h-3" />, tip: '按 What / Who / When / Where / Why / How / So What 概括' },
  { key: 'trend', label: '趋势', icon: <TrendingUp className="w-3 h-3" />, tip: '短期、中期、关键变量、失效条件' },
  { key: 'risk', label: '风险', icon: <ShieldAlert className="w-3 h-3" />, tip: '主要风险、易误读、盲点、关注指标' },
  { key: 'related', label: '背景', icon: <Link2 className="w-3 h-3" />, tip: '本地关联背景（不消耗 AI）' },
];

const INTERPRET_ROWS = [
  { key: 'core', label: '核心判断' },
  { key: 'basis', label: '关键依据' },
  { key: 'impact', label: '主要影响' },
  { key: 'limits', label: '判断边界' },
] as const;

const SEVEN_W_ROWS = [
  { key: 'what', code: 'What', label: '发生了什么' },
  { key: 'who', code: 'Who', label: '涉及主体' },
  { key: 'when', code: 'When', label: '关键时间' },
  { key: 'where', code: 'Where', label: '发生空间' },
  { key: 'why', code: 'Why', label: '主要动因' },
  { key: 'how', code: 'How', label: '实现路径' },
  { key: 'soWhat', code: 'So What', label: '最重要影响' },
] as const;

const TREND_ROWS = [
  { key: 'shortTerm', label: '短期' },
  { key: 'midTerm', label: '中期' },
  { key: 'keyVariables', label: '关键变量' },
  { key: 'invalidation', label: '失效条件' },
] as const;

const RISK_ROWS = [
  { key: 'mainRisk', label: '主要风险' },
  { key: 'misread', label: '易误读' },
  { key: 'blindSpot', label: '盲点' },
  { key: 'watchMetrics', label: '关注指标' },
] as const;

function textOf(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const text = (value as { text?: unknown }).text;
  return typeof text === 'string' ? text.trim() : '';
}

function sevenWOf(article: NewsArticle): SevenWSummary | null {
  const raw = article.sevenWBrief || article.sevenElements;
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as unknown as Record<string, unknown>;
  const data: SevenWSummary = {
    what: textOf(source.what),
    who: textOf(source.who),
    when: textOf(source.when),
    where: textOf(source.where),
    why: textOf(source.why),
    how: textOf(source.how),
    soWhat: textOf(source.soWhat),
  };
  return Object.values(data).some(Boolean) ? data : null;
}

function trendOf(value: unknown): TrendForecastData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const data: TrendForecastData = {
    shortTerm: textOf(source.shortTerm),
    midTerm: textOf(source.midTerm),
    keyVariables: textOf(source.keyVariables),
    invalidation: textOf(source.invalidation),
  };
  return Object.values(data).some(Boolean) ? data : null;
}

function riskOf(value: unknown): RiskReviewData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const data: RiskReviewData = {
    mainRisk: textOf(source.mainRisk),
    misread: textOf(source.misread),
    blindSpot: textOf(source.blindSpot),
    watchMetrics: textOf(source.watchMetrics),
  };
  return Object.values(data).some(Boolean) ? data : null;
}

function interpretationOf(value: unknown): AiInterpretationData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const data: AiInterpretationData = {
    core: textOf(source.core),
    basis: textOf(source.basis),
    impact: textOf(source.impact),
    limits: textOf(source.limits),
  };
  return Object.values(data).some(Boolean) ? data : null;
}

function stripLabelPrefix(value: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return value
    .trim()
    .replace(new RegExp(`^${escaped}[^：:]{0,30}[：:]\\s*`), '')
    .replace(/^一句话[：:]\s*/, '');
}

function ModelRows({
  rows,
  entities = [],
}: {
  rows: Array<{ label: string; code?: string; value: string }>;
  entities?: string[];
}) {
  return (
    <div className="divide-y divide-stone-200/80 rounded-lg border border-stone-200 bg-white/70 px-2.5">
      {rows.map((row) => {
        const value = stripLabelPrefix(row.value, row.label) || '未说明';
        const unknown = value === '未说明' || value === '未知';
        return (
          <div key={row.label} className="grid grid-cols-[5.8rem_minmax(0,1fr)] gap-2 py-1.5 text-[11px] leading-snug">
            <span className="min-w-0">
              {row.code ? <span className="mr-1 font-mono text-[9px] font-bold text-stone-400">{row.code}</span> : null}
              <span className="font-serif font-bold text-stone-700">{row.label}</span>
            </span>
            <span className={unknown ? 'text-stone-400' : 'text-stone-800'}>
              {unknown ? value : <KeyTermHighlight text={value} entities={entities} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GrayscaleView({ assessment }: { assessment: GrayscaleAssessment }) {
  const memberships = [...assessment.memberships].sort((a, b) => b.score - a.score);
  const isAction = assessment.decision === '行动';
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-serif font-black text-stone-700">灰度认知 · 模型隶属度</span>
        <span
          className={`rounded-md border px-2 py-1 text-[10px] font-serif font-black ${
            isAction
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-amber-300 bg-amber-50 text-amber-900'
          }`}
        >
          {isAction ? '行动评估通过' : '持续观察，暂不行动'}
        </span>
      </div>

      {memberships.length > 0 && (
        <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-3">
          {memberships.map((item) => (
            <div key={item.hypothesis}>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-serif font-bold text-stone-700">{item.hypothesis}</span>
                <span className="font-mono font-black text-stone-900">{item.score}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${item.score >= 70 ? 'bg-emerald-500' : item.score >= 40 ? 'bg-amber-500' : 'bg-stone-400'}`}
                  style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[9px] text-stone-400">隶属度是模型自报的相对判断，不是经过校准的概率。</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
          <div className="mb-1 text-[10px] font-serif font-black text-emerald-900">支持证据</div>
          <ul className="space-y-1 text-[10px] leading-relaxed text-emerald-950">
            {assessment.support.length > 0 ? assessment.support.map((item) => (
              <li key={item} className="flex gap-1"><span>•</span><KeyTermHighlight text={item} /></li>
            )) : <li>未列出</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-2.5">
          <div className="mb-1 text-[10px] font-serif font-black text-red-900">反对证据</div>
          <ul className="space-y-1 text-[10px] leading-relaxed text-red-950">
            {assessment.oppose.length > 0 ? assessment.oppose.map((item) => (
              <li key={item} className="flex gap-1"><span>•</span><KeyTermHighlight text={item} /></li>
            )) : <li>未列出</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
          <div className="mb-1 text-[10px] font-serif font-black text-amber-900">不确定变量</div>
          <ul className="space-y-1 text-[10px] leading-relaxed text-amber-950">
            {assessment.uncertain.length > 0 ? assessment.uncertain.map((item) => (
              <li key={item} className="flex gap-1"><span>•</span><KeyTermHighlight text={item} /></li>
            )) : <li>未列出</li>}
          </ul>
        </div>
      </div>

      {assessment.reverseRisks.length > 0 && (
        <div className="rounded-lg border border-stone-300 bg-stone-50 p-2.5">
          <div className="mb-1 text-[10px] font-serif font-black text-stone-700">潜在反向风险点</div>
          <ul className="space-y-1 text-[10px] leading-relaxed text-stone-700">
            {assessment.reverseRisks.map((item) => (
              <li key={item} className="flex gap-1"><span>•</span><KeyTermHighlight text={item} /></li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[9px] text-stone-500">
        黑白决策阈值：顶级隶属度 ≥70% + 支持证据 ≥2 条 + 证据强度中/高 + 反对证据不压过支持证据。
        {assessment.decisionReason ? ` ${assessment.decisionReason}` : ''}
      </p>
    </div>
  );
}

export const CardInsightBox: React.FC<CardInsightBoxProps> = ({
  article,
  contextArticles = [],
  onRunSkill,
  onOpenArticle,
}) => {
  const [mode, setMode] = useState<SkillMode>('interpret');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const interpretation = interpretationOf((article as any)[FIELD.interpret]);
  const sevenw = sevenWOf(article);
  const trend = trendOf((article as any)[FIELD.trend]);
  const risk = riskOf((article as any)[FIELD.risk]);
  const legacyTrend = textOf((article as any)[FIELD.trend]);
  const legacyRisk = textOf((article as any)[FIELD.risk]);

  // 关联背景：与详情页「相关新闻·站内部分」共用同一本地匹配 util（真实、可点击，零 AI）
  const related = useMemo(
    () => findRelatedArticles(article, contextArticles, 3),
    [article, contextArticles]
  );

  const hasOutput = (m: SkillMode): boolean => {
    if (m === 'related') return related.length > 0;
    if (m === 'interpret') return interpretation !== null;
    if (m === 'sevenw') return sevenw !== null;
    if (m === 'trend') return trend !== null || Boolean(legacyTrend);
    return risk !== null || Boolean(legacyRisk);
  };

  const generate = async (m: ModelSkillMode) => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      const updated = await onRunSkill(m, article);
      if (!updated) setErr('生成失败（可能未配置 AI Key）');
    } catch {
      setErr('生成失败');
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (m: SkillMode) => {
    if (busy) return;
    setErr(null);
    setMode(m);
    if (m !== 'related' && !hasOutput(m)) void generate(m);
  };

  let title = 'AI 综合解读';
  let methodId: string | null = null;
  let note = '';
  let body: React.ReactNode = null;

  if (mode === 'interpret') {
    title = 'AI 综合解读';
    methodId = interpretation ? 'model_interpretation' : null;
    note = '有密钥时仍是模型推断，不是已核验事实；关键依据以原文或独立来源为准。';
    body = busy ? (
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        <Loader2 className="w-3 h-3 animate-spin" /> 正在生成 AI 解读…
      </p>
    ) : interpretation ? (
      <>
        <ModelRows
          entities={(article.entityMentions || []).map((item) => item.name)}
          rows={INTERPRET_ROWS.map((row) => ({
            label: row.label,
            value: interpretation[row.key],
          }))}
        />
        {interpretation.grayscale && <GrayscaleView assessment={interpretation.grayscale} />}
      </>
    ) : (
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span>{err || '尚未生成 AI 解读。'}</span>
        {!err && (
          <button
            type="button"
            onClick={() => void generate('interpret')}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] font-serif font-bold text-stone-700 hover:border-stone-700 hover:text-stone-950"
          >
            <Sparkles className="w-3 h-3" /> 生成
          </button>
        )}
      </div>
    );
  } else if (mode === 'sevenw') {
    title = '事件模型 · 7W';
    methodId = sevenw ? 'model_extraction' : null;
    note = '有密钥时仍是模型结构化摘要，不是已核验事实，不替代原文核验。';
    body = busy ? (
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        <Loader2 className="w-3 h-3 animate-spin" /> 正在生成 7W 摘要…
      </p>
    ) : sevenw ? (
      <ModelRows
        entities={(article.entityMentions || []).map((item) => item.name)}
        rows={SEVEN_W_ROWS.map((row) => ({
          label: row.label,
          code: row.code,
          value: sevenw[row.key],
        }))}
      />
    ) : (
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span>{err || '尚未生成 7W 摘要。'}</span>
        {!err && (
          <button
            type="button"
            onClick={() => void generate('sevenw')}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] font-serif font-bold text-stone-700 hover:border-stone-700 hover:text-stone-950"
          >
            <Sparkles className="w-3 h-3" /> 生成
          </button>
        )}
      </div>
    );
  } else if (mode === 'trend') {
    title = '趋势模型';
    methodId = trend || legacyTrend ? 'model_scenario' : null;
    note = '有密钥时仍是模型情景推演，不是概率预测，也不是已核验事实。';
    body = busy ? (
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        <Loader2 className="w-3 h-3 animate-spin" /> 正在生成趋势模型…
      </p>
    ) : trend ? (
      <ModelRows
        entities={(article.entityMentions || []).map((item) => item.name)}
        rows={TREND_ROWS.map((row) => ({
          label: row.label,
          value: trend[row.key],
        }))}
      />
    ) : legacyTrend ? (
      <div className="space-y-2">
        <p className="line-clamp-5 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-700">
          <KeyTermHighlight text={legacyTrend} entities={(article.entityMentions || []).map((item) => item.name)} />
        </p>
        <button
          type="button"
          onClick={() => void generate('trend')}
          className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] font-serif font-bold text-stone-700 hover:border-stone-700 hover:text-stone-950"
        >
          <Sparkles className="w-3 h-3" /> 按四行模型重算
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span>{err || '尚未生成趋势模型。'}</span>
        {!err && (
          <button
            type="button"
            onClick={() => void generate('trend')}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] font-serif font-bold text-stone-700 hover:border-stone-700 hover:text-stone-950"
          >
            <Sparkles className="w-3 h-3" /> 生成
          </button>
        )}
      </div>
    );
  } else if (mode === 'risk') {
    title = '风险模型';
    methodId = risk || legacyRisk ? 'adversarial_review' : null;
    note = '有密钥时仍是模型对抗审稿，提出风险假设，不是事实裁决。';
    body = busy ? (
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        <Loader2 className="w-3 h-3 animate-spin" /> 正在生成风险模型…
      </p>
    ) : risk ? (
      <ModelRows
        entities={(article.entityMentions || []).map((item) => item.name)}
        rows={RISK_ROWS.map((row) => ({
          label: row.label,
          value: risk[row.key],
        }))}
      />
    ) : legacyRisk ? (
      <div className="space-y-2">
        <p className="line-clamp-5 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-700">
          <KeyTermHighlight text={legacyRisk} entities={(article.entityMentions || []).map((item) => item.name)} />
        </p>
        <button
          type="button"
          onClick={() => void generate('risk')}
          className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] font-serif font-bold text-stone-700 hover:border-stone-700 hover:text-stone-950"
        >
          <Sparkles className="w-3 h-3" /> 按四行模型重算
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span>{err || '尚未生成风险模型。'}</span>
        {!err && (
          <button
            type="button"
            onClick={() => void generate('risk')}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] font-serif font-bold text-stone-700 hover:border-stone-700 hover:text-stone-950"
          >
            <Sparkles className="w-3 h-3" /> 生成
          </button>
        )}
      </div>
    );
  } else {
    title = '关联背景';
    methodId = 'bm25_retrieval';
    body =
      related.length > 0 ? (
        <div className="space-y-1.5 text-xs">
          {related.map((r) =>
            onOpenArticle ? (
              <button
                key={r.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenArticle(r as NewsArticle);
                }}
                className="-mx-1 flex w-full items-baseline gap-2 rounded px-1 text-left transition-colors hover:bg-sky-50"
              >
                <span className="h-1 w-1 shrink-0 translate-y-[-2px] rounded-full bg-[#0284C7]" />
                <span className="line-clamp-2 leading-relaxed text-[#0369A1] hover:underline">
                  <KeyTermHighlight text={r.title} entities={(r.entityMentions || []).map((item) => item.name)} />
                </span>
              </button>
            ) : (
              <div key={r.id} className="flex items-baseline gap-2">
                <span className="h-1 w-1 shrink-0 translate-y-[-2px] rounded-full bg-[#0284C7]" />
                <span className="line-clamp-2 leading-relaxed text-stone-800">
                  <KeyTermHighlight text={r.title} entities={(r.entityMentions || []).map((item) => item.name)} />
                </span>
              </div>
            )
          )}
          <p className="pt-0.5 text-[9px] text-stone-400">同题材或同主体站内旧闻 · 本地匹配，点击可读全文</p>
        </div>
      ) : (
        <p className="text-xs text-stone-500">当前语料中暂无足够相似的背景条目。</p>
      );
  }

  return (
    <div className="mb-2 rounded-lg border border-stone-200 bg-[#FAF8F5]">
      <div className="flex flex-wrap items-center gap-1 px-2 pt-2">
        {TABS.map((t) => {
          const active = mode === t.key;
          return (
            <button
              key={t.key}
              type="button"
              title={t.tip}
              onClick={() => switchTo(t.key)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-serif font-bold transition-all ${
                active
                  ? 'border-[#E3120B] bg-[#E3120B] text-white'
                  : 'border-stone-300 bg-white text-stone-600 hover:border-stone-700 hover:text-stone-900'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-3 pt-2.5">
        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
          <div className="text-[10px] font-serif font-black uppercase tracking-wider text-[#E3120B]">{title}</div>
          {methodId ? <MethodBadge methodId={methodId} compact /> : null}
        </div>
        <FeatureSummary featureId={FEATURE_ID[mode]} compact className="mb-2" />
        {body}
        {note && methodId && !busy ? <p className="mt-1.5 text-[9px] text-stone-400">{note}</p> : null}
        {mode !== 'related' && methodId && !busy ? (
          <p className="mt-1 text-[9px] text-stone-400">
            颜色速读：<span className="font-semibold text-emerald-700">绿=利好/进展</span> ·
            <span className="font-semibold text-red-600">红=风险/负面</span> ·
            <span className="font-semibold text-amber-700">金=数字/时间</span> ·
            <span className="font-semibold text-sky-700">蓝=主体/术语</span>；本地词典与已标注实体自动匹配
          </p>
        ) : null}
      </div>
    </div>
  );
};
