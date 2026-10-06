export * from './sevenElementsPrompt';
export * from './causalTreePrompt';
export * from './personaPrompt';
export * from './forecastPrompt';

export const UNIFIED_PROMPT_REGISTRY = {
  sevenElements: {
    version: 'seven-elements-2026-10-06-v3',
    description: '7W 核心认知拆解、大白话速懂与专业行话生活类比词典',
  },
  causalTree: {
    version: 'causal-tree-2026-10-06-v2',
    description: '系统动力学因果图谱与多阶段外溢效应推演',
  },
  personaImpact: {
    version: 'persona-impact-2026-10-06-v2',
    description: '投资者/创业者/工程师/研究员四维切身利益与行动策略',
  },
  forecast: {
    version: 'forecast-contract-2026-10-06-v2',
    description: '超预测契约生成、概率评估与 Brier Score 验证指标',
  },
} as const;
