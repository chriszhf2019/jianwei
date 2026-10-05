import { NewsArticle } from '../types';

export type CanonicalCategory = 'AI 前沿' | '科技前沿' | '全球财经' | '产业纵深';

export interface CategoryTheme {
  name: CanonicalCategory;
  badgeCls: string;
  dotCls: string;
  desc: string;
}

export const CATEGORY_THEMES: Record<CanonicalCategory, CategoryTheme> = {
  'AI 前沿': {
    name: 'AI 前沿',
    badgeCls: 'bg-purple-50 text-purple-800 border-purple-200',
    dotCls: 'bg-purple-500',
    desc: '聚焦 AI Agent、大语言模型架构、智能体自主工作流与算法范式演进',
  },
  '科技前沿': {
    name: '科技前沿',
    badgeCls: 'bg-sky-50 text-sky-800 border-sky-200',
    dotCls: 'bg-sky-500',
    desc: '聚焦半导体制造、先进封装与Chiplet、晶圆物理极限、量子计算与前沿硬件',
  },
  '全球财经': {
    name: '全球财经',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotCls: 'bg-emerald-500',
    desc: '聚焦美联储与全球央行货币政策、离岸流动性、汇率利率波动、债券与资本市场定价',
  },
  '产业纵深': {
    name: '产业纵深',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
    dotCls: 'bg-amber-500',
    desc: '聚焦新能源车出海关税、动力电池、跨国供应链重构与高端工业制造实业',
  },
};

/**
 * 规范化赛道判定（互斥归类）：
 * 彻底解决「科技前沿」与「全球财经」等核心赛道因泛词匹配（如正文/副标题顺带提及“硬科技资产”）导致的串台混淆
 */
export function getArticleCanonicalCategory(article: {
  category?: string;
  title?: string;
  subtitle?: string;
  tags?: string[];
}): CanonicalCategory {
  const cat = (article.category || '').trim();

  // 1. 显式已定义的类别绝对对齐
  if (cat === 'AI 前沿') return 'AI 前沿';
  if (cat === '科技前沿' || cat === '半导体芯片' || cat === '半导体' || cat === '芯片' || cat === '硬件') return '科技前沿';
  if (cat === '全球财经' || cat === '资本市场' || cat === '宏观' || cat === '金融' || cat === '宏观金融') return '全球财经';
  if (cat === '产业纵深' || cat === '新能源' || cat === '汽车' || cat === '出海' || cat === '供应链' || cat === '制造业') return '产业纵深';

  // 2. 核心标题与标签关键词语义特征（排除正文冗余词）
  const headline = `${article.title || ''} ${article.subtitle || ''} ${(article.tags || []).join(' ')}`.toLowerCase();

  // 2.1 宏观财经与资本市场特征：美联储、央行、利率、外汇、套利、债券、国债、股市、流动性、主权基金
  if (
    /美联储|加息|降息|欧央行|央行|利率|汇率|通胀|国债|债券|主权基金|套利|流动性|资本市场|股市|外汇|货币政策|金融|财政/i.test(
      headline
    ) || /财经|宏观|金融|资本/i.test(cat)
  ) {
    return '全球财经';
  }

  // 2.2 科技前沿（硬科技/半导体/芯片/集成电路/物理极限/先进封装）
  if (
    /芯片|半导体|先进封装|chiplet|cowos|晶圆|台积电|日月光|光刻|hbm|集成电路|量子计算|物理极限|硬件|光模块|cpo/i.test(
      headline
    ) || /科技|tech|硬件|芯片/i.test(cat)
  ) {
    return '科技前沿';
  }

  // 2.3 AI 算法与软件智能体（AI Agent / 模型架构 / 大模型）
  if (
    /ai agent|智能体|大模型|openai|claude|deepseek|生成式|多模态|算法|模型架构|数字员工/i.test(
      headline
    ) || /ai|大模型/i.test(cat)
  ) {
    return 'AI 前沿';
  }

  // 2.4 实体产业、新能源车与供应链（出海关税 / CKD / 电池）
  if (
    /新能源|电动车|汽车|动力电池|出海|ckd|供应链|装配|制造|产能|光伏|储能/i.test(
      headline
    ) || /产业|制造|供应链/i.test(cat)
  ) {
    return '产业纵深';
  }

  // 兜底分类
  return '科技前沿';
}
