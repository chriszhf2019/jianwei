import React, { Fragment, useMemo } from 'react';
import { splitKeyTerms, KeyTone } from '../../utils/keyTermTone';
import { JARGON_DICTIONARY } from '../../data/jargonData';

const TONE_CLASS: Record<KeyTone, string> = {
  pos: 'text-emerald-700 bg-emerald-50/80 px-1 py-0.2 rounded font-semibold border-b border-emerald-200',
  neg: 'text-rose-700 bg-rose-50/80 px-1 py-0.2 rounded font-semibold border-b border-rose-200',
  num: 'text-amber-800 font-mono font-bold px-0.5',
  key: 'text-sky-800 font-medium bg-sky-50/70 px-1 py-0.2 rounded',
  term: 'text-purple-800 font-medium bg-purple-50 px-1 py-0.2 rounded underline decoration-dotted decoration-purple-400 cursor-pointer hover:bg-purple-100 transition-colors',
};

const TONE_TIP: Record<KeyTone, string> = {
  pos: '🟢 利好/进展/突破',
  neg: '🔴 风险/负面/预警',
  num: '🟠 关键量化数据/时间',
  key: '🔵 核心主体/机构/企业',
  term: '🟣 专业术语/核心概念（点击查看白话释义）',
};

interface KeyTermHighlightProps {
  text: string;
  entities?: string[];
  onOpenTermExplain?: (term: string) => void;
}

/** 长文重点词语义着色：五色速读标注（本地词典 + AI 实体词 + 专业术语库） */
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

        const isJargon = Boolean(JARGON_DICTIONARY[s.text] || s.tone === 'term');
        const handleTermClick = (e: React.MouseEvent) => {
          if (onOpenTermExplain && (isJargon || s.tone === 'term' || s.tone === 'key')) {
            e.stopPropagation();
            onOpenTermExplain(s.text);
          }
        };

        return (
          <span
            key={i}
            className={`${TONE_CLASS[s.tone]} ${isJargon || s.tone === 'term' ? 'cursor-pointer hover:underline' : ''}`}
            title={isJargon ? `🟣 术语「${s.text}」：点击查看通俗大白话与生活比喻` : TONE_TIP[s.tone]}
            onClick={isJargon || s.tone === 'term' ? handleTermClick : undefined}
          >
            {s.text}
          </span>
        );
      })}
    </>
  );
};

/** 颜色图例（诚实口径：词典自动匹配，非 AI 判断） */
export const KeyTermNote: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={compact ? 'text-[10px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200 flex flex-wrap gap-x-3 gap-y-1' : 'text-xs text-stone-500 bg-stone-50 p-3 rounded-lg border border-stone-200 flex flex-wrap gap-x-4 gap-y-1.5'}>
    <span className="font-serif font-bold text-stone-700">🎨 速读语义色彩：</span>
    <span className="inline-flex items-center gap-1"><b className="text-emerald-700">🟢 绿</b>=利好/突破</span>
    <span className="inline-flex items-center gap-1"><b className="text-rose-700">🔴 红</b>=风险/预警</span>
    <span className="inline-flex items-center gap-1"><b className="text-amber-800 font-mono">🟠 橙</b>=关键数据</span>
    <span className="inline-flex items-center gap-1"><b className="text-sky-800">🔵 蓝</b>=核心主体</span>
    <span className="inline-flex items-center gap-1"><b className="text-purple-800 underline decoration-dotted">🟣 紫</b>=专业术语(可点击释义)</span>
  </div>
);

