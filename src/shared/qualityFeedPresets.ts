/**
 * 高质量 RSS 预设：财经 / 科技 / AI / 教育。
 * URL 均经公开可达性抽检；Admin 一键启用时与用户自定义列表合并，不覆盖清空。
 * 产品侧 IT 与「科技」对齐，预设与首页主类使用「科技」作为规范名。
 */

export type QualityFeedCategory = '财经' | '科技' | 'AI' | '教育';

export interface QualityFeedPreset {
  id: string;
  name: string;
  url: string;
  category: QualityFeedCategory;
  desc: string;
  lang: 'zh' | 'en';
  /** 全新安装默认写入 settings.feeds 的子集 */
  enabledByDefault?: boolean;
}

/** 首页与用户话术对齐的主筛选类（含兼容别名） */
export const HOME_TOPIC_CATEGORIES = ['财经', '科技', 'AI', '教育'] as const;

export const QUALITY_FEED_PRESETS: QualityFeedPreset[] = [
  // —— 财经 / 金融 ——
  {
    id: 'wsj-markets',
    name: '华尔街日报 · 资本市场 (WSJ Markets)',
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    category: '财经',
    desc: '美股与全球市场、利率与宏观流动性快讯',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'cnbc-finance',
    name: 'CNBC · Finance 财经',
    url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html',
    category: '财经',
    desc: '全球财经、央行政策、资本市场与企业财报',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'marketwatch-top',
    name: 'MarketWatch · 市场要闻',
    url: 'https://www.marketwatch.com/rss/topstories',
    category: '财经',
    desc: '美股与宏观市场头条',
    lang: 'en',
  },
  {
    id: 'yahoo-finance-spx',
    name: 'Yahoo Finance · 标普相关头条',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US',
    category: '财经',
    desc: '标普 500 相关市场头条',
    lang: 'en',
  },
  {
    id: 'seeking-alpha-currents',
    name: 'Seeking Alpha · Market Currents',
    url: 'https://seekingalpha.com/market_currents.xml',
    category: '财经',
    desc: '市场快讯与投研简报',
    lang: 'en',
  },

  // —— 科技 ——
  {
    id: 'techcrunch',
    name: 'TechCrunch · 硅谷科技与创投',
    url: 'https://techcrunch.com/feed/',
    category: '科技',
    desc: '创业公司、产品发布与科技产业动态',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'mit-tr',
    name: 'MIT Technology Review · 突破性技术',
    url: 'https://www.technologyreview.com/feed/',
    category: '科技',
    desc: '麻省理工科技评论工程与前沿技术',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'ieee-spectrum',
    name: 'IEEE Spectrum · 硬核工程',
    url: 'https://spectrum.ieee.org/rss/fulltext',
    category: '科技',
    desc: '半导体、机器人、工程与硬科技',
    lang: 'en',
  },
  {
    id: 'the-verge',
    name: 'The Verge · 消费科技',
    url: 'https://www.theverge.com/rss/index.xml',
    category: '科技',
    desc: '消费电子、互联网产品与科技文化',
    lang: 'en',
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica · Technology Lab',
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    category: '科技',
    desc: '深度科技与工程报道',
    lang: 'en',
  },
  {
    id: 'solidot',
    name: 'Solidot · 奇客的资讯',
    url: 'https://www.solidot.org/index.rss',
    category: '科技',
    desc: '开源、科学与信息技术中文快讯',
    lang: 'zh',
    enabledByDefault: true,
  },
  {
    id: 'infoq-cn',
    name: 'InfoQ 中文 · 软件与架构',
    url: 'https://www.infoq.cn/feed',
    category: '科技',
    desc: '软件工程、架构与产业技术实践',
    lang: 'zh',
  },
  {
    id: 'sspai',
    name: '少数派 · 数字生产力',
    url: 'https://sspai.com/feed',
    category: '科技',
    desc: '效率工具、软件与数字工作流',
    lang: 'zh',
  },
  {
    id: 'cnbc-tech',
    name: 'CNBC · Tech 科技',
    url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html',
    category: '科技',
    desc: '科技公司、硬件与产业商业报道',
    lang: 'en',
  },

  // —— AI（独立类，从 IT 拆出）——
  {
    id: 'arxiv-cs-ai',
    name: 'arXiv · cs.AI 人工智能预印本',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    category: 'AI',
    desc: '全球 AI 算法与智能系统预印本',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'arxiv-cs-lg',
    name: 'arXiv · cs.LG 机器学习预印本',
    url: 'https://rss.arxiv.org/rss/cs.LG',
    category: 'AI',
    desc: '机器学习与表示学习预印本',
    lang: 'en',
  },
  {
    id: 'hnrss-ai',
    name: 'Hacker News · AI/LLM 过滤',
    url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT',
    category: 'AI',
    desc: 'HN 上 AI / LLM / GPT 相关讨论与链接',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'openai-news',
    name: 'OpenAI News',
    url: 'https://openai.com/blog/rss.xml',
    category: 'AI',
    desc: 'OpenAI 官方博客与产品动态',
    lang: 'en',
  },

  // —— 教育（中文优先 + 国际高等教育 / EdTech）——
  {
    id: 'jiemodui',
    name: '芥末堆 · 教育产业',
    url: 'https://www.jiemodui.com/rss',
    category: '教育',
    desc: 'K12、高等教育与教育信息化产业中文快讯',
    lang: 'zh',
    enabledByDefault: true,
  },
  {
    id: 'sciencedaily-edu',
    name: 'ScienceDaily · Education & Learning',
    url: 'https://www.sciencedaily.com/rss/education_learning.xml',
    category: '教育',
    desc: '学习科学、认知与教育研究快讯',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'edsurge',
    name: 'EdSurge · 教育科技',
    url: 'https://www.edsurge.com/feed',
    category: '教育',
    desc: 'EdTech 产品、政策与教学实践',
    lang: 'en',
    enabledByDefault: true,
  },
  {
    id: 'mit-news-edu',
    name: 'MIT News · Education',
    url: 'https://news.mit.edu/rss/topic/education',
    category: '教育',
    desc: '麻省理工教育、教学与在线学习相关新闻',
    lang: 'en',
  },
  {
    id: 'npr-education',
    name: 'NPR · Education',
    url: 'https://www.npr.org/rss/rss.php?id=1013',
    category: '教育',
    desc: '美国公共广播教育专题报道',
    lang: 'en',
  },
  {
    id: 'frontiers-education',
    name: 'Frontiers in Education',
    url: 'https://www.frontiersin.org/journals/education/rss',
    category: '教育',
    desc: '教育学开放获取期刊最新文章',
    lang: 'en',
  },
  {
    id: 'hnrss-edu',
    name: 'Hacker News · Education/EdTech 过滤',
    url: 'https://hnrss.org/newest?q=education+OR+EdTech',
    category: '教育',
    desc: 'HN 上教育与 EdTech 相关讨论与链接',
    lang: 'en',
  },
];

