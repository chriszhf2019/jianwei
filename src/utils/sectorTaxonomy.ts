// 语料主题/赛道覆盖扫描用的关键词表（词典级，无需 NLP 依赖）。
// 用于“今日盲区（覆盖扫描）”“明日点名（热度跟踪）”与密度“按赛道堆叠”的真实派生。
// 口径：结果仅反映“当前语料对这些赛道的覆盖情况”，不等于现实世界的覆盖盲区。

export interface SectorDef {
  id: string;
  name: string;
  keywords: string[];
}

const SECTOR_TAXONOMY_BASE: SectorDef[] = [
  { id: 'ai', name: 'AI 与软件', keywords: ['AI', '人工智能', '大模型', '智能体', 'Agent', 'OpenAI', 'Gemini', 'DeepSeek', '算法', '算力'] },
  { id: 'semi', name: '半导体与硬件', keywords: ['芯片', '半导体', '晶圆', '封装', 'NVIDIA', '英伟达', '光刻', 'HBM', '代工'] },
  { id: 'macro', name: '宏观与金融', keywords: ['央行', '美联储', '利率', '降息', '汇率', '通胀', '国债', '债券', '银行', '股市', '关税'] },
  { id: 'ev', name: '新能源与汽车', keywords: ['新能源', '电动车', 'EV', '电池', '充电', '汽车', '车企', '锂', '固态'] },
  { id: 'consume', name: '消费电子与数码', keywords: ['手机', '数码', '耳机', '折叠屏', '芯片功耗', 'PC', '笔记本', '显示器', '智能硬件'] },
  { id: 'internet', name: '互联网与平台', keywords: ['平台', '电商', '外卖', '抖音', '微信', '拼多多', '京东', '腾讯', '阿里', '种草', '直播'] },
  { id: 'gov', name: '政策与治理', keywords: ['政策', '监管', '工信部', '发改委', '规划', '标准', '合规', '法律', '处罚', '试点'] },
  { id: 'energy', name: '能源与电力', keywords: ['电力', '电网', '绿电', '光伏', '风电', '能源', '液冷', '数据中心'] },
  { id: 'oversea', name: '出海与贸易', keywords: ['出海', '出口', '贸易', '关税', '欧盟', '海外', '外资', '工厂', '供应链'] },
];

/**
 * 组装当前生效词库：
 * - 浏览器端读取 localStorage「sector-taxonomy-overrides」的按赛道关键词覆盖：
 *   形如 { ai: { keywords: [...] }, ... }（保存后需刷新页面重新装载生效）；
 * - 覆盖为空/损坏时回退默认词；服务端（无 window）始终使用内置默认。
 */
function buildActiveTaxonomy(): SectorDef[] {
  const merged = SECTOR_TAXONOMY_BASE.map((s) => ({ ...s, keywords: [...s.keywords] }));
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('sector-taxonomy-overrides');
      if (raw) {
        const ov = JSON.parse(raw) as Record<string, { keywords?: unknown } | undefined>;
        for (const sec of merged) {
          const kws = ov?.[sec.id]?.keywords;
          if (Array.isArray(kws)) {
            const list = kws.map((k) => String(k).trim()).filter(Boolean);
            if (list.length > 0) sec.keywords = list;
          }
        }
      }
    } catch {
      /* 覆盖损坏时使用默认词库 */
    }
  }
  return merged;
}

export const SECTOR_TAXONOMY: SectorDef[] = buildActiveTaxonomy();
export const SECTOR_TAXONOMY_DEFAULT: SectorDef[] = SECTOR_TAXONOMY_BASE.map((s) => ({ ...s, keywords: [...s.keywords] }));

