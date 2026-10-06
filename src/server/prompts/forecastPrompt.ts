/**
 * 预测契约与概率推演提示词模板 (Forecast & Prediction Prompt)
 * 目标：生成具备明确到期时间、可观察验证标准的预测契约，用于后续 Brier Score 概率校准。
 */

export const FORECAST_PROMPT_VERSION = "forecast-contract-2026-10-06-v2";

export function buildForecastPrompt(title: string, content: string): string {
  return `你是一个遵循超预测（Superforecasting）原则的情报推演专家。请根据以下新闻，生成一份具备可判定标准的未来预测契约：

新闻标题：${title}
新闻内容：
${content.slice(0, 4000)}

【严格输出要求】
请输出纯 JSON 格式：

{
  "statement": "明确具体的未来命题（例如: 某央行在未来3个月内降息至少25个基点）",
  "probability": 0.65,
  "confidenceScore": 80,
  "deadline": "2026-12-31",
  "resolutionCriteria": "极其明确的裁决标准（以何机构官方数据或发布为准）",
  "keyDrivers": [
    "支撑该预测成立的第1条核心依据",
    "支撑该预测成立的第2条核心依据"
  ],
  "counterArguments": [
    "可能导致预测失效的主要反对力量或意外变量"
  ],
  "observableIndicators": [
    "未来1~2个月内可提前观测到的领先指标"
  ]
}`;
}
