// 见微 · 轻量日期工具（避免硬编码“2026年9月1日”之类的演示日期随演示世界失真）
// 说明：浏览器端直接用本模块；server.ts 因构建独立，自带一份等价实现。

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** 例如：9月2日 星期二 */
export function todayLabel(d: Date = new Date()): string {
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]}`;
}

/** 例如：9月2日（无星期） */
export function todayShort(d: Date = new Date()): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 例如：2026年9月2日 */
export function todayFullZh(d: Date = new Date()): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 例如：2026-09-02 */
export function isoToday(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 例如：09:15（本地时间，24h） */
export function nowHHmm(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}
