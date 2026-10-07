import { NewsArticle } from '../types';

export type CanonicalCategory = '财经' | '科技' | 'IT' | '教育';

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
  'IT': {
    name: 'IT',
    badgeCls: 'bg-purple-50 text-purple-800 border-purple-200',
    dotCls: 'bg-purple-500',
    desc: '聚焦信息技术、软件工程、AI模型与智能体架构、云计算、开源生态与网络安全',
  },
  '教育': {
    name: '教育',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
    dotCls: 'bg-amber-500',
    desc: '聚焦高等教育、高校前沿科研、职业培训与产教融合、数字课堂与EdTech教育科技',
  },
  // 兼容旧别名映射
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
    name: 'IT',
    badgeCls: 'bg-purple-50 text-purple-800 border-purple-200',
    dotCls: 'bg-purple-500',
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
 * 主体划分为「财经」、「科技」、「IT」、「教育」四大核心领域
 */
export function getArticleCanonicalCategory(article: {
  category?: string;
  title?: string;
  subtitle?: string;
  tags?: string[];
}): CanonicalCategory {
  const cat = (article.category || '').trim();

  // 1. 显式已定义的类别与同义词直接归入核心四大类
  if (
    cat === '教育' ||
    cat === '高等教育' ||
    cat === '职业教育' ||
    cat === '在线教育' ||
    cat === '智慧教育' ||
    cat === '高校' ||
    cat === 'EdTech'
  ) {
    return '教育';
  }

  if (
    cat === 'IT' ||
    cat === 'I T' ||
    cat === '信息技术' ||
    cat === '软件' ||
    cat === 'AI 与软件' ||
    cat === 'AI 前沿' ||
    cat === '计算机' ||
    cat === '云计算' ||
    cat === '互联网'
  ) {
    return 'IT';
  }

  if (
    cat === '财经' ||
    cat === '全球财经' ||
    cat === '资本市场' ||
    cat === '宏观' ||
    cat === '金融' ||
    cat === '宏观金融' ||
    cat === '宏观经济'
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
    cat === '新能源'
  ) {
    return '科技';
  }

  // 2. 标题、副标题与标签关键词语义特征判定
  const headline = `${article.title || ''} ${article.subtitle || ''} ${(article.tags || []).join(' ')}`.toLowerCase();

  // 2.1 教育：高校、大学、考研、高考、学科、教学、导师、论文、职业教育、职教、产教融合、慕课、课堂、教师、师范、学院、学位、EdTech
  if (
    /教育|大学|高校|考研|高考|职教|职业教育|留学生|留学|培训|学科|教学|导师|论文|产教融合|慕课|课堂|教师|师范|校长|学院|中小学|双减|edtech|智慧教育|研招|教改|人才培养|学前|学位/i.test(
      headline
    ) || /教育|高校|教学|人才/i.test(cat)
  ) {
    return '教育';
  }

  // 2.2 财经：美联储、央行、利率、外汇、套利、债券、国债、股市、流动性、资本市场、财报、营收、利润、估值、融资、ipo、上市、银行、证券、通胀、货币政策、财政
  if (
    /美联储|加息|降息|欧央行|央行|利率|汇率|通胀|国债|债券|主权基金|套利|流动性|资本市场|股市|外汇|货币政策|金融|财政|财报|营收|利润|估值|融资|ipo|上市|银行|证券|基金|行情/i.test(
      headline
    ) || /财经|宏观|金融|资本/i.test(cat)
  ) {
    return '财经';
  }

  // 2.3 IT（信息技术、软件、云计算、AI模型算法、系统架构、数据库、开源、编程）
  if (
    /\bit\b|软件|大模型|ai agent|智能体|openai|claude|deepseek|算法|模型架构|操作系统|云计算|云原生|数据库|开源|github|linux|saas|开发者|编程|代码|网络安全|信息安全|运维|容器|架构师|api|app|程序员|微服务|前端|后端/i.test(
      headline
    ) || /it|软件|ai|算法|云|代码/i.test(cat)
  ) {
    return 'IT';
  }

  // 2.4 科技（硬件、半导体、芯片、先进封装、量子、物理极限、新能源、动力电池、光伏、储能、机器人、航天、卫星、超导、新材料）
  if (
    /芯片|半导体|先进封装|chiplet|cowos|晶圆|台积电|日月光|光刻|hbm|集成电路|量子计算|物理极限|硬件|光模块|cpo|新能源|电动车|动力电池|光伏|储能|机器人|航天|卫星|超导|材料|生物医药/i.test(
      headline
    ) || /科技|tech|硬件|芯片|制造/i.test(cat)
  ) {
    return '科技';
  }

  // 默认兜底按科技
  return '科技';
}
