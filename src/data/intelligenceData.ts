import {
  UserPersona,
  HeatmapCell,
  IntelligenceDensityPoint,
  SourceHealthData,
  BlindspotItem,
  TomorrowForecastItem,
  RadarKeyword,
  TopicCluster,
  CrossEventSynergy,
  MethodologyLessonItem,
  PresetPredictionQuestion,
  PredictionContract,
  ModelProviderInfo
} from '../types';

export const USER_PERSONAS: UserPersona[] = [
  {
    id: 'investor',
    name: '二级市场投资者',
    avatarIcon: 'TrendingUp',
    tagline: '聚焦资产定价、预期差、流动性转向与估值重构',
    focusKeywords: ['估值倍数', '毛利溢价', '降息流动性', '产能利用率']
  },
  {
    id: 'manager',
    name: '企业决策与高管',
    avatarIcon: 'Briefcase',
    tagline: '洞察宏观政策合规、地缘风险与供应链韧性',
    focusKeywords: ['本地化合规', '采购成本', '用工结构', '技术替代']
  },
  {
    id: 'founder',
    name: '科技创业者',
    avatarIcon: 'Rocket',
    tagline: '寻找产业链缝隙、大厂盲区与颠覆式商业机会',
    focusKeywords: ['端侧算力', '垂类Agent', '出海套利', '单位ROI']
  },
  {
    id: 'pm',
    name: '产品经理 / PM',
    avatarIcon: 'Layers',
    tagline: '关注人机交互范式、功能自动化预期与用户心智演进',
    focusKeywords: ['Agent自主执行', '交互简化', '工作流集成', '体验门槛']
  },
  {
    id: 'dev',
    name: '技术开发者 / 架构师',
    avatarIcon: 'Code2',
    tagline: '深潜底层算力功耗、开源生态演进与API接口变迁',
    focusKeywords: ['推理吞吐', 'CPO光电', '模型量化', '分布式调度']
  },
  {
    id: 'sales_mkt',
    name: '销售 / 市场业务人员',
    avatarIcon: 'Target',
    tagline: '捕捉客户预算风向、竞争对手动向与出海渠道红利',
    focusKeywords: ['客户ROI考量', '渠道分成', '海外本地化', '预算收紧']
  }
];

export const INITIAL_RADAR_KEYWORDS: RadarKeyword[] = [];

