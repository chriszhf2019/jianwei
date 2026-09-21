import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { Filter, ArrowRight, X } from 'lucide-react';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';

interface ThreeLevelDrillProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

const selCls =
  'px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-stone-900 max-w-[180px]';

export const ThreeLevelDrill: React.FC<ThreeLevelDrillProps> = ({ articles, onOpenArticleById }) => {
  const options = useMemo(() => {
    const regions = new Set<string>();
    const entities = new Set<string>();
    for (const a of articles) {
      for (const r of a.regionMentions || []) regions.add(r.region);
      for (const e of a.entityMentions || []) entities.add(e.name);
    }
    return {
      regions: [...regions].sort(),
      entities: [...entities].sort((x, y) => {
        const cx = articles.filter((a) => (a.entityMentions || []).some((e) => e.name === x)).length;
        const cy = articles.filter((a) => (a.entityMentions || []).some((e) => e.name === y)).length;
        return cy - cx;
      }).slice(0, 60),
    };
  }, [articles]);

  const [region, setRegion] = useState('');
  const [entity, setEntity] = useState('');
  const [sector, setSector] = useState('');

  const matched = useMemo(() => {
    return articles.filter((a) => {
      if (region) {
        const sorted = (a.regionMentions || []).slice().sort((x, y) => y.confidence - x.confidence);
        if (sorted[0]?.region !== region) return false;
      }
      if (entity && !(a.entityMentions || []).some((e) => e.name === entity)) return false;
      if (sector && !detectSectors(a).includes(sector)) return false;
      return true;
    });
  }, [articles, region, entity, sector]);

  const clear = () => {
    setRegion('');
    setEntity('');
    setSector('');
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
        <Filter className="w-5 h-5 text-[#0D9488]" />
        <h3 className="text-base font-serif font-bold text-stone-950">三级下钻：地区 × 主体 × 赛道</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select value={region} onChange={(e) => setRegion(e.target.value)} className={selCls}>
          <option value="">地区：全部</option>
          {options.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className={selCls}>
          <option value="">主体：全部</option>
          {options.entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className={selCls}>
          <option value="">赛道：全部</option>
          {SECTOR_TAXONOMY.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {(region || entity || sector) && (
          <>
            <button onClick={clear} className="px-2 py-1 rounded text-stone-400 hover:text-stone-900 flex items-center space-x-1">
              <X className="w-3.5 h-3.5" />
              <span>清除</span>
            </button>
            <span className="font-mono text-stone-500 ml-auto">
              命中 {matched.length} 条
            </span>
          </>
        )}
      </div>

      {matched.length > 0 ? (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {matched.slice(-15).reverse().map((a) => (
            <button
              key={a.id}
              onClick={() => onOpenArticleById && onOpenArticleById(a.id)}
              disabled={!onOpenArticleById}
              className="w-full text-left p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-800 flex items-center justify-between gap-2"
            >
              <span className="line-clamp-1">
                {a.title}
                <span className="text-stone-400 font-mono ml-2">({a.sourceName || '?'})</span>
              </span>
              <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
            </button>
          ))}
        </div>
      ) : region || entity || sector ? (
        <div className="py-4 text-center text-stone-400 text-xs">当前组合无匹配条目（先选“地区”验证标注后再叠加）。</div>
      ) : (
        <div className="py-4 text-center text-stone-400 text-xs">
          依次选择 地区（AI 主地区）→ 主体（AI 抽取）→ 赛道（词典），即可把语料过滤到精确组合。
        </div>
      )}
    </div>
  );
};
