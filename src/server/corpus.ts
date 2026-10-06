import path from "node:path";
import fs from "node:fs";
import { CURATED_ARTICLES } from "../data/newsData";
import { canonicalFeedUrl, normalizedTitleKey, type RawFeedItem } from "./feeds";
import { NO_PERSIST, isDemoDataEnabled } from "./settings";
import { zhFullDate, isoToday, nowHHmm } from "./date";
import { parseArticleDate } from "../utils/articleTime";
import { sourceGroupKey } from "../utils/sourceGrouping";
import { normalizeEntityMentions } from "../utils/entityGraph";
import { normalizeRegionMentions, inferDefaultRegionMentions, inferDefaultEntityMentions } from "../utils/regionSemantics";
import {
  backupDatabase,
  databaseCacheEpoch,
  databaseFile,
  loadArticlesFromDatabase,
  persistArticlesToDatabase,
} from "./database";

const CORPUS_FILE = path.join(process.cwd(), "data", "corpus.json");

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
const BACKUP_KEEP = 10;
const demoDataEnabled = () => isDemoDataEnabled();
const LEGACY_DEMO_IDS = new Set((CURATED_ARTICLES as any[]).map((article) => String(article?.id || "")));

function getFreshCuratedArticles(): any[] {
  const todayZh = zhFullDate(new Date());
  const todayIso = isoToday(new Date());
  const nowTime = nowHHmm(new Date());
  return (CURATED_ARTICLES as any[]).map((art, idx) => {
    // 动态调整其中前几篇的发布时间为今日与近3日，确保「今日速览」与精选流有数据呈现
    const dateOffset = idx % 3; // 0=今天, 1=昨天, 2=前天
    const d = new Date();
    d.setDate(d.getDate() - dateOffset);
    const dateZh = zhFullDate(d);
    const dateIso = isoToday(d);
    return {
      ...art,
      date: dateZh,
      publishedAt: `${dateIso}T${nowTime}:00.000Z`,
      sourceDate: `${dateIso} ${nowTime}`,
      timeAgo: dateOffset === 0 ? '刚刚' : `${dateOffset}天前`,
      regionMentions: Array.isArray(art.regionMentions) && art.regionMentions.length > 0 ? art.regionMentions : inferDefaultRegionMentions(art),
      entityMentions: Array.isArray(art.entityMentions) && art.entityMentions.length > 0 ? art.entityMentions : inferDefaultEntityMentions(art),
    };
  });
}

function withoutLegacyDemo(items: any[]): any[] {
  if (demoDataEnabled()) return items;
  return items.filter((article) => !LEGACY_DEMO_IDS.has(String(article?.id || "")));
}

function withLegacyAiMetadata(items: any[]): { items: any[]; changed: number } {
  let changed = 0;
  const fields = ["sevenElements", "logicTree", "spectrumLayers", "evidenceChain"];
  const next = items.map((article) => {
    if (article?.aiFieldMeta && Object.keys(article.aiFieldMeta).length > 0) return article;
    const present = fields.filter((field) =>
      Array.isArray(article?.[field]) ? article[field].length > 0 : Boolean(article?.[field])
    );
    if (present.length === 0) return article;
    changed += 1;
    const meta = {
      provider: "unknown",
      model: "legacy-unknown",
      promptVersion: "legacy-unversioned",
      method: "legacy_unknown",
      certificationStandard: "unverified",
      calibrationStatus: "uncalibrated",
    };
    return {
      ...article,
      aiFieldMeta: {
        ...(article.aiFieldMeta || {}),
        ...Object.fromEntries(present.map((field) => [field, meta])),
      },
    };
  });
  return { items: next, changed };
}

function withCanonicalEntityMentions(items: any[]): { items: any[]; changed: number } {
  let changed = 0;
  const next = items.map((article) => {
    const raw = Array.isArray(article?.entityMentions) && article.entityMentions.length > 0
      ? article.entityMentions
      : inferDefaultEntityMentions(article);
    const normalized = normalizeEntityMentions(raw, {
      title: article.title,
      summary: article.summary,
    });
    if (JSON.stringify(normalized) === JSON.stringify(article.entityMentions)) return article;
    changed += 1;
    return { ...article, entityMentions: normalized };
  });
  return { items: next, changed };
}