export const HEATMAP_24H_DATA: HeatmapCell[] = [];
const LEGACY_HEATMAP_24H_DATA: HeatmapCell[] = [
  // AI
  { category: 'AI 前沿', timeSlot: '00:00', intensity: 1, reason: '欧美晚间社区技术讨论平稳', triggerArticles: ['开源轻量化小模型更新'] },
  { category: 'AI 前沿', timeSlot: '04:00', intensity: 1, reason: '硅谷夜间静默期', triggerArticles: [] },
  { category: 'AI 前沿', timeSlot: '08:00', intensity: 3, reason: '亚洲早盘算力股跟涨', triggerArticles: ['台积电先进制程指引'] },
  { category: 'AI 前沿', timeSlot: '12:00', intensity: 4, reason: '午盘企业级Agent采购数据流出', triggerArticles: ['企业级SaaS调研报告'] },
  { category: 'AI 前沿', timeSlot: '16:00', intensity: 5, reason: 'OpenAI/谷歌大模型发布会重叠引发全网讨论峰值', triggerArticles: ['OpenAI新模型发布', '算力重构与半导体微澜'] },
  { category: 'AI 前沿', timeSlot: '20:00', intensity: 4, reason: '盘后机构电话会集中复盘算力瓶颈', triggerArticles: ['CPO光电共封装测试白皮书'] },

  // 财经
  { category: '全球财经', timeSlot: '00:00', intensity: 1, reason: '外汇交易清淡', triggerArticles: [] },
  { category: '全球财经', timeSlot: '04:00', intensity: 2, reason: '美股盘后财报披露', triggerArticles: ['北美云厂商资本开支季报'] },
  { category: '全球财经', timeSlot: '08:00', intensity: 4, reason: '亚洲央行早间公开市场操作', triggerArticles: ['逆回购工具资金分流'] },
  { category: '全球财经', timeSlot: '12:00', intensity: 4, reason: '欧洲早盘离岸美元拆借利率波动', triggerArticles: ['伦敦离岸资金池挪移'] },
  { category: '全球财经', timeSlot: '16:00', intensity: 2, reason: '美联储例行发言前观望情绪浓厚', triggerArticles: ['降息周期的静默伏流'] },
  { category: '全球财经', timeSlot: '20:00', intensity: 1, reason: '夜间宏观数据消化期', triggerArticles: [] },

  // 科技与半导体
  { category: '半导体硬件', timeSlot: '00:00', intensity: 1, reason: '常规生产排班', triggerArticles: [] },
  { category: '半导体硬件', timeSlot: '04:00', intensity: 1, reason: '常规运转', triggerArticles: [] },
  { category: '半导体硬件', timeSlot: '08:00', intensity: 3, reason: '台系代工厂月度营运数据发布', triggerArticles: ['晶圆代工订单公差微调'] },
  { category: '半导体硬件', timeSlot: '12:00', intensity: 4, reason: '供应链散件出货量环比激增确认', triggerArticles: ['特种液冷连接器订单大涨'] },
  { category: '半导体硬件', timeSlot: '16:00', intensity: 4, reason: '欧洲半导体设备巨头订单上修', triggerArticles: ['EUV光刻机交付计划加速'] },
  { category: '半导体硬件', timeSlot: '20:00', intensity: 3, reason: '行业自媒体拆解散热封装技术细节', triggerArticles: ['单芯片1200W极限测试'] },

  // 产业与出海
  { category: '产业出海', timeSlot: '00:00', intensity: 2, reason: '远洋货轮港口排队数据更新', triggerArticles: ['红海航线保费微调'] },
  { category: '产业出海', timeSlot: '04:00', intensity: 3, reason: '拉美与欧洲本地合规法案公报', triggerArticles: ['匈牙利新能源基地环评通过'] },
  { category: '产业出海', timeSlot: '08:00', intensity: 4, reason: '海关总署最新车辆零配件散件出口数据出炉', triggerArticles: ['新能源出海的风洞效应'] },
  { category: '产业出海', timeSlot: '12:00', intensity: 3, reason: '海外售后网络与储能基地合作签署', triggerArticles: ['东盟充电协议互认联盟'] },
  { category: '产业出海', timeSlot: '16:00', intensity: 3, reason: '反补贴听证会最新进展释放', triggerArticles: ['本土就业承诺转化为补贴资格'] },
  { category: '产业出海', timeSlot: '20:00', intensity: 2, reason: '商贸物流晚报汇总', triggerArticles: ['CKD散件海运保费锁定'] }
];

export const INTELLIGENCE_DENSITY_POINTS: IntelligenceDensityPoint[] = [];
const LEGACY_INTELLIGENCE_DENSITY_POINTS: IntelligenceDensityPoint[] = [
  { hour: '02:00', count: 12 },
  { hour: '04:00', count: 18 },
  { hour: '06:00', count: 32 },
  { hour: '08:00', count: 68, burstEvent: '亚洲主要交易所开盘 + 海关进出口分项数据披露' },
  { hour: '10:00', count: 94 },
  { hour: '12:00', count: 112, burstEvent: '欧洲早盘 + 多家车企发布海外合资设厂公告' },
  { hour: '14:00', count: 135 },
  { hour: '16:00', count: 184, burstEvent: '科技巨头集中发布AI新模型与算力基础设施白皮书' },
  { hour: '18:00', count: 156 },
  { hour: '20:00', count: 98, burstEvent: '美股盘前宏观利率前瞻指引流出' },
  { hour: '22:00', count: 64 },
  { hour: '24:00', count: 38 }
];

export const SOURCE_HEALTH_DATA: SourceHealthData = {
  healthScore: 0,
  tier1Ratio: 0,
  tier2Ratio: 0,
  tier3Ratio: 0,
  stars5Ratio: 0,
  stars4Ratio: 0,
  stars3Ratio: 0,
  stars2Ratio: 0,
  stars1Ratio: 0,
  activeConflicts: [],
};
// 历史 LEGACY_SOURCE_HEALTH_DATA（healthScore:92 + 编造冲突案例）已在 V2 #8 删除，避免误导。