const PRESET_BY_URL = new Map(
  QUALITY_FEED_PRESETS.map((p) => [normalizeFeedUrlKey(p.url), p])
);

/** 归一化比较键：去尾斜杠、小写、保留 query（部分源靠 query 区分频道）。 */
export function normalizeFeedUrlKey(url: string): string {
  try {
    const u = new URL(String(url || '').trim());
    u.hash = '';
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.toString().toLowerCase();
  } catch {
    return String(url || '').trim().toLowerCase().replace(/\/+$/, '');
  }
}

export function getQualityPresetByUrl(url: string): QualityFeedPreset | undefined {
  return PRESET_BY_URL.get(normalizeFeedUrlKey(url));
}

/** 源级默认分类：按订阅 URL 命中预设；未命中再按 hostname 启发式。 */
export function getDefaultCategoryForFeedUrl(feedUrl?: string | null): QualityFeedCategory | undefined {
  if (!feedUrl) return undefined;
  const preset = getQualityPresetByUrl(feedUrl);
  if (preset) return preset.category;
  return guessCategoryFromHost(feedUrl);
}

function guessCategoryFromHost(urlOrHost: string): QualityFeedCategory | undefined {
  const raw = String(urlOrHost || '').toLowerCase();
  let host = raw;
  try {
    host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }
  if (/arxiv\.org|openai\.com|anthropic\.com|huggingface\.co|deepmind|hnrss\.org/.test(host) || /q=ai|cs\.ai|cs\.lg|cs\.cl/i.test(raw)) {
    return 'AI';
  }
  if (/cnbc\.com\/id\/10000664|dj\.com|marketwatch|yahoo\.com.*finance|seekingalpha|ft\.com|reuters.*business|bloomberg/i.test(raw)) {
    return '财经';
  }
  if (/techcrunch|technologyreview|ieee\.org|theverge|arstechnica|solidot|infoq|sspai|engadget|wired\.com/i.test(host)) {
    return '科技';
  }
  if (
    /jiemodui|sciencedaily\.com.*education|edsurge|npr\.org.*1013|frontiersin\.org\/journals\/education|news\.mit\.edu.*education|hnrss\.org.*education|moe\.gov\.cn|jyb\.cn|eol\.cn|edu\.cn|edutopia|insidehighered|chronicle\.com/i.test(raw) ||
    /jiemodui|edsurge|edutopia|insidehighered/i.test(host)
  ) {
    return '教育';
  }
  return undefined;
}

export function listPresetsByCategory(category: QualityFeedCategory): QualityFeedPreset[] {
  return QUALITY_FEED_PRESETS.filter((p) => p.category === category);
}

export function defaultEnabledFeedUrls(): string[] {
  return QUALITY_FEED_PRESETS.filter((p) => p.enabledByDefault).map((p) => p.url);
}

/** 合并启用：只追加缺失 URL，不删除用户已有自定义源。 */
export function mergeEnableFeedUrls(existing: string[], toEnable: string[]): string[] {
  const seen = new Set(existing.map(normalizeFeedUrlKey));
  const next = [...existing];
  for (const url of toEnable) {
    const key = normalizeFeedUrlKey(url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(url);
  }
  return next;
}

/** 仅移除指定 URL，保留其余自定义。 */
export function mergeDisableFeedUrls(existing: string[], toDisable: string[]): string[] {
  const drop = new Set(toDisable.map(normalizeFeedUrlKey));
  return existing.filter((u) => !drop.has(normalizeFeedUrlKey(u)));
}

export function presetCategoryLabel(category: QualityFeedCategory): string {
  if (category === '财经') return '金融 / 财经';
  if (category === '科技') return '科技';
  if (category === '教育') return '教育';
  return 'AI';
}
