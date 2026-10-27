import type { NewsArticle } from '../types';
import { articleSortTime } from './articleTime';
import { detectSectors, keywordMatches } from './sectorTaxonomy';

export type BreakoutTopicStatus = 'critical_breakout' | 'surging' | 'steady';

export interface BreakoutTopicConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  /** 正文关键词（英文走词边界） */
  keywords: string[];
  /** 仅当正文已有关键词命中时，才用赛道 id 加分；禁止赛道单独入题 */
  sectorIds?: string[];
  catalyst: string;
  actionGuidance: string;
}

export const BREAKOUT_TOPIC_CONFIGS: BreakoutTopicConfig[] = [
  {
    id: 'ai_semi',
    name: '人工智能与半导体算力',
    shortName: 'AI与算力',
    color: '#E3120B',
    icon: '🤖',
    keywords: ['算力', '芯片', '大模型', 'gpu', 'moe', 'cpo', 'openai', '智能体', '先进封装', '台积电', 'nvidia', '英伟达'],
    sectorIds: ['ai', 'semi'],
    catalyst: '开源低成本架构爆发与超大规模算力集群供电采购提速',
    actionGuidance: '重点关注上下游光模块与端侧芯片模组供应链排产交付',
  },
  {
    id: 'battery_ev',
    name: '新能源与固态电池',
    shortName: '固态电池与新能源',
    color: '#059669',
    icon: '🔋',
    keywords: ['固态电池', '锂电', '储能', '新能源', '整车', 'ckd', '动力电池'],
    sectorIds: ['ev', 'energy'],
    catalyst: '车企海外散件本土化合资点火与下一代电池产业链深潜',
    actionGuidance: '防范液态锂电正负极旧产能减值风险，跟踪海外本土化代工厂订单',
  },
  {
    id: 'trade_tariff',
    name: '跨国经贸与出海关税',
    shortName: '关税与出海供应链',
    color: '#D97706',
    icon: '🌐',
    keywords: ['关税', '出海', '反补贴', '制裁', '贸易战', 'ckd', '原产地', '海关'],
    sectorIds: ['oversea'],
    catalyst: '原产地规则与跨境贸易监管重审，倒逼供应链散件化与多地代工',
    actionGuidance: '加速东南亚与拉美本地合资工厂备案，规避反规避审查',
  },
  {
    id: 'robotics',
    name: '具身智能与人形机器人',
    shortName: '具身智能与机器人',
    color: '#8B5CF6',
    icon: '🦾',
    keywords: ['人形机器人', '具身智能', '灵巧手', '工业机器人', '数字员工'],
    sectorIds: [],
    catalyst: '端到端自主 Agent 落地验证与工业级灵巧操作模块量产',
    actionGuidance: '跟踪工业自动化集成商与高精度减速器供应商订单拐点',
  },
];

export function articleBreakoutText(article: NewsArticle): string {
  return `${article.title || ''} ${article.summary || ''} ${(article.tags || []).join(' ')}`.toLowerCase();
}

/** 至少命中 1 个正文关键词；赛道仅作加分，不可单独入题。 */
export function scoreBreakoutArticle(cfg: BreakoutTopicConfig, article: NewsArticle): number {
  const text = articleBreakoutText(article);
  let score = 0;
  for (const kw of cfg.keywords) {
    if (keywordMatches(text, kw)) score += 2;
  }
  if (score === 0) return 0;
  const sectors = detectSectors(article);
  for (const sid of cfg.sectorIds || []) {
    if (sectors.includes(sid)) score += 1;
  }
  return score;
}

export function matchBreakoutArticles(cfg: BreakoutTopicConfig, articles: NewsArticle[]): NewsArticle[] {
  return articles
    .map((a) => ({ a, s: scoreBreakoutArticle(cfg, a) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || articleSortTime(y.a) - articleSortTime(x.a))
    .map((x) => x.a);
}

export function computeBreakoutStatus(burstScore: number, momentumGain: number): BreakoutTopicStatus {
  if (burstScore >= 80 && momentumGain >= 20) return 'critical_breakout';
  if (burstScore >= 40 && momentumGain > 0) return 'surging';
  return 'steady';
}

export function formatMomentumGain(historyScores: number[]): { momentumGain: number; growthRate: string } {
  const latest = historyScores[6] ?? 0;
  const baseline = historyScores[3] ?? 0;
  let momentumGain = 0;
  if (baseline > 0) {
    momentumGain = Math.round(((latest - baseline) / baseline) * 100);
  } else if (latest > 0) {
    // 无基线时不虚标 +100%，记为「新出现」用绝对值提示，增长率按 0 展示以免与升温矛盾
    momentumGain = 0;
  }
  const growthRate = `${momentumGain > 0 ? '+' : ''}${momentumGain}%`;
  return { momentumGain, growthRate };
}

export function breakoutStatusLabel(status: BreakoutTopicStatus, burstScore: number): string {
  if (status === 'critical_breakout') return `🔥 极高爆发 (${burstScore}分)`;
  if (status === 'surging') return `⚡ 快速升温 (${burstScore}分)`;
  return `平稳态 (${burstScore}分)`;
}
