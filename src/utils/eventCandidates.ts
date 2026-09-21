import type { NewsArticle } from '../types';
import { articleSortTime } from './articleTime';
import { headlineSimilarity } from './evidenceProfile';
import { canonicalEntityName } from './entityGraph';
import { sourceGroupKey } from './sourceGrouping';
import { textOverlap } from './syndication';

export interface EventCandidate {
  id: string;
  articleA: NewsArticle;
  articleB: NewsArticle;
  score: number;
  titleSimilarity: number;
  textSimilarity: number;
  entitySimilarity: number;
  sharedEntities: string[];
  timeDeltaHours: number | null;
}

function entitySet(article: NewsArticle): Set<string> {
  return new Set((article.entityMentions || []).map((item) => canonicalEntityName(item.name)).filter(Boolean));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

export function rankEventCandidates(
  articles: NewsArticle[],
  limit = 20,
  minimumScore = 0.16
): EventCandidate[] {
  const prepared = articles.map((article) => ({
    article,
    entities: entitySet(article),
    time: articleSortTime(article),
    group: sourceGroupKey(article.sourceName, article.sourceUrl),
  }));
  const output: EventCandidate[] = [];
  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const a = prepared[i];
      const b = prepared[j];
      if (a.group === b.group) continue;
      const timeDeltaHours =
        a.time && b.time ? Math.round((Math.abs(a.time - b.time) / 3_600_000) * 10) / 10 : null;
      if (timeDeltaHours != null && timeDeltaHours > 14 * 24) continue;

      const titleSimilarity = headlineSimilarity(a.article.title, b.article.title);
      const bodySimilarity = textOverlap(
        `${a.article.title || ''}${a.article.summary || ''}`,
        `${b.article.title || ''}${b.article.summary || ''}`
      );
      const sharedEntities = [...a.entities].filter((entity) => b.entities.has(entity));
      const entitySimilarity = jaccard(a.entities, b.entities);
      const sameCategory = a.article.category === b.article.category ? 1 : 0;
      const score =
        titleSimilarity * 0.4 +
        bodySimilarity * 0.25 +
        entitySimilarity * 0.25 +
        sameCategory * 0.1;

      if (score < minimumScore) continue;
      output.push({
        id: `event:${[a.article.id, b.article.id].sort().join(':')}`,
        articleA: a.article,
        articleB: b.article,
        score: Math.round(score * 1000) / 1000,
        titleSimilarity: Math.round(titleSimilarity * 100),
        textSimilarity: Math.round(bodySimilarity * 100),
        entitySimilarity: Math.round(entitySimilarity * 100),
        sharedEntities,
        timeDeltaHours,
      });
    }
  }
  return output
    .sort((a, b) => b.score - a.score || b.titleSimilarity - a.titleSimilarity)
    .slice(0, limit);
}
