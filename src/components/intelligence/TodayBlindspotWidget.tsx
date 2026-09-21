import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { EyeOff, AlertTriangle, Sparkles, ArrowRight, ChevronDown, ChevronUp, Rss } from 'lucide-react';
import { scanCoverage, SUGGESTED_SOURCES } from '../../utils/sectorTaxonomy';

interface TodayBlindspotWidgetProps {
  articles: NewsArticle[];
  onOpenSettings?: () => void;
}

export const TodayBlindspotWidget: React.FC<TodayBlindspotWidgetProps> = ({
  articles,
  onOpenSettings,
}) => {
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const { coverage, total, matchedTotal, maxCount } = useMemo(() => {
    const total = articles.length;
    const coverage = scanCoverage(articles);
    const maxCount = Math.max(...coverage.map((c) => c.count), 1);
    const matchedTotal = coverage.reduce((s, c) => s + c.count, 0);
    return { coverage, total, matchedTotal, maxCount };
  }, [articles]);

  // 相对最高覆盖赛道 < 35% 视为“低覆盖候选”（口径可复核）
  const lowCoverage = coverage
    .filter((c) => c.count / maxCount < 0.35)
    .sort((a, b) => a.count - b.count)
    .slice(0, 3);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <EyeOff className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              今日覆盖盲区扫描（语料派生）
            </h3>
            <p className="text-xs text-stone-500">
              按赛道关键词对当前语料 {total} 篇做覆盖扫描；低覆盖赛道为“观察候选”，不代表现实世界的全局盲区。
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-stone-400 shrink-0">
          {matchedTotal} 篇次 / {coverage.filter((c) => c.count > 0).length} 赛道有覆盖
        </span>
      </div>

      {total === 0 ? (
        <div className="py-8 text-center text-stone-400 text-xs">当前无语料，请先摄取或刷新。</div>
      ) : lowCoverage.length > 0 ? (
        <div className="space-y-3">
          <div className="text-xs font-serif font-bold text-stone-700">
            相对低覆盖赛道（与最高覆盖赛道 {maxCount} 篇相比低于 35%）：建议为该赛道增配信源
          </div>
          {lowCoverage.map((c) => (
            <div key={c.sector.id} className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>{c.sector.name}</span>
                </span>
                <span className="font-mono font-bold text-red-600">覆盖 {c.count} 篇</span>
              </div>
              <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div style={{ width: `${(c.count / maxCount) * 100}%` }} className="h-full bg-red-500" />
              </div>
              {c.count > 0 ? (
                <p className="text-stone-600 text-[11px] leading-relaxed line-clamp-1">
                  已覆盖样例：{c.samples.join(' / ')}
                </p>
              ) : (
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  当前语料未命中该赛道关键词——可先为其配置 RSS 信源再摄取。
                </p>
              )}

              {/* 一键补源建议 */}
              <button
                onClick={() => setExpandedSector(expandedSector === c.sector.id ? null : c.sector.id)}
                className="mt-1 text-[11px] font-serif font-bold text-stone-600 hover:text-[#E3120B] flex items-center space-x-1 transition-colors"
              >
                <Rss className="w-3.5 h-3.5" />
                <span>补源建议</span>
                {expandedSector === c.sector.id ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {expandedSector === c.sector.id && (
                <div className="pt-1.5 space-y-2">
                  {(SUGGESTED_SOURCES[c.sector.id] || []).map((sugg) => (
                    <div
                      key={sugg.name}
                      className="p-2.5 bg-white border border-stone-200 rounded-lg text-[11px]"
                    >
                      <div className="font-serif font-bold text-stone-900 flex items-center justify-between">
                        <span>• {sugg.name}</span>
                        <span className="text-stone-400 font-normal">{sugg.why}</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-stone-400">
                    以上为方向性建议（请自行核实其官方 RSS 订阅地址后在“设置→信源”添加），添加后执行“立即摄取”即可更新本扫描。
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="w-full py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-lg text-[11px] font-serif font-bold flex items-center justify-center space-x-1 transition-colors"
                    >
                      <span>打开设置添加信源</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-stone-500 text-xs">
          各赛道覆盖相对均衡，未发现显著低覆盖候选。
        </div>
      )}

      <div className="space-y-3 pt-2 border-t border-stone-200">
        <div className="text-xs font-serif font-bold text-stone-900 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-[#E3120B]" />
          <span>修补建议：</span>
        </div>
        <div className="space-y-2">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
            <div className="font-serif font-bold text-stone-950">🔍 为低覆盖赛道补充信源</div>
            <div className="text-[11px] text-amber-900 font-sans">
              在“设置 → 真实信源 RSS”中追加对应赛道源并执行“立即摄取”，本节扫描将随之更新。
            </div>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-[11px] font-serif font-bold text-amber-700 hover:text-amber-900 flex items-center space-x-1 pt-1"
              >
                <span>前往设置</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        口径：关键词词典覆盖扫描（src/utils/sectorTaxonomy.ts），结果随语料实时变化，非现实世界全局盲区结论。
      </p>
    </div>
  );
};
