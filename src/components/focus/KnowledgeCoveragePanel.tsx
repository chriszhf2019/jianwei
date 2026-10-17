import React, { useMemo } from 'react';
import type { NewsArticle, PredictionContract, KnowledgeItem } from '../../types';
import { Compass } from 'lucide-react';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';

interface KnowledgeCoveragePanelProps {
  bookmarkedArticles?: NewsArticle[];
  predictionContracts?: PredictionContract[];
  knowledgeItems?: KnowledgeItem[];
}

/** 认知覆盖：把「收藏（读过）/ 判断 / 沉淀」三类认知投入聚到赛道词表上，高亮盲区。 */
export const KnowledgeCoveragePanel: React.FC<KnowledgeCoveragePanelProps> = ({
  bookmarkedArticles = [],
  predictionContracts = [],
  knowledgeItems = [],
}) => {
  const rows = useMemo(() => {
    const count = (items: Array<{ title?: string; summary?: string; tags?: string[] }>) => {
      const map = new Map<string, number>();
      for (const item of items) {
        for (const id of detectSectors(item)) map.set(id, (map.get(id) || 0) + 1);
      }
      return map;
    };
    const read = count(bookmarkedArticles);
    const predicted = count(predictionContracts.map((c) => ({ title: c.articleTitle })));
    const saved = count(
      knowledgeItems.map((k) => ({ title: k.title, summary: k.oneSentenceVerdict, tags: k.tags })),
    );
    return SECTOR_TAXONOMY.map((sector) => {
      const r = read.get(sector.id) || 0;
      const p = predicted.get(sector.id) || 0;
      const s = saved.get(sector.id) || 0;
      return { id: sector.id, name: sector.name, read: r, predicted: p, saved: s, total: r + p + s };
    });
  }, [bookmarkedArticles, predictionContracts, knowledgeItems]);

  const covered = rows.filter((r) => r.total > 0).length;
  const blanks = rows.filter((r) => r.total === 0);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <Compass className="w-5 h-5 text-[#E3120B]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">认知覆盖</h3>
            <p className="text-xs text-stone-500">你的认知投入在 {SECTOR_TAXONOMY.length} 个赛道上的分布</p>
          </div>
        </div>
        <span className="text-xs font-mono text-stone-500">
          覆盖 {covered}/{SECTOR_TAXONOMY.length} 赛道
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`p-3 rounded-lg border ${
              r.total > 0 ? 'bg-stone-50 border-stone-200' : 'bg-white border-dashed border-stone-300'
            }`}
          >
            <div className={`text-xs font-serif font-bold ${r.total > 0 ? 'text-stone-900' : 'text-stone-400'}`}>
              {r.name}
            </div>
            {r.total > 0 ? (
              <div className="mt-1 text-[10px] font-mono text-stone-500">
                收 {r.read} · 判 {r.predicted} · 沉 {r.saved}
              </div>
            ) : (
              <div className="mt-1 text-[10px] font-mono text-stone-400">未覆盖 · 盲区</div>
            )}
          </div>
        ))}
      </div>

      {blanks.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
          你有 {blanks.length} 个赛道还没有任何认知投入（{blanks.map((b) => b.name).join('、')}）。盲区是邀请，不是评判——可以先去读一篇、下一个判断，或沉淀一条知识。
        </div>
      )}

      <p className="text-[10px] text-stone-400 leading-relaxed">
        口径：「覆盖」= 你收藏过 / 判断过 / 沉淀过该赛道的文章，代表投入过认知，不等于你已掌握。判断来自预测契约的关联文章标题，沉淀来自知识库条目。
      </p>
    </div>
  );
};
