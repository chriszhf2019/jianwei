// 媒体权威度档案：按“域名”人工维护的信源档案（可复核、不伪装自动评分）。
// 分级口径：
//   A = 官方媒体/权威通讯社（如人民网、新华社系）—— 事实核查严格、信息一手性强
//   B = 行业/主流商业媒体（如 IT之家、钛媒体、财联社系）—— 专业垂直、引用率较高
//   C = 泛科技/消费媒体与聚合（如爱范儿、自媒体）—— 有观点性，建议交叉印证
// 未知来源一律标注“未收录”，绝不虚标。
// 词表新增来源时在此登记（displayName 供卡片展示、profile 供悬停说明）。

export interface MediaProfile {
  /** 展示名（域名或媒体名） */
  displayName: string;
  /** 媒体类型 */
  type: string;
  /** 权威档位 A/B/C/null（null=未收录） */
  tier: 'A' | 'B' | 'C' | null;
  /** 一句话档案（悬停展示） */
  profile: string;
}

/** 把 sourceName / 域名归一化为档案键（去掉 www. 与常见后缀，保留主干） */
export function mediaKey(sourceName?: string | null, sourceUrl?: string | null): string {
  const raw = String(sourceName || sourceUrl || '').trim().toLowerCase();
  // 优先取 URL 主机名
  let host = '';
  try {
    if (sourceUrl) host = new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }
  if (!host && raw) {
    // sourceName 形如 politics.people.com.cn → 取注册域主干 people.com.cn
    const m = raw.match(/([a-z0-9-]+\.(?:com|cn|net|org|gov|info|io|co)(?:\.[a-z]{2})?)$/);
    host = m ? m[1] : raw;
  }
  return host.replace(/^www\./, '');
}

const MEDIA_TABLE: Record<string, MediaProfile> = {
  'people.com.cn': { displayName: '人民网', type: '官方媒体', tier: 'A', profile: '人民日报社主办的国家重点新闻网站，官方权威来源，事实核查严格。' },
  'politics.people.com.cn': { displayName: '人民网·时政', type: '官方媒体', tier: 'A', profile: '人民网时政频道，官方权威来源。' },
  'world.people.com.cn': { displayName: '人民网·国际', type: '官方媒体', tier: 'A', profile: '人民网国际频道，官方权威来源。' },
  'finance.people.com.cn': { displayName: '人民网·财经', type: '官方媒体', tier: 'A', profile: '人民网财经频道，官方权威来源。' },
  'ithome.com': { displayName: 'IT之家', type: '科技媒体', tier: 'B', profile: '知名科技垂直媒体，硬件/数码资讯更新快、引用较广。' },
  'tmtpost.com': { displayName: '钛媒体', type: '财经科技媒体', tier: 'B', profile: '财经与科技创投深度媒体，行业分析较专业。' },
  'ifanr.com': { displayName: '爱范儿', type: '消费科技媒体', tier: 'C', profile: '泛科技/消费数码媒体，观点性强，建议交叉印证。' },
  'xinhuanet.com': { displayName: '新华网', type: '官方媒体', tier: 'A', profile: '新华社主办，国家通讯社官方来源。' },
  'news.cn': { displayName: '新华网', type: '官方媒体', tier: 'A', profile: '新华社主办，国家通讯社官方来源。' },
  'cctv.com': { displayName: '央视网', type: '官方媒体', tier: 'A', profile: '中央广播电视总台官方来源。' },
  'gmw.cn': { displayName: '光明网', type: '官方媒体', tier: 'A', profile: '光明日报社主办，官方来源。' },
  'caixin.com': { displayName: '财新', type: '财经媒体', tier: 'B', profile: '专业财经媒体，深度报道有口碑。' },
  'yicai.com': { displayName: '第一财经', type: '财经媒体', tier: 'B', profile: '主流财经媒体（SMG/央视系）。' },
  'cls.cn': { displayName: '财联社', type: '财经媒体', tier: 'B', profile: '财经快讯媒体，电报速度快。' },
  '36kr.com': { displayName: '36氪', type: '创投媒体', tier: 'C', profile: '创投与科技资讯媒体，观点性较强。' },
  'thepaper.cn': { displayName: '澎湃新闻', type: '主流媒体', tier: 'B', profile: '上海报业集团旗下主流新媒体。' },
};

/** 查媒体档案（未收录返回 null，调用方标注“未收录”） */
export function mediaProfile(sourceName?: string | null, sourceUrl?: string | null): MediaProfile | null {
  const key = mediaKey(sourceName, sourceUrl);
  if (!key) return null;
  return MEDIA_TABLE[key] || null;
}

/** 档位徽标文案与颜色类 */
export function tierBadge(tier: MediaProfile['tier']): { label: string; cls: string; title: string } | null {
  if (tier === 'A') return { label: '官方 · A', cls: 'text-emerald-800 bg-emerald-50 border-emerald-300', title: '官方/权威媒体（一级可信）' };
  if (tier === 'B') return { label: '行业 · B', cls: 'text-[#0284C7] bg-sky-50 border-sky-300', title: '行业/主流商业媒体（二级可信）' };
  if (tier === 'C') return { label: '消费 · C', cls: 'text-stone-500 bg-stone-50 border-stone-300', title: '泛科技/观点媒体（建议交叉印证）' };
  return null;
}
