import type { NewsArticle, TopicCluster } from '../types';
import { articleSortTime, formatArticleTime } from './articleTime';
import { detectSectors, keywordMatches } from './sectorTaxonomy';
import { buildTopicClusters } from './topicCluster';
import { getArticleCanonicalCategory } from './categoryClassifier';

/** 专题生命周期阶段（编辑种子默认值；有语料命中时才展示）。 */
export type TopicLifecycleStage = 'early' | 'breakout' | 'debate' | 'consolidation';

export interface TopicSeedStakeholder {
  camp: string;
  stance: string;
  coreDemand: string;
  color: string;
}

/** 编辑配置的专题种子：关键词负责匹配语料；博弈/阶段文案是产品配置，不是实时情报。 */
export interface TopicSeed {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  keywords: string[];
  tags: string[];
  stage: TopicLifecycleStage;
  coreConflict: string;
  stakeholders: TopicSeedStakeholder[];
  keyWatchpoints: string[];
  invalidationTrigger: string;
}

export interface TopicTimelineItem {
  date: string;
  milestone: string;
  impact: string;
  timestamp: number;
  articleId?: string;
}

export interface MatchedTopicDossier {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  stage: TopicLifecycleStage;
  stageLabel: string;
  stageBadgeClass: string;
  tags: string[];
  summary: string;
  coreConflict: string;
  stakeholders: TopicSeedStakeholder[];
  articles: NewsArticle[];
  timeline: TopicTimelineItem[];
  keyWatchpoints: string[];
  invalidationTrigger: string;
  heatSparkline: Array<{ day: string; count: number }>;
}

export const TOPIC_STAGE_CONFIG: Record<
  TopicLifecycleStage,
  { label: string; badgeClass: string; desc: string }
> = {
  breakout: {
    label: '🔥 爆发突破期 (Breakout)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
    desc: '技术或政策取得实质突破，市场关注度指数级上升',
  },
  debate: {
    label: '⚔️ 多方博弈白热化 (Intense Debate)',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
    desc: '多空分歧巨大，监管、厂商与资本激烈博弈',
  },
  early: {
    label: '🌱 早期酝酿期 (Incubation)',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 font-medium',
    desc: '底层专利或政策前期酝酿，小众圈层率先讨论',
  },
  consolidation: {
    label: '📉 边际消化期 (Consolidation)',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300 font-medium',
    desc: '核心预期已基本反映，进入量产交付或常态化执行',
  },
};

