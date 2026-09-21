// 来源站点 → 地区（配置表；未列出的源归为“未标注”，绝不臆造）。
// 说明：地区为信源所在地标注（人工配置口径），并非内容涉事地区。

const REGION_RULES: Array<{ match: (host: string) => boolean; region: string }> = [
  { match: (h) => h.includes('people.com.cn') || h.includes('ithome.com') || h.includes('tmtpost.com') || h.includes('ifanr.com') || h.includes('36kr.com') || h.includes('jiqizhixin.com') || h.includes('qbitai.com') || h.includes('zol.com.cn') || h.includes('myzaker.com') || h.includes('yicai.com') || h.includes('cls.cn') || h.includes('wallstreetcn.com'), region: '中国大陆' },
  { match: (h) => h.includes('nikkei.com') || h.includes('kyodo') || h.includes('nhk'), region: '日本' },
  { match: (h) => h.includes('reuters') || h.includes('bloomberg') || h.includes('ft.com') || h.includes('economist.com'), region: '英美（国际财经）' },
];

/** 根据 sourceName（通常为站点域名）推断配置的地区；未命中返回“未标注” */
export function regionOf(sourceName: string | null | undefined): string {
  const name = String(sourceName || '').toLowerCase();
  if (!name) return '未标注';
  for (const rule of REGION_RULES) {
    if (rule.match(name)) return rule.region;
  }
  return '未标注';
}

export const SOURCE_REGION_LABELS: string[] = [...new Set(REGION_RULES.map((r) => r.region))].concat(['未标注']);
