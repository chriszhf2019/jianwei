import React, { Fragment, useMemo } from 'react';
import { splitKeyTerms } from '../../utils/keyTermTone';

const TONE_CLASS: Record<string, string> = {
  pos: 'text-emerald-700 font-semibold',
  neg: 'text-red-600 font-semibold',
  num: 'text-amber-700 font-semibold',
  key: 'text-sky-700 font-semibold',
};

const TONE_TIP: Record<string, string> = {
  pos: '信号词 · 利好/进展（词典匹配）',
  neg: '信号词 · 风险/负面（词典匹配）',
  num: '数字 / 时间',
  key: '主体 / 技术 / 市场术语',
};

/** 长文重点词着色：四色速读标注（本地词典 + 可选 AI 实体词；非 AI 判断） */
export const KeyTermHighlight: React.FC<{ text: string; entities?: string[] }> = ({ text, entities }) => {
  const segs = useMemo(() => splitKeyTerms(text || '', entities), [text, entities]);
  return (
    <>
      {segs.map((s, i) =>
        s.tone ? (
          <span key={i} className={TONE_CLASS[s.tone]} title={TONE_TIP[s.tone]}>
            {s.text}
          </span>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        )
      )}
    </>
  );
};

/** 颜色图例（诚实口径：词典自动匹配，非 AI 判断） */
export const KeyTermNote: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <p className={compact ? 'text-[9px] text-stone-400' : 'text-[10px] text-stone-400'}>
    🎨 颜色仅作速读引导：<b className="text-emerald-700">绿</b>=利好/进展 ·
    <b className="text-red-600">红</b>=风险/负面 · <b className="text-amber-700">金</b>=数字/时间 ·
    <b className="text-sky-700">蓝</b>=主体/技术/市场术语 —— 词典自动匹配，非 AI 判断、非事实结论。
  </p>
);
