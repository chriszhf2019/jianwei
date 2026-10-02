import React, { Fragment, useMemo, useState, useRef, useEffect } from 'react';
import { splitKeyTerms, KeyTone, KeySeg } from '../../utils/keyTermTone';
import { JARGON_DICTIONARY } from '../../data/jargonData';
import { Sparkles, BookOpen, Lightbulb, TrendingUp, AlertTriangle, ArrowRight, ExternalLink, HelpCircle } from 'lucide-react';

const TONE_CLASS: Record<KeyTone, string> = {
  pos: 'text-emerald-800 bg-emerald-100/80 px-1 py-0.2 rounded font-semibold border-b border-emerald-300 hover:bg-emerald-200 transition-colors',
  neg: 'text-rose-800 bg-rose-100/80 px-1 py-0.2 rounded font-semibold border-b border-rose-300 hover:bg-rose-200 transition-colors',
  num: 'text-amber-900 font-mono font-bold bg-amber-100/80 px-1 py-0.2 rounded border-b border-amber-300 hover:bg-amber-200 transition-colors',
  key: 'text-sky-900 font-medium bg-sky-100/80 px-1 py-0.2 rounded border-b border-sky-300 hover:bg-sky-200 transition-colors',
  term: 'text-purple-900 font-medium bg-purple-100 px-1 py-0.2 rounded underline decoration-dashed decoration-purple-500 cursor-pointer hover:bg-purple-200 transition-colors',
};

const TONE_META: Record<KeyTone, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  pos: {
    label: '战略利好 / 突破信号',
    icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
    desc: '技术量产突破、商业化扩张超预期、重磅合作或政策利好支持。',
    color: 'border-emerald-400 bg-emerald-50 text-emerald-950',
  },
  neg: {
    label: '风险预警 / 承压信号',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
    desc: '毛利率承压、监管调查、延期交付、竞争加剧或宏观逆风。',
    color: 'border-rose-400 bg-rose-50 text-rose-950',
  },
  num: {
    label: '核心量化 / 关键指标',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-600" />,
    desc: '关键财务数字、资本支出规模、时间节点、出货量或百分比增减。',
    color: 'border-amber-400 bg-amber-50 text-amber-950',
  },
  key: {
    label: '核心主体 / 产业赛道',
    icon: <HelpCircle className="w-3.5 h-3.5 text-sky-600" />,
    desc: '关键企业机构、底层技术平台、基础设施或主要博弈方。',
    color: 'border-sky-400 bg-sky-50 text-sky-950',
  },
  term: {
    label: '专业术语 / 核心概念',
    icon: <BookOpen className="w-3.5 h-3.5 text-purple-600" />,
    desc: '行业前沿专业术语、架构标准或商业模型。已配通俗大白话与生活比喻。',
    color: 'border-purple-400 bg-purple-50 text-purple-950',
  },
};

interface KeyTermHighlightProps {
  text: string;
  entities?: string[];
  onOpenTermExplain?: (term: string) => void;
}

/** 单个关键词及其浮窗交互组件 */
const TermSpan: React.FC<{
  seg: KeySeg;
  onOpenTermExplain?: (term: string) => void;
}> = ({ seg, onOpenTermExplain }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tone = seg.tone || 'key';
  const jargonDef = JARGON_DICTIONARY[seg.text] || JARGON_DICTIONARY[seg.text.toUpperCase()];
  const meta = TONE_META[tone] || TONE_META.key;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 150); // 150ms gentle delay to avoid accidental triggers
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200); // 200ms grace period so user can hover into the tooltip
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onOpenTermExplain) {
      e.stopPropagation();
      onOpenTermExplain(seg.text);
    }
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        onClick={handleClick}
        className={`${TONE_CLASS[tone]} cursor-help select-text`}
      >
        {seg.text}
      </span>

      {/* 鼠标悬停时触发的词汇解释浮窗 (Interactive Hover Tooltip Popover) */}
      {isHovered && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 bg-stone-900/95 text-stone-100 border-2 border-stone-700 rounded-xl p-3.5 shadow-2xl z-[9999] text-left font-sans block cursor-default backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            setIsHovered(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header Tag */}
          <span className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2">
            <span className="flex items-center space-x-1.5 text-xs font-serif font-bold text-white">
              {meta.icon}
              <span>{jargonDef ? jargonDef.term : seg.text}</span>
            </span>
            <span className="text-[10px] font-mono text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
              {jargonDef ? jargonDef.category : meta.label}
            </span>
          </span>

          {/* Jargon Plain Talk or Semantic Meaning */}
          {jargonDef ? (
            <span className="space-y-2 block text-xs">
              <span className="text-stone-200 leading-relaxed block">
                <b className="text-amber-400">大白话：</b>
                {jargonDef.simpleExplain}
              </span>

              {jargonDef.metaphor && (
                <span className="text-stone-300 leading-relaxed block bg-stone-800/80 p-2 rounded-lg border border-stone-700/80 text-[11px]">
                  <b className="text-sky-300">生活比喻：</b>
                  {jargonDef.metaphor}
                </span>
              )}

              {jargonDef.memoryRule && (
                <span className="text-[11px] text-amber-300 block font-serif">
                  💡 <b>记忆口诀：</b>{jargonDef.memoryRule}
                </span>
              )}
            </span>
          ) : (
            <span className="space-y-1.5 block text-xs">
              <span className="text-stone-300 leading-relaxed block text-[11px]">
                {meta.desc}
              </span>
            </span>
          )}

          {/* Bottom Action */}
          {onOpenTermExplain && (
            <span
              onClick={handleClick}
              className="mt-2.5 pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer transition-colors font-serif font-bold block"
            >
              <span>查看《见微·通俗小词典》完整解析</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </span>
          )}

          {/* Arrow Pointer */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-stone-900" />
        </span>
      )}
    </span>
  );
};

/** 长文重点词语义着色：五色速读标注 + 悬停词汇浮窗解释 */
export const KeyTermHighlight: React.FC<KeyTermHighlightProps> = ({
  text,
  entities,
  onOpenTermExplain,
}) => {
  const segs = useMemo(() => splitKeyTerms(text || '', entities), [text, entities]);

  return (
    <>
      {segs.map((s, i) => {
        if (!s.tone) return <Fragment key={i}>{s.text}</Fragment>;
        return (
          <TermSpan
            key={i}
            seg={s}
            onOpenTermExplain={onOpenTermExplain}
          />
        );
      })}
    </>
  );
};

/** 颜色图例（诚实口径：词典自动匹配，悬浮即可查看释义） */
export const KeyTermNote: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={compact ? 'text-[10px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200 flex flex-wrap gap-x-3 gap-y-1' : 'text-xs text-stone-500 bg-stone-50 p-3 rounded-lg border border-stone-200 flex flex-wrap gap-x-4 gap-y-1.5'}>
    <span className="font-serif font-bold text-stone-700">🎨 智能语义标注工具（鼠标悬浮即可弹出词汇解释）：</span>
    <span className="inline-flex items-center gap-1"><b className="text-emerald-700">🟢 绿</b>=利好/突破</span>
    <span className="inline-flex items-center gap-1"><b className="text-rose-700">🔴 红</b>=风险/预警</span>
    <span className="inline-flex items-center gap-1"><b className="text-amber-800 font-mono">🟠 橙</b>=关键数据</span>
    <span className="inline-flex items-center gap-1"><b className="text-sky-800">🔵 蓝</b>=核心主体</span>
    <span className="inline-flex items-center gap-1"><b className="text-purple-800 underline decoration-dashed">🟣 紫</b>=专业术语(悬浮/点击释义)</span>
  </div>
);
