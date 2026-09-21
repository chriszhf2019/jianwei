import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { GitMerge, ShieldAlert, Sparkles, Layers, PlusCircle, Radio } from 'lucide-react';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { MethodBadge } from '../common/MethodBadge';

interface CrossEventNexusPanelProps {
  articles: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
  onOpenArticleById?: (articleId: string) => void;
}

interface PairAnalysis {
  id: string;
  title: string;
  resonanceLevel: string;
  resonanceScore: number;
  articleIds: [string, string];
  articleTitles: [string, string];
  hiddenNexusTheme: string;
  sharedBottleneck: string;
  synergyChain: Array<{ step: string; sourceArticle: string; mechanism: string }>;
  jointImpacts: { firstOrder: string; secondOrder: string; thirdOrder: string };
  aiJointVerdict: string;
  recommendedAction: string;
  signal: {
    sharedTags: string[];
    contentSimilarity: number;
    bothDeep: boolean;
    sources: [string, string];
  };
}

// —— 文本信号：字符二元组 Jaccard（无 NLP 依赖、对中文有效） ——
function bigramMap(text: string): Map<string, number> {
  const t = String(text || '')
    .replace(/[\s\p{P}]/gu, '')
    .toLowerCase();
  const map = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i += 1) {
    const g = t.slice(i, i + 2);
    map.set(g, (map.get(g) || 0) + 1);
  }
  return map;
}
function jaccard(aText: string, bText: string): number {
  const a = bigramMap(aText);
  const b = bigramMap(bText);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  let union = 0;
  for (const [g, ca] of a) {
    const cb = b.get(g) || 0;
    inter += Math.min(ca, cb);
    union += Math.max(ca, cb);
  }
  for (const [g, cb] of b) {
    if (!a.has(g)) union += cb;
  }
  return union > 0 ? inter / union : 0;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const levelOf = (score: number) =>
  score >= 76 ? '突变级共振' : score >= 46 ? '结构级交汇' : '周期级传导';

function analyzePair(a: NewsArticle, b: NewsArticle): PairAnalysis {
  const tagsA: string[] = a.tags || [];
  const tagsB: string[] = b.tags || [];
  const sharedTags = [...new Set(tagsA.filter((t) => tagsB.includes(t)))];

  const textA = `${a.title} ${a.summary || a.oneSentenceVerdict || ''} ${(a.subtitle || '').slice(0, 40)}`;
  const textB = `${b.title} ${b.summary || b.oneSentenceVerdict || ''} ${(b.subtitle || '').slice(0, 40)}`;
  const contentSimilarity = Math.round(jaccard(textA, textB) * 100) / 100;

  const bothDeep =
    Boolean(a.spectrumLayers && a.spectrumLayers.length > 0) &&
    Boolean(b.spectrumLayers && b.spectrumLayers.length > 0);
  const minTags = Math.max(1, Math.min(tagsA.length, tagsB.length));
  const sharedTagRatio = sharedTags.length / minTags;

  // 信号共振分（透明加权，0-100）
  const score = Math.round(
    clamp(
      30 * sharedTagRatio +
        40 * contentSimilarity * (contentSimilarity > 0.05 ? 1 : 0.35) +
        15 * (bothDeep ? 1 : 0) +
        10 * (a.category === b.category ? 0.5 : 0),
      0,
      100
    )
  );

  const sourceName = (x: NewsArticle) =>
    String(x.sourceName || (x.isExternal ? '外部信源' : '见微')) || '未知来源';
  const sources: [string, string] = [sourceName(a), sourceName(b)];
  const topicA = (x: NewsArticle) => (x.tags && x.tags.length > 0 ? x.tags.slice(0, 3).join('、') : x.category);
  const topicB = (x: NewsArticle) => (x.tags && x.tags.length > 0 ? x.tags.slice(0, 3).join('、') : x.category);

  const theme =
    sharedTags.length > 0
      ? `「${topicA(a)}」与「${topicB(b)}」共享信号标签：${sharedTags.join('、')}`
      : contentSimilarity >= 0.05
        ? `两篇在标题/摘要文本上存在可观重叠（相似度 ${Math.round(contentSimilarity * 100)}%），指向相近话题。`
        : `两篇分属「${topicA(a)}」与「${topicB(b)}」，当前语料信号重叠较弱（文本相似度 ${Math.round(contentSimilarity * 100)}%）。`;

  const bottleneck = bothDeep
    ? `两篇均含深层因果数据：A 根因「${(a.logicTree && a.logicTree.rootCause) || '—'}」；B 根因「${(b.logicTree && b.logicTree.rootCause) || '—'}」。`
    : '至少一篇为外部浅层条目（暂无深层因果字段），瓶颈分析请先对该篇执行 AI 深度补全。';

  const overlapDetail =
    sharedTags.length > 0
      ? `共享标签 ${sharedTags.join('、')}`
      : contentSimilarity >= 0.05
        ? `标题/摘要文本相似度 ${Math.round(contentSimilarity * 100)}%`
        : `暂无高置信重叠信号（建议更换配对或先补全深层字段）`;

  const summaryOf = (x: NewsArticle) => (x.summary || x.oneSentenceVerdict || x.title).slice(0, 90);

  return {
    id: `pair-${a.id}-${b.id}`,
    title: `${a.title.slice(0, 20)}${a.title.length > 20 ? '…' : ''} ⨉ ${b.title.slice(0, 20)}${b.title.length > 20 ? '…' : ''}`,
    resonanceLevel: levelOf(score),
    resonanceScore: score,
    articleIds: [a.id, b.id],
    articleTitles: [a.title, b.title],
    hiddenNexusTheme: theme,
    sharedBottleneck: bottleneck,
    synergyChain: [
      { step: '01 · 事件 A', sourceArticle: a.title, mechanism: summaryOf(a) },
      { step: '02 · 事件 B', sourceArticle: b.title, mechanism: summaryOf(b) },
      { step: '03 · 交汇信号', sourceArticle: '文本信号比对（非模型推演）', mechanism: overlapDetail },
    ],
    jointImpacts: {
      firstOrder: `共同信号：${overlapDetail}。`,
      secondOrder: `涉及分类：A=${a.category}，B=${b.category}；来源：${sources[0]} × ${sources[1]}。`,
      thirdOrder: '建议将上述重叠信号加入专题跟踪，观察其在语料中的后续演变，而非直接外推预测。',
    },
    aiJointVerdict: `自动信号比对（可复核）：共享标签 ${sharedTags.length} 个、文本相似度 ${Math.round(contentSimilarity * 100)}%、双方含深层字段：${
      bothDeep ? '是' : '否'
    }，加权共振分 ${score}/100。本结论为信号重叠统计，非因果断言。`,
    recommendedAction: `人工复核「${overlapDetail}」是否构成实质关联；可在详情页执行 AI 深度补全后再比对。`,
    signal: { sharedTags, contentSimilarity, bothDeep, sources },
  };
}

export const CrossEventNexusPanel: React.FC<CrossEventNexusPanelProps> = ({
  articles,
  onSelectArticleTitle,
  onOpenArticleById,
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customArticleIdA, setCustomArticleIdA] = useState<string>('');
  const [customArticleIdB, setCustomArticleIdB] = useState<string>('');
  const [selectedPairKey, setSelectedPairKey] = useState<string>('');

  // 参与自动发现的代表性子集：已有深层字段的文章优先，外加近期条目
  const pool = useMemo(() => {
    const curated = articles.filter((a) => a.spectrumLayers && a.spectrumLayers.length > 0);
    const externals = articles.filter((a) => !curated.includes(a)).slice(-36);
    return [...curated, ...externals];
  }, [articles]);

  const topPairs = useMemo(() => {
    const list: PairAnalysis[] = [];
    const n = Math.min(pool.length, 40);
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const p = analyzePair(pool[i], pool[j]);
        if (p.resonanceScore > 0) list.push(p);
      }
    }
    return list.sort((x, y) => y.resonanceScore - x.resonanceScore).slice(0, 5);
  }, [pool]);

  const customPair = useMemo(() => {
    const a = articles.find((x) => x.id === customArticleIdA);
    const b = articles.find((x) => x.id === customArticleIdB);
    if (!a || !b || a.id === b.id) return null;
    return analyzePair(a, b);
  }, [articles, customArticleIdA, customArticleIdB]);

  const activePair =
    (isCustomMode ? customPair : topPairs.find((p) => p.id === selectedPairKey)) || null;

  const renderArticleCard = (art: NewsArticle) => (
    <div
      key={art.id}
      onClick={() => onSelectArticleTitle && onSelectArticleTitle(art.title)}
      className="p-3.5 bg-stone-50 border border-stone-200 hover:border-stone-400 rounded-xl cursor-pointer transition-all space-y-1"
    >
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-serif font-bold text-[#E3120B]">{art.category}</span>
        <EvidenceBadge article={art} corpus={articles} compact />
      </div>
      <h5 className="text-xs font-serif font-bold text-stone-900 line-clamp-2">{art.title}</h5>
    </div>
  );

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#E3120B] text-xs font-serif font-bold uppercase tracking-wider">
            <GitMerge className="w-4 h-4" />
            <span>多事件跨篇因果交叉对比 · 语料信号交汇雷达 (Cross-Event Nexus)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
            跨事件信号比对与共振分析
          </h3>
          <MethodBadge methodId="title_similarity" />
          <p className="text-xs text-stone-600">
            基于<strong>当前运行时语料（{articles.length} 篇）</strong>自动计算两两信号的共享标签/文本重叠/深层字段覆盖，输出可复核的共振分——真实统计，非示例模板；浅层外部条目信号不足时会如实提示。
          </p>
        </div>

        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-300 shrink-0">
          <button
            onClick={() => setIsCustomMode(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${
              !isCustomMode ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            语料自动发现 TOP
          </button>
          <button
            onClick={() => setIsCustomMode(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all ${
              isCustomMode ? 'bg-[#E3120B] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>自由双事件对比</span>
          </button>
        </div>
      </div>

      {/* Mode 1: auto-discovered top pairs */}
      {!isCustomMode && (
        <div className="space-y-2">
          <div className="text-xs font-serif font-bold text-stone-600 flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>按语料信号自动发现的高共振组合（得分=共享标签×30% + 文本相似×40% + 深层字段×15% + 同分类×10%）</span>
          </div>
          {topPairs.length > 0 ? (
            <div className="space-y-2">
              {topPairs.map((p) => {
                const isSelected = p.id === selectedPairKey;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPairKey(p.id)}
                    className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#E3120B] bg-[#FAF8F5] shadow-xs'
                        : 'border-stone-200 hover:border-stone-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                        {p.resonanceLevel}
                      </span>
                      <span className="font-mono font-bold text-amber-700">
                        共振分 {p.resonanceScore}/100
                      </span>
                    </div>
                    <div className="text-sm font-serif font-bold text-stone-950 leading-snug">{p.title}</div>
                    <div className="mt-1 text-[11px] text-stone-500 line-clamp-1">
                      交汇信号：{p.signal.sharedTags.length > 0
                        ? p.signal.sharedTags.join('、')
                        : `文本相似度 ${Math.round(p.signal.contentSimilarity * 100)}%`}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-stone-400 text-xs">
              当前语料未发现足够的跨篇重叠信号（可先摄取更多信源或刷新语料）。
            </div>
          )}
        </div>
      )}

      {/* Mode 2: custom pair */}
      {isCustomMode && (
        <div className="bg-stone-50 border-2 border-stone-300 rounded-xl p-4 space-y-4">
          <div className="text-xs font-serif font-bold text-stone-800">
            选择两篇新闻做信号比对（结果即时计算）
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-stone-600">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block mr-1" />
                事件 A
              </label>
              <select
                value={customArticleIdA}
                onChange={(e) => setCustomArticleIdA(e.target.value)}
                className="w-full text-xs font-serif p-2.5 bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-hidden focus:border-stone-900"
              >
                <option value="">请选择…</option>
                {articles.map((art) => (
                  <option key={art.id} value={art.id} disabled={art.id === customArticleIdB}>
                    [{art.isExternal ? '外部' : '深度'}] {art.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-stone-600">
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block mr-1" />
                事件 B
              </label>
              <select
                value={customArticleIdB}
                onChange={(e) => setCustomArticleIdB(e.target.value)}
                className="w-full text-xs font-serif p-2.5 bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-hidden focus:border-stone-900"
              >
                <option value="">请选择…</option>
                {articles.map((art) => (
                  <option key={art.id} value={art.id} disabled={art.id === customArticleIdA}>
                    [{art.isExternal ? '外部' : '深度'}] {art.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Detail */}
      {activePair ? (
        <div className="space-y-6 pt-2">
          <div className="bg-stone-900 text-stone-100 rounded-xl p-5 border border-stone-950 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-red-600 text-white text-[11px] font-bold rounded font-mono">
                  {activePair.resonanceLevel}
                </span>
                <span className="text-sm sm:text-base font-serif font-bold text-white">
                  {activePair.hiddenNexusTheme}
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs text-stone-400 font-mono">共振分（信号重叠算法）</span>
                <span className="text-lg font-mono font-black text-amber-400">{activePair.resonanceScore} / 100</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 text-xs sm:text-sm text-stone-300">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{activePair.sharedBottleneck}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="p-2.5 bg-stone-800 rounded-lg">
                <div className="text-stone-400">共享标签</div>
                <div className="text-amber-300 font-bold">{activePair.signal.sharedTags.length}</div>
              </div>
              <div className="p-2.5 bg-stone-800 rounded-lg">
                <div className="text-stone-400">文本相似度</div>
                <div className="text-amber-300 font-bold">{Math.round(activePair.signal.contentSimilarity * 100)}%</div>
              </div>
              <div className="p-2.5 bg-stone-800 rounded-lg">
                <div className="text-stone-400">双方含深层字段</div>
                <div className="text-amber-300 font-bold">{activePair.signal.bothDeep ? '是' : '否'}</div>
              </div>
              <div className="p-2.5 bg-stone-800 rounded-lg">
                <div className="text-stone-400">来源</div>
                <div className="text-stone-200 font-bold truncate" title={activePair.signal.sources.join(' × ')}>
                  {activePair.signal.sources[0]} × {activePair.signal.sources[1]}
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="text-xs font-serif font-bold text-stone-600 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-stone-500" />
              <span>比对链路</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activePair.synergyChain.map((s, idx) => (
                <div key={idx} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-[#E3120B]">{s.step}</span>
                  <div className="text-xs font-serif font-bold text-stone-900 line-clamp-2">{s.sourceArticle}</div>
                  <p className="text-[11px] text-stone-600 line-clamp-3 leading-relaxed">{s.mechanism}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict */}
          <div className="p-4 bg-stone-900 rounded-xl space-y-3">
            <div className="text-xs font-serif font-bold text-amber-300 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4" />
              <span>自动信号比对结论（可复核，非因果断言）</span>
            </div>
            <p className="text-xs text-stone-200 leading-relaxed">{activePair.aiJointVerdict}</p>
            <p className="text-[11px] text-stone-400 border-t border-stone-800 pt-2">{activePair.recommendedAction}</p>
          </div>

          {/* Involved articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activePair.articleIds.map((id) => {
              const art = articles.find((x) => x.id === id);
              return art ? renderArticleCard(art) : null;
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-stone-400 text-xs">
          {isCustomMode
            ? '选择事件 A 与事件 B 后即时计算信号比对。'
            : '点击上方“语料自动发现”组合，或切换到“自由双事件对比”。'}
        </div>
      )}
    </div>
  );
};