export const BLINDSPOT_DATA: BlindspotItem[] = [];
const LEGACY_BLINDSPOT_DATA: BlindspotItem[] = [
  {
    id: 'bs-1',
    sector: '能源与特种电网变压器',
    coverageRatio: 12,
    alertMessage: '主流媒体今天88%的篇幅集中在AI模型与芯片，却极少提及数据中心面临的物理电网接入瓶颈。',
    recommendedTopic: '超高压变压器交付周期拉长至 4 年对北美算力中心的隐秘制约',
    missedKeyPoint: '算力的尽头是电力，特种电网设备订金增长 65% 是常人忽略的核心先导指标。'
  },
  {
    id: 'bs-2',
    sector: '跨境知识产权与专利交叉授权',
    coverageRatio: 16,
    alertMessage: '整车关税被广泛报道，但关于动力电池底层BMS算法与快充标准的欧洲反垄断审查讨论严重缺失。',
    recommendedTopic: '中国车企在海外建立软件与充电标准联盟的法务合规盲区',
    missedKeyPoint: '散件出口只是第一步，底层充电协议互认率能否突破70%才是决定五年后生死战的关键。'
  }
];

export const TOMORROW_FORECASTS: TomorrowForecastItem[] = [];
const LEGACY_TOMORROW_FORECASTS: TomorrowForecastItem[] = [
  {
    id: 'tf-1',
    rank: 1,
    event: '美联储主席出席杰克逊霍尔会议闭门研讨会发表涉就业市场演讲',
    probability: 84,
    potentialImpact: '若重申对劳动力市场降温的关切，将进一步坐实9月降息50bp预期。',
    disclaimer: '基于历史宏观日历与大语言模型概率推演，非既成事实。'
  },
  {
    id: 'tf-2',
    rank: 2,
    event: '台积电公布下季度埃米级先进制程扩产资本支出预案',
    probability: 76,
    potentialImpact: '先进封装产能配额若进一步被大客户包揽，中型芯片设计公司估值承压。',
    disclaimer: '基于历史宏观日历与大语言模型概率推演，非既成事实。'
  },
  {
    id: 'tf-3',
    rank: 3,
    event: '欧盟委员会就新能源汽车零部件本土化采购比重公布首批豁免白名单',
    probability: 69,
    potentialImpact: '已在匈牙利和西班牙开工建厂的供应商将获得关税退税利好。',
    disclaimer: '基于历史宏观日历与大语言模型概率推演，非既成事实。'
  },
  {
    id: 'tf-4',
    rank: 4,
    event: '头部开源大模型社区上线首个支持物理引擎模拟的具身智能开源底座',
    probability: 62,
    potentialImpact: '工业机器人夹爪控制与产线质检自动化开发周期缩短40%。',
    disclaimer: '基于历史宏观日历与大语言模型概率推演，非既成事实。'
  },
  {
    id: 'tf-5',
    rank: 5,
    event: '主要产油国OPEC+就四季度增产配额举行非公开技术委员会协商',
    probability: 58,
    potentialImpact: '国际油价与化工原材料价格若回调，将改善全球航运与制造毛利。',
    disclaimer: '基于历史宏观日历与大语言模型概率推演，非既成事实。'
  }
];

/** 专题必须来自真实策展或语料聚类；没有时保持空，不展示虚构时间轴。 */
export const TOPIC_CLUSTERS: TopicCluster[] = [];

