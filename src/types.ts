export type PrimaryNavTab = 'home' | 'intelligence' | 'topics' | 'region' | 'my_focus';

export type HomeReadingMode = 'standard' | 'tongsu' | 'dehydrated';

export type CognitiveDetailTab = 
  | 'seven_elements'       // 事实：七要素 + AI 裁决
  | 'logic_tree'           // 推演：因果树 + 涟漪传导（两段合并）
  | 'relevance_identity'   // 身份：与我何干 (6大身份)
  | 'deep_spectrum'        // 通读：五层光谱深度全览
  | 'forecast_arena';      // 前瞻：人机预测擂台 (约定时间验证与方法论比对)

export type DetailCognitiveTab = CognitiveDetailTab;

export type UserPersonaId = 
  | 'investor'     // 投资者
  | 'manager'      // 企业管理者
  | 'founder'      // 创业者
  | 'pm'           // 产品经理
  | 'dev'          // 开发者/工程师
  | 'sales_mkt';   // 销售/市场人员

export interface UserPersona {
  id: UserPersonaId;
  name: string;
  avatarIcon: string;
  tagline: string;
  focusKeywords: string[];
}

export type ReadingMode = 
  | 'classic'          // 经典报刊节奏（DeepSpectrumTab 内联实现）
  | 'fast_dialogue'    // 对话快读 (Axios · The Browser)
  | 'data_driven'      // 数据驱动 (Bloomberg · Nikkei Asia)
  | 'magazine'         // 现代杂志 (Kinfolk · 界面新闻)
  | 'immersive';       // 沉浸叙事 (NYT Longform · The Pudding)

export type SpectrumLayerType = 'micro_signal' | 'interests' | 'logic_chain' | 'data_signal' | 'deduction';

export interface SpectrumLayer {
  layer: SpectrumLayerType;
  name: string;
  color: string;
  headline: string;
  content: string;
  keyIndicators: string[];
}

export interface EvidenceItem {
  id: string;
  claim: string;
  sourceFact: string;
  reliability: string;
  confidenceScore: number;
  /** 模型给出的来源链接；有链接仅代表可点击核验，不代表平台已确认内容。 */
  sourceUrl?: string | null;
  /** 支持该论断的原文短引句。 */
  quote?: string;
  sourceName?: string;
  publishedAt?: string | null;
  sourceType?: 'primary_document' | 'official_statement' | 'reported_media' | 'unknown' | string;
  relation?: 'supports' | 'contradicts' | 'context';
  /** 由服务端派生，模型不能写入。 */
  verificationStatus?: 'linked' | 'unlinked';
  verificationNote?: string;
  matchedOffset?: number;
}

export interface IndustrySignal {
  sector: string;
  strength: number; // 0 - 100
  trend: 'up' | 'down' | 'neutral';
  detail: string;
}

export interface FastReadPoint {
  tag: string;
  text: string;
}

export interface NarrativeSection {
  chapter: string;
  paragraphs: string[];
}

// 7 Elements + AI Verdict
export interface SevenElementsData {
  what: string;
  who: string;
  when: string;
  where: string;
  why: string;
  how: string;
  soWhat: string;
  aiVerdict: {
    confidenceScore: number; // e.g. 92%
    volatility: '高' | '中' | '低';
    actionLevel: '行动' | '关注' | '观望';
    verdictSummary: string;
  };
}

export type SevenElements = SevenElementsData;

/** 首页卡片按需生成的 7W 精简摘要；与详情页完整 sevenElements 分开存储，避免互相覆盖。 */
export interface SevenWSummary {
  what: string;
  who: string;
  when: string;
  where: string;
  why: string;
  how: string;
  soWhat: string;
}

/** 趋势为条件情景，不包含伪精确概率。 */
export interface TrendForecastData {
  shortTerm: string;
  midTerm: string;
  keyVariables: string;
  invalidation: string;
}

/** 风险审稿固定四问，便于快速阅读和逐项复核。 */
export interface RiskReviewData {
  mainRisk: string;
  misread: string;
  blindSpot: string;
  watchMetrics: string;
}

