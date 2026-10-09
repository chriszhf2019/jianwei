import React, { useState, useMemo } from 'react';
import { KnowledgeItem, NewsArticle } from '../../types';
import {
  Sparkles,
  GitMerge,
  Users,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
  RefreshCw,
  Plus,
  BookOpen,
  Send,
  Zap,
  TrendingUp,
  Layers,
  HelpCircle,
  FileCheck2,
  Clock,
  Compass,
} from 'lucide-react';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface ButterflyRoundtablePanelProps {
  knowledgeItems: KnowledgeItem[];
  bookmarkedArticles: NewsArticle[];
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
  onOpenTermExplain?: (term: string) => void;
  onUpdateKnowledge?: (id: string, updates: Partial<KnowledgeItem>) => void;
}

interface ButterflyNode {
  order: 0 | 1 | 2 | 3;
  orderName: string;
  title: string;
  description: string;
  affectedEntities: string[];
  impactLevel: '高' | '中' | '低';
  probability: string; // e.g. "高概率演化"
  timeHorizon: string; // e.g. "1-3 个月"
}

interface RoundtablePersona {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarText: string;
  stanceColor: string;
}

interface RoundtableMessage {
  id: string;
  personaId: string;
  personaName: string;
  role: string;
  avatarBg: string;
  avatarText: string;
  stance: 'optimistic' | 'cautious' | 'critical' | 'synthesis';
  content: string;
  keyArguments: string[];
  evidenceRef?: string;
}

