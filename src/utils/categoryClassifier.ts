import { NewsArticle } from '../types';
import { getDefaultCategoryForFeedUrl, getQualityPresetByUrl } from '../shared/qualityFeedPresets';

export type CanonicalCategory = '财经' | '科技' | 'AI' | 'IT' | '教育';

export interface CategoryTheme {
  name: CanonicalCategory;
  badgeCls: string;
  dotCls: string;
  desc: string;
}

export const CATEGORY_THEMES: Record<CanonicalCategory, CategoryTheme> & Record<string, CategoryTheme> = {
  '财经': {
    name: '财经',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotCls: 'bg-emerald-500',
    desc: '聚焦美联储与央行货币政策、宏观流动性、资本市场、财报数据与产业金融定价',
  },
  '科技': {
    name: '科技',
    badgeCls: 'bg-sky-50 text-sky-800 border-sky-200',
    dotCls: 'bg-sky-500',
    desc: '聚焦半导体制造与光刻、先进封装、量子计算、新能源动力与硬核工程科研突破',
  },
  'AI': {
    name: 'AI',
    badgeCls: 'bg-violet-50 text-violet-800 border-violet-200',
    dotCls: 'bg-violet-500',
    desc: '聚焦大语言模型、智能体、机器学习、推理与 AI 产品与学术前沿（从 IT 独立拆出）',
  },
  'IT': {
    name: 'IT',
    badgeCls: 'bg-purple-50 text-purple-800 border-purple-200',
    dotCls: 'bg-purple-500',
    desc: '聚焦信息技术、软件工程、云计算、开源生态与网络安全（不含纯 AI 议题）',
  },
  '教育': {
    name: '教育',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
    dotCls: 'bg-amber-500',
    desc: '聚焦高等教育、高校前沿科研、职业培训与产教融合、数字课堂与EdTech教育科技',
  },
  // 兼容旧别名映射
  '金融': {
    name: '财经',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotCls: 'bg-emerald-500',
    desc: '聚焦美联储与全球央行货币政策、离岸流动性、汇率利率波动、债券与资本市场定价',
  },
  '全球财经': {
    name: '财经',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotCls: 'bg-emerald-500',
    desc: '聚焦美联储与全球央行货币政策、离岸流动性、汇率利率波动、债券与资本市场定价',
  },
  '科技前沿': {
    name: '科技',
    badgeCls: 'bg-sky-50 text-sky-800 border-sky-200',
    dotCls: 'bg-sky-500',
    desc: '聚焦半导体制造、先进封装与Chiplet、晶圆物理极限、量子计算与前沿硬件',
  },
  'AI 前沿': {
    name: 'AI',
    badgeCls: 'bg-violet-50 text-violet-800 border-violet-200',
    dotCls: 'bg-violet-500',
    desc: '聚焦 AI Agent、大语言模型架构、智能体自主工作流与算法范式演进',
  },
  '产业纵深': {
    name: '科技',
    badgeCls: 'bg-sky-50 text-sky-800 border-sky-200',
    dotCls: 'bg-sky-500',
    desc: '聚焦新能源车出海关税、动力电池、跨国供应链重构与高端工业制造实业',
  },
};

/**
 * 规范化赛道判定（互斥归类）：
 * 主体划分为「财经」、「科技」、「AI」、「IT」、「教育」；
 * AI 从 IT 独立拆出；产品主筛「科技」为规范名，IT 作兼容别名保留。
 *
 * 优先级：显式类别 → 源级默认 + 高置信内容覆写 → 内容关键词 → 科技兜底。
 */
