import React, { useState, useEffect } from 'react';
import { NewsArticle } from '../../types';
import { 
  ArrowRight, 
  Settings2, 
  Sparkles, 
  Copy, 
  Check, 
  Layers, 
  Server, 
  Cpu, 
  Activity, 
  Zap, 
  TrendingUp, 
  FileText, 
  HelpCircle,
  Code,
  Sliders,
  Scale,
  Gauge,
  AlertTriangle
} from 'lucide-react';

interface DiagramNode {
  id: string;
  title: string;
  detail: string;
  type: 'input' | 'process' | 'variable' | 'outcome';
  badge?: string;
  metric?: string;
}

interface DiagramTierEvaluations {
  input: string;    // 📥 触发前提评价
  process: string;  // ⚙️ 核心机制评价
  variable: string; // 🔄 临界博弈评价
  outcome: string;  // 📤 终局效应评价
}

interface DiagramData {
  title: string;
  summary: string;
  metaphor: string; // 通俗懂懂的比喻
  nodes: DiagramNode[];
  connections: { from: string; to: string; label?: string }[];
  mermaidCode: string;
  tierEvaluations: DiagramTierEvaluations;
}

interface ArchitectureDiagramTabProps {
  article: NewsArticle;
}

export const ArchitectureDiagramTab: React.FC<ArchitectureDiagramTabProps> = ({ article }) => {
  const [activeTab, setActiveTab] = useState<'canvas' | 'mermaid' | 'narrative'>('canvas');
  const [copied, setCopied] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);

  // 模拟沙盘滑块状态 (0-100)，每当文章 ID 切换时重置为 50
  const [sliderA, setSliderA] = useState<number>(50);
  const [sliderB, setSliderB] = useState<number>(50);

  useEffect(() => {
    setSliderA(50);
    setSliderB(50);
    setSelectedNode(null);
  }, [article.id]);

  // 1. 根据不同文章 ID，返回高定制、超专业的架构与因果传导全景图（含简短、专业的研判与总结）
  const getDiagramData = (id: string): DiagramData => {
    switch (id) {
      case 'news-anthropic-claude37':
        return {
          title: 'Claude 3.7 Sonnet 混合推理长思考传导架构',
          summary: '展示了在面对高难度工程时，大模型从传统的“脱口而出”模式升级到“具备思考预算的深度反思”架构的完整控制管线。',
          metaphor: '做数学压轴题：以前强迫学生 3 秒内报出答案（脱口而出，多有错误）；现在允许他在草稿纸上算 5 分钟，甚至可以通过 API 自由调整打草稿的时长，从而确保答案一次写对。',
          tierEvaluations: {
            input: '【见微研判·需求裂变】大模型需求正从基础的代码片段生成，跨越至端侧 Agent 的“自主逻辑重构”，引发对可控思考配额的刚性需求。',
            process: '【见微研判·核心机制】首次在 API 层面让“Reasoning Chain”公开可调，打通了“反思-模拟-自我修正”的代码生成黄金链路。',
            variable: '【见微研判·博弈焦点】延迟拉长与 Token 成本是短期内的紧箍咒，谁能将思考算力降本 90%，谁就将占领垂直企业级应用高地。',
            outcome: '【见微研判·终局效应】全球初级写码职位全面重组，催生“代码架构审核员”新角色，软件工程生产力获得数十倍重塑。'
          },
          nodes: [
            { id: 'in-1', title: '用户/Agent 请求', detail: '输入复杂的跨文件代码重构、定理证明或长步骤推理请求', type: 'input', badge: 'Trigger' },
            { id: 'in-2', title: '思考预算参数设置', detail: 'API 传入 thinking.type 与 max_thinking_tokens 预算限制（秒级至数分钟）', type: 'input', badge: 'Control Parameter' },
            { id: 'pr-1', title: '混合推理引擎 (Hybrid Engine)', detail: '模型在极速即时生成与深度思考链 (Thinking Chain) 之间弹性自适应分配算力', type: 'process', badge: 'Core Pipeline' },
            { id: 'pr-2', title: '自主错误校正回路', detail: '模型在生成 Token 前于思考链中提前模拟执行、审查潜在 Bug 并完成自我修正', type: 'process', badge: 'Refinement Loop' },
            { id: 'va-1', title: 'Token 延迟代价', detail: '长思考带来响应延迟增加，决定了高频即时交互场景的体验衰减率', type: 'variable', badge: 'Constraint', metric: '时间 vs 精度' },
            { id: 'va-2', title: '推理算力 TCO', detail: '高额 Token 消耗可能推高短期开发工具部署门槛，考验企业 ROI', type: 'variable', badge: 'Economic Pivot', metric: '成本弹性' },
            { id: 'ou-1', title: '工程正确率暴涨', detail: 'SWE-bench 软件工程自动修复率飙升至 70.3%，中阶代码生成完成度达 91%', type: 'outcome', badge: 'Resulting Capacity' },
            { id: 'ou-2', title: '研发范式代际迁跃', detail: '程序员从“手写冗余基础代码”升级为“Prompt 架构审核员”，Agent 组装周期缩短为小时级', type: 'outcome', badge: 'Industrial Impact' }
          ],
          connections: [
            { from: 'in-1', to: 'pr-1', label: '递交复杂任务' },
            { from: 'in-2', to: 'pr-1', label: '调控推理配额' },
            { from: 'pr-1', to: 'pr-2', label: '唤醒思考链' },
            { from: 'pr-2', to: 'va-1', label: '产生延迟开销' },
            { from: 'pr-2', to: 'va-2', label: '消耗推理算力' },
            { from: 'va-1', to: 'ou-1', label: '以时间换空间' },
            { from: 'va-2', to: 'ou-2', label: '倒逼工程范式变革' }
          ],
          mermaidCode: `graph TD
    subgraph 📥 输入端 (Input & Control)
        IN1[复杂代码重构请求] -->|投喂任务| PR1[混合推理引擎]
        IN2[动态思考预算 API] -->|配置 thinking_tokens| PR1
    end

    subgraph ⚙️ 核心处理管线 (Processing System)
        PR1 -->|算力弹性切换| PR2[自主错误校正回路]
        PR2 -->|深度思考反思| PR3[显式思考链 Thinking Chain]
        PR3 -->|迭代优化| PR2
    end

    subgraph 🔄 约束与博弈点 (Variables & Constraints)
        PR2 -->|延迟开销| VA1[响应时间拉长]
        PR2 -->|算力定价| VA2[推理算力 TCO 上升]
    end

    subgraph 📤 终局产业冲击 (Industrial Outcomes)
        VA1 -->|以时间换正确率| OU1[SWE-bench 正确率达 70.3%]
        VA2 -->|高门槛高ROI| OU2[程序员转型为架构审核员]
        OU1 -->|Agent大规模闭环| OU3[应用开发周期缩至小时级]
    end`
        };

      case 'news-tsmc-2nm-yield':
        return {
          title: '台积电 2nm GAAFET 物理制程工艺与产能锁定架构',
          summary: '揭示了在摩尔定律遭遇物理微缩极限时，台积电如何通过全面转向 GAAFET 纳米片结构突破漏电瓶颈，并稳固晶圆代工超级定价权。',
          metaphor: '水管防漏：以前的 3nm 漏电就像水龙头老化四处渗水（FinFET 结构触及极限）；2nm 采用 GAAFET，相当于给水管四周裹上了 360 度全包围的超密绝缘套，把漏水彻底堵住。',
          tierEvaluations: {
            input: '【见微研判·物理死壁】FinFET 物理极限带来的阈值漏电，是推动全制程架构向 GAAFET 代际迁移的唯一刚性诱因。',
            process: '【见微研判·技术管线】GAA 纳米片 4 面合围技术在高雄高雄 P1 的稳定，成功终结了高端工艺在 2nm 的难产悬念。',
            variable: '【见微研判·临界博弈】2nm 单片预估超 3 万美元的极高门槛将淘汰中游玩家，使得 ASML 顶级设备交付直接锚定少数巨头。',
            outcome: '【见微研判·终局效应】台积电绝对代工定价权被彻底锁死，端侧 AI 的漏电极壁解除，高端硬件利润集中度达到 92%。'
          },
          nodes: [
            { id: 'in-1', title: '物理极限倒逼', detail: '传统 FinFET 结构在 3nm 以下面临极其严重的量子隧穿漏电和阈值失效', type: 'input', badge: 'Physical Trigger' },
            { id: 'in-2', title: 'High-NA EUV 光刻', detail: 'ASML 先进光刻设备的调试与先进制程特种多重曝光良率匹配', type: 'input', badge: 'Equipment Precondition' },
            { id: 'pr-1', title: 'GAAFET 纳米片重构', detail: '采用 4 面栅极包裹的纳米片 (Nanosheet) 架构，彻底抑制漏电流', type: 'process', badge: 'Core technology' },
            { id: 'pr-2', title: '试产良率攻关 (75%)', detail: '高雄高雄 P1 厂区与竹科研发中心 GAA 工艺良品率突破商业临界点', type: 'process', badge: 'Manufacturing Validation' },
            { id: 'va-1', title: '晶圆生产成本', detail: '2nm 单片晶圆预估加工售价突破 3 万美元，考验下游终端利润空间', type: 'variable', badge: 'Price Bottleneck', metric: '单片售售价' },
            { id: 'va-2', title: '化学品纯度与设备交付', detail: '高纯度前驱体气体与 ASML 尖端设备到货节奏决定实际产能爬坡斜率', type: 'variable', badge: 'Supply Chain Factor', metric: '供给弹性' },
            { id: 'ou-1', title: '端侧 AI 续航爆发', detail: '同等性能下芯片功耗巨降 30%，彻底终结智能手机与端侧 AI 的电池焦虑', type: 'outcome', badge: 'Technical Outcome' },
            { id: 'ou-2', title: '代工定价权完全锁定', detail: '苹果、英伟达抢跑预付数十亿独家包厂定金，头部集中度达到前所未有的 92%', type: 'outcome', badge: 'Market Hegemony' }
          ],
          connections: [
            { from: 'in-1', to: 'pr-1', label: '倒逼结构重塑' },
            { from: 'in-2', to: 'pr-1', label: '保障曝光精度' },
            { from: 'pr-1', to: 'pr-2', label: '工艺良率验证' },
            { from: 'pr-2', to: 'va-1', label: '推高设备折旧' },
            { from: 'pr-2', to: 'va-2', label: '产生特种物料依赖' },
            { from: 'va-1', to: 'ou-1', label: '首发高溢价溢出' },
            { from: 'va-2', to: 'ou-2', label: '绝对垄断形成' }
          ],
          mermaidCode: `graph TD
    subgraph 📥 物理前提与设备 (Inputs)
        IN1[3nm FinFET 漏电物理极限] -->|迫使重构| PR1[GAAFET 纳米片晶体管]
        IN2[ASML 先进 EUV 调试] -->|光刻保障| PR1
    end

    subgraph ⚙️ 先进制造与良率 (Core Pipeline)
        PR1 -->|4面栅极超密包裹| PR2[试产良率提升]
        PR2 -->|攻克商业化临界点| PR3[高雄与宝山厂区商业量产]
    end

    subgraph 🔄 商业溢价与壁垒 (Variables)
        PR3 -->|单片造价突破3万美元| VA1[下游芯片定价压力]
        PR3 -->|设备及特种气体依赖| VA2[供应链产能爬坡斜率]
    end

    subgraph 📤 终局行业影响 (Outcomes)
        VA1 -->|大客户独家包厂| OU1[台积电绝对垄断权]
        VA2 -->|同性能功耗再降 30%| OU2[手机与算力卡续航变革]
    end`
        };

      case 'news-pboc-liquidity-tool':
        return {
          title: '中国央行买断式逆回购与流动性精准传导机制',
          summary: '展示了货币工具箱由传统的数量型普放，向精准、可控、定向注入中长期耐心资本支持国家硬科技实体的机制跃迁。',
          metaphor: '田间滴灌：过去全社会降息降准就像“大水漫灌”（庄稼和杂草都吸水，容易在金融体系产生资金空转）；现在用结构性支持工具，相当于架设了一条精准的管道，把流动性直接输送到有技术含量的“硬科技”企业根部。',
          tierEvaluations: {
            input: '【见微研判·结构平滑】平滑阶段性中长期利率波动，是平衡稳增长和耐心资本沉淀的核心宏观催化剂。',
            process: '【见微研判·工具创新】买断式逆回购直接提升了商业银行的押品流转灵活性，是一条更低损耗的输水管。',
            variable: '【见微研判·传导摩擦】商业银行对于专精特新实体的实际“风险兜底意愿”，是流动性能否精准穿透末端的博弈点。',
            outcome: '【见微研判·终局重置】硬科技实体融资成本显著压降 35BP，耐心长线资金直接为红利资产和科技底座筑底。'
          },
          nodes: [
            { id: 'in-1', title: '季节性中长期流动性收缩', detail: '公开市场到期洪峰，DR007 短期利率面临结构性上行波动压力', type: 'input', badge: 'Market trigger' },
            { id: 'in-2', title: '硬科技耐心资本匮乏', detail: '社会长线资金风险偏好下行，战略性新兴产业中长期融资遭遇阻尼', type: 'input', badge: 'Structural Pain Point' },
            { id: 'pr-1', title: '买断式逆回购工具启用', detail: '央行开展 3 个月至 1 年期定向买断式逆回购，直接注入中长期资金', type: 'process', badge: 'Policy Innovation' },
            { id: 'pr-2', title: '专项贷款贴息精准对接', detail: '商业银行在一级交易商业务中定向获取低成本长期流动性配置配额', type: 'process', badge: 'Financial Conduit' },
            { id: 'va-1', title: '银行信贷向实体传导率', detail: '银行出于不良率考量，对高风险早期高科技公司的信贷投放倾向度', type: 'variable', badge: 'Policy Friction', metric: '信贷传导率' },
            { id: 'va-2', title: '跨境利差与汇率均衡', detail: '美联储利率政策演变对离岸人民币汇率与央行公开市场总规模的外部约束', type: 'variable', badge: 'Macro Balance', metric: '利差波动率' },
            { id: 'ou-1', title: '科技制造业融资成本下降', detail: '硬科技与专精特新高科技企业贷款利率同比压降 35BP，缓解研发投入压力', type: 'outcome', badge: 'Direct Benefit' },
            { id: 'ou-2', title: '资本市场估值筑底', detail: '高股息红利股与优质科技创新龙头获得长期耐心资本沉淀，确立市场流动性底座', type: 'outcome', badge: 'Market Stabilization' }
          ],
          connections: [
            { from: 'in-1', to: 'pr-1', label: '释放对冲冲' },
            { from: 'in-2', to: 'pr-1', label: '激活定向流' },
            { from: 'pr-1', to: 'pr-2', label: '银行配额转换' },
            { from: 'pr-2', to: 'va-1', label: '考核信贷转化' },
            { from: 'pr-2', to: 'va-2', label: '经受宏观平衡' },
            { from: 'va-1', to: 'ou-1', label: '降本红利释放' },
            { from: 'va-2', to: 'ou-2', label: '长期流动性充实' }
          ],
          mermaidCode: `graph TD
    subgraph 📥 政策诉求与缺口 (Inputs)
        IN1[中长期流动性结构缺口] -->|逆周期对冲| PR1[买断式逆回购操作]
        IN2[科技实体耐心资本匮乏] -->|政策滴灌| PR1
    end

    subgraph ⚙️ 资金管道与操作 (Pipeline)
        PR1 -->|商业银行一级质押| PR2[定向贷款低成本配额]
        PR2 -->|直达通道| PR3[专精特新贴息贷款]
    end

    subgraph 🔄 约束条件与阻尼 (Variables)
        PR3 -->|银行风险偏好| VA1[实体信贷转化效率]
        PR3 -->|外部中美利差波动| VA2[离岸汇率与跨境资本平衡]
    end

    subgraph 📤 产业落地效益 (Outcomes)
        VA1 -->|利率同比降 35BP| OU1[硬科技融资成本骤降]
        VA2 -->|长期资本稳定沉淀| OU2[红利高股息与硬科技估值底]
    end`
        };

      case 'news-catl-solid-state-pilot':
        return {
          title: '宁德时代全固态电池 GWh 级量产管线与低空经济起飞架构',
          summary: '剖析了新能源核心能源架构从液态化学电解质彻底跨越至硫化物固态成膜工艺，如何一举打破安全与能量密度双重枷锁。',
          metaphor: '固态安全：以前的电池像个装满易燃油的“薄塑料水袋”，扎个孔或受热就容易漏油着火（液态安全焦虑）；全固态电池把水袋换成了结实的“实心陶瓷块”，怎么砸都不会起火漏电，同样体积电量多一倍。',
          tierEvaluations: {
            input: '【见微研判·极壁决裂】液态三元锂电在 350Wh/kg 的物理极壁以及高压刺穿易燃隐患，是触发全固态赛道不得不决战的根源。',
            process: '【见微研判·工艺跃迁】硫化物电解质连续干法极片成膜技术的成熟，攻克了此前难以批量化生产的一致性魔咒。',
            variable: '【见微研判·材料痛点】超高纯度活性物材料锆、高电导率硫化锂的生产售价下行斜率，直接控制了其何时能在十万级家用车普及。',
            outcome: '【见微研判·低空催化】能量密度达 500Wh/kg 且通过穿刺，彻底清除了 eVTOL 飞行器的配重与续航死穴，低空商用时代提速。'
          },
          nodes: [
            { id: 'in-1', title: '液态电池能量物理极限', detail: '传统三元锂电池能量密度在 350Wh/kg 遭遇物理极壁，无法支撑长航程 eVTOL', type: 'input', badge: 'Physical Constraint' },
            { id: 'in-2', title: '电池穿刺起火热失控', detail: '电动汽车与精密低空飞行器对电池受创不着火有着极严苛的零容忍安全标准', type: 'input', badge: 'Safety Mandate' },
            { id: 'pr-1', title: '硫化物固态电解质突破', detail: '宁德时代突破高电导率硫化物配方与干法极片超薄涂布，免去烘干工序', type: 'process', badge: 'Process Breakthrough' },
            { id: 'pr-2', title: 'GWh 级产线示范试产', detail: '在宜宾固态量产示范线正式连续点火，标志着单体电池进入批量试装阶段', type: 'process', badge: 'Production Milestone' },
            { id: 'va-1', title: '原材料锆与硫化物降本曲线', detail: '超高纯度硫化锂等上游活性剂的售价决定了电解质何时能够从豪华车型普及到大众市场', type: 'variable', badge: 'Raw Material Cost', metric: '原材料溢价' },
            { id: 'va-2', title: '干法极片高精度良率', detail: '在万级连续涂布中如何确保金属锂极片的极高厚度一致性，决定生产良率', type: 'variable', badge: 'Equipment precision', metric: '连续一致性' },
            { id: 'ou-1', title: '电动车 1200km 续航', detail: '电池单体能量密度达 500Wh/kg，无热失控起火风险，车身架构实现大幅轻量化', type: 'outcome', badge: 'Product Revolution' },
            { id: 'ou-2', title: 'eVTOL 商业化起飞', detail: '低空飞行器航程相比现役提升一倍，运营安全与载重比达到商用标准，低空经济爆发', type: 'outcome', badge: 'New Economic Sector' }
          ],
          connections: [
            { from: 'in-1', to: 'pr-1', label: '逼迫材料换代' },
            { from: 'in-2', to: 'pr-1', label: '强制安全重构' },
            { from: 'pr-1', to: 'pr-2', label: '实验至中试爬坡' },
            { from: 'pr-2', to: 'va-1', label: '开始规模寻价' },
            { from: 'pr-2', to: 'va-2', label: '考验工业精度' },
            { from: 'va-1', to: 'ou-1', label: '先期试配豪华车' },
            { from: 'va-2', to: 'ou-2', label: '赋能飞行汽车商用' }
          ],
          mermaidCode: `graph TD
    subgraph 📥 极限与刚性痛点 (Inputs)
        IN1[液态电池350Wh_kg能量极壁] -->|破局能量瓶颈| PR1[硫化物固态电解质工艺]
        IN2[易燃液态电解质热失控] -->|破局安全红线| PR1
    end

    subgraph ⚙️ 核心成膜与试产 (Core Pipeline)
        PR1 -->|干法极片免烘干涂布| PR2[宜宾 GWh 示范线点火]
        PR2 -->|连续稳定产片| PR3[首批电池豪华装车]
    end

    subgraph 🔄 产业化核心变量 (Variables)
        PR3 -->|纯硫化锂极度昂贵| VA1[原材料降本曲线]
        PR3 -->|干法卷对卷厚度一致| VA2[生产连续良品率]
    end

    subgraph 📤 终局革命影响 (Outcomes)
        VA1 -->|穿刺不着火 500Wh_kg| OU1[汽车 1200km 续航里程]
        VA2 -->|航程翻倍 零安全隐患| OU2[eVTOL 飞行器商业商商用]
    end`
        };

      case 'news-deepseek-enterprise-deployment':
        return {
          title: 'DeepSeek Private 企业级私有量化部署传导架构',
          summary: '展示了在面对极严苛的合规防线时，企业通过本地部署轻量化量化模型，打破公有云算力高昂开支的逻辑管线。',
          metaphor: '家用保险柜：以前你必须把机密金条寄存到遥远的大酒楼公有金库（公有云 API，面临出入境和合规摩擦）；现在有了超轻便、防撬的高强度家用保险柜（私有量化部署），直接搁在自己卧室里，绝对合规还省钱。',
          tierEvaluations: {
            input: '【见微研判·隐私摩擦】金融和医疗数据合规红线是促成大模型从公有云向本地化回流的核心诱因。',
            process: '【见微研判·工艺突破】高精度蒸馏与 FP8 极限损失量化技术的成熟，使得中端算力即可支撑高质量推理。',
            variable: '【见微研判·运维成本】本地私有集群的多芯片异构适配能力与微调维护阻力，是考验落地深浅的决定要素。',
            outcome: '【见微研判·终局效应】打破了传统按 Token 计费的云端 SaaS 护城河，极速激活了国产算力一体机的直接订单。'
          },
          nodes: [
            { id: 'in-1', title: '隐私与合规红线', detail: '金融与医疗核心数据严格禁止通过外网公有云传输和处理的监管规定', type: 'input', badge: 'Compliance Limit' },
            { id: 'in-2', title: '算力 TCO 摩擦', detail: '公有云 API 长期高频调用，产生的流量与接口费用呈指数级膨胀', type: 'input', badge: 'Cost Friction' },
            { id: 'pr-1', title: '高精度模型知识蒸馏', detail: '采用大模型知识提纯技术，将千亿级模型核心能力浓缩至高密度中型模型', type: 'process', badge: 'Model Compacting' },
            { id: 'pr-2', title: 'FP8/INT4 极限损失量化', detail: '将浮点运算极低损失量化为低位宽，从而大幅缩减对显存与带宽的依赖', type: 'process', badge: 'Inference Quantization' },
            { id: 'va-1', title: '局域网二次微调效率', detail: '私有化部署后，企业对自身特有数据库及语料库的敏捷微调与维护难度', type: 'variable', badge: 'Maintenance Barrier', metric: '运维敏捷度' },
            { id: 'va-2', title: '国产异构算力适配度', detail: '量化模型对非一线大牌芯片的本地算力吞吐与调度适配良率', type: 'variable', badge: 'Hardware Adaption', metric: '适配覆盖率' },
            { id: 'ou-1', title: '算力成本压降 85%', detail: '相比云端云端整体拥有成本大幅削减，使得白菜价大模型部署落地成为现实', type: 'outcome', badge: 'Economic Result' },
            { id: 'ou-2', title: '数据零出房安全闭环', detail: '所有高价值、敏感业务和隐私档案实现 100% 物理留置，杜绝数据泄密事件', type: 'outcome', badge: 'Security Outcome' }
          ],
          connections: [
            { from: 'in-1', to: 'pr-1', label: '逼迫架构收缩' },
            { from: 'in-2', to: 'pr-2', label: '倒逼算力降本' },
            { from: 'pr-1', to: 'va-1', label: '考验语料更新' },
            { from: 'pr-2', to: 'va-2', label: '考验芯片吞吐' },
            { from: 'va-1', to: 'ou-1', label: '锁定 TCO 红利' },
            { from: 'va-2', to: 'ou-2', label: '巩固绝对安全防线' }
          ],
          mermaidCode: `graph TD
    subgraph 📥 隐私与算力痛点 (Inputs)
        IN1[隐私合规严禁数据外泄] -->|倒逼本地化| PR1[本地知识蒸馏技术]
        IN2[云端接口调用高昂开支] -->|倒逼轻量化| PR2[FP8_INT4量化计算]
    end

    subgraph ⚙️ 私有优化与重塑 (Pipeline)
        PR1 -->|能力蒸馏浓缩| PR3[私有集群部署运行]
        PR2 -->|显存占用压降80%| PR3
    end

    subgraph 🔄 本地维护与硬件 (Variables)
        PR3 -->|定制数据微调阻尼| VA1[内部二次维护难度]
        PR3 -->|国产硬件异构吞吐| VA2[国产芯片异构适配]
    end

    subgraph 📤 终局红利闭环 (Outcomes)
        VA1 -->|TCO成本暴跌85%| OU1[大模型实体化普及]
        VA2 -->|100%物理不出域| OU2[敏感金融医疗零泄密]
    end`
        };

      case 'news-quantum-topological-qubit':
        return {
          title: '谷歌拓扑量子纠错与逻辑比特寿命增益架构',
          summary: '揭示了容错量子计算 (FTQC) 的核心物理突破：如何通过表面码拓扑监督，解决量子退相干噪声梦魇。',
          metaphor: '合唱容错：以前是单人独唱，他咳嗽一声整首歌就崩了（单个物理比特极易退相干算错）；现在引入 50 人的大合唱团组成一个“逻辑比特阵列”，即使其中有几个人忘词咳嗽，完全不影响美妙歌声稳定进行。',
          tierEvaluations: {
            input: '【见微研判·退相干瓶颈】量子计算此前的致命死穴是外界极微弱的热、震动噪声干扰（退相干计算坍缩）。',
            process: '【见微研判·核心跨越】在表面码 (Surface Code) 架构上引入拓扑纠错，首次在物理实体上打通了逻辑比特寿命反超物理限制的阻碍。',
            variable: '【见微研判·扩展瓶颈】大规模稀释制冷机制冷极限与超导极细同轴线缆在极低温下的高一致性焊接工艺，是目前最大的硬件博弈点。',
            outcome: '【见微研判·破译拐点】容错量子计算 (FTQC) 的研究提速，将使超级材料、生物靶向制药与传统非对称加密算法防御面临洗牌。'
          },
          nodes: [
            { id: 'in-1', title: '外界电磁与热退相干', detail: '外界哪怕千分之一度的温度起伏、电磁微波也会瞬间导致超导量子比特态退相干', type: 'input', badge: 'Environmental Noise' },
            { id: 'in-2', title: '物理比特精度极限', detail: '单个非纠错超导物理比特极低的计算保真度，无法实现超长步骤复杂模拟', type: 'input', badge: 'Precision Bottleneck' },
            { id: 'pr-1', title: '高密度表面码拓扑表面纠错', detail: '基于表面码阵列，利用拓扑保护让多物理比特相互联合制约进行动态纠错', type: 'process', badge: 'Topological Protection' },
            { id: 'pr-2', title: '长寿命逻辑比特合成', detail: '合成 12 个抗噪声干扰的容错逻辑比特，其运行步骤数突破 10 万次极速门槛', type: 'process', badge: 'Coherent Qubit' },
            { id: 'va-1', title: '百万物理比特工程堆积', detail: '从当前数百物理比特扩展至万级、百万级物理比特时面临的稀释制冷散热极限', type: 'variable', badge: 'Cryogenic Barrier', metric: '极低温制冷率' },
            { id: 'va-2', title: '量子编译器转换效率', detail: '将现实中的新药分子结构、密码算法高效编译为量子纠错门线路的编译效率', type: 'variable', badge: 'Algorithmic efficiency', metric: '编译转换率' },
            { id: 'ou-1', title: '逻辑比特寿命反超物理比特', detail: '打破物理限制：逻辑比特存活时间反超其物理实体，标志着容错量子计算拐点确立', type: 'outcome', badge: 'FTQC Milestone' },
            { id: 'ou-2', title: '抗量子加密 (PQC) 提速', detail: '传统 RSA 等非对称加密防线的理论安全存活寿命缩短，倒逼全球通信系统向 PQC 演进', type: 'outcome', badge: 'Security Restructuring' }
          ],
          connections: [
            { from: 'in-1', to: 'pr-1', label: '对冲震荡环境' },
            { from: 'in-2', to: 'pr-2', label: '突破保真上限' },
            { from: 'pr-1', to: 'pr-2', label: '形成相互制约' },
            { from: 'pr-2', to: 'va-1', label: '对齐极冷硬件' },
            { from: 'pr-2', to: 'va-2', label: '要求门线路优化' },
            { from: 'va-1', to: 'ou-1', label: '踏上容错大道' },
            { from: 'va-2', to: 'ou-2', label: '威胁传统加密' }
          ],
          mermaidCode: `graph TD
    subgraph 📥 噪声退相干与精度痛点 (Inputs)
        IN1[温度电磁微波退相干环境] -->|驱动隔离与拓扑纠错| PR1[高密度表面码监督]
        IN2[单比特保真度极低死结] -->|驱动冗余联合合成| PR2[逻辑比特容错纠错]
    end

    subgraph ⚙️ 表面码与纠错 (Pipeline)
        PR1 -->|表面码多重校验| PR3[合成稳定逻辑比特]
        PR2 -->|保真度大幅提升| PR3
    end

    subgraph 🔄 扩展壁垒与算法 (Variables)
        PR3 -->|大规模封装制冷极值| VA1[低温制冷系统极值]
        PR3 -->|复杂化学门线路编译| VA2[量子门线路编译率]
    end

    subgraph 📤 时代重构 (Outcomes)
        VA1 -->|寿命首次超越物理上限| OU1[容错量子计算拐点FTQC]
        VA2 -->|非对称密码防线缩短| OU2[全球抗量子加密改造]
    end`
        };

      default:
        // 通用降级：基于文章逻辑结构与七要素自适应解析
        return {
          title: `《${article.title}》事件因果与逻辑架构图`,
          summary: '自适应架构图展示了该事件的背景起因、核心驱动要素、发展博弈变量以及对行业和市场的传导影响。',
          metaphor: '链条效应：就像多米诺骨牌，第一块骨牌（起因与前提）倒下，触发了中间的传导机构（核心技术），中途受到地面的阻力阻尼（临界变量），最终推倒了远处的庞然大物（终局影响）。',
          tierEvaluations: {
            input: '【见微研判·背景前提】触发事件演变的首发背景事实与监管政策边界。',
            process: '【见微研判·传导机制】事件背后的核心技术、业务流动及协同创新管线。',
            variable: '【见微研判·临界博弈】落地推广中面临的政策壁垒、合规风险与财务成本摩擦。',
            outcome: '【见微研判·终局产业】直接产生的微观效率优化、长期沉淀以及宏观格局洗牌。'
          },
          nodes: [
            { id: 'in-1', title: '核心触发因素', detail: article.sevenElements?.why || '事件发生的底层成因与触发源头', type: 'input', badge: 'Trigger' },
            { id: 'in-2', title: '事实边界前提', detail: article.sevenElements?.what || '事件的核心内容与发生背景事实', type: 'input', badge: 'Precondition' },
            { id: 'pr-1', title: '关键推进机制', detail: article.oneSentenceVerdict || '事件发展或技术落地的主体过程与机制', type: 'process', badge: 'Mechanism' },
            { id: 'pr-2', title: '行业生态反应', detail: article.summary || '产业上下游对事件采取的跟进与部署行动', type: 'process', badge: 'Action Path' },
            { id: 'va-1', title: '政策与成本阻力', detail: '事件推进中面临的落地成本、合规监管或标准兼容瓶颈', type: 'variable', badge: 'Variable I', metric: '阻力系数' },
            { id: 'va-2', title: '落地一致性良率', detail: '关键工艺良品率或服务转化效率的波动不确定性', type: 'variable', badge: 'Variable II', metric: '稳定性' },
            { id: 'ou-1', title: '微观效益转化', detail: article.sevenElements?.soWhat || '直接带来的微观效率拉升、成本下降或产品升级', type: 'outcome', badge: 'Direct Impact' },
            { id: 'ou-2', title: '宏观格局重塑', detail: '触发产业链地位重构、大国竞争演变或行业洗牌重组', type: 'outcome', badge: 'Structural Shift' }
          ],
          connections: [
            { from: 'in-1', to: 'pr-1', label: '驱动核心爆发' },
            { from: 'in-2', to: 'pr-1', label: '界定演变范围' },
            { from: 'pr-1', to: 'pr-2', label: '引发机制传导' },
            { from: 'pr-2', to: 'va-1', label: '遭遇外部博弈' },
            { from: 'pr-2', to: 'va-2', label: '经受工业考验' },
            { from: 'va-1', to: 'ou-1', label: '重构直接红利' },
            { from: 'va-2', to: 'ou-2', label: '沉淀宏观格局' }
          ],
          mermaidCode: `graph TD
    subgraph 📥 事实背景与起因 (Inputs)
        IN1[${(article.sevenElements?.why || '事件起因').slice(0, 15)}...] -->|源头驱动| PR1[核心机制与推进路径]
        IN2[${(article.sevenElements?.what || '事实背景').slice(0, 15)}...] -->|定义边界| PR1
    end

    subgraph ⚙️ 核心处理与传导 (Process)
        PR1 -->|行动部署| PR2[行业上下游反应]
        PR2 -->|深入细化| PR3[生态闭环与转化]
    end

    subgraph 🔄 博弈变量与制约 (Variables)
        PR3 -->|外部阻力| VA1[合规成本与政策瓶颈]
        PR3 -->|内部指标| VA2[落地效率与稳定性]
    end

    subgraph 📤 终局产业冲击 (Outcomes)
        VA1 -->|微观释放| OU1[效率与直接收益拉升]
        VA2 -->|宏观重置| OU2[产业链洗牌与格局重构]
    end`
        };
    }
  };

  const data = getDiagramData(article.id);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 分类节点颜色配置
  const getNodeColorStyles = (type: 'input' | 'process' | 'variable' | 'outcome', isActive: boolean) => {
    const activeRing = isActive ? 'ring-4 ring-stone-900 border-stone-900 scale-102 shadow-md' : 'shadow-xs border-stone-200';
    switch (type) {
      case 'input':
        return `bg-sky-50/75 border-sky-200 hover:border-sky-400 text-sky-950 ${activeRing}`;
      case 'process':
        return `bg-indigo-50/75 border-indigo-200 hover:border-indigo-400 text-indigo-950 ${activeRing}`;
      case 'variable':
        return `bg-amber-50/75 border-amber-200 hover:border-amber-400 text-amber-950 ${activeRing}`;
      case 'outcome':
        return `bg-emerald-50/75 border-emerald-200 hover:border-emerald-400 text-emerald-950 ${activeRing}`;
    }
  };

  const getNodeTypeLabel = (type: 'input' | 'process' | 'variable' | 'outcome') => {
    switch (type) {
      case 'input': return { text: '触发输入', color: 'bg-sky-100 text-sky-800' };
      case 'process': return { text: '核心机制', color: 'bg-indigo-100 text-indigo-800' };
      case 'variable': return { text: '博弈变量', color: 'bg-amber-100 text-amber-800' };
      case 'outcome': return { text: '终局效应', color: 'bg-emerald-100 text-emerald-800' };
    }
  };

  const inputs = data.nodes.filter(n => n.type === 'input');
  const processes = data.nodes.filter(n => n.type === 'process');
  const variables = data.nodes.filter(n => n.type === 'variable');
  const outcomes = data.nodes.filter(n => n.type === 'outcome');

  // 根据滑块状态，动态算沙盘推演指标
  const getSimulationResult = () => {
    // 基础损耗 = 50 - (100 - A) * 0.2 + (B) * 0.15
    const attenuation = Math.max(5, Math.min(95, Math.round(sliderA * 0.6 + sliderB * 0.4)));
    const speedInMonths = Math.max(1, Math.min(36, Math.round((sliderA * 0.2 + (100 - sliderB) * 0.3))));
    const successRate = Math.max(5, Math.min(99, Math.round((100 - sliderA) * 0.55 + sliderB * 0.45)));

    // 自适应特定文章的滑块标签描述
    let labelA = "外部阻力系数";
    let labelB = "技术落实良品率";
    let worstBrief = "变量摩擦高企导致传导路径中途断裂，阻尼点发生剧烈价格溢价风险。";
    let bestBrief = "极佳的良率配合可控的外部阻尼，打通了快速商用闭环，预计爆发期显著提前。";

    if (article.id === 'news-anthropic-claude37') {
      labelA = "推理算力 Token 定价阻力";
      labelB = "开发者延迟(Latency)忍受度";
      worstBrief = "若算力价格偏高且用户无法忍受思考延迟，Claude 3.7 在中低端应用的渗透将严重受阻。";
      bestBrief = "算力成本若被快速压降且延迟在可接受范畴，AI 研发范式将提前 18 个月在全球爆发普及。";
    } else if (article.id === 'news-tsmc-2nm-yield') {
      labelA = "ASML High-NA 设备到货延迟";
      labelB = "化学特种前驱体纯度良率";
      worstBrief = "若尖端曝光设备交付延期且化学材料纯度不稳，台积电先进制程定价壁垒将高企，中游大客户被挤压。";
      bestBrief = "设备如期交付且材料突破，2nm 先进制程将以前所未有的速度锁仓包厂订单，端侧 AI 迎来爆发。";
    } else if (article.id === 'news-pboc-liquidity-tool') {
      labelA = "商业银行风险厌恶偏好";
      labelB = "离岸人民币外部汇率压力";
      worstBrief = "若银行信贷审核极度保守且外部汇率承压，中长期耐心资本向专精特新实体的传导阻尼将被动放大。";
      bestBrief = "银行风险溢价平稳且汇率对冲合理，定向低成本专项贴息将以 92% 的成功率精准直达科技核心。";
    } else if (article.id === 'news-catl-solid-state-pilot') {
      labelA = "超高纯硫化锂原材料成本";
      labelB = "干法极片连续卷对卷厚度一致性";
      worstBrief = "硫化锂极度昂贵且干法涂布精度不稳，将迫使固态电池普及期推迟至豪华乘用车之外，eVTOL 成本难降。";
      bestBrief = "原材料规模量产降本且一致性突破，全固态电池普及拐点将提前 12 个月点火，eVTOL 安全大增。";
    }

    return { attenuation, speedInMonths, successRate, labelA, labelB, worstBrief, bestBrief };
  };

  const simResult = getSimulationResult();

  return (
    <div className="bg-[#FAF8F5] border-2 border-stone-900 rounded-3xl p-6 sm:p-8 font-serif shadow-sm space-y-6">
      
      {/* 顶部标题栏与模式切换 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#E3120B]">
            <Layers className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase">AI 视觉架构与因果传导模型</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-950 leading-tight">
            {data.title}
          </h2>
        </div>

        <div className="flex p-1 bg-stone-100 rounded-xl self-start md:self-center border border-stone-200">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'canvas' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>专业全景图</span>
          </button>
          <button
            onClick={() => setActiveTab('narrative')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'narrative' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>通俗比喻卡</span>
          </button>
          <button
            onClick={() => setActiveTab('mermaid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'mermaid' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Mermaid 代码</span>
          </button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-stone-600 font-sans leading-relaxed">
        {data.summary} 点击图形中的任意模块可查看其在传导路径中的具体功能和业务红利边界。
      </p>

      {/* Mode 1: 可交互视觉全景拓扑图 (Interactive Vector Canvas) */}
      {activeTab === 'canvas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans relative">
            
            {/* Tier 1: Inputs (📥 触发源与核心输入) */}
            <div className="flex flex-col justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl relative">
              <div className="space-y-4">
                <div className="flex items-center space-x-1.5 text-sky-800 font-serif font-bold text-xs pb-2 border-b border-sky-100">
                  <span className="w-4 h-4 rounded bg-sky-100 flex items-center justify-center text-[10px]">1</span>
                  <span>📥 边界前提与触发源</span>
                </div>
                <div className="space-y-3">
                  {inputs.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-xl transition-all cursor-pointer space-y-1.5 ${getNodeColorStyles('input', selectedNode?.id === node.id)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-sky-700 bg-sky-100/50 px-1.5 py-0.2 rounded">
                          {node.badge}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 leading-tight">
                        {node.title}
                      </h4>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                        {node.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Short Column Evaluation / Summary */}
              <div className="mt-4 p-3 bg-sky-100/40 rounded-xl border border-sky-200/60 text-[11px] text-sky-950 font-sans leading-relaxed">
                <div className="font-serif font-bold text-[10px] text-sky-800 tracking-wider uppercase mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>触发阶段·见微研判</span>
                </div>
                {data.tierEvaluations.input}
              </div>
            </div>

            {/* Tier 2: Process (⚙️ 核心技术与传导管线) */}
            <div className="flex flex-col justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl relative">
              <div className="space-y-4">
                <div className="flex items-center space-x-1.5 text-indigo-800 font-serif font-bold text-xs pb-2 border-b border-indigo-100">
                  <span className="w-4 h-4 rounded bg-indigo-100 flex items-center justify-center text-[10px]">2</span>
                  <span>⚙️ 核心处理与转化</span>
                </div>
                <div className="space-y-3">
                  {processes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-xl transition-all cursor-pointer space-y-1.5 ${getNodeColorStyles('process', selectedNode?.id === node.id)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-100/50 px-1.5 py-0.2 rounded">
                          {node.badge}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 leading-tight">
                        {node.title}
                      </h4>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                        {node.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Short Column Evaluation / Summary */}
              <div className="mt-4 p-3 bg-indigo-100/40 rounded-xl border border-indigo-200/60 text-[11px] text-indigo-950 font-sans leading-relaxed">
                <div className="font-serif font-bold text-[10px] text-indigo-800 tracking-wider uppercase mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>管线传导·核心研判</span>
                </div>
                {data.tierEvaluations.process}
              </div>
            </div>

            {/* Tier 3: Variables (🔄 博弈变量与瓶颈) */}
            <div className="flex flex-col justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl relative">
              <div className="space-y-4">
                <div className="flex items-center space-x-1.5 text-amber-800 font-serif font-bold text-xs pb-2 border-b border-amber-100">
                  <span className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center text-[10px]">3</span>
                  <span>🔄 约束条件与博弈变量</span>
                </div>
                <div className="space-y-3">
                  {variables.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-xl transition-all cursor-pointer space-y-1.5 ${getNodeColorStyles('variable', selectedNode?.id === node.id)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-100/50 px-1.5 py-0.2 rounded">
                          {node.badge}
                        </span>
                        {node.metric && (
                          <span className="text-[9px] font-mono text-amber-800 bg-amber-100 px-1 rounded">
                            {node.metric}
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 leading-tight">
                        {node.title}
                      </h4>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                        {node.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Short Column Evaluation / Summary */}
              <div className="mt-4 p-3 bg-amber-100/40 rounded-xl border border-amber-200/60 text-[11px] text-amber-950 font-sans leading-relaxed">
                <div className="font-serif font-bold text-[10px] text-amber-800 tracking-wider uppercase mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>临界博弈·风险研判</span>
                </div>
                {data.tierEvaluations.variable}
              </div>
            </div>

            {/* Tier 4: Outcomes (📤 终局效应与影响) */}
            <div className="flex flex-col justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl relative">
              <div className="space-y-4">
                <div className="flex items-center space-x-1.5 text-emerald-800 font-serif font-bold text-xs pb-2 border-b border-emerald-100">
                  <span className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center text-[10px]">4</span>
                  <span>📤 终局产业冲击</span>
                </div>
                <div className="space-y-3">
                  {outcomes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-xl transition-all cursor-pointer space-y-1.5 ${getNodeColorStyles('outcome', selectedNode?.id === node.id)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.2 rounded">
                          {node.badge}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 leading-tight">
                        {node.title}
                      </h4>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                        {node.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Short Column Evaluation / Summary */}
              <div className="mt-4 p-3 bg-emerald-100/40 rounded-xl border border-emerald-200/60 text-[11px] text-emerald-950 font-sans leading-relaxed">
                <div className="font-serif font-bold text-[10px] text-emerald-800 tracking-wider uppercase mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>终局演变·趋势总结</span>
                </div>
                {data.tierEvaluations.outcome}
              </div>
            </div>

          </div>

          {/* Node Inspector Detailed Drawer */}
          {selectedNode ? (
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 font-sans space-y-3 border border-stone-800 shadow-md relative animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getNodeTypeLabel(selectedNode.type).color}`}>
                    {getNodeTypeLabel(selectedNode.type).text}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    ID: {selectedNode.id}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-stone-400 hover:text-white text-xs cursor-pointer font-bold animate-pulse"
                >
                  关闭关闭 ✕
                </button>
              </div>

              <h3 className="font-serif font-black text-base sm:text-lg text-white">
                {selectedNode.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                {selectedNode.detail}
              </p>

              {selectedNode.metric && (
                <div className="pt-2 border-t border-stone-800 flex items-center space-x-1.5 text-amber-400 text-xs font-mono">
                  <Zap className="w-3.5 h-3.5" />
                  <span>临界传导指标：{selectedNode.metric}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-stone-100 rounded-xl text-center text-xs text-stone-500 font-sans border-2 border-dashed border-stone-300">
              💡 提示：点击上方的任意方框，可在此处展开专业级“传导临界点与决策因果分析”。
            </div>
          )}

          {/* NEW RECOMMENDED EXCITING COMPONENT: 🎛️ 传导阻力模拟沙盘 */}
          <div className="border-2 border-stone-950 rounded-2xl bg-[#FFFDF9] p-5 sm:p-6 space-y-5 shadow-xs font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#E3120B]" />
                <h3 className="text-sm sm:text-base font-serif font-black text-stone-950 flex items-center gap-1.5">
                  <span>🎛️ 传导变量冲击模拟沙盘 (Friction Simulator)</span>
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-[#E3120B] text-white animate-pulse">互动功能</span>
                </h3>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">见微量化模型引擎 v2.5</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              因果传导路径并非一成不变。拖动滑块来调节本事件的核心博弈摩擦力与硬件良率。见微引擎将实时模拟整个架构的损耗率、落地概率和商业化时间。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              
              {/* Sliders Area */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-800">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-sky-700" />
                      <span>{simResult.labelA}</span>
                    </span>
                    <span className="font-mono text-stone-600 font-bold">{sliderA}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderA}
                    onChange={(e) => setSliderA(parseInt(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>无摩擦</span>
                    <span>强阻力</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-800">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-indigo-700" />
                      <span>{simResult.labelB}</span>
                    </span>
                    <span className="font-mono text-stone-600 font-bold">{sliderB}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderB}
                    onChange={(e) => setSliderB(parseInt(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>零推进</span>
                    <span>100% 极限落实</span>
                  </div>
                </div>
              </div>

              {/* Recalculated Indicators & Simulated Report */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center border-b border-stone-200 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-500 font-sans">1. 传导信号衰减</span>
                    <div className="text-base sm:text-lg font-mono font-bold text-red-600">
                      {simResult.attenuation}%
                    </div>
                  </div>
                  <div className="space-y-0.5 border-l border-r border-stone-200">
                    <span className="text-[10px] text-stone-500 font-sans">2. 产业突破时长</span>
                    <div className="text-base sm:text-lg font-mono font-bold text-stone-900">
                      {simResult.speedInMonths} 个月
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-500 font-sans">3. 最终落地概率</span>
                    <div className="text-base sm:text-lg font-mono font-bold text-emerald-600">
                      {simResult.successRate}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start space-x-1.5 text-stone-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900 font-serif">🔴 恶化推演情境：</span>
                      <span className="text-stone-600 leading-relaxed text-[11px]">{simResult.worstBrief}</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-1.5 text-stone-700">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900 font-serif">🟢 突破理想路径：</span>
                      <span className="text-stone-600 leading-relaxed text-[11px]">{simResult.bestBrief}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Mode 2: 通俗懂懂比喻 (Plain-English Architectural Narrative & Analogies) */}
      {activeTab === 'narrative' && (
        <div className="space-y-6 font-sans">
          <div className="p-5 sm:p-6 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-amber-200 pointer-events-none">
              <Sparkles className="w-16 h-16 transform translate-x-4 -translate-y-4" />
            </div>
            
            <div className="flex items-center space-x-2 text-amber-800 font-serif font-bold text-sm">
              <Sparkles className="w-5 h-5 text-amber-600 animate-spin" />
              <span>通俗讲（以秒级大白话打个比方）</span>
            </div>
            
            <p className="text-sm sm:text-base text-stone-800 font-serif font-bold leading-relaxed whitespace-pre-line">
              {data.metaphor}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
            <div className="p-4 border border-stone-200 rounded-xl bg-white space-y-2">
              <h4 className="font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>普通人怎么看？</span>
              </h4>
              <p className="text-stone-600 leading-relaxed text-xs">
                不要纠结于复杂的物理或者学术名词。重点关注“效率提高了多少”和“我的电池/软件什么时候能用上”。该架构图的终局效应，会在 1-3 年内直接渗透到我们每个人的消费硬件和职场生产力工具中。
              </p>
            </div>

            <div className="p-4 border border-stone-200 rounded-xl bg-white space-y-2">
              <h4 className="font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <span>决策者（高管/投资人）看什么？</span>
              </h4>
              <p className="text-stone-600 leading-relaxed text-xs">
                重点关注第 3 层的“博弈变量”。凡是发生重大技术迁移，瓶颈期都是绝佳的套利周期。例如台积电 2nm 的原材料前驱体纯度变量，或 Claude 3.7 推理算力 TCO 的变化，直接决定了下一轮核心公司的业绩爆发点。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Mermaid 流程代码 (Mermaid.js Raw Code) */}
      {activeTab === 'mermaid' && (
        <div className="space-y-4 font-sans">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>支持复制以下 Mermaid 代码，粘贴至任何支持 Markdown / 语雀 / GitHub 的绘图系统直接一键生成流程图</span>
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1 bg-stone-900 text-white px-2.5 py-1 rounded hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已复制！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制 Mermaid 代码</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-stone-950 text-stone-200 rounded-2xl text-[11px] font-mono overflow-x-auto border border-stone-800 leading-relaxed">
            {data.mermaidCode}
          </pre>
        </div>
      )}

    </div>
  );
};