/** 英文缩写按词边界匹配，避免 PC 命中 pcgamer、AI 命中 said 等子串误报。 */
export function keywordMatches(text: string, keyword: string): boolean {
  const value = keyword.trim();
  if (!value) return false;
  if (/^[a-z0-9][a-z0-9+.#-]*$/i.test(value)) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text);
  }
  return text.toLowerCase().includes(value.toLowerCase());
}

/** 对一篇新闻的标题+摘要统计其命中的赛道 */
export function detectSectors(article: { title?: string; summary?: string; tags?: string[] }): string[] {
  const text = `${article.title || ''} ${article.summary || ''} ${(article.tags || []).join(' ')}`.toLowerCase();
  const hits: string[] = [];
  for (const sector of SECTOR_TAXONOMY) {
    if (sector.keywords.some((kw) => kw.trim().length >= 2 && keywordMatches(text, kw))) {
      hits.push(sector.id);
    }
  }
  return hits;
}

export interface NewsInterestGroup {
  id: string;
  name: string;
  sectorIds: string[];
}

/** 用户设置中的新闻兴趣领域；用于首页“我的领域”筛选，映射到可复核的赛道词表。 */
export const NEWS_INTEREST_GROUPS: NewsInterestGroup[] = [
  { id: 'finance', name: '财经', sectorIds: ['macro'] },
  { id: 'tech', name: '科技', sectorIds: ['ai', 'semi', 'consume'] },
  { id: 'internet', name: '互联网', sectorIds: ['internet'] },
  { id: 'industry', name: '产业与制造', sectorIds: ['ev', 'energy', 'oversea'] },
  { id: 'policy', name: '政策', sectorIds: ['gov'] },
];

export function matchesNewsInterestGroups(
  article: { title?: string; summary?: string; tags?: string[] },
  groupIds: string[]
): boolean {
  if (groupIds.length === 0) return true;
  const sectorIds = new Set(
    NEWS_INTEREST_GROUPS
      .filter((group) => groupIds.includes(group.id))
      .flatMap((group) => group.sectorIds)
  );
  return detectSectors(article).some((sectorId) => sectorIds.has(sectorId));
}

/** 多篇：返回每个赛道的覆盖计数与命中示例标题 */
export function scanCoverage(articles: Array<{ title?: string; summary?: string; tags?: string[] }>) {
  const counts = new Map<string, number>();
  const samples = new Map<string, string[]>();
  for (const a of articles) {
    for (const id of detectSectors(a)) {
      counts.set(id, (counts.get(id) || 0) + 1);
      const arr = samples.get(id) || [];
      if (a.title && arr.length < 3) arr.push(a.title);
      samples.set(id, arr);
    }
  }
  return SECTOR_TAXONOMY.map((s) => ({
    sector: s,
    count: counts.get(s.id) || 0,
    samples: samples.get(s.id) || [],
  }));
}

/** 低覆盖赛道的“补源建议”（方向性清单；具体 RSS 地址请自行核实官方订阅后再添加） */
export const SUGGESTED_SOURCES: Record<string, Array<{ name: string; why: string }>> = {
  semi: [
    { name: '与非网 / EE Times China', why: '半导体与 EDA/代工深度' },
    { name: '芯东西 / 半导体行业观察', why: '芯片设计与封装动态' },
    { name: '电子工程专辑 (EETC)', why: '产业链与器件资讯' },
  ],
  ai: [
    { name: '机器之心 / 量子位', why: 'AI 模型与智能体进展' },
    { name: '36氪 AI 频道', why: '应用与投融资信号' },
  ],
  macro: [
    { name: '财联社 / 华尔街见闻', why: '宏观与流动性快讯' },
    { name: '经济观察报', why: '政策与金融评论' },
  ],
  ev: [
    { name: '第一电动 / 盖世汽车', why: '新能源车与供应链' },
    { name: '高工锂电', why: '电池产业链' },
  ],
  consume: [
    { name: '中关村在线 / 驱动之家', why: '消费电子与数码评测' },
    { name: '爱范儿（细分栏目）', why: '智能硬件体验' },
  ],
  internet: [
    { name: '晚点 LatePost / 极客公园', why: '平台与互联网商业' },
    { name: '亿邦动力', why: '电商与新零售' },
  ],
  gov: [
    { name: '中国政府网 / 工信部官网 RSS', why: '政策原文与监管发布' },
    { name: '澎湃新闻·政策', why: '政策解读' },
  ],
  energy: [
    { name: '北极星电力网', why: '电网/绿电/储能' },
    { name: '中国能源报', why: '能源宏观' },
  ],
  oversea: [
    { name: '观察者网·出海 / 出海英雄汇', why: '出海与贸易' },
    { name: '财新·全球', why: '国际经贸' },
  ],
};
