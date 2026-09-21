import { NewsArticle } from '../types';

export const CURATED_ARTICLES: NewsArticle[] = [
  {
    id: 'news-ai-agent-breakthrough',
    title: 'OpenAI发布新一代模型架构，AI Agent能力跨越实用临界点',
    subtitle: '从「能聊天的语言模型」走向「能自主完成多步骤复杂任务的数字员工」',
    oneSentenceVerdict: '这次升级真正值得关注的不是模型跑分，而是AI开始从“回答问题”走向“主动接管端到端业务工作流”。',
    category: 'AI 前沿',
    tags: ['AI Agent', 'OpenAI', '大模型', '工作流自动化'],
    date: '2026年9月1日',
    timeAgo: '2小时前',
    readTimeMinutes: 3,
    sourceName: '见微·AI认知实验室',
    sourceDate: '2026-09-01 10:15',
    sourceCount: 5,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑↑ 极快',
    summary: 'OpenAI 发布新一代架构模型，核心重点在于多步长程规划与外部工具自适应调用。测试显示，跨企业软件系统的任务完成成功率从 38% 跃升至 84%，这标志着软件交互范式正迎来根本性重构。',
    coreQuote: '人机交互的终局不是人类学会向机器提问，而是机器学会替人类把事情办完。',
    quoteAuthor: '见微·人机交互研究组',

    // 1. 通俗模式 / 小白模式
    tongsuSummary: {
      simpleSay: '以前的 AI 像个“懂很多的实习生”，你问它它就答，但具体事情还得你自己去干；现在的 AI 像个“能独立办事的项目经理”，你只要告诉它目标，它自己开网页、调表格、发邮件把事办妥。',
      whyExplanation: '就像你叫外卖：以前你需要自己查餐厅、选菜、输地址、付钱（只用 AI 查菜单）；现在只要说一句“按昨天的标准来份低卡午餐”，它自己选好下单扣款，你只管开门拿饭。',
      whatItMeans: '很多过去需要点几十次鼠标的繁琐企业软件，未来可能只需要一句话；很多普通岗位的日常工作流程将被自动化重塑。',
      jargonTerms: ['AI Agent', '工作流自动化']
    },

    // 2. 脱水模式
    dehydratedItems: {
      coreEntity: 'OpenAI / AI Agent 智能体',
      keyAction: '发布长程规划与自主工具链调度新架构',
      relatedCount: 14,
      coreShifts: [
        '多步复杂任务执行成功率从 38% 跃升至 84%',
        '企业内部 API 自适应集成时间从数周压减至数分钟',
        '端到端推理成本在量化优化后下降 62%'
      ],
      impactHighlights: [
        'SaaS 软件商业模式受冲击：从「按账号付费 (Per-Seat)」转向「按任务结果付费 (Per-Outcome)」',
        '产品经理需重新设计无界面 (Zero-UI) 的自动化人机协作流程'
      ]
    },

    // 3. 七要素 + AI 裁决
    sevenElements: {
      what: '发布支持自主长程规划、反思纠错与多工具调用的新一代任务型 AI 架构。',
      who: 'OpenAI 研发团队、企业级软件合作伙伴 (Microsoft, Salesforce 等) 及全球开发者。',
      when: '2026年9月1日早间全球同步开放 API 内测。',
      where: '硅谷（全球云端基础设施同步部署）。',
      why: '单纯堆叠模型参数带来的边际效用递减，工程重心全面转向提升逻辑推理深度与环境交互能力。',
      how: '通过引入树状搜索决策机制 (MCTS) 与强化学习实时环境反馈，使模型具备自主试错与自我验证能力。',
      soWhat: '彻底改变人机协作分工，企业级软件交互界面将从繁琐的表单点击退居为背后的 Agent 基础设施。',
      aiVerdict: {
        confidenceScore: 94,
        volatility: '高',
        actionLevel: '行动',
        verdictSummary: '确定性技术拐点已至，建议立即启动企业内部工作流的 Agent 化改造评估，切勿停留在观望阶段。'
      }
    },

    // 4. 逻辑溯源因果树
    logicTree: {
      rootCause: '模型长程推理突破与工具调用协议标准化',
      nodes: [
        { id: 'n-1', label: '长程规划与自我纠错能力成熟', category: 'cause', description: '解决传统模型易幻觉、步骤一多就偏航的顽疾', dataPoint: '测试准确率 84%' },
        { id: 'n-2', label: '企业软件 API 交互成本归零', category: 'mid_effect', description: 'Agent 可直接阅读接口文档并动态生成调用脚本', dataPoint: '免去繁重二次开发' },
        { id: 'n-3', label: '重复性白领工作被批量替代', category: 'mid_effect', description: '数据录入、报表核对、客服派单实现全自主闭环', dataPoint: '单任务耗时缩短 90%' },
        { id: 'n-4', label: 'SaaS 商业模式向结果计费转型', category: 'market_impact', description: '软件不再卖人头席位，而是按成功解决的工单或交易分成', dataPoint: '行业估值逻辑重构' }
      ],
      variableWeights: [
        { name: '任务执行准确率', weight: 40, impactDirection: 'up', description: '准确率超过 95% 时将迎来行业全面爆发' },
        { name: '单 Token 推理成本', weight: 28, impactDirection: 'down', description: '推理成本持续下行推动商业化普及' },
        { name: '数据安全合规限制', weight: 20, impactDirection: 'neutral', description: '企业核心数据资产出域受严格审计' },
        { name: '开发者生态迁移速度', weight: 12, impactDirection: 'up', description: '成熟 Agentic 框架的渗透速度' }
      ]
    },

    // 5. 相关性 · 与我何干 (6大身份)
    personaImpacts: [
      {
        personaId: 'investor',
        coreImpact: '传统靠卖坐席数 (Seat-based) 的存量 SaaS 公司估值承压，而拥有私有高价值工作流数据的垂直龙头将享有超额估值。',
        opportunity: '重仓具备垂直领域闭环数据与自动化工具链的 Agent 基础设施服务商。',
        threatRisk: '谨防纯套壳类工具软件在底层模型能力升级后遭遇灭顶之灾。',
        recommendedAction: '梳理投资组合中软件资产的防御壁垒，减持依赖简单交互界面的工具类项目。'
      },
      {
        personaId: 'manager',
        coreImpact: '组织内部跨部门协同效率将产生非线性跃升，中层协调与流程流转岗位的组织架构需要扁平化重组。',
        opportunity: '将客服、合规审核、报表编制等环节由 24 小时在线的 Agent 集群接管，大幅压减运营成本。',
        threatRisk: '若 Agent 自主权限过高，可能存在因小概率幻觉引发的合规与法律追责风险。',
        recommendedAction: '设立企业级「人机协作沙箱」，先在低风险内部流程进行闭环试点。'
      },
      {
        personaId: 'founder',
        coreImpact: '小团队（甚至 1-3 人）借助 Agent 即可构建过去需要百人团队运营的复杂业务系统。',
        opportunity: '切入传统大厂不屑于做或太重太复杂的非标产业工作流（如外贸报关、跨境财税）。',
        threatRisk: '基础模型厂商不断向下吞噬通用能力，初创企业必须深度绑定行业独有物理资产或牌照。',
        recommendedAction: '不碰通用 Agent 平台，直接深入特定垂直行业解决具体的脏活累活。'
      },
      {
        personaId: 'pm',
        coreImpact: 'UI 交互设计原则从「引导用户如何一步步点击」转变为「如何向用户呈现 Agent 的思考过程并提供关键确认卡点」。',
        opportunity: '定义新一代「意图驱动 (Intent-Driven)」交互范式，打造极简的用户体验。',
        threatRisk: '用户对失控感极其敏感，过度自动化但缺乏透明度会导致用户信任崩塌。',
        recommendedAction: '在关键高风险节点保留「人类在回路 (Human-in-the-loop)」的确认机制。'
      },
      {
        personaId: 'dev',
        coreImpact: '开发模式从单纯编写确定性业务逻辑，进化为编写 Prompt、设计 Agent 记忆系统与工具调度协议。',
        opportunity: '掌握 MCP (Model Context Protocol) 等标准化工具调用框架，成为抢手的 Agentic 架构师。',
        threatRisk: '大量传统前后端 CRUD 重复代码编写需求正在被大模型自动化工具瓦解。',
        recommendedAction: '深入研究长程上下文管理、知识库召回评估与异步 Agent 容错重试机制。'
      },
      {
        personaId: 'sales_mkt',
        coreImpact: '客户不再为软件的功能清单买单，而是直接要求承诺「节约多少工时、带来多少线索转化」。',
        opportunity: '以「ROI 结果分成」的商务模式切入客户预算，大幅降低销售破冰阻力。',
        threatRisk: '客户预算复核更加严苛，概念性忽悠彻底失效，必须拿出可量化的降本数据。',
        recommendedAction: '更新销售话术与案例白皮书，重点展示部署 Agent 后的实际落地人效对比。'
      }
    ],

    // 6. 涟漪效应 + 知识图谱 + 多源验证
    rippleEffect: {
      stages: [
        {
          stage: '一阶影响',
          title: '企业软件工具调用与数据录入自动化',
          timeframe: '未来 1-3 个月',
          items: ['开发者快速集成新 Agent 协议', '基础办公软件插件全面智能化升级'],
          severity: '高'
        },
        {
          stage: '二阶影响',
          title: 'SaaS 商业模式颠覆与岗位职责重构',
          timeframe: '未来 3-12 个月',
          items: ['传统软件坐席费率下降', '基础外包与流程性岗位需求收缩', '超级个人团队涌现'],
          severity: '高'
        },
        {
          stage: '三阶影响',
          title: '跨行业自主经济体与全自动供应链调度',
          timeframe: '未来 1-3 年',
          items: ['不同公司的 Agent 之间自主进行商务洽谈、签约与结算', '宏观经济运行周转速度大幅加快'],
          severity: '中'
        }
      ],
      knowledgeGraph: [
        { id: 'kg-1', name: 'OpenAI', type: 'company', relationToMain: '模型发布核心研发方' },
        { id: 'kg-2', name: 'Microsoft Azure', type: 'company', relationToMain: '独家云基础设施与商业化承载' },
        { id: 'kg-3', name: 'AI Agent 架构', type: 'tech', relationToMain: '本次升级核心技术形态' },
        { id: 'kg-4', name: 'Salesforce / 垂直SaaS', type: 'market', relationToMain: '受到直接冲击与重构的下游软件生态' },
        { id: 'kg-5', name: 'NVIDIA', type: 'company', relationToMain: '为复杂推理与反思计算提供底层算力芯片' }
      ],
      multiSources: [
        { sourceName: 'OpenAI 官方技术白皮书', tier: 'Tier 1 顶级权威', stance: '正面', verified: true, excerpt: '测试集在 SWE-bench 与 GAIA 评测中取得历史性突破' },
        { sourceName: 'Reuters 路透社', tier: 'Tier 1 顶级权威', stance: '中性', verified: true, excerpt: '硅谷风投正在密集重估传统企业服务初创公司的估值倍数' },
        { sourceName: 'Bloomberg 彭博社', tier: 'Tier 1 顶级权威', stance: '正面', verified: true, excerpt: '企业级客户对自动化 Agent 的采购意向环比激增 70%' },
        { sourceName: '知名科技播客与自媒体', tier: 'Tier 3 行业论坛/自媒体', stance: '预警', verified: true, excerpt: '警惕短期宣传过热，复杂跨系统调用的边界故障率依然需人工兜底' }
      ]
    },

    // 7. 五层光谱与证据链
    spectrumLayers: [
      {
        layer: 'micro_signal',
        name: '事实层·微观线索',
        color: '#F59E0B',
        headline: 'API 文档中隐藏的动态长程记忆与回溯机制',
        content: '新版本不仅提高了单步推理速度，更在底层协议中引入了「分层记忆衰减算法」，使 Agent 在经历 50 次以上连续交互后依然能牢记初始业务目标与边界约束。',
        keyIndicators: ['长程记忆留存率 92%', '多轮纠错成功率 84%']
      },
      {
        layer: 'interests',
        name: '利益层·各方博弈',
        color: '#0284C7',
        headline: '底层模型巨头的平台垄断 vs 应用层公司的护城河保卫战',
        content: '大模型厂商正试图通过自带的 Agent 框架直接垄断企业操作系统的入口，迫使传统软件公司加速将其私有数据打上加密标签以防被平台白嫖。',
        keyIndicators: ['平台抽成预期 15-30%', '企业自建私有网关比例上升']
      },
      {
        layer: 'logic_chain',
        name: '逻辑层·因果推演',
        color: '#8B5CF6',
        headline: '推理算力需求激增 ➔ 边缘端推理优化 ➔ 端侧协同架构',
        content: 'Agent 的反思与多步规划需要消耗 3-5 倍于普通对话的 Token ➔ 倒逼模型蒸馏与端侧轻量化 ➔ 推动端云协同架构成为主流。',
        keyIndicators: ['长程推理 Token 消耗提升 340%', '小模型蒸馏速度翻倍']
      },
      {
        layer: 'data_signal',
        name: '信号层·量化指标',
        color: '#0D9488',
        headline: '全球开发者生态与企业测试热度指标',
        content: 'GitHub 相关开源 Agent 项目活跃度达 95 的峰值，企业级内测申请量单日突破 10 万家。',
        keyIndicators: ['开发者景气度 95/100', '商业落地意愿 88/100']
      },
      {
        layer: 'deduction',
        name: '推演层·见微之见',
        color: '#E3120B',
        headline: '未来 18 个月：从人机交互到「机机协作」的新经济范式',
        content: '见微判断：下一个时代的核心生产力单位将是「人+智能体集群」。企业竞争力的衡量标准将从员工人数转变为组织调度智能体算力的吞吐密度。',
        keyIndicators: ['组织人均产值预计提升 3-5 倍', '新型人机协同管理学诞生']
      }
    ],
    evidenceChain: [
      {
        id: 'ev-agent-1',
        claim: '复杂任务成功率实现质的飞跃',
        sourceFact: '在 SWE-bench 国际标准真实软件工程挑战赛中解决率达到 52.4%',
        reliability: '高 (国际公开标准测试集)',
        confidenceScore: 97
      },
      {
        id: 'ev-agent-2',
        claim: '企业级集成摩擦阻力显著下降',
        sourceFact: '基于标准化上下文协议 (MCP) 实现对主流 CRM 与 ERP 系统的免代码对接',
        reliability: '高 (官方工程验证实测)',
        confidenceScore: 93
      }
    ],
    industrySignals: [
      { sector: '企业级软件与SaaS', strength: 96, trend: 'up', detail: 'Agent 架构全面重塑现有产品线' },
      { sector: '算力与芯片硬件', strength: 90, trend: 'up', detail: '长程反思推理带来增量算力消耗' },
      { sector: '信息安全与合规', strength: 84, trend: 'up', detail: '自动化权限控制与审计工具需求大增' },
      { sector: '人力资源与外包', strength: 45, trend: 'down', detail: '基础流程外包岗位面临需求转移' }
    ],
    fastReadPoints: [
      { tag: '范式转移', text: 'AI 从被动的知识检索器，正式晋升为能够独立交付业务结果的主动执行者。' },
      { tag: '商业本质', text: '软件公司的收费模式将从「卖工具」彻底转变为「卖工作成果」。' },
      { tag: '关键瓶颈', text: '跨系统数据孤岛与企业对完全放权的信任门槛是未来一年的主要攻坚点。' }
    ],
    narrativeSections: [
      {
        chapter: '第一章：跨越临界点的静默一跃',
        paragraphs: [
          '回顾技术史，每一项颠覆性工具的普及往往经历漫长的平庸期，直到某个微小的系统可靠性跨过 80% 的商业临界点。',
          '过去两年，大模型给人的印象更像是一个博学但偶有胡言乱语的学者。而今天，当长程规划与反思纠错机制被深度固化进模型底座，我们正在目睹数字世界第一次真正意义上的「自主劳动力」诞生。'
        ]
      },
      {
        chapter: '第二章：界面消亡与背后的巨头暗战',
        paragraphs: [
          '当用户只需说出一句话，背后的智能体便自动完成了数十次点击、跨越了五个软件系统，我们熟知的前端交互界面开始悄然退色。',
          '这是一场关于企业级工作流终极控制权的无声战争。谁能成为智能体调度的总调度台，谁就掌握了未来十年全球数字经济的税收权。'
        ]
      }
    ]
  },
  {
    id: 'news-ai-semiconductor',
    title: '算力重构与全球半导体微澜：大厂暗战下一代物理极限',
    subtitle: '从晶圆代工订单的一行微小散热备注，透视全球科技主导权的静默重组',
    oneSentenceVerdict: '当千亿大模型在参数上遭遇收益递减，算力竞争的真正胜负手正在悄然转移到底层物理热功耗与晶圆封装公差。',
    category: '科技前沿',
    tags: ['算力铁幕', '半导体', '先进封装', 'NVIDIA', '台积电'],
    date: '2026年9月1日',
    timeAgo: '4小时前',
    readTimeMinutes: 4,
    sourceName: '见微·全球前沿观察',
    sourceDate: '2026-08-30 08:30',
    sourceCount: 6,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑ 快速',
    summary: '当市场喧嚣于千亿大模型参数竞赛时，真正的变局正在晶圆封装公差与热功耗管理的一行附注中发酵。见微透过财报注脚与供应链微调，复盘这场静悄悄的技术权力转移。',
    coreQuote: '大势的转移从不以雷霆之声开始，而是始于最微小的供应链订单参数修改。',
    quoteAuthor: '见微·特约深度观察',

    tongsuSummary: {
      simpleSay: '现在的超级 AI 芯片发热量太惊人了（单颗发热堪比电磁炉），如果不换更高级的散热包装和光纤连接，芯片自己就会被烧坏。谁先搞定这个散热技术，谁就能把下一代超级计算机造出来。',
      whyExplanation: '就好比你想把 100 匹赛马塞进一个原本只能装 10 匹马的马厩里，马匹挤在一起会热死（物理极限）。你不能光想着挑更快的马，而是必须先给马厩装上中央空调和超大水冷系统。',
      whatItMeans: '制造超级芯片的台积电、搞先进散热包装的工厂、以及提供绿色电力和特种变压器的公司，接下来会比单纯做软件算法的公司更赚钱、更有话语权。',
      jargonTerms: ['公差', 'CPO光电共封装']
    },

    dehydratedItems: {
      coreEntity: '台积电 / NVIDIA / 散热封装供应链',
      keyAction: '先进封装与特种散热公差指标由研发转入规模量产',
      relatedCount: 18,
      coreShifts: [
        '3nm 定制散热封装占比从 15% 跃升至 42%',
        '交付周期从 18 周缩短至 11 周（提速 38.8%）',
        '头部 3 家巨头提前锁定全球 78% 的先进封装配额'
      ],
      impactHighlights: [
        '中小 AI 公司租用算力成本单月上浮 14%，倒逼模型向端侧轻量化突围',
        '光电共封装 (CPO) 与特种液冷进入规模商用前夜，估值溢价向能源基础设施转移'
      ]
    },

    sevenElements: {
      what: '头部晶圆代工厂在季度财报附注中将 3nm 先进封装的散热公差指标转入商用量产阶段。',
      who: '台积电、日月光、NVIDIA、北美超大规模云厂商 (Hyperscalers)。',
      when: '2026年第三季度财报周期。',
      where: '新竹、亚利桑那、硅谷算力数据中心。',
      why: '单芯片物理功耗逼近 1200W 极限，传统风冷与传统铜线互联遭遇不可逆的物理瓶颈。',
      how: '通过引入定制硅通孔 (TSV) 与光电共封装 (CPO)，在物理层面上解决芯片间高频通信的发热与延迟。',
      soWhat: '确立了以先进封装与电力能源为壁垒的第二代算力护城河，大厂凭借资本开支锁定先机。',
      aiVerdict: {
        confidenceScore: 96,
        volatility: '中',
        actionLevel: '关注',
        verdictSummary: '硬件供应链具备高确定性，但需注意终端消费级应用付费意愿可能带来的短期节奏调整。'
      }
    },

    logicTree: {
      rootCause: '单芯片物理功耗逼近 1200W 红线',
      nodes: [
        { id: 'sc-1', label: '散热与高频互联成为首要瓶颈', category: 'cause', description: '传统铜线发热过大，限制集群横向扩展' },
        { id: 'sc-2', label: '先进封装产能被头部巨头包揽', category: 'mid_effect', description: '头部 3 家锁定 78% 硅片配额，形成产能铁幕' },
        { id: 'sc-3', label: '中小厂商训练成本抬升', category: 'mid_effect', description: '算力租金上涨 14%，倒逼端侧小模型量化' },
        { id: 'sc-4', label: '产业链溢价向特种电网与CPO转移', category: 'market_impact', description: '绿色能源直供园区与特种材料供应商享受戴维斯双击' }
      ],
      variableWeights: [
        { name: '先进封装产能良品率', weight: 38, impactDirection: 'up', description: '良品率决定下季度实际出货量' },
        { name: '数据中心电网审批速度', weight: 30, impactDirection: 'down', description: '电力基础设施成为硬性物理约束' },
        { name: '大模型Token推理ROI', weight: 22, impactDirection: 'neutral', description: '下游商业变现决定资本开支可持续性' },
        { name: 'CPO商用渗透率', weight: 10, impactDirection: 'up', description: '光互联技术替代传统铜缆的速度' }
      ]
    },

    personaImpacts: [
      {
        personaId: 'investor',
        coreImpact: '半导体上游设备与特种散热封装的业绩确定性远高于下游未盈利的纯算法初创公司。',
        opportunity: '布局液冷连接器、特种变压器与光电共封装 (CPO) 关键材料龙头。',
        threatRisk: '谨防下游 SaaS 应用变现迟滞导致 2027 年云厂商资本开支增速边际放缓。',
        recommendedAction: '增配现金流充沛的上游硬科技卖水人，平衡纯软件仓位风险。'
      },
      {
        personaId: 'manager',
        coreImpact: '未来 12 个月算力基础设施采购成本难以大幅下降，企业上云需精细化核算 Token 能效比。',
        opportunity: '与二线中立云厂商签署长期保价框架，锁定合理的算力储备。',
        threatRisk: '过度依赖单一硬件供应商可能遭遇交付周期拉长与涨价违约风险。',
        recommendedAction: '推行异构芯片混合部署策略，避免与特定硬件生态深度绑定。'
      },
      {
        personaId: 'founder',
        coreImpact: '不要在通用大模型基座训练上与大厂拼算力消耗，大厂在电力和硅片配额上拥有压倒性优势。',
        opportunity: '转向「小参数+高质量行业语料+端侧量化」的垂直专精路线，把推理成本压到大厂的 1/10。',
        threatRisk: '通用能力缺乏壁垒，易被大厂降价降维打击。',
        recommendedAction: '锁定具体产业场景的专属数据接口，构建非公开的数据护城河。'
      },
      {
        personaId: 'pm',
        coreImpact: '产品响应延迟与服务器成本高度挂钩，高频推理功能必须设计端侧本地预处理机制。',
        opportunity: '设计基于本地端侧芯片的秒级响应体验，减少云端调用次数。',
        threatRisk: '云端调用成本过高导致单用户单位经济模型 (Unit Economics) 为负。',
        recommendedAction: '在产品架构中推行「端侧过滤 + 云端精算」的阶梯式计算策略。'
      },
      {
        personaId: 'dev',
        coreImpact: '底层算力架构正在从单一 GPU 集群向 CPU+GPU+NPU+CPO 异构互联系统演进。',
        opportunity: '深入掌握模型量化剪枝、KV Cache 压缩算法与分布式显存管理。',
        threatRisk: '缺乏硬件底层优化能力的工程师在模型部署阶段将遭遇性能瓶颈。',
        recommendedAction: '学习针对特定芯片指令集的算子优化，提升推理吞吐效率。'
      },
      {
        personaId: 'sales_mkt',
        coreImpact: '硬件设备交付周期成为项目落地成败的核心指标，客户更看重供货确定性而非单纯纸面参数。',
        opportunity: '将「现货算力保障」与「节能低功耗方案」作为核心差异化卖点。',
        threatRisk: '上游硬件断货导致交付延期产生合同违约金。',
        recommendedAction: '与供应链部门建立周度产能对齐机制，审慎承诺超大规模交付排期。'
      }
    ],

    rippleEffect: {
      stages: [
        {
          stage: '一阶影响',
          title: '3nm 先进封装订单锁死，交付周期缩短',
          timeframe: '当前 - 3个月',
          items: ['台积电与日月光产线负荷打满', '超大规模云厂商预付百亿资本开支'],
          severity: '高'
        },
        {
          stage: '二阶影响',
          title: '算力租金上涨与端侧量化浪潮兴起',
          timeframe: '未来 3-9 个月',
          items: ['中型开发商被迫优化模型能效', '特种液冷与变压器设备进入集中交付期'],
          severity: '高'
        },
        {
          stage: '三阶影响',
          title: '能源与算力协同重构全球科技地缘',
          timeframe: '未来 1-3 年',
          items: ['绿电充沛地区成为算力枢纽中心', '光电共封装成为新一代半导体工业事实标准'],
          severity: '中'
        }
      ],
      knowledgeGraph: [
        { id: 'kg-tsmc', name: '台积电 TSMC', type: 'company', relationToMain: '先进制程晶圆代工与 CoWoS 封装制造方' },
        { id: 'kg-nvda', name: 'NVIDIA', type: 'company', relationToMain: '先进封装与高性能算力芯片最大采购方' },
        { id: 'kg-cpo', name: 'CPO 光电共封装', type: 'tech', relationToMain: '突破芯片间通信功耗瓶颈的关键技术' },
        { id: 'kg-grid', name: '特种电网基础设施', type: 'market', relationToMain: '制约算力中心部署节奏的硬性物理要素' },
        { id: 'kg-edge', name: '端侧 AI 芯片', type: 'tech', relationToMain: '规避云端昂贵算力的下游突围方向' }
      ],
      multiSources: [
        { sourceName: '台积电季度法定财报披露', tier: 'Tier 1 顶级权威', stance: '正面', verified: true, excerpt: '先进封装产能利用率持续超越 95%，上调全年相关资本支出' },
        { sourceName: 'Bloomberg 彭博社', tier: 'Tier 1 顶级权威', stance: '正面', verified: true, excerpt: '北美四大云厂商集体确认下一代集群将全线标配液冷' },
        { sourceName: 'Nikkei Asia 日经亚洲', tier: 'Tier 2 主流媒体', stance: '中性', verified: true, excerpt: '指出关键特种化学品与封装基板仍存在潜在供应链脆弱点' },
        { sourceName: '行业供应链未公开调研', tier: 'Tier 3 行业论坛/自媒体', stance: '预警', verified: false, excerpt: '部分二线服务器代工厂面临变压器交付延迟的交付压力' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'micro_signal',
        name: '事实层·微观线索',
        color: '#F59E0B',
        headline: '头部代工厂季度指引中的关键公差注脚变动',
        content: '在最新一季度的供应链交付报告中，3nm及埃米级工艺节点的定制散热封装比重悄然提升至 42%，同时交货周期从 18 周缩短至 11 周。这表明下一代商用集群的部署节奏比外界公开宣称提速了整整一个季度。',
        keyIndicators: ['散热封装占比达 42%', '交付周期压减 38.8%', '特种材料订金增长 65%']
      },
      {
        layer: 'interests',
        name: '利益层·各方博弈',
        color: '#0284C7',
        headline: '算力巨头的产能锁定 vs 中长尾开发者的成本挤压',
        content: '超大规模云厂商通过预付 2 年期资本开支锁定全球 78% 的关键硅片配额，导致中型 AI 公司的租用算力成本单月上浮 14%。表面繁荣的生态下，实质上正在形成难以逾越的技术与资本护城河。',
        keyIndicators: ['头部锁定 78% 先进配额', '中小模型训练成本抬升 14%', '二线云厂商承压']
      },
      {
        layer: 'logic_chain',
        name: '逻辑层·因果推演',
        color: '#8B5CF6',
        headline: '从热密度极限到分布式异构与光电共封装的必然跨越',
        content: '单芯片物理功耗逼近 1200W 红线 ➔ 倒逼液冷与光电共封装(CPO)成为必选项 ➔ 催生特种电网基础设施与高纯度化学品供应商的超额溢价。',
        keyIndicators: ['单机柜功率密度突破 100kW', 'CPO渗透率跨越 30% 临界点']
      },
      {
        layer: 'data_signal',
        name: '信号层·量化指标',
        color: '#0D9488',
        headline: '五大关联产业的真实异动信号矩阵',
        content: '硬件基础设施信号达到 94 的极高亢区间，而终端消费级应用付费意愿出现 8% 的回落，呈现明显的供给先行、应用补课格局。',
        keyIndicators: ['基础设施景气度 94/100', '端侧应用ROI消化期 2-3季度']
      },
      {
        layer: 'deduction',
        name: '推演层·见微之见',
        color: '#E3120B',
        headline: '未来 12 个月：从拼算力规模到拼单位能效的范式转移',
        content: '见微判断：下一阶段胜负手不再是谁的模型参数更大，而是谁能在 1 美元电费下跑出更高的 Token 有效推理吞吐量。重构能源与算力协同的企业将享有戴维斯双击。',
        keyIndicators: ['Token/Watt 能效比成首要考核', '绿色能源直供园区成稀缺资产']
      }
    ],
    evidenceChain: [
      {
        id: 'ev-1',
        claim: '头部算力集群部署节奏提前一个季度',
        sourceFact: '台积电/日月光财报电话会中关于先进封装产能预定率达 98% 的披露数据',
        reliability: '高 (交易所公开法定披露)',
        confidenceScore: 96
      },
      {
        id: 'ev-2',
        claim: '光电共封装与特种液冷进入规模商用前夜',
        sourceFact: '头部服务器 ODM 厂商在开放计算项目 (OCP) 提交的 800G/1.6T 交换机测试规范',
        reliability: '较高 (行业技术白皮书与测试集)',
        confidenceScore: 91
      },
      {
        id: 'ev-3',
        claim: '商业应用端存在 2-3 个季度的投资回报率 (ROI) 消化期',
        sourceFact: '北美四大超大规模云厂商资本开支与软件 SaaS 增量收入的弹性系数比值',
        reliability: '推演 (基于十年周期宏观量化模型)',
        confidenceScore: 84
      }
    ],
    industrySignals: [
      { sector: '算力半导体', strength: 94, trend: 'up', detail: '先进制程与先进封装供不应求' },
      { sector: '能源与电气设备', strength: 88, trend: 'up', detail: '数据中心绿电配储与变压器订单爆满' },
      { sector: '企业级 SaaS', strength: 52, trend: 'neutral', detail: '客户预算收紧，进入精细化复核期' },
      { sector: '消费电子', strength: 63, trend: 'up', detail: '端侧 AI 芯片催生首波换机微潮' },
      { sector: '全球监管合规', strength: 78, trend: 'up', detail: '数据跨境流动与模型安全评测法案密集出台' }
    ],
    fastReadPoints: [
      { tag: '核心转折', text: '算力竞争的决胜点已从纯算法参数转向底层物理热功耗与电能转化比。' },
      { tag: '不可忽视的细节', text: '财报中资本支出预付款翻倍，实质是头部巨头对关键产能的防守型卡位。' },
      { tag: '前瞻预警', text: '关注下季度液冷渗透率数据，这将是产业链溢价转移的直接晴雨表。' }
    ],
    narrativeSections: [
      {
        chapter: '第一章：平静湖面下的第一缕微澜',
        paragraphs: [
          '在科技史的漫长脉络中，真正的分水岭很少伴随雷鸣般的宣讲。当市场将目光全部聚焦在各大发布会绚丽的参数图表上时，晶圆厂代工排期表上一行只有内部工程师能看懂的封装编号修改，才是真正决定下一个五年产业格局的起点。',
          '这是一场由物理学规律引发的静默重构：当晶体管尺寸逼近原子极限，算力的增长不再是简单的线性堆叠，而演变为材料、电力、封装与热力学的全方位综合战役。'
        ]
      },
      {
        chapter: '第二章：博弈深水区：隐形的产能铁幕',
        paragraphs: [
          '看似开放繁荣的开源与商业生态背后，正在悄然降下一道以资本和先进产能为栅栏的铁幕。头部三家巨头通过锁定全球 78% 的先进封装配额，实质上获得了决定下游技术扩散速度的阀门。',
          '那些未能挤进第一梯队的创新公司，不得不将更多精力转向模型量化与边缘端适配——这虽是被迫之举，却也在不经意间拉开了端侧智能革命的序幕。'
        ]
      },
      {
        chapter: '第三章：见微知著：终局范式与破局之道',
        paragraphs: [
          '任何技术的狂飙最终都会回归到最朴素的商业常识：单位产出与投入的经济学法则。当每一焦耳电量所能支撑的智能涌现成为新的度量衡，产业将迎来从「大力出奇迹」到「精雕出神迹」的成熟期。',
          '于细微处见天地，在数据中察先机。这正是见微带给读者的透视之眼。'
        ]
      }
    ]
  },
  {
    id: 'news-fed-liquidity',
    title: '降息周期的静默伏流：离岸美元与新兴市场利差暗战',
    subtitle: '通胀数据下修0.1%背后的全球流动性搬家路线图',
    oneSentenceVerdict: '央行声明仅微调一个副词，便在量化交易模型中确认了政策拐点，引发跨境离岸头寸百亿美元大搬家。',
    category: '全球财经',
    tags: ['美联储', '降息', '离岸美元', '外汇掉期', '流动性'],
    date: '2026年8月28日',
    timeAgo: '3天前',
    readTimeMinutes: 5,
    sourceName: '见微·宏观智库',
    sourceDate: '2026-08-28 14:15',
    sourceCount: 7,
    credibilityStars: 4,
    impactScope: '全球',
    changeVelocity: '→ 稳定',
    summary: '美联储利率决议声明删去了一个修饰词，但这微小的文本变动已引发东京隔夜拆借市场与伦敦离岸资产池百亿美元级的头寸挪移。',
    coreQuote: '央行公报中最危险的信号，往往藏在上一期出现而这一期悄然被删掉的形容词里。',
    quoteAuthor: '见微·首席宏观分析师',

    tongsuSummary: {
      simpleSay: '美国央行在最新的一份通告里悄悄改了一个词，把“紧盯着通胀”改成了“看着办评估”。这就像学校老师突然语气变柔和了，聪明的学生（全球投资机构）马上猜到：马上要放假（降息）了，于是开始把存在银行里的钱拿去买股票、黄金和房产。',
      whyExplanation: '你把钱存在银行能拿 5% 利息时，没人愿意冒险借钱做生意；一旦利息马上要降到 3%，大家就会赶紧把钱取出来买更划算的东西。',
      whatItMeans: '房贷利率可能会稍微松动，美元汇率可能贬值，黄金和部分新兴市场股票可能迎来上涨，但要注意不要盲目跟风。',
      jargonTerms: ['鹰派', '鸽派', '期限错配']
    },

    dehydratedItems: {
      coreEntity: '美联储 / 离岸美元资金池',
      keyAction: '政策声明措辞由「持续关注」软化为「动态评估」',
      relatedCount: 11,
      coreShifts: [
        '互换利率隐含 9 月降息概率飙升至 86%',
        '纽约联储逆回购工具 (ON RRP) 跌破 2000 亿美元关口',
        '日元套息资产平仓规模达 450 亿美元'
      ],
      impactHighlights: [
        '亚洲制造业外贸远期结售汇签约顺差月环比激增 32%',
        '需警惕「降息落地即利多出尽」带来的资产二度震荡'
      ]
    },

    sevenElements: {
      what: '美联储政策公报删除强硬前瞻指引，释放降息周期确认信号。',
      who: '美联储公开市场委员会 (FOMC)、全球外汇交易商、跨国主权基金。',
      when: '2026年8月末。',
      where: '华盛顿、伦敦外汇交易中心、东京金融街。',
      why: '核心通胀指标连续三个月下修，同时劳动力市场失业率逼近警戒线。',
      how: '通过量化自然语言处理 (NLP) 算法直接触发程序化高频期权交易建仓。',
      soWhat: '标志着过去两年的全球高息紧缩周期正式进入收尾阶段，跨国流动性面临大迁徙。',
      aiVerdict: {
        confidenceScore: 92,
        volatility: '高',
        actionLevel: '行动',
        verdictSummary: '宏观流动性拐点明确，建议出海企业与高杠杆机构及时锁定汇率与固定利率工具。'
      }
    },

    logicTree: {
      rootCause: '通胀降温与就业市场松弛触发央行措辞转向',
      nodes: [
        { id: 'fed-1', label: '政策声明措辞鸽派化', category: 'cause', description: '删去「持续收紧」相关表述' },
        { id: 'fed-2', label: '短端国债收益率快速下行', category: 'mid_effect', description: '无风险收益率下行推动资金出逃货币基金' },
        { id: 'fed-3', label: '套息交易平仓与汇率波动', category: 'mid_effect', description: '日元对美元快速反弹，新兴市场央行增持黄金' },
        { id: 'fed-4', label: '全球高风险资产重新定价', category: 'market_impact', description: '高收益信用债利差走窄，资金回流高股息资产' }
      ],
      variableWeights: [
        { name: '非农就业新增数据', weight: 42, impactDirection: 'down', description: '直接决定降息幅度是 25bp 还是 50bp' },
        { name: '离岸美元拆借利差', weight: 26, impactDirection: 'up', description: '反映跨境银行间流动性紧张程度' },
        { name: '大宗商品通胀反弹风险', weight: 20, impactDirection: 'neutral', description: '油价走势可能干扰后续宽松节奏' },
        { name: '主要经济体央行协调度', weight: 12, impactDirection: 'up', description: '欧洲央行与日本央行政策异动' }
      ]
    },

    personaImpacts: [
      {
        personaId: 'investor',
        coreImpact: '高股息蓝筹、黄金与优质成长科技股迎来流动性估值修复，现金类资产吸引力下降。',
        opportunity: '逢低布局受益于利率敏感型的高分红资产与受益于汇率企稳的跨国制造龙头。',
        threatRisk: '市场已高度计价降息，若首次降息后经济数据不及预期，可能出现「利好兑现」的回调。',
        recommendedAction: '锁定中长端高信用等级债券，适当配置黄金作为防守型底仓。'
      },
      {
        personaId: 'manager',
        coreImpact: '跨国融资成本与外汇波动风险加剧，海外子公司美元负债需进行久期管理。',
        opportunity: '利用当前低利率预期重构企业海外银团贷款与发债结构，降低财务费用。',
        threatRisk: '未做汇率套保的外贸应收账款可能因本币升值产生汇兑亏损。',
        recommendedAction: '要求财务部开展外汇掉期风险压力测试，提高远期结汇锁汇比例。'
      },
      {
        personaId: 'founder',
        coreImpact: '一级市场美元基金募资坚冰开始出现松动微澜，硬科技与出海项目估值回暖。',
        opportunity: '启动新一轮融资窗口期，对接具有跨国配置需求的主权基金与产业资本。',
        threatRisk: '资金真正传导至早期股权投资仍需 2-3 个季度滞后期，不可盲目乐观扩张。',
        recommendedAction: '保持 18 个月以上安全现金流，抓住政策窗口期敲定战略融资。'
      },
      {
        personaId: 'pm',
        coreImpact: '跨境电商与跨国支付类产品的海外用户付费意愿与汇率变动直接关联。',
        opportunity: '优化多币种动态计价系统与本地化支付渠道接入，提升海外结算成功率。',
        threatRisk: '汇率剧烈波动可能导致某些低毛利海外地区的客单价收益承压。',
        recommendedAction: '增加针对主要出海市场的本地化币种智能结算选项。'
      },
      {
        personaId: 'dev',
        coreImpact: '跨国金融机构与量化对冲基金对实时宏观事件 NLP 解析与自动化套利系统的开发需求大增。',
        opportunity: '构建基于高频文本解析与图数据库的宏观信号监测工具。',
        threatRisk: '高并发低延迟行情处理系统在突发数据公布时面临负载冲击。',
        recommendedAction: '强化金融数据流水线的冗余备份与断点续传机制。'
      },
      {
        personaId: 'sales_mkt',
        coreImpact: '海外客户的采购预算受制于当地货币汇率，部分新兴市场客户购买力显著增强。',
        opportunity: '针对东南亚与中东客户推出基于锁定汇率的年度预付折扣套餐。',
        threatRisk: '若本币过快升值，单纯依靠低价竞争的出口商品价格优势将被削弱。',
        recommendedAction: '提升产品技术附加值与售后增值服务比重，摆脱纯价格战依赖。'
      }
    ],

    rippleEffect: {
      stages: [
        {
          stage: '一阶影响',
          title: '外汇掉期期权激增与短端利率下行',
          timeframe: '当前 - 1个月',
          items: ['互换市场确认降息时点', '美元指数阶段性走弱'],
          severity: '高'
        },
        {
          stage: '二阶影响',
          title: '新兴市场外贸结汇反弹与主权资产重估',
          timeframe: '未来 1-6 个月',
          items: ['外贸企业加速结汇', '区域央行增持黄金储备', '信用利差收窄'],
          severity: '高'
        },
        {
          stage: '三阶影响',
          title: '跨国产业链资本开支周期二度启动',
          timeframe: '未来 6-18 个月',
          items: ['实体经济借贷成本下降', '全球制造业补库存周期共振'],
          severity: '中'
        }
      ],
      knowledgeGraph: [
        { id: 'kg-fed', name: '美联储 FOMC', type: 'policy', relationToMain: '全球基准货币政策制定核心' },
        { id: 'kg-onrrp', name: '隔夜逆回购 ON RRP', type: 'tech', relationToMain: '衡量银行间多余现金蓄水池的关键指标' },
        { id: 'kg-gold', name: '黄金与大宗商品', type: 'market', relationToMain: '流动性外溢与抗通胀配置直接受益资产' },
        { id: 'kg-yen', name: '日元套息交易', type: 'market', relationToMain: '全球宏观杠杆平仓敏感神经元' }
      ],
      multiSources: [
        { sourceName: '美联储官方声明文本与资产负债表', tier: 'Tier 1 顶级权威', stance: '中性', verified: true, excerpt: '逆回购工具使用规模稳定收缩至正常区间' },
        { sourceName: 'Financial Times 英国金融时报', tier: 'Tier 1 顶级权威', stance: '正面', verified: true, excerpt: '强调亚洲制造业出口国正迎来汇率企稳的良性喘息期' },
        { sourceName: 'WSJ 华尔街日报', tier: 'Tier 1 顶级权威', stance: '中性', verified: true, excerpt: '分析师认为必须警惕劳动力市场非线性下滑的硬着陆可能' },
        { sourceName: '知名宏观宏观交易员社群', tier: 'Tier 3 行业论坛/自媒体', stance: '预警', verified: true, excerpt: '部分日元套息未平仓头寸仍有二次暴雷的隐蔽链条' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'micro_signal',
        name: '事实层·微观线索',
        color: '#F59E0B',
        headline: '政策声明中「持续关注」被替换为「动态评估」',
        content: '看似微不足道的措辞变化，在量化交易算法的自然语言解析器中触发了「鸽派确认信号」，引发两小时内逾 30 亿美元外汇掉期期权建仓。',
        keyIndicators: ['声明删减 1 处前瞻性指引', '互换利率隐含降息概率升至 86%']
      },
      {
        layer: 'interests',
        name: '利益层·各方博弈',
        color: '#0284C7',
        headline: '套息交易者的抢跑与新兴主权基金的防守型对冲',
        content: '跨境对冲基金正加速平仓日元套息资产，而东南亚央行则在暗中增持黄金储备以平抑汇率潜在波动。',
        keyIndicators: ['日元套息平仓规模达 450 亿美元', '区域央行购金强度创 3 年新高']
      },
      {
        layer: 'logic_chain',
        name: '逻辑层·因果推演',
        color: '#8B5CF6',
        headline: '基准利率松动 ➔ 信用利差走窄 ➔ 资产重新定价',
        content: '短端收益率快速下行推动高收益企业债利差收窄至历史 15% 分位，资金被迫流向更高风险偏好的股权类资产。',
        keyIndicators: ['高收益利差收窄 45bp', '大宗商品补库周期启动']
      },
      {
        layer: 'data_signal',
        name: '信号层·量化指标',
        color: '#0D9488',
        headline: '全球五大离岸流动性晴雨表综合指数',
        content: '跨境银行间流动性压力指数降至 38（安全区），但非银金融机构期限错配指标攀升至 74（警戒区）。',
        keyIndicators: ['流动性充裕度 82/100', '期限错配风险 74/100']
      },
      {
        layer: 'deduction',
        name: '推演层·见微之见',
        color: '#E3120B',
        headline: '资产配置警示：防范「宽松落地即利多出尽」的流动性回抽',
        content: '见微提醒：当市场将降息计价得过于完美时，实体经济信贷传导的迟滞可能诱发四季度跨资产类别的二度剧烈波动。',
        keyIndicators: ['警惕预期透支风险', '逢高锁定优质固定收益资产']
      }
    ],
    evidenceChain: [
      {
        id: 'ev-fed-1',
        claim: '离岸美元流动性拐点已先行显现',
        sourceFact: '纽约联储逆回购工具 (ON RRP) 每日使用量跌破 2000 亿美元关口',
        reliability: '高 (美联储官方每日交易公开账目)',
        confidenceScore: 98
      },
      {
        id: 'ev-fed-2',
        claim: '亚洲制造业外贸结汇意愿显著反弹',
        sourceFact: '主要进出口结算银行远期结售汇签约顺差月环比激增 32%',
        reliability: '高 (官方外汇管理局统计公布)',
        confidenceScore: 94
      }
    ],
    industrySignals: [
      { sector: '离岸金融与外汇', strength: 91, trend: 'up', detail: '跨币种掉期与套保需求陡增' },
      { sector: '大宗商品与能源', strength: 74, trend: 'up', detail: '补库预期驱动金属价格企稳' },
      { sector: '房地产信贷', strength: 42, trend: 'neutral', detail: '按揭利率微降但购房者决策周期仍长' },
      { sector: '跨境电商与出海', strength: 85, trend: 'up', detail: '汇率稳定降低外贸毛利侵蚀' },
      { sector: '新兴市场主权债', strength: 68, trend: 'up', detail: '资本回流推升主权信用评级前景' }
    ],
    fastReadPoints: [
      { tag: '措辞玄机', text: '声明仅微调一个词组，实质向全球资产管理机构释放了政策转向的确定性锚点。' },
      { tag: '资本流向', text: '超 400 亿美元热钱正从超短期货币基金分流，涌入亚洲高股息核心资产。' },
      { tag: '风险提示', text: '警惕市场提前透支两次降息预期后遭遇经济数据短期反弹的预期差修复。' }
    ],
    narrativeSections: [
      {
        chapter: '第一章：一个单词价值千亿',
        paragraphs: [
          '中央银行家们是世界上最精明的修辞学家。在数万名操盘手的显示屏前，哪怕是删掉一个副词，其引起的震颤也足以横跨太平洋。',
          '当所有人盯着点阵图预测具体的降息基点时，真正的行家里手早已将目光投向了美联储资产负债表资产端期限结构的微妙收缩。'
        ]
      },
      {
        chapter: '第二章：离岸美元的静默迁徙',
        paragraphs: [
          '水流总是沿着阻力最小的方向漫溢。从东京湾到苏黎世湖，全球跨国企业司库们开始重构他们的多币种流动性池。',
          '那些过去两年习惯了 5% 无风险美元收益率的保守资本，不得不重新审视高风险资产的真实溢价空间。'
        ]
      }
    ]
  },
  {
    id: 'news-ev-supply-chain',
    title: '新能源出海的风洞效应：从整车关税到本土化产业链深潜',
    subtitle: '海外某国港口积压数据归零背后，中国供应链正在换一种打法',
    oneSentenceVerdict: '中国制造不再去撞坚硬的关税之墙，而是将整车拆解为散件出口与软件标准，完成了历史上规模最大的逆向本土化出海。',
    category: '产业纵深',
    tags: ['新能源', '逆向本土化', 'CKD散件', '出海', '供应链'],
    date: '2026年8月25日',
    timeAgo: '1周前',
    readTimeMinutes: 4,
    sourceName: '见微·汽车与高端制造',
    sourceDate: '2026-08-25 10:20',
    sourceCount: 5,
    credibilityStars: 4,
    impactScope: '全球',
    changeVelocity: '↑ 快速',
    summary: '关税壁垒并未阻断出海步伐，反而催生了历史上规模最大的一轮「逆向工程本土化」：零部件套件(CKD)出口激增 140%，电池回收与售后网络先行铺设。',
    coreQuote: '聪明的企业不会去撞坚硬的关税之墙，他们会像水一样渗入当地的产业链缝隙。',
    quoteAuthor: '见微·高端制造课题组',

    tongsuSummary: {
      simpleSay: '外国给整辆电动汽车加征了很高的关税，中国车企没有傻傻硬扛，而是把车拆成一箱箱零件（散件）运过去，在外国当地开厂请当地人拼装，既绕开了关税，还拿到了外国政府给的本地补贴。',
      whyExplanation: '就好比直接运一整杯奶茶出国要交很贵的饮料进口税；但你只运茶叶包、珍珠和奶粉过去，在当地租个铺子雇当地人冲泡，不仅税少了一大半，当地市长还会夸你带动了本地就业。',
      whatItMeans: '中国制造正在从简单的“卖产品”升级为“输出全套开厂办工能力”，海外当地人有了工作，中国企业赚到了技术授权费，实现了双赢。',
      jargonTerms: ['逆向本土化', 'CKD散件']
    },

    dehydratedItems: {
      coreEntity: '中国车企 / 跨国合资供应链',
      keyAction: '整车出口向散件 (CKD) 组装与技术标准授权跃迁',
      relatedCount: 8,
      coreShifts: [
        '散件出口占比突破 64%，滚装船运费高位回落 18%',
        '在匈牙利与墨西哥合资基地实现 30% 本地采购率',
        '快充协议互认率在目标市场突破 70%'
      ],
      impactHighlights: [
        '化解地缘监管阻力，海外单车利润溢价提升 22%',
        '企业估值模型从周期性制造股向跨国技术运营商切换'
      ]
    },

    sevenElements: {
      what: '中国车企通过散件出口 (CKD) 与海外合资建厂，成功穿透高关税壁垒。',
      who: '中国新能源车企、欧洲与东南亚当地政府、国际航运物流商。',
      when: '2026年下半年。',
      where: '匈牙利、墨西哥、泰国、宁波与深圳出口港。',
      why: '直接出口整车面临高达 38% 的惩罚性关税，倒逼出海模式全面重构。',
      how: '输出三电核心模块与数字化车间标准，绑定当地就业承诺获取绿色税收抵免。',
      soWhat: '确立了中国高端制造全球化运营的新标准范式，重塑跨国汽车工业权力版图。',
      aiVerdict: {
        confidenceScore: 95,
        volatility: '低',
        actionLevel: '行动',
        verdictSummary: '出海战略已完成范式验证，建议上下游配套供应链加速抱团出海，锁定属地化先发红利。'
      }
    },

    logicTree: {
      rootCause: '关税壁垒倒逼制造业完成逆向本土化跳跃',
      nodes: [
        { id: 'ev-n1', label: '整车高关税阻断直接贸易', category: 'cause', description: '直接出口整车利润空间被压缩' },
        { id: 'ev-n2', label: '拆解为散件出口与技术输出', category: 'mid_effect', description: 'CKD 散件享受极低零部件关税' },
        { id: 'ev-n3', label: '绑定当地就业换取补贴', category: 'mid_effect', description: '合资建厂解决当地政客选票与税收诉求' },
        { id: 'ev-n4', label: '掌控底层软件与充电标准', category: 'market_impact', description: '海外车机与能源补给网络深度依赖中国技术标准' }
      ],
      variableWeights: [
        { name: '海外属地化用工与工会合规', weight: 45, impactDirection: 'neutral', description: '决定海外工厂投产良率与运营稳定性' },
        { name: '当地政策补贴持续性', weight: 30, impactDirection: 'up', description: '绿色转型基金的财政补贴兑现进度' },
        { name: '零部件国际海运保费', weight: 15, impactDirection: 'down', description: '散件跨洋运输的综合物流总成本' },
        { name: '海外竞品技术跟进速度', weight: 10, impactDirection: 'neutral', description: '传统跨国车企的电动化转型节奏' }
      ]
    },

    personaImpacts: [
      {
        personaId: 'investor',
        coreImpact: '能够成建制在海外落地超级工厂并盈利的汽车龙头将获得媲美跨国巨头的估值溢价。',
        opportunity: '重仓跟随主机厂出海的汽车零部件细分隐形冠军（如内饰、热管理、轻量化底盘）。',
        threatRisk: '谨防海外单一工厂遭遇突发地缘政治摩擦或当地工会罢工风险。',
        recommendedAction: '优选在多区域（欧洲、东盟、拉美）均有分散布局的多中心出海企业。'
      },
      {
        personaId: 'manager',
        coreImpact: '企业管理从「单一总部垂直管控」转变为「多文化、多法域、跨时区的全球化合规治理」。',
        opportunity: '培养兼具中国制造工程效率与海外法律合规能力的跨国管理梯队。',
        threatRisk: '海外劳工法、数据保护法 (GDPR) 与环境审查成为潜在法务地雷。',
        recommendedAction: '聘用当地资深法务与公关团队，将本土化公关纳入核心考核体系。'
      },
      {
        personaId: 'founder',
        coreImpact: '海外售后维修、废旧电池回收与三电检测系统存在巨大的服务链条空白。',
        opportunity: '在欧洲或东南亚当地创办专注于中国新能源车型的数字化售后维保与备件物流平台。',
        threatRisk: '重资产投入过大容易导致资金链紧绷。',
        recommendedAction: '采取轻资产加盟与赋能模式，连接当地既有汽修网络。'
      },
      {
        personaId: 'pm',
        coreImpact: '海外用户的车机交互习惯、隐私偏好与充电补能逻辑与国内存在显著差异。',
        opportunity: '设计深度适配海外主流应用生态（如 Google Auto, Spotify, Apple CarPlay）的海外版系统。',
        threatRisk: '照搬国内功能堆砌导致海外用户反感或违反数据合规禁令。',
        recommendedAction: '在目标市场设立驻地用户体验观察室，进行本土化极简化重构。'
      },
      {
        personaId: 'dev',
        coreImpact: '车联网云端架构需满足海外数据不出境、海外数据中心合规存储的分布式部署要求。',
        opportunity: '研发支持多云架构与全球分布式部署的车联网微服务系统。',
        threatRisk: '跨境 OTA 升级遭遇海外电信运营商协议壁垒。',
        recommendedAction: '采用模块化软件架构，使车控核心与应用层彻底解耦。'
      },
      {
        personaId: 'sales_mkt',
        coreImpact: '海外营销不能仅靠价格战与配置堆砌，必须注重品牌声誉与本地社区融入。',
        opportunity: '赞助当地体育赛事、参与绿色环保公益，提升品牌亲和力与高端认知。',
        threatRisk: '被竞争对手扣上「低价倾销」帽子引发当地消费者抵触。',
        recommendedAction: '突出「为当地创造高薪就业与绿色家园」的品牌价值观叙事。'
      }
    ],

    rippleEffect: {
      stages: [
        {
          stage: '一阶影响',
          title: '散件集装箱激增与海外合资基地点火',
          timeframe: '当前 - 6个月',
          items: ['汽车散件出口占比超 64%', '欧洲首批超级工厂进入设备联调'],
          severity: '高'
        },
        {
          stage: '二阶影响',
          title: '当地供应商生态重组与快充网络铺设',
          timeframe: '未来 6-18 个月',
          items: ['当地采购率达标锁定税收补贴', '海外充电联盟标准确立'],
          severity: '高'
        },
        {
          stage: '三阶影响',
          title: '全球汽车工业权力转移与跨国技术运营商成熟',
          timeframe: '未来 2-5 年',
          items: ['中国汽车技术内核全面赋能全球跨国车企', '全球化研发与供应链双循环建立'],
          severity: '中'
        }
      ],
      knowledgeGraph: [
        { id: 'kg-ckd', name: 'CKD 散件出口', type: 'tech', relationToMain: '突破整车关税壁垒的供应链组织形态' },
        { id: 'kg-catl', name: '宁德时代/国轩高科', type: 'company', relationToMain: '海外本地化动力电池超级工厂投资方' },
        { id: 'kg-tariff', name: '反补贴关税壁垒', type: 'policy', relationToMain: '倒逼出海转型的外部政策冲击' },
        { id: 'kg-eu', name: '欧洲汽车工业公会', type: 'market', relationToMain: '兼具博弈对手与本地就业合作方双重属性' }
      ],
      multiSources: [
        { sourceName: '海关总署车辆零附件出口统计', tier: 'Tier 1 顶级权威', stance: '正面', verified: true, excerpt: 'HS 8708 汽车散件分项出口金额同比增长 142%' },
        { sourceName: 'Automotive News Europe', tier: 'Tier 2 主流媒体', stance: '中性', verified: true, excerpt: '中国车企在匈牙利的超级工厂为当地创造了超过 12,000 个高薪岗位' },
        { sourceName: '欧洲议会产业调研报告', tier: 'Tier 1 顶级权威', stance: '中性', verified: true, excerpt: '强调本土化率达标企业将合规纳入绿色产业补贴名单' },
        { sourceName: '远洋海运运价追踪系统', tier: 'Tier 2 主流媒体', stance: '正面', verified: true, excerpt: '集装箱散件运输比纯滚装船单车综合海运成本降低 24%' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'micro_signal',
        name: '事实层·微观线索',
        color: '#F59E0B',
        headline: '海运集装箱品类申报中「汽车零配件散件」比例剧增',
        content: '宁波与深圳港口数据显示，整车滚装船运量环比放缓 5%，但集装箱装载的底盘总成与电驱模块出口额增长超过 120%。',
        keyIndicators: ['CKD散件出口占比 64%', '滚装船运费高位回落 18%']
      },
      {
        layer: 'interests',
        name: '利益层·各方博弈',
        color: '#0284C7',
        headline: '当地工会就业诉求 vs 中国供应链管理效率输出',
        content: '通过在匈牙利、墨西哥及东盟设立合资组装厂，中国车企将「30% 当地采购率」转化为进入当地政府补贴名单的通行证。',
        keyIndicators: ['当地就业承诺达 1.2 万人', '合规享受当地绿色税收减免']
      },
      {
        layer: 'logic_chain',
        name: '逻辑层·因果推演',
        color: '#8B5CF6',
        headline: '贸易壁垒 ➔ 倒逼产能外溢 ➔ 掌控核心软件与电芯技术标准',
        content: '整车无法直接通关 ➔ 拆解为技术授权与核心三电输出 ➔ 最终锁定海外车型的底层软件生态与快充协议。',
        keyIndicators: ['技术授权费占比升至 18%', '快充协议互认率突破 70%']
      },
      {
        layer: 'data_signal',
        name: '信号层·量化指标',
        color: '#0D9488',
        headline: '全球四大目标市场供应链本土化落地指数',
        content: '东南亚市场成熟度达到 88，欧洲组装基地合规度达到 76，拉美市场增速达到 95。',
        keyIndicators: ['出海综合韧性得分 86/100', '海外单车利润溢价 22%']
      },
      {
        layer: 'deduction',
        name: '推演层·见微之见',
        color: '#E3120B',
        headline: '五年内全球车企竞争终局：从出口大国到跨国技术运营商',
        content: '见微研判：中国汽车工业正在复制当年日系车 80 年代在北美扎根的成功路径，未来的跨国巨头将以「中国技术内核+全球在地制造」为典型形态。',
        keyIndicators: ['全球化跨国运营能力决定估值倍数', '品牌认知本地化成为下一攻坚战']
      }
    ],
    evidenceChain: [
      {
        id: 'ev-ev-1',
        claim: '整车出口向 CKD 散件组装模式快速切换',
        sourceFact: '海关总署商品编码 HS 8708（车辆零附件）出口分项月度统计',
        reliability: '高 (海关权威统计数据)',
        confidenceScore: 97
      },
      {
        id: 'ev-ev-2',
        claim: '欧洲本土超级工厂电池配套已进入设备联调阶段',
        sourceFact: '宁德时代/国轩高科欧洲基地公开招聘与环评公示文件',
        reliability: '高 (政府行政公开档案)',
        confidenceScore: 92
      }
    ],
    industrySignals: [
      { sector: '汽车整车与零部件', strength: 89, trend: 'up', detail: '散件出口与海外合资建厂进入收获期' },
      { sector: '动力电池与储能', strength: 84, trend: 'up', detail: '海外本地化电芯产线加速点火' },
      { sector: '远洋海运物流', strength: 61, trend: 'down', detail: '滚装船运价见顶回归常态' },
      { sector: '充电桩与能源基建', strength: 79, trend: 'up', detail: '出海车企联合共建充电生态联盟' },
      { sector: '国际商法与合规', strength: 95, trend: 'up', detail: '反补贴调查应对与专利交叉授权激增' }
    ],
    fastReadPoints: [
      { tag: '战术升级', text: '不再单打独斗卖整车，而是成建制输出三电模块与数字化车间标准。' },
      { tag: '本地化共赢', text: '通过承诺海外本地就业与税收，成功化解地缘监管阻力。' },
      { tag: '长期壁垒', text: '一旦海外车机系统习惯了中国软件生态与快充标准，后入者极难替代。' }
    ],
    narrativeSections: [
      {
        chapter: '第一章：港口的静默转变',
        paragraphs: [
          '在世界最大的深水港码头，起重机的吊臂依然繁忙。但如果仔细观察集装箱上的报关单据，就会发现一个惊人的变化：整车包装的比例在下降，而写满精密机械部件的箱子正排起长龙。',
          '这不是退缩，而是一场更高维度的产业突击。中国制造正在从「造好一辆车运出去」，进化为「把一整套造车能力嵌入全球」。'
        ]
      },
      {
        chapter: '第二章：重写游戏规则',
        paragraphs: [
          '跨国贸易史上每一次关税高墙的立起，最终都倒逼出了更具韧性的跨国企业。从丰田到现代，无一不是在逆境中完成了全球本土化的惊险一跃。',
          '今天，在多瑙河畔和墨西哥高原上，中国工程师正在与当地工人一起，调试最新一代的智能制造单元。'
        ]
      }
    ]
  }
];

export const INITIAL_NEWS_ARTICLES: NewsArticle[] = CURATED_ARTICLES;

