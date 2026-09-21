import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Loader2, SearchCheck, Sparkles } from 'lucide-react';
import { NewsArticle } from '../../types';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { articleSortTime } from '../../utils/articleTime';
import { MethodBadge } from '../common/MethodBadge';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface FrequencyAnalysisResult {
  observedPattern: string;
  possibleDrivers: Array<{
    driver: string;
    evidence: string;
    mechanism: string;
    confidence: '高' | '中' | '低';
  }>;
  alternativeExplanation: string;
  watch: string[];
  limits: string;
}

export const FrequentPatternPanel: React.FC<{ articles: NewsArticle[] }> = ({ articles }) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [readout, setReadout] = useState<FrequencyAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const patterns = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    return SECTOR_TAXONOMY.map((sector) => {
      const matched = articles
        .filter((article) => articleSortTime(article) >= cutoff && detectSectors(article).includes(sector.id))
        .sort((a, b) => articleSortTime(b) - articleSortTime(a));
      return {
        id: sector.id,
        name: sector.name,
        articles: matched,
        sourceCount: new Set(matched.map((article) => article.sourceName).filter(Boolean)).size,
      };
    })
      .filter((item) => item.articles.length > 0)
      .sort((a, b) => b.articles.length - a.articles.length)
      .slice(0, 8);
  }, [articles]);

  const selected = patterns.find((item) => item.id === selectedSectorId) || patterns[0] || null;

  const analyze = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    setReadout(null);
    try {
      const response = await fetch('/api/intelligence/frequency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selected.name,
          windowDays: 30,
          articles: selected.articles.slice(0, 16).map((article) => ({
            title: article.title,
            source: article.sourceName,
            publishedAt: article.publishedAt || article.sourceDate || article.date,
            summary: article.summary,
          })),
        }),
      });
      const data = await response.json();
      if (data?.ok && data.data) setReadout(data.data as FrequencyAnalysisResult);
      else setError(data?.reason === 'no_api_key' ? '未配置在线 AI Key。' : '频发归因生成失败。');
    } catch {
      setError('频发归因请求失败。');
    } finally {
      setBusy(false);
    }
  };

  if (patterns.length === 0) return null;

  return (
    <section className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#E3120B]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">近期为什么集中发生</h3>
            <p className="text-[11px] text-stone-500 mt-0.5">先看真实频次，再生成候选原因、反方解释和证伪指标。</p>
          </div>
        </div>
        <MethodBadge methodId="frequency_analysis" compact />
      </div>

      <div className="flex flex-wrap gap-2">
        {patterns.map((pattern) => {
          const active = pattern.id === selected?.id;
          return (
            <button
              key={pattern.id}
              type="button"
              onClick={() => {
                setSelectedSectorId(pattern.id);
                setReadout(null);
                setError('');
              }}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-stone-50 text-stone-700 hover:border-stone-600'
              }`}
            >
              <div className="font-serif font-bold text-xs">{pattern.name}</div>
              <div className={`text-[10px] font-mono mt-0.5 ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                近30天 {pattern.articles.length} 篇 · {pattern.sourceCount} 来源
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
        <div className="text-[11px] text-sky-950">
          当前选择：<b>{selected?.name}</b>。频次是当前订阅语料中的覆盖计数，不代表全网真实发生频率。
        </div>
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={busy || !selected}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] hover:bg-teal-700 disabled:opacity-40 px-3 py-1.5 text-[11px] font-serif font-bold text-white"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {busy ? '正在归因…' : readout ? '重新生成' : '生成频发归因'}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-700">{error}</p>}

      {readout && (
        <div className="space-y-3 text-xs leading-relaxed text-stone-800">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
            <div className="font-serif font-bold text-sky-900 mb-1">观察到的频发模式</div>
            <KeyTermHighlight text={readout.observedPattern || '现有材料未说明'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <div className="font-serif font-bold text-emerald-900">支持证据</div>
              {readout.possibleDrivers.map((item, index) => (
                <div key={`${item.driver}-${index}`} className="rounded-lg border border-emerald-200 bg-white p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif font-bold text-stone-950">{item.driver}</span>
                    <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-500">
                      置信 {item.confidence}
                    </span>
                  </div>
                  <p><b className="text-stone-600">证据：</b><KeyTermHighlight text={item.evidence || '现有材料未说明'} /></p>
                  <p><b className="text-stone-600">机制：</b><KeyTermHighlight text={item.mechanism || '现有材料未说明'} /></p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 font-serif font-bold text-red-900">
                <SearchCheck className="w-4 h-4" /> 反对证据
              </div>
              <p className="rounded-lg border border-red-200 bg-white p-2.5">
                <KeyTermHighlight text={readout.alternativeExplanation || '现有材料未说明'} />
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 font-serif font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4" /> 不确定变量
              </div>
              <p className="rounded-lg border border-amber-200 bg-white p-2.5">
                <KeyTermHighlight text={readout.limits || '现有材料未说明'} />
              </p>
              <div>
                <div className="font-serif font-bold text-amber-900 mb-1">接下来观察</div>
                <ul className="space-y-1">
                  {readout.watch.map((item) => (
                    <li key={item} className="flex gap-1.5"><span className="text-amber-600">•</span><KeyTermHighlight text={item} /></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
