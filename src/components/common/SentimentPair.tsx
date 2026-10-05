import React, { useState } from 'react';
import { lexiconSentiment, sentimentLabelText, type SentimentLabel } from '../../utils/corpusMetrics';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'no_key' | 'invalid' | 'error' | 'empty';

interface ClassificationView {
  label: SentimentLabel;
  evidence: string | null;
  evidenceStatus: 'quoted' | 'discarded' | 'absent';
  calibrationStatus: 'uncalibrated';
  provider?: string;
  model?: string;
}

interface SentimentPairProps {
  title?: string;
  summary?: string;
  compact?: boolean;
}

export const SentimentPair: React.FC<SentimentPairProps> = ({ title, summary, compact = false }) => {
  const sourceKey = `${title || ''}\n${summary || ''}`;
  const lexicon = lexiconSentiment({ title, summary });
  const [session, setSession] = useState<{ key: string; status: ModelStatus; result: ClassificationView | null } | null>(null);
  const active = session && session.key === sourceKey
    ? session
    : { key: sourceKey, status: 'idle' as const, result: null };
  const hits = [...lexicon.positiveHits, ...lexicon.negativeHits];

  const requestModel = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (active.status === 'loading') return;
    if (!sourceKey.trim()) {
      setSession({ key: sourceKey, status: 'empty', result: null });
      return;
    }
    setSession({ key: sourceKey, status: 'loading', result: null });
    try {
      const response = await fetch('/api/sentiment/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || '', summary: summary || '' }),
      });
      const data = await response.json().catch(() => null);
      if (data?.reason === 'no_api_key') {
        setSession({ key: sourceKey, status: 'no_key', result: null });
        return;
      }
      if (data?.reason === 'invalid_model_output') {
        setSession({ key: sourceKey, status: 'invalid', result: null });
        return;
      }
      const classification = data?.classification;
      const labelOk = ['positive', 'negative', 'mixed', 'neutral'].includes(classification?.label);
      if (!response.ok || !data?.ok || !labelOk || classification.calibrationStatus !== 'uncalibrated') {
        setSession({ key: sourceKey, status: 'error', result: null });
        return;
      }
      setSession({ key: sourceKey, status: 'ready', result: classification });
    } catch {
      setSession({ key: sourceKey, status: 'error', result: null });
    }
  };

  const modelText = active.status === 'loading'
    ? '请求中'
    : active.status === 'no_key'
      ? '未配置，不生成分类'
      : active.status === 'empty'
        ? '没有可分类文本'
        : active.status === 'invalid'
          ? '没有给出四分类'
          : active.status === 'error'
            ? '这次没有生成'
            : active.status === 'ready' && active.result
              ? `${sentimentLabelText(active.result.label)} · 未校准`
              : '未生成';

  const evidenceNote = active.result?.evidenceStatus === 'quoted' && active.result.evidence
    ? `「${active.result.evidence}」`
    : active.result?.evidenceStatus === 'discarded'
      ? '依据不在原文中，已丢弃'
      : active.result?.evidenceStatus === 'absent'
        ? '未摘出原文依据'
        : '';

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1 ${compact ? '' : 'w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1'}`}
      onClick={(event) => event.stopPropagation()}
    >
      <span
        className="font-mono text-[11px] text-stone-700"
        title={hits.length
          ? `词典倾向：命中 ${hits.join('、')}。正负都命中记为交织。不是模型，也不是情绪真值。`
          : '词典倾向：标题和摘要没有命中正负词，记为中性。不是模型。'}
      >
        词典 {sentimentLabelText(lexicon.label)}
      </span>
      <span
        className="font-mono text-[11px] text-stone-500"
        title="模型情感只在点击后请求。没有密钥不生成，不输出概率，结果未校准，也不写入人工评测。"
      >
        模型 {modelText}
        {evidenceNote ? ` · ${evidenceNote}` : ''}
      </span>
      {(active.status === 'idle' || active.status === 'error' || active.status === 'invalid') && (
        <button
          type="button"
          onClick={requestModel}
          className="px-1.5 py-0.5 rounded border border-stone-300 bg-white text-[10px] font-serif text-stone-700 hover:bg-stone-100 cursor-pointer"
        >
          {active.status === 'idle' ? '请求分类' : '再试一次'}
        </button>
      )}
    </span>
  );
};
