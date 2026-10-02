import React from 'react';
import { NewsArticle } from '../../types';
import {
  Sparkles, Clock, MapPin, Users, HelpCircle,
  Activity, ArrowRight, Radio, AlertTriangle, Loader2, Lightbulb, Scale, Newspaper, BookOpen,
} from 'lucide-react';
import type { NewsSkill } from '../home/HomeView';
import { findRelatedArticles } from '../../utils/relatedArticles';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { composeModel } from '../../utils/sevenElementsBrief';

interface SevenElementsTabProps {
  article: NewsArticle;
  /** 按需技能：timeline/stakeholders/corelogic/debate/relatednews 等 */
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  /** 相关新闻：语料池与点击打开其它文章 */
  contextArticles?: NewsArticle[];
  onOpenArticle?: (article: NewsArticle) => void;
  onOpenTermExplain?: (term: string) => void;
}


const FIELD_LABEL: Record<string, { short: string; icon: React.ReactNode }> = {
  what: { short: '发生', icon: <Activity className="w-3.5 h-3.5 text-[#E3120B]" /> },
  who: { short: '主体', icon: <Users className="w-3.5 h-3.5 text-[#0284C7]" /> },
  when: { short: '时间', icon: <Clock className="w-3.5 h-3.5 text-amber-600" /> },
  where: { short: '空间', icon: <MapPin className="w-3.5 h-3.5 text-emerald-600" /> },
  why: { short: '动因', icon: <HelpCircle className="w-3.5 h-3.5 text-purple-600" /> },
  how: { short: '路径', icon: <Sparkles className="w-3.5 h-3.5 text-blue-600" /> },
  soWhat: { short: '格局', icon: <ArrowRight className="w-3.5 h-3.5 text-red-600" /> },
};

/** 媒体一致性模型：不列明细，只给 家数 + 立场分布 + 一致性结论 */
function mediaConsensusModel(
  list: Array<{ sourceName: string; tier?: string; stance?: string; excerpt?: string }>
): {
  total: number;
  pos: number; neg: number; neu: number; warn: number;
  tier1: number;
  dissent: Array<{ sourceName: string; stance?: string; excerpt?: string }>;
  verdict: string;
} {
  let pos = 0, neg = 0, neu = 0, warn = 0, tier1 = 0;
  const dissent: Array<{ sourceName: string; stance?: string; excerpt?: string }> = [];
  for (const m of list) {
    const s = m.stance || '';
    if (s === '正面') pos += 1;
    else if (s === '负面') { neg += 1; dissent.push(m); }
    else if (s === '预警') { warn += 1; dissent.push(m); }
    else neu += 1;
    const t = m.tier || '';
    if (t.includes('Tier 1') || t.includes('一级')) tier1 += 1;
  }
  // 一致性结论：有 负面/预警 即视为存在相反/警示论调
  let verdict: string;
  if (dissent.length > 0) {
    verdict = `多数报道方向一致，但存在 ${dissent.length} 条相反/警示论调（${dissent.map((x) => x.stance).join('、')}），需留意分歧点。`;
  } else if (pos > 0 && neu > 0) {
    verdict = '各家媒体方向一致，正面与中性口径并存，未见相反论调。';
  } else {
    verdict = '各家媒体方向基本一致，未见明显相反论调。';
  }
  return { total: list.length, pos, neg, neu, warn, tier1, dissent, verdict };
}


