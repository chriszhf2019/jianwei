/**
 * 统一深度分析 Prompt：详情 enrich 与贴链 analyze 共用同一 JSON 核心契约，
 * 避免两条路径 schema 漂移。模块 prompts registry 此前未走主路径的问题由此收敛。
 */

import { ANALYSIS_FRAMEWORK_VERSION } from '../../shared/analysisFramework';

export { ANALYSIS_FRAMEWORK_VERSION };

/** 深度字段 JSON 样例（enrich / analyze 共用核心） */
export const ANALYSIS_DEEP_JSON_SCHEMA = `{
  "subtitle": "精炼副标题",
  "oneSentenceVerdict": "战略/行业定性（30-70字），不得写成新闻导语或复述配置参数",
  "summary": "两行文本：第一行=项目核心事实（谁/做了什么/关键数字/来源）；第二行=行业坐标（前代或竞品对比、该事件在产品谱系中的位置）",
  "sevenElements": {
    "what": "",
    "who": "",
    "when": "",
    "where": "",
    "why": "",
    "how": "",
    "soWhat": "",
    "aiVerdict": {
      "confidenceScore": 0,
      "volatility": "高|中|低",
      "actionLevel": "行动|关注|观望",
      "verdictSummary": ""
    }
  },
  "logicTree": {
    "rootCause": "",
    "nodes": [
      { "id": "n-1", "label": "", "category": "cause", "description": "" },
      { "id": "n-2", "label": "", "category": "mid_effect", "description": "" },
      { "id": "n-3", "label": "", "category": "mid_effect", "description": "" },
      { "id": "n-4", "label": "", "category": "market_impact", "description": "" }
    ],
    "variableWeights": [
      { "name": "", "weight": 0, "impactDirection": "up|down|neutral", "description": "" }
    ]
  },
  "personaImpacts": [
    {
      "personaId": "investor|manager|founder|pm|dev|sales_mkt",
      "coreImpact": "",
      "opportunity": "",
      "threatRisk": "",
      "recommendedAction": ""
    }
  ],
  "rippleEffect": {
    "stages": [
      { "stage": "一阶影响", "title": "", "timeframe": "", "items": [""], "severity": "高|中|低" }
    ],
    "knowledgeGraph": [
      { "id": "kg-1", "name": "", "type": "company", "relationToMain": "" }
    ],
    "multiSources": [
      { "sourceName": "", "tier": "", "stance": "正面|中性|负面", "verified": false, "excerpt": "" }
    ]
  },
  "spectrumLayers": [
    {
      "layer": "micro_signal|interests|logic_chain|data_signal|deduction",
      "name": "",
      "color": "#RRGGBB",
      "headline": "",
      "content": "",
      "keyIndicators": [""]
    }
  ],
  "evidenceChain": [
    {
      "id": "ev-1",
      "claim": "",
      "sourceFact": "",
      "quote": "输入材料中的原文短引句；没有则留空",
      "sourceName": "来源名称；输入材料未提供则留空",
      "sourceUrl": "真实可访问链接；输入材料未提供则填 null，不得编造",
      "publishedAt": "来源发布时间；未知则 null",
      "sourceType": "primary_document|official_statement|reported_media|unknown",
      "relation": "supports|contradicts|context",
      "reliability": "可靠性依据说明",
      "confidenceScore": 0
    }
  ],
  "tongsuSummary": {
    "simpleSay": "用大白话把整件事讲一遍（像对完全不懂行业的朋友解释，不用任何术语，2-4 句）",
    "whyExplanation": "用一个生活化比喻解释为什么会这样",
    "whatItMeans": "对普通人/你来说，这件事直接意味着什么（1-2 句大白话）",
    "jargonTerms": ["文中出现的术语/黑话，用于点击释义"]
  },
  "dehydratedItems": {
    "coreEntity": "核心主体（公司/机构/人名）",
    "keyAction": "一句话：它干了什么/发生了什么",
    "relatedCount": 3,
    "coreShifts": ["核心变化1（要点式）", "核心变化2", "核心变化3"],
    "impactHighlights": ["对谁有什么影响", "关键看点"]
  },
  "backstoryTimeline": [
    {
      "date": "时间节点（如 2026-05 或具体日期；不确定写约）",
      "event": "此前发生的相关事件一句话",
      "relevance": "它与今天这篇的关系（铺垫/诱因/进展/背景，一句话）"
    }
  ],
  "stakeholderImpact": [
    {
      "name": "受影响方名称（公司/机构/人群/行业）",
      "type": "company|government|person|group|industry|market",
      "direction": "benefit|pressure|neutral",
      "strength": 1,
      "why": "为什么受益/承压（一句话，克制可复核）"
    }
  ],
  "coreLogic": {
    "essence": "事情的本质/底层逻辑一句话（跳出新闻本身的第一性概括）",
    "points": ["核心逻辑1（结构性机制）", "核心逻辑2", "核心逻辑3"],
    "counterIntuitive": "2-3 句：先写光鲜表象，再指出次生矛盾（卖点 vs 体验、利好 vs 落地阻力、降价 vs 减配）；没有具体矛盾就留空"
  },
  "bullBearDebate": {
    "bull": [{ "point": "正方论点（支持/看多）", "basis": "依据或隐含假设，一句话" }],
    "bear": [{ "point": "反方论点（质疑/看空）", "basis": "依据或隐含假设，一句话" }],
    "coreDispute": "双方真正的分歧焦点（双方都在争什么）一句话",
    "read": "当前力量判断：哪方论据更硬、或取决于什么关键条件（一句话，克制）"
  }
}`;

