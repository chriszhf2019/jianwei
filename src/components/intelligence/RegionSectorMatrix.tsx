import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { Grid3x3 } from 'lucide-react';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { primaryRegionMention } from '../../utils/regionSemantics';

interface RegionSectorMatrixProps {
  articles: NewsArticle[];
  onCell?: (region: string, sectorId: string) => void;
}

/** 地区 × 赛道 交叉矩阵（条目计数；基于 AI 涉事地区 × 赛道词典） */
export const RegionSectorMatrix: React.FC<RegionSectorMatrixProps> = ({ articles, onCell }) => {
  const data = useMemo(() => {
    // 每篇优先使用事件发生地，其次受影响地；旧数据回退为未标范围的最高分候选。
    const regionCount = new Map<string, number>();
    const cross = new Map<string, Map<string, number>>();
    for (const a of articles) {
      const top = primaryRegionMention(a.regionMentions);
      if (!top) continue;
      regionCount.set(top.region, (regionCount.get(top.region) || 0) + 1);
      for (const id of detectSectors(a)) {
        const row = cross.get(top.region) || new Map<string, number>();
        row.set(id, (row.get(id) || 0) + 1);
        cross.set(top.region, row);
      }
    }
    const regions = [...regionCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r]) => r);
    const sectors = [...new Set([...cross.values()].flatMap((m) => [...m.keys()]))]
      .sort((a, b) => {
        const sumA = [...cross.values()].reduce((s, m) => s + (m.get(a) || 0), 0);
        const sumB = [...cross.values()].reduce((s, m) => s + (m.get(b) || 0), 0);
        return sumB - sumA;
      })
      .slice(0, 6);
    const max = Math.max(
      ...[...cross.values()].flatMap((m) => sectors.map((s) => m.get(s) || 0)),
      1
    );
    return { regions, sectors, cross, max };
  }, [articles]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-3">
      <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
        <Grid3x3 className="w-5 h-5 text-[#8B5CF6]" />
        <h3 className="text-base font-serif font-bold text-stone-950">地区 × 赛道 交叉矩阵（条目计数）</h3>
      </div>

      {data.regions.length === 0 ? (
        <div className="py-6 text-center text-stone-400 text-xs">
          暂无 AI 涉事地区标注数据（先运行“全量后台标注”）。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-center border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left font-serif font-bold text-stone-600 px-2 py-1">地区 \ 赛道</th>
                {data.sectors.map((sid) => (
                  <th key={sid} className="font-serif font-bold text-stone-500 px-1 py-1 whitespace-nowrap">
                    {SECTOR_TAXONOMY.find((x) => x.id === sid)?.name || sid}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.regions.map((region) => (
                <tr key={region}>
                  <td className="text-left font-serif font-bold text-stone-800 px-2 py-1 whitespace-nowrap">
                    {region}
                  </td>
                  {data.sectors.map((sid) => {
                    const v = data.cross.get(region)?.get(sid) || 0;
                    const alpha = v === 0 ? 0 : Math.min(0.92, 0.18 + (v / data.max) * 0.72);
                    return (
                      <td key={sid}>
                        <button
                          disabled={!onCell || v === 0}
                          onClick={() => onCell && onCell(region, sid)}
                          className={`w-full min-w-[44px] h-8 rounded-lg flex items-center justify-center font-mono transition-transform ${
                            onCell && v > 0 ? 'hover:scale-105 cursor-pointer' : ''
                          }`}
                          style={{ backgroundColor: v === 0 ? '#f5f5f4' : `rgba(139,92,246,${alpha})`, color: v / data.max > 0.5 ? '#fff' : '#44403c' }}
                          title={v > 0 ? `下钻：${region} × ${SECTOR_TAXONOMY.find((x) => x.id === sid)?.name || sid}（${v} 条）` : '无'}
                        >
                          {v}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        口径：地区=AI 标注中每篇模型自评分最高者；赛道=词典命中（可配置）；颜色深浅=相对最大交叉值。点击有数值的格子可在下方下钻文章流。
      </p>
    </div>
  );
};
