import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NewsArticle } from '../types';
import { detectSectors } from '../utils/sectorTaxonomy';
import { RegionSectorMatrix } from './intelligence/RegionSectorMatrix';
import { EntitySamplePanel } from './intelligence/EntitySamplePanel';
import { ThreeLevelDrill } from './intelligence/ThreeLevelDrill';
import { ComboAggregate } from './intelligence/ComboAggregate';
import { CrossRegionFlowPanel } from './intelligence/CrossRegionFlowPanel';
import { MapPin, X, ArrowRight, Download, Info, RefreshCw, Sparkles, Loader2, Globe2 } from 'lucide-react';
import { buildIntelCsv, downloadCsv } from '../utils/intelExport';
import { articleSortTime } from '../utils/articleTime';
import {
  primaryRegionMention,
  regionScopeOf,
  REGION_SCOPE_LABELS,
  inferDefaultRegionMentions,
  inferDefaultEntityMentions,
} from '../utils/regionSemantics';
import type { RegionScope } from '../types';
import { MethodBadge } from './common/MethodBadge';
import { KeyTermHighlight } from './common/KeyTermHighlight';
import { FeatureSummary } from './common/FeatureSummary';
import type { FeatureSummaryId } from '../utils/featureSummaries';

type RegionSection = 'matrix' | 'flow' | 'entities' | 'drill' | 'aggregate';


interface RegionIntelligencePageProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

const SECTOR_NAMES: Record<string, string> = {
  ai: 'AI 与软件', semi: '半导体与硬件', macro: '宏观与金融', ev: '新能源与汽车', consume: '消费电子与数码', internet: '互联网与平台', gov: '政策与治理', energy: '能源与电力', oversea: '出海与贸易',
};