export const CROSS_EVENT_SYNERGIES: CrossEventSynergy[] = [];
const LEGACY_CROSS_EVENT_SYNERGIES: CrossEventSynergy[] = [
  {
    id: 'synergy-compute-power-grid',
    title: '自主 Agent 推理算力爆炸 × 物理热功耗与特种电网交付荒',
    resonanceLevel: '突变级共振',
    resonanceScore: 96,
    articleIds: ['news-ai-agent-breakthrough', 'news-ai-semiconductor'],
    articleTitles: [
      'OpenAI发布新一代模型架构，AI Agent能力跨越实用临界点',
      '算力重构与全球半导体微澜：大厂暗战下一代物理极限'
    ],
    hiddenNexusTheme: '数字智能的无限扩张正在猛烈撞击物理世界能源与热力学的硬性天花板',
    sharedBottleneck: '长程 Agent 反思规划带来 3.4x Token 推理消耗 ➔ 单芯片功率逼近 1200W 极限 ➔ 变压器与绿电审批成为真正的死穴',
    synergyChain: [
      {
        step: '01. 软件端激增',
        sourceArticle: 'OpenAI Agent 突破',
        mechanism: '企业级 Agent 接管端到端流程，单任务调用链从 1 次问答拉长为 20-50 轮自主反思计算，推理 Token 爆发式增长 340%。'
      },
      {
        step: '02. 硬件端撞墙',
        sourceArticle: '半导体物理极限',
        mechanism: '3nm 晶圆先进封装产能被头部锁定，单机柜功率突破 100kW，高热密度导致风冷彻底失效，必须全线升级液冷与光电共封装 (CPO)。'
      },
      {
        step: '03. 基础设施挤兑',
        sourceArticle: '跨事件交叉推演',
        mechanism: '超大规模算力中心与工业制造业同时争夺电网容量，欧美特种变压器交货期被拉长至 120 周，能源配额成为比芯片更卡脖子的稀缺资源。'
      }
    ],
    jointImpacts: {
      firstOrder: '算力租赁现货价格与绿色电力直供园区租金同步跳涨 15-20%。',
      secondOrder: 'SaaS 厂商因云端推理成本过高，被迫加速研发「端侧轻量小模型 + 本地 NPU 处理」架构以减少对云端大算力的依赖。',
      thirdOrder: '地缘科技竞争重心从单纯的「芯片光刻机禁运」蔓延至「跨国特种电力设备与光电材料供应链控制权」。'
    },
    aiJointVerdict: '表面上看是软件算法与晶圆代工的两条独立新闻，但底层在「热功耗与电力供给」上形成了剧烈共振。单纯押注应用层 SaaS 的风险正在几何级上升，真正的超额利润正在向「能源基础设施+先进散热封装」转移。',
    recommendedAction: '资产配置上减持纯套壳 SaaS，增配电网配储、特种变压器与液冷材料标的；企业架构上推行端云协同，优先锁定未来 18 个月保价算力与电力协议。'
  },
  {
    id: 'synergy-fed-liquidity-ev-global',
    title: '美联储全球降息窗口开启 × 中国制造「逆向本土化」出海建厂',
    resonanceLevel: '结构级交汇',
    resonanceScore: 89,
    articleIds: ['news-fed-liquidity', 'news-ev-supply-chain'],
    articleTitles: [
      '降息周期的静默伏流：离岸美元与新兴市场利差暗战',
      '新能源出海的风洞效应：从整车关税到本土化产业链深潜'
    ],
    hiddenNexusTheme: '低成本跨国流动性释放，为高关税倒逼下的中国制造业全球属地化重资产建厂提供了黄金融资窗口',
    sharedBottleneck: '海外建厂前期重资产 CAPEX 投入大 ➔ 恰逢离岸美元利率下行与新兴市场汇率企稳 ➔ 形成出海企业跨境银团低成本融资的最佳共振点',
    synergyChain: [
      {
        step: '01. 宏观流动性松动',
        sourceArticle: '美联储降息声明',
        mechanism: '离岸美元拆借利率下行，新兴市场主权信用利差收窄，跨境资本寻找实体高回报资产。'
      },
      {
        step: '02. 贸易关税倒逼',
        sourceArticle: '新能源出海',
        mechanism: '整车高关税阻断直接出口，倒逼中国车企在欧洲与墨西哥投资数十亿欧元建设本土化组装基地与电池超级工厂。'
      },
      {
        step: '03. 资本与产业合流',
        sourceArticle: '跨事件交叉推演',
        mechanism: '出海企业利用美元降息周期在境外发行低息绿色债券与合资银团贷款，将资本成本压减 180bp，大幅缩短海外工厂投资回报回收期。'
      }
    ],
    jointImpacts: {
      firstOrder: '出海龙头企业海外发债与境外银团贷款申请量环比增长超 40%。',
      secondOrder: '欧洲及东盟当地零部件供应商被深度吸纳进中国供应链标准体系，地缘贸易保护主义摩擦显著降温。',
      thirdOrder: '跨国汽车工业权力版图彻底从「传统欧美日主机厂」向「中国技术内核+全球在地运营」迁移。'
    },
    aiJointVerdict: '贸易保护的高墙与货币政策的阀门同时发生异动，两者的交汇为中国高附加值制造业完成跨国跨洋跳跃创造了极具历史确定性的时间窗口。',
    recommendedAction: '出海企业财务部门应立即启动海外低息固定利率负债置换与远期汇率锁汇；投资机构重点挖掘跟随主机厂出海的细分零部件龙头。'
  }
];