/** 反套话硬约束：所有分析 prompt（enrich/analyze/skill）共用，可追加到任意 prompt 末尾。 */
export const ANTI_BOILERPLATE_RULE = `【具体性规则（必须遵守）】
1. 每个分析字段必须至少引用一个来自输入材料的专有名词、机构名、产品名、数字、时间或明确动作；不得只给行业通用判断。
2. 禁止只写以下这类换个新闻也成立的套话：「产业周期调整」「市场竞争加剧」「技术进步驱动」「地缘政治影响」「供需失衡」「行业集中度提升」「政策支持明确」「结构性调整」「资本市场波动」「长期向好」——除非紧接着给出输入材料中的具体证据（谁、什么数字、什么动作）。
3. 输入材料不足以支撑某字段时，直接写「现有材料未说明」，不要用合理推测填充。
4. 一句话定性必须包含事件主体与具体变化（数字/时间/对象至少其一），不得复述标题。
5. 禁止把「可能/取决于」当成不写具体事实的借口：先给具体事实，再给条件推断。`;

export const ANALYSIS_SHARED_RULES = `【核心语言规则】：无论输入的原始标题、正文或信源语言是英文还是中文，你必须一律且百分之百使用规范、专业、精辟的【简体中文】输出所有的分析字段（包括 subtitle、oneSentenceVerdict、summary、sevenElements、logicTree、tongsuSummary、dehydratedItems、bullBearDebate、coreLogic 等全量字段，不得残留英文长句或段落）。
请遵循“报刊为骨，数据为翼”，避免臆造硬数据；无法核实的数字用定性表述。
${ANTI_BOILERPLATE_RULE}
【完整性规则】必须输出框架中的全部字段键；确实不适用的用空字符串或空数组表示，不得省略键。sevenElements 的 7 个字段至少填 5 个，其中 what / who / why / soWhat 必须有内容。evidenceChain 至少给出 1 条能对应到输入材料的证据；确实没有时返回空数组 []，不得编造。
多源规则：multiSources 只能列出输入材料中明确出现、且能找到对应表述的来源。没有可核验来源线索时必须返回 []，不得根据常识补媒体名或把模型记忆当作“已核实”。
证据边界：
1. evidenceChain.sourceFact 只能引用输入材料中的事实、数字或可解析出处；输入未提供的硬数据不得生成。
2. confidenceScore 是模型自报的相对把握，不是经历史数据校准的真实概率；文案中不得称其为“命中率”“基准率”或“事实概率”。
3. 所有推断用“可能/取决于/若…则…”表达，并明确列出可能推翻判断的信号。
4. sevenElements.aiVerdict.actionLevel 只能填「行动」「关注」「观望」三选一（不得使用「观察」「规避」等旧枚举）。
注意：tongsuSummary.simpleSay 必须是把本条新闻从头讲清楚的完整大白话（讲清楚“谁、干了什么、为什么、影响谁”），不要只写一句口号；whyExplanation 用类比让小白秒懂；jargonTerms 至少 2 个（若有术语）。
bullBearDebate：bull 列 2-3 条支持方论点，bear 列 2-3 条反对方论点；coreDispute 点出分歧焦点；read 给出力量判断，克制不喊单。
coreLogic：essence 用一句话讲清本质；points 列 2-4 条结构性核心逻辑；counterIntuitive 点出最反直觉处（没有就空字符串）。
stakeholderImpact：列出受影响相关方 3-6 个，why 用可复核表述，宁缺毋滥。
backstoryTimeline：给出之前的 3-6 个关键相关节点（时间正序）；若没有值得写的前情，返回空数组 []。
【模块职责红线（不得串岗）】
1. 一句话定性 oneSentenceVerdict：30-70 字，只写战略/行业定性（心智突围、生态防守、价格挤压、技术试水），不得写成新闻导语、复述配置参数，也不得与 summary 相同；无法生成时输出空字符串，禁止用摘要顶替。
2. 隐秘转折 counterIntuitive：只写光鲜表象下的次生矛盾（参数高 vs 体验差、政策利好 vs 落地阻力、降价 vs 减配），不得写“界限变得模糊”等放之四海皆准的空话。
3. 背景摘要 summary：事实提炼 + 前代/竞品坐标（该事件在时间轴或产品谱系中的位置），不得直接照抄标题或媒体原话。
4. 动机 motivation：商业利益、竞争阻击、品牌诉求（为什么是现在、要打谁、牺牲什么），不得复述事实。
5. 发展趋势 trends：产业链上下游传导、技术代际演进、下一阶段竞争重点，每条不少于 20 字。
6. 潜在风险 risks：工程物理极限、整机取舍代价、用户实际体验落差、商业落地阻力，禁止仅用“成本推高/未经证实”收尾。
产品映射（供内部对齐，勿额外输出）：摘要=summary，定性=oneSentenceVerdict，7W=sevenElements，影响=dehydratedItems.impactHighlights/soWhat，风险=bullBearDebate.bear/threatRisk，证据链=evidenceChain。`;


