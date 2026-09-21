import type { EntityMention, NewsArticle } from '../types';
import { articleSortTime } from './articleTime';

const ALIAS_GROUPS: Array<{ id: string; canonical: string; aliases: string[] }> = [
  { id: 'org-nvidia', canonical: '英伟达', aliases: ['英伟达', 'nvidia'] },
  { id: 'org-apple', canonical: '苹果', aliases: ['苹果', 'apple'] },
  { id: 'org-google', canonical: '谷歌', aliases: ['谷歌', 'google', 'alphabet'] },
  { id: 'org-microsoft', canonical: '微软', aliases: ['微软', 'microsoft'] },
  { id: 'org-amazon', canonical: '亚马逊', aliases: ['亚马逊', 'amazon', 'aws'] },
  { id: 'org-alibaba', canonical: '阿里巴巴', aliases: ['阿里巴巴', '阿里', 'alibaba'] },
  { id: 'org-tencent', canonical: '腾讯', aliases: ['腾讯', 'tencent'] },
  { id: 'org-bytedance', canonical: '字节跳动', aliases: ['字节跳动', '字节', 'bytedance'] },
  { id: 'org-openai', canonical: 'OpenAI', aliases: ['OpenAI', 'openai'] },
  { id: 'org-anthropic', canonical: 'Anthropic', aliases: ['Anthropic', 'anthropic'] },
  { id: 'org-tesla', canonical: '特斯拉', aliases: ['特斯拉', 'tesla'] },
  { id: 'org-byd', canonical: '比亚迪', aliases: ['比亚迪', 'byd'] },
  { id: 'org-huawei', canonical: '华为', aliases: ['华为', 'huawei'] },
  { id: 'org-xiaomi', canonical: '小米', aliases: ['小米', 'xiaomi'] },
  { id: 'org-catl', canonical: '宁德时代', aliases: ['宁德时代', 'catl'] },
  { id: 'org-intel', canonical: '英特尔', aliases: ['英特尔', 'intel'] },
  { id: 'org-amd', canonical: 'AMD', aliases: ['AMD', 'amd'] },
  { id: 'org-tsmc', canonical: '台积电', aliases: ['台积电', 'tsmc', '台湾积体电路制造'] },
  { id: 'org-samsung', canonical: '三星', aliases: ['三星', 'samsung'] },
];

function stableEntityId(name: string): string {
  let hash = 5381;
  for (let index = 0; index < name.length; index += 1) {
    hash = ((hash << 5) + hash + name.charCodeAt(index)) >>> 0;
  }
  return `ent-${hash.toString(36)}`;
}

const aliasToEntity = new Map<string, { id: string; canonical: string }>();
for (const group of ALIAS_GROUPS) {
  for (const alias of group.aliases) {
    aliasToEntity.set(alias.toLowerCase(), { id: group.id, canonical: group.canonical });
  }
}

const INVALID_ENTITY_NAMES = new Set([
  "unknown",
  "n/a",
  "none",
  "null",
  "未知",
  "无",
  "暂无",
  "其他",
]);

export function canonicalEntityName(name: string): string {
  const raw = String(name || '').trim();
  return aliasToEntity.get(raw.toLowerCase())?.canonical || raw;
}

export function canonicalEntityId(name: string): string {
  const raw = String(name || '').trim();
  const alias = aliasToEntity.get(raw.toLowerCase());
  return alias?.id || stableEntityId(raw);
}

export function entityIdentity(name: unknown): { id: string; name: string } | null {
  const raw = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!raw || INVALID_ENTITY_NAMES.has(raw.toLowerCase())) return null;
  return {
    id: canonicalEntityId(raw),
    name: canonicalEntityName(raw),
  };
}