// ============================================================
// Multi-Model Registry & AI Provider Configurations (DeepSeek / Gemini / Open Architecture)
// ============================================================

export const AVAILABLE_AI_MODELS: ModelProviderInfo[] = [
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 (深度强化学习思考模型 · RL Chain-of-Thought)',
    provider: 'DeepSeek',
    tag: '长推理 · 自我纠偏 · 终局反思',
    badgeBg: 'bg-blue-900/60 border-blue-500/80',
    badgeText: 'text-blue-400',
    description: '采用大规模纯强化学习 (RL) 训练的端到端深度推理模型。具备长链条自我反思、对抗验尸、数学博弈平衡与证伪推导能力，极具批判性与穿透力。',
    specialty: '擅长博弈论推演、反直觉硬阻尼探测与严格数学逻辑链自检'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (深度贝叶斯因果推理 · System 2 慢思考)',
    provider: 'Google',
    tag: '外部基准率 · 认知偏差修正',
    badgeBg: 'bg-amber-900/60 border-amber-500/80',
    badgeText: 'text-amber-400',
    description: '深度慢思考因果模型，长于构建全要素因果逻辑树，严格锚定历史同类事件发生基准率 (Base Rate)，防范谄媚式盲目乐观。',
    specialty: '擅长长上下文事实链检索、先验基准发生率校准与宏观产业传导'
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3 (671B MoE 混合专家高通量推理)',
    provider: 'DeepSeek',
    tag: 'MoE 架构 · 高效多情景枚举',
    badgeBg: 'bg-indigo-900/60 border-indigo-500/80',
    badgeText: 'text-indigo-400',
    description: '基于 671B 参数 MoE 架构的高吞吐大模型，擅长跨领域知识网快速综合与多情景概率敏感度模拟。',
    specialty: '擅长多变量情景枚举与多维度产业要素快速比对'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash (极速敏感度与费米估算引擎)',
    provider: 'Google',
    tag: '极速响应 · 敏感度压力测试',
    badgeBg: 'bg-cyan-900/60 border-cyan-500/80',
    badgeText: 'text-cyan-400',
    description: '毫秒级响应的高通量推理引擎，适合快速敏感度压力测试与量级费米估算。',
    specialty: '擅长高频参数微调与即时敏感度检验'
  }
];

// ============================================================
// Superforecasting Methodology Corpus (超级预测方法论库)
// ============================================================

export const SUPERFORECASTING_LESSONS: MethodologyLessonItem[] = [
  {
    id: 'lesson-base-rate',
    title: '基准概率优先 (Base Rate Anchoring)',
    authorOrOrigin: '菲利普·泰特洛克《超级预测》· 外部视角法则',
    principle: '在评估具体事件前，必须先查阅历史同类事件在客观世界的基准发生率，防止陷入独特性陷阱。',
    explanation: '大脑天生喜欢关注当下事件引人入胜的细节（内部视角），但超级预测者会先退后一步询问：“在过去 20 年里，类似的技术突破或政策声明，最终在 12 个月内落地商用的比例是多少？” 通常这个基准概率远低于人们的直觉。',
    actionablePractice: '在对任何技术/商业进展打分前，先从历史基准概率（如 30%-40%）起步，再根据确凿新增证据进行贝叶斯微调，而不是直接给出 80%-90% 的极端高分。'
  },
  {
    id: 'lesson-pre-mortem',
    title: '事前验尸法 (Pre-Mortem Inversion)',
    authorOrOrigin: '加里·克莱因 & 丹尼尔·卡尼曼 · 逆向工程',
    principle: '假定时间已过去 6 个月且预测彻底破裂，强迫自己倒推最致命的隐藏诱因。',
    explanation: '人一旦确立了某个观点，确认偏误（Confirmation Bias）会自动过滤反面证据。事前验尸法打破这一防御机制：要求你设想“如果失败了，它到底死于什么？” 从而挖掘出被忽略的电力、合规、供应链良品率等硬性物理阻尼。',
    actionablePractice: '在提交预测前，强制列出 2 个「导致该预测彻底失效的致命黑天鹅」，并设置量化可证伪警戒线。'
  },
  {
    id: 'lesson-brier-calibration',
    title: '布莱尔分数与精细概率校准 (Brier Score Calibration)',
    authorOrOrigin: '格伦·布莱尔 (Glenn Brier) · 概率量化标准',
    principle: '拒绝“非黑即白”的二元论，用精细概率（如 62%、78%）代替“肯定会/绝不会”，并通过回测计算均方误差。',
    explanation: '布莱尔分数公式为 (P - O)²，其中 P 是预测概率 (0~1)，O 是实际结果 (1或0)。得分越接近 0 代表校准度越完美。超级预测者擅长区分 60% 与 75% 的微妙差别，极少给出非理性的 0% 或 100%。',
    actionablePractice: '将宽泛的“大概率”细化为明确的数字刻度，并在约定时间到达后进行严格回测打分，记录自己的乐观度偏差。'
  },
  {
    id: 'lesson-fox-mindset',
    title: '狐狸型多元视角 (Fox vs. Hedgehog Mindset)',
    authorOrOrigin: '以赛亚·伯林 & 泰特洛克 · 认知韧性',
    principle: '刺猬知道一件大事，狐狸知道许多小事。保持认知敏捷，随时准备推翻自己。',
    explanation: '刺猬型专家倾向于用单一宏大叙事（如“AI 将颠覆一切”或“贸易战必输”）解释所有现象；而狐狸型预测者会跨越地缘、半导体物理、电网工程、劳动法等多个微观领域，根据新信号进行小步迭代更新。',
    actionablePractice: '跨领域收集 3 个相互独立的信息源，只要关键硬指标出现异动，毫不犹豫地向新方向修正置信度。'
  }
];