function withCanonicalRegionMentions(items: any[]): { items: any[]; changed: number } {
  let changed = 0;
  const next = items.map((article) => {
    const raw = Array.isArray(article?.regionMentions) && article.regionMentions.length > 0
      ? article.regionMentions
      : inferDefaultRegionMentions(article);
    const normalized = normalizeRegionMentions(raw);
    if (JSON.stringify(normalized) === JSON.stringify(article.regionMentions)) return article;
    changed += 1;
    return { ...article, regionMentions: normalized };
  });
  return { items: next, changed };
}

function dedupeCanonicalUrls(items: any[]): { items: any[]; changed: number } {
  const byUrl = new Map<string, any>();
  const passthrough: any[] = [];
  let changed = 0;
  for (const article of items) {
    const key = article?.sourceUrl ? canonicalFeedUrl(article.sourceUrl) : "";
    if (!key) {
      passthrough.push(article);
      continue;
    }
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, article);
      continue;
    }
    changed += 1;
    const existingTime = parseArticleDate(existing.publishedAt || existing.sourceDate || existing.date) ?? 0;
    const currentTime = parseArticleDate(article.publishedAt || article.sourceDate || article.date) ?? 0;
    const keep = currentTime > existingTime ? article : existing;
    const duplicate = keep === article ? existing : article;
    const occurrences = [
      ...(keep.sourceOccurrences || []),
      ...(duplicate.sourceOccurrences || []),
    ];
    const unique = new Map(
      occurrences
        .filter(Boolean)
        .map((item: any) => [`${item.sourceName}\u0000${item.sourceUrl || ""}`, item])
    );
    keep.sourceOccurrences = [...unique.values()];
    if (keep.sourceOccurrences.length > 1) {
      keep.sourceCount = new Set(
        keep.sourceOccurrences
          .map((item: any) => sourceGroupKey(item?.sourceName, item?.sourceUrl))
          .filter(Boolean)
      ).size;
    }
    byUrl.set(key, keep);
  }
  return { items: [...byUrl.values(), ...passthrough], changed };
}

/** 语料备份（自动保留最近 10 份）：reset / 大批量写回前调用，避免误删不可恢复 */
export function backupCorpus(reason = "manual"): string | null {
  if (NO_PERSIST) return null;
  try {
    flushCorpusSnapshot();
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const dest = path.join(BACKUP_DIR, `corpus-${stamp}-${reason}.json`);
    if (fs.existsSync(CORPUS_FILE)) {
      fs.copyFileSync(CORPUS_FILE, dest);
    }
    const dbDest = path.join(BACKUP_DIR, `corpus-${stamp}-${reason}.db`);
    backupDatabase(dbDest);
    if (!fs.existsSync(dest) && !fs.existsSync(dbDest)) return null;
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("corpus-")).sort();
    const databaseBackups = files.filter((f) => f.endsWith(".db"));
    const keepBases = databaseBackups.slice(Math.max(0, databaseBackups.length - BACKUP_KEEP));
    for (const file of files) {
      const keep = keepBases.some((base) => file === base || file.startsWith(`${base}.`));
      if (!keep && (file.endsWith(".json") || file.endsWith(".db") || file.endsWith(".manifest.json"))) {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      }
    }
    return dest;
  } catch (e) {
    console.error("backupCorpus failed:", e);
    return null;
  }
}

export function backupDirectory(): string {
  return BACKUP_DIR;
}

const CORPUS_JSON_DEBOUNCE_MS = 1500;
let corpusJsonTimer: ReturnType<typeof setTimeout> | null = null;
let corpusJsonPending = false;

