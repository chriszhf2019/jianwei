import type { RegionMention, RegionScope } from '../types';

export const REGION_SCOPE_VALUES: RegionScope[] = [
  'mentioned',
  'event',
  'affected',
  'unspecified',
];

export const REGION_SCOPE_LABELS: Record<RegionScope, string> = {
  mentioned: '报道提及',
  event: '事件发生',
  affected: '实际受影响',
  unspecified: '范围未标',
};

export function normalizeRegionScope(value: unknown): RegionScope {
  const scope = String(value || '').trim();
  return REGION_SCOPE_VALUES.includes(scope as RegionScope)
    ? scope as RegionScope
    : 'unspecified';
}

export function regionScopeOf(mention: Pick<RegionMention, 'scope'> | null | undefined): RegionScope {
  return normalizeRegionScope(mention?.scope);
}

export function normalizeRegionMentions(value: unknown, max = 9): RegionMention[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, RegionMention>();
  for (const raw of value) {
    const region = String(raw?.region || '').trim();
    if (!region) continue;
    const scope = normalizeRegionScope(raw?.scope);
    const confidence = Math.max(0, Math.min(1, Number(raw?.confidence) || 0));
    const key = `${region}\u0000${scope}`;
    const current = byKey.get(key);
    if (!current || confidence > current.confidence) {
      byKey.set(key, { region, confidence, scope });
    }
  }
  return [...byKey.values()].slice(0, max);
}

/** 展示“主要地区”时优先事件发生地，其次实际受影响地，再回退到提及或旧数据。 */
export function primaryRegionMention(value: unknown): RegionMention | null {
  const mentions = normalizeRegionMentions(value);
  const priority: RegionScope[] = ['event', 'affected', 'mentioned', 'unspecified'];
  for (const scope of priority) {
    const candidate = mentions
      .filter((item) => item.scope === scope)
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (candidate) return candidate;
  }
  return null;
}

/** 语料轻量兜底：为未经过全量标注的语料提供高置信度的规则化地域提取 */
export function inferDefaultRegionMentions(article: {
  title?: string;
  summary?: string;
  sevenElements?: { where?: string };
  impactScope?: string;
}): RegionMention[] {
  const text = `${article.title || ''} ${article.summary || ''} ${article.sevenElements?.where || ''} ${article.impactScope || ''}`.toLowerCase();
  const mentions: RegionMention[] = [];

  if (/美国|硅谷|华盛顿|加州|纽约|美联储|openai|nvidia|微软|特斯拉|美股/.test(text)) {
    mentions.push({ region: '北美', confidence: 0.95, scope: 'event' });
  }
  if (/中国|深圳|广州|北京|上海|杭州|成都|香港|台湾|台积电|宁德时代|比亚迪|华为|新竹/.test(text)) {
    mentions.push({ region: '东亚', confidence: 0.96, scope: 'event' });
  }
  if (/欧盟|德国|法国|英国|伦敦|欧洲|匈牙利|荷兰|asml/.test(text)) {
    mentions.push({ region: '西欧', confidence: 0.88, scope: 'event' });
  }
  if (/泰国|越南|印尼|马来西亚|新加坡|东南亚|罗勇/.test(text)) {
    mentions.push({ region: '东南亚', confidence: 0.92, scope: 'event' });
  }
  if (/日本|东京|韩国|首尔|熊本|亚太/.test(text)) {
    mentions.push({ region: '亚太', confidence: 0.85, scope: 'event' });
  }
  if (/巴西|墨西哥|拉美|卡马萨里/.test(text)) {
    mentions.push({ region: '拉美', confidence: 0.84, scope: 'event' });
  }

  return mentions.length > 0
    ? mentions
    : [{ region: '全球', confidence: 0.75, scope: 'mentioned' }];
}

/** 语料轻量兜底：为未经过全量标注的语料提供核心主体提取 */
export function inferDefaultEntityMentions(article: {
  title?: string;
  summary?: string;
  dehydratedItems?: { coreEntity?: string };
  sevenElements?: { who?: string };
}): Array<{ name: string; type: string; confidence: number }> {
  const text = `${article.title || ''} ${article.summary || ''} ${article.dehydratedItems?.coreEntity || ''} ${article.sevenElements?.who || ''}`;
  const entities: Array<{ name: string; type: string; confidence: number }> = [];

  const candidates = [
    { name: 'OpenAI', type: '企业/机构' },
    { name: '台积电', type: '半导体/代工' },
    { name: 'NVIDIA', type: '芯片/算力' },
    { name: '美联储', type: '中央银行' },
    { name: '比亚迪', type: '新能源汽车' },
    { name: '宁德时代', type: '动力电池' },
    { name: 'ASML', type: '半导体设备' },
    { name: '苹果', type: '消费电子' },
    { name: '微软', type: '科技巨头' },
    { name: '欧洲央行', type: '中央银行' },
    { name: '英国财政部', type: '政府机构' },
    { name: '贝莱德', type: '资产管理' },
    { name: '淡马锡', type: '主权基金' },
  ];

  for (const c of candidates) {
    if (text.includes(c.name)) {
      entities.push({ name: c.name, type: c.type, confidence: 0.95 });
    }
  }

  if (entities.length === 0 && article.dehydratedItems?.coreEntity) {
    const raw = article.dehydratedItems.coreEntity.split(/[/,，、]/)[0].trim();
    if (raw) entities.push({ name: raw, type: '核心主体', confidence: 0.85 });
  }

  return entities;
}