/** 两阶段管线 · 阶段一：只抽取可核对的事实与证据。 */
export const ANALYSIS_FACTS_JSON_SCHEMA = `{
  "subtitle": "精炼副标题",
  "oneSentenceVerdict": "战略/行业定性（30-70字），不得写成新闻导语或复述配置参数",
  "summary": "两行文本：第一行=项目核心事实（谁/做了什么/关键数字/来源）；第二行=行业坐标（前代或竞品对比）",
  "sevenElements": { "what": "", "who": "", "when": "", "where": "", "why": "", "how": "", "soWhat": "" },
  "dehydratedItems": { "coreEntity": "", "keyAction": "", "relatedCount": 0, "coreShifts": [], "impactHighlights": [] },
  "evidenceChain": [{ "id": "ev-1", "claim": "", "sourceFact": "", "quote": "", "sourceName": "", "sourceUrl": null, "publishedAt": null, "sourceType": "reported_media", "relation": "supports", "reliability": "", "confidenceScore": 0 }],
  "backstoryTimeline": [{ "date": "", "event": "", "relevance": "" }],
  "tongsuSummary": { "simpleSay": "", "whyExplanation": "", "whatItMeans": "", "jargonTerms": [] }
}`;

/** 两阶段管线 · 阶段二：只基于已抽取事实派生影响与风险。 */
export const ANALYSIS_DERIVED_JSON_SCHEMA = `{
  "logicTree": { "rootCause": "", "nodes": [{ "id": "n-1", "label": "", "category": "cause|mid_effect|market_impact", "description": "" }], "variableWeights": [{ "name": "", "weight": 0, "impactDirection": "up|down|neutral", "description": "" }] },
  "personaImpacts": [{ "personaId": "investor|manager|founder|pm|dev|sales_mkt", "coreImpact": "", "opportunity": "", "threatRisk": "", "recommendedAction": "" }],
  "rippleEffect": { "stages": [{ "stage": "一阶影响", "title": "", "timeframe": "", "items": [], "severity": "高|中|低" }], "knowledgeGraph": [{ "id": "kg-1", "name": "", "type": "company", "relationToMain": "" }], "multiSources": [] },
  "spectrumLayers": [{ "layer": "micro_signal|interests|logic_chain|data_signal|deduction", "name": "", "color": "#RRGGBB", "headline": "", "content": "", "keyIndicators": [] }],
  "stakeholderImpact": [{ "name": "", "type": "company|government|person|group|industry|market", "direction": "benefit|pressure|neutral", "strength": 1, "why": "" }],
  "coreLogic": { "essence": "", "points": [], "counterIntuitive": "" },
  "bullBearDebate": { "bull": [{ "point": "", "basis": "" }], "bear": [{ "point": "", "basis": "" }], "coreDispute": "", "read": "" }
}`;

export interface AnalysisPromptInput {
  title?: string;
  source?: string;
  sourceUrl?: string;
  publishedAt?: string;
  category?: string;
  content?: string;
  contentBasis?: string;
  /** enrich = 详情懒加载；analyze = 贴链接/贴正文 */
  mode: 'enrich' | 'analyze';
  /** analyze 壳字段用的日期文案 */
  dateLabel?: string;
  timeLabel?: string;
  sourceDateLabel?: string;
  /** full=一次生成；facts=只抽事实；derive=基于已抽事实派生 */
  stage?: 'full' | 'facts' | 'derive';
  /** stage=derive 时传入阶段一的事实 JSON */
  priorFacts?: Record<string, unknown>;
}