/** 首页卡片 AI 综合解读：判断、依据、影响与边界分开，避免与 7W 事实摘要混用。 */
export interface GrayscaleMembership {
  hypothesis: string;
  score: number; // 模型隶属度 0-100，不是校准概率
}

export interface GrayscaleAssessment {
  memberships: GrayscaleMembership[];
  evidenceStrength: '高' | '中' | '低';
  support: string[];
  oppose: string[];
  uncertain: string[];
  reverseRisks: string[];
  decision: '行动' | '持续观察';
  decisionReason: string;
}

export interface AiInterpretationData {
  core: string;
  basis: string;
  impact: string;
  limits: string;
  grayscale?: GrayscaleAssessment;
}

// Logic Tree Node
export interface LogicTreeNode {
  id: string;
  label: string;
  category: 'cause' | 'mid_effect' | 'market_impact';
  description: string;
  dataPoint?: string;
  children?: string[]; // node IDs
}

export interface VariableWeight {
  name: string;
  weight: number; // percentage (e.g. 35)
  impactDirection: 'up' | 'down' | 'neutral';
  description: string;
}

export interface LogicTreeData {
  rootCause: string;
  nodes: LogicTreeNode[];
  variableWeights: VariableWeight[];
}

// Persona Impact ("与我何干")
export interface PersonaImpactItem {
  personaId: UserPersonaId;
  coreImpact: string;
  opportunity: string;
  threatRisk: string;
  recommendedAction: string;
}

/** 概率带口径：AI 只给 低/中/高 估计，不做伪精确百分比 */
export type ProbabilityBand = '低' | '中' | '高';

/** 身份化「正反双向预测」（AI 情景 + 本地主线模型口径分离；AI 观点非事实结论） */
export interface PersonaForecastItem {
  personaId: UserPersonaId;
  /** 生成时间（ISO，服务端写回时打点） */
  generatedAt?: string;
  /** 主推演时间窗，如 “3-6 个月” */
  horizon?: string;
  /** 主线更可能利好 / 利空该身份，或方向不明 */
  directionBias?: 'positive' | 'negative' | 'mixed';
  bull: {
    scenario: string; // 正向情景：事件如何展开会兑现利好
    band: ProbabilityBand; // 情景兑现的概率带估计
    horizon?: string;
    payoff: string; // 最具体的受益点
    triggers: string[]; // 触发该路径的关键条件（若…则…）
    falsify: string[]; // 出现即证伪的信号
  };
  bear: {
    scenario: string; // 反向情景：事件如何展开会兑现风险
    band: ProbabilityBand;
    horizon?: string;
    impact: string; // 最具体的受损点
    triggers: string[];
    falsify: string[];
  };
  keyMonitor: string; // 一句话：盯什么来验证哪条路径更可能
}

export type PersonaImpact = PersonaImpactItem;

// Ripple Effect
export interface RippleStage {
  stage: '一阶影响' | '二阶影响' | '三阶影响';
  title: string;
  timeframe: string;
  items: string[];
  severity: '高' | '中' | '低';
}

export interface MultiSourceFact {
  sourceName: string;
  tier: 'Tier 1 顶级权威' | 'Tier 2 主流媒体' | 'Tier 3 行业论坛/自媒体' | string;
  stance: '正面' | '中性' | '负面' | '预警' | string;
  verified: boolean;
  excerpt: string;
}

export interface KnowledgeGraphNode {
  id: string;
  name: string;
  type: 'company' | 'tech' | 'policy' | 'market' | 'person' | string;
  relationToMain: string;
}

export interface RippleEffectData {
  stages: RippleStage[];
  knowledgeGraph: KnowledgeGraphNode[];
  multiSources: MultiSourceFact[];
}

// Full News Article
export interface EntityMention {
  /** 本地规范化后的稳定 ID；未知实体使用名称哈希，不做强制归并。 */
  id?: string;
  /** 模型返回的原始表面词，保留用于复核和实体链接。 */
  surface?: string;
  name: string;
  type: string;
  confidence: number;
  /** 仅在输入标题或摘要中逐字定位成功时写入。 */
  evidence?: {
    field: 'title' | 'summary';
    start: number;
    end: number;
    exact: true;
  };
}

