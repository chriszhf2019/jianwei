import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NewsArticle } from '../../types';
import { Building2, RefreshCw } from 'lucide-react';

interface EntitySamplePanelProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

interface EntityResult {
  id: string;
  title: string;
  entities: Array<{
    id?: string;
    surface?: string;
    name: string;
    type: string;
    confidence: number;
    evidence?: { field: 'title' | 'summary'; start: number; end: number; exact: true };
  }>;
}

const TYPE_COLOR: Record<string, string> = {
  公司: 'bg-blue-100 text-blue-800',
  机构: 'bg-violet-100 text-violet-800',
  人物: 'bg-amber-100 text-amber-800',
  其他: 'bg-stone-200 text-stone-700',
};

export const EntitySamplePanel: React.FC<EntitySamplePanelProps> = ({
  articles,
  onOpenArticleById,
}) => {
  const sample = useMemo(
    () =>
      articles
        .filter((a) => a.isExternal && a.title)
        .slice(-24)
        .map((a) => ({ id: a.id, title: a.title, summary: a.summary || '' })),
    [articles]
  );

  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ok' | 'offline'; results: EntityResult[]; reason?: string }>(
    { status: 'idle', results: [] }
  );
  const tried = useRef(false);

  const run = async (force = false) => {
    if (!force && tried.current) return;
    tried.current = true;
    setState({ status: 'loading', results: [] });
    try {
      const r = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: sample }),
      });
      const d = await r.json();
      if (d.ok && Array.isArray(d.results)) setState({ status: 'ok', results: d.results });
      else setState({ status: 'offline', results: [], reason: d.reason });
    } catch {
      setState({ status: 'offline', results: [], reason: 'error' });
    }
  };

  useEffect(() => {
    if (sample.length > 0 && !tried.current) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample.length]);

  const aggregate = useMemo(() => {
    const map = new Map<string, { name: string; weight: number; type: string }>();
    for (const res of state.results) {
      for (const e of res.entities) {
        const key = e.id || e.name;
        const cur = map.get(key) || { name: e.name, weight: 0, type: e.type };
        cur.weight += e.confidence;
        map.set(key, cur);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 10);
  }, [state.results]);
  const maxW = Math.max(...aggregate.map(([, v]) => v.weight), 1);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-[#8B5CF6]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              主体/机构 AI 标注（抽样 {sample.length} 条）
            </h3>
            <p className="text-xs text-stone-500">
              在线模型抽取每篇 ≤3 个主要涉事主体；仅本地明确别名表会归并，未知名称不强制合并。
            </p>
          </div>
        </div>
        <button
          onClick={() => void run(true)}
          disabled={state.status === 'loading'}
          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-700 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.status === 'loading' ? 'animate-spin' : ''}`} />
          <span>{state.status === 'loading' ? '标注中…' : '重新标注'}</span>
        </button>
      </div>

      {state.status === 'loading' ? (
        <div className="py-6 text-center text-stone-400 text-xs">正在调用在线模型抽取主体…</div>
      ) : state.status === 'offline' ? (
        <div className="py-5 text-center text-stone-500 text-xs">
          {state.reason === 'no_api_key' ? '未配置 DeepSeek/Gemini Key，主体标注不可用。' : '主体标注服务暂不可用。'}
        </div>
      ) : state.status === 'ok' ? (
        <>
          <div className="space-y-1.5">
            {aggregate.length > 0 ? (
              aggregate.map(([id, v]) => (
                <div key={id} className="flex items-center space-x-2 text-xs">
                  <span className={`w-14 shrink-0 text-center px-1 py-0.5 rounded ${TYPE_COLOR[v.type] || TYPE_COLOR['其他']} font-mono text-[9px]`}>
                    {v.type}
                  </span>
                  <span className="w-36 truncate font-serif font-bold text-stone-800">{v.name}</span>
                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div style={{ width: `${(v.weight / maxW) * 100}%` }} className="bg-[#8B5CF6] h-full" />
                  </div>
                  <span className="w-10 text-right font-mono text-stone-600">{v.weight.toFixed(1)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-stone-400">返回结果为空。</div>
            )}
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {state.results.slice(0, 10).map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenArticleById && onOpenArticleById(r.id)}
                disabled={!onOpenArticleById}
                className="w-full text-left p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg space-y-1"
              >
                <div className="text-[11px] text-stone-700 line-clamp-1">{r.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  {r.entities.map((e, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border bg-white font-mono text-stone-600">
                      {e.name} · {e.type} · {(e.confidence * 100).toFixed(0)}%{e.evidence ? ' · 原文已定位' : ''}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="py-4 text-center text-stone-400 text-xs">语料无外部条目可标注。</div>
      )}

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        口径：在线模型逐条抽取（AI 判断，非事实结论）。全量任务可复用涉事地区任务的“分页+断点+写回语料”模式扩展（见 DATA_PIPELINE_DESIGN.md）。
      </p>
    </div>
  );
};