export function getArticleCanonicalCategory(article: {
  category?: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  sourceUrl?: string;
  sourceName?: string;
  /** 摄取时的 RSS 订阅地址（源级默认分类） */
  feedUrl?: string;
}): CanonicalCategory {
  const cat = (article.category || '').trim();
  const headline = buildHeadline(article);
  const content = classifyFromContent(headline, cat);

  // 1. 显式已定义的类别与同义词（非「外部信源」等笼统标签）
  const explicit = mapExplicitCategory(cat, headline);
  if (explicit) {
    // 显式「科技/IT」若标题高置信指向 AI/教育/财经，允许内容覆写
    if (
      (explicit === '科技' || explicit === 'IT') &&
      content.confidence === 'high' &&
      content.category !== explicit &&
      content.category !== '科技' &&
      content.category !== 'IT'
    ) {
      return content.category;
    }
    return explicit;
  }

  // 2. 源级默认（订阅 URL / host）+ 高置信内容再分类
  const sourceDefault = resolveSourceDefault(article);
  if (sourceDefault) {
    // 源默认与内容冲突且内容置信度高时，以标题+摘要为准（避免科技源里的降息/高考/大模型被钉死）
    if (
      content.confidence === 'high' &&
      content.category !== sourceDefault &&
      !isSoftTechItAlias(content.category, sourceDefault)
    ) {
      return content.category;
    }
    // 教育源偶发非教育稿（地学发现、消费数码）：正文无教育强信号且其他类已有分 → 跟内容
    if (
      sourceDefault === '教育' &&
      content.category !== '教育' &&
      content.score >= 2 &&
      !hasEducationStrongSignal(headline)
    ) {
      return content.category;
    }
    return sourceDefault;
  }

  // 3. 纯内容判定
  if (content.category) return content.category;

  // 默认兜底按科技（产品规范名；IT 不作为兜底）
  return '科技';
}

function buildHeadline(article: {
  title?: string;
  subtitle?: string;
  summary?: string;
  description?: string;
  tags?: string[];
}): string {
  return `${article.title || ''} ${article.subtitle || ''} ${(article.tags || []).join(' ')} ${String(
    article.summary || article.description || ''
  ).slice(0, 400)}`.toLowerCase();
}

function resolveSourceDefault(article: {
  feedUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
}): CanonicalCategory | undefined {
  const feedCat = getDefaultCategoryForFeedUrl(article.feedUrl);
  if (feedCat) return feedCat;

  const src = `${article.sourceName || ''} ${article.sourceUrl || ''}`.toLowerCase();
  if (article.sourceUrl) {
    if (getQualityPresetByUrl(article.sourceUrl)) {
      return getDefaultCategoryForFeedUrl(article.sourceUrl);
    }
    const hostGuess = getDefaultCategoryForFeedUrl(article.sourceUrl);
    if (
      hostGuess &&
      /arxiv\.org|openai\.com|techcrunch|technologyreview|solidot|infoq|sspai|dj\.com|marketwatch|seekingalpha|cnbc\.com|jiemodui|edsurge|sciencedaily|npr\.org|frontiersin|news\.mit\.edu/i.test(
        src
      )
    ) {
      return hostGuess;
    }
  }

  if (
    /sciencedaily\.com\/education|education_learning|moe\.gov\.cn|jyb\.cn|eol\.cn|edu\.cn|芥末堆|多知网|中国教育报|jiemodui|edsurge/i.test(
      src
    )
  ) {
    return '教育';
  }
  return undefined;
}

function mapExplicitCategory(cat: string, headline: string): CanonicalCategory | undefined {
  if (!cat || cat === '外部信源' || cat === '其他') return undefined;

  if (
    cat === '教育' ||
    cat === '高等教育' ||
    cat === '职业教育' ||
    cat === '在线教育' ||
    cat === '智慧教育' ||
    cat === '高校' ||
    cat === 'EdTech' ||
    cat === 'Education' ||
    cat === 'Education & Learning'
  ) {
    return '教育';
  }

  if (
    cat === 'AI' ||
    cat === 'AI 前沿' ||
    cat === '人工智能' ||
    cat === '机器学习' ||
    cat === '大模型' ||
    cat === 'LLM' ||
    cat === 'Artificial Intelligence'
  ) {
    return 'AI';
  }

  if (
    cat === 'IT' ||
    cat === 'I T' ||
    cat === '信息技术' ||
    cat === '软件' ||
    cat === 'AI 与软件' ||
    cat === '计算机' ||
    cat === '云计算' ||
    cat === '互联网' ||
    cat === 'Information Technology'
  ) {
    // 旧「AI 与软件」若标题明显是 AI，优先归 AI
    if (cat === 'AI 与软件' || /人工智能|大模型|llm|gpt|智能体|\bagent\b|openai|深度学习/.test(headline)) {
      return 'AI';
    }
    return 'IT';
  }

  if (
    cat === '财经' ||
    cat === '金融' ||
    cat === '全球财经' ||
    cat === '资本市场' ||
    cat === '宏观' ||
    cat === '宏观金融' ||
    cat === '宏观经济' ||
    cat === 'Finance'
  ) {
    return '财经';
  }

  if (
    cat === '科技' ||
    cat === '科技前沿' ||
    cat === '半导体芯片' ||
    cat === '半导体' ||
    cat === '芯片' ||
    cat === '硬件' ||
    cat === '产业纵深' ||
    cat === '新能源' ||
    cat === 'Technology'
  ) {
    return '科技';
  }

  return undefined;
}

