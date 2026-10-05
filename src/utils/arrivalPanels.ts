import { parseLocalHour } from "./publishedAt";
import { regionOf } from "./sourceRegion";
import { primaryMentionRegion } from "./mentionRegion";
import { detectSectors, SECTOR_TAXONOMY, type SectorDef } from "./sectorTaxonomy";

/** 热力、密度、跨事件共振的输入。缺字段按“没有”处理，不补猜。 */
export interface ArrivalArticle {
  id?: string;
  title?: string;
  summary?: string;
  subtitle?: string;
  oneSentenceVerdict?: string;
  publishedAt?: string;
  sourceName?: string;
  tags?: string[];
  category?: string;
  isExternal?: boolean;
  spectrumLayers?: unknown[];
  logicTree?: { rootCause?: string };
}

export type ArrivalMode = "hour" | "day";
export type ArrivalGroupBy = "source" | "region" | "mention";

export interface ArrivalCell {
  row: string;
  colRaw: string;
  colLabel: string;
  count: number;
  intensity: number;
  samples: string[];
}

export interface ArrivalHeatView {
  mode: ArrivalMode;
  groupBy: ArrivalGroupBy;
  timedCount: number;
  rows: string[];
  columns: Array<{ raw: string; label: string }>;
  cells: ArrivalCell[];
}

export interface ArrivalHeatBundle {
  /** 分桶用的是计算端本地时区，不是用户浏览器时区。 */
  clock: "runtime-local";
  timedCount: number;
  views: ArrivalHeatView[];
}

export interface DensitySlot {
  hour: string;
  rangeLabel: string;
  total: number;
  samples: string[];
  sourceSegments: Array<{ source: string; count: number }>;
  sourceOther: number;
  sectorSegments: Array<{ source: string; id: string; count: number }>;
  sectorOther: number;
}

export interface DensityCurveSnapshot {
  clock: "runtime-local";
  timed: number;
  max: number;
  sourceOrder: string[];
  sectorOrder: string[];
  sectorNames: Record<string, string>;
  rows: DensitySlot[];
}

export interface CrossEventPair {
  id: string;
  title: string;
  resonanceLevel: string;
  resonanceScore: number;
  articleIds: [string, string];
  articleTitles: [string, string];
  hiddenNexusTheme: string;
  sharedBottleneck: string;
  synergyChain: Array<{ step: string; sourceArticle: string; mechanism: string }>;
  jointImpacts: { firstOrder: string; secondOrder: string; thirdOrder: string };
  aiJointVerdict: string;
  recommendedAction: string;
  signal: {
    sharedTags: string[];
    contentSimilarity: number;
    bothDeep: boolean;
    sources: [string, string];
  };
}

export interface CrossEventSnapshot {
  corpusSize: number;
  poolSize: number;
  pairs: CrossEventPair[];
}

const WINDOW_MS = 30 * 24 * 3600 * 1000;
const SLOTS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const SLOT_COUNT = 12;

function localDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} 周${WEEK[d.getDay()]}`;
}

interface Timed {
  article: ArrivalArticle;
  hour: number | null;
  dateKey: string | null;
}

function recentTimed(articles: ArrivalArticle[], now: number): Timed[] {
  const timed: Timed[] = [];
  for (const article of articles) {
    if (!article.publishedAt) continue;
    const t = new Date(article.publishedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (now - t > WINDOW_MS) continue;
    timed.push({ article, hour: parseLocalHour(article.publishedAt), dateKey: localDateKey(t) });
  }
  return timed;
}

function groupKeyOf(article: ArrivalArticle, groupBy: ArrivalGroupBy): string {
  if (groupBy === "region") return regionOf(article.sourceName);
  if (groupBy === "mention") {
    return primaryMentionRegion(`${article.title || ""} ${article.summary || ""}`) || "未标注";
  }
  return article.sourceName || "其他";
}

/** 单张到达热力表。intensity 是相对本表峰值的 1–5 级，0 表示该格没有条目。 */
export function deriveArrivalHeat(
  articles: ArrivalArticle[],
  options: { now?: number; mode: ArrivalMode; groupBy: ArrivalGroupBy },
): ArrivalHeatView {
  const now = options.now ?? Date.now();
  const timed = recentTimed(articles, now);
  if (timed.length === 0) {
    return { mode: options.mode, groupBy: options.groupBy, timedCount: 0, rows: [], columns: [], cells: [] };
  }

  const byKey = new Map<string, number>();
  for (const { article } of timed) {
    const key = groupKeyOf(article, options.groupBy);
    byKey.set(key, (byKey.get(key) || 0) + 1);
  }
  const top = [...byKey.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key]) => key);
  const rows = top.length < byKey.size ? [...top, "其他"] : top;
  const rowOf = (key: string) => (top.includes(key) ? key : "其他");

  const columns: Array<{ raw: string; label: string }> =
    options.mode === "hour"
      ? SLOTS.map((raw) => ({ raw, label: raw }))
      : Array.from({ length: 7 }, (_, index) => {
          const raw = localDateKey(now - (6 - index) * 24 * 3600 * 1000);
          return { raw, label: dayLabel(raw) };
        });

  const counts = new Map<string, number>();
  const samples = new Map<string, string[]>();
  for (const item of timed) {
    const col =
      options.mode === "hour"
        ? item.hour === null
          ? null
          : `${String(Math.floor(item.hour / 4) * 4).padStart(2, "0")}:00`
        : item.dateKey;
    if (!col) continue;
    const key = `${rowOf(groupKeyOf(item.article, options.groupBy))}|${col}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    const titles = samples.get(key) || [];
    if (item.article.title && titles.length < 2) titles.push(item.article.title);
    samples.set(key, titles);
  }
  const max = Math.max(...counts.values(), 1);
  const cells: ArrivalCell[] = [];
  for (const row of rows) {
    for (const col of columns) {
      const count = counts.get(`${row}|${col.raw}`) || 0;
      cells.push({
        row,
        colRaw: col.raw,
        colLabel: col.label,
        count,
        intensity: count === 0 ? 0 : Math.max(1, Math.round((count / max) * 5)),
        samples: samples.get(`${row}|${col.raw}`) || [],
      });
    }
  }
  return { mode: options.mode, groupBy: options.groupBy, timedCount: timed.length, rows, columns, cells };
}

const HEAT_VIEWS: Array<{ mode: ArrivalMode; groupBy: ArrivalGroupBy }> = [
  { mode: "hour", groupBy: "source" },
  { mode: "hour", groupBy: "region" },
  { mode: "hour", groupBy: "mention" },
  { mode: "day", groupBy: "source" },
  { mode: "day", groupBy: "region" },
  { mode: "day", groupBy: "mention" },
];

export function deriveArrivalHeatBundle(articles: ArrivalArticle[], now = Date.now()): ArrivalHeatBundle {
  const views = HEAT_VIEWS.map((view) => deriveArrivalHeat(articles, { ...view, now }));
  return { clock: "runtime-local", timedCount: views[0]?.timedCount ?? 0, views };
}

export function arrivalHeatView(
  bundle: ArrivalHeatBundle | undefined,
  mode: ArrivalMode,
  groupBy: ArrivalGroupBy,
): ArrivalHeatView | undefined {
  return bundle?.views.find((view) => view.mode === mode && view.groupBy === groupBy);
}