// 真实命题由用户或当前文章生成；没有人工策划命题时保持为空。
export const PRESET_ARTICLE_PREDICTIONS: Record<string, PresetPredictionQuestion[]> = {};

const LEGACY_PRESET_ARTICLE_PREDICTIONS: Record<string, PresetPredictionQuestion[]> = {
  'news-ai-agent-breakthrough': [
    {
      id: 'q-agent-saas-pricing',
      question: '未来 90 天内，全球排名前 5 的企业级 SaaS 厂商中，是否会有至少 2 家因长程推理算力成本激增而推行 Agent 二次加价或配额制？',
      category: '商业模式与算力成本',
      horizonDays: 90,
      horizonLabel: '3 个月后验证',
      baseRateHistory: '历史同类企业级 AI 功能商业化加价周期的中位数为 4.5 个月，基准发生率约 42%。',
      defaultOptions: {
        positive: '会推出（二次加价或按 Token 计费配额生效）',
        negative: '不会推出（继续由软件商吸收成本以争夺市场份额）',
        neutral: '采取混合免费增值限速模式'
      }
    },
    {
      id: 'q-agent-human-replacement',
      question: '未来 180 天内，财富 500 强企业中是否有头部公司在公开财报中披露其 Agent 独立闭环完成超 10 万单业务流程？',
      category: '企业落地深度',
      horizonDays: 180,
      horizonLabel: '6 个月后验证',
      baseRateHistory: '过往自动化 RPA 达到同等规模披露耗时 18 个月，基准发生率约 28%。',
      defaultOptions: {
        positive: '会披露（形成可审计的端到端无人闭环）',
        negative: '不会披露（仍需人工复核与安全兜底）'
      }
    }
  ],
  'news-ai-semiconductor': [
    {
      id: 'q-semi-yield-2nm',
      question: '台积电与关键客户在下一代 2nm/CPO 光电封装试验线上，Q4 首批晶圆综合良品率能否突破 60% 商业化临界点？',
      category: '半导体先进制程',
      horizonDays: 90,
      horizonLabel: '90 天后验证',
      baseRateHistory: '历史上 3nm/5nm 首期良品率跨越 60% 门槛的平均周期为 8.5 个月，基准达标率约 35%。',
      defaultOptions: {
        positive: '能突破（良品率达标，开启规模试产）',
        negative: '无法突破（因热应力与封装缺陷推迟至明年 Q1）'
      }
    }
  ],
  'news-fed-liquidity': [
    {
      id: 'q-fed-em-rate-cut',
      question: '未来 6 个月内，离岸美元流动性宽松是否会促使东南亚与拉美主要新兴市场央行跟进实施至少 2 次降息？',
      category: '全球宏观流动性',
      horizonDays: 180,
      horizonLabel: '180 天后验证',
      baseRateHistory: '美联储历史前 4 次降息周期中，新兴市场央行在 6 个月内跟进降息的概率为 67%。',
      defaultOptions: {
        positive: '会跟进降息（释放本币宽松空间）',
        negative: '未跟进降息（因本币汇率承压或国内通胀粘性）'
      }
    }
  ],
  'news-ev-supply-chain': [
    {
      id: 'q-ev-eu-subsidy',
      question: '未来 180 天内，中国在欧洲投资的首批本土化电池超级工厂能否顺利获得欧盟或当地政府的首期绿色产业补贴与环评批文？',
      category: '海外属地化合规',
      horizonDays: 180,
      horizonLabel: '半年后验证',
      baseRateHistory: '跨国重工业海外建厂环评与补贴首次申报通过率基准约为 44%。',
      defaultOptions: {
        positive: '顺利获批并按期开工',
        negative: '遭遇环评上诉或补贴审查拖延'
      }
    }
  ]
};

