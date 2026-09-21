// 文章时间工具：统一“展示时间”口径 —— 外部条目一律以真实 publishedAt 为准，
// 内置站内条目以其 sourceDate/date 为准；不再使用入库时写死的 timeAgo。
// 提供：排序键（publishedAt→sourceDate→date）、友好相对时间、旧文判定。

export interface ArticleTimeLike {
  publishedAt?: string | null;
  sourceDate?: string;
  date?: string;
  timeAgo?: string;
}

const RFC_MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** 解析各种日期串 → epoch ms。支持：
 *  RFC822 (Fri, 04 Sep 2026 02:33:08 +0000 / GMT)
 *  ISO (2026-09-05T10:16:46Z)
 *  空格分隔 (2025-06-05 20:50:18 / 2026-09-01 10:15)
 *  纯日期 (2026-09-05 / 2025-06-05)
 *  中文 (2026年9月1日)
 * 未知格式返回 null（不猜测、不伪造）。
 */
export function parseArticleDate(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // RFC822：Fri, 04 Sep 2026 02:33:08 +0000 | GMT
  const rfc = s.match(
    /^[A-Za-z]{3},\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s*(GMT|UTC|[+-]\d{4})?/i
  );
  if (rfc) {
    const month = RFC_MONTHS[rfc[2].slice(0, 3)];
    if (month === undefined) return null;
    const d = new Date(Date.UTC(+rfc[3], month, +rfc[1], +rfc[4], +rfc[5], +rfc[6]));
    const tz = rfc[7];
    if (tz && tz !== 'GMT' && tz !== 'UTC') {
      const sign = tz.startsWith('+') ? 1 : -1;
      const hh = +tz.slice(1, 3);
      const mm = +tz.slice(3, 5);
      return d.getTime() - sign * (hh * 3600 + mm * 60) * 1000;
    }
    return d.getTime();
  }

  // 空格分隔日期时间：2026-09-05 20:50:18 / 2025-06-05 20:50:18 / 2026-09-01 10:15
  const spaced = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (spaced) {
    // 无时区：按本地时区解释（与 sourceDate 一致）
    const d = new Date(+spaced[1], +spaced[2] - 1, +spaced[3], +spaced[4], +spaced[5], +spaced[6] || 0);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  // ISO with T
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (iso) {
    let ms: number;
    if (iso[8] && iso[8] !== 'Z') {
      const tz = iso[8].replace(':', '');
      const sign = tz.startsWith('+') ? 1 : -1;
      const off = sign * (+tz.slice(1, 3) * 3600 + +tz.slice(3, 5)) * 1000;
      ms = Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], +iso[6] || 0) - off;
    } else {
      ms = Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], +iso[6] || 0);
    }
    return Number.isNaN(ms) ? null : ms;
  }

  // 纯日期 YYYY-MM-DD（人民网类源）
  const pure = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pure) {
    const d = new Date(+pure[1], +pure[2] - 1, +pure[3]);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  // 中文日期：2026年9月1日
  const zh = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (zh) {
    const d = new Date(+zh[1], +zh[2] - 1, +zh[3]);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  return null;
}

/** 排序时间键：external → publishedAt；站内 → sourceDate → date。均失败返回 0（沉底）。 */
export function articleSortTime(a: ArticleTimeLike): number {
  if (a.publishedAt) {
    const t = parseArticleDate(a.publishedAt);
    if (t !== null) return t;
  }
  if (a.sourceDate) {
    const t = parseArticleDate(a.sourceDate);
    if (t !== null) return t;
  }
  if (a.date) {
    const t = parseArticleDate(a.date);
    if (t !== null) return t;
  }
  return 0;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** 友好相对时间（真实来源）：刚刚 / N分钟前 / N小时前 / 昨天 / N天前 / 直接日期 */
export function formatArticleTime(a: ArticleTimeLike, now = Date.now()): string {
  const ts = articleSortTime(a);
  if (!ts) return a.timeAgo || a.date || '';
  const diff = now - ts;
  if (diff < 0) return '刚刚';
  if (diff < MIN) return '刚刚';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}小时前`;
  if (diff < 2 * DAY) return '昨天';
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}天前`;
  // 超过一周：展示真实日期，避免误导
  return formatDateOnly(ts);
}

/** 展示真实日期（YYYY-MM-DD / 或 yyyy年M月d日） */
export function formatDateOnly(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 旧闻判定：真实时间距今 > N 天（默认 30 天）→ 历史旧文，首页/列表应标注。 */
export function isStaleArticle(a: ArticleTimeLike, maxDays = 30, now = Date.now()): boolean {
  const ts = articleSortTime(a);
  if (!ts) return false;
  return now - ts > maxDays * DAY;
}

/** 判断是否为站内深度示例文（区别于 RSS 外部条目） */
export function isCuratedDemo(a: { isExternal?: boolean; id?: string }): boolean {
  return !a.isExternal && !!a.id && !String(a.id).startsWith('feed-');
}