/** 近 30 天、2 小时槽的到达计数。按来源、按赛道都从同一批计数拆出。 */
export function deriveDensityCurve(
  articles: ArrivalArticle[],
  options: { now?: number; taxonomy?: SectorDef[] } = {},
): DensityCurveSnapshot {
  const now = options.now ?? Date.now();
  const taxonomy = options.taxonomy ?? SECTOR_TAXONOMY;
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => {
    const start = index * 2;
    const end = start + 2;
    return {
      hour: `${String(end === 24 ? 24 : end).padStart(2, "0")}:00`,
      rangeLabel: `${String(start).padStart(2, "0")}–${String(end).padStart(2, "0")}`,
      total: 0,
      sources: new Map<string, number>(),
      sectors: new Map<string, number>(),
      samples: [] as string[],
    };
  });
  let timed = 0;
  for (const article of articles) {
    if (!article.publishedAt) continue;
    const ts = new Date(article.publishedAt).getTime();
    if (Number.isNaN(ts) || now - ts > WINDOW_MS) continue;
    const hour = parseLocalHour(article.publishedAt);
    if (hour === null) continue;
    timed += 1;
    const slot = slots[Math.floor(hour / 2)];
    slot.total += 1;
    const source = article.sourceName || "其他";
    slot.sources.set(source, (slot.sources.get(source) || 0) + 1);
    for (const id of detectSectors(article, taxonomy)) {
      slot.sectors.set(id, (slot.sectors.get(id) || 0) + 1);
    }
    if (article.title && slot.samples.length < 2) slot.samples.push(article.title);
  }
  const sourceTotals = new Map<string, number>();
  const sectorTotals = new Map<string, number>();
  for (const slot of slots) {
    for (const [source, count] of slot.sources) sourceTotals.set(source, (sourceTotals.get(source) || 0) + count);
    for (const [id, count] of slot.sectors) sectorTotals.set(id, (sectorTotals.get(id) || 0) + count);
  }
  const sourceOrder = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key).slice(0, 6);
  const sectorOrder = [...sectorTotals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key).slice(0, 6);
  const sectorNames = Object.fromEntries(taxonomy.map((sector) => [sector.id, sector.name]));
  return {
    clock: "runtime-local",
    timed,
    max: Math.max(...slots.map((slot) => slot.total), 1),
    sourceOrder,
    sectorOrder,
    sectorNames,
    rows: slots.map((slot) => ({
      hour: slot.hour,
      rangeLabel: slot.rangeLabel,
      total: slot.total,
      samples: slot.samples,
      sourceSegments: sourceOrder
        .map((source) => ({ source, count: slot.sources.get(source) || 0 }))
        .filter((segment) => segment.count > 0),
      sourceOther: [...slot.sources.entries()].filter(([source]) => !sourceOrder.includes(source)).reduce((sum, [, count]) => sum + count, 0),
      sectorSegments: sectorOrder
        .map((id) => ({ source: sectorNames[id] || id, id, count: slot.sectors.get(id) || 0 }))
        .filter((segment) => segment.count > 0),
      sectorOther: [...slot.sectors.entries()].filter(([id]) => !sectorOrder.includes(id)).reduce((sum, [, count]) => sum + count, 0),
    })),
  };
}

function bigramMap(text: string): Map<string, number> {
  const normalized = String(text || "").replace(/[\s\p{P}]/gu, "").toLowerCase();
  const map = new Map<string, number>();
  for (let i = 0; i < normalized.length - 1; i += 1) {
    const gram = normalized.slice(i, i + 2);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}

function jaccard(aText: string, bText: string): number {
  const a = bigramMap(aText);
  const b = bigramMap(bText);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  let union = 0;
  for (const [gram, countA] of a) {
    const countB = b.get(gram) || 0;
    inter += Math.min(countA, countB);
    union += Math.max(countA, countB);
  }
  for (const [gram, countB] of b) {
    if (!a.has(gram)) union += countB;
  }
  return union > 0 ? inter / union : 0;
}

const clamp = (value: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, value));

export function resonanceLevel(score: number): string {
  return score >= 76 ? "突变级共振" : score >= 46 ? "结构级交汇" : "周期级传导";
}

