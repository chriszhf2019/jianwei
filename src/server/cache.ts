export function djb2(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX_PER_MIN = Number(process.env.RATE_LIMIT_MAX || 300);
const hitCounts = new Map<string, number[]>();

export function applyRateLimit(req: { ip?: string; socket?: { remoteAddress?: string } }, res: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void): void {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const hits = (hitCounts.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= RATE_MAX_PER_MIN) {
    res.status(429).json({ error: "请求过于频繁，请稍后再试 (rate limited)" });
    return;
  }
  hits.push(now);
  hitCounts.set(ip, hits);
  next();
}

const ENRICH_TTL_MS = Number(process.env.ENRICH_TTL_MS || 24 * 60 * 60 * 1000);
const enrichCache = new Map<string, { at: number; data: unknown }>();

export function enrichKey(body: {
  articleId?: string;
  title?: string;
  content?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
}): string {
  const parts = [
    String(body?.articleId || "").trim(),
    String(body?.title || "").trim(),
    String(body?.content || "").trim(),
    String(body?.provider || ""),
    String(body?.model || ""),
    String(body?.promptVersion || ""),
  ];
  return `enrich:${djb2(parts.join("\n"))}`;
}

export function cacheGet(key: string): unknown | undefined {
  const entry = enrichCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > ENRICH_TTL_MS) {
    enrichCache.delete(key);
    return undefined;
  }
  enrichCache.delete(key);
  enrichCache.set(key, entry);
  return entry.data;
}

export function cacheSet(key: string, data: unknown): void {
  enrichCache.delete(key);
  enrichCache.set(key, { at: Date.now(), data });
  while (enrichCache.size > 1000) {
    const oldest = enrichCache.keys().next().value;
    if (oldest === undefined) break;
    enrichCache.delete(oldest);
  }
}

export function clearEnrichCache(): void {
  enrichCache.clear();
}

const inFlightAI = new Map<string, Promise<unknown>>();

export async function getOrCreateCached<T>(
  key: string,
  loader: () => Promise<T>,
  options: { force?: boolean } = {}
): Promise<{ data: T; cached: boolean; deduped: boolean }> {
  if (!options.force) {
    const cached = cacheGet(key);
    if (cached !== undefined) return { data: cached as T, cached: true, deduped: false };
  }
  const existing = inFlightAI.get(key);
  if (existing) {
    return { data: await existing as T, cached: false, deduped: true };
  }
  const pending = loader()
    .then((data) => {
      cacheSet(key, data);
      return data;
    })
    .finally(() => {
      inFlightAI.delete(key);
    });
  inFlightAI.set(key, pending);
  return { data: await pending, cached: false, deduped: false };
}

export const PREDICT_TTL_MS = Number(process.env.PREDICT_TTL_MS || 10 * 60 * 1000);
const predictCache = new Map<string, { at: number; data: unknown }>();
const inFlightPredict = new Map<string, Promise<unknown>>();

export function predictKey(input: {
  question: string;
  articleId?: string;
  articleTitle?: string;
  modelChoice?: string;
  provider?: string;
  model?: string;
  userDirection?: string;
  userConfidence?: number;
  premises?: unknown;
  falsifiableIndicator?: string;
  articleContext?: unknown;
  questionOptions?: unknown;
}): string {
  const question = String(input?.question || "").trim();
  if (!question) return "";
  const context = [
    question,
    input.articleId || "",
    input.articleTitle || "",
    input.modelChoice || "",
    input.provider || "",
    input.model || "",
    input.userDirection || "",
    String(input.userConfidence ?? ""),
    JSON.stringify(input.premises || []),
    input.falsifiableIndicator || "",
    JSON.stringify(input.articleContext || {}),
    JSON.stringify(input.questionOptions || {}),
  ].join("\n");
  return `q:${djb2(context)}`;
}

export function predictGet(key: string): unknown | undefined {
  const entry = predictCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > PREDICT_TTL_MS) {
    predictCache.delete(key);
    return undefined;
  }
  predictCache.delete(key);
  predictCache.set(key, entry);
  return entry.data;
}

export function predictSet(key: string, data: unknown): void {
  predictCache.delete(key);
  predictCache.set(key, { at: Date.now(), data });
  while (predictCache.size > 500) {
    const oldest = predictCache.keys().next().value;
    if (oldest === undefined) break;
    predictCache.delete(oldest);
  }
}

export function clearPredictCache(): void {
  predictCache.clear();
  inFlightPredict.clear();
}

export function clearInFlightAI(): void {
  inFlightAI.clear();
  inFlightPredict.clear();
}

export async function getOrCreatePredict<T>(
  key: string,
  loader: () => Promise<T>
): Promise<{ data: T; cached: boolean; deduped: boolean }> {
  const cached = predictGet(key);
  if (cached !== undefined) return { data: cached as T, cached: true, deduped: false };
  const existing = inFlightPredict.get(key);
  if (existing) return { data: await existing as T, cached: false, deduped: true };
  const pending = loader()
    .then((data) => {
      predictSet(key, data);
      return data;
    })
    .finally(() => {
      inFlightPredict.delete(key);
    });
  inFlightPredict.set(key, pending);
  return { data: await pending, cached: false, deduped: false };
}

export function cacheSizes(): {
  enrich: number;
  predict: number;
  inFlight: number;
  ttlMs: number;
  predictTtlMs: number;
} {
  return {
    enrich: enrichCache.size,
    predict: predictCache.size,
    inFlight: inFlightAI.size + inFlightPredict.size,
    ttlMs: ENRICH_TTL_MS,
    predictTtlMs: PREDICT_TTL_MS,
  };
}