export type RegionScope = 'mentioned' | 'event' | 'affected' | 'unspecified';

export interface RegionMention {
  region: string;
  confidence: number;
  scope: RegionScope;
}

export interface NewsArticle {
  id: string;
  title: string;
  subtitle: string;
  oneSentenceVerdict: string; // 一句话结论 / 解读
  category: string;
  tags: string[];
  date: string;
  timeAgo: string;
  readTimeMinutes: number;
  summary: string;
  coreQuote: string;
  quoteAuthor: string;
  sourceName: string;
  sourceDate: string;
  sourceCount: number;
  credibilityStars?: number; // 已下线占位字段，新建文章不再写入；保留可选以兼容历史语料
  impactScope: '全球' | '区域' | '特定行业' | '本地' | string;
  changeVelocity?: '↑↑ 极快' | '↑ 快速' | '→ 稳定' | '↓ 放缓' | string;
  coverImage?: string;
  
  // Accessible / Tongsu mode content
  tongsuSummary: {
    simpleSay: string;       // 简单说
    whyExplanation: string;  // 为什么？（生活化比喻）
    whatItMeans: string;     // 这意味着什么？
    jargonTerms: string[];   // 涉及的可点击术语
  };

  // Dehydrated mode items
  dehydratedItems: {
    coreEntity: string;      // 例如: NVIDIA / 美联储
    keyAction: string;       // 核心动作/异动
    relatedCount: number;    // 相关新闻条数
    coreShifts: string[];    // 核心转变点 (3条)
    impactHighlights: string[]; // 影响亮点
  };

  // 4-Stage Cognitive Architecture
  sevenElements?: SevenElementsData;
  /** 首页卡片 7W 精简摘要（按需生成，不替代完整七要素） */
  sevenWBrief?: SevenWSummary;
  /** 首页卡片 AI 综合解读（按需生成，属于模型推断） */
  aiInterpretation?: AiInterpretationData;
  logicTree?: LogicTreeData;
  personaImpacts?: PersonaImpactItem[];
  rippleEffect?: RippleEffectData;

  // Deep layers & Evidence
  spectrumLayers: SpectrumLayer[];
  evidenceChain?: EvidenceItem[];
  industrySignals?: IndustrySignal[];
  fastReadPoints?: FastReadPoint[];
  narrativeSections?: NarrativeSection[];
  isCustom?: boolean;
  /** 技能产物：AI 一句话解读（quickVerdictText）等，均为可复核文本（非事实结论） */
  quickVerdictText?: string | { text?: string };
  trendForecastText?: string | TrendForecastData | { text?: string };
  riskReviewText?: string | RiskReviewData | { text?: string };
  /** 全景时间轴：本篇之前的关键相关节点（AI 深读生成，date 正序） */
  backstoryTimeline?: Array<{ date: string; event: string; relevance: string }>;
  /** 影响力与利益相关方（AI 深读生成）：每方的受益/承压方向与强度 */
  stakeholderImpact?: Array<{ name: string; type: string; direction: 'benefit' | 'pressure' | 'neutral'; strength: number; why: string }>;
  /** 底层逻辑分析（AI 深读生成）：本质一句话 + 核心逻辑 + 反直觉点 */
  coreLogic?: { essence: string; points: string[]; counterIntuitive?: string };
  /** 正反方博弈（AI 深读生成）：多空论点 + 分歧焦点 + 力量判断 */
  bullBearDebate?: { bull: Array<{ point: string; basis?: string }>; bear: Array<{ point: string; basis?: string }>; coreDispute?: string; read?: string };
  /** AI 补充相关报道线索（记忆召回，非实时联网） */
  relatedNews?: Array<{ title: string; media: string; why: string }>;
  /** 身份化「正反双向预测」（/api/skill/personaforecast 生成，按 personaId 累积） */
  personaForecasts?: PersonaForecastItem[];
  /** 由外部信源（RSS ingest）摄取：无深层认知字段，可触发 /api/enrich 懒加载补全 */
  isExternal?: boolean;
  /** 外部信源原文链接（ingest 时写入） */
  sourceUrl?: string;
  /** 同一事件的真实发布记录；用于识别跨媒体转载而不重复渲染文章。 */
  sourceOccurrences?: Array<{
    sourceName: string;
    sourceUrl: string;
    publishedAt?: string | null;
    title?: string;
  }>;
  /** 外部信源发布时间（RSS pubDate 原始串；用于 24H 到达热力等真实时间统计） */
  publishedAt?: string;
  /** AI 全量标注写回的内容涉事地区（/api/regions/annotate） */
  regionMentions?: RegionMention[];
  /** AI 全量标注写回的涉事主体（/api/entities/annotate） */
  entityMentions?: EntityMention[];
  /** 各 AI 字段的生成来源与版本；用于审计模型切换、提示词更新和缓存命中。 */
  aiFieldMeta?: Record<string, AiFieldMeta>;
}

