import React, { useState } from 'react';
import { NewsArticle } from '../../types';
import { Smile, Lightbulb, HelpCircle, ArrowRight, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { formatArticleTime } from '../../utils/articleTime';
import type { NewsSkill } from './HomeView';
import { KeyTermHighlight, KeyTermNote } from '../common/KeyTermHighlight';

interface TongsuModeFeedProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  onOpenTermExplain: (term: string) => void;
  /** 技能：plain = AI 用大白话讲一遍 */
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
}

export const TongsuModeFeed: React.FC<TongsuModeFeedProps> = ({
  articles,
  onSelectArticle,
  onOpenTermExplain,
  onRunSkill,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const runPlain = async (article: NewsArticle) => {
    if (!onRunSkill || busyId) return;
    setBusyId(article.id);
    try {
      await onRunSkill('plain', article);
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div className="space-y-6 font-sans">
      {/* Banner introduction */}
      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Smile className="w-6 h-6 text-amber-700 shrink-0" />
          <div>
            <h3 className="text-sm font-serif font-bold text-amber-950">
              通俗小白模式已开启 · 零认知门槛
            </h3>
            <p className="text-xs text-amber-800">
              去除所有黑话与晦涩公式，采用生活日常比喻与直白逻辑，任何人都能 1 分钟看懂。
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block text-xs font-medium px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900">
          点击下划线术语随时弹窗释义
        </span>
      </div>

      <KeyTermNote compact />

      {articles.map((article, idx) => {
        const isDeepParsed = Array.isArray(article.spectrumLayers) && article.spectrumLayers.length > 0;
        const ts = article.tongsuSummary || { simpleSay: '', whyExplanation: '', whatItMeans: '', jargonTerms: [] };
        const { simpleSay, whyExplanation, whatItMeans, jargonTerms } = ts;
        // 已具备“大白话讲一遍” = 有真实生成的 simpleSay（无论光谱是否全量）
        const hasPlain = !!simpleSay && simpleSay !== (article.summary || '');
        const plainSay = hasPlain ? simpleSay : (article.summary || article.oneSentenceVerdict || article.title || '');
        const why = hasPlain && whyExplanation ? whyExplanation : null;
        const means = hasPlain && whatItMeans ? whatItMeans : null;
        const isBusy = busyId === article.id;

        return (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-sm hover:border-amber-500 transition-all space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full font-serif">
                  {article.category}
                </span>
                <span className="text-xs text-stone-400">{formatArticleTime(article)}</span>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                {hasPlain ? '30秒速通 · 大白话版 ✓' : isBusy ? 'AI 讲解生成中…' : '待生成大白话'}
              </span>
            </div>

            {/* Title */}
            <h2
              onClick={() => onSelectArticle(article)}
              className="text-xl sm:text-2xl font-serif font-black text-stone-950 hover:text-amber-700 cursor-pointer transition-colors"
            >
              {article.title}
            </h2>

            {/* 1. 简单说 (Plain Talk) —— 大白话把新闻讲一遍 */}
            <div className="bg-[#FAF8F5] border border-stone-300 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm font-serif mb-1.5">
                <BookOpen className="w-4 h-4 text-[#E3120B]" />
                <span>{hasPlain ? '1. 用大白话说发生了什么' : '1. 发生了什么（原标题摘要）'}</span>
              </div>
              <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-sans font-medium">
                <KeyTermHighlight text={plainSay} entities={(article.entityMentions || []).map((e) => e.name)} />
              </p>
              {!hasPlain && (
                <button
                  onClick={() => runPlain(article)}
                  disabled={isBusy || !onRunSkill}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-bold px-2.5 py-1 rounded-lg border border-amber-600/50 transition-all"
                >
                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isBusy ? 'AI 正在用大白话讲解…' : '✨ AI 用大白话讲一遍'}
                </button>
              )}
            </div>

            {/* 2. 为什么？（生活化生动比喻）——未生成时省略该块，避免空卡 */}
            {why ? (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm font-serif mb-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>2. 为什么会这样？（生活日常比喻）</span>
                </div>
                <p className="text-sm sm:text-base text-stone-800 leading-relaxed">
                  {why}
                </p>
              </div>
            ) : null}

            {/* 3. 这意味着什么？——未生成时省略 */}
            {means ? (
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-blue-950 font-bold text-sm font-serif mb-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>3. 这对我意味着什么？</span>
                </div>
                <p className="text-sm sm:text-base text-stone-800 leading-relaxed">
                  {means}
                </p>
              </div>
            ) : null}

            {/* 涉及术语可点击解释 */}
            {jargonTerms && jargonTerms.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-serif font-bold text-stone-500">
                  点击搞懂文中黑话：
                </span>
                {jargonTerms.map((term) => (
                  <button
                    key={term}
                    onClick={() => onOpenTermExplain(term)}
                    className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-full border border-stone-300 hover:border-stone-900 transition-colors flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-[#E3120B]" />
                    <span>{term} 💡</span>
                  </button>
                ))}
              </div>
            )}

            {/* Read deep analysis button */}
            <div className="pt-2 flex justify-end border-t border-stone-200">
              <button
                onClick={() => onSelectArticle(article)}
                className="px-4 py-2 bg-stone-900 hover:bg-amber-600 text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1.5 transition-all"
              >
                <span>进入深度 7 要素与逻辑溯源</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
