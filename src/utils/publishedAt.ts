// 将 RSS/外部条目的 publishedAt 解析为本地时区“小时”的工具（无第三方依赖）。
// 用于 24H 到达热力、密度曲线等真实时间统计。

const RFC_MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** 返回本地小时 0-23；解析失败返回 null */
export function parseLocalHour(publishedAt: string): number | null {
  const raw = String(publishedAt || '').trim();
  if (!raw) return null;

  const tryParsers: Array<(s: string) => Date> = [
    (s) => new Date(s), // ISO 与多数可解析格式
    (s) => {
      // RSS RFC822：Tue, 02 Sep 2026 08:00:00 GMT
      const m = s.match(/^.*?(\d{1,2}) (\w{3}) (\d{4}) (\d{2}):(\d{2}):(\d{2})/);
      if (!m) throw new Error('unparsed');
      const d = new Date(Date.UTC(+m[3], RFC_MONTHS[m[2]], +m[1], +m[4], +m[5], +m[6]));
      return /GMT|UTC/i.test(s) ? d : new Date(s);
    },
  ];

  for (const parse of tryParsers) {
    try {
      const d = parse(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.getHours();
      }
    } catch {
      /* try next */
    }
  }
  return null;
}