export interface AiFieldMeta {
  generatedAt?: string;
  provider: 'gemini' | 'deepseek' | 'unknown';
  model: string;
  promptVersion: string;
  method: 'ai_generation' | 'legacy_unknown';
  certificationStandard: 'ai_single' | 'ai_consensus' | 'scenario' | 'unverified';
  calibrationStatus: 'uncalibrated';
}

export interface SourceInspectionResult {
  status:
    | 'verified_quote'
    | 'quote_not_found'
    | 'quote_too_short'
    | 'reachable_unverified'
    | 'blocked'
    | 'timeout'
    | 'too_large'
    | 'unsupported'
    | 'http_error'
    | 'network_error';
  requestedUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  title?: string;
  canonicalUrl?: string;
  excerpt?: string;
  contentHash?: string;
  quoteFound?: boolean;
  matchedContext?: string;
  matchedOffset?: number;
  cached?: boolean;
  fetchedAt: string;
  reason?: string;
}

// Intelligence Hub Types
export interface MarketStatusMetrics {
  optimismScore: number; // e.g. 68
  optimismTrend: number; // e.g. +12%
  policySensitivity: number; // e.g. 82
  policyTrend: number; // e.g. +8%
  techBreakthroughs: number; // e.g. 17
  techTrend: number; // e.g. +23%
  netOptimism: number; // e.g. +18
  optimismRatio: number; // e.g. 68%
  pessimismRatio: number; // e.g. 32%
  majorSignals: number; // e.g. 8
  importantChanges: number; // e.g. 23
  normalEvents: number; // e.g. 127
}

export interface HeatmapCell {
  category: string;
  timeSlot: string; // '00:00' | '04:00' | '08:00' | '12:00' | '16:00' | '20:00' | '24:00'
  intensity: number; // 0 to 5 (0=none, 5=peak)
  reason: string; // 为什么这个时间段突然变热？
  triggerArticles: string[];
}

export interface HeatmapTimeSlot {
  time: string;
  intensity: number;
  label: string;
}

export interface IntelligenceDensityPoint {
  hour: string;
  count: number;
  burstEvent?: string;
}

export interface SourceHealthData {
  healthScore: number; // e.g. 92
  tier1Ratio: number; // 38%
  tier2Ratio: number; // 44%
  tier3Ratio: number; // 18%
  stars5Ratio: number; // 62%
  stars4Ratio: number; // 27%
  stars3Ratio: number; // 8%
  stars2Ratio: number; // 2%
  stars1Ratio: number; // 1%
  activeConflicts: SourceConflictCase[];
  overallHealthScore?: number;
  tierBreakdown?: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  credibilityDistribution?: {
    stars5: number;
    stars4: number;
    stars3: number;
    stars2: number;
    stars1: number;
  };
  conflictCases?: SourceConflictCase[];
  totalSourcesMonitored?: number;
}

export interface SourceConflictCase {
  id: string;
  topic: string;
  sourcesStance: Array<{
    source: string;
    stance: '正面' | '中性' | '负面' | string;
    claim: string;
  }>;
  aiJudgment: string;
  confidenceScore: number;
}

export interface BlindspotItem {
  id: string;
  sector: string;
  coverageRatio: number; // e.g. 15% (under-covered)
  alertMessage: string;
  recommendedTopic: string;
  missedKeyPoint: string;
  category?: string;
  coveragePercent?: number;
  mainstreamBiasDesc?: string;
  blindspotFinding?: string;
  actionGuidance?: string;
}