/** 高频战略母题种子（与 TopicsView 原 keyword 匹配模式一致）。 */
export const TOPIC_SEEDS: TopicSeed[] = [
  {
    id: 'dossier_ai_compute',
    title: '全球 AI 算力军备竞赛与物理功耗硬阻尼',
    subtitle: '从大模型参数爆发到先进封测 CoWoS、特种电网与光互连 (CPO) 物理约束',
    category: '算力芯片与半导体',
    keywords: ['nvidia', '英伟达', '算力', 'gpu', 'cowos', 'cpo', 'openai', 'hbm', '先进封装'],
    tags: ['先进封测', 'CPO光电', '电力瓶颈', '算力军备'],
    stage: 'breakout',
    coreConflict: '算力模型吞吐需求每 3 个月翻番，与物理电网接入周期（3-5年）及晶圆级先进封装产能上限之间的根本性失衡。',
    stakeholders: [
      { camp: '头部大模型与云巨头 (OpenAI / 微软 / 谷歌)', stance: '激进扩张', coreDemand: '不惜代价锁定 2026-2027 年 GPU 与高带宽堆叠显存产能配额', color: 'border-blue-300 bg-blue-50 text-blue-950' },
      { camp: '晶圆代工与设备龙头 (台积电 / ASML)', stance: '理性扩产', coreDemand: '要求大客户提供不可撤销预付款，防范周期性资本开支过热反噬', color: 'border-amber-300 bg-amber-50 text-amber-950' },
      { camp: '能源公用事业与环保监管方', stance: '严格约束', coreDemand: '对高耗能数据中心征收峰值碳排调节税并实行错峰用电配额', color: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
    ],
    keyWatchpoints: [
      '北美主要数据中心超高压变压器订单交付排期是否进一步拉长',
      '硅光集成与 CPO 交换机在超万卡集群中的量产实测良品率',
      '下代高密度堆叠架构 (HBM4) 封测良品率爬坡节奏',
    ],
    invalidationTrigger: '若端侧轻量化模型或全新算法架构大幅降低推理算力需求 80% 以上，则重资产算力中心建设或将面临阶段性估值下修。',
  },
  {
    id: 'dossier_solid_battery',
    title: '全固态电池产业化决战与下一代材料重塑',
    subtitle: '硫化物路线攻坚、能量密度 500Wh/kg 跃升与全球车企装车时间表博弈',
    category: '新能源与高端制造',
    keywords: ['固态电池', '硫化物', '电解质', '宁德时代', '能量密度', '半固态', '全固态'],
    tags: ['全固态电池', '硫化物路线', '500Wh/kg', '车规量产'],
    stage: 'debate',
    coreConflict: '实验室高能量密度突破 vs 量产级制造公差、高纯硫化锂合成成本与极片界面阻抗劣化控制之间的工程鸿沟。',
    stakeholders: [
      { camp: '头部电芯领军企业 (宁德时代 / 比亚迪)', stance: '稳健迭代', coreDemand: '以半固态/凝聚态作为过渡商业化抓手，2027 年前锁定全固态核心专利壁垒', color: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
      { camp: '日韩系主机厂 (丰田 / 本田 / LG)', stance: '孤注一掷', coreDemand: '跳过现有液态电池红海，直接押注全固态以期在 2028 年实现技术弯道超车', color: 'border-purple-300 bg-purple-50 text-purple-950' },
      { camp: '上游特种材料初创团队', stance: '加速融资', coreDemand: '通过中试线量产验证争取与动力电池龙头签署长期独家供货协议', color: 'border-sky-300 bg-sky-50 text-sky-950' },
    ],
    keyWatchpoints: [
      '固态电池在 -20℃ 极低温环境下的循环寿命衰减率测试数据',
      '国内高纯硫化锂工业化规模提纯降本速度',
      '首批搭载全固态原型车的小批量实际道路测试与自燃安全认证',
    ],
    invalidationTrigger: '若液态电池通过超快充（10分钟补能80%）与结构创新将成本压至 $40/kWh，全固态商业化溢价空间将被大幅压缩。',
  },
  {
    id: 'dossier_geopolitics_tariff',
    title: '逆向出海、散件组装 (CKD) 与地缘原产地合规穿透',
    subtitle: '应对欧美反补贴高关税，中国高附加值制造业全球在地化建厂重构',
    category: '地缘经贸与出海',
    keywords: ['关税', '反补贴', '出海', 'ckd', '原产地', '海关', '贸易战', '逆向出海'],
    tags: ['逆向出海', '反补贴合规', 'CKD散件', '属地化制造'],
    stage: 'breakout',
    coreConflict: '西方贸易保护主义关税高墙 vs 跨国制造业通过第三国转口、CKD 组装与技术授权实现价值链渗透的猫鼠博弈。',
    stakeholders: [
      { camp: '出海制造龙头企业', stance: '属地化生根', coreDemand: '在匈牙利、墨西哥、东南亚合资建厂，以当地就业承诺换取免税准入待遇', color: 'border-amber-300 bg-amber-50 text-amber-950' },
      { camp: '欧美本土产业与工会联盟', stance: '筑墙防守', coreDemand: '提高原产地价值成分比例要求（达 65%+），堵死“洗产地”与单纯散件拼装漏洞', color: 'border-rose-300 bg-rose-50 text-rose-950' },
      { camp: '中东/东盟承接地政府', stance: '利益最大化', coreDemand: '吸引外国先进制造直接投资 (FDI)，要求外企完成核心零部件属地化配套转让', color: 'border-sky-300 bg-sky-50 text-sky-950' },
    ],
    keyWatchpoints: [
      '欧盟对于“实质性转变”原产地标准的最新技术豁免细则',
      '中国企业在拉美和东欧合资基地的本地工会用工与环保合规进展',
      '美元离岸降息周期下境外银团低息贷款对建厂资本开支的压减幅度',
    ],
    invalidationTrigger: '若目标国采取完全按最终实际控制人（UBO）国籍施加无差别资产制裁，属地化建厂模式将面临重估。',
  },
  {
    id: 'dossier_embodied_robotics',
    title: '具身智能与人形机器人从工业实测走向通用化',
    subtitle: '端到端世界模型交互、灵巧手触觉传感器与产线标准化落地',
    category: '前沿智能与机器人',
    keywords: ['人形机器人', '具身智能', 'optimus', '灵巧手', '端到端', '工业机器人'],
    tags: ['具身智能', '人形机器人', '灵巧手', '工厂搬运'],
    stage: 'early',
    coreConflict: '通用物理仿真世界模型与真实世界非结构化物理环境交互中 0.1% 致命失误率之间的不可容忍性。',
    stakeholders: [
      { camp: '机器人本体主机厂', stance: '快速进厂', coreDemand: '在汽车制造冲压、电池搬运等受控场景积累百万小时真实工况泛化数据', color: 'border-purple-300 bg-purple-50 text-purple-950' },
      { camp: '制造业产线工头与质检部门', stance: '审慎严苛', coreDemand: '要求机器人 MTBF（平均无故障运行时间）达到 50,000 小时以上才可规模替换人工', color: 'border-stone-400 bg-stone-100 text-stone-950' },
    ],
    keyWatchpoints: [
      '首批进厂人形机器人在高频重复工序下的实际不良率与宕机时间',
      '微型无刷伺服电机与触觉电子皮肤的批量采购降本曲线',
    ],
    invalidationTrigger: '若专用工业自动化机械臂通过多视角视觉算法以 1/5 成本完成 95% 搬运任务，通用双足机器人需求或将推迟。',
  },
  {
    id: 'dossier_ai_agent_software',
    title: '开源生态与自主智能体 (AI Agent) 架构重构',
    subtitle: '从大语言模型推演到上下文工程、自主工具调用与企业级工作流重构',
    category: '软件工程与开源智能',
    keywords: ['agent', '智能体', '大模型', 'llm', 'openai', '多智能体', '自主智能体', 'github copilot', 'agentic'],
    tags: ['自主智能体', '开源生态', '代码大模型', '企业级交付'],
    stage: 'breakout',
    coreConflict: '大语言模型自主规划与推理吞吐速度 vs 真实生产系统对确定性工程契约与安全可控边界的要求。',
    stakeholders: [
      { camp: '开源模型社区与开发者', stance: '快速迭代', coreDemand: '基于开源权重实现私有化微调部署，推进行业定制工作流', color: 'border-purple-300 bg-purple-50 text-purple-950' },
      { camp: '企业级 IT 架构决策者', stance: '审慎评估', coreDemand: '建立严格的模型幻觉评测基准与网络安全访问权限沙箱', color: 'border-blue-300 bg-blue-50 text-blue-950' },
      { camp: '算力与云服务商', stance: '服务整合', coreDemand: '将大模型推理与向量存储打包为弹性 Serverless API 基础设施', color: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
    ],
    keyWatchpoints: [
      '多智能体协同框架在复杂多步任务中的任务成功率与 Token 成本收敛',
      '代码大模型在生产环境自动化补全与评审的实际采纳率',
    ],
    invalidationTrigger: '若大模型幻觉率与安全攻击漏洞无法在工程层面有效收敛，企业核心业务将限制其自主执行权限。',
  },
  {
    id: 'dossier_macro_liquidity',
    title: '全球央行流动性周期与主权债务定价博弈',
    subtitle: '从美联储降息路径、国债收益率异动到跨国贸易摩擦与跨境资产避险',
    category: '宏观金融与全球资本',
    keywords: ['国债', '加息', '降息', '央行', '美联储', '流动性', '汇率', '通胀', '货币政策', '主权债务'],
    tags: ['美联储政策', '国债收益率', '主权信用', '全球流动性'],
    stage: 'debate',
    coreConflict: '全球财政赤字持续攀升与主权债券天量发行，与私人资本市场对长期通胀再抬头风险的定价分歧。',
    stakeholders: [
      { camp: '主要经济体央行', stance: '数据驱动', coreDemand: '在抗击二次通胀与防范劳动力市场恶化之间权衡降息节奏', color: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
      { camp: '跨国主权基金与固收机构', stance: '防守反击', coreDemand: '通过短端国债对冲久期风险，并在全球寻找抗通胀高息实物资产', color: 'border-amber-300 bg-amber-50 text-amber-950' },
      { camp: '实体外向型进出口企业', stance: '成本承压', coreDemand: '锁定外汇远期合约以规避汇率剧烈波动及关税变数带来的结算风险', color: 'border-stone-400 bg-stone-100 text-stone-950' },
    ],
    keyWatchpoints: [
      '全球主要经济体核心 CPI/PCE 与就业市场高频指标读数',
      '美债与欧债 10 年期收益率波动及全球主权信用评级调整',
    ],
    invalidationTrigger: '若主要央行因经济硬着陆被迫重启无上限量化宽松，长期收益率曲线定价逻辑将出现根本性扭曲。',
  },
  {
    id: 'dossier_education_transformation',
    title: '认知科学范式跃迁与全球高等教育重构',
    subtitle: '从早期认知机制、神经语言科研到高校前沿育人与智慧教育科技 (EdTech)',
    category: '教育科研与认知科学',
    keywords: ['教育', '大学', '高校', '学生', '教师', '教学', 'edtech', 'education', 'university', 'curriculum', '高考', '慕课', '智慧教育', '高等教育', '人才培养'],
    tags: ['高等教育', '认知科学', '神经发育', '教育科技'],
    stage: 'early',
    coreConflict: '传统标准化分科考评与学分体制，与跨学科人工智能科研、脑科学实证突破对创新创造力的培养要求之间的脱节。',
    stakeholders: [
      { camp: '顶尖研究型大学与实验室', stance: '科教融汇', coreDemand: '打通交叉学科壁垒，将前沿认知工具引入本科与研究生基础科研训练', color: 'border-sky-300 bg-sky-50 text-sky-950' },
      { camp: '智慧教育科技研发方', stance: '数据赋能', coreDemand: '利用自适应学习算法与多模态交互实现因材施教与规模化个性化答疑', color: 'border-purple-300 bg-purple-50 text-purple-950' },
      { camp: '教育行政与认证机构', stance: '质量底线', coreDemand: '防范学术不端与算法依赖偏见，守住教育公平与学术严谨性评价红线', color: 'border-amber-300 bg-amber-50 text-amber-950' },
    ],
    keyWatchpoints: [
      '脑机接口与认知神经科学在语言学习与记忆强化领域的同行评议临床成果',
      '全球顶尖高校针对生成式智能教学规范与跨学科通识课程改革落地情况',
    ],
    invalidationTrigger: '若权威实证研究表明过早依赖算法辅助工具会导致学生深层思辨能力显著退化，教育科技进课堂政策或将面临严格限制。',
  },
];

function articleMatchText(article: NewsArticle): string {
  return `${article.title} ${article.subtitle || ''} ${article.summary || ''} ${(article.tags || []).join(' ')}`.toLowerCase();
}

/** 弱词单独命中不足以入专题（需与强词组合或命中 ≥2 个弱词）。 */
const WEAK_TOPIC_TOKENS = new Set(
  [
    '芯片', '电力', '电网', '散热', '封装', '锂', '快充', '装车', '特斯拉', '欧洲', '东盟', '拉美', '建厂', '散件', '合规',
    '伺服', '工件', '产线', '感知', '代码', '开发者', '软件', '开源', '架构', '推理', '微服务', '操作系统', '模型',
    '科研', '认知', '学习', '论文', '学科', 'school', 'learning', 'cognitive', 'arxiv', 'github', '股市', '上市', '融资', '资本',
  ].map((s) => s.toLowerCase()),
);

export function scoreArticleForSeed(seed: TopicSeed, article: NewsArticle): number {
  const text = articleMatchText(article);
  let strong = 0;
  let weak = 0;
  for (const kw of seed.keywords) {
    if (!keywordMatches(text, kw)) continue;
    if (WEAK_TOPIC_TOKENS.has(kw.toLowerCase()) || kw.trim().length <= 1) weak += 1;
    else strong += 2;
  }
  // 至少 1 个强词，或 ≥2 个弱词
  if (strong >= 2) return strong + weak;
  if (weak >= 2) return weak;
  return 0;
}

/** 关键词打分命中 + 收紧后的赛道/分类兜底（避免 IT/教育标签 alone 拖入无关稿）。 */
export function matchArticlesForSeed(seed: TopicSeed, articles: NewsArticle[]): NewsArticle[] {
  const matched = articles.filter((a) => scoreArticleForSeed(seed, a) > 0);

  const fallback = articles.filter((a) => {
    if (matched.includes(a)) return false;
    const sectors = detectSectors(a);
    const canonical = getArticleCanonicalCategory(a);
    return (
      (seed.id.includes('compute') && sectors.includes('semi') && /算力|gpu|nvidia|英伟达|封装|cpo/i.test(articleMatchText(a))) ||
      (seed.id.includes('agent') && canonical === 'AI' && /智能体|agent|大模型|llm/i.test(articleMatchText(a))) ||
      (seed.id.includes('battery') && /固态|硫化物|电解质/.test(articleMatchText(a))) ||
      (seed.id.includes('tariff') && /关税|反补贴|出海|原产地|ckd/.test(articleMatchText(a))) ||
      (seed.id.includes('macro') && (canonical === '财经' || sectors.includes('macro'))) ||
      (seed.id.includes('education') && canonical === '教育' && /教育|高校|大学|教学|学生|teacher|university|edtech/i.test(articleMatchText(a)))
    );
  });

  return Array.from(new Set([...matched, ...fallback])).sort(
    (a, b) => articleSortTime(b) - articleSortTime(a),
  );
}

function buildHeatSparkline(uniqueArticles: NewsArticle[], now = Date.now()): Array<{ day: string; count: number }> {
  const dayMs = 24 * 3600 * 1000;
  return Array.from({ length: 7 }, (_, idx) => {
    const offset = 6 - idx;
    const dayStart = now - (offset + 1) * dayMs;
    const dayEnd = now - offset * dayMs;
    const count = uniqueArticles.filter((a) => {
      const t = articleSortTime(a);
      return t > dayStart && t <= dayEnd;
    }).length;
    return { day: offset === 0 ? 'T0' : `T-${offset}`, count };
  });
}

function dossierFromSeed(seed: TopicSeed, uniqueArticles: NewsArticle[], now = Date.now()): MatchedTopicDossier {
  const stageInfo = TOPIC_STAGE_CONFIG[seed.stage];
  const dynamicTimeline = uniqueArticles
    .slice(0, 8)
    .map((a) => ({
      date: formatArticleTime(a),
      milestone: a.title,
      impact: a.oneSentenceVerdict || a.summary || '（本条暂无解读摘要）',
      timestamp: articleSortTime(a) || 0,
      articleId: a.id,
    }))
    .filter((item) => item.timestamp > 0);

  return {
    id: seed.id,
    title: seed.title,
    subtitle: seed.subtitle,
    category: seed.category,
    stage: seed.stage,
    stageLabel: stageInfo.label,
    stageBadgeClass: stageInfo.badgeClass,
    tags: seed.tags,
    summary: seed.subtitle,
    coreConflict: seed.coreConflict,
    stakeholders: seed.stakeholders,
    articles: uniqueArticles,
    timeline:
      dynamicTimeline.length > 0
        ? dynamicTimeline
        : [
            {
              date: '—',
              milestone: '当前语料未匹配到可入时间线的文章',
              impact: '编辑种子仍在；下方文章列表为空时不编造里程碑',
              timestamp: now,
            },
          ],
    keyWatchpoints: seed.keyWatchpoints,
    invalidationTrigger: seed.invalidationTrigger,
    heatSparkline: buildHeatSparkline(uniqueArticles, now),
  };
}

/**
 * 仅返回「语料至少命中 1 篇」的专题档案，按收录篇数降序。
 * 无命中时返回 []，由 UI 展示中文空态——不编造宏观数字。
 */
export function buildMatchedTopicDossiers(
  articles: NewsArticle[],
  options?: { includeEmpty?: boolean; now?: number },
): MatchedTopicDossier[] {
  if (!articles || articles.length === 0) return [];
  const now = options?.now ?? Date.now();
  const includeEmpty = options?.includeEmpty === true;

  const dossiers = TOPIC_SEEDS.map((seed) => {
    const uniqueArticles = matchArticlesForSeed(seed, articles);
    return dossierFromSeed(seed, uniqueArticles, now);
  }).filter((d) => includeEmpty || d.articles.length > 0);

  return dossiers.sort((a, b) => b.articles.length - a.articles.length);
}

function toUiTopicCluster(dossier: MatchedTopicDossier): TopicCluster {
  const latest = dossier.articles[0];
  return {
    id: dossier.id,
    title: dossier.title,
    subtitle: dossier.subtitle,
    category: dossier.category,
    articleCount: dossier.articles.length,
    updatedAt: latest ? formatArticleTime(latest) : '—',
    summary: dossier.summary,
    coreConflict: dossier.coreConflict,
    tags: dossier.tags,
    articleIds: dossier.articles.map((a) => a.id),
    timeline: dossier.timeline.map(({ date, milestone, impact }) => ({ date, milestone, impact })),
  };
}

/**
 * Search / Detail 等处的 `types.TopicCluster[]`：
 * 1) 种子关键词命中的专题；2) 首页同款 `buildTopicClusters` 跨源事件（有真实文章才纳入）。
 */
export function deriveUiTopicClusters(articles: NewsArticle[], maxEventClusters = 8): TopicCluster[] {
  if (!articles || articles.length === 0) return [];

  const fromSeeds = buildMatchedTopicDossiers(articles).map(toUiTopicCluster);

  const fromEvents = buildTopicClusters(articles, maxEventClusters).map((cluster) => {
    const ids = cluster.articles.map((a) => a.id);
    const latest = cluster.articles[cluster.articles.length - 1] || cluster.articles[0];
    const sourceCount = new Set(
      cluster.articles.map((a) => a.sourceName || a.sourceUrl || a.id).filter(Boolean),
    ).size;
    return {
      id: `event_${cluster.id}`,
      title: cluster.topicTitle,
      subtitle: `跨源事件 · ${sourceCount} 个信源 · ${cluster.articles.length} 篇`,
      category: '跨源事件聚合',
      articleCount: cluster.articles.length,
      updatedAt: latest ? formatArticleTime(latest) : cluster.timeSpan.end || '—',
      summary:
        cluster.narrativeSummary.marketFocus ||
        cluster.narrativeSummary.officialFocus ||
        cluster.narrativeSummary.globalFocus ||
        `语料内 ${cluster.articles.length} 篇相关报道`,
      coreConflict:
        cluster.narrativeSummary.officialFocus ||
        cluster.narrativeSummary.globalFocus ||
        '（跨源叙事对照，非因果断言）',
      tags: cluster.sharedEntities.slice(0, 6),
      articleIds: ids,
      timeline: cluster.timeline.slice(0, 8).map((node) => ({
        date: node.formattedTime || node.time,
        milestone: node.title,
        impact: node.summary || node.sourceName || '',
      })),
    } satisfies TopicCluster;
  });

  return [...fromSeeds, ...fromEvents];
}

/** 详情页「所属专题」：优先文章 id 命中，其次标签交集。 */
export function findRelatedUiTopic(
  article: NewsArticle,
  corpus: NewsArticle[],
): TopicCluster | null {
  const clusters = deriveUiTopicClusters(corpus);
  const byId = clusters.find((t) => t.articleIds?.includes(article.id));
  if (byId) return byId;
  const tags = article.tags || [];
  if (tags.length === 0) return null;
  return clusters.find((t) => t.tags.some((tag) => tags.includes(tag))) || null;
}