/** 仅按明确别名归一，并按实体 ID 去掉同一篇文章中的重复提及。 */
function locateEntitySurface(
  surface: string,
  source: { title?: string; summary?: string } | undefined
): EntityMention['evidence'] | undefined {
  if (!surface || !source) return undefined;
  for (const field of ['title', 'summary'] as const) {
    const text = String(source[field] || '');
    if (!text) continue;
    let start = text.indexOf(surface);
    if (start < 0) start = text.toLowerCase().indexOf(surface.toLowerCase());
    if (start >= 0) {
      return { field, start, end: start + surface.length, exact: true };
    }
  }
  return undefined;
}

export function normalizeEntityMentions(
  value: unknown,
  source?: { title?: string; summary?: string },
  max = 3
): EntityMention[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, EntityMention>();
  for (const raw of value) {
    const identity = entityIdentity(raw?.name);
    if (!identity) continue;
    const surface = String(raw?.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const current = byId.get(identity.id);
    const confidence = Math.max(0, Math.min(1, Number(raw?.confidence) || 0));
    if (!current) {
      const evidence = locateEntitySurface(surface, source);
      byId.set(identity.id, {
        id: identity.id,
        surface,
        name: identity.name,
        type: String(raw?.type || '其他').trim().slice(0, 20) || '其他',
        confidence,
        ...(evidence ? { evidence } : {}),
      });
    } else {
      current.confidence = Math.max(current.confidence, confidence);
      if (!current.evidence) {
        const evidence = locateEntitySurface(surface, source);
        if (evidence) current.evidence = evidence;
      }
    }
  }
  return [...byId.values()].slice(0, max);
}

export interface EntityGraphItem {
  id: string;
  name: string;
  type: string;
  count: number;
  aliases: string[];
  articleIds: string[];
  locatedMentions: number;
  latestAt: number;
  maxModelScore: number;
}

export function buildEntityGraph(articles: NewsArticle[]): EntityGraphItem[] {
  const map = new Map<string, EntityGraphItem>();
  for (const article of articles) {
    const articleMentions = new Map<string, EntityMention>();
    for (const mention of article.entityMentions || []) {
      const identity = entityIdentity(mention.name);
      if (!identity) continue;
      const currentMention = articleMentions.get(identity.id);
      if (!currentMention || (Number(mention.confidence) || 0) > currentMention.confidence) {
        articleMentions.set(identity.id, {
          id: identity.id,
          surface: mention.surface || mention.name,
          name: mention.name,
          type: mention.type || '其他',
          confidence: Number(mention.confidence) || 0,
          evidence: mention.evidence,
        });
      }
    }
    for (const mention of articleMentions.values()) {
      const identity = entityIdentity(mention.name);
      if (!identity) continue;
      const { id, name } = identity;
      const current = map.get(id) || {
        id,
        name,
        type: mention.type || '其他',
        count: 0,
        aliases: [],
        articleIds: [],
        locatedMentions: 0,
        latestAt: 0,
        maxModelScore: 0,
      };
      current.count += 1;
      if (mention.evidence?.exact) current.locatedMentions += 1;
      current.type = current.type === '其他' ? mention.type || '其他' : current.type;
      const rawName = String(mention.surface || mention.name).trim();
      if (rawName !== name && !current.aliases.includes(rawName)) {
        current.aliases.push(rawName);
      }
      if (!current.articleIds.includes(article.id)) current.articleIds.push(article.id);
      current.latestAt = Math.max(current.latestAt, articleSortTime(article));
      current.maxModelScore = Math.max(current.maxModelScore, Number(mention.confidence) || 0);
      map.set(id, current);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function entityCoMentions(articles: NewsArticle[], limit = 8): Array<{ a: string; b: string; count: number }> {
  const pairs = new Map<string, { a: string; b: string; count: number }>();
  for (const article of articles) {
    const identities = new Map<string, string>();
    for (const item of article.entityMentions || []) {
      const identity = entityIdentity(item.name);
      if (identity) identities.set(identity.id, identity.name);
    }
    const names = [...identities.values()].sort();
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const key = `${names[i]}\u0000${names[j]}`;
        const current = pairs.get(key) || { a: names[i], b: names[j], count: 0 };
        current.count += 1;
        pairs.set(key, current);
      }
    }
  }
  return [...pairs.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
