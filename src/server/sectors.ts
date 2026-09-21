import { SECTOR_TAXONOMY } from "../utils/sectorTaxonomy";
import { settings } from "./settings";

export interface ServerSector {
  id: string;
  name: string;
  keywords: string[];
}

export function serverSectorList(): ServerSector[] {
  return SECTOR_TAXONOMY.map((sec) => ({
    ...sec,
    keywords: settings.sectorOverrides?.[sec.id]?.keywords?.length
      ? settings.sectorOverrides[sec.id].keywords
      : sec.keywords,
  }));
}

export function serverDetectSectors(article: any): string[] {
  const text = `${article?.title || ""} ${article?.summary || ""}`.toLowerCase();
  const hits: string[] = [];
  for (const sec of serverSectorList()) {
    if (sec.keywords.some((k) => text.includes(k.toLowerCase()))) hits.push(sec.id);
  }
  return hits;
}