/** 两篇的信号重叠。分数是加权统计，不是因果强度，也不是概率。 */
export function analyzePair(a: ArrivalArticle, b: ArrivalArticle): CrossEventPair {
  const tagsA = a.tags || [];
  const tagsB = b.tags || [];
  const sharedTags = [...new Set(tagsA.filter((tag) => tagsB.includes(tag)))];
  const textA = `${a.title} ${a.summary || a.oneSentenceVerdict || ""} ${(a.subtitle || "").slice(0, 40)}`;
  const textB = `${b.title} ${b.summary || b.oneSentenceVerdict || ""} ${(b.subtitle || "").slice(0, 40)}`;
  const contentSimilarity = Math.round(jaccard(textA, textB) * 100) / 100;
  const bothDeep = Boolean(a.spectrumLayers && a.spectrumLayers.length > 0) && Boolean(b.spectrumLayers && b.spectrumLayers.length > 0);
  const sharedTagRatio = sharedTags.length / Math.max(1, Math.min(tagsA.length, tagsB.length));
  const resonanceScore = Math.round(
    clamp(
      30 * sharedTagRatio +
        40 * contentSimilarity * (contentSimilarity > 0.05 ? 1 : 0.35) +
        15 * (bothDeep ? 1 : 0) +
        10 * (a.category === b.category ? 0.5 : 0),
    ),
  );
  const sourceName = (article: ArrivalArticle) => String(article.sourceName || (article.isExternal ? "外部信源" : "见微")) || "未知来源";
  const topic = (article: ArrivalArticle) => (article.tags && article.tags.length > 0 ? article.tags.slice(0, 3).join("、") : article.category);
  const theme =
    sharedTags.length > 0
      ? `「${topic(a)}」与「${topic(b)}」共享信号标签：${sharedTags.join("、")}`
      : contentSimilarity >= 0.05
        ? `两篇在标题/摘要文本上存在可观重叠（相似度 ${Math.round(contentSimilarity * 100)}%），指向相近话题。`
        : `两篇分属「${topic(a)}」与「${topic(b)}」，当前语料信号重叠较弱（文本相似度 ${Math.round(contentSimilarity * 100)}%）。`;
  const bottleneck = bothDeep
    ? `两篇均含深层因果数据：A 根因「${a.logicTree?.rootCause || "—"}」；B 根因「${b.logicTree?.rootCause || "—"}」。`
    : "至少一篇为外部浅层条目（暂无深层因果字段），瓶颈分析请先对该篇执行 AI 深度补全。";
  const overlapDetail =
    sharedTags.length > 0
      ? `共享标签 ${sharedTags.join("、")}`
      : contentSimilarity >= 0.05
        ? `标题/摘要文本相似度 ${Math.round(contentSimilarity * 100)}%`
        : `暂无高置信重叠信号（建议更换配对或先补全深层字段）`;
  const summaryOf = (article: ArrivalArticle) => (article.summary || article.oneSentenceVerdict || article.title || "").slice(0, 90);
  const titleA = a.title || "";
  const titleB = b.title || "";
  return {
    id: `pair-${a.id}-${b.id}`,
    title: `${titleA.slice(0, 20)}${titleA.length > 20 ? "…" : ""} ⨉ ${titleB.slice(0, 20)}${titleB.length > 20 ? "…" : ""}`,
    resonanceLevel: resonanceLevel(resonanceScore),
    resonanceScore,
    articleIds: [String(a.id || ""), String(b.id || "")],
    articleTitles: [titleA, titleB],
    hiddenNexusTheme: theme,
    sharedBottleneck: bottleneck,
    synergyChain: [
      { step: "01 · 事件 A", sourceArticle: titleA, mechanism: summaryOf(a) },
      { step: "02 · 事件 B", sourceArticle: titleB, mechanism: summaryOf(b) },
      { step: "03 · 交汇信号", sourceArticle: "文本信号比对（非模型推演）", mechanism: overlapDetail },
    ],
    jointImpacts: {
      firstOrder: `共同信号：${overlapDetail}。`,
      secondOrder: `涉及分类：A=${a.category}，B=${b.category}；来源：${sourceName(a)} × ${sourceName(b)}。`,
      thirdOrder: "建议将上述重叠信号加入专题跟踪，观察其在语料中的后续演变，而非直接外推预测。",
    },
    aiJointVerdict: `自动信号比对（可复核）：共享标签 ${sharedTags.length} 个、文本相似度 ${Math.round(contentSimilarity * 100)}%、双方含深层字段：${bothDeep ? "是" : "否"}，加权共振分 ${resonanceScore}/100。本结论为信号重叠统计，非因果断言。`,
    recommendedAction: `人工复核「${overlapDetail}」是否构成实质关联；可在详情页执行 AI 深度补全后再比对。`,
    signal: { sharedTags, contentSimilarity, bothDeep, sources: [sourceName(a), sourceName(b)] },
  };
}

/** 深层字段优先，再补最近外部条目，最多两两比较 40 篇，取得分大于 0 的前 5 对。 */
export function deriveCrossEventTop(articles: ArrivalArticle[]): CrossEventSnapshot {
  const curated = articles.filter((article) => article.spectrumLayers && article.spectrumLayers.length > 0);
  const externals = articles.filter((article) => !curated.includes(article)).slice(-36);
  const pool = [...curated, ...externals];
  const limit = Math.min(pool.length, 40);
  const pairs: CrossEventPair[] = [];
  for (let i = 0; i < limit; i += 1) {
    for (let j = i + 1; j < limit; j += 1) {
      const pair = analyzePair(pool[i], pool[j]);
      if (pair.resonanceScore > 0) pairs.push(pair);
    }
  }
  pairs.sort((a, b) => b.resonanceScore - a.resonanceScore);
  return { corpusSize: articles.length, poolSize: limit, pairs: pairs.slice(0, 5) };
}
