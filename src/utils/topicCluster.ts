import type { NewsArticle } from '../types';
import { articleSortTime, formatArticleTime } from './articleTime';
import { headlineSimilarity } from './evidenceProfile';
import { canonicalEntityName } from './entityGraph';
import { mediaProfile, mediaKey } from './mediaAuthority';
import { sourceGroupKey } from './sourceGrouping';
import { textOverlap } from './syndication';

export type MediaPerspective = 'official' | 'commercial' | 'global' | 'independent';

export interface TimelineEventNode {
  time: string;
  formattedTime: string;
  sourceName: string;
  sourceTier: 'A' | 'B' | 'C' | 'other';
  title: string;
  articleId: string;
  summary: string;
  perspective: MediaPerspective;
  url?: string;
}

export interface TopicCluster {
  id: string;
  topicTitle: string;
  articles: NewsArticle[];
  timeSpan: {
    start: string;
    end: string;
    durationHours: number;
  };
  sharedEntities: string[];
  mediaSpectrum: {
    official: NewsArticle[];
    commercial: NewsArticle[];
    global: NewsArticle[];
    independent: NewsArticle[];
  };
  timeline: TimelineEventNode[];
  narrativeSummary: {
    officialFocus: string;
    marketFocus: string;
    globalFocus: string;
  };
}

/** Determine perspective category based on media tier and domain */
export function classifyMediaPerspective(article: NewsArticle): { perspective: MediaPerspective; tier: 'A' | 'B' | 'C' | 'other' } {
  const profile = mediaProfile(article.sourceName, article.sourceUrl);
  const domain = mediaKey(article.sourceName, article.sourceUrl);

  const isGlobal =
    /(\.dj\.com|reuters\.com|bloomberg\.com|wsj\.com|ft\.com|technologyreview\.com|bbc\.com|nytimes\.com|cnbc\.com)/i.test(domain) ||
    /^(wsj|ft|reuters|bloomberg|mit)/i.test(article.sourceName || '');

  if (isGlobal) {
    return { perspective: 'global', tier: profile?.tier || 'B' };
  }

  if (profile?.tier === 'A' || /(people\.com\.cn|xinhuanet\.com|news\.cn|cctv\.com|gmw\.cn|gov\.cn)/i.test(domain)) {
    return { perspective: 'official', tier: 'A' };
  }

  if (profile?.tier === 'B' || /(cls\.cn|caixin\.com|yicai\.com|ithome\.com|tmtpost\.com|thepaper\.cn|wallstreetcn)/i.test(domain)) {
    return { perspective: 'commercial', tier: 'B' };
  }

  return { perspective: 'independent', tier: profile?.tier || 'C' };
}

function extractEntities(article: NewsArticle): Set<string> {
  return new Set(
    (article.entityMentions || [])
      .map((item) => canonicalEntityName(item.name))
      .filter(Boolean)
  );
}