interface AnnotationTask {
  running: boolean;
  processed: number;
  total: number;
  failed: number;
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

interface RegionImpactInterpretation {
  whyHere: string;
  drivers: string[];
  crossRegion: Array<{
    target: string;
    direction: 'benefit' | 'pressure' | 'mixed';
    mechanism: string;
    confidence: '高' | '中' | '低';
  }>;
  watch: string[];
  guidance: string;
  limits: string;
}

export const RegionIntelligencePage: React.FC<RegionIntelligencePageProps> = ({
  articles,
  onOpenArticleById,
}) => {
  // 页面级筛选：时间范围 + AI 模型自评分阈值（非校准概率）
  const [range, setRange] = useState<'all' | '7d' | '30d'>('all');
  const [confMin, setConfMin] = useState(0);
  const [regionScope, setRegionScope] = useState<RegionScope | 'all'>('all');
  const [section, setSection] = useState<RegionSection>('matrix');
  // 下钻：地区 × 赛道 组合 → 文章流
  const [drill, setDrill] = useState<{ region: string; sectorId: string } | null>(null);
  const [regionTask, setRegionTask] = useState<AnnotationTask | null>(null);
  const [entityTask, setEntityTask] = useState<AnnotationTask | null>(null);
  const [annotationStarted, setAnnotationStarted] = useState(false);
  const [annotationError, setAnnotationError] = useState('');
  const [regionReadout, setRegionReadout] = useState<RegionImpactInterpretation | null>(null);
  const [regionReadoutBusy, setRegionReadoutBusy] = useState(false);
  const [regionReadoutError, setRegionReadoutError] = useState('');
  const reloadedRef = useRef(false);

  const enrichedArticles = useMemo(() => {
    return articles.map((article) => {
      const regionMentions =
        Array.isArray(article.regionMentions) && article.regionMentions.length > 0
          ? article.regionMentions
          : inferDefaultRegionMentions(article);
      const entityMentions =
        Array.isArray(article.entityMentions) && article.entityMentions.length > 0
          ? article.entityMentions
          : inferDefaultEntityMentions(article);
      return {
        ...article,
        regionMentions,
        entityMentions,
      };
    });
  }, [articles]);

  const externalCount = useMemo(() => enrichedArticles.filter((a) => a.isExternal).length, [enrichedArticles]);
  const regionAnnotatedCount = useMemo(
    () => enrichedArticles.filter((a) => Array.isArray(a.regionMentions) && a.regionMentions.length > 0).length,
    [enrichedArticles]
  );
  const entityAnnotatedCount = useMemo(
    () => enrichedArticles.filter((a) => Array.isArray(a.entityMentions) && a.entityMentions.length > 0).length,
    [enrichedArticles]
  );
  const scopedRegionCount = useMemo(
    () =>
      enrichedArticles.filter(
        (a) =>
          Array.isArray(a.regionMentions) &&
          a.regionMentions.length > 0 &&
          a.regionMentions.every((item) => regionScopeOf(item) !== 'unspecified')
      ).length,
    [enrichedArticles]
  );
  const needsAnnotation =
    externalCount > 0 &&
    (regionAnnotatedCount === 0 || scopedRegionCount < regionAnnotatedCount || entityAnnotatedCount === 0);

  const normalizeTask = (raw: any): AnnotationTask | null =>
    raw && typeof raw === 'object' && raw.task && typeof raw.task === 'object'
      ? {
          running: !!raw.task.running,
          processed: Number(raw.task.processed) || 0,
          total: Number(raw.task.total) || 0,
          failed: Number(raw.task.failed) || 0,
          status: raw.task.status || 'idle',
          startedAt: raw.task.startedAt || null,
          finishedAt: raw.task.finishedAt || null,
        }
      : null;

  const startAnnotation = async (kind: 'regions' | 'entities'): Promise<AnnotationTask | null> => {
    const res = await fetch(`/api/${kind}/annotate`, { method: 'POST' });
    const data = await res.json();
    if (!data?.ok) {
      if (data?.reason === 'no_api_key') {
        setAnnotationError('未配置 DeepSeek/Gemini Key，无法运行全量标注。可在右上角设置中配置后再试。');
      } else {
        setAnnotationError('全量标注任务启动失败，请稍后重试。');
      }
      return null;
    }
    return normalizeTask(data);
  };

  const runFullAnnotation = async () => {
    if (
      !window.confirm(
        `将对 ${externalCount} 条外部语料分批运行地区与主体 AI 标注，可能消耗在线模型额度；任务完成后页面会自动刷新。是否继续？`
      )
    ) {
      return;
    }
    setAnnotationError('');
    setAnnotationStarted(true);
    const [region, entity] = await Promise.all([
      startAnnotation('regions').catch(() => null),
      startAnnotation('entities').catch(() => null),
    ]);
    if (region) setRegionTask(region);
    if (entity) setEntityTask(entity);
  };

  useEffect(() => {
    if (!annotationStarted) return;
    const tick = async () => {
      try {
        const [r, e] = await Promise.all([
          fetch('/api/regions/status').then((x) => x.json()),
          fetch('/api/entities/status').then((x) => x.json()),
        ]);
        const region = normalizeTask(r);
        const entity = normalizeTask(e);
        if (region) setRegionTask(region);
        if (entity) setEntityTask(entity);
      } catch {
        /* 轮询失败时保持上一次状态 */
      }
    };
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [annotationStarted]);

  useEffect(() => {
    if (!annotationStarted || reloadedRef.current) return;
    if (!regionTask || !entityTask) return;
    const done =
      !regionTask.running &&
      !entityTask.running &&
      (regionTask.total + entityTask.total) > 0;
    if (!done) return;
    reloadedRef.current = true;
    const timer = setTimeout(() => window.location.reload(), 800);
    return () => clearTimeout(timer);
  }, [annotationStarted, regionTask, entityTask]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = range === 'all' ? 0 : now - (range === '7d' ? 7 : 30) * 24 * 3600 * 1000;
    return enrichedArticles
      .filter((a) => {
        if (!a.regionMentions || a.regionMentions.length === 0) return false;
        const mentions =
          regionScope === 'all'
            ? a.regionMentions
            : a.regionMentions.filter((item) => regionScopeOf(item) === regionScope);
        if (mentions.length === 0) return false;
        if (confMin > 0 && !mentions.some((r) => r.confidence >= confMin)) return false;
        if (range !== 'all') {
          const t = articleSortTime(a);
          if (t > 0 && t < cutoff) return false;
        }
        return true;
      })
      .map((article) => {
        if (regionScope === 'all') return article;
        return {
          ...article,
          regionMentions: (article.regionMentions || []).filter(
            (item) => regionScopeOf(item) === regionScope
          ),
        };
      });
  }, [enrichedArticles, range, confMin, regionScope]);

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-serif font-bold border transition-colors ${
      active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-300'
    }`;

  const runRegionInterpret = async (
    region: string,
    sectorId: string,
    matched: NewsArticle[]
  ) => {
    if (matched.length === 0 || regionReadoutBusy) return;
    setRegionReadoutBusy(true);
    setRegionReadoutError('');
    setRegionReadout(null);
    try {
      const response = await fetch('/api/region/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          sector: SECTOR_NAMES[sectorId] || sectorId,
          articles: matched.slice(0, 12).map((article) => ({
            title: article.title,
            source: article.sourceName,
            publishedAt: article.publishedAt || article.sourceDate || article.date,
            summary: article.summary,
          })),
        }),
      });
      const data = await response.json();
      if (data?.ok && data.data) {
        setRegionReadout(data.data as RegionImpactInterpretation);
      } else {
        setRegionReadoutError(
          data?.reason === 'no_api_key'
            ? '未配置在线 AI Key，无法生成地区影响推演。'
            : '地区影响推演生成失败。'
        );
      }
    } catch {
      setRegionReadoutError('地区影响推演请求失败。');
    } finally {
      setRegionReadoutBusy(false);
    }
  };

  const annotationRows: Array<{ label: string; task: AnnotationTask }> = [];
  if (regionTask) annotationRows.push({ label: '地区标注', task: regionTask });
  if (entityTask) annotationRows.push({ label: '主体标注', task: entityTask });

  const sections: Array<{ id: RegionSection; label: string }> = [
    { id: 'matrix', label: '地区矩阵' },
    { id: 'flow', label: '🌐 跨区流动与阻尼' },
    { id: 'entities', label: '主体抽样' },
    { id: 'drill', label: '三级下钻' },
    { id: 'aggregate', label: '组合聚合' },
  ];
  const sectionFeatureId: Record<RegionSection, FeatureSummaryId> = {
    matrix: 'region-matrix',
    flow: 'region-flow',
    entities: 'region-entities',
    drill: 'region-drill',
    aggregate: 'region-aggregate',
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 shadow-md">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-[#0284C7]" />
          <span className="text-xs font-mono font-bold text-[#38BDF8] uppercase tracking-wider">
            地区情报页
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white mt-2">
          按涉事地区读世界
        </h1>
        <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-3xl mt-1">
          按真实语料和 AI 地区标注进行矩阵浏览、主体抽样与组合下钻。
        </p>

        {needsAnnotation && (
          <div className="mt-4 rounded-xl border border-sky-500/40 bg-sky-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] leading-relaxed text-sky-100 max-w-2xl">
              当前语料有 {externalCount} 条外部信源，地区标注已缓存 {regionAnnotatedCount} 条（其中已完成范围区分 {scopedRegionCount} 条）、
              主体标注已缓存 {entityAnnotatedCount} 条。下方矩阵/下钻需要先写入全量 AI 标注数据，
              任务会分小批运行并写回语料，完成后本页自动刷新。
            </div>
            <button
              onClick={() => void runFullAnnotation()}
              disabled={annotationStarted}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-sky-950 text-xs font-serif font-bold hover:bg-sky-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${annotationStarted ? 'animate-spin' : ''}`} />
              {annotationStarted ? '标注任务已启动' : '启动全量标注（地区+主体）'}
            </button>
          </div>
        )}

        {annotationError && (
          <div className="mt-3 rounded-xl border border-red-400/50 bg-red-950/30 px-4 py-2.5 text-[11px] text-red-100">
            {annotationError}
          </div>
        )}

        {annotationStarted && (regionTask || entityTask) && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {annotationRows.map(({ label, task: t }) => {
                const progress = t.total > 0 ? Math.min(100, Math.round((t.processed / t.total) * 100)) : 0;
                return (
                  <div key={label} className="bg-white/10 border border-white/15 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] text-sky-100">
                      <span className="font-serif font-bold">{label}</span>
                      <span className="font-mono">
                        {t.processed}/{t.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
            })}
          </div>
        )}

        {/* 筛选条 */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-400 font-mono">时间：</span>
            {(
              [
                { id: 'all', label: '全部', title: '含历史旧闻（发布日期超过 30 天的条目仍计入）' },
                { id: '7d', label: '近 7 天', title: '仅发布日期在近 7 天内的条目' },
                { id: '30d', label: '近 30 天', title: '仅发布日期在近 30 天内的条目' },
              ] as const
            ).map((o) => (
              <button key={o.id} onClick={() => setRange(o.id)} className={chip(range === o.id)} title={o.title}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-400 font-mono">模型自评分：</span>
            {[0, 0.5, 0.7].map((v) => (
              <button key={v} onClick={() => setConfMin(v)} className={chip(confMin === v)}>
                {v === 0 ? '不限' : `≥${v}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-400 font-mono">地区范围：</span>
            <button onClick={() => setRegionScope('all')} className={chip(regionScope === 'all')}>
              全部
            </button>
            {(Object.keys(REGION_SCOPE_LABELS) as RegionScope[]).map((scope) => (
              <button
                key={scope}
                onClick={() => setRegionScope(scope)}
                className={chip(regionScope === scope)}
                title={scope === 'unspecified' ? '旧数据或模型无法判断范围' : REGION_SCOPE_LABELS[scope]}
              >
                {REGION_SCOPE_LABELS[scope]}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-stone-400 font-mono ml-auto">
            命中 {filtered.length} 条
          </span>
          <button
            onClick={() => downloadCsv('jianwei-intel.csv', buildIntelCsv(filtered))}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 bg-[#0D9488] hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出筛选 CSV</span>
          </button>
        </div>
      </div>

      <details className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-[11px] text-sky-900">
        <summary className="cursor-pointer flex items-center gap-1.5 font-serif font-bold">
          <Info className="w-3.5 h-3.5" />
          页面口径
        </summary>
        <p className="mt-1.5">地区优先按事件发生地展示，其次实际受影响地；旧数据保持范围未标，不自动推断。</p>
      </details>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-stone-200 pb-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-serif font-bold whitespace-nowrap transition-colors ${
              section === item.id
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <FeatureSummary featureId={sectionFeatureId[section]} compact />

      {section === 'matrix' && (
      <>
      <RegionSectorMatrix
        articles={filtered}
        onCell={(region, sectorId) => {
          setDrill({ region, sectorId });
          setRegionReadout(null);
          setRegionReadoutError('');
        }}
      />

      {drill ? (
        (() => {
          const sectorName = SECTOR_NAMES[drill.sectorId] || drill.sectorId;
          const matched = filtered.filter((a) => {
            return primaryRegionMention(a.regionMentions)?.region === drill.region && detectSectors(a).includes(drill.sectorId);
          });
          return (
            <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="text-sm font-serif font-bold text-stone-950 flex items-center space-x-2">
                  <span>下钻：{drill.region} × {sectorName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                    {matched.length} 条
                  </span>
                </h3>
                <button
                  onClick={() => setDrill(null)}
                  className="p-1.5 rounded text-stone-400 hover:text-stone-900 hover:bg-stone-100"
                  aria-label="关闭下钻"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-3">
                <FeatureSummary featureId="region-impact" compact />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-sky-950 leading-relaxed">
                    <b className="font-serif">地区影响解读：</b>
                    解释为什么是这里、可能向哪些地区或行业传导，以及接下来应观察什么。
                  </div>
                  <button
                    type="button"
                    onClick={() => void runRegionInterpret(drill.region, drill.sectorId, matched)}
                    disabled={regionReadoutBusy || matched.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D9488] hover:bg-teal-700 disabled:opacity-40 text-white text-[11px] font-serif font-bold"
                  >
                    {regionReadoutBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {regionReadoutBusy ? '正在推演…' : regionReadout ? '重新生成' : '生成影响解读'}
                  </button>
                </div>

                {regionReadoutError && (
                  <p className="text-[11px] text-red-700">{regionReadoutError}</p>
                )}

                {regionReadout && (
                  <div className="space-y-3 text-[11px] leading-relaxed text-stone-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-serif font-black text-stone-950">推演结果</span>
                      <MethodBadge methodId="regional_impact" compact />
                    </div>

                    <div className="rounded-lg border border-sky-200 bg-white p-3">
                      <div className="font-serif font-bold text-sky-900 mb-1">为什么在这里发生</div>
                      <KeyTermHighlight
                        text={regionReadout.whyHere || '现有材料未说明'}
                        entities={Array.from(new Set(matched.flatMap((article) => (article.entityMentions || []).map((item) => item.name)))).slice(0, 60)}
                      />
                    </div>

                    {regionReadout.drivers.length > 0 && (
                      <div>
                        <div className="font-serif font-bold text-stone-700 mb-1">主要驱动因素</div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {regionReadout.drivers.map((driver) => (
                            <li key={driver} className="rounded-lg border border-stone-200 bg-white px-2.5 py-2">
                              <KeyTermHighlight text={driver} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {regionReadout.crossRegion.length > 0 && (
                      <div>
                        <div className="font-serif font-bold text-stone-700 mb-1">跨地区与跨行业传导推演</div>
                        <div className="space-y-1.5">
                          {regionReadout.crossRegion.map((item, index) => (
                            <div key={`${item.target}-${index}`} className="grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2">
                              <div>
                                <span className={`inline-flex rounded px-1.5 py-0.5 mr-1 text-[10px] font-bold ${
                                  item.direction === 'benefit'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : item.direction === 'pressure'
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-amber-50 text-amber-800'
                                }`}>
                                  {item.direction === 'benefit' ? '受益' : item.direction === 'pressure' ? '承压' : '分化'}
                                </span>
                                <span className="font-serif font-bold">{item.target}</span>
                              </div>
                              <div>
                                <KeyTermHighlight text={item.mechanism} />
                                <span className="ml-1 text-[10px] text-stone-400">模型置信：{item.confidence}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <div className="font-serif font-bold text-amber-900 mb-1">接下来观察什么</div>
                        <ul className="space-y-1">
                          {regionReadout.watch.map((item) => (
                            <li key={item} className="flex gap-1.5">
                              <span className="text-amber-600">•</span>
                              <KeyTermHighlight text={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                        <div className="font-serif font-bold text-emerald-900 mb-1">行动指引</div>
                        <KeyTermHighlight text={regionReadout.guidance || '现有材料未说明'} />
                      </div>
                    </div>

                    <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                      <div className="font-serif font-bold text-red-900 mb-1">判断边界与失效条件</div>
                      <KeyTermHighlight text={regionReadout.limits || '现有材料未说明'} />
                    </div>
                  </div>
                )}
              </div>

              {matched.length > 0 ? (
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {matched.slice(-12).reverse().map((a) => (
                    <button
                      key={a.id}
                      onClick={() => onOpenArticleById && onOpenArticleById(a.id)}
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
              ) : (
                <div className="py-4 text-center text-stone-400 text-xs">该组合在当前筛选下无匹配条目。</div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="py-2 text-center text-[11px] text-stone-400">
          提示：点击上方矩阵中有数值的格子，可下钻查看该“地区 × 赛道”组合的文章流。
        </div>
      )}
      </>
      )}

      {section === 'flow' && (
        <CrossRegionFlowPanel articles={filtered} onOpenArticleById={onOpenArticleById} />
      )}
      {section === 'entities' && (
        <EntitySamplePanel articles={filtered} onOpenArticleById={onOpenArticleById} />
      )}

      {section === 'drill' && (
        <ThreeLevelDrill articles={filtered} onOpenArticleById={onOpenArticleById} />
      )}
      {section === 'aggregate' && (
        <ComboAggregate articles={filtered} onOpenArticleById={onOpenArticleById} />
      )}
    </div>
  );
};
