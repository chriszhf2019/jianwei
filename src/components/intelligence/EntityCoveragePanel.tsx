import React, { useMemo } from 'react';
import type { NewsArticle } from '../../types';
import { Network, Info } from 'lucide-react';
import { buildEntityGraph, entityCoMentions } from '../../utils/entityGraph';
import { MethodBadge } from '../common/MethodBadge';

interface EntityCoveragePanelProps {
  articles: NewsArticle[];
}

export const EntityCoveragePanel: React.FC<EntityCoveragePanelProps> = ({ articles }) => {
  const data = useMemo(() => {
    const graph = buildEntityGraph(articles);
    return {
      graph: graph.slice(0, 12),
      total: graph.length,
      annotatedArticles: articles.filter((item) => Array.isArray(item.entityMentions) && item.entityMentions.length > 0).length,
      pairs: entityCoMentions(articles),
    };
  }, [articles]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-[#0284C7]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">真实实体覆盖与共现</h3>
            <p className="text-xs text-stone-500">
              仅统计已经写入语料的 `entityMentions`；没有标注时保持空态。
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-stone-500">
          {data.annotatedArticles}/{articles.length} 篇已标注 · {data.total} 个实体
        </span>
        <MethodBadge methodId="entity_cooccurrence" />
      </div>

      {data.graph.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          当前没有实体标注数据，不会生成模拟关系图。
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.graph.map((entity) => (
              <div key={entity.id} className="p-3 rounded-lg border border-stone-200 bg-stone-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif font-bold text-sm text-stone-900">{entity.name}</span>
                  <span className="font-mono text-xs text-[#0284C7]">{entity.count} 次</span>
                </div>
                <div className="mt-1 text-[10px] text-stone-500">
                  {entity.type} · 覆盖 {entity.articleIds.length} 篇
                  {` · 原文定位 ${entity.locatedMentions}/${entity.count}`}
                  {entity.maxModelScore > 0 ? ` · 模型自评分峰值 ${Math.round(entity.maxModelScore * 100)}%` : ''}
                </div>
                {entity.aliases.length > 0 && (
                  <div className="mt-1 text-[10px] text-stone-400 truncate">
                    已归并：{entity.aliases.join('、')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.pairs.length > 0 && (
            <div className="pt-3 border-t border-stone-200">
              <div className="text-xs font-serif font-bold text-stone-700 mb-2">同篇共现实体</div>
              <div className="flex flex-wrap gap-2">
                {data.pairs.map((pair) => (
                  <span key={`${pair.a}-${pair.b}`} className="text-[11px] px-2 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-900 font-mono">
                    {pair.a} ↔ {pair.b} · {pair.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-2 text-[10px] text-stone-400 border-t border-stone-100 pt-3">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>实体和别名来自模型标注与本地别名字典。共现只表示出现在同一篇文章，不表示因果、投资或合作关系。</span>
      </div>
    </div>
  );
};
