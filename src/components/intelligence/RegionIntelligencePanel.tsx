import React, { useMemo } from 'react';
import { NewsArticle } from '../../types';
import { Radar } from 'lucide-react';
import { parseLocalHour } from '../../utils/publishedAt';
import { regionScopeOf, REGION_SCOPE_LABELS } from '../../utils/regionSemantics';

interface RegionIntelligencePanelProps {
  articles: NewsArticle[];
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function dayIdx(ts: number): number {
  const d = new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000));
}
function dayKeyOf(ts: number): number {
  const d = new Date(ts);
  return Math.floor(d.getTime() / (24 * 3600 * 1000));
}

export const RegionIntelligencePanel: React.FC<RegionIntelligencePanelProps> = ({ articles }) => {
  const rows = useMemo(() => {
    // 汇总：地区 → 条目/来源/平均置信/近7天到达
    const map = new Map<
      string,
      { items: Set<string>; sources: Set<string>; scopes: Set<string>; confSum: number; days: number[] }
    >();
    const baseDays = Array.from({ length: 7 }, (_, i) => Date.now() - i * 24 * 3600 * 1000);
    const daySet = new Set(baseDays.map(dayKeyOf));

    for (const a of articles) {
      const rms = a.regionMentions || [];
      if (rms.length === 0) continue;
      const day = a.publishedAt ? (() => {
        const t = new Date(a.publishedAt).getTime();
        return Number.isNaN(t) ? null : dayKeyOf(t);
      })() : null;
      const arr = day !== null && daySet.has(day) ? baseDays.map(dayKeyOf).indexOf(day) : -1;

      const bestByRegion = new Map<string, { confidence: number; scope: string }>();
      for (const r of rms) {
        const current = bestByRegion.get(r.region);
        if (!current || r.confidence > current.confidence) {
          bestByRegion.set(r.region, { confidence: r.confidence, scope: regionScopeOf(r) });
        }
      }
      for (const [region, best] of bestByRegion) {
        const e = map.get(region) || { items: new Set<string>(), sources: new Set<string>(), scopes: new Set<string>(), confSum: 0, days: new Array(7).fill(0) };
        e.items.add(a.id);
        if (a.sourceName) e.sources.add(a.sourceName);
        e.scopes.add(best.scope);
        e.confSum += best.confidence;
        if (arr >= 0) e.days[6 - arr] += 1; // index0=最远… 最近在尾部：反转使左旧右新
        map.set(region, e);
      }
    }

    const list = [...map.entries()]
      .map(([region, e]) => ({
        region,
        count: e.items.size,
        sources: e.sources.size,
        scopes: [...e.scopes],
        avgConf: e.items.size ? Math.round((e.confSum / e.items.size) * 100) / 100 : 0,
        days: e.days,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const maxSource = Math.max(...list.map((x) => x.sources), 1);
    const maxDay = Math.max(...list.flatMap((x) => x.days), 1);
    return { list, maxSource, maxDay };
  }, [articles]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
        <Radar className="w-5 h-5 text-emerald-600" />
        <h3 className="text-base font-serif font-bold text-stone-950">
          地区情报（全库 AI 标注覆盖 · 来源去重度 · 近 7 天到达）
        </h3>
      </div>

      {rows.list.length === 0 ? (
        <div className="py-6 text-center text-stone-400 text-xs">
          暂无 AI 涉事地区标注（请先运行“全量后台标注”或刷新语料）。
        </div>
      ) : (
        <div className="space-y-4">
          {rows.list.map((r) => (
            <div key={r.region} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900">{r.region}</span>
                <span className="font-mono text-stone-500">
                  {r.count} 条 · 来源 {r.sources} · 模型自评分均值 {(r.avgConf * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-[10px] text-stone-500">
                范围：{r.scopes.map((scope) => REGION_SCOPE_LABELS[scope as keyof typeof REGION_SCOPE_LABELS] || scope).join('、')}
              </div>

              {/* 来源去重度（雷达条：来源数/最大） */}
              <div>
                <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
                  <span>来源去重度</span>
                  <span className="font-mono">{r.sources}/{rows.maxSource}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div style={{ width: `${(r.sources / rows.maxSource) * 100}%` }} className="bg-emerald-600 h-full" />
                </div>
              </div>

              {/* 近7天到达迷你趋势（左旧右新） */}
              <div className="flex items-end space-x-1 h-8">
                {r.days.map((c, i) => (
                  <div
                    key={i}
                    title={`${i === 6 ? '今日' : i === 5 ? '昨日' : i + 1 + ' 天前'} · ${c} 条`}
                    style={{ height: `${Math.max(c > 0 ? 18 : 4, (c / rows.maxDay) * 100)}%` }}
                    className={`flex-1 rounded-t ${c > 0 ? 'bg-[#0284C7]' : 'bg-stone-200'}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                <span>7 天前</span>
                <span>今日（周{WEEK[new Date().getDay()]}）</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        口径：均以 AI 标注（regionMentions）为源；同一文章同一地区跨范围只计一次并取最高模型自评分；条数/来源为<strong>传入语料全量覆盖</strong>（若含历史旧文则一并计入）；迷你柱为带发布时刻条目的近 7 天自然日到达数（无时刻不计）。
      </p>
    </div>
  );
};
