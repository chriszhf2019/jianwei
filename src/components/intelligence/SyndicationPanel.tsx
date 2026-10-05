import React, { useEffect, useMemo, useState } from 'react';
import type { NewsArticle } from '../../types';
import { Copy, Info } from 'lucide-react';
import {
  buildSyndicationGraph,
  type SyndicationGraph,
  type TextBasis,
} from '../../utils/syndication';
import { MethodBadge } from '../common/MethodBadge';

interface SyndicationPanelProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

const SIGNAL_LABEL = {
  duplicate_url: '同一 URL',
  known_same_group: '已知同集团',
  same_headline: '高度同题',
  likely_text_reuse: '疑似文本复用',
} as const;

const BASIS_LABEL: Record<TextBasis, string> = {
  page_text: '正文开头',
  excerpt: '标题与摘要',
};

export const SyndicationPanel: React.FC<SyndicationPanelProps> = ({ articles, onOpenArticleById }) => {
  const [remote, setRemote] = useState<SyndicationGraph | null>(null);
  const [remoteState, setRemoteState] = useState<'loading' | 'ok' | 'fallback'>('loading');
  const occurrenceCount = useMemo(
    () => articles.reduce((sum, article) => sum + Math.max(0, (article.sourceOccurrences?.length || 1) - 1), 0),
    [articles]
  );
  const graph = useMemo(
    () => (remoteState === 'ok' && remote ? remote : remoteState === 'fallback' ? buildSyndicationGraph(articles) : null),
    [articles, remote, remoteState],
  );

  useEffect(() => {
    let alive = true;
    setRemoteState('loading');
    fetch('/api/syndication/graph')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: SyndicationGraph | null) => {
        if (!alive) return;
        if (data && Array.isArray(data.edges) && Array.isArray(data.nodes) && Array.isArray(data.chains)) {
          setRemote(data);
          setRemoteState('ok');
          return;
        }
        setRemote(null);
        setRemoteState('fallback');
      })
      .catch(() => {
        if (!alive) return;
        setRemote(null);
        setRemoteState('fallback');
      });
    return () => {
      alive = false;
    };
  }, [articles]);

  const nodes = useMemo(() => new Map((graph?.nodes || []).map((node) => [node.id, node])), [graph]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">转载与文本复用线索</h3>
            <p className="text-xs text-stone-500">
              相同 URL 和已登记来源集团可以确认。标题、摘要或已保存正文的重合只作为疑似线索。
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-stone-500">
          同题来源记录 {occurrenceCount} 条 · 候选 {graph?.edges.length ?? 0} 组 · 传播链 {graph?.chains.length ?? 0} 条
        </span>
        <MethodBadge methodId="syndication_detection" />
        <MethodBadge methodId="source_grouping" />
      </div>

      {graph?.meta?.note && (
        <p className="text-[11px] text-stone-500">{graph.meta.note}</p>
      )}
      {remoteState === 'fallback' && (
        <p className="text-[11px] text-amber-800">服务端传播图不可用，当前只按标题和摘要在浏览器计算。</p>
      )}

      {remoteState === 'loading' || !graph ? (
        <div className="py-8 text-center text-xs text-stone-400">正在读取传播图。</div>
      ) : graph.edges.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          当前没有发现同 URL、已知同集团或高相似文本线索，也没有可串起来的传播链。
        </div>
      ) : (
        <div className="space-y-4">
          {graph.chains.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-serif font-bold text-stone-950">传播链</h4>
              {graph.chains.slice(0, 5).map((chain) => (
                <div key={chain.nodes.join(':')} className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
                  <div className="text-[10px] font-mono text-stone-500">
                    {chain.sourceCount} 个来源 · 记录跨度 {chain.spanHours} 小时 · 按到达时间从早到晚
                  </div>
                  <div className="space-y-1">
                    {chain.nodes.map((id, index) => {
                      const node = nodes.get(id);
                      if (!node) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onOpenArticleById?.(id)}
                          disabled={!onOpenArticleById}
                          className="w-full text-left p-2 rounded border border-stone-200 bg-white hover:border-purple-300 disabled:cursor-default"
                        >
                          <div className="text-[10px] text-stone-500 font-mono">
                            {index + 1}. {node.sourceName}
                          </div>
                          <div className="text-xs font-serif font-bold text-stone-900 line-clamp-2">{node.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {graph.edges.map((edge) => {
              const from = nodes.get(edge.from);
              const to = nodes.get(edge.to);
              if (!from || !to) return null;
              return (
                <div key={`${edge.from}:${edge.to}:${edge.signal}`} className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      edge.confirmed
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                        : 'text-amber-800 bg-amber-50 border-amber-300'
                    }`}>
                      {SIGNAL_LABEL[edge.signal]} · {edge.confirmed ? '已确认关系' : '疑似'} · {BASIS_LABEL[edge.textBasis]}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      标题 {edge.titleSimilarity}% · 文本 {edge.textSimilarity}% · 时间差 {edge.timeDeltaHours}h
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[from, to].map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => onOpenArticleById?.(article.id)}
                        disabled={!onOpenArticleById}
                        className="text-left p-2 rounded border border-stone-200 bg-white hover:border-purple-300 disabled:cursor-default"
                      >
                        <div className="text-[10px] text-stone-500 font-mono truncate">{article.sourceName}</div>
                        <div className="text-xs font-serif font-bold text-stone-900 line-clamp-2">{article.title}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-500">{edge.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-stone-400 border-t border-stone-100 pt-3">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>同一集团不等于同一篇稿件。文本相似不等于转载授权。传播链按记录时间排列，早到的一条不是首发证明。</span>
      </div>
    </div>
  );
};
