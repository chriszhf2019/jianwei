export type AssertionType =
  | 'fact'
  | 'derived_metric'
  | 'heuristic_signal'
  | 'model_inference'
  | 'scenario'
  | 'prediction';

export type CertificationStandard =
  | 'deterministic'
  | 'curated'
  | 'derived'
  | 'heuristic'
  | 'ai_single'
  | 'ai_consensus'
  | 'scenario'
  | 'prediction_uncalibrated'
  | 'prediction_calibrated'
  | 'human_verified'
  | 'unverified';

export interface CertificationSpec {
  id: CertificationStandard;
  label: string;
  description: string;
  limitations: string[];
}

export const CERTIFICATION_STANDARDS: Record<CertificationStandard, CertificationSpec> = {
  deterministic: {
    id: 'deterministic',
    label: '自动认证',
    description: '由确定性规则、页面快照、哈希或数据库约束直接判定。',
    limitations: ['只能证明规则覆盖的对象和范围'],
  },
  curated: {
    id: 'curated',
    label: '产品配置',
    description: '来自公开维护的编辑表、专题种子、赛道词或域名档案；属于产品配置，不是实时情报。',
    limitations: ['未登记对象不会自动推断', '配置变更不等于市场或事件已发生'],
  },
  derived: {
    id: 'derived',
    label: '派生统计',
    description: '由当前真实语料通过公开公式计算。',
    limitations: ['只代表当前样本，不代表总体'],
  },
  heuristic: {
    id: 'heuristic',
    label: '启发式',
    description: '词典、本地加权、相似度或排名规则产生的信号；可复核，但不是市场真值。',
    limitations: ['可复核但不保证语义正确', '结论需要独立评测', '不是成交价、情绪指数或官方统计'],
  },
  ai_single: {
    id: 'ai_single',
    label: 'AI 单模型推断',
    description: '由一个在线模型生成。有密钥时仍是模型推断，不是已核验事实。',
    limitations: ['模型置信度未校准', '可能漏判、误判或产生无依据内容', '配置密钥只启用生成，不改变推断性质，也不构成事实核验'],
  },
  ai_consensus: {
    id: 'ai_consensus',
    label: 'AI 多模型共识',
    description: '多个独立模型或独立运行给出一致判断。有密钥时仍是模型推断，不是已核验事实。',
    limitations: ['一致性不等于事实真值', '模型可能存在共同偏差', '配置密钥不改变推断性质'],
  },
  scenario: {
    id: 'scenario',
    label: '情景推演',
    description: '基于假设生成条件路径、触发器和证伪信号。',
    limitations: ['不是概率，也不是事实结论'],
  },
  prediction_uncalibrated: {
    id: 'prediction_uncalibrated',
    label: '未校准预测',
    description: '模型或用户给出的方向、强度和概率估计。',
    limitations: ['缺少足够到期结果时不能称为已校准'],
  },
  prediction_calibrated: {
    id: 'prediction_calibrated',
    label: '已校准预测',
    description: '使用预先登记的结果账本完成 Brier、Log Loss 和分桶校准。',
    limitations: ['校准结论仅适用于对应样本、领域和时间范围'],
  },
  human_verified: {
    id: 'human_verified',
    label: '人工认证',
    description: '由独立人工标注和分歧裁决确认。',
    limitations: ['人工标签也存在误差，需要报告一致性'],
  },
  unverified: {
    id: 'unverified',
    label: '未认证',
    description: '没有独立真值、稳定证据或校准样本。',
    limitations: ['只能作为候选，不应作为确定结论'],
  },
};

const METHOD_CERTIFICATION: Record<string, CertificationStandard> = {
  corpus_count: 'derived',
  human_annotation: 'human_verified',
  time_window: 'deterministic',
  lexicon_sentiment: 'heuristic',
  model_sentiment: 'ai_single',
  keyword_signal: 'heuristic',
  title_similarity: 'heuristic',
  bm25_retrieval: 'heuristic',
  source_grouping: 'curated',
  editorial_template: 'curated',
  source_independence: 'derived',
  syndication_detection: 'heuristic',
  media_authority: 'curated',
  ai_provenance: 'deterministic',
  cost_governance: 'deterministic',
  source_page_verification: 'deterministic',
  entity_cooccurrence: 'heuristic',
  model_extraction: 'ai_single',
  model_interpretation: 'ai_single',
  regional_impact: 'scenario',
  frequency_analysis: 'ai_single',
  adversarial_review: 'ai_single',
  region_scope_extraction: 'ai_single',
  model_scenario: 'scenario',
  local_sensitivity: 'heuristic',
  model_forecast: 'prediction_uncalibrated',
  calibrated_forecast: 'prediction_calibrated',
  contract_ledger: 'deterministic',
  event_clustering: 'heuristic',
  evidence_profile: 'derived',
};

