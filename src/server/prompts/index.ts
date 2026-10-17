export * from './sevenElementsPrompt';
export * from './causalTreePrompt';
export * from './personaPrompt';
export * from './forecastPrompt';
export * from './analysisFrameworkPrompt';

export const UNIFIED_PROMPT_REGISTRY = {
  analysisFramework: {
    version: 'analysis-framework-2026-10-17-v1',
    description: '详情 enrich 与贴链 analyze 共用的统一深度分析框架（摘要/定性/7W/影响/风险/证据链）',
  },
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