/** 三层折叠分组外壳：整行标题可点击展开/收起 */
function GroupFold(props: {
  open: boolean;
  label: string;
  desc: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { open, label, desc, onToggle, children } = props;
  return (
    <section className="rounded-2xl border-2 border-stone-800 bg-white shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left bg-stone-100 hover:bg-stone-200/80 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <svg
            className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span className="text-sm font-serif font-black text-stone-950 tracking-wide">{label}</span>
          <span className="hidden lg:inline text-[11px] text-stone-500 font-sans font-normal truncate">{desc}</span>
        </span>
        <span className="text-[10px] font-mono text-stone-400 shrink-0 px-2 py-0.5 rounded border border-stone-300">
          {open ? '收起 ▲' : '展开 ▼'}
        </span>
      </button>
      {open && (
        <div className="p-3 sm:p-4 space-y-4 bg-[#F7F4EF] border-t-2 border-stone-200">{children}</div>
      )}
    </section>
  );
}

export const SevenElementsTab: React.FC<SevenElementsTabProps> = ({
  article,
  onRunSkill,
  contextArticles = [],
  onOpenArticle,
  onOpenTermExplain,
}) => {

  const [timelineBusy, setTimelineBusy] = React.useState(false);
  const [stakeBusy, setStakeBusy] = React.useState(false);
  const [logicBusy, setLogicBusy] = React.useState(false);
  const [debateBusy, setDebateBusy] = React.useState(false);
  const [relBusy, setRelBusy] = React.useState(false);
  const [stakeholderFilter, setStakeholderFilter] = React.useState<'all' | 'benefit' | 'neutral' | 'pressure'>('all');
  const [expandedStakeholderIndex, setExpandedStakeholderIndex] = React.useState<number | null>(null);
  // —— 三层折叠分组（核心结论默认展开；证据佐证 / 推演视角默认收起）——
  const [open, setOpen] = React.useState<{ core: boolean; evidence: boolean; scenario: boolean }>({
    core: true,
    evidence: false,
    scenario: false,
  });
  const [genAllBusy, setGenAllBusy] = React.useState(false);

  // 五类按需 AI 要素的就绪状态（用于“一键补齐”与总览提示）
  const readyKeys = ['timeline', 'stakeholders', 'corelogic', 'debate', 'relatednews'] as const;
  const elementReady: Record<(typeof readyKeys)[number], boolean> = {
    timeline: Array.isArray(article.backstoryTimeline) && article.backstoryTimeline.length > 0,
    stakeholders: Array.isArray(article.stakeholderImpact) && article.stakeholderImpact.length > 0,
    corelogic: !!article.coreLogic,
    debate: !!article.bullBearDebate,
    relatednews: Array.isArray(article.relatedNews) && article.relatedNews.length > 0,
  };
  const elementNames: Record<(typeof readyKeys)[number], string> = {
    timeline: '全景时间轴',
    stakeholders: '影响力与利益方',
    corelogic: '底层逻辑',
    debate: '正反方博弈',
    relatednews: '相关新闻线索',
  };
  const missingElements = readyKeys.filter((k) => !elementReady[k]);
  const allOpen = open.core && open.evidence && open.scenario;

  // 一键补齐缺失要素：固定顺序逐个生成，成功后以最新合并文章继续下一项
  const generateAll = async () => {
    if (!onRunSkill || genAllBusy || missingElements.length === 0) return;
    setGenAllBusy(true);
    let cur: NewsArticle = article;
    try {
      for (const k of missingElements) {
        const next = await onRunSkill(k, cur);
        if (next) cur = next;
      }
    } finally {
      setGenAllBusy(false);
    }
  };

  const localRelated = React.useMemo(() => findRelatedArticles(article, contextArticles, 4), [article, contextArticles]);
  const { sevenElements } = article;
  const multiSourcesRaw = (article.rippleEffect as any)?.multiSources as
    | Array<{ sourceName: string; tier: string; stance: string; verified?: boolean; excerpt?: string }>
    | undefined;

  const effectiveMultiSources = React.useMemo(() => {
    if (Array.isArray(multiSourcesRaw) && multiSourcesRaw.length > 0) {
      return multiSourcesRaw;
    }

    const list: Array<{ sourceName: string; tier: string; stance: string; verified?: boolean; excerpt?: string }> = [];

    // 1. Primary Source
    if (article.sourceName) {
      list.push({
        sourceName: article.sourceName,
        tier: 'Tier 1 基础信源',
        stance: '中性',
        verified: true,
        excerpt: article.oneSentenceVerdict || article.summary || article.subtitle || article.title,
      });
    }

    // 2. Evidence Chain Sources
    if (Array.isArray(article.evidenceChain) && article.evidenceChain.length > 0) {
      for (const ev of article.evidenceChain) {
        if (ev.sourceName && !list.some((item) => item.sourceName === ev.sourceName)) {
          list.push({
            sourceName: ev.sourceName,
            tier: 'Tier 2 验证引用',
            stance: ev.relation === 'supports' ? '正面' : ev.relation === 'contradicts' ? '负面' : '中性',
            verified: true,
            excerpt: ev.quote || ev.claim || ev.sourceFact,
          });
        }
      }
    }

    // 3. Station Cross-Articles
    if (localRelated && localRelated.length > 0) {
      for (const rel of localRelated) {
        const sName = rel.sourceName || '站内交叉语料';
        if (!list.some((item) => item.sourceName === sName)) {
          list.push({
            sourceName: sName,
            tier: 'Tier 2 站内交叉报道',
            stance: '中性',
            verified: true,
            excerpt: rel.title,
          });
        }
      }
    }

    return list;
  }, [multiSourcesRaw, article, localRelated]);

  const [enrichBusy, setEnrichBusy] = React.useState(false);
  const handleTriggerEnrich = async () => {
    if (!onRunSkill || enrichBusy) return;
    setEnrichBusy(true);
    try {
      await onRunSkill('enrich', article);
    } finally {
      setEnrichBusy(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 总览工具条：默认只显示生成进度和必要操作。 */}
      <div className="bg-white border border-stone-300 rounded-xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E3120B] shrink-0" />
            <h3 className="text-sm font-serif font-black text-stone-950">事实与分析</h3>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500 mt-0.5">
            {missingElements.length > 0 ? (
              <>仍有 <b className="text-stone-800">{missingElements.length}</b> 项未生成：{missingElements.map((k) => elementNames[k]).join(' · ')}</>
            ) : (
              <>核心内容与扩展分析均已生成</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRunSkill && (
            <button
              type="button"
              onClick={generateAll}
              disabled={genAllBusy || missingElements.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 text-xs font-serif font-bold transition-colors"
            >
              {genAllBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {genAllBusy
                ? '正在逐项补齐…'
                : missingElements.length > 0
                  ? '补齐缺失项'
                  : '要素已齐全 ✓'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen({ core: !allOpen, evidence: !allOpen, scenario: !allOpen })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-serif font-bold transition-colors"
          >
            {allOpen ? '全部收起' : '全部展开'}
          </button>
        </div>
      </div>

      {/* 组一：核心结论（默认展开）—— 事件模型 + 底层逻辑 */}
      <GroupFold
        open={open.core}
        label="核心结论"
        desc="事件模型 · 底层逻辑 —— 快速看懂：发生了什么、本质是什么"
        onToggle={() => setOpen((o) => ({ ...o, core: !o.core }))}
      >
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#E3120B]" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              事件模型 · 一页看懂
            </h3>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">七要素整合版</span>
        </div>

        {/* AI 裁决徽标（如存在） */}
        {sevenElements?.aiVerdict && (
          <div className="bg-stone-950 text-stone-100 rounded-xl p-4 border border-stone-800 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-serif font-bold text-red-500">
              <Sparkles className="w-3.5 h-3.5" /> AI 解读：{sevenElements.aiVerdict.verdictSummary}
            </span>
            <span className="ml-auto flex items-center gap-2 text-[11px] font-mono">
              <span
                className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800"
                title="模型自报置信度不是经历史数据校准的真实概率，只能作为相对强弱提示。"
              >
                模型自评 {sevenElements.aiVerdict.confidenceScore}/100 · 未校准
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">波动 {sevenElements.aiVerdict.volatility}</span>
              <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-bold">行动 {sevenElements.aiVerdict.actionLevel}</span>
            </span>
          </div>
        )}

        {/* 整合模型说明 */}
        {sevenElements && (
          <>
            <p className="text-base font-serif font-bold text-stone-950 leading-relaxed max-w-3xl">
              <KeyTermHighlight
                text={composeModel(sevenElements)}
                entities={(article.entityMentions || []).map((e) => e.name)}
                onOpenTermExplain={onOpenTermExplain}
              />
            </p>

            {/* 紧凑要点行（替代原来 7 个大方块） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['what', 'who', 'when', 'where', 'why', 'how', 'soWhat'] as const).map((key) => {
                const val = (sevenElements as any)[key];
                if (!val || !String(val).trim()) return null;
                const meta = FIELD_LABEL[key];
                return (
                  <div key={key} className="flex items-start gap-2 text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                    <span className="mt-0.5 shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <span className="font-serif font-bold text-stone-500 mr-1.5">{meta.short}</span>
                      <span className="text-stone-800 leading-relaxed">
                        <KeyTermHighlight
                          text={val}
                          entities={(article.entityMentions || []).map((e) => e.name)}
                          onOpenTermExplain={onOpenTermExplain}
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* ② 多源验证：哪些媒体也报道了同一事件 */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              底层逻辑 · 本质与核心机制
            </h3>
          </div>
          {article.coreLogic && (
            <span className="text-[11px] font-mono text-stone-400">第一性视角</span>
          )}
        </div>

        {!article.coreLogic || !article.coreLogic.essence ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>本条还没有底层逻辑分析。点击右侧按钮，AI 会提炼这件事的本质与核心机制。</span>
            </div>
            <button
              onClick={async () => {
                if (!onRunSkill || logicBusy) return;
                setLogicBusy(true);
                try {
                  await onRunSkill('corelogic', article);
                } finally {
                  setLogicBusy(false);
                }
              }}
              disabled={!onRunSkill || logicBusy}
              className="inline-flex items-center gap-1.5 shrink-0 justify-center px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-serif font-bold rounded-lg border border-amber-600/60 transition-all"
            >
              {logicBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
              {logicBusy ? 'AI 正在剖析底层逻辑…（10-30 秒）' : '生成底层逻辑分析'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 本质（一句话大字） */}
            <div className="bg-stone-950 text-stone-100 rounded-xl p-5 border-l-4 border-amber-400">
              <div className="text-[10px] font-serif font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                本质
              </div>
              <p className="text-base sm:text-lg font-serif font-black leading-snug">
                {article.coreLogic.essence}
              </p>
            </div>

            {/* 核心逻辑点 */}
            <div className="space-y-2">
              <div className="text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider">
                核心逻辑
              </div>
              {article.coreLogic.points.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-serif font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-stone-800 leading-relaxed">
                    <KeyTermHighlight text={pt} entities={(article.entityMentions || []).map((e) => e.name)} />
                  </p>
                </div>
              ))}
            </div>

            {/* 反直觉点 */}
            {article.coreLogic.counterIntuitive && (
              <div className="px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
                <span className="font-serif font-bold mr-1">⚠ 最反直觉/易误读：</span>
                {article.coreLogic.counterIntuitive}
              </div>
            )}

            {/* 可验证盯盘数据点 (提升机制落地方向) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-stone-100/90 border border-stone-200/90 rounded-xl text-[11px] text-stone-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-serif font-bold text-stone-800 shrink-0">机制验证盯盘数据点：</span>
                <span className="text-stone-600 font-mono truncate">
                  {article.category?.includes('财经') || article.title.includes('美元') || article.title.includes('美联储')
                    ? 'SOFR 隔夜利率 · 离岸外债利差 · 交叉货币互换 (CCS) · VIX 波动率'
                    : '行业集中度 · 供应链交付周期 · 边际毛利率 · 研发资本化率'}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono shrink-0">实时风控验证</span>
            </div>
            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-2">
              口径：本质与核心逻辑为 AI 第一性视角的提炼（非事实结论），用于帮助跳出事件本身理解结构性机制。
            </p>
          </div>
        )}
      </div>

      {/* ⑥ 正反方博弈 */}
      </GroupFold>

      {/* 组二：证据佐证 —— 多源验证 + 相关新闻 */}
      <GroupFold
        open={open.evidence}
        label="证据佐证"
        desc="多源验证 · 相关新闻 —— 谁也在说、还能读什么（站内优先 + AI 补充线索）"
        onToggle={() => setOpen((o) => ({ ...o, evidence: !o.evidence }))}
      >
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              来源线索核对 · 谁也在说这件事
            </h3>
          </div>
          {effectiveMultiSources && effectiveMultiSources.length > 0 && (
            <span className="text-[11px] font-mono text-stone-400">
              已列出 {effectiveMultiSources.length} 条多源交叉线索 · {effectiveMultiSources.filter((m) => m.stance === '中性').length} 条中性
            </span>
          )}
        </div>

        {effectiveMultiSources.length === 0 ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
              <span>
                本条尚未完成 AI 深度解读，暂无列出的多源核查线索。
              </span>
            </div>
            {onRunSkill && (
              <button
                onClick={handleTriggerEnrich}
                disabled={enrichBusy}
                className="shrink-0 px-3.5 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white font-serif font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {enrichBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>正在深度解析多源线索…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>立即触发 AI 多源核查</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          (() => {
            const c = mediaConsensusModel(effectiveMultiSources);
            const hasDissent = c.dissent.length > 0;
            return (
              <div className="space-y-3">
                {/* 家数 + 权威概览 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                    <div className="text-xl font-serif font-black text-stone-950 font-mono">{c.total}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">交叉佐证线索数</div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <div className="text-xl font-serif font-black text-emerald-800 font-mono">{c.tier1}</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">Tier 1 / 基础信源</div>
                  </div>
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-center">
                    <div className="text-xl font-serif font-black text-sky-800 font-mono">{c.pos}</div>
                    <div className="text-[10px] text-sky-700 mt-0.5">立场偏正面</div>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    hasDissent ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-200'
                  }`}>
                    <div className={`text-xl font-serif font-black font-mono ${hasDissent ? 'text-amber-700' : 'text-stone-400'}`}>
                      {c.neg + c.warn}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${hasDissent ? 'text-amber-700' : 'text-stone-400'}`}>
                      相反/警示论调
                    </div>
                  </div>
                </div>

                {/* 一致性结论（一句话模型） */}
                <div className={`px-4 py-3 rounded-xl border-l-4 text-xs leading-relaxed ${
                  hasDissent
                    ? 'bg-amber-50/70 border-amber-400 text-amber-950'
                    : 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
                }`}>
                  <span className="font-serif font-bold mr-1.5">
                    {hasDissent ? '⚠ 存在分歧' : '✓ 方向一致'}：
                  </span>
                  {c.verdict}
                </div>

                {/* 来源明细一览 */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-serif font-bold text-stone-700">已知交叉线索列表：</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {effectiveMultiSources.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-serif font-bold text-stone-900 truncate">{item.sourceName}</span>
                            {item.tier && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-stone-200/80 text-stone-600 rounded">
                                {item.tier.split(' ')[0] || item.tier}
                              </span>
                            )}
                          </div>
                          {item.excerpt && <p className="text-[11px] text-stone-600 leading-snug line-clamp-2">{item.excerpt}</p>}
                        </div>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          item.stance === '正面' ? 'bg-sky-100 text-sky-800 border border-sky-200' : item.stance === '负面' || item.stance === '预警' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-200 text-stone-700 border border-stone-300'
                        }`}>
                          {item.stance || '中性'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 底部一键 AI 深度挖掘触发按钮 */}
                {onRunSkill && (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>已通过语料与证据链自动合成 {effectiveMultiSources.length} 条交叉佐证线索</span>
                    <button
                      onClick={handleTriggerEnrich}
                      disabled={enrichBusy}
                      className="text-[#0284C7] hover:text-sky-900 font-serif font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {enrichBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                      <span>{enrichBusy ? '正在重诊…' : 'AI 大模型扩展深度核实'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* ③ 全景时间轴：本篇之前的关键相关节点 */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Newspaper className="w-5 h-5 text-[#0284C7]" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              相关新闻 · 一起看
            </h3>
          </div>
          {(localRelated.length > 0 || (article.relatedNews || []).length > 0) && (
            <span className="text-[11px] font-mono text-stone-400">
              {localRelated.length} 篇站内 + {(article.relatedNews || []).length} 条 AI 线索
            </span>
          )}
        </div>

        {localRelated.length === 0 && (!article.relatedNews || article.relatedNews.length === 0) ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>语料中暂无同题材文章。点击右侧按钮，让 AI 从知识里补充值得一并阅读的相关报道线索。</span>
            </div>
            <button
              onClick={async () => {
                if (!onRunSkill || relBusy) return;
                setRelBusy(true);
                try {
                  await onRunSkill('relatednews', article);
                } finally {
                  setRelBusy(false);
                }
              }}
              disabled={!onRunSkill || relBusy}
              className="inline-flex items-center gap-1.5 shrink-0 justify-center px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-serif font-bold rounded-lg border border-sky-600/60 transition-all"
            >
              {relBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Newspaper className="w-3.5 h-3.5" />}
              {relBusy ? 'AI 正在补充相关线索…（10-30 秒）' : '补充 AI 相关线索'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 本地真实（可点击） */}
            {localRelated.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider">
                  站内同题材文章（真实 · 点击打开）
                </div>
                {localRelated.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onOpenArticle && onOpenArticle(r)}
                    disabled={!onOpenArticle}
                    className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 bg-stone-50 hover:bg-sky-50 border border-stone-200 hover:border-sky-300 rounded-xl transition-colors disabled:cursor-default"
                  >
                    <Newspaper className="w-3.5 h-3.5 text-[#0284C7] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-serif font-bold text-stone-900 leading-snug line-clamp-2">{r.title}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
                        {(r.sourceName || '').replace(/^www\./, '')} · {(r.publishedAt || r.date || '').toString().slice(0, 16)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* AI 补充线索 */}
            {article.relatedNews && article.relatedNews.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider">
                  AI 补充报道线索（记忆召回 · 非实时联网）
                </div>
                {article.relatedNews.map((n, i) => (
                  <div key={i} className="px-3.5 py-2.5 bg-sky-50/50 border border-sky-200 rounded-xl">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-serif font-bold text-stone-900 leading-snug flex-1">{n.title}</span>
                      <span className="text-[10px] font-mono text-sky-700 shrink-0">{n.media}</span>
                    </div>
                    {n.why && <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">看点：{n.why}</div>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-2">
              口径：站内文章来自当前语料真实匹配（点击可读全文）；AI 线索为模型记忆中的知名报道标题，可能滞后或有出入，请自行核实原文。
            </p>
          </div>
        )}
      </div>
      </GroupFold>

      {/* 组三：推演视角 —— 全景时间轴 + 影响力与利益方 + 正反方博弈 */}
      <GroupFold
        open={open.scenario}
        label="推演视角"
        desc="全景时间轴 · 影响力利益方 · 正反方博弈 —— 来龙去脉、影响谁、谁的理由更硬"
        onToggle={() => setOpen((o) => ({ ...o, scenario: !o.scenario }))}
      >
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              全景时间轴 · 在此之前
            </h3>
          </div>
          {article.backstoryTimeline && article.backstoryTimeline.length > 0 && (
            <span className="text-[11px] font-mono text-stone-400">
              {article.backstoryTimeline.length} 个关键节点
            </span>
          )}
        </div>

        {!article.backstoryTimeline || article.backstoryTimeline.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>本条还没有前情时间轴。点击右侧按钮，AI 会把这篇文章之前的关键相关事件按时间生成出来。</span>
            </div>
            <button
              onClick={async () => {
                if (!onRunSkill || timelineBusy) return;
                setTimelineBusy(true);
                try {
                  await onRunSkill('timeline', article);
                } finally {
                  setTimelineBusy(false);
                }
              }}
              disabled={!onRunSkill || timelineBusy}
              className="inline-flex items-center gap-1.5 shrink-0 justify-center px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-serif font-bold rounded-lg border border-amber-600/60 transition-all"
            >
              {timelineBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              {timelineBusy ? 'AI 正在梳理前情…（10-30 秒）' : '生成前情时间轴'}
            </button>
          </div>
        ) : (
          <div className="relative pl-5 border-l-2 border-amber-300 ml-2 space-y-5">
            {article.backstoryTimeline.map((node, idx) => {
              // 自动搜寻语料库中与该前情节点匹配的站内报道
              let matchedArticle: NewsArticle | null = null;
              if (contextArticles && contextArticles.length > 0) {
                const keywords = node.event.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter((k) => k.length >= 2);
                for (const art of contextArticles) {
                  if (art.id === article.id) continue;
                  let hits = 0;
                  for (const kw of keywords) {
                    if (art.title.includes(kw) || art.summary?.includes(kw)) hits += 1;
                  }
                  if (hits >= 1) {
                    matchedArticle = art;
                    break;
                  }
                }
              }

              return (
                <div key={idx} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${
                      idx === article.backstoryTimeline!.length - 1
                        ? 'bg-[#E3120B]'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div className="text-xs font-mono font-bold text-amber-700 mb-1">{node.date}</div>
                  <div className="text-sm font-serif font-bold text-stone-900 leading-snug">{node.event}</div>
                  {node.relevance && (
                    <div className="text-xs text-stone-500 leading-relaxed mt-0.5">
                      <span className="text-stone-400 font-serif font-bold mr-1">关系：</span>
                      {node.relevance}
                    </div>
                  )}

                  {/* 关联站内文献跳转按钮 */}
                  {matchedArticle && onOpenArticle && (
                    <div className="mt-1.5">
                      <button
                        onClick={() => onOpenArticle(matchedArticle!)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 rounded-lg text-[11px] text-amber-900 font-serif font-bold transition-all cursor-pointer shadow-2xs"
                        title={`深度调阅历史记录：《${matchedArticle.title}》`}
                      >
                        <BookOpen className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate max-w-[280px]">关联站内文献：《{matchedArticle.title}》</span>
                        <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-[10px] text-stone-400 pt-1">
              口径：节点为 AI 深读时生成的前情梳理（可能含“约”时间），仅作理解脉络参考，非穷尽检索。
            </p>
          </div>
        )}
      </div>

      {/* ④ 影响力与利益相关方分析 */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              影响力与利益相关方
            </h3>
          </div>
          {article.stakeholderImpact && article.stakeholderImpact.length > 0 && (
            <span className="text-[11px] font-mono text-stone-400">
              {article.stakeholderImpact.length} 个受影响方
            </span>
          )}
        </div>

        {!article.stakeholderImpact || article.stakeholderImpact.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>本条还没有影响分析。点击右侧按钮，AI 会分析主要受影响方及其受益/承压方向。</span>
            </div>
            <button
              onClick={async () => {
                if (!onRunSkill || stakeBusy) return;
                setStakeBusy(true);
                try {
                  await onRunSkill('stakeholders', article);
                } finally {
                  setStakeBusy(false);
                }
              }}
              disabled={!onRunSkill || stakeBusy}
              className="inline-flex items-center gap-1.5 shrink-0 justify-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-serif font-bold rounded-lg border border-purple-600/60 transition-all"
            >
              {stakeBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              {stakeBusy ? 'AI 正在分析影响方…（10-30 秒）' : '生成影响分析'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 概览：一键筛选 (支持点击全部/受益/中性/承压卡片) */}
            <div className="grid grid-cols-4 gap-2">
              {/* 全部卡片 */}
              <button
                onClick={() => setStakeholderFilter('all')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-center ${
                  stakeholderFilter === 'all'
                    ? 'bg-stone-900 border-stone-900 text-white shadow-xs font-bold'
                    : 'bg-stone-50 border-stone-200 hover:border-stone-400 text-stone-700'
                }`}
              >
                <div className="text-base sm:text-lg font-serif font-black font-mono">
                  {article.stakeholderImpact!.length}
                </div>
                <div className="text-[10px] mt-0.5">全部影响方</div>
              </button>

              {(['benefit', 'neutral', 'pressure'] as const).map((dir) => {
                const count = article.stakeholderImpact!.filter((s) => s.direction === dir).length;
                const isSelected = stakeholderFilter === dir;
                const cfg =
                  dir === 'benefit'
                    ? {
                        label: '受益方',
                        active: 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-600/30',
                        inactive: 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 text-emerald-800',
                      }
                    : dir === 'pressure'
                    ? {
                        label: '承压方',
                        active: 'bg-[#E3120B] border-[#E3120B] text-white shadow-xs font-bold ring-2 ring-rose-600/30',
                        inactive: 'bg-rose-50/70 border-rose-200 hover:border-rose-400 text-rose-800',
                      }
                    : {
                        label: '中性/观望',
                        active: 'bg-stone-700 border-stone-700 text-white shadow-xs font-bold',
                        inactive: 'bg-stone-50 border-stone-200 hover:border-stone-400 text-stone-600',
                      };
                return (
                  <button
                    key={dir}
                    onClick={() => setStakeholderFilter(isSelected ? 'all' : dir)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected ? cfg.active : cfg.inactive
                    }`}
                  >
                    <div className="text-base sm:text-lg font-serif font-black font-mono">{count}</div>
                    <div className="text-[10px] mt-0.5">{cfg.label}</div>
                  </button>
                );
              })}
            </div>

            {/* 提示：当前筛选状态 */}
            {stakeholderFilter !== 'all' && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-stone-100 rounded-lg text-[11px] text-stone-600">
                <span>
                  当前仅显示: <strong className="text-stone-900 font-serif">
                    {stakeholderFilter === 'benefit' ? '受益方' : stakeholderFilter === 'pressure' ? '承压方' : '中性观望'}
                  </strong>
                </span>
                <button
                  onClick={() => setStakeholderFilter('all')}
                  className="text-stone-500 hover:text-stone-900 underline font-mono cursor-pointer"
                >
                  重置查看全部 ({article.stakeholderImpact!.length})
                </button>
              </div>
            )}

            {/* 列表：方向色点 + 名称/类型 + 强度与可视条 + 理由 + 展开交互 */}
            <div className="space-y-2">
              {article.stakeholderImpact!
                .filter((s) => stakeholderFilter === 'all' || s.direction === stakeholderFilter)
                .map((s, i) => {
                  const isExpanded = expandedStakeholderIndex === i;
                  const dot =
                    s.direction === 'benefit'
                      ? 'bg-emerald-500'
                      : s.direction === 'pressure'
                      ? 'bg-[#E3120B]'
                      : 'bg-stone-400';

                  const badgeCls =
                    s.direction === 'benefit'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : s.direction === 'pressure'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-stone-200 text-stone-700 border-stone-300';

                  const strengthBars = s.strength >= 4 ? '⚡⚡⚡ 强' : s.strength >= 2 ? '⚡⚡ 中' : '⚡ 弱';

                  const typeLabel =
                    ({ company: '公司', government: '政府/监管', person: '人物', group: '群体', industry: '行业', market: '市场' } as Record<string, string>)[s.type] || s.type;

                  return (
                    <div
                      key={i}
                      onClick={() => setExpandedStakeholderIndex(isExpanded ? null : i)}
                      className={`p-3.5 bg-stone-50 hover:bg-stone-100/80 border rounded-xl transition-all cursor-pointer space-y-1.5 ${
                        isExpanded ? 'border-stone-800 shadow-2xs bg-amber-50/20' : 'border-stone-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                          <span className="font-serif font-bold text-stone-950 text-sm truncate">{s.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-200 text-stone-600 rounded shrink-0">
                            {typeLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                            {s.direction === 'benefit' ? '受益' : s.direction === 'pressure' ? '承压' : '中性'}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500 bg-stone-200/80 px-1.5 py-0.5 rounded">
                            {strengthBars}
                          </span>
                        </div>
                      </div>

                      {s.why && (
                        <p className="text-xs text-stone-700 leading-relaxed pl-4 border-l-2 border-stone-300">
                          {s.why}
                        </p>
                      )}

                      {/* 展开传导机制与观察切面 */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-stone-200/80 text-xs space-y-1 pl-4 text-stone-600 font-sans animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-stone-900">传导抓手:</span>
                            <span>{s.direction === 'benefit' ? '成本降轨利差收窄 / 融资再平衡' : s.direction === 'pressure' ? '利差优势削弱 / 短端流动性重定价' : '中性波动观望'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-stone-900">核心观测指标:</span>
                            <span className="font-mono text-stone-700">SOFR 隔夜拆借利率 / 离岸外债利差 Spread</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-2 flex items-center justify-between">
              <span>口径：受益/承压为 AI 深读时基于本事件的判断（direction+strength 1-5），供快速了解各方利害参考。</span>
              <span className="font-mono text-stone-400">点击卡片可查看展开机制</span>
            </p>
          </div>
        )}
      </div>

      {/* ⑤ 底层逻辑分析：本质 + 核心逻辑 */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              正反方博弈 · 谁的理由更硬
            </h3>
          </div>
          {article.bullBearDebate && (
            <span className="text-[11px] font-mono text-stone-400">多空对阵</span>
          )}
        </div>

        {!article.bullBearDebate || !article.bullBearDebate.bull ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>本条还没有正反方博弈分析。点击右侧按钮，AI 会把支持方与质疑方的论点摆出来对比。</span>
            </div>
            <button
              onClick={async () => {
                if (!onRunSkill || debateBusy) return;
                setDebateBusy(true);
                try {
                  await onRunSkill('debate', article);
                } finally {
                  setDebateBusy(false);
                }
              }}
              disabled={!onRunSkill || debateBusy}
              className="inline-flex items-center gap-1.5 shrink-0 justify-center px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-serif font-bold rounded-lg border border-red-600/60 transition-all"
            >
              {debateBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
              {debateBusy ? 'AI 正在摆出双方论据…（10-30 秒）' : '生成正反方博弈'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 左右对阵 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 正方 */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 overflow-hidden">
                <div className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-serif font-bold flex items-center gap-1.5">
                  <TrendingUpIcon /> 正方 · 支持/乐观
                </div>
                <div className="space-y-2 p-3">
                  {article.bullBearDebate.bull.map((b, i) => (
                    <div key={i} className="text-xs bg-white/70 border border-emerald-200 rounded-lg px-3 py-2">
                      <div className="font-serif font-bold text-emerald-900"><KeyTermHighlight text={b.point} /></div>
                      {b.basis && <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">依据：<KeyTermHighlight text={b.basis} /></div>}
                    </div>
                  ))}
                </div>
              </div>
              {/* 反方 */}
              <div className="rounded-xl border border-red-300 bg-red-50/60 overflow-hidden">
                <div className="px-3.5 py-2 bg-red-600 text-white text-xs font-serif font-bold flex items-center gap-1.5">
                  <TrendingDownIcon /> 反方 · 质疑/悲观
                </div>
                <div className="space-y-2 p-3">
                  {article.bullBearDebate.bear.map((b, i) => (
                    <div key={i} className="text-xs bg-white/70 border border-red-200 rounded-lg px-3 py-2">
                      <div className="font-serif font-bold text-red-900"><KeyTermHighlight text={b.point} /></div>
                      {b.basis && <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">依据：<KeyTermHighlight text={b.basis} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 分歧焦点 + 力量判断 */}
            {article.bullBearDebate.coreDispute && (
              <div className="px-4 py-3 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-800">
                <span className="font-serif font-bold mr-1">⚖ 双方分歧焦点：</span>
                {article.bullBearDebate.coreDispute}
              </div>
            )}
            {article.bullBearDebate.read && (
              <div className={`px-4 py-3 rounded-xl border-l-4 text-xs leading-relaxed ${
                (article.bullBearDebate.bull?.length ?? 0) >= (article.bullBearDebate.bear?.length ?? 0)
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
                  : 'bg-red-50/70 border-red-400 text-red-950'
              }`}>
                <span className="font-serif font-bold mr-1">当前力量判断：</span>
                {article.bullBearDebate.read}
              </div>
            )}
            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-2">
              口径：论点为 AI 基于本文的双方立场建模（非事实结论、不构成投资建议）；帮你看清争议焦点再自己下判断。
            </p>
          </div>
        )}
      </div>

      {/* ⑦ 相关新闻（本地真实优先 + AI 补充线索） */}
      </GroupFold>
    </div>
  );
};


/* 用两个 mini 函数替代图标 import 引用的 TrendingUp/Down（避免再加 import） */
function TrendingUpIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <path d="M17 6h6v6" />
    </svg>
  );
}
function TrendingDownIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M23 18l-9.5-9.5-5 5L1 6" />
      <path d="M17 18h6v-6" />
    </svg>
  );
}
