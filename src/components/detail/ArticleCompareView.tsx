import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NewsArticle } from '../../types';
import { findRelatedArticles } from '../../utils/relatedArticles';
import { formatArticleTime } from '../../utils/articleTime';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { 
  Columns, 
  ArrowLeftRight, 
  GitCompare, 
  Search, 
  Sparkles, 
  Scale, 
  X, 
  ArrowRight, 
  Eye, 
  ShieldAlert, 
  BookOpen, 
  Layers, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  AlertTriangle,
  Link2,
  Unlink
} from 'lucide-react';

interface ArticleCompareViewProps {
  primaryArticle: NewsArticle;
  contextArticles: NewsArticle[];
  onClose: () => void;
  onSelectPrimaryArticle?: (article: NewsArticle) => void;
  onOpenTermExplain?: (term: string) => void;
}

// 字符二元组 Jaccard 计算
function bigramMap(text: string): Map<string, number> {
  const t = String(text || '').replace(/[\s\p{P}]/gu, '').toLowerCase();
  const map = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i += 1) {
    const g = t.slice(i, i + 2);
    map.set(g, (map.get(g) || 0) + 1);
  }
  return map;
}

function calculateJaccard(aText: string, bText: string): number {
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

export const ArticleCompareView: React.FC<ArticleCompareViewProps> = ({
  primaryArticle,
  contextArticles,
  onClose,
  onSelectPrimaryArticle,
  onOpenTermExplain,
}) => {
  // 可选对比池：排除当前主文章
  const pool = useMemo(
    () => contextArticles.filter((a) => a.id !== primaryArticle.id),
    [contextArticles, primaryArticle.id]
  );

  // 默认对比文章：先找相关度最高的一篇，若无则取池中第一篇
  const defaultSecondary = useMemo(() => {
    const related = findRelatedArticles(primaryArticle, pool, 1);
    return related[0] || pool[0] || null;
  }, [primaryArticle, pool]);

  const [secondaryArticle, setSecondaryArticle] = useState<NewsArticle | null>(defaultSecondary);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'verdict' | 'logic' | 'perspective' | 'elements'>('verdict');
  const [isAiArbitrating, setIsAiArbitrating] = useState(false);
  const [aiArbitration, setAiArbitration] = useState<{
    divergence: string;
    summary: string;
    biasAssessment: string;
  } | null>(null);

  // 左右栏滚动同步控制
  const [syncScroll, setSyncScroll] = useState(true);
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  const handleLeftScroll = () => {
    if (!syncScroll || isSyncingLeft.current || !leftColRef.current || !rightColRef.current) return;
    isSyncingRight.current = true;
    const left = leftColRef.current;
    const right = rightColRef.current;
    const leftMax = left.scrollHeight - left.clientHeight;
    const rightMax = right.scrollHeight - right.clientHeight;
    if (leftMax > 0 && rightMax > 0) {
      const percentage = left.scrollTop / leftMax;
      right.scrollTop = percentage * rightMax;
    }
    requestAnimationFrame(() => {
      isSyncingRight.current = false;
    });
  };

  const handleRightScroll = () => {
    if (!syncScroll || isSyncingRight.current || !leftColRef.current || !rightColRef.current) return;
    isSyncingLeft.current = true;
    const left = leftColRef.current;
    const right = rightColRef.current;
    const leftMax = left.scrollHeight - left.clientHeight;
    const rightMax = right.scrollHeight - right.clientHeight;
    if (leftMax > 0 && rightMax > 0) {
      const percentage = right.scrollTop / rightMax;
      left.scrollTop = percentage * leftMax;
    }
    requestAnimationFrame(() => {
      isSyncingLeft.current = false;
    });
  };

  // 当外部 primaryArticle 变动时，确保 secondaryArticle 不与 primaryArticle 重复
  useEffect(() => {
    if (secondaryArticle?.id === primaryArticle.id) {
      const nextSecondary = pool.find((a) => a.id !== primaryArticle.id) || null;
      setSecondaryArticle(nextSecondary);
    }
  }, [primaryArticle.id, pool, secondaryArticle?.id]);

  // 获取所有可选文章分类
  const categories = useMemo(() => {
    const set = new Set<string>();
    pool.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [pool]);

  // 搜索过滤可选文章列表
  const filteredCandidates = useMemo(() => {
    return pool.filter((article) => {
      if (filterCategory !== 'all' && article.category !== filterCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(q) ||
        (article.summary || '').toLowerCase().includes(q) ||
        (article.sourceName || '').toLowerCase().includes(q) ||
        (article.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [pool, filterCategory, searchQuery]);

  // 互换左右对比视角
  const handleSwapArticles = () => {
    if (!secondaryArticle || !onSelectPrimaryArticle) return;
    const oldPrimary = primaryArticle;
    const oldSecondary = secondaryArticle;
    onSelectPrimaryArticle(oldSecondary);
    setSecondaryArticle(oldPrimary);
  };

  // 核心对比研判计算 (Comparative Logic & Bias Analytics)
  const comparison = useMemo(() => {
    if (!secondaryArticle) return null;

    const textA = `${primaryArticle.title} ${primaryArticle.summary || ''} ${primaryArticle.oneSentenceVerdict || ''}`;
    const textB = `${secondaryArticle.title} ${secondaryArticle.summary || ''} ${secondaryArticle.oneSentenceVerdict || ''}`;
    const textSimilarity = Math.round(calculateJaccard(textA, textB) * 100);

    // 实体分析
    const entitiesA = new Set((primaryArticle.entityMentions || []).map((e) => e.name));
    const entitiesB = new Set((secondaryArticle.entityMentions || []).map((e) => e.name));
    const sharedEntities = Array.from(entitiesA).filter((e) => entitiesB.has(e));
    const uniqueToA = Array.from(entitiesA).filter((e) => !entitiesB.has(e));
    const uniqueToB = Array.from(entitiesB).filter((e) => !entitiesA.has(e));

    // 标签分析
    const tagsA = new Set(primaryArticle.tags || []);
    const tagsB = new Set(secondaryArticle.tags || []);
    const sharedTags = Array.from(tagsA).filter((t) => tagsB.has(t));

    // 来源与信源性质
    const sourceA = primaryArticle.sourceName || (primaryArticle.isExternal ? '外部信源' : '见微官方智库');
    const sourceB = secondaryArticle.sourceName || (secondaryArticle.isExternal ? '外部信源' : '见微官方智库');
    const isSameSource = sourceA === sourceB;

    // 逻辑根因分析
    const rootCauseA = primaryArticle.logicTree?.rootCause || '未显式提取根因（浅层条目）';
    const rootCauseB = secondaryArticle.logicTree?.rootCause || '未显式提取根因（浅层条目）';

    // 视角偏差判定启发式
    let divergenceLabel = '中度关联 · 互补补充';
    let divergenceColor = 'text-blue-700 bg-blue-50 border-blue-200';
    let biasInsight = '两篇报道在事实层面形成有效信息拼图，建议交叉通读。';

    if (textSimilarity >= 45 || isSameSource) {
      divergenceLabel = '同题印证 · 高度契合';
      divergenceColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      biasInsight = '两篇文章对核心事件事实描述高度重叠，主要论断基调基本一致。';
    } else if (primaryArticle.category !== secondaryArticle.category) {
      divergenceLabel = '跨界穿透 · 异构视角';
      divergenceColor = 'text-purple-700 bg-purple-50 border-purple-200';
      biasInsight = `文章 A 聚焦于「${primaryArticle.category}」维度，而文章 B 则切入「${secondaryArticle.category}」，展现事件在不同领域的连锁扩散效应。`;
    } else if (sharedEntities.length > 0) {
      divergenceLabel = '同主体聚焦 · 观点分歧';
      divergenceColor = 'text-amber-700 bg-amber-50 border-amber-200';
      biasInsight = `两篇共同关注主体「${sharedEntities.slice(0, 2).join('、')}」，但侧重点和逻辑归因存在明显差异。`;
    }

    return {
      textSimilarity,
      sharedEntities,
      uniqueToA,
      uniqueToB,
      sharedTags,
      sourceA,
      sourceB,
      isSameSource,
      rootCauseA,
      rootCauseB,
      divergenceLabel,
      divergenceColor,
      biasInsight,
    };
  }, [primaryArticle, secondaryArticle]);

  // 在线调用 AI 进行多源立场仲裁与视角偏差深度剖析
  const handleRunAiArbitration = async () => {
    if (!secondaryArticle || isAiArbitrating) return;
    setIsAiArbitrating(true);
    try {
      const res = await fetch('/api/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: [primaryArticle, secondaryArticle],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.candidates && data.candidates.length > 0) {
          const item = data.candidates[0];
          setAiArbitration({
            divergence: item.divergence || '视角互补',
            summary: item.summary || 'AI 完成多源立场仲裁。',
            biasAssessment: `来源 A (${primaryArticle.sourceName}) 与 来源 B (${secondaryArticle.sourceName}) 的立场差异比对。`,
          });
        } else {
          // 启发式降级
          setAiArbitration({
            divergence: comparison?.divergenceLabel || '视角互补',
            summary: comparison?.biasInsight || '两篇文章在上下文语料中呈现出多维度的信息互补。',
            biasAssessment: '模型当前未返回深层冲突，基于确定性算法评估为常规叙事侧重点偏差。',
          });
        }
      } else {
        setAiArbitration({
          divergence: comparison?.divergenceLabel || '视角互补',
          summary: comparison?.biasInsight || '两篇文章互为上下文延伸。',
          biasAssessment: '服务端离线降级：基于本地实体交集与词项二元组相似度生成仲裁。',
        });
      }
    } catch (err) {
      console.warn('AI arbitration failed, using heuristic fallback', err);
      setAiArbitration({
        divergence: comparison?.divergenceLabel || '视角互补',
        summary: comparison?.biasInsight || '两篇文章互为上下文延伸。',
        biasAssessment: '网络异常降级：已通过本地知识拓扑生成比对。',
      });
    } finally {
      setIsAiArbitrating(false);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6 animate-fadeIn font-sans my-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-stone-800 pb-4 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#0284C7] text-white">
              <Columns className="w-4 h-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950 flex items-center gap-2">
              <span>双文并排对比模式 (Side-by-Side Dual Perspective)</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0284C7] border border-blue-200">
                实时对比中
              </span>
            </h2>
          </div>
          <p className="text-xs text-stone-600 font-sans">
            将当前报道与语料库其他报道左右分栏对齐，直观揭示<strong>逻辑异同、根因分歧、信息盲区与立场偏差</strong>。
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* 同步滚动开关 */}
          <button
            onClick={() => setSyncScroll((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer border ${
              syncScroll
                ? 'bg-blue-50 text-[#0284C7] border-blue-300 ring-1 ring-blue-200'
                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
            }`}
            title={syncScroll ? '同步滚动已开启：两栏同频联动滑动' : '同步滚动已关闭：左右栏独立滑动'}
          >
            {syncScroll ? <Link2 className="w-3.5 h-3.5 text-[#0284C7]" /> : <Unlink className="w-3.5 h-3.5 text-stone-400" />}
            <span>{syncScroll ? '同步滚动: 开' : '独立滚动: 关'}</span>
          </button>

          <button
            onClick={() => setSelectorOpen(!selectorOpen)}
            className="px-3 py-1.5 rounded-xl text-xs font-serif font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition-colors shadow-2xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>更换对比文章</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {secondaryArticle && (
            <button
              onClick={handleSwapArticles}
              className="px-3 py-1.5 rounded-xl text-xs font-serif font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition-colors shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              title="交换左右两篇文章的视角"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-stone-600" />
              <span>互换左右</span>
            </button>
          )}

          <button
            onClick={handleRunAiArbitration}
            disabled={isAiArbitrating || !secondaryArticle}
            className="px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold bg-stone-900 hover:bg-[#E3120B] text-white transition-all shadow-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isAiArbitrating ? 'animate-spin' : ''}`} />
            <span>{isAiArbitrating ? '深度仲裁中…' : 'AI 仲裁异同'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors cursor-pointer"
            title="关闭对比模式"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Article Selector Drawer / Dropdown */}
      {selectorOpen && (
        <div className="p-4 bg-white border-2 border-stone-800 rounded-xl space-y-3 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#0284C7]" />
              <span className="text-xs font-serif font-bold text-stone-900">从语料库中挑选右栏对比文章（共 {pool.length} 篇候选）</span>
            </div>
            <button
              onClick={() => setSelectorOpen(false)}
              className="text-stone-400 hover:text-stone-700 text-xs font-mono cursor-pointer"
            >
              ✕ 收起
            </button>
          </div>

          {/* Search & filter bars */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标题、媒体来源或关键词..."
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-sans focus:outline-none focus:border-stone-900"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-serif text-stone-700 focus:outline-none focus:border-stone-900"
            >
              <option value="all">全部分类 ({pool.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({pool.filter((a) => a.category === cat).length})
                </option>
              ))}
            </select>
          </div>

          {/* Candidates Grid */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-stone-100">
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((cand) => {
                const isSelected = secondaryArticle?.id === cand.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => {
                      setSecondaryArticle(cand);
                      setSelectorOpen(false);
                      setAiArbitration(null);
                    }}
                    className={`pt-2 p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-300'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-700">
                          {cand.category}
                        </span>
                        <span className="font-mono text-[10px] text-stone-500">{cand.sourceName || '外部信源'}</span>
                        <span className="font-mono text-[10px] text-stone-400">{formatArticleTime(cand)}</span>
                      </div>
                      <h4 className="font-serif font-bold text-xs text-stone-900 line-clamp-1 group-hover:text-[#0284C7] transition-colors">
                        {cand.title}
                      </h4>
                    </div>

                    <button
                      className={`px-2 py-1 rounded text-[11px] font-serif font-bold shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#0284C7] text-white'
                          : 'bg-stone-100 group-hover:bg-stone-900 group-hover:text-white text-stone-600'
                      }`}
                    >
                      {isSelected ? '当前对比项' : '载入对比 ➔'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">未检索到匹配的语料文章</p>
            )}
          </div>
        </div>
      )}

      {/* 3. Comparative Insight & Bias Synthesis Bar */}
      {comparison && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-[#E3120B]" />
              <h3 className="text-xs sm:text-sm font-serif font-black text-stone-950">
                双文异同与视角偏差总览 (Comparative Divergence Matrix)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-serif font-bold px-2 py-0.5 rounded border ${comparison.divergenceColor}`}>
                {comparison.divergenceLabel}
              </span>
              <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 font-bold">
                文本词项重合度: {comparison.textSimilarity}%
              </span>
            </div>
          </div>

          {/* AI or Heuristic arbitration readout */}
          {aiArbitration ? (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>AI 多源立场与逻辑裁决：【{aiArbitration.divergence}】</span>
                </span>
                <span className="text-[10px] font-mono text-amber-700 font-bold">AI 实时推断</span>
              </div>
              <p className="text-stone-800 leading-relaxed font-serif font-medium">
                {aiArbitration.summary}
              </p>
              <p className="text-[10px] text-stone-500">
                {aiArbitration.biasAssessment}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>视角偏差洞察：</span>
              </div>
              <p className="text-stone-800 font-serif leading-relaxed">
                {comparison.biasInsight}
              </p>
            </div>
          )}

          {/* Quick Metrics Tag Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-stone-200 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-serif">
                共现主体与实体 ({comparison.sharedEntities.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {comparison.sharedEntities.length > 0 ? (
                  comparison.sharedEntities.map((ent, i) => (
                    <span key={i} className="text-[10px] font-mono bg-blue-50 text-[#0284C7] px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                      {ent}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-400">无高频重叠主体</span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-stone-200 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-serif">
                A 篇独有侧重实体 ({comparison.uniqueToA.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {comparison.uniqueToA.slice(0, 4).map((ent, i) => (
                  <span key={i} className="text-[10px] font-mono bg-red-50 text-[#E3120B] px-1.5 py-0.2 rounded border border-red-200">
                    {ent}
                  </span>
                ))}
                {comparison.uniqueToA.length === 0 && <span className="text-[10px] text-stone-400">无独有实体</span>}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-stone-200 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-serif">
                B 篇独有侧重实体 ({comparison.uniqueToB.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {comparison.uniqueToB.slice(0, 4).map((ent, i) => (
                  <span key={i} className="text-[10px] font-mono bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded border border-stone-300">
                    {ent}
                  </span>
                ))}
                {comparison.uniqueToB.length === 0 && <span className="text-[10px] text-stone-400">无独有实体</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Side-by-Side Split View Container (CSS Grid 自适应布局 + 居中垂直分隔线 + 同步滚动控制) */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        {/* 顶部滚动同步提示条 */}
        <div className="bg-stone-100/90 px-4 py-2 border-b border-stone-200 flex items-center justify-between text-[11px] font-mono text-stone-600">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${syncScroll ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
            <span className="font-serif font-bold text-stone-800">
              {syncScroll ? '双栏同频同步滚动已启用' : '左右独立滚动模式'}
            </span>
          </div>
          <span className="hidden sm:inline text-stone-400">
            {syncScroll ? '滑动任一栏目，对侧文章将自动等比同频滑动' : '左右栏独立自由滑动'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch">
          {/* ===================== 左栏：基准文章 (Article A) ===================== */}
          <div 
            ref={leftColRef}
            onScroll={handleLeftScroll}
            className="p-4 sm:p-6 space-y-4 max-h-[70vh] lg:max-h-[75vh] overflow-y-auto"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#E3120B] text-white text-xs font-black flex items-center justify-center font-mono">
                  A
                </span>
                <span className="text-xs font-serif font-black text-stone-900 uppercase tracking-wider">
                  基准分析篇 (Primary Anchor)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-serif font-bold text-[#E3120B] bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[10px]">
                  {primaryArticle.category}
                </span>
                <span className="font-mono text-stone-500 text-[11px] font-bold">
                  {primaryArticle.sourceName || '外部信源'}
                </span>
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-stone-400 flex items-center gap-2">
                <span>{formatArticleTime(primaryArticle)}</span>
                <span>·</span>
                <EvidenceBadge article={primaryArticle} corpus={contextArticles} />
              </div>
              <h3 className="text-base sm:text-lg font-serif font-black text-stone-950 leading-snug">
                {primaryArticle.title}
              </h3>
              {primaryArticle.subtitle && (
                <p className="text-xs font-serif text-stone-600 leading-relaxed">
                  {primaryArticle.subtitle}
                </p>
              )}
            </div>

            {/* Verdict Box (一句话定性) */}
            <div className="p-3.5 bg-[#FAF8F5] border-l-3 border-[#E3120B] rounded-r-xl space-y-1">
              <div className="text-[10px] font-serif font-bold text-[#E3120B] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>A 篇核心定性 (Verdict / So What)：</span>
              </div>
              <p className="text-xs sm:text-sm font-serif font-bold text-stone-900 leading-snug">
                {primaryArticle.oneSentenceVerdict || primaryArticle.summary}
              </p>
            </div>

            {/* Logic Tree Root Cause */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 font-serif">
                <GitBranch className="w-3 h-3 text-[#E3120B]" />
                <span>A 篇底层逻辑与根因假设：</span>
              </div>
              <p className="text-stone-800 font-serif leading-relaxed">
                {primaryArticle.logicTree?.rootCause || '基于新闻正文事实的常规逻辑传导'}
              </p>
            </div>

            {/* 7W 简报要素 */}
            {primaryArticle.sevenElements && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-serif">
                  七要素核心事实 (7W Breakdown)
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                  <div className="p-2 bg-stone-50 rounded border border-stone-200">
                    <b className="text-stone-600 block">Who (核心主体):</b>
                    <span className="text-stone-800 line-clamp-1">{primaryArticle.sevenElements.who}</span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded border border-stone-200">
                    <b className="text-stone-600 block">Why (发生动因):</b>
                    <span className="text-stone-800 line-clamp-1">{primaryArticle.sevenElements.why}</span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded border border-stone-200">
                    <b className="text-stone-600 block">How (实施路径):</b>
                    <span className="text-stone-800 line-clamp-1">{primaryArticle.sevenElements.how}</span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded border border-stone-200">
                    <b className="text-stone-600 block">So What (终局定性):</b>
                    <span className="text-stone-800 line-clamp-1">{primaryArticle.sevenElements.soWhat}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Source Link */}
            {primaryArticle.sourceUrl && (
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-400 text-[11px] font-mono">信源归档</span>
                <a
                  href={primaryArticle.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#0284C7] hover:underline font-mono text-[11px]"
                >
                  <span>阅读 A 篇原文 ↗</span>
                </a>
              </div>
            )}
          </div>

          {/* ===================== 居中垂直分隔线 (Desktop) & 水平分隔线 (Mobile) ===================== */}
          <div className="relative flex lg:flex-col items-center justify-center bg-stone-100/70 border-y lg:border-y-0 lg:border-x border-stone-200 py-3 lg:py-0 lg:px-2 select-none">
            {/* 垂直渐变中线 */}
            <div className="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-stone-200 via-stone-400 to-stone-200" />
            {/* VS 居中徽章 */}
            <div className="relative z-10 flex lg:flex-col items-center gap-1 px-3 py-1 lg:px-2 lg:py-3 bg-stone-900 text-white rounded-full shadow-md text-[10px] font-black font-mono tracking-wider">
              <span className="text-[#E3120B]">A</span>
              <span className="text-stone-400 text-[8px] font-sans">VS</span>
              <span className="text-[#0284C7]">B</span>
            </div>
          </div>

          {/* ===================== 右栏：对比文章 (Article B) ===================== */}
          {secondaryArticle ? (
            <div 
              ref={rightColRef}
              onScroll={handleRightScroll}
              className="p-4 sm:p-6 space-y-4 max-h-[70vh] lg:max-h-[75vh] overflow-y-auto bg-blue-50/15"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-3 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#0284C7] text-white text-xs font-black flex items-center justify-center font-mono">
                    B
                  </span>
                  <span className="text-xs font-serif font-black text-stone-900 uppercase tracking-wider">
                    对比对照篇 (Comparison Pivot)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-serif font-bold text-[#0284C7] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                    {secondaryArticle.category}
                  </span>
                  <span className="font-mono text-stone-500 text-[11px] font-bold">
                    {secondaryArticle.sourceName || '外部信源'}
                  </span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-stone-400 flex items-center gap-2">
                  <span>{formatArticleTime(secondaryArticle)}</span>
                  <span>·</span>
                  <EvidenceBadge article={secondaryArticle} corpus={contextArticles} />
                </div>
                <h3 className="text-base sm:text-lg font-serif font-black text-stone-950 leading-snug">
                  {secondaryArticle.title}
                </h3>
                {secondaryArticle.subtitle && (
                  <p className="text-xs font-serif text-stone-600 leading-relaxed">
                    {secondaryArticle.subtitle}
                  </p>
                )}
              </div>

              {/* Verdict Box (一句话定性) */}
              <div className="p-3.5 bg-blue-50/40 border-l-3 border-[#0284C7] rounded-r-xl space-y-1">
                <div className="text-[10px] font-serif font-bold text-[#0284C7] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>B 篇核心定性 (Verdict / So What)：</span>
                </div>
                <p className="text-xs sm:text-sm font-serif font-bold text-stone-900 leading-snug">
                  {secondaryArticle.oneSentenceVerdict || secondaryArticle.summary}
                </p>
              </div>

              {/* Logic Tree Root Cause */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 font-serif">
                  <GitBranch className="w-3 h-3 text-[#0284C7]" />
                  <span>B 篇底层逻辑与根因假设：</span>
                </div>
                <p className="text-stone-800 font-serif leading-relaxed">
                  {secondaryArticle.logicTree?.rootCause || '基于新闻正文事实的常规逻辑传导'}
                </p>
              </div>

              {/* 7W 简报要素 */}
              {secondaryArticle.sevenElements && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-serif">
                    七要素核心事实 (7W Breakdown)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                    <div className="p-2 bg-stone-50 rounded border border-stone-200">
                      <b className="text-stone-600 block">Who (核心主体):</b>
                      <span className="text-stone-800 line-clamp-1">{secondaryArticle.sevenElements.who}</span>
                    </div>
                    <div className="p-2 bg-stone-50 rounded border border-stone-200">
                      <b className="text-stone-600 block">Why (发生动因):</b>
                      <span className="text-stone-800 line-clamp-1">{secondaryArticle.sevenElements.why}</span>
                    </div>
                    <div className="p-2 bg-stone-50 rounded border border-stone-200">
                      <b className="text-stone-600 block">How (实施路径):</b>
                      <span className="text-stone-800 line-clamp-1">{secondaryArticle.sevenElements.how}</span>
                    </div>
                    <div className="p-2 bg-stone-50 rounded border border-stone-200">
                      <b className="text-stone-600 block">So What (终局定性):</b>
                      <span className="text-stone-800 line-clamp-1">{secondaryArticle.sevenElements.soWhat}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions for Article B */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs gap-2">
                {onSelectPrimaryArticle && (
                  <button
                    onClick={() => onSelectPrimaryArticle(secondaryArticle)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 font-serif font-bold text-xs transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>切换为主阅读篇</span>
                  </button>
                )}

                {secondaryArticle.sourceUrl && (
                  <a
                    href={secondaryArticle.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#0284C7] hover:underline font-mono text-[11px]"
                  >
                    <span>阅读 B 篇原文 ↗</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* Empty Right Column Prompt */
            <div className="bg-white border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[360px]">
              <Columns className="w-8 h-8 text-stone-400" />
              <h4 className="font-serif font-bold text-sm text-stone-700">尚未选择右栏对比文章</h4>
              <p className="text-xs text-stone-500 max-w-xs leading-relaxed font-sans">
                请点击右上角「更换对比文章」按钮，从语料库中挑选任一报道进行双文并排剖析。
              </p>
              <button
                onClick={() => setSelectorOpen(true)}
                className="px-4 py-2 bg-stone-900 hover:bg-[#0284C7] text-white rounded-xl text-xs font-serif font-bold transition-colors cursor-pointer"
              >
                立即选择对比报道 ➔
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
