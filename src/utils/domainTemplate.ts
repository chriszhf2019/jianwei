/**
 * 领域模板路由：按标题/摘要/标签的关键词自动选择维度名，避免用硬件模板套影视新闻。
 * 纯函数；识别不出时回退 general，不臆造具体领域。
 */
import type { NewsArticle } from '../types';

export type DomainTemplateId = 'film' | 'hardware' | 'finance' | 'ai' | 'general';
export type DomainDimensionKey = 'fact' | 'risk' | 'conflict' | 'industry';

export interface DomainDimension {
  key: DomainDimensionKey;
  label: string;
  keywords: string[];
}

export interface DomainTemplate {
  id: DomainTemplateId;
  label: string;
  dimensions: DomainDimension[];
}

const TEMPLATES: Record<DomainTemplateId, DomainTemplate> = {
  film: {
    id: 'film',
    label: '影视娱乐',
    dimensions: [
      { key: 'fact', label: '事实陈述', keywords: ['导演', '主演', '改编', '上映', '制作', '工作室', '报道'] },
      { key: 'risk', label: '票房与回收', keywords: ['票房', '预算', '成本', '回本', '宣发', '亏损', '盈利', '制片'] },
      { key: 'conflict', label: '叙事转译与风格冲突', keywords: ['改编', '原著', '粉丝', '叙事', '风格', '作者', '特效', '审美', '争议'] },
      { key: 'industry', label: '行业与 IP 格局', keywords: ['好莱坞', '流媒体', '超级英雄', '游戏', 'ip', '制片厂', '档期', '市场'] },
    ],
  },
  hardware: {
    id: 'hardware',
    label: '硬件产品',
    dimensions: [
      { key: 'fact', label: '事实陈述', keywords: ['屏幕', '芯片', '处理器', '电池', '相机', '英寸', 'hz', '骁龙', '天玑'] },
      { key: 'risk', label: '能效与物料取舍', keywords: ['功耗', '散热', '续航', '成本', 'bom', '重量', '厚度', '缩水'] },
      { key: 'conflict', label: '参数与体验落差', keywords: ['帧率', '插帧', '延迟', '发热', '适配', '体验', '生态'] },
      { key: 'industry', label: '产业链与竞争', keywords: ['供应链', '面板', '代工', '竞品', '中端', '旗舰', '红米', '一加'] },
    ],
  },
  finance: {
    id: 'finance',
    label: '财经宏观',
    dimensions: [
      { key: 'fact', label: '事实陈述', keywords: ['央行', '利率', '会议', '数据', '报告', '发布'] },
      { key: 'risk', label: '政策与市场风险', keywords: ['通胀', '汇率', '债券', '股市', '流动性', '下行', '风险'] },
      { key: 'conflict', label: '多空博弈', keywords: ['分歧', '预期', '看多', '看空', '博弈', '争议'] },
      { key: 'industry', label: '宏观传导', keywords: ['银行', '信贷', '实体', '财政', '传导', '行业'] },
    ],
  },
  ai: {
    id: 'ai',
    label: 'AI 与技术',
    dimensions: [
      { key: 'fact', label: '事实陈述', keywords: ['模型', '发布', '参数', '版本', '基准'] },
      { key: 'risk', label: '算力与成本', keywords: ['算力', '成本', '推理', '训练', 'token', 'gpu', '数据中心'] },
      { key: 'conflict', label: '技术路线冲突', keywords: ['幻觉', '安全', '对齐', '开源', '闭源', '争议'] },
      { key: 'industry', label: '商业落地', keywords: ['企业', '客户', 'api', '定价', '落地', '生态'] },
    ],
  },
  general: {
    id: 'general',
    label: '通用',
    dimensions: [
      { key: 'fact', label: '事实陈述', keywords: ['报道', '发布', '宣布', '数据'] },
      { key: 'risk', label: '风险与代价', keywords: ['风险', '成本', '压力', '挑战', '不确定'] },
      { key: 'conflict', label: '多方博弈与取舍', keywords: ['争议', '分歧', '冲突', '取舍', '代价'] },
      { key: 'industry', label: '行业影响', keywords: ['行业', '市场', '产业链', '竞争', '格局'] },
    ],
  },
};

function haystackOf(article: NewsArticle): string {
  const coreLogic = article.coreLogic
    ? `${article.coreLogic.essence || ''} ${(article.coreLogic.points || []).join(' ')} ${article.coreLogic.counterIntuitive || ''}`
    : '';
  return `${article.title || ''} ${article.summary || ''} ${article.subtitle || ''} ${article.category || ''} ${(article.tags || []).join(' ')} ${coreLogic}`.toLowerCase();
}

function scoreTemplate(text: string, template: DomainTemplate): number {
  let score = 0;
  for (const dim of template.dimensions) {
    for (const keyword of dim.keywords) {
      if (text.includes(keyword.toLowerCase())) score += 1;
    }
  }
  return score;
}

/** 自动识别领域模板；没有明显命中时返回 general。 */
export function detectDomainTemplate(article: NewsArticle): DomainTemplate {
  const text = haystackOf(article);
  const order: DomainTemplateId[] = ['film', 'hardware', 'finance', 'ai'];
  let best: DomainTemplateId = 'general';
  let bestScore = 0;
  for (const id of order) {
    const score = scoreTemplate(text, TEMPLATES[id]);
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return bestScore >= 3 ? TEMPLATES[best] : TEMPLATES.general;
}