/** 科技 ↔ IT 视为同族软别名，不因内容「IT」覆写源默认「科技」（产品以科技为规范名）。 */
function isSoftTechItAlias(contentCat: CanonicalCategory, sourceCat: CanonicalCategory): boolean {
  const soft = new Set(['科技', 'IT']);
  return soft.has(contentCat) && soft.has(sourceCat);
}


function hasEducationStrongSignal(headline: string): boolean {
  return /教育|高考|课堂|教师|学生|高校|大学|慕课|双减|edtech|教学|教育部|人才培养|高等教育|university|college|curriculum|pedagogy/i.test(
    headline
  );
}

type ContentHit = { category: CanonicalCategory; score: number; confidence: 'high' | 'low' };

/**
 * 基于标题+摘要的打分分类。confidence=high 需：顶分≥2 且领先次名≥2，或命中强特征短语。
 */
function classifyFromContent(headline: string, cat: string): ContentHit {
  const scores: Record<CanonicalCategory, number> = {
    '教育': 0,
    '财经': 0,
    'AI': 0,
    'IT': 0,
    '科技': 0,
  };

  // —— 教育（收紧：避免「学院/学科/学习/school」等弱词把地质科研、消费数码打成教育）——
  if (
    /教育|大学|高校|大专|高职|中职|高考|中考|考研|考公|考博|保研|双一流|教育部|教委|留学生|留学|在校生|应届生|毕业生|校招|教学|教改|教案|产教融合|工匠学院|慕课|课堂|教师|师资|师范|师德|校长|中小学|双减|edtech|智慧教育|研招|人才培养|学前|幼教|早教|家教|学位|文凭|通识教育|奖学金|助学金|学费|四六级|雅思|托福|研学/i.test(
      headline
    )
  ) {
    scores['教育'] += 2;
  }
  // 英文：避开孤立 school/learning（易误伤科技通稿）；要求教育语义更强的词
  if (
    /\b(education|educational|university|universities|college|colleges|students?|teachers?|teaching|classroom|curricula|curriculum|pedagogy|edtech|campus|tuition|professors?|admissions?|k-12|kindergarten|preschool|higher\s+education)\b/i.test(
      headline
    )
  ) {
    scores['教育'] += 2;
  }
  if (/教育|高校|教学|edtech|高等教育/i.test(cat)) scores['教育'] += 1;
  // 强特征：高考/教育部/双减等几乎可单独定类
  if (/高考|教育部|双减|慕课|edtech|智慧课堂|产教融合|高等教育/.test(headline)) scores['教育'] += 2;
  // 负向：硬核地质/消费电子/游戏本等若无教育强信号，压掉教育分
  if (
    scores['教育'] > 0 &&
    !/教育|高考|课堂|教师|学生|高校|大学|慕课|双减|edtech|教学|教育部|人才培养/.test(headline) &&
    /地球|地质|氧气|岩浆|火山|笔记本电脑|游戏本|显卡|联名|内饰|gnome|byd|拯救者|影之刃/i.test(headline)
  ) {
    scores['教育'] = 0;
  }

  // —— 财经 ——
  if (
    /美联储|加息|降息|欧央行|央行|利率|汇率|通胀|国债|债券|主权基金|套利|流动性|资本市场|股市|外汇|货币政策|金融|财政|财报|营收|利润|估值|融资|ipo|上市|银行|证券|基金|行情/i.test(
      headline
    )
  ) {
    scores['财经'] += 2;
  }
  if (
    /\b(fed|rate\s+cut|rate\s+hike|inflation|treasury|bond|bonds|stock\s+market|wall\s+street|nasdaq|s&p|ipo|liquidity|central\s+bank|monetary\s+policy|forex|etf)\b/i.test(
      headline
    )
  ) {
    scores['财经'] += 2;
  }
  if (/财经|宏观|金融|资本/i.test(cat)) scores['财经'] += 1;
  if (/美联储|加息|降息|国债收益率|货币政策/.test(headline)) scores['财经'] += 2;

  // —— AI（从 IT 拆出）——
  if (
    /\b(ai|llm|llms|agi|gpt|chatgpt|claude|gemini|deepseek|openai|anthropic|huggingface|transformer|diffusion|reinforcement\s+learning|machine\s+learning|deep\s+learning|neural\s+net|agent|agents|rag|embedding|fine-?tun)\b/i.test(
      headline
    )
  ) {
    scores['AI'] += 2;
  }
  if (
    /人工智能|大模型|大语言模型|生成式|智能体|机器学习|深度学习|神经网络|推理模型|多模态|openai|claude|deepseek|ai\s*芯片|模型架构|强化学习|预训练/i.test(
      headline
    )
  ) {
    scores['AI'] += 2;
  }
  if (/ai|大模型|智能体|llm|机器学习/i.test(cat)) scores['AI'] += 1;
  if (/\b(gpt|llm|openai|chatgpt|大语言模型|智能体)\b/i.test(headline)) scores['AI'] += 2;

  // —— IT ——
  if (
    /\b(saas|api|software|cloud|database|cybersecurity|linux|github|developer|developers|programming|devops|backend|frontend|kubernetes|k8s|microservice)\b/i.test(
      headline
    )
  ) {
    scores['IT'] += 2;
  }
  if (
    /软件|操作系统|云计算|云原生|数据库|开源|github|linux|开发者|编程|代码|网络安全|信息安全|黑客|漏洞|运维|容器|架构师|程序员|微服务|前端|后端|互联网|信息技术|数码|数字生产力|服务器|数据中心/i.test(
      headline
    )
  ) {
    scores['IT'] += 2;
  }
  if (/it|软件|云|代码|信息技术|software/i.test(cat)) scores['IT'] += 1;

  // —— 科技（硬件/半导体等；不含纯 AI/纯软件）——
  if (
    /芯片|半导体|先进封装|chiplet|cowos|晶圆|台积电|日月光|光刻|hbm|集成电路|量子计算|物理极限|硬件|光模块|cpo|新能源|电动车|动力电池|光伏|储能|机器人|航天|卫星|超导|材料|生物医药|地球深处|地质|氧气来源|火山|岩浆|笔记本电脑|游戏本|显卡/i.test(
      headline
    )
  ) {
    scores['科技'] += 2;
  }
  if (
    /\b(semiconductor|chip|chips|wafer|tsmc|lithography|quantum|superconductor|satellite|aerospace|robotics|battery|photovoltaic)\b/i.test(
      headline
    )
  ) {
    scores['科技'] += 2;
  }
  if (/科技|tech|硬件|芯片|制造/i.test(cat)) scores['科技'] += 1;

  // 教育语境下的「论文/科研」单独加权较弱，避免纯科研 AI 论文被教育抢走：
  // 若 AI 分已高且教育仅靠「论文/大学」弱信号，削减教育分。
  if (scores['AI'] >= 2 && scores['教育'] > 0 && !/教育|高考|课堂|教师|学生|edtech|教学|慕课|双减/.test(headline)) {
    if (/论文|university|college|科研/.test(headline)) {
      scores['教育'] = Math.max(0, scores['教育'] - 2);
    }
  }
  // 源默认「教育」但正文是硬核地学/消费电子且无教育强信号 → 降为低置信，交还给源默认覆写逻辑外的内容分
  if (
    scores['教育'] > 0 &&
    scores['教育'] <= 2 &&
    /地球深处|隐藏氧气|地质|火山|岩浆|游戏本|笔记本电脑|显卡|联名皮肤|汽车内饰/i.test(headline) &&
    !/教育|高考|课堂|教师|学生|高校|大学|慕课|双减|edtech|教学|教育部/.test(headline)
  ) {
    scores['教育'] = 0;
  }

  const ranked = (Object.entries(scores) as [CanonicalCategory, number][])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    return { category: '科技', score: 0, confidence: 'low' };
  }

  const [topCat, topScore] = ranked[0];
  const secondScore = ranked.length > 1 ? ranked[1][1] : 0;
  const margin = topScore - secondScore;
  const confidence: 'high' | 'low' = topScore >= 2 && margin >= 2 ? 'high' : topScore >= 4 ? 'high' : 'low';

  return { category: topCat, score: topScore, confidence };
}
