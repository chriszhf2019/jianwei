import React, { useState, useEffect } from 'react';
import { NewsArticle } from '../../types';
import { Zap, ChevronDown, ChevronUp, ArrowRight, Layers, CheckCircle2, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { NewsSkill } from './HomeView';

interface DehydratedModeFeedProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  /** 技能：dehydrate = AI 生成 30 秒脱水要点 */
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
}

export const DehydratedModeFeed: React.FC<DehydratedModeFeedProps> = ({
  articles,
  onSelectArticle,
  onRunSkill,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(articles[0]?.id || null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 当筛选结果变化（articles 引用/顺序改变）时，重置展开项，避免指向已被过滤掉的卡片
  useEffect(() => {
    setExpandedId((prev) => {
      const stillVisible = articles.some((a) => a.id === prev);
      if (stillVisible) return prev;
      return articles[0]?.id || null;
    });
  }, [articles]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const runDehydrate = async (article: NewsArticle) => {
    if (!onRunSkill || busyId) return;
    setBusyId(article.id);
    try {
      await onRunSkill('dehydrate', article);
      // 展开当前卡片展示生成结果
      setExpandedId(article.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#E3120B] flex items-center justify-center text-white font-bold text-sm">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold tracking-wide">
              脱水模式 · 30秒极速扫描全部核心信号
            </h3>
            <p className="text-xs text-stone-400">
              按实体与赛道高密度压缩 · 剔除冗余叙述 · 直击核心变化与终极影响
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block text-xs px-2.5 py-1 bg-stone-800 text-stone-300 rounded border border-stone-700 font-mono">
          共 {articles.length} 个核心事件
        </span>
      </div>

      {/* Accordion / Compact Bullet Cards */}
      <div className="space-y-3">
        {articles.map((article) => {
          const isExpanded = expandedId === article.id;
          const { coreEntity, keyAction, relatedCount, coreShifts, impactHighlights } =
            article.dehydratedItems || { coreEntity: '', keyAction: '', relatedCount: 0, coreShifts: [], impactHighlights: [] };
          const hasDehydrated = coreShifts.length > 0 || impactHighlights.length > 0;
          const isBusy = busyId === article.id;
          const fallbackEntity = coreEntity || article.sourceName || (article.category ? article.category : '情报');
          const fallbackAction = keyAction || article.title || '';

          return (
            <div
              key={article.id}
              className={`bg-white border-2 transition-all rounded-xl overflow-hidden ${
                isExpanded ? 'border-stone-900 shadow-md' : 'border-stone-300 hover:border-stone-500'
              }`}
            >
              {/* Collapsed Header Bar */}
              <div
                onClick={() => toggleExpand(article.id)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                  <span className="w-2 h-2 rounded-full bg-[#E3120B] shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 min-w-0">
                    <span className="text-sm font-serif font-bold text-stone-950 truncate">
                      {fallbackEntity}
                    </span>
                    <span className="hidden sm:inline text-stone-300">➔</span>
                    <span className="text-sm text-stone-800 font-medium truncate">
                      {fallbackAction}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-xs font-mono px-2 py-0.5 bg-stone-100 text-stone-600 rounded border border-stone-200">
                    相关 {relatedCount} 条
                  </span>
                  <div className="p-1 rounded-full text-stone-400 hover:text-stone-900">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Detail Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-stone-200 bg-[#FAF8F5] p-5 sm:p-6 space-y-4"
                  >
                    {/* Full headline reference */}
                    <div className="text-sm font-serif font-bold text-stone-900 border-b border-stone-200 pb-2">
                      原报告：{article.title}
                    </div>

                    {/* 未生成脱水要点：提供技能按钮直接生成 */}
                    {!hasDehydrated && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <span>这条新闻还没有脱水干货版。</span>
                        </span>
                        <button
                          onClick={() => runDehydrate(article)}
                          disabled={isBusy || !onRunSkill}
                          className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-bold px-2.5 py-1 rounded-lg border border-amber-600/50 transition-all"
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          {isBusy ? 'AI 正在压缩要点…' : '⚡ AI 生成 30 秒脱水要点'}
                        </button>
                      </div>
                    )}

                    {/* 核心变化 3 条 */}
                    {hasDehydrated && (
                      <div className="space-y-2">
                        <div className="text-xs font-serif font-bold text-stone-500 uppercase tracking-wider flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#E3120B]" />
                          <span>核心事实与指标变化（3点）</span>
                        </div>
                        <ul className="space-y-1.5 pl-2">
                          {coreShifts.map((shift, i) => (
                            <li key={i} className="text-xs sm:text-sm text-stone-800 flex items-start space-x-2">
                              <span className="text-[#E3120B] font-bold font-mono">•</span>
                              <span>{shift}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 关键影响 2 条 */}
                    {hasDehydrated && (
                      <div className="space-y-2">
                        <div className="text-xs font-serif font-bold text-stone-500 uppercase tracking-wider flex items-center space-x-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#0284C7]" />
                          <span>结构性影响与行动指引（2点）</span>
                        </div>
                        <ul className="space-y-1.5 pl-2">
                          {impactHighlights.map((imp, i) => (
                            <li key={i} className="text-xs sm:text-sm text-stone-900 font-medium flex items-start space-x-2">
                              <span className="text-[#0284C7] font-bold font-mono">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Jump to full detail */}
                    <div className="pt-3 border-t border-stone-200 flex justify-end">
                      <button
                        onClick={() => onSelectArticle(article)}
                        className="px-4 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
                      >
                        <span>展开全套认知溯源与因果树</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
