import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { Filter, ArrowRight, X, Sparkles } from 'lucide-react';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { inferDefaultRegionMentions, inferDefaultEntityMentions } from '../../utils/regionSemantics';

interface ThreeLevelDrillProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

const selCls =
  'px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-stone-900 min-w-[140px] cursor-pointer';

const PRESETS = [
  { label: '🌏 东亚 × 半导体', region: '东亚', sector: 'semi', entity: '' },
  { label: '🇺🇸 北美 × 宏观金融', region: '北美', sector: 'macro', entity: '' },
  { label: '⚡ 新能源 × 出海', region: '', sector: 'ev', entity: '' },
  { label: '🤖 北美 × 基础模型', region: '北美', sector: 'ai', entity: '' },
];

export const ThreeLevelDrill: React.FC<ThreeLevelDrillProps> = ({ articles, onOpenArticleById }) => {
  const options = useMemo(() => {
    const regions = new Set<string>();
    const entities = new Set<string>();
    for (const a of articles) {
      const rList = a.regionMentions && a.regionMentions.length > 0 ? a.regionMentions : inferDefaultRegionMentions(a);
      const eList = a.entityMentions && a.entityMentions.length > 0 ? a.entityMentions : inferDefaultEntityMentions(a);
      for (const r of rList) regions.add(r.region);
      for (const e of eList) entities.add(e.name);
    }
    return {
      regions: [...regions].sort(),
      entities: [...entities].sort((x, y) => {
        const cx = articles.filter((a) => {
          const eList = a.entityMentions && a.entityMentions.length > 0 ? a.entityMentions : inferDefaultEntityMentions(a);
          return eList.some((e) => e.name === x);
        }).length;
        const cy = articles.filter((a) => {
          const eList = a.entityMentions && a.entityMentions.length > 0 ? a.entityMentions : inferDefaultEntityMentions(a);
          return eList.some((e) => e.name === y);
        }).length;
        return cy - cx;
      }).slice(0, 60),
    };
  }, [articles]);

  const [region, setRegion] = useState('');
  const [entity, setEntity] = useState('');
  const [sector, setSector] = useState('');

  const matched = useMemo(() => {
    return articles.filter((a) => {
      const rList = a.regionMentions && a.regionMentions.length > 0 ? a.regionMentions : inferDefaultRegionMentions(a);
      const eList = a.entityMentions && a.entityMentions.length > 0 ? a.entityMentions : inferDefaultEntityMentions(a);
      if (region && !rList.some((r) => r.region === region)) return false;
      if (entity && !eList.some((e) => e.name === entity)) return false;
      if (sector && !detectSectors(a).includes(sector)) return false;
      return true;
    });
  }, [articles, region, entity, sector]);

  const clear = () => {
    setRegion('');
    setEntity('');
    setSector('');
  };

  const isFiltered = Boolean(region || entity || sector);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-[#0D9488]" />
          <h3 className="text-base font-serif font-bold text-stone-950">三级下钻：地区 × 主体 × 赛道</h3>
        </div>
        <span className="text-xs font-mono text-stone-500">
          已纳统基准语料：{articles.length} 篇
        </span>
      </div>

      {/* 3 级级联选择器 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select value={region} onChange={(e) => setRegion(e.target.value)} className={selCls}>
          <option value="">地区：全部 ({options.regions.length})</option>
          {options.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className={selCls}>
          <option value="">主体：全部 ({options.entities.length})</option>
          {options.entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className={selCls}>
          <option value="">赛道：全部 ({SECTOR_TAXONOMY.length})</option>
          {SECTOR_TAXONOMY.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {isFiltered && (
          <button
            onClick={clear}
            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center space-x-1 cursor-pointer transition-colors text-xs font-medium"
          >
            <X className="w-3.5 h-3.5" />
            <span>重置筛选</span>
          </button>
        )}

        <span className="font-mono text-xs text-stone-500 ml-auto">
          {isFiltered ? `精准命中 ${matched.length} 条` : `全部展现 ${matched.length} 条`}
        </span>
      </div>

      {/* 快捷聚焦场景 */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
        <span className="text-[11px] font-mono text-stone-400 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-600" />
          <span>推荐场景：</span>
        </span>
        {PRESETS.map((p) => {
          const isActive = region === p.region && sector === p.sector && entity === p.entity;
          return (
            <button
              key={p.label}
              onClick={() => {
                if (isActive) {
                  clear();
                } else {
                  setRegion(p.region);
                  setSector(p.sector);
                  setEntity(p.entity);
                }
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                isActive
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs font-bold'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 列表渲染 */}
      {matched.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono pb-1 border-b border-stone-100">
            <span>匹配语料清单（共 {matched.length} 篇）</span>
            <span>点击查看深度解读与证据链</span>
          </div>
          {matched.map((a) => {
            const rList = a.regionMentions && a.regionMentions.length > 0 ? a.regionMentions : inferDefaultRegionMentions(a);
            const eList = a.entityMentions && a.entityMentions.length > 0 ? a.entityMentions : inferDefaultEntityMentions(a);
            const topRegion = rList[0]?.region || '全球';
            const topEntity = eList[0]?.name;
            const sectors = detectSectors(a);
            return (
              <button
                key={a.id}
                onClick={() => onOpenArticleById && onOpenArticleById(a.id)}
                disabled={!onOpenArticleById}
                className="w-full text-left p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono text-[10px] font-bold">
                      📍 {topRegion}
                    </span>
                    {topEntity && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold">
                        🏢 {topEntity}
                      </span>
                    )}
                    {sectors.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-mono text-[10px]">
                        🏷️ {SECTOR_TAXONOMY.find((s) => s.id === sectors[0])?.name || sectors[0]}
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 font-mono ml-auto sm:ml-0">
                      {a.sourceName || a.sourceDate || ''}
                    </span>
                  </div>
                  <div className="font-serif font-bold text-stone-900 group-hover:text-[#0284C7] transition-colors line-clamp-1">
                    {a.title}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 shrink-0 hidden sm:block transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      ) : isFiltered ? (
        <div className="py-8 text-center text-stone-400 text-xs">
          当前组合无匹配条目，可调整上方条件或点击「重置筛选」。
        </div>
      ) : (
        <div className="py-8 text-center text-stone-400 text-xs">
          当前筛选时间窗下无语料，请在上方筛选条中将时间切换为「全部」。
        </div>
      )}
    </div>
  );
};
