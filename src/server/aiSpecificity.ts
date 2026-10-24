/**
 * 输出具体性校验：识别「换个新闻也成立」的模板话，供服务端重试/拒收。
 * 纯函数，可单测。规则刻意保守：只有「零实体零数字」或「套话且几乎无输入重合」才判失败。
 */

/** 只列广为人知的行业套话；出现这些词不等于失败，但要结合输入重合度判断。 */
export const GENERIC_PHRASES = [
  '产业周期',
  '市场竞争加剧',
  '技术进步驱动',
  '地缘政治影响',
  '供需失衡',
  '行业集中度提升',
  '政策支持明确',
  '结构性调整',
  '资本市场波动',
  '长期向好',
  '不确定性增加',
  '持续关注',
];

/** 高频双字词不做「具体性」证据。 */
const STOP_BIGRAMS = new Set([
  '公司', '市场', '行业', '政策', '中国', '美国', '经济', '增长', '下降', '同比', '环比',
  '季度', '发布', '表示', '相关', '影响', '分析', '数据', '报告', '新闻', '媒体', '今日',
  '消息', '我们', '他们', '以及', '进行', '已经', '可能', '需要', '重要', '关注', '认为',
]);

function flatten(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(flatten).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(flatten).join(' ');
  return '';
}

function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d+(?:\.\d+)?%?/g)) out.add(m[0]);
  return out;
}

function cjkTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  const cleaned = text.replace(/[^一-龥A-Za-z0-9.%]/g, ' ');
  for (const run of cleaned.split(/\s+/)) {
    if (!run) continue;
    if (/^[A-Za-z0-9.%]+$/.test(run)) {
      if (run.length >= 3) tokens.add(run.toLowerCase());
      continue;
    }
    for (let i = 0; i + 2 <= run.length; i += 1) {
      const bg = run.slice(i, i + 2);
      if (!STOP_BIGRAMS.has(bg)) tokens.add(bg);
    }
  }
  return tokens;
}

export interface SpecificityResult {
  issues: string[];
  numberHits: number;
  tokenHits: number;
  genericHit: string | null;
}
/** 校验一段 AI 输出是否「足够具体」。输入材料过短（<40 字）时跳过，避免误伤。 */
export function findSpecificityIssues(value: unknown, source: string): SpecificityResult {
  const output = flatten(value).trim();
  const src = String(source || '').trim();
  if (!output) return { issues: ['输出为空'], numberHits: 0, tokenHits: 0, genericHit: null };
  if (src.length < 40) return { issues: [], numberHits: 0, tokenHits: 0, genericHit: null };

  const srcNumbers = numbersIn(src);
  const outNumbers = numbersIn(output);
  let numberHits = 0;
  for (const n of outNumbers) if (srcNumbers.has(n)) numberHits += 1;

  const srcTokens = cjkTokens(src);
  const outTokens = cjkTokens(output);
  let tokenHits = 0;
  for (const t of outTokens) if (srcTokens.has(t)) tokenHits += 1;

  const genericHit = GENERIC_PHRASES.find((p) => output.includes(p)) || null;

  const issues: string[] = [];
  if (numberHits === 0 && tokenHits < 2) {
    issues.push('未引用输入材料中的具体实体、数字或动作');
  } else if (genericHit && numberHits === 0 && tokenHits < 3) {
    issues.push(`出现泛化套话「${genericHit}」且缺少具体证据`);
  }
  return { issues, numberHits, tokenHits, genericHit };
}

/** 深度分析中允许被「过泛就置空」的字段（点路径）。 */
const CHECKED_PATHS: Array<{ label: string; path: string[] }> = [
  { label: 'oneSentenceVerdict', path: ['oneSentenceVerdict'] },
  { label: 'summary', path: ['summary'] },
  { label: 'subtitle', path: ['subtitle'] },
  { label: 'coreLogic.essence', path: ['coreLogic', 'essence'] },
  { label: 'bullBearDebate.coreDispute', path: ['bullBearDebate', 'coreDispute'] },
  { label: 'sevenElements.why', path: ['sevenElements', 'why'] },
  { label: 'sevenElements.soWhat', path: ['sevenElements', 'soWhat'] },
  { label: 'tongsuSummary.simpleSay', path: ['tongsuSummary', 'simpleSay'] },
  { label: 'dehydratedItems.keyAction', path: ['dehydratedItems', 'keyAction'] },
];

export interface StripResult {
  payload: any;
  strippedFields: string[];
}

/**
 * enrich 输出的字段级具体性清洗：只把「过泛」的字段置空并记录，
 * 不整篇拒收（避免一次不合格让整条分析不可用）。输入过短时不做处理。
 */
export function stripGenericFields(payload: any, source: string): StripResult {
  if (!payload || typeof payload !== 'object') return { payload, strippedFields: [] };
  const strippedFields: string[] = [];
  for (const { label, path } of CHECKED_PATHS) {
    let parent: any = payload;
    for (let i = 0; i < path.length - 1; i += 1) {
      parent = parent?.[path[i]];
      if (!parent || typeof parent !== 'object') break;
    }
    if (!parent || typeof parent !== 'object') continue;
    const key = path[path.length - 1];
    const value = parent[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const check = findSpecificityIssues(value, source);
    if (check.issues.length > 0) {
      parent[key] = '';
      strippedFields.push(label);
    }
  }
  return { payload, strippedFields };
}
