// 今日简报工具：从“今日（本地日期）发布的真实条目”中派生——
//  ① 今日热词：命中关注词库（赛道词 + 情感词 + 常见主体词）的文章计数，取 Top N；
//  ② 今日突发：命中“重大突发信号词”的文章（强信号单篇即重大；弱信号需多篇/多源才算）。
// 口径透明可复核：全部为词典/词库命中统计，非 AI 判断。

import { SECTOR_TAXONOMY } from './sectorTaxonomy';
import { POSITIVE_WORDS, NEGATIVE_WORDS } from './corpusMetrics';
import { mediaProfile } from './mediaAuthority';

/** 新闻“套话动词”噪声：对读者没有信息量，不出现在热词里 */
const NEWS_VERB_NOISE = new Set([
  '发布', '宣布', '推出', '表示', '回应', '透露', '更新', '上线', '开放', '召开',
  '开展', '举行', '介绍', '显示', '报道', '消息', '相关', '最新', '今日', '首次',
  '全国', '正式', '举行', '发布a', '合作', '新增',
]);

/** 关注词库候选（保留原始大小写用于展示，匹配时统一小写） */
function focusKeywordPool(): Array<{ raw: string; low: string }> {
  const set = new Map<string, string>(); // low -> raw
  const add = (k: string) => {
    const t = String(k).trim();
    const low = t.toLowerCase();
    if (t.length >= 2 && !NEWS_VERB_NOISE.has(t)) set.set(low, t);
  };
  for (const s of SECTOR_TAXONOMY) for (const k of s.keywords) add(k);
  for (const w of [...POSITIVE_WORDS, ...NEGATIVE_WORDS]) add(w);
  // 常见主体/实体词（人工维护、可复核），用于覆盖词库之外的今日主角
  const extra = [
    '华为', '苹果', '腾讯', '阿里', '京东', '字节', '小米', '比亚迪', '特斯拉', '宁德时代',
    '美联储', '央行', 'OpenAI', 'GPT', '英伟达', '微软', '谷歌', 'Meta',
  ];
  for (const w of extra) add(w);
  return [...set.entries()].map(([low, raw]) => ({ raw, low }));
}

const POOL = focusKeywordPool();

export interface HotWord {
  /** 展示用词（原始大小写） */
  word: string;
  /** 命中该词的文章数 */
  count: number;
}

