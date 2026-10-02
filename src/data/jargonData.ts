import { TerminologyDefinition } from '../types';

export const JARGON_DICTIONARY: Record<string, TerminologyDefinition> = {
  '鹰派': {
    term: '鹰派',
    category: '宏观财经 / 央行政策',
    simpleExplain: '更倾向于控制通货膨胀、抑制经济过热、倾向于维持较高利率或收紧货币政策。',
    metaphor: '就像开车时发现车速过快，老司机习惯性轻踩刹车，宁可慢一点也要防止失控。',
    oppositeTerm: '鸽派',
    oppositeExplain: '更倾向于降息刺激经济增长、容忍轻微通胀、向市场注水。',
    memoryRule: '鹰派 → 控通胀抓刹车；鸽派 → 促增长猛踩油门。',
    exampleContext: '美联储声明措辞偏鹰，意味着高利率可能维持更久，借钱成本短期下不来。'
  },
  '鸽派': {
    term: '鸽派',
    category: '宏观财经 / 央行政策',
    simpleExplain: '更倾向于降低利率、增加货币供应，以刺激就业和实体经济繁荣。',
    metaphor: '就像天旱了给农田开闸放水，希望庄稼快点长，暂时不管会不会长杂草。',
    oppositeTerm: '鹰派',
    oppositeExplain: '更倾向于控通胀、收紧流动性。',
    memoryRule: '鸽子温和喜放水，利好股票与黄金。',
    exampleContext: '市场预期转向鸽派，全球风险资产往往应声上涨。'
  },
  'MoE': {
    term: 'MoE (Mixture of Experts) 混合专家模型',
    category: '人工智能前沿架构',
    simpleExplain: '把一个超大模型拆成数十个专精不同领域的“小专家”，每次计算只激活其中最懂该问题的两三个专家，大幅降低算力消耗。',
    metaphor: '就像医院门诊不让全院医生一起给一个病人看病，而是根据挂号分诊到心内科或骨科专家，效率提升十倍且省电。',
    memoryRule: '分工专精不全开，同等性能算力成本省七成。',
    exampleContext: 'DeepSeek 和 Mixtral 凭借 MoE 架构，在极低算力成本下匹敌千亿密集大模型。'
  },
  'MoE架构': {
    term: 'MoE (Mixture of Experts) 混合专家模型',
    category: '人工智能前沿架构',
    simpleExplain: '把一个超大模型拆成数十个专精不同领域的“小专家”，每次计算只激活其中最懂该问题的两三个专家，大幅降低算力消耗。',
    metaphor: '就像医院门诊不让全院医生一起给一个病人看病，而是根据挂号分诊到心内科或骨科专家，效率提升十倍且省电。',
    memoryRule: '分工专精不全开，同等性能算力成本省七成。',
    exampleContext: 'DeepSeek 和 Mixtral 凭借 MoE 架构，在极低算力成本下匹敌千亿密集大模型。'
  },
  '混合专家模型': {
    term: 'MoE (Mixture of Experts) 混合专家模型',
    category: '人工智能前沿架构',
    simpleExplain: '把一个超大模型拆成数十个专精不同领域的“小专家”，每次计算只激活其中最懂该问题的两三个专家，大幅降低算力消耗。',
    metaphor: '就像医院门诊不让全院医生一起给一个病人看病，而是根据挂号分诊到心内科或骨科专家，效率提升十倍且省电。',
    memoryRule: '分工专精不全开，同等性能算力成本省七成。',
    exampleContext: 'DeepSeek 和 Mixtral 凭借 MoE 架构，在极低算力成本下匹敌千亿密集大模型。'
  },
  'CPO光电共封装': {
    term: 'CPO (Co-Packaged Optics) 光电共封装',
    category: '前沿芯片与算力硬件',
    simpleExplain: '把传输光信号的光学引擎和计算芯片直接封装打包在一起，大幅缩短传输距离，省电且速度暴增。',
    metaphor: '以前送外卖要骑电动车穿过三条街（传统铜线发热大），现在直接把厨房搬到餐厅包厢隔壁（光电合体零延迟）。',
    memoryRule: '光电直接抱在一起，算力发热立减三成。',
    exampleContext: '单芯片功耗突破千瓦后，光电共封装成为算力集群不被烧坏的必由之路。'
  },
  'CPO': {
    term: 'CPO (Co-Packaged Optics) 光电共封装',
    category: '前沿芯片与算力硬件',
    simpleExplain: '把传输光信号的光学引擎和计算芯片直接封装打包在一起，大幅缩短传输距离，省电且速度暴增。',
    metaphor: '以前送外卖要骑电动车穿过三条街（传统铜线发热大），现在直接把厨房搬到餐厅包厢隔壁（光电合体零延迟）。',
    memoryRule: '光电直接抱在一起，算力发热立减三成。',
    exampleContext: '单芯片功耗突破千瓦后，光电共封装成为算力集群不被烧坏的必由之路。'
  },
  '光电共封装': {
    term: 'CPO (Co-Packaged Optics) 光电共封装',
    category: '前沿芯片与算力硬件',
    simpleExplain: '把传输光信号的光学引擎和计算芯片直接封装打包在一起，大幅缩短传输距离，省电且速度暴增。',
    metaphor: '以前送外卖要骑电动车穿过三条街（传统铜线发热大），现在直接把厨房搬到餐厅包厢隔壁（光电合体零延迟）。',
    memoryRule: '光电直接抱在一起，算力发热立减三成。',
    exampleContext: '单芯片功耗突破千瓦后，光电共封装成为算力集群不被烧坏的必由之路。'
  },
  '单位经济模型': {
    term: '单位经济模型 (Unit Economics / UE)',
    category: '商业模式与财务分析',
    simpleExplain: '测算企业每卖出一件商品、服务一位客户或完成一次 API 调用时，扣除直接可变成本后到底赚不赚钱。',
    metaphor: '就像卖煎饼果子，不算摊位租金，只算每个煎饼的面粉、鸡蛋和酱料成本与售价，算出每个煎饼纯挣几块钱。',
    memoryRule: '单客不算账，规模越大死得越快。',
    exampleContext: 'AI 创业公司从讲故事转向验证单位经济模型，关注每次模型推理的毛利是否为正。'
  },
  'UE': {
    term: '单位经济模型 (Unit Economics / UE)',
    category: '商业模式与财务分析',
    simpleExplain: '测算企业每卖出一件商品、服务一位客户或完成一次 API 调用时，扣除直接可变成本后到底赚不赚钱。',
    metaphor: '就像卖煎饼果子，不算摊位租金，只算每个煎饼的面粉、鸡蛋和酱料成本与售价，算出每个煎饼纯挣几块钱。',
    memoryRule: '单客不算账，规模越大死得越快。',
    exampleContext: 'AI 创业公司从讲故事转向验证单位经济模型，关注每次模型推理的毛利是否为正。'
  },
  '公差': {
    term: '晶圆公差 / 制造公差',
    category: '半导体精密制造',
    simpleExplain: '实际制造出来的零件尺寸与设计标准之间允许存在的极微小误差范围。',
    metaphor: '做西装时师傅允许袖口多或少 1 毫米；而在纳米芯片上，公差小到几颗原子的宽度。',
    memoryRule: '公差越小 = 工艺越极致 = 良品率越高。',
    exampleContext: '代工厂从“研发公差”转为“量产公差”，说明实验室技术终于可以大规模赚钱了。'
  },
  '逆向本土化': {
    term: '逆向本土化 / 逆向出海',
    category: '国际贸易与制造业',
    simpleExplain: '企业不再直接把国内造好的整机卖到国外，而是把核心零配件、生产线和技术标准带去海外当地合资组装。',
    metaphor: '以前直接卖做好的老干妈，现在直接把独家辣椒油配方带去国外开厂雇佣当地工人装瓶。',
    memoryRule: '不撞关税墙，化整为零扎根当地。',
    exampleContext: '中国车企通过散件出口和本地合资建厂，把关税壁垒转化为当地政策补贴。'
  },
  'CKD': {
    term: 'CKD (Completely Knocked Down) 全散装件',
    category: '汽车与供应链',
    simpleExplain: '将整车拆解成数百个独立的零部件散件出口，运到目的地国家后再由当地工人拼装成整车。',
    metaphor: '像宜家家具一样，不运大衣柜，而是运一箱箱板材螺丝到你家里组装。',
    memoryRule: '散件运过去，税率低一半，当地赚就业。',
    exampleContext: 'CKD散件出口激增，反映出中国供应链正在从整车出口升级为体系出海。'
  },
  'CKD散件': {
    term: 'CKD (Completely Knocked Down) 全散装件',
    category: '汽车与供应链',
    simpleExplain: '将整车拆解成数百个独立的零部件散件出口，运到目的地国家后再由当地工人拼装成整车。',
    metaphor: '像宜家家具一样，不运大衣柜，而是运一箱箱板材螺丝到你家里组装。',
    memoryRule: '散件运过去，税率低一半，当地赚就业。',
    exampleContext: 'CKD散件出口激增，反映出中国供应链正在从整车出口升级为体系出海。'
  },
  '期限错配': {
    term: '期限错配 (Maturity Mismatch)',
    category: '金融与风险管理',
    simpleExplain: '机构用短期借来的钱去投资长期的项目（例如借 3 个月的债去买 10 年期的楼）。',
    metaphor: '拿每个月的花呗和信用卡去还 30 年的房贷，一旦某个月借不到新钱就会瞬间断粮。',
    memoryRule: '短钱投长钱，最怕流动性突然断流。',
    exampleContext: '非银金融机构期限错配指标攀升，警示潜在的流动性挤兑风险。'
  },
  'AI Agent': {
    term: 'AI Agent (人工智能智能体)',
    category: '人工智能前沿',
    simpleExplain: '具有自主感知、规划决策、调用工具并自动完成端到端复杂任务的独立 AI 系统。',
    metaphor: '普通 AI 是个“百科全书”（你问它答），AI Agent 是你的“超级私人秘书”（告诉它目标，它自己订机票定酒店写报告）。',
    memoryRule: '从“能回答问题”进化到“能把事情办成”。',
    exampleContext: '新一代模型的核心突破不是回答更长，而是让 AI Agent 能自主操作数十步复杂业务系统。'
  },
  '智能体': {
    term: 'AI Agent (人工智能智能体)',
    category: '人工智能前沿',
    simpleExplain: '具有自主感知、规划决策、调用工具并自动完成端到端复杂任务的独立 AI 系统。',
    metaphor: '普通 AI 是个“百科全书”（你问它答），AI Agent 是你的“超级私人秘书”（告诉它目标，它自己订机票定酒店写报告）。',
    memoryRule: '从“能回答问题”进化到“能把事情办成”。',
    exampleContext: '新一代模型的核心突破不是回答更长，而是让 AI Agent 能自主操作数十步复杂业务系统。'
  },
  '工作流自动化': {
    term: '工作流自动化 (Workflow Automation)',
    category: '人工智能与企业软件',
    simpleExplain: '把过去需要人工一步步点击完成的重复业务流程（录入、审批、报表、派单等）交给软件或 AI Agent 自动串联完成。',
    metaphor: '以前流水线上每个工位都要一位工人弯腰捡件，现在传送带和机械手自动把半成品送到下一站，工人只管质检。',
    memoryRule: '把“人肉搬运”变成“自动化传送带”。',
    exampleContext: 'SaaS 商业模式从按账号收费转向按任务结果收费，背后的推手正是端到端的工作流自动化。'
  },
  'HBM': {
    term: 'HBM (High Bandwidth Memory) 高带宽内存',
    category: '前沿芯片与半导体',
    simpleExplain: '将多层 DRAM 芯片立体堆叠在一起，并通过微米级的微凸块与计算芯片直连，提供极宽的数据通道。',
    metaphor: '以前运货是单车道小路（普通内存带宽窄），HBM 相当于直接修建了 128 条立交高速公路直通工厂大门。',
    memoryRule: '立体堆叠带宽大，GPU 计算不卡壳。',
    exampleContext: 'AI 训练集群算力吃紧的核心瓶颈不再是计算核心，而是 HBM 高带宽内存的供货短缺。'
  },
  '端侧AI': {
    term: '端侧 AI (On-Device AI)',
    category: '人工智能终端与边缘计算',
    simpleExplain: '直接在手机、PC、汽车或可穿戴设备本地芯片上运行 AI 模型，无需将数据上传至云端服务器。',
    metaphor: '以前拍照要寄胶卷去照相馆冲洗（云端处理慢且隐私风险），现在手机直接拍立得一秒出片（本地芯片即时出结果）。',
    memoryRule: '数据不出设备，断网也能跑，响应零延迟。',
    exampleContext: '端侧 AI 算力芯片普及正在重塑手机和 PC 的硬件升级周期。'
  },
  'CoWoS': {
    term: 'CoWoS (Chip-on-Wafer-on-Substrate) 晶圆级先进封装',
    category: '半导体先进制程与封装',
    simpleExplain: '台积电独家掌握的 2.5D 先进封装技术，将算力芯片与高带宽显存 (HBM) 紧密并排固定在同一块硅中介层上，实现超高数据传输速率。',
    metaphor: '把原本隔着一条街的两栋写字楼（GPU 和内存），搬到同一个大底座上合体，走室内走廊瞬间抵达。',
    memoryRule: '算力翻番靠封测，台积电 CoWoS 产能是全球 AI 命门。',
    exampleContext: '英伟达 Blackwell 架构出货量的核心物理瓶颈正是 CoWoS 封测机台产能。'
  },
  '先进封装': {
    term: '先进封装 (Advanced Packaging)',
    category: '半导体先进制程与封装',
    simpleExplain: '在摩尔定律微缩放缓后，通过 2.5D/3D 立体堆叠等物理拼接工艺，在芯片外部实现等效性能提升的封装技术。',
    metaphor: '单层平房很难盖得更密集了，于是直接改建 30 层的摩天大楼，楼内电梯极速贯通。',
    memoryRule: '制程逼近物理极限，先进封装接棒算力增长。',
    exampleContext: '先进封装已经成为后摩尔时代半导体巨头拉开代际差距的核心战场。'
  },
  '全固态电池': {
    term: '全固态电池 (All-Solid-State Battery)',
    category: '新能源与动力电池',
    simpleExplain: '采用固态电解质完全替代易燃的传统液态电解液，能量密度提升 50% 以上，且彻底消除起火自燃风险。',
    metaphor: '把传统电池里流动的“水饺馅”凝固成“坚硬的巧克力块”，哪怕被针扎剪断也绝不漏液起火。',
    memoryRule: '固态无液不上火，能量翻倍千公里。',
    exampleContext: '全固态电池量产节点被视作下一代电动车与低空飞行器的战略分水岭。'
  },
  '固态电池': {
    term: '固态电池 (Solid-State Battery)',
    category: '新能源与动力电池',
    simpleExplain: '采用固态电解质替代部分或全部液体电解液的新一代电池技术。',
    metaphor: '把传统电池里流动的“水饺馅”凝固成“坚硬的巧克力块”，哪怕被针扎剪断也绝不漏液起火。',
    memoryRule: '固态无液不上火，能量翻倍千公里。',
    exampleContext: '全固态电池量产节点被视作下一代电动车与低空飞行器的战略分水岭。'
  },
  'RAG': {
    term: 'RAG (Retrieval-Augmented Generation) 检索增强生成',
    category: '人工智能大模型工程',
    simpleExplain: '让大模型在回答前，先去企业的私有知识库或外部最新数据库里检索相关参考文档，再组织生成答案，彻底解决 AI 瞎编胡说（幻觉）问题。',
    metaphor: '开卷考试：AI 不需要把所有百科知识死记在脑子里，遇到问题先翻阅手头最新的参考书再答题。',
    memoryRule: '先查权威资料再发言，消灭大模型胡说八道。',
    exampleContext: '企业级 AI 应用普遍采用 RAG 架构，以确保对合规文档和内部事实的精准引用。'
  },
  'RLHF': {
    term: 'RLHF (人类反馈强化学习)',
    category: '人工智能对齐技术',
    simpleExplain: '通过人类专家给模型的不同回答打分或排序，训练奖励模型，引导 AI 的价值观、安全边界和回答风格贴合人类真实偏好。',
    metaphor: '训小狗：当小狗做出正确动作时给它一块肉干（正面奖励），做错时轻声批评（负向惩罚），慢慢培养良好习惯。',
    memoryRule: '人类打分当裁判，调教 AI 更懂规矩。',
    exampleContext: 'ChatGPT 相比早期 GPT-3 的质的飞跃，关键在于引入了大规模 RLHF 对齐。'
  },
  'USMCA': {
    term: 'USMCA (美墨加自贸协定)',
    category: '国际地缘与关税贸易',
    simpleExplain: '美国、墨西哥、加拿大三国签署的新版自由贸易协定，规定汽车等产品若要享受零关税，必须在北美本土采购 75% 以上的核心零部件。',
    metaphor: '朋友圈免单协议：只要大家一起做的蛋糕里 75% 的面粉和鸡蛋都买自本小区的超市，就免收过路费。',
    memoryRule: '北美近岸免关税，原产地穿透查得严。',
    exampleContext: '中国车企与零部件厂商赴墨西哥建厂，核心动因在于满足 USMCA 原产地规则以打入北美市场。'
  },
  '反补贴': {
    term: '反补贴关税 (Countervailing Duties)',
    category: '国际地缘与关税贸易',
    simpleExplain: '一国认为进口商品接受了出口国政府的财政补贴并在当地低价倾销，从而征收的额外惩罚性关税。',
    metaphor: '比赛时发现对方选手吃了赞助商提供的兴奋剂，裁判要求其必须背负 30 斤沙袋才能上场比赛。',
    memoryRule: '查补贴加征惩罚税，逼迫企业海外本地建厂。',
    exampleContext: '欧盟对华电动汽车征收最高 35.3% 的反补贴关税，加速了中国电池厂商赴欧合资建厂。'
  },
  '英伟达': {
    term: '英伟达 (NVIDIA)',
    category: '全球算力与 AI 基础设施龙头',
    simpleExplain: '全球 GPU 算力芯片霸主，凭借 CUDA 软件生态与 NVLink 高速互连垄断了 90% 以上的大模型训练算力市场。',
    metaphor: 'AI 淘金热里卖铲子和铁镐的独家垄断商，淘金者无论赔赚都必须先买它的铲子。',
    memoryRule: 'GPU 算力硬通货，CUDA 生态护城河深不可测。',
    exampleContext: '英伟达每个季度的财报指引已经成为全球科技股走势的风向标。'
  },
  '台积电': {
    term: '台积电 (TSMC)',
    category: '半导体先进制程代工霸主',
    simpleExplain: '全球先进制程（3nm / 2nm）与 CoWoS 封装的核心代工厂，苹果、英伟达、AMD 的芯片均由其独家流片。',
    metaphor: '全球顶级芯片的“独家超级大厨房”，各家大厨出菜谱，只有这家厨房有设备能把米雕刻成芯片。',
    memoryRule: '先进制程独占鳌头，地缘博弈焦点中的焦点。',
    exampleContext: '全球 AI 芯片的供应上限直接取决于台积电的晶圆与封测配额分配。'
  }
};