export function certificationSpec(methodId: string): CertificationSpec {
  return CERTIFICATION_STANDARDS[METHOD_CERTIFICATION[methodId] || 'unverified'];
}

export interface MethodSpec {
  id: string;
  label: string;
  assertionType: AssertionType;
  method: string;
  basis: string;
  limitations: string[];
  calibrated: boolean;
}

export const METHOD_REGISTRY: Record<string, MethodSpec> = {
  corpus_count: {
    id: 'corpus_count',
    label: '语料计数',
    assertionType: 'derived_metric',
    method: '对当前运行时语料做集合计数与窗口过滤',
    basis: '描述统计；样本范围明确',
    limitations: ['只代表当前订阅语料，不代表全网'],
    calibrated: false,
  },
  human_annotation: {
    id: 'human_annotation',
    label: '人工评测',
    assertionType: 'fact',
    method: '人工根据定义逐条标注，支持多标注者一致性计算',
    basis: '内容分析与人工编码',
    limitations: ['需要标注指南、独立标注和分歧裁决', '样本量不足时不能推断总体表现'],
    calibrated: false,
  },
  time_window: {
    id: 'time_window',
    label: '时间窗统计',
    assertionType: 'derived_metric',
    method: '按可解析的发布时间分桶或筛选',
    basis: '时间序列描述统计',
    limitations: ['时间格式缺失或错误的条目无法进入窗口'],
    calibrated: false,
  },
  lexicon_sentiment: {
    id: 'lexicon_sentiment',
    label: '词典倾向',
    assertionType: 'heuristic_signal',
    method: '标题和摘要命中正负词后，每篇只归入正向、负向、中性或交织',
    basis: '领域词典启发式基线；可复核，不是市场真值',
    limitations: ['不能理解反讽、否定和上下文', '正负词都命中时记为交织，不按词数比大小', '不是成交情绪、调查指数或官方统计'],
    calibrated: false,
  },
  model_sentiment: {
    id: 'model_sentiment',
    label: '模型情感',
    assertionType: 'model_inference',
    method: '用户点击后，由已配置的单个模型对标题和摘要做四分类，证据必须是输入文本里的连续片段',
    basis: '生成式分类；有密钥时仍是模型推断，不是已核验事实',
    limitations: ['没有密钥时不生成', '不输出概率', '证据不在原文中则丢弃', '未校准，不能当作准确率或事实核验'],
    calibrated: false,
  },
  keyword_signal: {
    id: 'keyword_signal',
    label: '关键词信号',
    assertionType: 'heuristic_signal',
    method: '人工词表命中与阈值过滤',
    basis: '可复核的规则系统',
    limitations: ['词表决定覆盖和误报', '词命中不是事件确认'],
    calibrated: false,
  },
  title_similarity: {
    id: 'title_similarity',
    label: '标题相似度',
    assertionType: 'heuristic_signal',
    method: '字符二元组 Jaccard 与包含关系',
    basis: '近似字符串匹配',
    limitations: ['标题相似不等于同一事件或转载'],
    calibrated: false,
  },
  bm25_retrieval: {
    id: 'bm25_retrieval',
    label: 'BM25 文本检索',
    assertionType: 'heuristic_signal',
    method: '字段化 BM25 词项加权检索',
    basis: '经典信息检索概率排序模型',
    limitations: ['只能衡量词项相关性，不理解事实一致性'],
    calibrated: false,
  },
  source_grouping: {
    id: 'source_grouping',
    label: '已知来源集团',
    assertionType: 'derived_metric',
    method: '人工维护的已确认域名组',
    basis: '来源独立性与所有权区分',
    limitations: ['未登记来源保留为集团未知'],
    calibrated: false,
  },
  source_independence: {
    id: 'source_independence',
    label: '独立来源计数',
    assertionType: 'derived_metric',
    method: '真实语料按时间窗口 + 标题事件相似度聚合；AI 文本列出的媒体不计入',
    basis: '来源独立证据源原则；与 AI 推断分离',
    limitations: ['两个独立来源也可能基于同一错误原始消息', '不验证内容真实性'],
    calibrated: false,
  },
  syndication_detection: {
    id: 'syndication_detection',
    label: '通讯社/转载识别',
    assertionType: 'heuristic_signal',
    method: '相同 URL、已登记来源集团、标题相似度；双方都有已保存正文时，文本重合改用正文前 4000 字',
    basis: '文本近重复检测 + 所有权归一',
    limitations: ['高相似候选不等于授权或转载方向', '未登记集团按域名分开', '没有正文快照时只比较标题和摘要', '到达时间早不等于首发'],
    calibrated: false,
  },
  media_authority: {
    id: 'media_authority',
    label: '媒体权威档案',
    assertionType: 'fact',
    method: '人工维护域名表（A=官方媒体 / B=主流商业 / C=泛科技观点）',
    basis: '编辑档案与领域知识',
    limitations: ['A/B/C 是编辑档案，不是事实等级或可信度分数', '未收录来源标"来源未收录"，不虚标'],
    calibrated: false,
  },
  ai_provenance: {
    id: 'ai_provenance',
    label: 'AI 字段元数据',
    assertionType: 'fact',
    method: '记录 provider/model/promptVersion/generatedAt/calibration；legacy 标 legacy-unknown',
    basis: '模型审计与可复现性',
    limitations: ['可追溯内容由哪个版本生成，不验证内容正确性', '有元数据不等于已核验事实'],
    calibrated: false,
  },
  cost_governance: {
    id: 'cost_governance',
    label: 'AI 调用治理与标价',
    assertionType: 'derived_metric',
    method: '持久化真实 token、字符数、状态和错误；每日调用与 token 上限；只对价格表里能唯一对应的型号乘公开标价',
    basis: '供应商官网公开标价；对不上的调用留空',
    limitations: ['没有返回 token 时不按字符估算', '价格表没有的型号，以及分不出缓存或峰谷的型号，不估算', '付费档公开标价不是账单'],
    calibrated: false,
  },
  source_page_verification: {
    id: 'source_page_verification',
    label: '来源页面核验',
    assertionType: 'fact',
    method: '受限抓取、页面指纹、逐字引句匹配',
    basis: '可追溯引用与页面状态验证',
    limitations: ['页面可访问和引句匹配不等于整篇报道真实'],
    calibrated: false,
  },
  entity_cooccurrence: {
    id: 'entity_cooccurrence',
    label: '实体共现',
    assertionType: 'heuristic_signal',
    method: '真实 entityMentions 聚合与同篇共现',
    basis: '集合共现统计',
    limitations: ['共现不代表合作、投资或因果'],
    calibrated: false,
  },
  model_extraction: {
    id: 'model_extraction',
    label: 'AI 结构化抽取',
    assertionType: 'model_inference',
    method: '大模型按指定 schema 抽取和归纳',
    basis: '生成式语言模型推断；有密钥时仍是模型推断，不是已核验事实',
    limitations: ['可能漏标、误标或生成无依据内容', '模型自评分未经校准', '配置密钥不构成事实核验'],
    calibrated: false,
  },
  model_interpretation: {
    id: 'model_interpretation',
    label: 'AI 综合解读',
    assertionType: 'model_inference',
    method: '模型在输入材料范围内综合事实、动因与影响，并单独列出判断边界',
    basis: '生成式语言模型归纳与推断；有密钥时仍是模型推断，不是已核验事实',
    limitations: ['判断不等于事实', '关键依据仍应回到原文或独立来源核验', '配置密钥只启用生成，不改变推断性质'],
    calibrated: false,
  },
  regional_impact: {
    id: 'regional_impact',
    label: '地区影响推演',
    assertionType: 'scenario',
    method: '基于所选地区与行业的真实文章材料，生成原因假设、跨地区传导路径和观察指标',
    basis: '情景规划与条件推演；有密钥时仍是模型推断，不是已核验事实',
    limitations: ['跨地区影响是条件假设，不是事实或概率', '只覆盖输入文章明确提供的线索，可能遗漏线下传导因素', '配置密钥不构成事实核验'],
    calibrated: false,
  },
  frequency_analysis: {
    id: 'frequency_analysis',
    label: 'AI 频发归因',
    assertionType: 'model_inference',
    method: '结合窗口内真实文章，生成频发候选原因、支持证据、传导机制和替代解释',
    basis: '生成式语言模型推断；有密钥时仍是模型推断，不是已核验事实',
    limitations: ['候选原因不是已证实因果', '无法排除报道偏差、来源集中和共同外部冲击', '配置密钥不构成事实核验'],
    calibrated: false,
  },
  adversarial_review: {
    id: 'adversarial_review',
    label: 'AI 对抗审稿',
    assertionType: 'model_inference',
    method: '大模型按固定问题清单寻找下行风险、误读和盲点',
    basis: '对抗性审稿与反事实检查；有密钥时仍是模型推断，不是已核验事实',
    limitations: ['只能提出需要核验的风险假设，不能证明风险确实发生', '可能遗漏未在输入中出现的风险', '配置密钥不构成事实核验'],
    calibrated: false,
  },
  region_scope_extraction: {
    id: 'region_scope_extraction',
    label: '地区范围抽取',
    assertionType: 'model_inference',
    method: '分别抽取报道提及、事件发生和实际受影响地区；无法判断时保留未标范围',
    basis: '地区语义分层与信息抽取',
    limitations: ['模型可能混淆提及地、发生地和受影响地', '旧数据未标范围，不能自动反推'],
    calibrated: false,
  },
  model_scenario: {
    id: 'model_scenario',
    label: 'AI 情景推演',
    assertionType: 'scenario',
    method: '模型生成条件路径、触发器和证伪信号',
    basis: '情景规划与条件推演；有密钥时仍是模型推断，不是已核验事实',
    limitations: ['是假设空间，不是概率或事实', '配置密钥不构成事实核验'],
    calibrated: false,
  },
  local_sensitivity: {
    id: 'local_sensitivity',
    label: '本地加权引擎',
    assertionType: 'heuristic_signal',
    method: '逻辑树权重的线性净动量与 ±10% 微扰',
    basis: '本地启发式加权；可复核，不是市场真值或发生概率',
    limitations: ['不是概率，不识别真实因果效应', '权重来自编辑模板或文章逻辑树，不是成交数据'],
    calibrated: false,
  },
  model_forecast: {
    id: 'model_forecast',
    label: '模型预测估计',
    assertionType: 'prediction',
    method: '模型生成方向与概率估计',
    basis: '前瞻预测任务',
    limitations: ['未校准前只能称为模型估计'],
    calibrated: false,
  },
  calibrated_forecast: {
    id: 'calibrated_forecast',
    label: '已校准预测',
    assertionType: 'prediction',
    method: '结果 ledger、Brier、Log Loss 与分桶校准',
    basis: '概率评分规则与校准评估',
    limitations: ['需要足够样本和分领域验证'],
    calibrated: true,
  },
  contract_ledger: {
    id: 'contract_ledger',
    label: '预测契约账本',
    assertionType: 'fact',
    method: '在命题签发时保存数据截止时间，在到期后保存结果证据、来源和裁决',
    basis: '预注册、时间隔离与可回测性',
    limitations: ['结果仍依赖人工证据录入和多源复核', '单次结果不能证明长期校准'],
    calibrated: false,
  },
  event_clustering: {
    id: 'event_clustering',
    label: '事件候选聚合',
    assertionType: 'derived_metric',
    method: '7 天窗口内标题相似度 ≥46% 聚合为同题候选；跨媒体稿记为额外来源',
    basis: '文本近重复检测 + 时间窗口',
    limitations: ['标题相似不等于同一事件', '阈值 46% 为经验值非最优解'],
    calibrated: false,
  },
  editorial_template: {
    id: 'editorial_template',
    label: '编辑种子',
    assertionType: 'scenario',
    method: '人工维护的专题、赛道词、固定叙述、权重或情景表',
    basis: '产品配置 / 编辑种子，不是实时情报',
    limitations: ['不能当作该新闻的模型结论或市场即时信号', '配置变更不等于事件已发生', '只适合说明阅读框架与产品口径'],
    calibrated: false,
  },
  evidence_profile: {
    id: 'evidence_profile',
    label: '证据画像',
    assertionType: 'derived_metric',
    method: '综合来源核验 + 独立来源数 + 媒体档案，归为 corroborated/official-single/single-source/unverified',
    basis: '多源印证原则',
    limitations: ['只验证引句是否逐字出现，不验证整篇报道为真', '独立来源仍可能基于同一错误原始消息'],
    calibrated: false,
  },
};

export function methodSpec(id: keyof typeof METHOD_REGISTRY | string): MethodSpec {
  return METHOD_REGISTRY[id] || METHOD_REGISTRY.corpus_count;
}
