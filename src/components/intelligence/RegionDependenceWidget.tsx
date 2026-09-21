import React, { useEffect, useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { MapPin, AlertTriangle, ExternalLink } from 'lucide-react';

interface RegionDependenceWidgetProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

interface CorpusRegionItem {
  id: string;
  title: string;
  sourceName?: string;
}

export const RegionDependenceWidget: React.FC<RegionDependenceWidgetProps> = ({
  articles,
  onOpenArticleById,
}) => {
  // 1) 依赖预警：基于全量 regionMentions 加权份额
  const analysis = useMemo(() => {
    const weight = new Map<string, number>();
    const sourceOf = new Map<string, Set<string>>();
    for (const a of articles) {
      const rms = a.regionMentions || [];
      const bestByRegion = new Map<string, number>();
      for (const r of rms) {
        bestByRegion.set(r.region, Math.max(bestByRegion.get(r.region) || 0, r.confidence));
      }
      for (const [region, confidence] of bestByRegion) {
        weight.set(region, (weight.get(region) || 0) + confidence);
        const set = sourceOf.get(region) || new Set<string>();
        if (a.sourceName) set.add(a.sourceName);
        sourceOf.set(region, set);
      }
    }
    const total = [...weight.values()].reduce((s, v) => s + v, 0);
    const sorted = [...weight.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0] ? { region: sorted[0][0], weight: sorted[0][1], share: total > 0 ? sorted[0][1] / total : 0, sources: sourceOf.get(sorted[0][0])?.size || 0 } : null;
    const options = sorted.slice(0, 8).map(([region, w]) => ({ region, weight: Math.round(w * 10) / 10 }));
    return { total: Math.round(total * 10) / 10, top, options };
  }, [articles]);

  // 2) 按地区浏览语料
  const [selectedRegion, setSelectedRegion] = useState('');
  const [list, setList] = useState<CorpusRegionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRegion) {
      setList([]);
      return;
    }
    let alive = true;
    setLoading(true);
    fetch(`/api/corpus?region=${encodeURIComponent(selectedRegion)}&limit=12`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (alive) {
          setList((d.corpus || []).map((x: any) => ({ id: x.id, title: x.title, sourceName: x.sourceName })));
        }
      })
      .catch(() => alive && setList([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedRegion]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
        <MapPin className="w-5 h-5 text-[#0284C7]" />
        <h3 className="text-base font-serif font-bold text-stone-950">
          涉事地区聚焦 · 依赖预警与语料浏览
        </h3>
      </div>

      {/* 单点依赖预警 */}
      {analysis.top && analysis.top.share >= 0.5 ? (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center space-x-1.5 text-amber-900 font-serif font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>单点依赖预警</span>
          </div>
          <p className="text-amber-900 leading-relaxed">
            当前语料的涉事地区高度集中于「{analysis.top.region}」（模型自评分加权份额{' '}
            {Math.round(analysis.top.share * 100)}%），且来自 {analysis.top.sources} 个来源
            {analysis.top.sources <= 2 ? '（来源单点）' : ''}。建议补充其他地区的信源/视角，避免主题单边化。
          </p>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
          涉事地区分布相对分散（最高份额{' '}
          {analysis.top ? Math.round(analysis.top.share * 100) + '%' : '—'}），暂无显著单点依赖。
        </div>
      )}

      {/* 按地区浏览 */}
      <div className="space-y-2">
        <label className="block text-xs font-serif font-bold text-stone-700">按涉事地区浏览语料（最近 12 条）</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedRegion('')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-serif font-bold border transition-colors ${
              selectedRegion === '' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-300'
            }`}
          >
            全部
          </button>
          {analysis.options.map((o) => (
            <button
              key={o.region}
              onClick={() => setSelectedRegion(o.region)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-serif font-bold border transition-colors ${
                selectedRegion === o.region ? 'bg-[#0284C7] text-white border-[#0284C7]' : 'bg-white text-stone-600 border-stone-300'
              }`}
            >
              {o.region} · {o.weight}
            </button>
          ))}
        </div>

        {selectedRegion && (
          <div className="space-y-1.5 pt-1">
            {loading ? (
              <div className="py-4 text-center text-stone-400 text-xs">加载中…</div>
            ) : list.length > 0 ? (
              list.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onOpenArticleById && onOpenArticleById(item.id)}
                  disabled={!onOpenArticleById}
                  className="w-full text-left p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-800 flex items-center justify-between gap-2"
                >
                  <span className="line-clamp-1">{item.title}</span>
                  <ExternalLink className="w-3 h-3 text-stone-400 shrink-0" />
                </button>
              ))
            ) : (
              <div className="py-4 text-center text-stone-400 text-xs">该地区暂无匹配条目。</div>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        口径：份额=AI 标注自评分加权（非校准概率）；来源单点=该地区条目仅来自 ≤2 个站点（预警为提示性，非决策结论）。
      </p>
    </div>
  );
};