// 不预置预测契约。用户未创建、未回测时保持空。
export const INITIAL_PREDICTION_CONTRACTS: PredictionContract[] = [];

const LEGACY_INITIAL_PREDICTION_CONTRACTS: PredictionContract[] = [
  {
    id: 'contract-agent-2026',
    articleId: 'news-ai-agent-breakthrough',
    articleTitle: 'OpenAI发布新一代模型架构，AI Agent能力跨越实用临界点',
    articleCategory: '前沿技术',
    question: '未来 90 天内，全球排名前 5 的企业级 SaaS 厂商中，是否会有至少 2 家因长程推理算力成本激增而推行 Agent 二次加价或配额制？',
    createdAt: '2026-08-25',
    targetVerificationDate: '2026-11-25',
    userPred: {
      direction: 'positive',
      directionText: '会推出（二次加价或按 Token 计费配额生效）',
      confidence: 80,
      premises: ['长程 Agent 反思 Token 消耗增加 3.4 倍', 'SaaS 厂商毛利率无法承受长期贴钱补贴'],
      falsifiableIndicator: '若主要厂商宣布端侧本地轻量模型免费运行，则预测失效。'
    },
    aiPred: {
      modelName: 'Gemini 2.5 Pro (深度贝叶斯因果推理模型)',
      direction: 'positive',
      directionText: '会推出二次加价或配额限流',
      confidence: 62,
      verdict: 'AI 研判：商业模式承压是必然，但由于市场份额争夺白热化，厂商更倾向于先采用「隐性限速/排队制」而非直接公开涨价。'
    },
    gapSummary: '认知差值：用户偏乐观 (+18%)，AI 提示大厂存在“以利润换市场份额”的博弈缓冲期。',
    status: 'pending'
  },
  {
    id: 'contract-semi-historical',
    articleId: 'news-ai-semiconductor',
    articleTitle: '算力重构与全球半导体微澜：大厂暗战下一代物理极限',
    articleCategory: '半导体',
    question: '台积电与关键客户在下一代 2nm/CPO 光电封装试验线上，Q4 首批晶圆综合良品率能否突破 60% 商业化临界点？',
    createdAt: '2026-07-01',
    targetVerificationDate: '2026-09-01',
    userPred: {
      direction: 'positive',
      directionText: '能突破（良品率达标）',
      confidence: 75,
      premises: ['头部大厂资本开支不计成本投入', '试验线进度提前'],
      falsifiableIndicator: '若晶圆翘曲率未改善则失效。'
    },
    aiPred: {
      modelName: 'Gemini 2.5 Pro',
      direction: 'negative',
      directionText: '无法突破（推迟至明年 Q1）',
      confidence: 65,
      verdict: 'AI 研判：基准概率仅 35%，光电共封装物理热膨胀系数差异极大，短期工艺调试时间不足。'
    },
    gapSummary: '已到期验证：实际供应链调研显示良品率约为 52%，未达 60% 门槛。AI 凭借基准概率与物理阻尼分析获胜。',
    status: 'verified_hit_ai',
    actualOutcome: '实际结果：行业供应链报告确认 2nm 试验线综合良品率收敛在 52.4%，规模量产节点推迟至 2027 年 Q1。',
    resolutionDate: '2026-09-01',
    reflectionNotes: '复盘教训：忽略了基准概率 (Base Rate) 的强大阻尼，对工程物理极限的调试周期过于乐观。',
    brierScore: 0.12
  }
];
