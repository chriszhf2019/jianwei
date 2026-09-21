import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NewsArticle } from '../../types';
import { MapPin, RefreshCw, Sparkles } from 'lucide-react';
import { normalizeRegionScope, REGION_SCOPE_LABELS, regionScopeOf } from '../../utils/regionSemantics';

interface MentionRegionAIPanelProps {
  articles: NewsArticle[];
}

interface RegionResult {
  id: string;
  title: string;
  source: 'ai';
  regions: Array<{ region: string; confidence: number; scope?: string }>;
}

const PALETTE = ['#E3120B', '#0284C7', '#8B5CF6', '#0D9488', '#D97706', '#65A30D', '#64748B'];

export const MentionRegionAIPanel: React.FC<MentionRegionAIPanelProps> = ({ articles }) => {
  const sample = useMemo(() => {
    return articles
      .filter((a) => a.isExternal && a.title)
      .slice(-24)
      .map((a) => ({ id: a.id, title: a.title, summary: a.summary || '' }));
  }, [articles]);

  const cachedItems = useMemo(() => articles.filter((a) => a.regionMentions && a.regionMentions.length > 0), [articles]);
  const [fullStatus, setFullStatus] = useState<{ running: boolean; processed: number; total: number; finishedAt?: string | null } | null>(null);

  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'offline';
    results: RegionResult[];
    reason?: string;
  }>({ status: 'idle', results: [] });
  const tried = useRef(false);

  const startFull = async () => {
    try {
      const r = await fetch('/api/regions/annotate', { method: 'POST' });
      const d = await r.json();
      if (d.ok) {
        setFullStatus({ running: true, processed: d.task?.processed ?? 0, total: d.task?.total ?? 0, finishedAt: null });
      } else if (d.reason === 'no_api_key') {
        setState({ status: 'offline', results: [], reason: 'no_api_key' });
      }
    } catch {
      setState({ status: 'offline', results: [], reason: 'error' });
    }
  };

  // 全量任务运行中轮询状态
  useEffect(() => {
    if (!fullStatus?.running) return;
    const timer = setInterval(async () => {
      try {
        const r = await fetch('/api/regions/status').then((x) => x.json());
        const t = r.task;
        if (t) {
          setFullStatus({ running: t.running, processed: t.processed, total: t.total, finishedAt: t.finishedAt });
          if (!t.running) {
            clearInterval(timer);
            setFeedbackDone('全量标注已完成（' + (t.processed - t.failed) + ' 条成功）。刷新页面后此面板将展示语料缓存结果。');
          }
        }
      } catch {
        /* ignore polling errors */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [fullStatus?.running]);
  const [doneNote, setDoneNote] = useState('');
  const setFeedbackDone = (msg: string) => setDoneNote(msg);

  const run = async (force = false) => {
    if (!force && tried.current) return;
    tried.current = true;
    setState({ status: 'loading', results: [] });
    try {
      const r = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: sample }),
      });
      const d = await r.json();
      if (d.ok && Array.isArray(d.results)) {
        setState({ status: 'ok', results: d.results });
      } else if (d.reason === 'no_api_key') {
        setState({ status: 'offline', results: [], reason: 'no_api_key' });
      } else {
        setState({ status: 'offline', results: [], reason: 'error' });
      }
    } catch {
      setState({ status: 'offline', results: [], reason: 'error' });
    }
  };

  useEffect(() => {
    if (sample.length > 0 && !tried.current) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample.length]);

  const cachedAgg = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of cachedItems) {
      for (const r of a.regionMentions || []) {
        const key = `${r.region}\u0000${regionScopeOf(r)}`;
        map.set(key, (map.get(key) || 0) + r.confidence);
      }
    }
    return [...map.entries()].sort((a2, b2) => b2[1] - a2[1]).slice(0, 6);
  }, [cachedItems]);

  const aggregate = useMemo(() => {
    const map = new Map<string, number>();
    for (const res of state.results) {
      for (const rg of res.regions) {
        const key = `${rg.region}\u0000${normalizeRegionScope(rg.scope)}`;
        map.set(key, (map.get(key) || 0) + rg.confidence);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [state.results]);
  const aggMax = Math.max(...aggregate.map(([, v]) => v), 1);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-[#0284C7]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              内容涉事地区 · AI 标注（抽样 {sample.length} 条）
            </h3>
            <p className="text-xs text-stone-500">
              服务端调用在线模型判断每条报道的“主要涉事地区”（≤3 个，含模型自评分）；面板标注为 AI 判断，非事实结论。
            </p>
          </div>
        </div>
        <button
          onClick={() => void run(true)}
          disabled={state.status === 'loading'}
          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-700 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.status === 'loading' ? 'animate-spin' : ''}`} />
          <span>{state.status === 'loading' ? '标注中…' : '标注抽样'}</span>
        </button>
        <button
          onClick={() => void startFull()}
          disabled={fullStatus?.running === true}
          className="px-3 py-1.5 bg-[#0284C7] hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fullStatus?.running ? 'animate-spin' : ''}`} />
          <span>{fullStatus?.running ? '全量标注中…' : '全量后台标注'}</span>
        </button>
      </div>

      {(fullStatus?.running || doneNote || cachedItems.length > 0) && (
        <div className="space-y-2">
          {fullStatus?.running && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs">
              <div className="flex justify-between font-serif font-bold text-stone-700">
                <span>全量后台标注进行中…</span>
                <span className="font-mono">
                  {fullStatus.processed}/{fullStatus.total}
                </span>
              </div>
              <div className="mt-1.5 w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="bg-[#0284C7] h-full transition-all"
                  style={{ width: `${fullStatus.total ? (fullStatus.processed / fullStatus.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1">完成后刷新页面，本面板将展示语料全量缓存结果。</p>
            </div>
          )}
          {doneNote && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-[11px] text-emerald-900">
              {doneNote}
            </div>
          )}
          {cachedItems.length > 0 && !fullStatus?.running && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
              <div className="text-xs font-serif font-bold text-stone-700">
                语料缓存标注（{cachedItems.length} 条 · 全量结果）
              </div>
              {cachedAgg.length > 0 ? (
                cachedAgg.map(([key, val], i) => {
                  const [region, scope] = key.split('\u0000');
                  return (
                  <div key={key} className="flex items-center space-x-2 text-xs">
                    <span className="w-32 font-serif font-bold text-stone-800">
                      {region} · {REGION_SCOPE_LABELS[normalizeRegionScope(scope)]}
                    </span>
                    <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div style={{ width: `${(val / Math.max(...cachedAgg.map(([, v]) => v), 1)) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }} className="h-full" />
                    </div>
                    <span className="w-10 text-right font-mono text-stone-600">{val.toFixed(1)}</span>
                  </div>
                  );
                })
              ) : (
                <div className="text-[11px] text-stone-400">暂无标注结果。</div>
              )}
            </div>
          )}
        </div>
      )}

      {state.status === 'loading' ? (
        <div className="py-6 text-center text-stone-400 text-xs">正在调用在线模型逐条判定涉事地区…</div>
      ) : state.status === 'offline' ? (
        <div className="py-5 text-center text-stone-500 text-xs space-y-2">
          <p>
            {state.reason === 'no_api_key'
              ? '未配置 DeepSeek/Gemini Key：AI 标注不可用。'
              : 'AI 标注服务暂不可用。'}
          </p>
          <p className="text-stone-400">
            当前热力图“行：涉事地区”仍可用词典启发式（mentionRegion.ts）做即时聚合（可能误判）。
          </p>
        </div>
      ) : state.status === 'ok' ? (
        <>
          <div className="space-y-2">
            <div className="text-xs font-serif font-bold text-stone-700">地区模型自评分合计（Top）：</div>
            {aggregate.length > 0 ? (
              aggregate.map(([key, val], i) => {
                const [region, scope] = key.split('\u0000');
                return (
                <div key={key} className="flex items-center space-x-2 text-xs">
                  <span className="w-32 font-serif font-bold text-stone-800">
                    {region} · {REGION_SCOPE_LABELS[normalizeRegionScope(scope)]}
                  </span>
                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(val / aggMax) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                      className="h-full"
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-stone-600">{val.toFixed(1)}</span>
                </div>
                );
              })
            ) : (
              <div className="text-xs text-stone-400">返回结果为空。</div>
            )}
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {state.results.slice(0, 10).map((r) => (
              <div key={r.id} className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
                <div className="text-[11px] text-stone-700 line-clamp-1">{r.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  {r.regions.length > 0 ? (
                    r.regions.map((rg) => (
                      <span
                        key={`${rg.region}-${rg.scope || 'unspecified'}`}
                        className="text-[10px] px-1.5 py-0.5 rounded-full border font-mono bg-white text-stone-700"
                      >
                        {rg.region} · {REGION_SCOPE_LABELS[normalizeRegionScope(rg.scope)]} · {(rg.confidence * 100).toFixed(0)}%
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-stone-400 font-mono">未判定</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-4 text-center text-stone-400 text-xs">语料无外部条目可标注。</div>
      )}

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2 flex items-center space-x-1">
        <Sparkles className="w-3 h-3" />
        <span>口径：地区标签由在线模型逐条生成（可复核引句需展开原文）；与热力“涉事地区”词典行互补，模型自评分未经历史校准，仅供趋势参考。</span>
      </p>
    </div>
  );
};
