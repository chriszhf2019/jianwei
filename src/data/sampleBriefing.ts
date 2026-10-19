export type SampleEvidenceState = 'located' | 'inferred' | 'missing';

export interface SampleEvent {
  id: string;
  sector: string;
  title: string;
  verdict: string;
  evidence: {
    state: SampleEvidenceState;
    quote?: string;
    sourceName?: string;
  };
  personaImpact: {
    persona: string;
    coreImpact: string;
  };
  watchSignals: string[];
}

export interface SampleWatchObject {
  id: string;
  name: string;
  type: '公司' | '主题' | '地区';
  reason: string;
  falsification: string;
}

/** 首体验样例：预置 3 个事件 + 1 个可跟踪对象，演示「关注 → 发现变化 → 核验 → 简报」的完整链路（内容为示例，非真实数据）。 */
export const SAMPLE_EVENTS: SampleEvent[] = [
  {
    id: 'sample-ev-1',
    sector: '新能源与汽车',
    title: '某头部车企宣布全固态电池中试线良率达标，量产节奏提前两个季度',
    verdict: '全固态电池从「实验室」迈向「工程化」的关键一步，但距离规模化装车仍有良品率与成本爬坡。',
    evidence: {
      state: 'located',
      quote: '中试线良率已稳定在量产门槛之上，量产时间表相应前移。',
      sourceName: '企业官方公告',
    },
    personaImpact: {
      persona: '投资人',
      coreImpact: '锂电产业链定价权可能重估，关注正极 / 电解质上游与整车厂节奏。',
    },
    watchSignals: ['官方交付公告', '良品率季度数据', '上游高纯硫化锂报价'],
  },
  {
    id: 'sample-ev-2',
    sector: '宏观与金融',
    title: '央行会议纪要措辞微调，市场解读为宽松窗口临近',
    verdict: '措辞变化是否意味着政策转向尚无正式定调，目前属市场推断。',
    evidence: {
      state: 'inferred',
      quote: '纪要删去“保持定力”表述。',
      sourceName: '财经媒体转述',
    },
    personaImpact: {
      persona: '企业决策者',
      coreImpact: '若宽松兑现，融资成本可能下移；未兑现前不宜据此调整账期。',
    },
    watchSignals: ['下次利率决议', '公开市场操作量', '国债收益率曲线'],
  },
  {
    id: 'sample-ev-3',
    sector: '半导体与硬件',
    title: '网传某算力芯片交付延期，下游数据中心建设进度受影响',
    verdict: '该传闻目前无任何可核验来源，不应作为决策依据。',
    evidence: {
      state: 'missing',
    },
    personaImpact: {
      persona: '产业研究员',
      coreImpact: '先求证官方 / 供应链，再评估影响；未证实前保持观望。',
    },
    watchSignals: ['厂商官方回应', '代工厂排产数据', '客户采购指引'],
  },
];

export const SAMPLE_WATCH_OBJECT: SampleWatchObject = {
  id: 'sample-watch-1',
  name: '某头部车企 · 固态电池',
  type: '主题',
  reason: '固态电池量产节奏直接影响锂电产业链定价与整车竞争格局。',
  falsification: '若官方交付 / 良品率数据连续两季未达量产门槛，则下调该主题的优先级。',
};