const PERSONAS: RoundtablePersona[] = [
  {
    id: 'macro',
    name: '林远 博士',
    role: '宏观地缘与产业政策首席',
    avatarBg: 'bg-blue-900 text-blue-100 border-blue-700',
    avatarText: '宏观',
    stanceColor: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    id: 'supply',
    name: '张锐 专家',
    role: '硬科技供应链风控总监',
    avatarBg: 'bg-amber-900 text-amber-100 border-amber-700',
    avatarText: '供链',
    stanceColor: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  {
    id: 'competitor',
    name: '陈清 顾问',
    role: '竞对雷达与商业对抗研究员',
    avatarBg: 'bg-purple-900 text-purple-100 border-purple-700',
    avatarText: '竞对',
    stanceColor: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    id: 'short',
    name: '戴维 逻辑质疑官',
    role: '反向批判与过度归因做空视角',
    avatarBg: 'bg-rose-900 text-rose-100 border-rose-700',
    avatarText: '质疑',
    stanceColor: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  {
    id: 'arbitrator',
    name: 'Genway 认知裁决 AI',
    role: '系统合议裁判与历史预测校准器',
    avatarBg: 'bg-stone-900 text-stone-100 border-stone-700',
    avatarText: '裁决',
    stanceColor: 'text-stone-900 bg-stone-100 border-stone-300',
  },
];

// Preset Scenario Demo Data
const PRESET_SCENARIOS = [
  {
    id: 'semicon_arm',
    title: '【AI半导体与授权决裂】Arm授权解约案 × 欧洲高算力出口审查',
    historicalAnchor: {
      id: 'hist-1',
      title: '高通与Arm撤销架构授权许可协议诉讼升级，涉及车竞芯片与服务器核心',
      date: '2026-03-12',
      summary: 'Arm致函高通拟取消其全面架构授权，若生效高通将无法出售基于自研Nuvia架构的PC与车规芯片。',
    },
    newCorrelation: {
      title: '欧盟全面升级算力基础设施安全审查 & 车企联合发布开源RISC-V定制指令集',
      date: '2026-10-08',
      source: 'Bloomberg & Reuters 联合快讯',
      summary: '欧洲汽车巨头与高算力芯片厂商宣布组建开源RISC-V架构联盟，规避单点授权风险，同时欧盟出台碳与算力自主法案。',
    },
    butterflyNodes: [
      {
        order: 0 as const,
        orderName: '种子沉淀事件 E₀',
        title: 'Arm 撤销高通 CPU 架构许可诉讼案爆发',
        description: '微观技术授权法律纠纷，原计划仅限制手机/PC端芯片流片。',
        affectedEntities: ['Arm Holdings', '高通 Qualcomm'],
        impactLevel: '高' as const,
        probability: '事实确定',
        timeHorizon: '历史沉淀节点',
      },
      {
        order: 1 as const,
        orderName: '一阶直接影响 1st Order',
        title: '高通紧急重构芯片指令集底层，车规级 Cockpit 交付周期延迟',
        description: '高通汽车芯片客户出现去依赖观望，联发科与英伟达DRIVE平台趁虚增补订单。',
        affectedEntities: ['高通汽车部门', '蔚小理/吉利等客户'],
        impactLevel: '高' as const,
        probability: '90% 概率演化',
        timeHorizon: '0-3 个月',
      },
      {
        order: 2 as const,
        orderName: '二阶产业链传导 2nd Order',
        title: '车企与云巨头联合转向开源 RISC-V 架构，Arm IP 溢价空间收窄',
        description: '原本作为备选的 RISC-V 快速获得主流车企及服务器厂商资金押注，IP授权行业竞争格局发生结构性转移。',
        affectedEntities: ['RISC-V 基金会', '安谋中国', '台积电代工管线'],
        impactLevel: '中' as const,
        probability: '75% 概率演化',
        timeHorizon: '3-12 个月',
      },
      {
        order: 3 as const,
        orderName: '三阶宏观蝴蝶效应 3rd Order',
        title: '欧美半导体地缘自主标准分裂，智驾算力成本倒逼整车售价重新定价',
        description: '从“单一专利官司”扩展为“跨国算力标准自主化博弈”，导致全球算力供应链从低成本整合走向多集群冗余搭建。',
        affectedEntities: ['欧盟芯片法案办公室', '跨国车企资本开支', '全球AI基础设施成本'],
        impactLevel: '高' as const,
        probability: '65% 深度传导',
        timeHorizon: '12-24 个月',
      },
    ],
    messages: [
      {
        id: 'm1',
        personaId: 'macro',
        personaName: '林远 博士',
        role: '宏观地缘与产业政策首席',
        avatarBg: 'bg-blue-900 text-blue-100 border-blue-700',
        avatarText: '宏观',
        stance: 'cautious' as const,
        content:
          '从地缘视角来看，这一最新关联新闻彻底将原本的“商事诉讼”提升为了“自主算力供应链重构”。欧盟在10月的算力审查配合车企RISC-V联盟，表明欧洲不愿在Arm与高通的美国法律撕扯中承受断供风险。',
        keyArguments: [
          '商事争端升级为技术主权博弈',
          '欧洲整车产业链拒绝接受高通/Arm单点脆弱性',
        ],
        evidenceRef: '欧洲芯片法案Article 14关税及自主率要求',
      },
      {
        id: 'm2',
        personaId: 'supply',
        personaName: '张锐 专家',
        role: '硬科技供应链风控总监',
        avatarBg: 'bg-amber-900 text-amber-100 border-amber-700',
        avatarText: '供链',
        stance: 'critical' as const,
        content:
          '供应链成本上，风险正在加速向车企端传导！高通车规芯片8295/8650平台的迭代周期可能拖延 6-9 个月。虽然 RISC-V 是长远解法，但车规级软件栈生态适配至少需要 3 年。短期内车企备货二套方案（如 Nvidia/NXP）的资本开支将激增 35%。',
        keyArguments: [
          '车规芯片迭代窗口期延迟 6-9 个月',
          '二套备用方案致使软件迁移成本上升',
        ],
        evidenceRef: '高通 Snapdragon Digital Chassis 交付线',
      },
      {
        id: 'm3',
        personaId: 'short',
        personaName: '戴维 逻辑质疑官',
        role: '反向批判与过度归因做空视角',
        avatarBg: 'bg-rose-900 text-rose-100 border-rose-700',
        avatarText: '质疑',
        stance: 'critical' as const,
        content:
          '我必须提出质疑！市场是否过度解读了“蝴蝶效应”？RISC-V 联盟成立已有数年，此次车企联合声明很大程度上是针对 Arm 授权费涨价的联合压价筹码，未必代表高通8295会迅速被替换。大家不要把“谈判策略”误判为“产业断供”。',
        keyArguments: [
          'RISC-V 联盟可能是对抗 Arm 涨价的施压筹码',
          '警惕将商业博弈过度归因于供应链全面断裂',
        ],
      },
      {
        id: 'm4',
        personaId: 'competitor',
        personaName: '陈清 顾问',
        role: '竞对雷达与商业对抗研究员',
        avatarBg: 'bg-purple-900 text-purple-100 border-purple-700',
        avatarText: '竞对',
        stance: 'optimistic' as const,
        content:
          '无论是否为筹码，竞争格局的松动是千真万确的。联发科(MediaTek)与Nvidia合作的Dimensity Auto已获得多家头部车企定点，这就是极佳的替代侵蚀切入点。高通垄断高阶智能座舱的时代出现裂缝。',
        keyArguments: ['联发科与英伟达联合方案正蚕食高通座舱份额', '竞争格局由单极变为多强争霸'],
      },
      {
        id: 'm5',
        personaId: 'arbitrator',
        personaName: 'Genway 认知裁决 AI',
        role: '系统合议裁判与历史预测校准器',
        avatarBg: 'bg-stone-900 text-stone-100 border-stone-700',
        avatarText: '裁决',
        stance: 'synthesis' as const,
        content:
          '【圆桌合议裁决】：结合历史沉淀 E₀ 与最新关联增量，系统将该事项的风险等级由“观望”上调至“重点预警”。确认一阶至三阶传导有效。建议将高通车规芯片交付稳定性及 RISC-V 车规生态研发突破列入下阶段动态监控规则。',
        keyArguments: [
          '历史预测账本修正：延长高通产品线交期预测',
          '认知结论：法律纠纷+地缘审查共同催化底层架构替代',
        ],
      },
    ],
  },
  {
    id: 'ev_tariff',
    title: '【新能源出海与关税博弈】中欧汽车关税反制 × 电池零配件本土化强约束',
    historicalAnchor: {
      id: 'hist-2',
      title: '欧盟对中国电动汽车加征反补贴关税落地，最高税率达35.3%',
      date: '2026-02-18',
      summary: '欧盟宣布终裁结果，对中国纯电动汽车实施为期5年的反补贴高额关税。',
    },
    newCorrelation: {
      title: '欧洲发布《电池关键零配件本土配额法案》& 东南亚与南美上游矿业税率调增',
      date: '2026-10-05',
      source: 'Financial Times 快讯',
      summary: '欧盟规定享受补贴需保证40%电池包在欧洲本土组装，同时南美锂矿国宣布成立联合限产联盟。',
    },
    butterflyNodes: [
      {
        order: 0 as const,
        orderName: '种子沉淀事件 E₀',
        title: '中欧电动汽车反补贴关税落地',
        description: '出口整车面临额外高额关税，削弱直接出口性价比。',
        affectedEntities: ['中国出海车企', '欧盟海关'],
        impactLevel: '高' as const,
        probability: '事实确定',
        timeHorizon: '历史沉淀节点',
      },
      {
        order: 1 as const,
        orderName: '一阶直接影响 1st Order',
        title: '出海战略由“整车出口”全面转向“欧洲本地 KD 组装厂”',
        description: '匈牙利、西班牙、波兰等工厂建设速度加快，整车厂资本开支向欧洲本土倾斜。',
        affectedEntities: ['比亚迪', '奇瑞', '上汽名爵'],
        impactLevel: '高' as const,
        probability: '85% 正在发生',
        timeHorizon: '0-6 个月',
      },
      {
        order: 2 as const,
        orderName: '二阶产业链传导 2nd Order',
        title: '中国电池与正负极材料供应链集群跟随出海，欧洲本土电池巨头受冲击',
        description: '宁德时代、亿纬锂能等欧洲工厂获得增量包揽订单，而欧洲本土Northvolt等资金链进一步吃紧。',
        affectedEntities: ['宁德时代欧洲厂', 'Northvolt', '欧洲零部件供应商'],
        impactLevel: '中' as const,
        probability: '75% 概率演化',
        timeHorizon: '6-18 个月',
      },
      {
        order: 3 as const,
        orderName: '三阶宏观蝴蝶效应 3rd Order',
        title: '南美锂矿资源国联合提价与欧洲新能源普及率达峰回落',
        description: '上游资源与中游关税双向挤压，导致欧洲终端电动车价格居高不下，燃油/混动过渡期延长。',
        affectedEntities: ['欧洲汽车消费者', '全球锂矿定价权', '跨国车企转型节奏'],
        impactLevel: '中' as const,
        probability: '60% 动态观察',
        timeHorizon: '18-36 个月',
      },
    ],
    messages: [
      {
        id: 'm10',
        personaId: 'macro',
        personaName: '林远 博士',
        role: '宏观地缘与产业政策首席',
        avatarBg: 'bg-blue-900 text-blue-100 border-blue-700',
        avatarText: '宏观',
        stance: 'optimistic' as const,
        content:
          '关税虽然短期利空，但新关联的“本土配额法案”反向逼迫中国车企完成了全球化产能布局的跳跃。类似于80年代日本丰田在北美建厂，中国新能源供应链正在借机完成欧洲本土化扎根。',
        keyArguments: ['倒逼中国供应链完成高价值区域本土化部署', '重演日本车企80年代北美出海破局路径'],
      },
      {
        id: 'm11',
        personaId: 'supply',
        personaName: '张锐 专家',
        role: '硬科技供应链风控总监',
        avatarBg: 'bg-amber-900 text-amber-100 border-amber-700',
        avatarText: '供链',
        stance: 'cautious' as const,
        content:
          '需要警惕合规成本与工会挑战！欧洲本土工厂的人力成本、能源支出以及碳足迹追踪(Battery Passport)合规审计将使单位生产成本增加 22-30%。不能盲目乐观。',
        keyArguments: ['欧洲电池护照合规审计严苛', '本土工会与高能源成本侵蚀利润率'],
      },
      {
        id: 'm12',
        personaId: 'arbitrator',
        personaName: 'Genway 认知裁决 AI',
        role: '系统合议裁判与历史预测校准器',
        avatarBg: 'bg-stone-900 text-stone-100 border-stone-700',
        avatarText: '裁决',
        stance: 'synthesis' as const,
        content:
          '【圆桌合议裁决】：从长周期蝴蝶效应看，单纯依赖“中国出口成本优势”的逻辑已失效，系统更新该主题标签为“本地合规与重资产出海能力”决定胜负。',
        keyArguments: ['更新战略提示：跟踪各车企匈牙利/西班牙工厂投产节点'],
      },
    ],
  },
];

export const ButterflyRoundtablePanel: React.FC<ButterflyRoundtablePanelProps> = ({
  knowledgeItems,
  bookmarkedArticles,
  articles,
  onOpenArticleById,
  onOpenTermExplain,
  onUpdateKnowledge,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('semicon_arm');
  const [activeTab, setActiveTab] = useState<'butterfly' | 'roundtable' | 'architecture'>('butterfly');
  const [isDebating, setIsDebating] = useState(false);
  const [customNewInput, setCustomNewInput] = useState('');
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>('');
  const [savedToHistory, setSavedToHistory] = useState(false);

  const activeScenario = useMemo(() => {
    return PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];
  }, [selectedScenarioId]);

  const handleSimulateDebate = () => {
    setIsDebating(true);
    setTimeout(() => {
      setIsDebating(false);
    }, 1200);
  };

  const handleSaveToKnowledge = () => {
    setSavedToHistory(true);
    setTimeout(() => {
      setSavedToHistory(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 font-sans text-stone-900">
      {/* Top Banner Explaining the Concept */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-stone-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#E3120B]/20 border border-[#E3120B]/40 rounded-2xl text-[#E3120B]">
              <GitMerge className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider">
                  新旧因果演进与多视角会商
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-800 text-stone-300 border border-stone-700">
                  v2.8 Butterfly Engine
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white mt-0.5">
                沉淀新闻的关联演进：蝴蝶效应传导网络与多视角圆桌会商
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-stone-800/80 p-1.5 rounded-2xl border border-stone-700 text-xs">
            {PRESET_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScenarioId(s.id)}
                className={`px-3 py-1.5 rounded-xl font-serif font-bold transition-all ${
                  selectedScenarioId === s.id
                    ? 'bg-[#E3120B] text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'
                }`}
              >
                {s.id === 'semicon_arm' ? '芯片与Arm授权案' : '新能源与关税博弈'}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-sans max-w-4xl">
          <strong>设计核心逻辑：</strong> 当关注的新闻被收录为“历史沉淀种子”后，系统后台的增量语义与知识图谱引擎会持续扫描全球后续动态。一旦发现跨时间关联，系统将自动触发
          <span className="text-amber-400 font-bold mx-1">三阶蝴蝶效应链条拆解</span> 与
          <span className="text-[#E3120B] font-bold mx-1">多角色 AI 专家圆桌辩论</span>，重构旧断言的假设边界与最新风险评级。
        </p>

        {/* Anchor & Correlation Comparison Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-stone-800/90 rounded-2xl border border-stone-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-stone-700 text-stone-300 font-serif font-bold flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>【历史沉淀种子事件 E₀】</span>
              </span>
              <span className="font-mono text-stone-400 text-[11px]">
                {activeScenario.historicalAnchor.date}
              </span>
            </div>
            <h4 className="text-sm font-serif font-bold text-stone-100">
              {activeScenario.historicalAnchor.title}
            </h4>
            <p className="text-xs text-stone-300 line-clamp-2">
              {activeScenario.historicalAnchor.summary}
            </p>
          </div>

          <div className="p-4 bg-stone-800/90 rounded-2xl border border-[#E3120B]/40 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E3120B]/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-[#E3120B]/20 text-[#E3120B] font-serif font-bold flex items-center space-x-1 border border-[#E3120B]/30">
                <Zap className="w-3.5 h-3.5" />
                <span>【最新关联新闻增量 Δ Signal】</span>
              </span>
              <span className="font-mono text-stone-400 text-[11px]">
                {activeScenario.newCorrelation.date}
              </span>
            </div>
            <h4 className="text-sm font-serif font-bold text-amber-300">
              {activeScenario.newCorrelation.title}
            </h4>
            <p className="text-xs text-stone-300 line-clamp-2">
              {activeScenario.newCorrelation.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="flex items-center justify-between border-b-2 border-stone-200 pb-2">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('butterfly')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-serif font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'butterfly'
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <GitMerge className="w-4 h-4 text-amber-400" />
            <span>1. 蝴蝶效应传导网络 (Ripple Cascade)</span>
          </button>

          <button
            onClick={() => setActiveTab('roundtable')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-serif font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'roundtable'
                ? 'bg-[#E3120B] text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. 动态专家圆桌辩论 (Multi-Persona Debate)</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-serif font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'architecture'
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Compass className="w-4 h-4 text-blue-400" />
            <span>3. 认知闭环设计架构 (System Blueprint)</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-stone-500">
          <Clock className="w-3.5 h-3.5" />
          <span>事件跨度：7 个月 | 综合共振分：94.2</span>
        </div>
      </div>

      {/* TAB 1: Butterfly Effect Ripple Cascade Graph */}
      {activeTab === 'butterfly' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif font-black text-stone-950 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#E3120B]" />
              <span>跨时空因果传导阶梯 (0阶种子 → 3阶系统蝴蝶效应)</span>
            </h3>
            <span className="text-xs text-stone-500 font-sans">
              根据模型统计因果逻辑层级构建，非概率推测
            </span>
          </div>

          {/* Vertical Node Steps */}
          <div className="relative border-l-2 border-dashed border-stone-300 ml-4 sm:ml-8 pl-6 sm:pl-8 space-y-8">
            {activeScenario.butterflyNodes.map((node, idx) => {
              const isSeed = node.order === 0;
              const isHighest = node.impactLevel === '高';

              return (
                <div key={idx} className="relative group">
                  {/* Node Dot / Badge */}
                  <div
                    className={`absolute -left-[35px] sm:-left-[43px] top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-serif font-black shadow-md transition-transform group-hover:scale-110 ${
                      isSeed
                        ? 'bg-amber-500 text-stone-950 border-stone-900'
                        : node.order === 1
                        ? 'bg-[#E3120B] text-white border-stone-900'
                        : node.order === 2
                        ? 'bg-purple-700 text-white border-stone-900'
                        : 'bg-blue-800 text-white border-stone-900'
                    }`}
                  >
                    E{node.order}
                  </div>

                  <div className="p-5 sm:p-6 bg-white rounded-2xl border-2 border-stone-200 hover:border-stone-400 transition-all shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-serif font-bold ${
                            isSeed
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-stone-100 text-stone-800 border border-stone-300'
                          }`}
                        >
                          {node.orderName}
                        </span>
                        <span className="text-xs text-stone-500 font-mono">
                          预测窗口：{node.timeHorizon}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-stone-500 font-sans">影响强度：</span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            isHighest
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {node.impactLevel}影响
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 font-mono">
                          {node.probability}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-base sm:text-lg font-serif font-bold text-stone-950">
                      <KeyTermHighlight text={node.title} onOpenTermExplain={onOpenTermExplain} />
                    </h4>

                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                      {node.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="text-stone-500 font-bold">受影响实体波及阵列:</span>
                      {node.affectedEntities.map((ent, eIdx) => (
                        <span
                          key={eIdx}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-800 font-medium"
                        >
                          {ent}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs text-amber-950">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-serif font-bold">蝴蝶效应传导防推测机制：</strong>
              系统对三阶宏观蝴蝶效应（3rd
              Order）的判定需至少具备两组独立权威媒体/产业报告的实体重叠印证，避免因逻辑过度延伸而引入虚假因果关系。
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Dynamic Multi-Persona Roundtable Debate */}
      {activeTab === 'roundtable' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-lg font-serif font-black text-stone-950 flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#E3120B]" />
                <span>多视角 AI 专家圆桌会商模拟器 (Stakeholder Debate)</span>
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                新关联新闻接入后，触发 5 大立场 AI
                角色对旧有推演假设进行碰撞，重新校准风险等级与行动方案。
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleSimulateDebate}
                disabled={isDebating}
                className="px-4 py-2 bg-[#E3120B] hover:bg-red-700 text-white rounded-xl text-xs font-serif font-bold shadow-md flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDebating ? 'animate-spin' : ''}`} />
                <span>{isDebating ? 'AI 专家会商辩论中...' : '重新发起圆桌会商'}</span>
              </button>

              <button
                onClick={handleSaveToKnowledge}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold shadow-md flex items-center space-x-1.5 transition-all"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{savedToHistory ? '已写入演进历史存根!' : '写入历史事件演进日志'}</span>
              </button>
            </div>
          </div>

          {/* Persona Avatar Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PERSONAS.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border text-center space-y-1 transition-all ${
                  p.id === 'arbitrator'
                    ? 'bg-stone-900 text-white border-stone-800 shadow-md col-span-2 sm:col-span-1'
                    : 'bg-white border-stone-200 hover:border-stone-400'
                }`}
              >
                <div
                  className={`w-9 h-9 mx-auto rounded-xl border flex items-center justify-center font-serif font-bold text-xs ${p.avatarBg}`}
                >
                  {p.avatarText}
                </div>
                <div className="text-xs font-serif font-bold truncate">{p.name}</div>
                <div className="text-[10px] opacity-75 line-clamp-1">{p.role}</div>
              </div>
            ))}
          </div>

          {/* Dialogue Thread */}
          <div className="space-y-4">
            {activeScenario.messages.map((msg: any) => {
              const isArbitrator = msg.personaId === 'arbitrator';

              return (
                <div
                  key={msg.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isArbitrator
                      ? 'bg-stone-950 text-white border-stone-800 shadow-lg'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100/20 pb-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center font-serif font-bold text-xs shrink-0 ${msg.avatarBg}`}
                      >
                        {msg.avatarText}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs font-serif font-bold ${
                              isArbitrator ? 'text-amber-300' : 'text-stone-900'
                            }`}
                          >
                            {msg.personaName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] border font-serif font-bold ${msg.stanceColor}`}
                          >
                            {msg.stance === 'optimistic'
                              ? '建设性/机会'
                              : msg.stance === 'cautious'
                              ? '警惕预警'
                              : msg.stance === 'critical'
                              ? '反向批判'
                              : '系统裁决'}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] ${
                            isArbitrator ? 'text-stone-400' : 'text-stone-500'
                          }`}
                        >
                          {msg.role}
                        </div>
                      </div>
                    </div>

                    {msg.evidenceRef && (
                      <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-[11px] font-mono border border-stone-200">
                        依据: {msg.evidenceRef}
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs sm:text-sm leading-relaxed font-sans ${
                      isArbitrator ? 'text-stone-200 font-medium' : 'text-stone-800'
                    }`}
                  >
                    {msg.content}
                  </p>

                  {/* Key Arguments Pills */}
                  {msg.keyArguments && msg.keyArguments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-stone-100/10">
                      <span
                        className={`text-[10px] font-serif font-bold uppercase ${
                          isArbitrator ? 'text-amber-400' : 'text-stone-400'
                        }`}
                      >
                        辩论核心支柱:
                      </span>
                      {msg.keyArguments.map((arg: string, aIdx: number) => (
                        <span
                          key={aIdx}
                          className={`px-2.5 py-0.5 rounded-md text-xs font-serif ${
                            isArbitrator
                              ? 'bg-stone-800 text-amber-200 border border-stone-700'
                              : 'bg-stone-50 text-stone-700 border border-stone-200'
                          }`}
                        >
                          • {arg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: System Blueprint Architecture Explanation */}
      {activeTab === 'architecture' && (
        <div className="bg-white border-2 border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <span className="text-xs font-serif font-bold text-blue-600 uppercase tracking-wider">
              系统设计文档 (System Architecture Specification)
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-950 mt-1">
              关注新闻沉淀与后续关联演进（蝴蝶效应与圆桌会商）设计规范
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-stone-700 leading-relaxed font-sans">
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <h4 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">
                  1
                </span>
                <span>第一阶段：新闻沉淀与基因化 (Event DNA Anchoring)</span>
              </h4>
              <p>
                当用户点击“关注”或“收藏”新闻时，系统将其转化为<strong>结构化种子节点 (E₀)</strong>，并归档以下核心字段：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600">
                <li>七要素事实快照 (What, Who, When, Where, Why, How, So what)</li>
                <li>核心因果假设与待验证的临界触发条件 (Invalidation Threshold)</li>
                <li>关联实体 (Entities) 与利益相关方利益关系图谱</li>
              </ul>
            </div>

            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <h4 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#E3120B] text-white flex items-center justify-center text-xs">
                  2
                </span>
                <span>第二阶段：关联雷达与蝴蝶效应传导引擎</span>
              </h4>
              <p>
                每日增量新闻入库时，后台触发<strong>语义向量 + 知识图谱实体交集扫描</strong>，触发传导评级：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600">
                <li><strong>1阶 (Direct Impact)：</strong> 主体同一性或衍生法律/商务行为。</li>
                <li><strong>2阶 (Supply Chain Ripple)：</strong> 上下游价格传导与替代对手出招。</li>
                <li><strong>3阶 (Macro Systemic Cascade)：</strong> 跨行业规则、政策与地缘战略外溢。</li>
              </ul>
            </div>

            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <h4 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs">
                  3
                </span>
                <span>第三阶段：多视角 AI 专家圆桌会商机制</span>
              </h4>
              <p>
                当共振关联度超过阈值时，自动启动<strong>多视角 AI 圆桌 (Roundtable Debate)</strong>：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600">
                <li>多角色分工：宏观战略、供应链风控、竞对雷达、做空质疑官、系统裁决官。</li>
                <li>对抗性博弈：角色之间相互提出反例，质证“关联性是否为过度归因”。</li>
                <li>会商决议：生成一句话核心结论，并判定旧推演是否需要被修订。</li>
              </ul>
            </div>

            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <h4 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs">
                  4
                </span>
                <span>第四阶段：认知演进日志与预测账本校准</span>
              </h4>
              <p>
                会商决议自动追加写入该历史事件的<strong>“演进时间线 (Evolution Log)”</strong>：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600">
                <li>更新该沉淀主题的“风险等级”与“最新行动指引”。</li>
                <li>若包含关联预测契约 (Prediction Contract)，自动触发 Brier Score 校准或提期审验。</li>
                <li>知识图谱中更新节点间边权重 (Edge Weight Revision)。</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