export interface TomorrowForecastItem {
  id: string;
  rank: number;
  event: string;
  probability: number; // e.g. 82%
  potentialImpact: string;
  disclaimer: string;
  category?: string;
  eventName?: string;
  impactExpected?: string;
  evidenceCount?: number;
}

export interface RadarKeyword {
  id: string;
  keyword: string;
  count: number;
  countChange: string; // e.g. +42%
  sentimentTrend: string; // e.g. +18%
  marketAttention: string; // e.g. +67%
  level: 'red' | 'orange' | 'green';
  recentNewsTitle: string;
}

export interface TopicCluster {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  articleCount: number;
  updatedAt: string;
  summary: string;
  coreConflict: string;
  tags: string[];
  articleIds: string[];
  timeline: Array<{
    date: string;
    milestone: string;
    impact: string;
  }>;
}

export interface TerminologyDefinition {
  term: string;
  category: string;
  simpleExplain: string;
  metaphor: string;
  oppositeTerm?: string;
  oppositeExplain?: string;
  memoryRule: string;
  exampleContext: string;
}

// Cross-Event Synergy & Hidden Nexus
export interface CrossEventSynergy {
  id: string;
  title: string;
  resonanceLevel: '突变级共振' | '结构级交汇' | '周期级传导';
  resonanceScore: number; // 0 - 100
  articleIds: string[]; // 2 or more articles
  articleTitles: string[];
  hiddenNexusTheme: string; // 底层暗线主题 (e.g. 算力能耗与物理电网的硬性碰撞)
  sharedBottleneck: string; // 共同底层瓶颈
  synergyChain: Array<{
    step: string;
    sourceArticle: string;
    mechanism: string;
  }>;
  jointImpacts: {
    firstOrder: string;
    secondOrder: string;
    thirdOrder: string;
  };
  aiJointVerdict: string;
  recommendedAction: string;
}

// ==========================================
// Superforecasting & Human-AI Prediction Arena
// ==========================================
export type AIModelChoice = 
  | 'deepseek-r1' 
  | 'gemini-2.5-pro' 
  | 'deepseek-v3' 
  | 'gemini-3.7-flash'
  | 'jianwei-local'; // 见微本地加权引擎（确定性规则，不是在线模型）

export interface ModelProviderInfo {
  id: AIModelChoice;
  name: string;
  provider: 'DeepSeek' | 'Google' | 'OpenAI' | 'Anthropic';
  tag: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  specialty: string;
}

export interface PresetPredictionQuestion {
  id: string;
  question: string;
  category: string;
  horizonDays: number;
  horizonLabel: string;
  baseRateHistory: string; // e.g. "历史同类技术跨越平均耗时 14.2 个月，基准成功率 38%"
  defaultOptions: {
    positive: string;
    negative: string;
    neutral?: string;
  };
}

export interface UserPredictionInput {
  question: string;
  selectedDirection: 'positive' | 'negative' | 'neutral';
  directionText: string;
  confidenceScore: number; // 0 - 100
  targetHorizonDays: number;
  targetVerificationDate: string;
  corePremises: string[]; // 用户立论前提
  falsifiableIndicator: string; // 用户自设可证伪关键触发指标
  userNotes?: string;
}

export interface AIPredictionOutput {
  modelChoice: AIModelChoice;
  modelName: string;
  modelRationale: string;
  direction: 'positive' | 'negative' | 'neutral';
  directionText: string;
  confidenceScore: number; // 0 - 100；具体语义由 probabilityKind 决定
  /** model_estimate=模型估计概率；direction_strength=本地方向强度，不是概率。 */
  probabilityKind?: 'model_estimate' | 'direction_strength';
  /** 未经本地历史样本校准时，界面不得把它作为真实概率或“基准达成率”展示。 */
  calibrationStatus?: 'uncalibrated' | 'empirically_calibrated';
  certificationStandard?: 'heuristic' | 'ai_single' | 'prediction_uncalibrated' | 'prediction_calibrated';
  baseRatePercentage?: number; // 仅在存在真实历史样本时才是基准概率
  causalLogicChain: Array<{
    step: string;
    deduction: string;
  }>;
  keyAssumptions: string[];
  counterIntuitiveBlindspot: string; // AI 发现的反直觉认知盲区
  falsifiableTriggers: string[]; // 触发该预测失效的硬性量化指标
  verdictSummary: string;
  /** 在线 reasoner 模型的思考链原文（如 DeepSeek reasoning_content），本地引擎无此字段 */
  thinkingTrace?: string;
}

