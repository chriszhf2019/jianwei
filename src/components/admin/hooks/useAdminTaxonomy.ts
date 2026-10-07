import { useState } from 'react';
import { SECTOR_TAXONOMY_DEFAULT } from '../../../utils/sectorTaxonomy';
import type { ServerSettings } from '../adminTypes';

/** 行业板块关键词覆盖。 */
export function useAdminTaxonomy() {
  const [sectorKeywordsState, setSectorKeywordsState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sec of SECTOR_TAXONOMY_DEFAULT) {
      init[sec.id] = sec.keywords.join(', ');
    }
    return init;
  });

  const hydrateFromSettings = (setts: ServerSettings) => {
    if (!setts.sectorOverrides) return;
    const loaded: Record<string, string> = {};
    for (const sec of SECTOR_TAXONOMY_DEFAULT) {
      const kws = setts.sectorOverrides[sec.id]?.keywords;
      loaded[sec.id] = kws && kws.length > 0 ? kws.join(', ') : sec.keywords.join(', ');
    }
    setSectorKeywordsState(loaded);
  };

  const cleanOverrides = (): Record<string, { keywords: string[] }> => {
    const cleanSectorOverrides: Record<string, { keywords: string[] }> = {};
    for (const [secId, kwStr] of Object.entries(sectorKeywordsState)) {
      const kws = kwStr
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter(Boolean);
      if (kws.length > 0) {
        cleanSectorOverrides[secId] = { keywords: kws };
      }
    }
    return cleanSectorOverrides;
  };

  return {
    sectorKeywordsState,
    setSectorKeywordsState,
    hydrateFromSettings,
    cleanOverrides,
  };
}
