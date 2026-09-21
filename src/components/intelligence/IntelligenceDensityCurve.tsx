import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { Activity, Sparkles, Clock, Layers } from 'lucide-react';
import { parseLocalHour } from '../../utils/publishedAt';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';

interface IntelligenceDensityCurveProps {
  articles: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
}

const SLOT_COUNT = 12;
const PALETTE = ['#E3120B', '#0284C7', '#8B5CF6', '#0D9488', '#D97706', '#65A30D'];

function buildSlots() {
  return Array.from({ length: SLOT_COUNT }, (_, idx) => {
    const start = idx * 2;
    const end = start + 2;
    const labelHour = end === 24 ? 24 : end;
    return {
      hour: `${String(labelHour).padStart(2, '0')}:00`,
      rangeLabel: `${String(start).padStart(2, '0')}–${String(end).padStart(2, '0')}`,
    };
  });
}

export const IntelligenceDensityCurve: React.FC<IntelligenceDensityCurveProps> = ({
  articles,
  onSelectArticleTitle,
}) => {
  type Dim = 'none' | 'source' | 'sector';
  const [dim, setDim] = useState<Dim>('source');

  const model = useMemo(() => {
    const slots = buildSlots().map((s) => ({
      ...s,
      total: 0,
      sources: new Map<string, number>(),
      sectors: new Map<string, number>(),
      samples: [] as string[],
    }));
    let timed = 0;
    const now = Date.now();
    for (const a of articles) {
      if (!a.publishedAt) continue;
      const ts = new Date(a.publishedAt).getTime();
      if (Number.isNaN(ts)) continue;
      if (now - ts > 30 * 24 * 3600 * 1000) continue; // 只统计近 30 天，排除历史旧文
      const hour = parseLocalHour(a.publishedAt);
      if (hour === null) continue;
      timed += 1;
      const idx = Math.floor(hour / 2);
      const slot = slots[idx];
      slot.total += 1;
      const src = a.sourceName || '其他';
      slot.sources.set(src, (slot.sources.get(src) || 0) + 1);
      for (const id of detectSectors(a)) {
        slot.sectors.set(id, (slot.sectors.get(id) || 0) + 1);
      }
      if (a.title && slot.samples.length < 2) slot.samples.push(a.title);
    }
    const max = Math.max(...slots.map((s) => s.total), 1);

    const sourceTotals = new Map<string, number>();
    const sectorTotals = new Map<string, number>();
    for (const slot of slots) {
      for (const [src, n] of slot.sources) sourceTotals.set(src, (sourceTotals.get(src) || 0) + n);
      for (const [id, n] of slot.sectors) sectorTotals.set(id, (sectorTotals.get(id) || 0) + n);
    }
    const sourceOrder = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 6);
    const sectorOrder = [...sectorTotals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 6);
    const sectorName = (id: string) => SECTOR_TAXONOMY.find((x) => x.id === id)?.name || id;

    const rows = slots.map((slot) => ({
      ...slot,
      sourceSegments: sourceOrder
        .map((src) => ({ source: src, count: slot.sources.get(src) || 0 }))
        .filter((s) => s.count > 0),
      sourceOther: [...slot.sources.entries()].filter(([src]) => !sourceOrder.includes(src)).reduce((s, [, n]) => s + n, 0),
      sectorSegments: sectorOrder
        .map((id) => ({ source: sectorName(id), id, count: slot.sectors.get(id) || 0 }))
        .filter((s) => s.count > 0),
      sectorOther: [...slot.sectors.entries()].filter(([id]) => !sectorOrder.includes(id)).reduce((s, [, n]) => s + n, 0),
    }));

    return { rows, max, timed, sourceOrder, sectorOrder, sectorName };
  }, [articles]);

  const peakSlots = useMemo(
    () => model.rows.filter((s) => s.total > 0).sort((a, b) => b.total - a.total).slice(0, 6),
    [model.rows]
  );

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              情报密度曲线（真实统计）
            </h3>
            <p className="text-xs text-stone-500">
              近 30 天外部信源按发布时刻的到达节奏（2 小时槽计数；共 {model.timed} 条，历史旧文已排除）；无发布时间条目不参与。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-serif font-bold shrink-0">
          {(
            [
              { id: 'none', label: '总量' },
              { id: 'source', label: '按来源' },
              { id: 'sector', label: '按赛道' },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setDim(o.id)}
              className={`px-3 py-1 rounded-lg border flex items-center space-x-1 transition-all ${
                dim === o.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-300'
              }`}
            >
              {o.id === 'source' || o.id === 'sector' ? <Layers className="w-3.5 h-3.5" /> : null}
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {model.timed === 0 ? (
        <div className="py-8 text-center text-stone-400 text-xs">
          当前语料没有带发布时间戳的条目：请先在设置页配置 RSS 并执行“立即摄取”。
        </div>
      ) : (
        <>
          {/* Bars */}
          <div className="space-y-2">
            <div className="h-44 flex items-end justify-between gap-1.5 pt-6 pb-2 px-2 bg-stone-50 rounded-xl border border-stone-200">
              {model.rows.map((pt) => {
                const heightPercent = (pt.total / model.max) * 100;
                return (
                  <div
                    key={pt.hour}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-stone-900 text-white text-[10px] p-2 rounded shadow-lg whitespace-nowrap">
                        <div className="font-bold">
                          {pt.rangeLabel} 时 · {pt.total} 条
                        </div>
                        {pt.samples.map((s) => (
                          <div key={s} className="text-stone-300 max-w-[260px] truncate mt-0.5">
                            {s}
                          </div>
                        ))}
                      </div>
                      <div className="w-2 h-2 bg-stone-900 rotate-45 -mt-1" />
                    </div>

                    {dim === 'none' && pt.total >= Math.max(1, model.max * 0.5) && (
                      <span className="text-[10px] text-[#E3120B] font-bold mb-1">★</span>
                    )}

                    {dim !== 'none' ? (
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[20px] flex flex-col-reverse overflow-hidden rounded-t-md"
                      >
                        {dim === 'source'
                          ? pt.sourceSegments.map((seg) => (
                              <div
                                key={seg.source}
                                style={{
                                  height: `${(seg.count / model.max) * 100}%`,
                                  backgroundColor: PALETTE[model.sourceOrder.indexOf(seg.source) % PALETTE.length],
                                }}
                                title={`${seg.source}: ${seg.count}`}
                              />
                            ))
                          : pt.sectorSegments.map((seg) => (
                              <div
                                key={seg.id}
                                style={{
                                  height: `${(seg.count / model.max) * 100}%`,
                                  backgroundColor: PALETTE[model.sectorOrder.indexOf(seg.id) % PALETTE.length],
                                }}
                                title={`${seg.source}: ${seg.count}`}
                              />
                            ))}
                        {dim === 'source'
                          ? pt.sourceOther > 0 && (
                              <div
                                style={{ height: `${(pt.sourceOther / model.max) * 100}%`, backgroundColor: '#94a3b8' }}
                                title={`其他来源: ${pt.sourceOther}`}
                              />
                            )
                          : pt.sectorOther > 0 && (
                              <div
                                style={{ height: `${(pt.sectorOther / model.max) * 100}%`, backgroundColor: '#cbd5e1' }}
                                title={`其他赛道: ${pt.sectorOther}`}
                              />
                            )}
                      </div>
                    ) : (
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[20px] rounded-t-md transition-all ${
                          pt.total >= Math.max(1, model.max * 0.5)
                            ? 'bg-[#E3120B] group-hover:bg-red-700'
                            : 'bg-stone-800 group-hover:bg-stone-600'
                        }`}
                      />
                    )}

                    <span className="text-[10px] font-mono text-stone-500 mt-2">{pt.hour}</span>
                  </div>
                );
              })}
            </div>

            {dim === 'source' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-stone-600">
                <span className="font-serif font-bold text-stone-700">图例（按来源）：</span>
                {model.sourceOrder.map((src, i) => (
                  <span key={src} className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span className="max-w-[130px] truncate">{src}</span>
                  </span>
                ))}
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
                  <span>其他</span>
                </span>
              </div>
            )}
            {dim === 'sector' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-stone-600">
                <span className="font-serif font-bold text-stone-700">图例（按赛道）：</span>
                {model.sectorOrder.map((id, i) => (
                  <span key={id} className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span>{model.sectorName(id)}</span>
                  </span>
                ))}
                {model.rows.some((r) => r.sectorOther > 0) && (
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                    <span>其他</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Peak slots */}
          <div className="space-y-2 pt-2 border-t border-stone-200">
            <div className="text-xs font-serif font-bold text-stone-600 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#E3120B]" />
              <span>高峰时段（相对峰值 ≥50%）与样例条目：</span>
            </div>
            {peakSlots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {peakSlots.map((p) => (
                  <div key={p.hour} className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-stone-900 bg-stone-200 px-1.5 py-0.5 rounded text-[10px]">
                        {p.rangeLabel} 时（{p.total} 条）
                      </span>
                    </div>
                    {p.samples.map((t) => (
                      <button
                        key={t}
                        onClick={() => onSelectArticleTitle && onSelectArticleTitle(t)}
                        className="block w-full text-left text-stone-700 line-clamp-2 hover:text-[#E3120B] transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-stone-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>当前无显著高峰（各槽位计数较低且均匀）。</span>
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        意义：密度=外部信源按发布时刻的到达节律，用于评估摄取调度/链路稳定与“一次涌入”异常。
        可继续扩展的展示：①按赛道拆分；②与摄取任务告警联动；③切换 1h/6h 粒度或近 7 天。
      </p>
    </div>
  );
};
