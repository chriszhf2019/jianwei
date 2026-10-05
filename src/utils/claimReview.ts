export interface ClaimReviewRecord {
  claimReviewed: string;
  url?: string;
  authorName?: string;
  datePublished?: string;
  ratingLabel?: string;
  ratingValue?: number;
  bestRating?: number;
  worstRating?: number;
}

const MAX_REVIEWS = 20;
const MAX_TEXT = 500;

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function typeNames(node: Record<string, unknown>): string[] {
  const raw = node['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((item) => typeof item === 'string');
  return [];
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  const obj = asObject(value);
  if (!obj) return '';
  for (const key of ['name', 'text', '@value']) {
    if (typeof obj[key] === 'string') return String(obj[key]).trim();
  }
  return '';
}

function httpUrl(value: unknown): string | undefined {
  const raw = textOf(value);
  if (!/^https?:\/\//i.test(raw)) return undefined;
  return raw.slice(0, 2000);
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function authorName(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map(authorName).filter(Boolean).slice(0, 3).join('、');
  }
  return textOf(value);
}

function readReview(node: Record<string, unknown>): ClaimReviewRecord | null {
  const claimReviewed = textOf(node.claimReviewed).slice(0, MAX_TEXT);
  if (!claimReviewed) return null;
  const rating = asObject(node.reviewRating);
  const record: ClaimReviewRecord = { claimReviewed };
  const url = httpUrl(node.url);
  const author = authorName(node.author).slice(0, 200);
  const datePublished = textOf(node.datePublished).slice(0, 40);
  if (url) record.url = url;
  if (author) record.authorName = author;
  if (datePublished) record.datePublished = datePublished;
  if (rating) {
    const label = (textOf(rating.alternateName) || textOf(rating.name)).slice(0, 80);
    const ratingValue = finiteNumber(rating.ratingValue);
    const bestRating = finiteNumber(rating.bestRating);
    const worstRating = finiteNumber(rating.worstRating);
    if (label) record.ratingLabel = label;
    if (ratingValue !== undefined) record.ratingValue = ratingValue;
    if (bestRating !== undefined) record.bestRating = bestRating;
    if (worstRating !== undefined) record.worstRating = worstRating;
  }
  return record;
}

function walk(node: unknown, out: ClaimReviewRecord[], seen: Set<string>, depth: number): void {
  if (depth > 8 || out.length >= MAX_REVIEWS) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, out, seen, depth + 1);
    return;
  }
  const obj = asObject(node);
  if (!obj) return;
  const types = typeNames(obj);
  if (types.some((name) => name === 'ClaimReview' || name.endsWith('/ClaimReview'))) {
    const review = readReview(obj);
    if (review) {
      const key = `${review.claimReviewed}\n${review.url || ''}\n${review.authorName || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(review);
      }
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') walk(value, out, seen, depth + 1);
  }
}

/** 只读取页面里的 schema.org ClaimReview。没有该标记时返回空数组。 */
export function extractClaimReviews(html: string): ClaimReviewRecord[] {
  const source = String(html || '');
  const out: ClaimReviewRecord[] = [];
  const seen = new Set<string>();
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of source.matchAll(pattern)) {
    try {
      walk(JSON.parse(match[1]), out, seen, 0);
    } catch {
      /* 损坏的 JSON-LD 跳过，不猜测声明。 */
    }
  }
  return out;
}