export interface MethodologyLessonItem {
  id: string;
  title: string;
  authorOrOrigin: string; // e.g. "菲利普·泰特洛克《超级预测》"
  principle: string;
  explanation: string;
  actionablePractice: string;
}

export interface CognitiveGapReport {
  probabilityDelta: number; // User - AI (e.g. +23%)
  sentimentDivergence: '过度乐观溢价' | '审慎保守折价' | '变量权重分歧' | '高度共识协同';
  divergenceDiagnosis: string;
  blindspotComparison: {
    userFocused: string;
    aiHighlighted: string;
    divergenceReason: string;
  };
  methodologyLessons: MethodologyLessonItem[];
}

export interface PredictionContract {
  id: string;
  articleId: string;
  articleTitle: string;
  articleCategory: string;
  question: string;
  createdAt: string;
  /** 命题签发时可用的数据截止时间，防止使用未来信息回测。 */
  dataCutoffAt?: string;
  targetVerificationDate: string;
  userPred: {
    direction: 'positive' | 'negative' | 'neutral';
    directionText: string;
    confidence: number;
    premises: string[];
    falsifiableIndicator: string;
  };
  aiPred: {
    modelName: string;
    direction: 'positive' | 'negative' | 'neutral';
    directionText: string;
    confidence: number;
    verdict: string;
  };
  gapSummary: string;
  status: 'pending' | 'verified_hit_user' | 'verified_hit_ai' | 'verified_both_win' | 'verified_both_miss';
  actualOutcome?: string;
  outcomeEvidence?: string;
  outcomeSourceUrl?: string;
  outcomeSourceName?: string;
  resolutionDate?: string;
  reflectionNotes?: string;
  brierScore?: number; // 0 (perfect) - 2 (worst)
  ledger?: 'server' | 'local';
  integrityHash?: string;
  integrityValid?: boolean;
  dueState?: 'resolved' | 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'invalid';
  daysUntilDue?: number | null;
  outcomeReviews?: Array<{
    reviewer: string;
    decision: 'confirm' | 'dispute';
    notes?: string;
    createdAt: string;
    integrityValid: boolean;
  }>;
  reviewStatus?: 'provisional' | 'confirmed' | 'disputed';
  reviewCount?: number;
  confirmationCount?: number;
  disputeCount?: number;
}

// ==========================================
// 战略知识库沉淀数据契约 (Knowledge Base)
// ==========================================

export interface KnowledgeItem {
  id: string;
  articleId?: string;
  title: string;
  category: string;
  tags: string[];
  sourceName?: string;
  publishedAt?: string;
  oneSentenceVerdict: string;
  keyTakeaways: string[];
  coreMechanisms?: string;
  decisionImplication?: string;
  personalNote?: string;
  createdAt: string;
}

// ==========================================
// Snapshot（服务端 /api/snapshot 派生数据契约）

// ==========================================

export interface SnapshotMeta {
  generatedAt: string;
  corpus: string; // 'curated' | 'live'
  corpusSize: number;
  demo: boolean; // 无真实信源/无 Key 时为 true
  note?: string;
}

export interface SnapshotDerived {
  categoryCounts: Record<string, number>;
  starDistribution: Record<number, number>;
  velocityCounts: Record<string, number>;
  tagFrequency: Array<{ tag: string; count: number }>;
  sourceStats: { total: number; avgPerArticle: number };
  /** AI 涉事地区标注（/api/regions/annotate 写回后才有） */
  regionMentionDistribution?: Array<{ region: string; weight: number }>;
  regionAnnotatedCount?: number;
}

export interface SnapshotResponse {
  meta: SnapshotMeta;
  derived: SnapshotDerived;
  notYetDerived: string[];
}
