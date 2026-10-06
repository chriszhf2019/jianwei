/**
 * 逻辑树与因果传导链提示词模板 (Causal Tree & Logic Graph Prompt)
 * 目标：提取事件的一级动因、传导路径、二阶/三阶外溢效应及证伪条件。
 */

export const CAUSAL_TREE_PROMPT_VERSION = "causal-tree-2026-10-06-v2";

export function buildCausalTreePrompt(title: string, content: string): string {
  return `你是一个严谨的因果推演与系统动力学分析师。请对以下新闻事件进行因果链条拆解与外溢推演：

事件标题：${title}
事件内容：
${content.slice(0, 4000)}

【严格输出要求】
请输出纯 JSON 格式（不得输出 markdown 代码块外文本），包含以下结构：

{
  "rootCauses": [
    {
      "cause": "根本动因描述",
      "evidence": "正文中对应的事实支撑或历史背景",
      "weight": 0.8
    }
  ],
  "transmissionChain": [
    {
      "stage": 1,
      "name": "直接冲击",
      "description": "事件直接作用的行业、资产或主体",
      "timeframe": "短期 (0-3个月)"
    },
    {
      "stage": 2,
      "name": "二阶传导",
      "description": "上下游供应链或关联市场的反应",
      "timeframe": "中期 (3-12个月)"
    },
    {
      "stage": 3,
      "name": "长尾系统性影响",
      "description": "宏观格局、监管范式或竞争格局演变",
      "timeframe": "长期 (1-3年)"
    }
  ],
  "falsificationConditions": [
    "若发生何种可观察事实，将推翻上述因果假设（明确证伪指标）"
  ]
}`;
}
