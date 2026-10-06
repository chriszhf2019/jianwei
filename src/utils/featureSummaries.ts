export type FeatureSummaryId =
  | 'home'
  | 'home-reading'
  | 'card-ai'
  | 'card-7w'
  | 'card-trend'
  | 'card-risk'
  | 'card-related'
  | 'global-search'
  | 'ai-submit'
  | 'audio-brief'
  | 'persona'
  | 'intelligence-overview'
  | 'intelligence-signals'
  | 'intelligence-sources'
  | 'intelligence-regions'
  | 'intelligence-advisor'
  | 'situation-readout'
  | 'frequent-pattern'
  | 'topics'
  | 'region-matrix'
  | 'region-flow'
  | 'region-entities'
  | 'region-drill'
  | 'region-aggregate'
  | 'region-impact'
  | 'focus-overview'
  | 'focus-contracts'
  | 'focus-watchlist'
  | 'focus-evaluation'
  | 'detail-seven'
  | 'detail-logic'
  | 'detail-identity'
  | 'detail-forecast'
  | 'detail-spectrum'
  | 'settings-profile'
  | 'settings-ai'
  | 'settings-feeds'
  | 'settings-taxonomy'
  | 'settings-radar'
  | 'settings-usage'
  | 'settings-backups'
  | 'settings-audit'
  | 'settings-users';

export interface FeatureSummarySpec {
  title: string;
  purpose: string;
  when: string;
  output: string;
  boundary: string;
}

