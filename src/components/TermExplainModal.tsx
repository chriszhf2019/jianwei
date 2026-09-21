import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Sparkles, ArrowRightLeft, Lightbulb, Bookmark } from 'lucide-react';
import { JARGON_DICTIONARY } from '../data/jargonData';
import { TerminologyDefinition } from '../types';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface TermExplainModalProps {
  term: string | null;
  onClose: () => void;
}

export const TermExplainModal: React.FC<TermExplainModalProps> = ({ term, onClose }) => {
  useEscapeClose(term !== null, onClose);

  // 组件常驻挂载（由 App 统一渲染），仅在 term 非空时显示内容，
  // 这样 AnimatePresence 才能真正播放退场动画。
  const data: TerminologyDefinition | null = term
    ? JARGON_DICTIONARY[term] || {
        term,
        category: '前沿专业术语',
        simpleExplain: `这是《见微》为您提炼的关于「${term}」的专业名词解析。`,
        metaphor: '就像在复杂的机械系统中，每个特定的精密齿轮都有其特定的物理受力与传动逻辑。',
        memoryRule: '抓住核心变量，透视微观信号。',
        exampleContext: `在当前新闻语境下，「${term}」是判断产业与政策走向的关键切入点。`
      }
    : null;

  return (
    <AnimatePresence>
      {data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg bg-[#FAF8F5] text-stone-900 border-2 border-stone-800 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#E3120B] text-white text-xs font-bold font-serif">
                  微
                </span>
                <div>
                  <h3 className="text-base font-serif font-bold tracking-wide">见微 · 术语通俗小词典</h3>
                  <p className="text-[11px] text-stone-400 font-sans">{data.category}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto font-sans">
              {/* Term Title */}
              <div className="flex items-baseline justify-between border-b border-stone-300 pb-3">
                <h2 className="text-2xl font-serif font-black text-stone-950 tracking-tight">
                  {data.term}
                </h2>
                <span className="text-xs px-2.5 py-1 rounded bg-stone-200 text-stone-700 font-medium">
                  通俗白话精解
                </span>
              </div>

              {/* 简单说 */}
              <div className="bg-white p-4 rounded-lg border border-stone-300 shadow-xs">
                <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm mb-1.5 font-serif">
                  <BookOpen className="w-4 h-4 text-[#E3120B]" />
                  <span>简单说（大白话）</span>
                </div>
                <p className="text-sm text-stone-800 leading-relaxed">
                  {data.simpleExplain}
                </p>
              </div>

              {/* 生活化比喻 */}
              <div className="bg-amber-50/80 p-4 rounded-lg border border-amber-200 shadow-xs">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm mb-1.5 font-serif">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>生活化生动比喻</span>
                </div>
                <p className="text-sm text-amber-950 leading-relaxed">
                  {data.metaphor}
                </p>
              </div>

              {/* 反义词 / 易混对比 (如果有) */}
              {data.oppositeTerm && (
                <div className="bg-blue-50/70 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 text-blue-950 font-bold text-sm mb-1.5 font-serif">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    <span>对比理解：{data.term} vs {data.oppositeTerm}</span>
                  </div>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {data.oppositeExplain}
                  </p>
                </div>
              )}

              {/* 一句话记忆口诀 */}
              <div className="bg-emerald-50/80 p-4 rounded-lg border border-emerald-200 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-0.5">
                    一句话秒记口诀
                  </div>
                  <p className="text-sm font-semibold text-emerald-950 font-serif">
                    “{data.memoryRule}”
                  </p>
                </div>
              </div>

              {/* 新闻上下文 */}
              <div className="text-xs text-stone-600 border-t border-stone-200 pt-3">
                <span className="font-bold text-stone-800">在本文语境：</span> {data.exampleContext}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-300 flex items-center justify-between text-xs text-stone-500">
              <span>见微认知库 · 点击任意术语随时答疑</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-stone-900 text-stone-100 hover:bg-stone-800 rounded font-medium transition-colors"
              >
                我知道了
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