function writeCorpusJsonFile(items: any[]): void {
  fs.mkdirSync(path.dirname(CORPUS_FILE), { recursive: true });
  const temp = `${CORPUS_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(items), "utf-8");
  fs.renameSync(temp, CORPUS_FILE);
}

function writeCorpusJsonSnapshot(): void {
  writeCorpusJsonFile(serverCorpus);
}

/** 立刻写出兼容用的 corpus.json。SQLite 仍在 persistCorpus 里同步落盘。 */
export function flushCorpusSnapshot(): void {
  if (corpusJsonTimer) {
    clearTimeout(corpusJsonTimer);
    corpusJsonTimer = null;
  }
  if (!corpusJsonPending || NO_PERSIST) {
    corpusJsonPending = false;
    return;
  }
  corpusJsonPending = false;
  try {
    writeCorpusJsonSnapshot();
  } catch (e) {
    corpusJsonPending = true;
    console.error("failed to persist corpus snapshot:", e);
  }
}

function scheduleCorpusSnapshot(): void {
  corpusJsonPending = true;
  if (corpusJsonTimer) clearTimeout(corpusJsonTimer);
  corpusJsonTimer = setTimeout(() => {
    corpusJsonTimer = null;
    flushCorpusSnapshot();
  }, CORPUS_JSON_DEBOUNCE_MS);
  corpusJsonTimer.unref?.();
}

process.once("beforeExit", () => {
  flushCorpusSnapshot();
});

let articlesById = new Map<string, any>();
let dirtyArticleIds: Set<string> | null = new Set();
let seenDatabaseEpoch = 0;

function indexCorpus(items: any[]): void {
  articlesById = new Map();
  for (const article of items) {
    const id = String(article?.id || "");
    if (id) articlesById.set(id, article);
  }
}

function syncDirtySetWithDatabase(): void {
  const epoch = databaseCacheEpoch();
  if (epoch !== seenDatabaseEpoch) {
    seenDatabaseEpoch = epoch;
    dirtyArticleIds = null;
  }
}

/** 文章被改过之后调用。连接换过或整库重置时会忽略个别 id，下次保存改为全量对哈希。 */
export function markCorpusArticlesDirty(articles: Iterable<any>): void {
  for (const article of articles) {
    const id = String(article?.id || "");
    if (!id) continue;
    articlesById.set(id, article);
    if (dirtyArticleIds) dirtyArticleIds.add(id);
  }
}

export function persistCorpus(): void {
  corpusRevision += 1;
  if (NO_PERSIST) {
    dirtyArticleIds = new Set();
    return;
  }
  syncDirtySetWithDatabase();
  try {
    persistArticlesToDatabase(serverCorpus, dirtyArticleIds);
  } catch (e) {
    console.error("failed to persist corpus:", e);
    return;
  }
  dirtyArticleIds = new Set();
  seenDatabaseEpoch = databaseCacheEpoch();
  scheduleCorpusSnapshot();
}

function loadCorpus(): any[] {
  const freshCurated = getFreshCuratedArticles();

  if (NO_PERSIST) {
    return demoDataEnabled() ? freshCurated : [];
  }
  const fromDatabase = loadArticlesFromDatabase();
  if (fromDatabase !== null) {
    let cleaned = withoutLegacyDemo(fromDatabase);
    const removedDemo = fromDatabase.length - cleaned.length;
    if (demoDataEnabled()) {
      const dbMap = new Map<string, any>(cleaned.map((art) => [String(art?.id || ""), art]));
      for (const cur of freshCurated) {
        const curId = String(cur.id || "");
        if (dbMap.has(curId)) {
          const existing = dbMap.get(curId)!;
          dbMap.set(curId, {
            ...cur,
            ...existing,
            sourceUrl: existing.sourceUrl || cur.sourceUrl,
            sourceName: existing.sourceName || cur.sourceName,
            sourceDate: existing.sourceDate || cur.sourceDate,
          });
        } else {
          dbMap.set(curId, cur);
        }
      }
      cleaned = Array.from(dbMap.values());
    }
    if (cleaned.length === 0 && demoDataEnabled()) {
      persistArticlesToDatabase(freshCurated);
      return freshCurated;
    }
    const deduped = dedupeCanonicalUrls(cleaned);
    const regions = withCanonicalRegionMentions(deduped.items);
    const entities = withCanonicalEntityMentions(regions.items);
    const migrated = withLegacyAiMetadata(entities.items);
    const structuralChange = removedDemo
      + deduped.changed
      + regions.changed
      + entities.changed
      + migrated.changed;
    if (!NO_PERSIST) {
      persistArticlesToDatabase(migrated.items);
      if (demoDataEnabled() || structuralChange > 0) writeCorpusJsonFile(migrated.items);
    }
    return migrated.items;
  }
  try {
    if (fs.existsSync(CORPUS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(CORPUS_FILE, "utf-8"));
      if (Array.isArray(arr) && arr.length > 0) {
        const cleaned = withoutLegacyDemo(arr);
        const deduped = dedupeCanonicalUrls(cleaned);
        const regions = withCanonicalRegionMentions(deduped.items);
        const entities = withCanonicalEntityMentions(regions.items);
        const migrated = withLegacyAiMetadata(entities.items);
        const structuralChange = (cleaned.length !== arr.length ? 1 : 0)
          + deduped.changed
          + regions.changed
          + entities.changed
          + migrated.changed;
        if (!NO_PERSIST && structuralChange > 0) {
          backupCorpus("remove-legacy-demo");
        }
        persistArticlesToDatabase(migrated.items);
        if (structuralChange > 0) writeCorpusJsonFile(migrated.items);
        return migrated.items;
      }
    }
  } catch (e) {
    console.error("corpus file unreadable, returning empty corpus:", e);
  }

  if (demoDataEnabled()) {
    persistArticlesToDatabase(freshCurated);
    return freshCurated;
  }
  return [];
}

export let serverCorpus: any[] = loadCorpus();
indexCorpus(serverCorpus);
dirtyArticleIds = new Set();
seenDatabaseEpoch = databaseCacheEpoch();
export let lastIngest: any = null;
let corpusRevision = 0;

export function getCorpusRevision(): number {
  return corpusRevision;
}

export function toFeedArticle(raw: RawFeedItem, index: number): any {
  let sourceName = "外部信源";
  try {
    sourceName = new URL(raw.link).hostname.replace(/^www\./, "");
  } catch {
    /* 保持默认 */
  }
  const summary = raw.description || raw.title;
  return {
    id: `feed-${Date.now()}-${index}`,
    title: raw.title,
    subtitle: "",
    oneSentenceVerdict: "",
    category: "外部信源",
    tags: [],
    date: zhFullDate(new Date()),
    timeAgo: "刚刚",
    readTimeMinutes: 3,
    summary,
    coreQuote: "",
    quoteAuthor: "",
    sourceName,
    sourceDate: `${isoToday(new Date())} ${nowHHmm(new Date())}`,
    sourceCount: 1,
    impactScope: "特定行业",
    sourceUrl: raw.link,
    sourceOccurrences: [{
      sourceName,
      sourceUrl: raw.link,
      publishedAt: raw.pubDate || null,
      title: raw.title,
    }],
    isExternal: true,
    publishedAt: raw.pubDate || null,
    tongsuSummary: { simpleSay: summary, whyExplanation: "", whatItMeans: "", jargonTerms: [] },
    dehydratedItems: {
      coreEntity: sourceName,
      keyAction: raw.title,
      relatedCount: 0,
      coreShifts: [],
      impactHighlights: [],
    },
    spectrumLayers: [],
  };
}

export function appendFeedItems(
  items: RawFeedItem[],
  maxAgeDays: number,
  meta: {
    urls?: string[];
    errors?: string[];
    dedupedSkipped?: number;
    sourceResults?: Array<{
      url: string;
      ok: boolean;
      attempts: number;
      itemCount: number;
      durationMs: number;
      error?: string;
    }>;
  } = {}
): { added: number; skipped: number; skippedStale: number; mergedSources: number; corpusSize: number } {
  const existingByTitle = new Map<string, any>();
  const existingByUrl = new Map<string, any>();
  for (const article of serverCorpus) {
    const titleKey = normalizedTitleKey(article.title);
    if (titleKey) existingByTitle.set(titleKey, article);
    if (article.sourceUrl) existingByUrl.set(canonicalFeedUrl(article.sourceUrl), article);
  }
  let localAdded = 0;
  let skipped = 0;
  let skippedStale = 0;
  let mergedSources = 0;
  for (const raw of items) {
    let ageDays: number | null = null;
    if (raw.pubDate) {
      const ts = parseArticleDate(raw.pubDate);
      if (ts !== null) ageDays = (Date.now() - ts) / (24 * 3600 * 1000);
    }
    if (ageDays !== null && ageDays > maxAgeDays) {
      skippedStale += 1;
      continue;
    }
    const titleKey = normalizedTitleKey(raw.title);
    const urlKey = canonicalFeedUrl(raw.link);
    if (!titleKey || !urlKey || existingByUrl.has(urlKey)) {
      skipped += 1;
      continue;
    }
    const existingArticle = existingByTitle.get(titleKey);
    if (existingArticle) {
      const occurrences = Array.isArray(existingArticle.sourceOccurrences)
        ? existingArticle.sourceOccurrences
        : [{
            sourceName: existingArticle.sourceName || "外部信源",
            sourceUrl: existingArticle.sourceUrl || "",
            publishedAt: existingArticle.publishedAt || null,
            title: existingArticle.title,
          }];
      let sourceName = "外部信源";
      try {
        sourceName = new URL(raw.link).hostname.replace(/^www\./, "");
      } catch {
        /* 保持默认 */
      }
      const knownPublisher = [
        existingArticle.sourceName,
        ...occurrences.map((item: any) => item?.sourceName),
      ].includes(sourceName);
      if (knownPublisher) {
        skipped += 1;
        continue;
      }
      occurrences.push({
        sourceName,
        sourceUrl: raw.link,
        publishedAt: raw.pubDate || null,
        title: raw.title,
      });
      existingArticle.sourceOccurrences = occurrences;
      existingArticle.sourceCount = new Set(
        occurrences
          .map((item: any) => sourceGroupKey(item?.sourceName, item?.sourceUrl))
          .filter(Boolean)
      ).size;
      existingByUrl.set(urlKey, existingArticle);
      markCorpusArticlesDirty([existingArticle]);
      mergedSources += 1;
      continue;
    }
    const created = toFeedArticle(raw, localAdded);
    serverCorpus.push(created);
    markCorpusArticlesDirty([created]);
    existingByTitle.set(titleKey, created);
    existingByUrl.set(urlKey, created);
    localAdded += 1;
  }
  const result = { added: localAdded, skipped, skippedStale, mergedSources, corpusSize: serverCorpus.length };
  // 记录抓取元信息（含失败源 errors）：不可达源必须可见，不能静默丢弃
  lastIngest = {
    at: new Date().toISOString(),
    urls: meta.urls || [],
    ...result,
    dedupedByTitle: meta.dedupedSkipped ?? 0,
    mergedSources,
    maxAgeDays,
    errors: meta.errors || [],
    sourceResults: meta.sourceResults || [],
  };
  persistCorpus();
  return result;
}

export function resetCorpus(): void {
  serverCorpus = demoDataEnabled() ? (CURATED_ARTICLES as any[]).map((a) => ({ ...a })) : [];
  indexCorpus(serverCorpus);
  dirtyArticleIds = null;
  lastIngest = null;
  persistCorpus();
  flushCorpusSnapshot();
}

export function pruneExternalCorpus(maxAgeDays = 30): number {
  if (NO_PERSIST) return 0;
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 3600 * 1000;
  const before = serverCorpus.length;
  serverCorpus = serverCorpus.filter((a) => {
    if (!a?.isExternal) return true;
    if (!a?.publishedAt) return true;
    const ts = parseArticleDate(String(a.publishedAt));
    return ts === null || now - ts <= maxAgeMs;
  });
  indexCorpus(serverCorpus);
  const removed = before - serverCorpus.length;
  if (removed > 0) persistCorpus();
  return removed;
}

export function corpusSortTime(a: any): number {
  if (a?.publishedAt) {
    const ts = parseArticleDate(String(a.publishedAt));
    if (ts !== null) return ts;
  }
  if (a?.sourceDate) {
    const ts = parseArticleDate(String(a.sourceDate));
    if (ts !== null) return ts;
  }
  if (a?.date) {
    const ts = parseArticleDate(String(a.date));
    if (ts !== null) return ts;
  }
  return 0;
}

export function findCorpusArticle(articleId: string): any | undefined {
  return articlesById.get(String(articleId));
}

/**
 * 将用户贴链接 / 贴正文解读得到的文章写入运行时语料。
 * 同 id 则覆盖合并；新文插到队首。返回落盘后的文章对象。
 */
export function appendUserArticle(article: any): any {
  const id = String(article?.id || `user-${Date.now()}`);
  const next = {
    ...article,
    id,
    isCustom: true,
    tags: Array.isArray(article?.tags)
      ? Array.from(new Set([...article.tags.map(String), "用户投递"]))
      : ["用户投递"],
  };
  const existing = articlesById.get(id);
  if (existing) {
    Object.assign(existing, next);
    markCorpusArticlesDirty([existing]);
    persistCorpus();
    return existing;
  }
  serverCorpus.unshift(next);
  markCorpusArticlesDirty([next]);
  persistCorpus();
  return next;
}
