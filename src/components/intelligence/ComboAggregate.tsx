import React, { useMemo } from 'react';
import { NewsArticle } from '../../types';
import { Layers } from 'lucide-react';
import { detectSectors } from '../../utils/sectorTaxonomy';
import { primaryRegionMention } from '../../utils/regionSemantics';

interface ComboAggregateProps {
  articles: NewsArticle[];
}

export const ComboAggregate: React.FC<ComboAggregateProps> = ({ articles }) => {
  const data = useMemo(() => {
    const regionEntity = new Map<string, number>();
    const entitySector = new Map<string, number>();
    for (const a of articles) {
      const topRegion = primaryRegionMention(a.regionMentions);
      const sectors = detectSectors(a);
      for (const e of a.entityMentions || []) {
        if (topRegion) regionEntity.set(`${topRegion.region} × ${e.name}`, (regionEntity.get(`${topRegion.region} × ${e.name}`) || 0) + 1);
        for (const sid of sectors) entitySector.set(`${e.name} × ${sid}`, (entitySector.get(`${e.name} × ${sid}`) || 0) + 1);
      }
    }
    return {
      regionEntity: [...regionEntity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      entitySector: [...entitySector.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }, [articles]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
        <Layers className="w-5 h-5 text-[#D97706]" />
        <h3 className="text-base font-serif font-bold text-stone-950">组合聚合计数（Top 8）</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-serif font-bold text-stone-600 mb-2">地区 × 主体</div>
          <div className="space-y-1">
            {data.regionEntity.length > 0 ? data.regionEntity.map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-[11px] border-b border-stone-100 pb-1">
                <span className="truncate text-stone-700">{k}</span>
                <span className="font-mono text-stone-500 ml-2">{v}</span>
              </div>
            )) : <div className="text-[11px] text-stone-400">暂无标注数据</div>}
          </div>
        </div>
        <div>
          <div className="text-xs font-serif font-bold text-stone-600 mb-2">主体 × 赛道</div>
          <div className="space-y-1">
            {data.entitySector.length > 0 ? data.entitySector.map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-[11px] border-b border-stone-100 pb-1">
                <span className="truncate text-stone-700">{k}</span>
                <span className="font-mono text-stone-500 ml-2">{v}</span>
              </div>
            )) : <div className="text-[11px] text-stone-400">暂无标注数据</div>}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        口径：地区优先取事件发生地，其次实际受影响地，旧数据回退为未标范围候选；主体=AI 抽取；赛道=词典。均基于当前筛选后的语料即时计算。
      </p>
    </div>
  );
};
