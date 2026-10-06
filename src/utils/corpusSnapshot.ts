import { articleSortTime, type ArticleTimeLike } from "./articleTime";
import { sourceGroupInfo } from "./sourceGrouping";
import {
  detectSectors,
  scanCoverage,
  SECTOR_TAXONOMY,
  type SectorDef,
} from "./sectorTaxonomy";

type SnapshotArticle = ArticleTimeLike & {
  title?: string;
  summary?: string;
  tags?: string[];
  sourceName?: string;
  sourceUrl?: string;
  isExternal?: boolean;
};

export interface SourceHealthSnapshot {
  total: number;
  externalCount: number;
  curatedCount: number;
  distinctExternalHosts: number;
  topSources: Array<{ name: string; count: number }>;
  withOriginalLink: number;
  withTimestamp: number;
  fullyTraceable: number;
  knownGroupCount: number;
  unknownDomainCount: number;
}

export interface BlindspotSnapshot {
  total: number;
  matchedTotal: number;
  maxCount: number;
  coveredSectorCount: number;
  lowCoverage: Array<{ sectorId: string; name: string; count: number; samples: string[] }>;
}

export interface TomorrowHeatSnapshot {
  corpusSize: number;
  totalWindow: number;
  maxCount: number;
  list: Array<{ sectorId: string; name: string; keywords: string[]; count: number; share: number }>;
}

/** 来源构成与可追溯计数。不合成健康分。 */
export function deriveSourceHealth(articles: SnapshotArticle[]): SourceHealthSnapshot {
  const external = articles.filter((article) => article.isExternal === true);
  const sourceCounts = new Map<string, number>();
  for (const article of articles) {
    const name = String(article.sourceName || (article.isExternal ? "外部信源" : "未标来源") || "未知");
    sourceCounts.set(name, (sourceCounts.get(name) || 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const sourceGroups = external.map((article) => sourceGroupInfo(article.sourceName, article.sourceUrl));
  return {
    total: articles.length,
    externalCount: external.length,
    curatedCount: articles.length - external.length,
    distinctExternalHosts: new Set(external.map((article) => article.sourceName)).size,
    topSources,
    withOriginalLink: articles.filter((article) => Boolean(article.sourceUrl)).length,
    withTimestamp: articles.filter((article) => articleSortTime(article) > 0).length,
    fullyTraceable: articles.filter((article) => Boolean(article.sourceUrl) && articleSortTime(article) > 0).length,
    knownGroupCount: new Set(sourceGroups.filter((group) => group.known).map((group) => group.key)).size,
    unknownDomainCount: new Set(sourceGroups.filter((group) => !group.known).map((group) => group.key)).size,
  };
}

/** 相对最高覆盖赛道低于 35% 的赛道，只作为观察候选。 */
export function deriveBlindspots(
  articles: SnapshotArticle[],
  taxonomy: SectorDef[] = SECTOR_TAXONOMY,
): BlindspotSnapshot {
  const coverage = scanCoverage(articles, taxonomy);
  const maxCount = Math.max(...coverage.map((item) => item.count), 1);
  const matchedTotal = coverage.reduce((sum, item) => sum + item.count, 0);
  const lowCoverage = coverage
    .filter((item) => item.count / maxCount < 0.35)
    .sort((a, b) => a.count - b.count)
    .slice(0, 3)
    .map((item) => ({
      sectorId: item.sector.id,
      name: item.sector.name,
      count: item.count,
      samples: item.samples,
    }));
  return {
    total: articles.length,
    matchedTotal,
    maxCount,
    coveredSectorCount: coverage.filter((item) => item.count > 0).length,
    lowCoverage,
  };
}

/** 最近 80 条的赛道热度。share 是窗口占比，不是发生概率。 */
export function deriveTomorrowHeat(
  articles: SnapshotArticle[],
  taxonomy: SectorDef[] = SECTOR_TAXONOMY,
): TomorrowHeatSnapshot {
  const recent = [...articles]
    .sort((a, b) => articleSortTime(b) - articleSortTime(a))
    .slice(0, Math.min(articles.length, 80));
  const counts = new Map<string, number>();
  for (const article of recent) {
    for (const id of detectSectors(article, taxonomy)) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  const shareBase = recent.length || 1;
  const list = taxonomy
    .map((sector) => {
      const count = counts.get(sector.id) || 0;
      return {
        sectorId: sector.id,
        name: sector.name,
        keywords: sector.keywords.slice(0, 5),
        count,
        share: Math.round((count / shareBase) * 100),
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    corpusSize: articles.length,
    totalWindow: recent.length || 1,
    maxCount: Math.max(...list.map((item) => item.count), 1),
    list,
  };
}