/** Group multiple articles into Topic Clusters by entity overlap, similarity, and time window */
export function buildTopicClusters(articles: NewsArticle[], maxClusters = 12): TopicCluster[] {
  if (!articles || articles.length === 0) return [];

  // Group items using connected graph
  const prepared = articles.map((art) => ({
    article: art,
    entities: extractEntities(art),
    time: articleSortTime(art),
    groupKey: sourceGroupKey(art.sourceName, art.sourceUrl),
  }));

  const clusters: Array<typeof prepared> = [];
  const assigned = new Set<string>();

  for (let i = 0; i < prepared.length; i += 1) {
    const root = prepared[i];
    if (assigned.has(root.article.id)) continue;

    const currentCluster = [root];
    assigned.add(root.article.id);

    for (let j = 0; j < prepared.length; j += 1) {
      if (i === j) continue;
      const candidate = prepared[j];
      if (assigned.has(candidate.article.id)) continue;

      // Check time proximity (within 72 hours)
      const timeDiff =
        root.time && candidate.time
          ? Math.abs(root.time - candidate.time) / 3_600_000
          : 0;
      if (timeDiff > 72) continue;

      const titleSim = headlineSimilarity(root.article.title, candidate.article.title);
      const textSim = textOverlap(
        `${root.article.title} ${root.article.summary || ''}`,
        `${candidate.article.title} ${candidate.article.summary || ''}`
      );

      const shared = [...root.entities].filter((e) => candidate.entities.has(e));
      const hasKeyEntity = shared.length > 0;
      const sameCategory = root.article.category === candidate.article.category;

      const isMatch =
        titleSim >= 0.45 ||
        (hasKeyEntity && titleSim >= 0.25) ||
        (hasKeyEntity && textSim >= 0.3) ||
        (titleSim >= 0.35 && sameCategory);

      if (isMatch) {
        currentCluster.push(candidate);
        assigned.add(candidate.article.id);
      }
    }

    // Only keep clusters with 2 or more articles, or single significant articles
    if (currentCluster.length >= 2) {
      clusters.push(currentCluster);
    }
  }

  // Convert to TopicCluster objects
  const output: TopicCluster[] = clusters.map((c, idx) => {
    const clusterArticles = c.map((item) => item.article);
    // Sort chronologically
    clusterArticles.sort((a, b) => articleSortTime(a) - articleSortTime(b));

    const timestamps = clusterArticles
      .map((a) => articleSortTime(a))
      .filter((t) => t > 0);

    const minTime = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    const durationHours = Math.round(((maxTime - minTime) / 3_600_000) * 10) / 10;

    // Collect all shared entities
    const allEntities = new Set<string>();
    c.forEach((item) => item.entities.forEach((e) => allEntities.add(e)));

    // Categorize media spectrum
    const official: NewsArticle[] = [];
    const commercial: NewsArticle[] = [];
    const global: NewsArticle[] = [];
    const independent: NewsArticle[] = [];

    const timeline: TimelineEventNode[] = clusterArticles.map((art) => {
      const { perspective, tier } = classifyMediaPerspective(art);
      if (perspective === 'official') official.push(art);
      else if (perspective === 'commercial') commercial.push(art);
      else if (perspective === 'global') global.push(art);
      else independent.push(art);

      return {
        time: art.publishedAt || '',
        formattedTime: formatArticleTime(art),
        sourceName: art.sourceName || '见微快讯',
        sourceTier: tier,
        title: art.title,
        articleId: art.id,
        summary: art.summary || '',
        perspective,
        url: art.sourceUrl,
      };
    });

    // Pick representative topic title (preferably from official or most comprehensive article)
    const topicTitle =
      official[0]?.title ||
      commercial[0]?.title ||
      clusterArticles[0]?.title ||
      `事件聚合专题 #${idx + 1}`;

    // Synthesize narrative focus
    const officialFocus = official.length > 0
      ? `权威通稿聚焦政策定调与事实界定（${official.length} 家官方渠道报道）`
      : '暂未监测到国家级权威通稿直接定调';

    const marketFocus = commercial.length > 0
      ? `商业媒体聚焦产业链影响、资本市场波动与行业演进（${commercial.length} 家主流媒体）`
      : '商业媒体侧重一般性事件转述';

    const globalFocus = global.length > 0
      ? `外媒与国际金融机构聚焦地缘宏观影响与跨国流动性（${global.length} 家国际信源）`
      : '暂无国际外媒直接交叉引述';

    return {
      id: `topic-${idx}-${minTime}`,
      topicTitle,
      articles: clusterArticles,
      timeSpan: {
        start: new Date(minTime).toISOString(),
        end: new Date(maxTime).toISOString(),
        durationHours,
      },
      sharedEntities: [...allEntities].slice(0, 6),
      mediaSpectrum: {
        official,
        commercial,
        global,
        independent,
      },
      timeline,
      narrativeSummary: {
        officialFocus,
        marketFocus,
        globalFocus,
      },
    };
  });

  return output.sort((a, b) => b.articles.length - a.articles.length).slice(0, maxClusters);
}
