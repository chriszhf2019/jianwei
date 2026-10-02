import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { Layers, ArrowRight, ChevronRight, X, Building2, Globe2 } from 'lucide-react';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { primaryRegionMention, inferDefaultRegionMentions, inferDefaultEntityMentions } from '../../utils/regionSemantics';

interface ComboAggregateProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

interface ComboItem {
  key: string;
  partA: string;
  partB: string;
  count: number;
  articleIds: string[];
}

export const ComboAggregate: React.FC<ComboAggregateProps> = ({ articles, onOpenArticleById }) => {
  const [selectedCombo, setSelectedCombo] = useState<ComboItem | null>(null);

  const sectorNameMap = useMemo(() => {
    return new Map(SECTOR_TAXONOMY.map((s) => [s.id, s.name]));
  }, []);

  const data = useMemo(() => {
    const regionEntityMap = new Map<string, { partA: string; partB: string; count: number; articleIds: Set<string> }>();
    const entitySectorMap = new Map<string, { partA: string; partB: string; count: number; articleIds: Set<string> }>();

    for (const a of articles) {
      const rList = a.regionMentions && a.regionMentions.length > 0 ? a.regionMentions : inferDefaultRegionMentions(a);
      const eList = a.entityMentions && a.entityMentions.length > 0 ? a.entityMentions : inferDefaultEntityMentions(a);
      const topRegion = primaryRegionMention(rList) || rList[0];
      const sectors = detectSectors(a);

      for (const e of eList) {
        if (topRegion) {
          const comboKey = `${topRegion.region} × ${e.name}`;
          const existing = regionEntityMap.get(comboKey) || {
            partA: topRegion.region,
            partB: e.name,
            count: 0,
            articleIds: new Set<string>(),
          };
          existing.count += 1;
          existing.articleIds.add(a.id);
          regionEntityMap.set(comboKey, existing);
        }

        for (const sid of sectors) {
          const sName = sectorNameMap.get(sid) || sid;
          const comboKey = `${e.name} × ${sName}`;
          const existing = entitySectorMap.get(comboKey) || {
            partA: e.name,
            partB: sName,
            count: 0,
            articleIds: new Set<string>(),
          };
          existing.count += 1;
          existing.articleIds.add(a.id);
          entitySectorMap.set(comboKey, existing);
        }
      }
    }

    const sortFn = (
      a: { partA: string; partB: string; count: number; articleIds: Set<string> },
      b: { partA: string; partB: string; count: number; articleIds: Set<string> }
    ) => b.count - a.count;

    return {
      regionEntity: [...regionEntityMap.entries()]
        .map(([key, val]) => ({
          key,
          partA: val.partA,
          partB: val.partB,
          count: val.count,
          articleIds: [...val.articleIds],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      entitySector: [...entitySectorMap.entries()]
        .map(([key, val]) => ({
          key,
          partA: val.partA,
          partB: val.partB,
          count: val.count,
          articleIds: [...val.articleIds],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  }, [articles, sectorNameMap]);

  const maxCount = Math.max(
    1,
    ...data.regionEntity.map((d) => d.count),
    ...data.entitySector.map((d) => d.count)
  );

  const matchedArticles = useMemo(() => {
    if (!selectedCombo) return [];
    return articles.filter((a) => selectedCombo.articleIds.includes(a.id));
  }, [articles, selectedCombo]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#D97706]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">组合聚合透视（Top 8 共现对）</h3>
            <p className="text-xs text-stone-500">
              观察涉事地区与企业主体、主体与赛道之间的强关联共现对，点击任意项可直接查看关联文章。
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-stone-500">
          已纳统语料：{articles.length} 篇
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 地区 × 主体 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-1.5">
            <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-sky-600" />
              <span>地区 × 主体</span>
            </span>
            <span className="font-mono text-stone-400">频次权重</span>
          </div>

          <div className="space-y-1.5">
            {data.regionEntity.length > 0 ? (
              data.regionEntity.map((item) => {
                const isSelected = selectedCombo?.key === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setSelectedCombo(isSelected ? null : item)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 shadow-2xs ring-1 ring-amber-400'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="font-serif font-bold text-stone-900 text-xs truncate">
                        {item.partA}
                      </span>
                      <span className="text-stone-400 text-[10px] font-mono">×</span>
                      <span className="font-serif font-medium text-stone-800 text-xs truncate">
                        {item.partB}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-700 w-5 text-right">
                        {item.count}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isSelected ? 'rotate-90 text-amber-600' : ''}`} />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-stone-400 py-3 text-center">暂无地区与主体共现数据</div>
            )}
          </div>
        </div>

        {/* 主体 × 赛道 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-1.5">
            <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>主体 × 赛道</span>
            </span>
            <span className="font-mono text-stone-400">频次权重</span>
          </div>

          <div className="space-y-1.5">
            {data.entitySector.length > 0 ? (
              data.entitySector.map((item) => {
                const isSelected = selectedCombo?.key === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setSelectedCombo(isSelected ? null : item)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 shadow-2xs ring-1 ring-purple-400'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="font-serif font-bold text-stone-900 text-xs truncate">
                        {item.partA}
                      </span>
                      <span className="text-stone-400 text-[10px] font-mono">×</span>
                      <span className="font-serif font-medium text-stone-800 text-xs truncate">
                        {item.partB}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-purple-700 w-5 text-right">
                        {item.count}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isSelected ? 'rotate-90 text-purple-600' : ''}`} />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-stone-400 py-3 text-center">暂无主体与赛道共现数据</div>
            )}
          </div>
        </div>
      </div>

      {/* 展开的关联文章 */}
      {selectedCombo && (
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-300 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-serif font-bold text-stone-900">
                已选中组合：【{selectedCombo.key}】
              </span>
              <span className="text-[11px] font-mono bg-stone-200 text-stone-700 px-2 py-0.5 rounded font-bold">
                共 {matchedArticles.length} 篇报道
              </span>
            </div>
            <button
              onClick={() => setSelectedCombo(null)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {matchedArticles.map((a) => (
              <button
                key={a.id}
                onClick={() => onOpenArticleById && onOpenArticleById(a.id)}
                disabled={!onOpenArticleById}
                className="w-full text-left p-2.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-xs flex items-center justify-between gap-2 group cursor-pointer transition-colors"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="font-serif font-bold text-stone-900 group-hover:text-[#0284C7] truncate">
                    {a.title}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    {a.sourceName || ''} · {a.sourceDate || a.date || ''}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-800 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        口径：基于事件发生地与实际受影响地，结合实体抽取与赛道分类体系即时计算共现频次。支持点击共现条目穿透查看原始报道。
      </p>
    </div>
  );
};