/** 对给定“今日文章”列表统计热词（默认 Top 8） */
export function topHotWords(
  articles: Array<{ title?: string; summary?: string }>,
  topN = 8
): HotWord[] {
  const counts = new Map<string, number>();
  for (const a of articles) {
    const text = `${a.title || ''} ${a.summary || ''}`.toLowerCase();
    if (!text.trim()) continue;
    const hit = new Set<string>();
    for (const kw of POOL) {
      if (text.includes(kw.low)) hit.add(kw.low);
    }
    for (const low of hit) counts.set(low, (counts.get(low) || 0) + 1);
  }
  const rawOf = (low: string) => POOL.find((p) => p.low === low)?.raw || low;
  return [...counts.entries()]
    .map(([low, n]) => ({ word: rawOf(low), count: n }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, topN);
}

/**
 * 重大突发信号词表，分两级：
 * - STRONG：单篇标题命中即可视为重大（爆炸/袭击/坠机/地震/熔断…本身即事件级）；
 * - WEAK：常见风险词，需 ≥2 篇文章或 ≥2 家来源“相互印证”才显示，避免把单条传闻/回应放大。
 */
const BREAKING_STRONG = [
  '爆炸', '袭击', '枪击', '坠机', '坠毁', '空难', '地震', '海啸', '飓风',
  '开战', '入侵', '宣战', '政变', '暴雷', '熔断', '崩盘', '挤兑', '停牌',
];
const BREAKING_WEAK = [
  '事故', '火灾', '召回', '停产', '破产', '违约', '处罚', '立案', '制裁',
  '泄漏', '宕机', '瘫痪', '裁员', '暴跌', '大涨', '战争', '冲突', '封禁',
];

/**
 * 排除语境：标题同时含这些词 → 多半是“否认/辟谣/防爆演练/背景提及”，不是正在发生的突发事件。
 * 例如「防爆无人机进入爆炸危险等级区域」「回应“校园枪击”谣言」不应被当作突发。
 */
const BREAKING_NEGATE_CONTEXT = [
  '防爆', '拒爆', '辟谣', '否认', '不实', '谣言', '谣传', '演练',
  '未发生', '未造成', '无人伤亡', '无恙', '虚惊', '澄清', '并非属实',
];

/** 否定语境仅当出现在突发词「之前」时才生效：「警方辟谣：网传枪击」不算事件，而「枪击后官方回应」算 */
function negatedBefore(title: string, breakingIndex: number): boolean {
  return BREAKING_NEGATE_CONTEXT.some((ctx) => {
    const i = title.indexOf(ctx);
    return i >= 0 && i < breakingIndex;
  });
}

export interface BreakingHit {
  word: string;
  article: { id?: string; title: string; sourceName?: string; sourceUrl?: string };
  /** 命中该词的文章数 */
  total: number;
  /** 涉及的不同来源站点数 */
  sources: number;
  /** 印证等级：官方单源事件级，或至少两个独立来源。 */
  verification: 'official_single' | 'corroborated';
}

/**
 * 检测“今日重大突发”：只统计“标题”命中（正文命中不算，避免把回应/辟谣误报成事件）。
 * 强信号词只有来自已收录的官方媒体时才允许单源展示；其余强/弱信号均需至少两个独立来源。
 * 这是有意的保守策略：单条未知来源的耸动词汇不应被平台放大成“重大突发”。
 */
export function detectBreaking(
  articles: Array<{ id?: string; title?: string; sourceName?: string; sourceUrl?: string }>
): BreakingHit[] {
  const strong = new Map<string, Array<{ id?: string; title: string; sourceName?: string; sourceUrl?: string }>>();
  const weak = new Map<string, Array<{ id?: string; title: string; sourceName?: string; sourceUrl?: string }>>();
  for (const a of articles) {
    const title = String(a.title || '').trim();
    if (!title) continue;
    const entry = { id: a.id, title, sourceName: a.sourceName, sourceUrl: a.sourceUrl };
    const sWord = BREAKING_STRONG.find((w) => title.includes(w));
    const wWord = sWord ? undefined : BREAKING_WEAK.find((w) => title.includes(w));
    const word = sWord || wWord;
    if (!word) continue;
    // 只有“辟谣/否认/演练/防爆”等否定语境出现在突发词之前，才视为非事件
    if (negatedBefore(title, title.indexOf(word))) continue;
    if (sWord) {
      const arr = strong.get(sWord) || [];
      arr.push(entry);
      strong.set(sWord, arr);
    } else if (wWord) {
      const arr = weak.get(wWord) || [];
      arr.push(entry);
      weak.set(wWord, arr);
    }
  }
  const out: BreakingHit[] = [];
  const hostOf = (a: { sourceName?: string; sourceUrl?: string }) => {
    if (a.sourceName) return a.sourceName;
    try {
      return a.sourceUrl ? new URL(a.sourceUrl).hostname : '';
    } catch {
      return '';
    }
  };
  for (const [word, list] of strong.entries()) {
    const sources = new Set(list.map(hostOf)).size;
    const officialSingle =
      sources === 1 && mediaProfile(list[0].sourceName, list[0].sourceUrl)?.tier === 'A';
    if (sources >= 2 || officialSingle) {
      out.push({
        word,
        article: list[0],
        total: list.length,
        sources,
        verification: sources >= 2 ? 'corroborated' : 'official_single',
      });
    }
  }
  for (const [word, list] of weak.entries()) {
    const sources = new Set(list.map(hostOf)).size;
    if (sources >= 2) {
      out.push({ word, article: list[0], total: list.length, sources, verification: 'corroborated' });
    }
  }
  out.sort((a, b) => b.total - a.total || b.sources - a.sources);
  return out.slice(0, 3);
}