export const FEATURE_SUMMARIES: Record<FeatureSummaryId, FeatureSummarySpec> = {
  home: {
    title: '当日看板与情报流',
    purpose: '看清今天的大盘：当日情绪、赛道、突发，以及今日信息流；单条用「读懂新闻」拆解。',
    when: '每天第一次进入，或需要回答「今天整体怎样」时。',
    output: '当日看板指标、今日新闻列表、读懂新闻入口。',
    boundary: '只代表当前订阅语料的今日切片，不回退近 30 天充数；不等于全网，排序不等于重要性。',
  },
  'home-reading': {
    title: '阅读模式',
    purpose: '用不同信息密度展示同一批新闻，适应快速浏览或完整理解。',
    when: '时间有限时用脱水模式，需要解释时用通俗模式，需要完整信息时用标准模式。',
    output: '标准、通俗和脱水三种阅读排版。',
    boundary: '模式只改变呈现方式，不改变事实内容。',
  },
  'card-ai': {
    title: 'AI综合解读',
    purpose: '综合事实、影响和边界，并输出隶属度、支持证据、反对证据和不确定变量。',
    when: '需要快速形成初步判断，但不能只得到一个极端结论时。',
    output: '核心判断、灰度隶属度、三清单、反向风险和黑白决策。',
    boundary: '有密钥时仍是AI单模型推断，不是已核验事实；隶属度未校准，不等于真实概率。',
  },
  'card-7w': {
    title: '7W事件模型',
    purpose: '用What、Who、When、Where、Why、How、So What整理事件基本结构。',
    when: '需要先弄清事实，再进入判断和预测时。',
    output: '七个结构化事实或未说明项。',
    boundary: '有密钥时仍是模型结构化摘要，不是已核验事实；不替代原文。',
  },
  'card-trend': {
    title: '趋势模型',
    purpose: '按短期、中期、关键变量和失效条件推演可能变化。',
    when: '需要判断接下来可能往哪里走时。',
    output: '四行条件情景和观察信号。',
    boundary: '有密钥时仍是情景推演，不是概率预测，也不是已核验事实。',
  },
  'card-risk': {
    title: '风险模型',
    purpose: '主动寻找主要风险、误读、盲点和需要观察的指标。',
    when: '需要检查乐观判断遗漏了什么时。',
    output: '风险、误解、盲点和关注指标。',
    boundary: '有密钥时仍是对抗审稿提出的风险假设，不证明风险一定发生，也不是已核验事实。',
  },
  'card-related': {
    title: '关联背景',
    purpose: '从当前语料中查找同主体或同题材的旧闻，补充事件背景。',
    when: '当前新闻缺少前情，需要回看此前报道时。',
    output: '站内相关文章和原文链接。',
    boundary: '基于BM25文本相似度，只代表检索相关，不代表因果或事实一致。',
  },
  'global-search': {
    title: '全局搜索',
    purpose: '按关键词查找当前语料中的新闻、实体和关注线索。',
    when: '已经知道要查什么，不想逐页浏览时。',
    output: '匹配文章和可进入的详情入口。',
    boundary: '搜索范围是当前订阅语料，不是全网搜索。',
  },
  'ai-submit': {
    title: '读懂新闻',
    purpose: '贴新闻链接抓取正文，或直接粘贴内容，生成结构化解读。',
    when: '看到站外新闻，或手头有一段原文，希望用同一套认知流程读懂时。',
    output: '七要素、逻辑、影响和证据线索（模型推断）。',
    boundary: '输入材料质量决定输出质量；抓取正文不等于事实核验；AI 推断仍需对照原文核对。',
  },
  'audio-brief': {
    title: '今日音频简报',
    purpose: '把今日语料核心变化整理成短音频摘要。',
    when: '不方便阅读但需要快速了解今日情报时。',
    output: '语音简报和可回看的文本要点。',
    boundary: '语音生成为辅助摘要，不替代原文。',
  },
  persona: {
    title: '身份透镜',
    purpose: '按投资者、管理者、创业者等身份重新评估新闻影响。',
    when: '需要回答“这件事和我有什么关系”时。',
    output: '机会、风险、影响和行动建议。',
    boundary: '身份映射是分析框架，不是个性化投资建议。',
  },
  'intelligence-overview': {
    title: '最近态势概览',
    purpose: '汇总近窗（默认近 7 日）语料规模、信号强度、来源覆盖和主要赛道。',
    when: '需要看「最近一段时间」而不是仅看今天时。',
    output: '近窗态势、行动指引和关键指标。',
    boundary: '派生统计只描述近窗运行时语料，不代表总体世界；当日大盘请回首页。',
  },
  'intelligence-signals': {
    title: '最近信号观察',
    purpose: '在近窗语料上发现跨事件共振、时间分布和内容密度异常。',
    when: '需要寻找近几日热点、突变或潜在关联时。',
    output: '共振候选、热力时间和密度曲线。',
    boundary: '文本共振和时间聚集是启发式信号，不等于因果关系。',
  },
  'intelligence-sources': {
    title: '来源与实体',
    purpose: '检查语料来源完整性、实体覆盖和转载传播结构。',
    when: '需要判断某个热点是否只有单一来源时。',
    output: '来源健康、实体覆盖、转载和独立来源线索。',
    boundary: '来源数量增加不等于内容真实，可能仍基于同一原始消息。',
  },
  'intelligence-regions': {
    title: '地区观察',
    purpose: '从语料中发现地区集中、依赖和跨地区影响线索。',
    when: '需要先判断哪些地区值得深潜时。',
    output: '地区分布、依赖预警和深潜入口。',
    boundary: '地区标注来自AI或词典，范围仍需复核。',
  },
  'intelligence-advisor': {
    title: 'AI战略顾问',
    purpose: '基于当前情报回答与决策角色相关的问题。',
    when: '需要把零散信号转成结构化问题分析时。',
    output: '基于语料的回答、依据和边界。',
    boundary: 'AI回答不能代替原始材料核验。',
  },
  'situation-readout': {
    title: '态势解读',
    purpose: '把统计指标翻译成“怎么解读”和“下一步怎么做”。',
    when: '看到图表但不能直接判断含义时。',
    output: '来源、多源、单源、赛道集中度和行动指引。',
    boundary: '解读基于派生统计和启发式信号。',
  },
  'frequent-pattern': {
    title: '频发归因',
    purpose: '分析近期同类事件为什么集中出现，并给出替代解释。',
    when: '发现某个赛道或主体短期内频繁出现时。',
    output: '频发模式、候选原因、支持证据、反对证据和观察指标。',
    boundary: '候选原因不是已证实因果，来源集中也可能造成频发错觉。',
  },
  topics: {
    title: '专题档案',
    purpose: '把同一主体的多篇报道组织成时间线和长期脉络。',
    when: '需要从单条新闻上升到长期跟踪时。',
    output: '实体覆盖、来源数量、相关报道时间线和解读指引。',
    boundary: '自动档案表示报道集中度，不代表事实因果或企业基本面。',
  },
  'region-matrix': {
    title: '地区行业矩阵',
    purpose: '观察不同地区和行业的报道交叉分布。',
    when: '需要定位某地区最集中的产业主题时。',
    output: '地区和行业交叉计数矩阵。',
    boundary: '计数代表当前语料覆盖，不代表现实产业规模。',
  },
  'region-flow': {
    title: '跨区流动与阻尼',
    purpose: '透视关键制造产能与核心物料如何在不同地理大区之间流动、重构与跨越关税地缘壁垒。',
    when: '评估出海建厂、原产地规则穿透、供应链关税摩擦与跨国转运风险时。',
    output: '主干供应链流动拓扑、源头/枢纽/交付三阶段拆解、底层避险机制与代表性承载实体。',
    boundary: '基于产业战略与已公开关税规则建模，实际物流与交期受突发地缘政策动态影响。',
  },
  'region-entities': {
    title: '主体抽样',
    purpose: '查看地区语料中反复出现的公司、机构和人物。',
    when: '需要找到地区热点背后的主要参与者时。',
    output: '主体样本和相关文章。',
    boundary: '共现不代表合作、投资或控制关系。',
  },
  'region-drill': {
    title: '三级下钻',
    purpose: '从地区逐步下钻到行业、主体和具体事件。',
    when: '需要从宏观地区分布进入单条事件时。',
    output: '逐层筛选后的文章集合。',
    boundary: '下钻是导航流程，不自动证明地区与行业存在因果。',
  },
  'region-aggregate': {
    title: '组合聚合',
    purpose: '组合多个地区和行业条件，查看共同出现的新闻。',
    when: '需要比较多个地区或产业组合时。',
    output: '组合筛选结果和文章集合。',
    boundary: '结果是当前语料交集，不代表现实世界同时发生。',
  },
  'region-impact': {
    title: '地区影响推演',
    purpose: '解释为什么事件在该地区出现，以及可能向哪里传导。',
    when: '已经选中某个地区和行业，需要判断外部影响时。',
    output: '原因、驱动因素、跨地区影响、观察指标和失效条件。',
    boundary: '条件情景推演，不是概率预测或事实裁决。',
  },
  'focus-overview': {
    title: '个人概览',
    purpose: '汇总到期待办、监控词、收藏和评测状态。',
    when: '进入个人工作台时先看要处理什么。',
    output: '个人指标和快捷入口。',
    boundary: '只展示当前账号的数据。',
  },
  'focus-contracts': {
    title: '预测契约',
    purpose: '把可证伪判断登记下来，并在到期后核对结果。',
    when: '已经形成明确预测，希望以后验证时。',
    output: '预测问题、时间窗、到期状态和结果记录。',
    boundary: '未校准预测不能当作真实概率，结果必须按规则裁决。',
  },
  'focus-watchlist': {
    title: '关注与收藏',
    purpose: '管理关注标签、监控词和收藏文章。',
    when: '希望长期跟踪特定主体或主题时。',
    output: '个人关注集合和命中新闻。',
    boundary: '自动赛道标签是派生结果，不是人工认证订阅。',
  },
  'focus-evaluation': {
    title: '评测中心',
    purpose: '管理标注任务、评价指标和评测数据集。',
    when: '需要验证模型或规则质量时。',
    output: '标注、一致性、分类和校准指标。',
    boundary: '样本不足时不能推断总体表现。',
  },
  'detail-seven': {
    title: '七要素事实',
    purpose: '整理新闻的事实、逻辑、影响、证据和扩展分析。',
    when: '需要完整理解单条新闻时。',
    output: '七要素、证据链、利益相关方和正反方博弈。',
    boundary: '事实与AI推断分开显示，生成内容仍需核验。',
  },
  'detail-logic': {
    title: '因果与涟漪',
    purpose: '展示事件因果链和多阶影响。',
    when: '需要理解事件如何传导到上下游时。',
    output: '逻辑树、变量权重和阶段性影响。',
    boundary: '逻辑结构是解释模型，不是已证实因果。',
  },
  'detail-identity': {
    title: '与我何干',
    purpose: '按当前身份评估机会、风险和行动方向。',
    when: '需要把新闻转成个人或组织决策影响时。',
    output: '身份化影响、双向情景和行动清单。',
    boundary: '身份分析不构成个性化投资建议。',
  },
  'detail-forecast': {
    title: '人机预测擂台',
    purpose: '让用户和AI分别给出可验证预测，并记录到期结果。',
    when: '需要对某个明确命题做前瞻判断时。',
    output: '预测问题、方向、时间和结果账本。',
    boundary: '未校准结果不能称为真实概率，必须按到期结果评估。',
  },
  'detail-spectrum': {
    title: '深度全览',
    purpose: '把事实、因果、证据、利益和推演排版成完整长文。',
    when: '需要系统通读全部认知维度时。',
    output: '一体化深度阅读页面。',
    boundary: '排版完整不等于每条推断都已证实。',
  },
  'settings-profile': {
    title: '用户与新闻兴趣',
    purpose: '设置昵称、兴趣领域和关注标签。',
    when: '希望首页优先展示自己关心内容时。',
    output: '兴趣筛选和关注范围。',
    boundary: '领域来自可编辑赛道词表（产品配置），不等于人工认证分类，也不是实时情报。',
  },
  'settings-ai': {
    title: 'AI通道',
    purpose: '配置AI供应商、模型和接口凭据。',
    when: '需要启用深度分析或更换模型时。',
    output: '当前生效的AI通道和模型。',
    boundary: '密钥只存服务端；有密钥时模型输出仍是推断，不是已核验事实。',
  },
  'settings-feeds': {
    title: '信源与摄取',
    purpose: '管理RSS来源并执行新闻抓取。',
    when: '需要增加媒体、修复来源或更新语料时。',
    output: '来源状态、摄取结果和语料规模。',
    boundary: '来源可访问不代表内容权威或事实正确。',
  },
  'settings-taxonomy': {
    title: '赛道词库',
    purpose: '调整赛道关键词，影响盲区、密度和领域匹配。',
    when: '现有词表造成误分类或遗漏时。',
    output: '更新后的赛道覆盖规则。',
    boundary: '赛道词是产品配置的编辑种子，词典匹配是启发式，不是实时情报，也不保证语义正确。',
  },
  'settings-radar': {
    title: '监控雷达',
    purpose: '管理需要持续命中的关键词。',
    when: '需要跟踪公司、技术或政策词时。',
    output: '监控词和命中文章。',
    boundary: '关键词命中不代表事件重要或因果关系成立。',
  },
  'settings-usage': {
    title: 'AI用量',
    purpose: '查看调用次数、Token和参考费用。',
    when: '需要控制预算或排查调用异常时。',
    output: '真实调用记录和费用估算。',
    boundary: '只乘价格表里能唯一对应的公开标价。没有 token、型号对不上，或分不出缓存和峰谷时，不估算费用。',
  },
  'settings-backups': {
    title: '备份与恢复',
    purpose: '创建、校验和恢复数据库备份。',
    when: '迁移环境或进行高风险操作前。',
    output: '备份文件、哈希和完整性状态。',
    boundary: '恢复操作会替换数据库，必须明确确认。',
  },
  'settings-audit': {
    title: '审计记录',
    purpose: '查看关键操作的哈希链记录。',
    when: '需要追踪设置、用户、预测或备份变更时。',
    output: '操作人、时间、动作和完整性校验。',
    boundary: '审计证明记录未被修改，不证明业务内容正确。',
  },
  'settings-users': {
    title: '用户与审批',
    purpose: '创建用户、批准注册、调整角色和撤销会话。',
    when: '管理团队成员和访问权限时。',
    output: '用户状态、角色和审批结果。',
    boundary: '权限由服务端执行，前端隐藏不能代替权限控制。',
  },
};