/**
 * 构建统一深度分析 prompt。
 * enrich / analyze 共用同一套深度 JSON 契约；analyze 额外要求壳字段便于生成 NewsArticle。
 */
export function buildAnalysisFrameworkPrompt(input: AnalysisPromptInput): string {
  const stage = input.stage || 'full';
  const title = input.title || '无标题';
  const source = input.source || (input.mode === 'analyze' ? '媒体报道' : '外部信源');
  const sourceUrl = input.sourceUrl || '未提供';
  const content =
    input.content ||
    (input.mode === 'enrich'
      ? '请基于标题给出克制、可复核的分析'
      : '请结合标题分析当前热点');
  const contentBasisLine = input.contentBasis
    ? `正文依据：${input.contentBasis}\n`
    : '';

  const role =
    stage === 'facts'
      ? '你是「见微 Genway」的事实抽取员。只抽取输入材料中可核对的事实与证据（谁/做了什么/关键数字/来源），不做影响与风险推演。严格只输出 JSON（不要任何额外文字）。'
      : stage === 'derive'
        ? '你是「见微 Genway」的推演分析师。下面是同一新闻已抽取的事实（JSON）。请只基于这些事实派生逻辑树、身份影响、涟漪、利益相关方、底层逻辑与正反博弈；不得新增事实中不存在的数字、来源或事件。严格只输出 JSON（不要任何额外文字）。'
        : input.mode === 'enrich'
          ? '你是「见微 Genway」的首席深度解构分析师。请为一条外部信源浅层新闻生成《见微》深层认知字段，并严格只输出 JSON（不要任何额外文字）。'
          : '你是一个顶级深度调查记者、政经智库宏观分析师与《见微 Genway》特约总编。《见微 Genway》的核心理念是：“于细微处，读懂新闻背后。报刊为骨，数据为翼，光谱拆解为记”。请对新闻进行精辟的认知路径拆解，严格只输出合法 JSON。';

  const shellSchema =
    input.mode === 'analyze' && stage === 'full'
      ? `
壳字段（贴链接入口需要，深度字段仍须完整）：
{
  "title": "精炼的主标题（经典大报刊风格）",
  "readTimeMinutes": 4,
  "category": ${JSON.stringify(input.category || '科技前沿')},
  "tags": ["核心标签1", "标签2", "标签3"],
  "date": ${JSON.stringify(input.dateLabel || '')},
  "timeAgo": "刚刚",
  "sourceName": ${JSON.stringify(source)},
  "sourceDate": ${JSON.stringify(input.sourceDateLabel || '')},
  "sourceCount": 1,
  "impactScope": "全球|区域|特定行业|本地",
  "coreQuote": "最具有穿透力的一句金句",
  "quoteAuthor": "见微·特约观察员",
  "industrySignals": [
    { "sector": "核心行业", "strength": 0, "trend": "up|down|flat", "detail": "行业异动描述；strength 仅在有依据时填 0-100" }
  ],
  "fastReadPoints": [
    { "tag": "核心转折", "text": "精辟解释这件事为什么在今天爆发" }
  ],
  "narrativeSections": [
    { "chapter": "第一章：平静湖面下的第一缕微澜", "paragraphs": ["深度叙事段落…"] }
  ]
}
以上壳字段与下方深度字段合并为同一个 JSON 对象输出。
`
      : '';

  const auditSection =
    input.mode === 'enrich' && stage !== 'facts'
      ? `
自审要求（必须与深度字段放在同一个 JSON 内；该字段仅用于系统记录，不展示给用户）：
"audit": {
  "unsupportedClaims": ["上面输出中找不到输入材料依据的结论，最多 5 条；没有则空数组"],
  "contradictions": ["上面输出与输入材料相矛盾的表述，最多 3 条；没有则空数组"]
}
`
      : '';

  return `${role}
框架版本：${ANALYSIS_FRAMEWORK_VERSION}
${ANALYSIS_SHARED_RULES}
${shellSchema}${auditSection}
${input.priorFacts ? `已抽取事实（阶段一，作为唯一事实来源）：\n${JSON.stringify(input.priorFacts)}\n\n` : ''}深度字段 JSON 结构必须严格符合：
${stage === 'facts' ? ANALYSIS_FACTS_JSON_SCHEMA : stage === 'derive' ? ANALYSIS_DERIVED_JSON_SCHEMA : ANALYSIS_DEEP_JSON_SCHEMA}

标题：${title}
来源：${source}
原文链接：${sourceUrl}
来源发布时间：${input.publishedAt || '未提供'}
分类：${input.category || (input.mode === 'enrich' ? '外部信源' : '科技前沿')}
${contentBasisLine}正文/要点：${content}`;
}
