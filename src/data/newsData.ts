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
    sourceUrl: 'https://openai.com/index/introducing-operator',
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
    sourceUrl: 'https://pr.tsmc.com/english/news/3175',
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
    sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
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
        { sourceName: '知名宏观交易员社群', tier: 'Tier 3 行业论坛/自媒体', stance: '预警', verified: true, excerpt: '部分日元套息未平仓头寸仍有二次暴雷的隐蔽链条' }
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
    sourceUrl: 'https://www.caam.org.cn/chn/4/cate_39/con_523589.html',
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
  },
  {
    id: 'news-reuters-chiplet-packaging',
    title: '路透社：全球先进封装与 Chiplet 晶圆级互连产业链加速重组',
    subtitle: '台积电、日月光与三星电子抢注 2.5D/3D 封装产能，算力芯片突破物理极限',
    oneSentenceVerdict: '芯片摩尔定律放缓背景下，先进封装已取代摩尔缩放，成为大模型算力芯片决定性成本与性能生死线。',
    category: '半导体芯片',
    tags: ['先进封装', 'Chiplet', 'CoWoS', '台积电', '路透社'],
    date: '2026年10月2日',
    timeAgo: '1小时前',
    readTimeMinutes: 4,
    sourceName: '路透社 Reuters · 科技与半导体组',
    sourceDate: '2026-10-02 08:30',
    sourceCount: 8,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑↑ 极快',
    summary: '据路透社多方获悉，全球三大晶圆巨头正针对 2.5D/3D Chiplet 异构集成封装展开新一轮扩产竞速。高带宽内存 (HBM) 与 GPU/NPU 晶粒在封装层面的极窄间距互连，成为保障大模型并行算力的核心瓶颈。',
    coreQuote: '在纳米级微缩边际成本递增的今天，封装厂正在承担过去晶圆厂最核心的算力倍增使命。',
    quoteAuthor: '路透社资深半导体分析师',

    tongsuSummary: {
      simpleSay: '以前提高芯片性能靠把电路线缩小；现在电路缩小太难太贵了，科学家改用“盖高楼”和“乐高拼接”的方法，把算力芯片和高带宽内存用超细导线紧紧贴在一起，这就是先进封装。',
      whyExplanation: '就像城市交通：单条马路修得再宽也有极限，但如果建造多层地下立体隧道和过街天桥，整座城市的车流效率就能翻倍。',
      whatItMeans: '先进制程成本居高不下，先进封装成为中国与全球芯片产业突破算力封锁与成本瓶颈的必争之地。',
      jargonTerms: ['Chiplet', 'CoWoS', '2.5D/3D封装']
    },

    dehydratedItems: {
      coreEntity: '台积电 (TSMC) / 日月光 / 顶级算力芯片厂商',
      keyAction: '针对 CoWoS / 3D IC 产能展开跨国联合扩建与产业链重组',
      relatedCount: 22,
      coreShifts: [
        'CoWoS 高级封装月产能提升 45%，HBM 供应链配比趋于饱和',
        '玻璃基板 (Glass Substrate) 互连测试进入工程验证期',
        '先进封装在算力芯片总成本中的占比从 12% 攀升至 28%'
      ],
      impactHighlights: [
        '封测厂商从传统产业链后段提升为高壁垒核心节点',
        '国产芯片产业链在 2.5D 异构集成领域迎来弯道超车红利期'
      ]
    },

    sevenElements: {
      what: '全球主流芯片制造与封测巨头全面扩建 2.5D/3D Chiplet 先进封装产能。',
      who: '路透社、台积电、三星电子、日月光半导体、英伟达及高带宽内存供应商。',
      when: '2026年10月初。',
      where: '中国台北、美韩半导体产业带及东南亚封测基地。',
      why: '晶体管物理缩放接近极限，通过 Chiplet 多芯片异构集成成为延续算力提升的最佳经济选择。',
      how: '采用高密度硅中介层与硅通孔 (TSV) 技术，缩短芯片间数据传输延迟并压低功耗。',
      soWhat: '重塑全球半导体供应链分工与价值分配，先进封装设备与材料成为新一轮投资高地。',
      aiVerdict: {
        confidenceScore: 96,
        volatility: '中',
        actionLevel: '行动',
        verdictSummary: '芯片先进封装替代物理微缩，成为大模型算力核心瓶颈与竞争高地。'
      }
    },

    logicTree: {
      rootCause: '摩尔定律物理缩放放缓，必须通过先进封装异构集成延续算力增长',
      nodes: [
        {
          id: 'reuters-node-1',
          label: '2.5D/3D Chiplet 互连需求爆发',
          category: 'cause',
          description: 'GPU与高带宽内存 (HBM) 紧密封装大幅提升数据互连吞吐',
          dataPoint: '月产能增长 45%'
        },
        {
          id: 'reuters-node-2',
          label: '传统封测升级为高技术高议价权核心节点',
          category: 'market_impact',
          description: '芯片制造竞争重心由单纯几纳米转向封装集成'
        }
      ],
      variableWeights: [
        { name: 'HBM内存产额与产能', weight: 40, impactDirection: 'up', description: '决定算力系统吞吐效率' },
        { name: '玻璃基板等新材料成熟度', weight: 30, impactDirection: 'up', description: '降低互连损耗' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '巨头宣布扩建先进封装基地',
        content: '路透社报道显示，晶圆巨头与封测大厂同步增加先进封装设备采购订单。',
        keyIndicators: ['CoWoS月产能+45%', 'HBM堆叠比例上升']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '封测节点估值与溢价重构',
        content: '具备 2.5D/3D 封装能力的厂商从低毛利加工转变为高议价权核心节点。',
        keyIndicators: ['封测成本占比达28%', '溢价能力显著上升']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-reuters-1',
        claim: '先进封装月产能缺口促使资本开支同比大增 45%',
        sourceFact: '路透社援引台积电与日月光法人说明会公开财报数据',
        reliability: '高 (上市公司法定财报与公报)',
        confidenceScore: 98
      }
    ],

    industrySignals: [
      { sector: '半导体芯片与制造', strength: 95, trend: 'up', detail: '先进封装设备与硅中介层订单爆满' },
      { sector: 'AI与大模型', strength: 91, trend: 'up', detail: '高带宽内存与 GPU 堆叠打通算力瓶颈' }
    ],

    fastReadPoints: [
      { tag: '产业重心', text: '芯片竞争后半场，决定胜负的不仅是几纳米，更是如何把芯片贴得更近。' },
      { tag: '自主可控', text: '成熟制程 + 先进封装是缓解高端芯片封锁的重要工程路径。' }
    ]
  },
  {
    id: 'news-ft-global-macro-bonds',
    title: 'FT 中文网：美联储与欧央行政策分化，跨境资本重新配置新兴市场资产',
    subtitle: '汇率波动率下降刺激套利交易，全球主权基金增持高质比债券与硬科技资产',
    oneSentenceVerdict: '全球央行货币政策步调差异引发新一轮资本流向重组，具有产业护城河的优质资产获得跨国长期资金溢价。',
    category: '资本市场',
    tags: ['FT中文网', '美联储', '跨境资本', '宏观经济', '债券市场'],
    date: '2026年10月2日',
    timeAgo: '3小时前',
    readTimeMinutes: 4,
    sourceName: 'FT 中文网 · 国际财经组',
    sourceDate: '2026-10-02 07:15',
    sourceCount: 6,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑ 中速',
    summary: '英国《金融时报》(Financial Times) 分析指出，美联储与欧洲央行降息节奏的分化，促使全球大型养老基金与主权财富基金调整资产配置比例，流入亚洲优质硬科技企业债与高股息资产的资金规模创近两年新高。',
    coreQuote: '资本永远寻找安全边际与增长确定性的交集，这促使全球资金重新评估新兴市场的长远回报率。',
    quoteAuthor: 'FT 首席金融评论员',

    tongsuSummary: {
      simpleSay: '外国的大型基金（比如养老金和国家主权基金）正在把钱从欧美金融市场挪一部分出来，买入亚洲和新兴市场的稳健优质资产，因为那里的回报率和安全性更有保障。',
      whyExplanation: '就像存钱：如果几家银行给的利息和降息节奏不一样，大户就会把钱分批存到既安全利息又合适的新银行里。',
      whatItMeans: '全球流动性环境改善，有助于降低优质跨国企业和科技公司的融资成本。',
      jargonTerms: ['跨境套利', '主权财富基金', '利差配置']
    },

    dehydratedItems: {
      coreEntity: '全球主权财富基金 / 欧美中央银行 / 亚洲优质资产',
      keyAction: '调整全球资产组合配比，增加高分红与硬科技标的权重',
      relatedCount: 18,
      coreShifts: [
        '亚洲核心科技企债获超额认购 3.2 倍',
        '外汇利差波动率压低至近 18 个月低位',
        '长期主权资金流入硬科技实体产业占比升至 34%'
      ],
      impactHighlights: [
        '降低实体科技企业的国际债券发行与融资成本',
        '全球资本配置更趋理性，注重资产真实现金流与技术壁垒'
      ]
    },

    sevenElements: {
      what: '全球主权财富基金因央行政策分化而重新调整跨国资产配置比重。',
      who: 'FT 中文网、金融时报研究团队、美联储、欧洲央行、全球主权财富基金。',
      when: '2026年10月初。',
      where: '伦敦、纽约、新加坡、香港。',
      why: '欧美央行货币政策步调不一导致利差重估，全球资金追求更优的风险调整后收益。',
      how: '通过增持优质企业债、高分红股票及实体科技项目股权实现资产组合再平衡。',
      soWhat: '改善新兴市场硬科技企业的资本供给环境，推高具有真实壁垒的优质标的估值。',
      aiVerdict: {
        confidenceScore: 94,
        volatility: '低',
        actionLevel: '观望',
        verdictSummary: '全球美欧央行政策分化，驱动跨境套利与长期主权资金重新布局新兴市场高质资产。'
      }
    },

    logicTree: {
      rootCause: '欧美央行货币政策节奏分化导致跨国利差重估',
      nodes: [
        {
          id: 'ft-node-1',
          label: '全球流动性向亚洲优质债券与硬科技资产再配置',
          category: 'market_impact',
          description: '主权基金寻找安全边际与稳定真现金流标的',
          dataPoint: '企业债认购超额 3.2 倍'
        }
      ],
      variableWeights: [
        { name: '美联储利率路径', weight: 50, impactDirection: 'down', description: '影响全球资金成本与利差' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '国际主权基金增持亚洲债券与高股息股票',
        content: 'FT 中文网报道称跨境资金流入亚洲高评级债券与科技标的显著增加。',
        keyIndicators: ['认购倍数3.2倍', '利差波动率低位']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-ft-1',
        claim: '亚洲高评级企业债超额认购倍数创下 3.2 倍高点',
        sourceFact: 'FT 中文网引用的国际清算银行 (BIS) 与彭博债券交易统计',
        reliability: '高 (国际金融机构官方结算统计)',
        confidenceScore: 97
      }
    ],

    industrySignals: [
      { sector: '资本市场与宏观金融', strength: 91, trend: 'up', detail: '跨境资本流动恢复平稳正向净流入' },
      { sector: '科技前沿', strength: 86, trend: 'up', detail: '硬科技实体融资成本有所下降' }
    ],

    fastReadPoints: [
      { tag: '资本流向', text: '钱正在流向真正有技术壁垒和稳定现金流的硬科技与高股息资产。' },
      { tag: '融资红利', text: '优质科技企业迎来更具性价比的跨国融资窗口期。' }
    ]
  },
  {
    id: 'news-anthropic-claude37',
    title: 'Anthropic 发布 Claude 3.7 Sonnet：混合推理架构突破复杂逻辑与代码天花板',
    subtitle: '开启「思考预算可控」新范式，企业级软件开发与数学证明完成度从 62% 跃升至 91%',
    oneSentenceVerdict: '这次升级标志着 AI 模型开始支持开发者自定义推理思考时长，在毫秒级即时响应与数分钟深度长思考间实现弹性切换。',
    category: 'AI 前沿',
    tags: ['Claude 3.7', 'Anthropic', 'AI 代码生成', '混合推理', '大模型'],
    date: '2026年10月2日',
    publishedAt: '2026-10-02T15:30:00.000Z',
    sourceDate: '2026-10-02 15:30',
    timeAgo: '30分钟前',
    readTimeMinutes: 4,
    sourceName: 'Anthropic 官方技术发布',
    sourceUrl: 'https://anthropic.com/news/claude-3-7-sonnet',
    sourceCount: 9,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑↑ 极快',
    summary: 'Anthropic 正式推出 Claude 3.7 Sonnet 模型，引入业内首个混合推理架构。模型可在极速响应模式与深度思考反思模式间无缝切换，并在 SWE-bench Verified 软件工程能力测试中创下 70.3% 的全新纪录。',
    coreQuote: '未来大模型的竞争不再仅仅是单次生成的Tokens速度，而是能够让模型按照任务难度动态消耗算力思考多久。',
    quoteAuthor: 'Anthropic 首席科学家',

    tongsuSummary: {
      simpleSay: '以前的大模型回答问题就像“脱口而出”，遇到简单题很爽，但遇到复杂的编程或算术就容易犯错；现在的 Claude 3.7 就像给 AI 装了个“思考开关”，遇到难事它会先在后台打草稿推理几分钟，确保出来的代码和答案一次成功。',
      whyExplanation: '就像做高考压轴题：以前你逼着学生 3 秒内报出答案，他肯定靠瞎猜；现在你允许他在草稿纸上算 5 分钟，他的得分率就会翻倍。',
      whatItMeans: '复杂软件工程、跨系统 API 重构和法律合同合规审查等高门槛工作，将迎来第一批能够真正替代高阶程序员和分析师的 AI 助手。',
      jargonTerms: ['混合推理架构', '思考预算 (Thinking Budget)', 'SWE-bench']
    },

    dehydratedItems: {
      coreEntity: 'Anthropic / Claude 3.7 Sonnet',
      keyAction: '发布混合推理长思考架构并在 SWE-bench 登顶',
      relatedCount: 18,
      coreShifts: [
        '允许用户通过 API 自由调节思考 Budget (1秒 至 128K Tokens)',
        '软件工程自动化重构测试准确率从 62% 升至 91%',
        '前端交互与完整单页应用 (SPA) 一次性无错生成率达 88%'
      ],
      impactHighlights: [
        '程序员从手写冗长基础代码转变为高阶代码架构审核员',
        '企业内部 Agent 研发周期由几个月压降至数个小时'
      ]
    },

    sevenElements: {
      what: 'Anthropic 正式发布 Claude 3.7 Sonnet 混合推理模型。',
      who: 'Anthropic、全球软件开发者、科技巨头及 API 开发者生态。',
      when: '2026年10月2日。',
      where: '全球云计算节点与 API 接口服务。',
      why: '传统即时生成模型在面对跨文件复杂代码工程和长步骤逻辑推理时准确率遭遇瓶颈。',
      how: '在 Token 生成前植入显式可控的思考推理链（Thinking Chain），并在 API 中暴露推理配额控制。',
      soWhat: '彻底重塑软件开发范式与 Agent 开发门槛，拉开长思考推理模型商业化普惠大幕。',
      aiVerdict: {
        confidenceScore: 98,
        volatility: '低',
        actionLevel: '行动',
        verdictSummary: '长思考混合推理模型成熟，软件工程与复杂推理场景迎来全面代际升级。'
      }
    },

    logicTree: {
      rootCause: '模型引入显式推理思考链与弹性思考预算配额',
      nodes: [
        { id: 'cl-1', label: '思考时间与算力分配实现细粒度控制', category: 'cause', description: '简单问题毫秒响应，复杂代码深思熟虑', dataPoint: 'SWE-bench 70.3%' },
        { id: 'cl-2', label: '跨文件复杂工程重构成功率倍增', category: 'mid_effect', description: 'AI Agent 能自主修复数百行嵌套 Bug', dataPoint: '成功率升至 91%' },
        { id: 'cl-3', label: '开发者工具与 IDE 重构潮启动', category: 'market_impact', description: '代码编辑器全面转向自然语言协同架构' }
      ],
      variableWeights: [
        { name: '长思考 API 调优成本', weight: 45, impactDirection: 'up', description: '决定企业大规模部署意愿' },
        { name: '代码生态兼容性', weight: 35, impactDirection: 'up', description: '影响垂直行业迁移速度' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: 'Anthropic 正式推出 Claude 3.7 Sonnet',
        content: '模型支持开发者在 API 中传入 thinking.type 与 max_thinking_tokens 参数。',
        keyIndicators: ['SWE-bench 70.3%', '长思考预算 128K']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: 'AI Coding 领域投资热度二次升温',
        content: '围绕长思考 API 的上下游 Agent 工具链企业估值迎来戴维斯双击。',
        keyIndicators: ['代码 Agent 估值+35%', '推理算力需求大增']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-cl-1',
        claim: 'Claude 3.7 在 SWE-bench Verified 上取得 70.3% 得分',
        sourceFact: 'Anthropic 官方公布的基准测试集完整可复现日志',
        reliability: '高 (权威公开 Benchmark 基准与第三方验证日志)',
        confidenceScore: 98
      }
    ],

    industrySignals: [
      { sector: 'AI与大模型', strength: 98, trend: 'up', detail: '混合推理架构成为行业新标杆' },
      { sector: '软件工程与SaaS', strength: 92, trend: 'up', detail: '代码开发范式向 Prompt + 代码架构审核全面演进' }
    ],

    fastReadPoints: [
      { tag: '推理革新', text: '让 AI 学会“想清楚了再说话”，复杂任务成功率实现代际跨越。' },
      { tag: '生产力工具', text: '开发者效率呈指数级上升，一人完成小型软件团队工程不再是梦。' }
    ]
  },
  {
    id: 'news-tsmc-2nm-yield',
    title: '台积电 2nm 试产良率攻克 75% 关口：苹果与英伟达抢订 2027 首批产能',
    subtitle: 'GAAFET 纳米片晶体管突破 3nm 物理微缩极限，芯片功耗较前代再降 30%',
    oneSentenceVerdict: '全环绕栅极 (GAAFET) 架构良率达标标志着摩尔定律在物理硬核层面再度被强行延续，先进制程定价权牢牢锁定在头部代工手里。',
    category: '半导体芯片',
    tags: ['2nm', '台积电', 'GAAFET', '芯片良率', '英伟达'],
    date: '2026年10月2日',
    publishedAt: '2026-10-02T12:15:00.000Z',
    sourceDate: '2026-10-02 12:15',
    timeAgo: '2小时前',
    readTimeMinutes: 4,
    sourceName: '电子时报 DIGITIMES · 半导体前沿',
    sourceUrl: 'https://digitimes.com/news/tsmc-2nm-yield',
    sourceCount: 7,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑ 快',
    summary: '据供应链最新确认，台积电新竹与高雄 2nm 厂区试产良率突破 75% 商业化临界点。首次全面采用的全环绕栅极 (GAAFET) 架构有效遏制了纳米级漏电，同等功耗下性能提升 15%，或在同等性能下功耗降低 30%。',
    coreQuote: '物理极限不是终点，而是先进封装与纳米晶体管结构重组的起点。',
    quoteAuthor: '台积电资深技术研发总监',

    tongsuSummary: {
      simpleSay: '芯片内部的电路已经细到了纳米级别，水管（电流）太细就会到处漏水漏电。台积电这次用一种新的“全包围式栅极”结构，像给电线裹上超紧密绝缘套，把漏电堵住了，芯片不仅跑得更快，手机和服务器还更省电了。',
      whyExplanation: '就像水龙头漏水：以前只是按住水龙头开关，水还是从缝隙渗出来（漏电）；现在把整根水管四周全都包裹封闭起来，水滴不漏，水压更大。',
      whatItMeans: '未来的顶级智能手机、AI 算力服务器和端侧眼镜芯片，电池续航和计算速度将迎来大幅拉升，但制造费用也大幅水涨船高。',
      jargonTerms: ['GAAFET 纳米片', '2nm 晶圆良率', '漏电流抑制']
    },

    dehydratedItems: {
      coreEntity: '台积电 TSMC / 苹果 Apple / 英伟达 NVIDIA',
      keyAction: '2nm 试产良率达 75%，锁定首批超级大客户包厂订单',
      relatedCount: 15,
      coreShifts: [
        '2nm GAAFET 晶圆单片预估售价突破 3 万美元',
        '同性能下芯片功耗压降 30%，端侧 AI 续航焦虑缓解',
        '高雄与宝山厂区 2026 下半年将迎来设备全面进场点火'
      ],
      impactHighlights: [
        '高端芯片代工市场集中度继续向头部代工巨头倾斜',
        '下游设备与光刻胶特种化学品迎来订单重构'
      ]
    },

    sevenElements: {
      what: '台积电 2nm GAAFET 晶圆试产良率攻克 75% 商业化大关。',
      who: '台积电、苹果、英伟达、ASML 光刻供应链及晶圆设备商。',
      when: '2026年10月初。',
      where: '中国台湾宝山与高雄 P1 厂区。',
      why: 'FinFET 结构在 3nm 以下面临严重晶体管量子隧穿漏电瓶颈。',
      how: '全面转向纳米片 GAAFET 架构，配合高数值孔径 EUV 光刻机进行多重曝光。',
      soWhat: '确立未来 3 年全球顶级 AI 芯片与旗舰终端的物理算力基座，巩固先进制程议价权。',
      aiVerdict: {
        confidenceScore: 96,
        volatility: '低',
        actionLevel: '关注',
        verdictSummary: '2nm 良率达标破除技术悬念，先进制程供应链壁垒进一步夯实。'
      }
    },

    logicTree: {
      rootCause: 'GAAFET 结构突破晶体管漏电瓶颈，2nm 试产良率突破 75%',
      nodes: [
        { id: 'ts-1', label: '2nm 芯片试产良率达到商业化量产标准', category: 'cause', description: '高雄厂设备进场拉升产能配额', dataPoint: '良率 75%' },
        { id: 'ts-2', label: '苹果与英伟达预付数十亿独家包厂定金', category: 'mid_effect', description: '锁定 2027 年高端移动与 AI 芯片配额', dataPoint: '单片 3 万美元' },
        { id: 'ts-3', label: '消费电子旗舰机与算力集群功耗红利释放', category: 'market_impact', description: '端侧 AI 算力与电池续航迎双提升' }
      ],
      variableWeights: [
        { name: 'EUV光刻机设备交付节奏', weight: 50, impactDirection: 'up', description: '影响产能扩充上限' },
        { name: '特种气体与化学品纯度', weight: 30, impactDirection: 'up', description: '关乎后续量产稳定良率' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '台积电 2nm 试产良率达成 75%',
        content: '供应链确认试产晶圆测试结果好于预期，预量产时程表提前。',
        keyIndicators: ['试产良率75%', '功耗-30%']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '先进制程资本开支增加',
        content: '顶级代工厂 2027 年 Capital Expenditure 预算再次上修。',
        keyIndicators: ['单片售价 3 万美元', '包厂定金大增']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-ts-1',
        claim: '台积电 2nm 试产晶圆良率达到 75% 商业化指标',
        sourceFact: '电子时报 DIGITIMES 援引设备厂商与台湾竹科供应链联合核实',
        reliability: '高 (半导体行业权威垂直媒体深入调查)',
        confidenceScore: 95
      }
    ],

    industrySignals: [
      { sector: '半导体芯片与制造', strength: 96, trend: 'up', detail: '2nm 物理架构瓶颈突破，量产预期明朗' },
      { sector: '消费电子与AI终端', strength: 90, trend: 'up', detail: '旗舰手机与端侧 AI 迎性能续航双提升' }
    ],

    fastReadPoints: [
      { tag: '物理突破', text: 'GAAFET 架构解决漏电顽疾，摩尔定律物理硬核续命成功。' },
      { tag: '巨头锁定', text: '苹果英伟达预付包厂定金，算力芯片顶级制程依然是一票难求。' }
    ]
  },
  {
    id: 'news-pboc-liquidity-tool',
    title: '中国央行启用买断式逆回购与结构性支持工具：精准引导中长期资本入市',
    subtitle: '千亿级公开市场流动性吐纳，定向承接高质比硬科技与产业链自主可控项目',
    oneSentenceVerdict: '货币政策工具箱由传统单纯数量调控向精准结构引导转变，流动性精准滴灌硬科技实体与资本市场稳健运行。',
    category: '资本市场',
    tags: ['央行', '买断式逆回购', '流动性', '硬科技融资', '资本市场'],
    date: '2026年10月2日',
    publishedAt: '2026-10-02T10:20:00.000Z',
    sourceDate: '2026-10-02 10:20',
    timeAgo: '4小时前',
    readTimeMinutes: 3,
    sourceName: '金融时报 / 中国人民银行官方公告',
    sourceUrl: 'http://pbc.gov.cn/news/20261002',
    sourceCount: 8,
    credibilityStars: 5,
    impactScope: '全国',
    changeVelocity: '↑ 快',
    summary: '中国人民银行公告启动买断式逆回购操作，并搭配结构性货币政策工具。本次操作期限涵盖 3 个月至 1 年，有效填补中长期流动性缺口，支持商业银行对战略性新兴产业与高科技制造业投放低成本长期贷款。',
    coreQuote: '保持银行体系流动性合理充裕，引导资金流向科技创新与高新制造业实体。',
    quoteAuthor: '人民银行货币政策司发言人',

    tongsuSummary: {
      simpleSay: '央行通过给商业银行借长期“便宜钱”，要求银行必须把这些资金用到支持芯片、大模型、新能源等硬科技企业身上，既给市场注入了充足的资金养分，又防止钱在金融体系里空转套利。',
      whyExplanation: '就像农田灌溉：过去是大水漫灌（全社会降息），好苗子和杂草都吸水；现在是滴灌系统（结构性支持），把管子直接接到有技术有潜力的“好苗子”根部。',
      whatItMeans: '优质硬科技上市公司的融资成本进一步下降，股市流动性基底更加稳健，耐心资本获得长效政策保障。',
      jargonTerms: ['买断式逆回购', '结构性货币政策工具', '耐心资本']
    },

    dehydratedItems: {
      coreEntity: '中国人民银行 PBOC / 商业银行 / 硬科技上市企业',
      keyAction: '启动买断式逆回购，向市场注入千亿级中长期流动性',
      relatedCount: 16,
      coreShifts: [
        '填补传统 DR007 短端利率波动，压低企业中长期债融成本',
        '高科技制造与专精特新企业贷款利率同比压降 35BP',
        '资本市场高股息与科技龙头获得长线资金底座支持'
      ],
      impactHighlights: [
        '商业银行资产负债表匹配度显著提升',
        '引导机构投资者做多硬科技资产与优质红利标的'
      ]
    },

    sevenElements: {
      what: '中国人民银行开展买断式逆回购与结构性支持工具操作。',
      who: '中国人民银行、一级交易商、商业银行及高新技术企业。',
      when: '2026年10月初。',
      where: '公开市场业务操作平台。',
      why: '平滑季节性资金波动，定向支持科技创新与实体经济发展。',
      how: '以债券为质押物进行买断式逆回购，向一级交易商注入中长期资金。',
      soWhat: '降低实体企业融资成本，巩固资本市场稳健运行的流动性底座。',
      aiVerdict: {
        confidenceScore: 97,
        volatility: '低',
        actionLevel: '行动',
        verdictSummary: '央行工具箱精准滴灌，硬科技与高股息资产持续获得中长期资金支撑。'
      }
    },

    logicTree: {
      rootCause: '央行创新货币政策工具箱，进行精准流动性结构调整',
      nodes: [
        { id: 'pb-1', label: '买断式逆回购投放中长期资金', category: 'cause', description: '平抑资金面波动，补充银行充裕流动性', dataPoint: '千亿级注入' },
        { id: 'pb-2', label: '定向降低战略新兴产业融资成本', category: 'mid_effect', description: '专精特新贷款利率压降 35BP', dataPoint: '利率下行' },
        { id: 'pb-3', label: '资本市场长期耐心资本底座夯实', category: 'market_impact', description: '优质科技标的与红利资产估值获得支撑' }
      ],
      variableWeights: [
        { name: '公开市场操作续作规模', weight: 45, impactDirection: 'up', description: '决定流动性宽松持续时间' },
        { name: '信贷向实体转化效率', weight: 35, impactDirection: 'up', description: '关乎企业投资再扩大' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '央行开展买断式逆回购操作',
        content: '资金面维持充裕，短端与中长期市场利率平稳下行。',
        keyIndicators: ['中长期流动性', '贷款利率-35BP']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '资金向硬科技资产流转',
        content: '机构投资者加大对高质比科技创新与高股息资产的配置力度。',
        keyIndicators: ['耐性资本增加', '科技估值底座']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-pb-1',
        claim: '央行公开市场买断式逆回购成功注入中长期流动性',
        sourceFact: '中国人民银行公开市场业务交易公告（2026年第188号）',
        reliability: '高 (国家央行法定公告)',
        confidenceScore: 99
      }
    ],

    industrySignals: [
      { sector: '资本市场与宏观金融', strength: 95, trend: 'up', detail: '中长期资金供给充裕，市场底座稳固' },
      { sector: '科技前沿与高端制造', strength: 88, trend: 'up', detail: '专项贷款资金快速精准落地' }
    ],

    fastReadPoints: [
      { tag: '政策定向', text: '央行精准滴灌硬科技，不搞大水漫灌，拒绝资金空转。' },
      { tag: '资本利好', text: '优质科技企业与红利资产迎来更充裕的中长期长线资金护航。' }
    ]
  },
  {
    id: 'news-catl-solid-state-pilot',
    title: '宁德时代全固态电池 GWh 级示范产线点火：能量密度破 500Wh/kg',
    subtitle: '彻底告别液态电解质易燃隐患，电动汽车续航 1200km 与 eVTOL 飞行器商业化起飞',
    oneSentenceVerdict: '全固态电池从实验室样品走向 GWh 级工业示范点火，标志着下一代化学电源技术制高点竞争进入决胜阶段。',
    category: '新能源',
    tags: ['全固态电池', '宁德时代', '能量密度', 'eVTOL', '新能源汽车'],
    date: '2026年10月2日',
    publishedAt: '2026-10-02T14:10:00.000Z',
    sourceDate: '2026-10-02 14:10',
    timeAgo: '1小时前',
    readTimeMinutes: 4,
    sourceName: '高工锂电 GT-Battery · 独家报道',
    sourceUrl: 'https://gg-lb.com/news/solid-state-catl',
    sourceCount: 6,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑ 快',
    summary: '高工锂电获悉，宁德时代全固态电池 GWh 级样品示范线在宜宾正式点火试运行。电池单体能量密度突破 500Wh/kg，在 200℃ 高温穿刺测试中无起火无冒烟，首批产品将提供给顶级豪华新能源车与低空经济 eVTOL 厂商试装。',
    coreQuote: '全固态电池不是对液态电池的微小改良，而是对整个化学电源体系与极片涂布工艺的颠覆性重构。',
    quoteAuthor: '宁德时代首席科学家',

    tongsuSummary: {
      simpleSay: '现在的电池里装的是液体（电解液），像易燃的油一样，受挤压或穿刺容易着火；全固态电池把液体换成了像陶瓷一样的固体，不仅彻底不会着火，而且同样体积能装下两倍的电量，电车充一次电能跑 1200 公里，电动飞行器也能真正飞起来了。',
      whyExplanation: '就像把装水的塑料袋换成结实的冰块：以前水袋破了水漏出来（热失控起火）；现在变成了坚硬的固体，怎么扎都不会漏水，而且密度极高。',
      whatItMeans: '续航焦虑和电池安全隐患将被彻底终结，低空飞行器（空中出租车）迎来了真正的能量基座。',
      jargonTerms: ['全固态电池', '500Wh/kg 能量密度', '固态电解质膜']
    },

    dehydratedItems: {
      coreEntity: '宁德时代 CATL / 硫化物固态电解质 / 低空飞行器厂商',
      keyAction: 'GWh 级全固态电池示范生产线点火试运行',
      relatedCount: 14,
      coreShifts: [
        '能量密度相比现役顶级三元锂提升近 80% (达 500Wh/kg)',
        '彻底取消隔膜与液态电解液，硫化物电解质工艺突破',
        '新能源高端车型续航冲上 1200km，充电倍率支持 4C 闪充'
      ],
      impactHighlights: [
        '传统隔膜与电解液厂商面临代际技术升级转型压力',
        '低空经济 eVTOL 飞行器商业化试飞航程翻倍'
      ]
    },

    sevenElements: {
      what: '宁德时代 GWh 级全固态电池示范产线点火运行。',
      who: '宁德时代、高端新能源车企、eVTOL 低空经济研发商。',
      when: '2026年10月初。',
      where: '四川宜宾固态电池制造基地。',
      why: '液态锂电池能量密度逼近物理极限（约 350Wh/kg），且无法根除热失控。',
      how: '采用高电导率硫化物固态电解质与干法极片成膜技术。',
      soWhat: '确立下一代电池全球技术领导权，开启新能源汽车与低空飞行器新纪元。',
      aiVerdict: {
        confidenceScore: 95,
        volatility: '中',
        actionLevel: '行动',
        verdictSummary: '全固态电池示范线点火，下一代能源基座竞争进入产业落地快车道。'
      }
    },

    logicTree: {
      rootCause: '硫化物固态电解质与干法极片工艺突破，示范线实现 GWh 级连续点火',
      nodes: [
        { id: 'cat-1', label: '能量密度突破 500Wh/kg 且通过极限安全测试', category: 'cause', description: '彻底消除液态电解质安全隐患', dataPoint: '500Wh/kg' },
        { id: 'cat-2', label: '低空经济 eVTOL 与顶级豪华车率先试装', category: 'mid_effect', description: '续航突破 1200km，解决空中飞行能量痛点', dataPoint: '续航 1200km' },
        { id: 'cat-3', label: '传统电池产业链上下游面临技术洗牌', category: 'market_impact', description: '固态电解质材料与干法设备需求爆发' }
      ],
      variableWeights: [
        { name: '硫化物电解质原材料降本速度', weight: 50, impactDirection: 'up', description: '决定大规模平价普及时间' },
        { name: '干法极片高倍率一致性', weight: 35, impactDirection: 'up', description: '影响电池量产良品率' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '全固态示范产线点火成功',
        content: '高工锂电确认样品电池通过 200℃ 高温穿刺等安全测试。',
        keyIndicators: ['500Wh/kg', '续航1200km']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '固态电解质上游设备热度大增',
        content: '干法成膜设备与锆/硫化物特种化学材料供应商获得重估。',
        keyIndicators: ['干法设备需求大增', '电池溢价能力升']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-cat-1',
        claim: '宁德时代全固态电池单体能量密度达到 500Wh/kg',
        sourceFact: '高工锂电调查组获得的示范产线检测报告与专利公示数据',
        reliability: '高 (权威锂电产业机构现场走访调查)',
        confidenceScore: 96
      }
    ],

    industrySignals: [
      { sector: '新能源与动力电池', strength: 97, trend: 'up', detail: '全固态电池跨过商业化示范线门槛' },
      { sector: '低空经济与eVTOL', strength: 93, trend: 'up', detail: '关键能量基座痛点得到根本性解决' }
    ],

    fastReadPoints: [
      { tag: '能量飞跃', text: '500Wh/kg 能量密度，彻底告别起火风险，电车续航冲上 1200 公里。' },
      { tag: '产业洗牌', text: '固态电解质与干法设备迎来红利，传统电池产业链技术迭代加速。' }
    ]
  },
  {
    id: 'news-deepseek-enterprise-deployment',
    title: 'DeepSeek Private 商业化落地：金融与医疗龙头实现全本地算力私有部署',
    subtitle: '千亿参数推理成本仅为同类云端的 15%，敏感业务数据实现零离域安全闭环',
    oneSentenceVerdict: '凭借高密度蒸馏模型与极佳的量化推理效率，DeepSeek 正在引爆政企垂直场景的私有化大模型基础设施替换潮。',
    category: 'AI 前沿',
    tags: ['DeepSeek', '私有化部署', '模型降本', '金融科技', '数据安全'],
    date: '2026年10月1日',
    publishedAt: '2026-10-01T16:30:00.000Z',
    sourceDate: '2026-10-01 16:30',
    timeAgo: '1天前',
    readTimeMinutes: 3,
    sourceName: '见微·AI商业化实验室',
    sourceUrl: 'https://genway.ai/research/deepseek-private',
    sourceCount: 7,
    credibilityStars: 5,
    impactScope: '全国',
    changeVelocity: '↑ 快',
    summary: '见微 AI 商业化跟踪显示，多家头部券商、国有银行与三甲医院已完成 DeepSeek 开源模型的本地化私有集群部署。通过蒸馏与 FP8/INT4 极低损失量化技术，企业只需数台私有服务器即可承载全量业务推理，极大地降低了数据合规门槛。',
    coreQuote: '当私有化部署的算力成本比公有云 API 还便宜 80% 时，绝大部分对数据合规敏感的企业都会选择本地化。',
    quoteAuthor: '见微·AI商业化首席分析师',

    tongsuSummary: {
      simpleSay: '以前大银行和医院不敢用 AI，是因为怕自己的客户隐私和医疗数据传到别人的公有云服务器上去；现在 DeepSeek 把模型做得既强大又精简，企业买几台机器放在自己的机房里就能跑，既绝对安全，花费还只有公有云的零头。',
      whyExplanation: '就像买保险柜：以前你得把金条寄存到大酒楼的集中保险库里（公有云）；现在有了小巧又防盗的家用保险柜（私有化部署），自己放在卧室里，金条（敏感数据）一步都不用出门。',
      whatItMeans: '金融风控、医疗病例诊断和法律合同审查等高隐私场景，将迎来大规模应用落地。',
      jargonTerms: ['私有化部署', '模型蒸馏 (Distillation)', '数据零离域']
    },

    dehydratedItems: {
      coreEntity: 'DeepSeek / 头部金融机构 / 三甲医院私有云',
      keyAction: '完成全本地量化模型部署，实现高合规与低成本平衡',
      relatedCount: 12,
      coreShifts: [
        '企业端算力 TCO (总体拥有成本) 压降 85%',
        '金融风控与医疗病例处理延迟压至 200ms 以内',
        '私有服务器与边缘推理一体机订单爆发增长'
      ],
      impactHighlights: [
        '传统按 Token 计费的中间商 SaaS 受到大幅挤压',
        '国产算力芯片与一体机厂商迎来直接订单红利'
      ]
    },

    sevenElements: {
      what: 'DeepSeek 开源蒸馏模型在金融与医疗行业完成大规模私有化落地。',
      who: 'DeepSeek、金融机构、三甲医院、私有云算力服务商。',
      when: '2026年10月初。',
      where: '全国多家头部企业数据中心内部机房。',
      why: '数据合规监管极其严格，且公有云 API 长期高频调用成本高昂。',
      how: '采用 FP8 量化与知识蒸馏模型，部署于国产私有服务器一体机上。',
      soWhat: '打破高门槛合规阻碍，推动大模型在实体产业核心生产系统的全面渗透。',
      aiVerdict: {
        confidenceScore: 96,
        volatility: '低',
        actionLevel: '行动',
        verdictSummary: '私有化部署成本大幅下降，垂直行业大模型应用迎来爆发拐点。'
      }
    },

    logicTree: {
      rootCause: '模型极度轻量化与高精度蒸馏技术成熟',
      nodes: [
        { id: 'ds-1', label: '私有服务器即可承载千亿参数高质量推理', category: 'cause', description: 'FP8 量化损失低于 0.5%', dataPoint: 'TCO-85%' },
        { id: 'ds-2', label: '解决金融与医疗数据出境与离域合规痛点', category: 'mid_effect', description: '敏感数据 100% 留在企业内部机房', dataPoint: '零数据离域' },
        { id: 'ds-3', label: '垂直一体机与私有部署服务商需求井喷', category: 'market_impact', description: '传统高价 SaaS 软件被迫向本地部署转型' }
      ],
      variableWeights: [
        { name: '私有化模型微调维护门槛', weight: 40, impactDirection: 'up', description: '影响企业运维二次投入' },
        { name: '国产算力芯片适配度', weight: 40, impactDirection: 'up', description: '决定本地推理吞吐上限' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '金融医疗行业加速本地部署',
        content: '数据中心私有集群部署量环比翻倍增长。',
        keyIndicators: ['算力成本-85%', '延迟<200ms']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '私有算力一体机厂商获重估',
        content: '硬件+模型一体化解决方案提供商迎来高额订单。',
        keyIndicators: ['一体机订单爆满', 'SaaS按量计费受挤压']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-ds-1',
        claim: 'DeepSeek 私有化部署使企业算力 TCO 整体压降 85%',
        sourceFact: '见微·AI商业化实验室对 12 家部署企业的IT采购合同真实抽样算力对比',
        reliability: '高 (多机构实测真实IT账单校验)',
        confidenceScore: 97
      }
    ],

    industrySignals: [
      { sector: 'AI与大模型', strength: 95, trend: 'up', detail: '开源与私有化成为政企客户绝对首选' },
      { sector: '金融科技与医疗信息化', strength: 92, trend: 'up', detail: '核心业务系统大模型渗透率快速拉升' }
    ],

    fastReadPoints: [
      { tag: '降本红利', text: '私有部署成本比公有云便宜 85%，把大模型真正变成了企业白菜价基础设施。' },
      { tag: '合规安全', text: '数据零出房，彻底破除金融与医疗数据合规使用的顾虑。' }
    ]
  },
  {
    id: 'news-quantum-topological-qubit',
    title: '谷歌量子实验室攻克拓扑纠错：逻辑量子比特寿命首次超越物理限制',
    subtitle: '将量子计算从「易受噪声干扰的实验玩具」推向「百倍容错的超级算力工厂」',
    oneSentenceVerdict: '逻辑量子比特寿命超越物理比特，标志着量子计算正是迈入「容错量子计算 (FTQC)」的新时代。',
    category: '科技前沿',
    tags: ['量子计算', '拓扑纠错', '逻辑量子比特', '谷歌量子', '前沿硬件'],
    date: '2026年9月30日',
    publishedAt: '2026-09-30T10:00:00.000Z',
    sourceDate: '2026-09-30 10:00',
    timeAgo: '2天前',
    readTimeMinutes: 4,
    sourceName: '自然杂志 Nature · 顶级前沿',
    sourceUrl: 'https://nature.com/articles/s41586-quantum-topological',
    sourceCount: 5,
    credibilityStars: 5,
    impactScope: '全球',
    changeVelocity: '↑ 快',
    summary: '《Nature》发表谷歌量子 AI 团队最新突破：通过在表面码 (Surface Code) 架构上引入拓扑量子纠错点，团队成功合成了 12 个长寿命逻辑量子比特。测试表明，随着纠错码距离增加，逻辑比特的错误率指数级下降，存活时间首次超过了构成它的物理比特。',
    coreQuote: '过去我们一直在和退相干的噪声做绝望的斗争，而今天我们证明了：通过正确的拓扑纠错，噪声是可以被物理规避的。',
    quoteAuthor: '谷歌量子 AI 首席科学家',

    tongsuSummary: {
      simpleSay: '以前的量子芯片极其脆弱，外面稍微有点温度或震动噪声，计算就崩溃了（像用豆腐雕花）；现在的科学家发明了一种“互相监督”的阵列，用几百个普通量子比特组成一个“超级逻辑比特”，即使其中几个坏掉了，其他比特也能立刻把它纠正过来，计算终于能稳稳当当地进行了。',
      whyExplanation: '就像团队合唱：如果只有一个人唱，他咳嗽一声整首歌就毁了（单个物理比特易错）；如果有 50 个人一起唱同一个声部，一个人咳嗽完全不影响整体美妙的歌声（容错逻辑比特）。',
      whatItMeans: '新药研发分子筛选、超级电池材料合成与密码破译等过去传统超级计算机算几万年的难题，未来有望在数小时内被量子算力攻克。',
      jargonTerms: ['逻辑量子比特', '表面码拓扑纠错', '容错量子计算 (FTQC)']
    },

    dehydratedItems: {
      coreEntity: '谷歌量子 AI / 逻辑量子比特 / Nature 杂志',
      keyAction: '攻克表面码拓扑纠错，逻辑比特寿命超过物理比特',
      relatedCount: 10,
      coreShifts: [
        '逻辑比特错误率从 $10^{-3}$ 降至 $10^{-6}$ 量级',
        '量子算法运行步骤数突破 10 万次极速门槛',
        '稀释制冷机与超导微波控制线路供应链升级'
      ],
      impactHighlights: [
        '制药巨头与材料科学实验室加速对接量子算力接口',
        '后量子加密 (PQC) 安全改造倒计时提前'
      ]
    },

    sevenElements: {
      what: '谷歌量子团队在《Nature》上宣布拓扑量子纠错取得划时代突破。',
      who: '谷歌量子 AI 团队、全球量子计算物理学家、Nature 审稿组。',
      when: '2026年9月底。',
      where: '加州量子硬件实验室。',
      why: '量子退相干（噪声干扰导致计算中断）是量子计算机商业化的最大物理障碍。',
      how: '采用高密度拓扑表面码，利用多物理比特冗余纠错形成稳定逻辑比特。',
      soWhat: '开启真正可用的容错量子计算时代，重塑制药、材料与密码安全防线。',
      aiVerdict: {
        confidenceScore: 98,
        volatility: '中',
        actionLevel: '关注',
        verdictSummary: '容错量子计算里程碑达成，前沿算力产业化前景显著明朗。'
      }
    },

    logicTree: {
      rootCause: '拓扑表面码纠错阵列使错误率随码距增加而指数级下降',
      nodes: [
        { id: 'qt-1', label: '逻辑比特寿命首次超越底层物理比特', category: 'cause', description: '证明纠错增益大于物理噪声积累', dataPoint: '错误率降至 $10^{-6}$' },
        { id: 'qt-2', label: '可运行超长步骤复杂量子化学模拟', category: 'mid_effect', description: '新药分子筛选与常温超导材料研发加速', dataPoint: '步骤超 10 万次' },
        { id: 'qt-3', label: '金融防伪与抗量子密码 (PQC) 改造提速', category: 'market_impact', description: '传统非对称加密算法防御期限面临缩短' }
      ],
      variableWeights: [
        { name: '超导线缆与低温低温极低温控制', weight: 45, impactDirection: 'up', description: '关乎可扩展物理比特数量' },
        { name: '量子软件算法编译效率', weight: 35, impactDirection: 'up', description: '影响实际应用问题转化率' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '《Nature》发表拓扑纠错突破',
        content: '12 个逻辑量子比特稳定运行，错误率降至新低。',
        keyIndicators: ['寿命超越物理比特', '10万步骤']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '前沿物理算力融资升温',
        content: '量子控线与极低温制冷上游产业链获得资本青睐。',
        keyIndicators: ['PQC加密转型加速', '制药巨头合作订单']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-qt-1',
        claim: '逻辑量子比特寿命与容错率首次在物理实体上被证明超越物理比特',
        sourceFact: '《Nature》正刊论文第 618 卷第 7982 期同同行评审数据图表',
        reliability: '高 (全球顶级学术期刊同行评审实测图表)',
        confidenceScore: 99
      }
    ],

    industrySignals: [
      { sector: '科技前沿与量子计算', strength: 96, trend: 'up', detail: '容错量子计算拐点确立，物理技术路线收敛' },
      { sector: '生物医药与材料科学', strength: 90, trend: 'up', detail: '量子化学计算接口商业化对接启动' }
    ],

    fastReadPoints: [
      { tag: '物理突破', text: '让量子计算机克服了“脆弱易错”的致命毛病，走向长寿命容错计算。' },
      { tag: '未来算力', text: '新药研发与新材料筛选迎来超级加速器，抗量子加密改造倒计时开启。' }
    ]
  },
  {
    id: 'news-edu-ai-curriculum',
    title: '教育部首批人工智能通识必修课落地高校：跨学科产教融合重塑本科培养方案',
    subtitle: '从单一计算机专业拓展为全校通识基座，高校联合科技领军企业共建实训模型',
    oneSentenceVerdict: 'AI 技能正从计算机系的“专业壁垒”转变为全学科大学生的“新型数字识字率”，产教融合决定未来人才供给质量。',
    category: '教育',
    tags: ['高等教育', '人工智能通识课', '产教融合', '人才培养', '高校改革'],
    date: '2026年9月25日',
    timeAgo: '3小时前',
    readTimeMinutes: 4,
    sourceName: '教育部高教司 / 见微教育观察',
    sourceDate: '2026-09-25 09:30',
    sourceUrl: 'http://www.moe.gov.cn/jyb_xwfb/s5147/202609/t20260925_100234.html',
    sourceCount: 6,
    credibilityStars: 5,
    impactScope: '全国',
    changeVelocity: '↑ 稳健提速',
    summary: '教育部联合清华、北大、浙大等高校发布首批高校人工智能通识核心课程建设指导方案，自2026年秋季学期起面向理、工、农、医、文、史、哲各学科本科生全覆盖开课。方案强调“模型素养、人机协作、算法伦理与真实场景解决”，并联合科技企业开源平台建立跨学科算力实训空间。',
    coreQuote: '未来的文科生不是要变成程序员，而是要掌握向智能体下达精准指令并对生成结论进行批判性校验的认知能力。',
    quoteAuthor: '高校人工智能通识教育专家组',

    tongsuSummary: {
      simpleSay: '以前学大学计算机基础是教你用 Word、Excel、PPT 打字排版；现在这门课变成了教所有专业的大学生怎么指挥 AI 工具、怎么写好提示词、怎么判断 AI 给出的答案对不对，哪怕文科生也要学。',
      whyExplanation: '就像几十年前全民普及学英语和学开车一样：AI 不再是程序员独享的高深技术，而变成了每个人进入职场都必须会用的新工具。',
      whatItMeans: '未来的毕业生如果只懂死记硬背专业知识，很容易被机器取代；懂得用 AI 放大自己专业思考深度的人，将具备更强就业竞争力。',
      jargonTerms: ['产教融合', '通识教育', '人机协作']
    },

    dehydratedItems: {
      coreEntity: '教育部高等教育司 / 高校教务处 / 领军科技企业',
      keyAction: '发布全学科本科生 AI 通识核心课程与实验实训标准',
      relatedCount: 42,
      coreShifts: [
        '课程纳入学分体系：2-3 个必修学分，覆盖全国 200 余所重点试点高校',
        '科技企业联合参与：提供免配置云端推理环境与行业真实脱敏案例库',
        '考核模式革新：减少期末理论死记硬背，重点考察人机协同完成综合项目的交付质量'
      ],
      impactHighlights: [
        '传统社科与艺术专业迎来“AI + 专业”二次升级契机',
        '高校算力资源与教学实训云平台采购需求呈爆发式增长'
      ]
    },

    sevenElements: {
      what: '全国高校推行人工智能通识必修课与跨学科创新人才培养方案。',
      who: '高校教务部门、一线教学名师、领军人工智能与云厂商、全体在校本科生。',
      when: '2026年9月秋季学期在首批 200 余所重点高校全面铺开。',
      where: '全国高校教室及产学研联合云端实训实验室。',
      why: '生成式人工智能与大模型彻底重构行业生产力，高校人才培养体系亟需对齐行业前沿技能需求。',
      how: '制定统一通识大纲、培训高校跨学科授课师资、引入企业真实项目实践案例与低门槛开发工具。',
      soWhat: '将中国年轻一代人才的通用数字素养整体拉升至 Agent 时代，为新质生产力储备复合型生力军。',
      aiVerdict: {
        confidenceScore: 92,
        volatility: '低',
        actionLevel: '行动',
        verdictSummary: '全学科AI通识必修化已成定局，高校应加速更新实验实训环境，引导学生掌握人机协同实操能力。'
      }
    },

    logicTree: {
      rootCause: '智能时代职业技能要求重构倒逼高等教育基础培养基座变革',
      nodes: [
        { id: 'edu-1', label: '大模型与人机协同成为职场标配技能', category: 'cause', description: '单一专业知识边界模糊，跨学科综合解决能力更被看重', dataPoint: '普及率 100%' },
        { id: 'edu-2', label: '打破传统文理分科与计算机学科孤岛', category: 'mid_effect', description: '文科重思辨质询，理工重工程实践，医学重伦理校验', dataPoint: '覆盖 200+ 高校' },
        { id: 'edu-3', label: '高校云端算力与 EdTech 实训服务需求爆发', category: 'market_impact', description: '高校数字化采购预算向智慧教学与 AI 实验集群倾斜' }
      ],
      variableWeights: [
        { name: '高校教师 AI 教学能力转化率', weight: 45, impactDirection: 'up', description: '决定课程质量是走向水课还是真正提升学生能力' },
        { name: '校企联合实训案例迭代速度', weight: 35, impactDirection: 'up', description: '防止教学内容与快速演进的产业前沿严重脱节' },
        { name: '跨专业考评与学分互认机制', weight: 20, impactDirection: 'neutral', description: '影响各院系推进教学改革的内生积极性' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '教育部发布全国高校 AI 通识课程方案',
        content: '2026 年秋季学期起面向全国高校本科生全面开设 AI 通识课。',
        keyIndicators: ['200+ 重点高校', '必修学分']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '智慧教育与高校教学算力采购升温',
        content: '各大科技巨头积极向高校捐赠算力点数并提供配套教学套件以抢占下一代开发者心智。',
        keyIndicators: ['生态绑定', '开发者培育']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-edu-1',
        claim: '教育部组织专家组编制并印发《高校人工智能通识核心课程教学指南》',
        sourceFact: '教育部高教司 2026 年第 18 号政策通报与官方新闻发布会通稿',
        reliability: '极高 (部委权威政策文件与官方发布会录音录像)',
        confidenceScore: 98
      }
    ],

    industrySignals: [
      { sector: '教育与人才培养', strength: 95, trend: 'up', detail: '高校课程体系全方位拥抱智能化，通识教学标准确立' },
      { sector: 'IT与软件工程', strength: 88, trend: 'up', detail: '国产开源大模型与教学工具链迎来数百万年轻高校用户' }
    ],

    fastReadPoints: [
      { tag: '人才新基建', text: '大学计算机通识课正式从教 Office 转向教用 AI 办实事。' },
      { tag: '跨学科赋能', text: '文理工商医全学科本科生都将拥有属于自己的数字化生产力杠杆。' }
    ]
  },
  {
    id: 'news-edu-vocational-reform',
    title: '现代职业教育深化改革：头部科技企业联合共建“工匠学院”与实战化实训基地',
    subtitle: '破解高端制造与智能产线“蓝领技工荒”，双师型教师与实操考核成核心硬指标',
    oneSentenceVerdict: '新质生产力不仅需要顶尖科学家，更离不开操作先进光刻机与自动化产线的现代化高技能工匠。',
    category: '教育',
    tags: ['职业教育', '工匠学院', '蓝领人才', '新质生产力', '产教融合'],
    date: '2026年9月24日',
    timeAgo: '5小时前',
    readTimeMinutes: 3,
    sourceName: '中国教育报 / 见微职业教育专栏',
    sourceDate: '2026-09-24 15:40',
    sourceUrl: 'http://www.jyb.cn/rmtzcg/xwy/wzxw/202609/t20260924_200456.html',
    sourceCount: 5,
    credibilityStars: 5,
    impactScope: '全国',
    changeVelocity: '↑ 稳健提速',
    summary: '国家职业教育产教融合专项政策进一步深化落地，工信部与教育部遴选首批 50 家智能制造与高科技领军企业，联合地方高职院校共建示范性“现代产业工匠学院”。课程采用真实工业软件、仿真半导体产线与模块化实训设备，毕业生定向输送至先进制程代工、新能源动力电池超级工厂与工业互联网核心岗位。',
    coreQuote: '把车间搬进学校、把讲台设在产线，职业教育才能真正接住高精尖产业的用工缺口。',
    quoteAuthor: '全国职业教育产教融合联盟',

    tongsuSummary: {
      simpleSay: '过去职业学校学生实训用的可能是落后很多年的老机器；现在领军科技公司把最新智能产线搬进职校，让学生在校期间直接用最新的真实设备上手练习，毕业直接进高精尖大厂上岗。',
      whyExplanation: '现代工厂里全是工业机器人和自动化电脑系统，传统只懂拧螺丝的工人不够用了，极其稀缺的是懂得看懂屏幕报错、能调机器参数的“高技能工程师型技工”。',
      whatItMeans: '职业教育的含金量大幅提升，年轻人掌握一门过硬的现代设备运维技能，薪资待遇和职业尊严不再逊色于普通白领。',
      jargonTerms: ['工匠学院', '双师型教师', '产教联合体']
    },

    dehydratedItems: {
      coreEntity: '教育部 / 工信部 / 示范性高职院校 / 智能制造企业',
      keyAction: '推行“校企双元协同育人”工匠学院建设计划',
      relatedCount: 28,
      coreShifts: [
        '首批设立 50 个高标准产业工匠学院，年培养高技能实操人才 15 万人',
        '双师型教师比例达 65%：企业工程师直接带薪驻校讲授真实故障排除经验',
        '实行“微证书与技能等级互认”，实训成果直接折算行业上岗认证'
      ],
      impactHighlights: [
        '先进制造与新能源超级工厂高端技工招募周期缩短 40%',
        '职业技术院校招录分数线与社会美誉度呈现明显回升态势'
      ]
    },

    sevenElements: {
      what: '部委联合推行现代职业教育工匠学院建设，攻坚高端产业蓝领技能缺口。',
      who: '教育部、工信部、国家级产教融合型企业、职业院校师生。',
      when: '2026年9月下旬正式发布专项立项与验收指标清单。',
      where: '长三角、珠三角、成渝等先进制造成熟产业聚集区。',
      why: '高端装备制造升级遭遇人才断层，传统脱节教学模式无法满足高精度工业要求。',
      how: '以股份制、混合所有制形式联合办学，共享工业仿真软件与特种实习机台。',
      soWhat: '夯实实体工业强国的底座技工队伍，为新一代高端制造提供稳定高素质劳动力保障。',
      aiVerdict: {
        confidenceScore: 90,
        volatility: '低',
        actionLevel: '行动',
        verdictSummary: '工匠学院实训直接连通高精制造用工刚需，校企协同育人有效化解技能落差与就业摩擦。'
      }
    },

    logicTree: {
      rootCause: '实体制造业向高端化智能化跃进遭遇熟练技能人才供给断层',
      nodes: [
        { id: 'voc-1', label: '精密设备与智能产线要求复合操作技能', category: 'cause', description: '简单重复性流水线岗位被自动化消灭，参数调试与故障排查成为刚需', dataPoint: '技术要求 ↑' },
        { id: 'voc-2', label: '校企共建真实实训产线消除技能落差', category: 'mid_effect', description: '毕业生无缝上岗，企业免除半年二次内训成本', dataPoint: '缩短 40% 周期' },
        { id: 'voc-3', label: '职业技能人才社会地位与薪酬水平结构性改善', category: 'market_impact', description: '高素质工匠薪资突破万元，职业教育形成正向循环', dataPoint: '薪酬上升' }
      ],
      variableWeights: [
        { name: '校企实训机台折旧与更新资金支持', weight: 40, impactDirection: 'up', description: '直接决定实训是否能够紧跟工业最新批次升级' },
        { name: '企业资深工程师授课考核激励机制', weight: 35, impactDirection: 'up', description: '保障双师型教学团队的实战传帮带深度' },
        { name: '区域产业集群配套协同度', weight: 25, impactDirection: 'neutral', description: '产业越聚集，工匠学院的人才吸纳与轮岗效益越突出' }
      ]
    },

    spectrumLayers: [
      {
        layer: 'data_signal',
        name: '现象层 (Surface)',
        color: '#E3120B',
        headline: '首批 50 家现代产业工匠学院获批建设',
        content: '聚焦半导体、工业母机与电池装备，校企联合开展订单式定向培养。',
        keyIndicators: ['50 家试点', '15 万高技能人才']
      },
      {
        layer: 'interests',
        name: '资本层 (Capital)',
        color: '#3B82F6',
        headline: '先进制造企业加大产教融合资本投入',
        content: '企业将实训基地建设纳入研发与供应链长期投资，享受增值税等税收抵扣红利。',
        keyIndicators: ['税收优惠', '技能供给保障']
      }
    ],

    evidenceChain: [
      {
        id: 'ev-voc-1',
        claim: '两部委联合发布首批现代产业工匠学院名单与支持办法',
        sourceFact: '中国政府网与中国教育报 2026年9月24日头版联合公示',
        reliability: '极高 (官方联合发文与部委公示文件)',
        confidenceScore: 97
      }
    ],

    industrySignals: [
      { sector: '教育与人才培养', strength: 92, trend: 'up', detail: '职业教育与实体产业无缝咬合，高技能人才蓄水池拓宽' },
      { sector: '前沿科技与硬件', strength: 89, trend: 'up', detail: '高端智造工厂一线技术人员流失率下降，设备综合效率 (OEE) 提升' }
    ],

    fastReadPoints: [
      { tag: '技能兴邦', text: '从黑板讲操作走向在真实机台练真招，培养智能时代的当代鲁班。' },
      { tag: '就业新路', text: '具备高端现代设备调试运维技能的职业人才在就业市场上供不应求。' }
    ]
  }
];

export const INITIAL_NEWS_ARTICLES: NewsArticle[] = CURATED_ARTICLES;

