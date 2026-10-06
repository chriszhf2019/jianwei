/**
 * 身份切身影响与决策行动提示词模板 (Persona Impact Prompt)
 * 目标：针对投资者、创业者、工程师、政策研究者四类核心画像，输出切身利益、风险敞口与建议行动。
 */

export const PERSONA_PROMPT_VERSION = "persona-impact-2026-10-06-v2";

export function buildPersonaImpactPrompt(title: string, content: string, customPersonaPrompt?: string): string {
  return `你是一个高级决策顾问与认知分析师。请针对以下新闻事件，分析对不同角色群体的切身影响与行动策略：

新闻标题：${title}
新闻内容：
${content.slice(0, 4000)}
${customPersonaPrompt ? `\n【用户自定义画像约束】\n${customPersonaPrompt}` : ''}

【严格输出要求】
请输出纯 JSON 格式：

{
  "personaImpacts": [
    {
      "persona": "投资者 (Investor)",
      "coreImpact": "对资产配置、行业估值或流动性的实质影响",
      "riskExposure": "潜在踩坑点或回撤风险",
      "recommendedAction": "具体可执行的仓位或对冲应对举措",
      "sentiment": "positive | negative | neutral"
    },
    {
      "persona": "创业者/企业主 (Founder)",
      "coreImpact": "对商业模式、获客成本、供应链或竞争格局的影响",
      "riskExposure": "合规或现金流潜在危机",
      "recommendedAction": "业务调整或产品战略建议",
      "sentiment": "positive | negative | neutral"
    },
    {
      "persona": "技术/工程师 (Engineer)",
      "coreImpact": "技术栈变迁、架构演进或技能门槛变化",
      "riskExposure": "技术过时风险或算力/生态锁定",
      "recommendedAction": "技能学习或工程实践切入点",
      "sentiment": "positive | negative | neutral"
    },
    {
      "persona": "政策与研究员 (Researcher)",
      "coreImpact": "监管范式、政策博弈或行业准入标准变动",
      "riskExposure": "政策不确定性与指标盲区",
      "recommendedAction": "值得重点追踪的观测指标与课题方向",
      "sentiment": "positive | negative | neutral"
    }
  ]
}`;
}
