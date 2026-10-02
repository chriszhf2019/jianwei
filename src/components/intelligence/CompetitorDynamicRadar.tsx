import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../../types';
import {
  Compass,
  Zap,
  TrendingUp,
  Building2,
  Cpu,
  Users,
  Factory,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  Flame,
  Search,
  ExternalLink,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

interface CompetitorDynamicRadarProps {
  articles?: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
}

interface CompetitorProfile {
  id: string;
  name: string;
  nameEn: string;
  sector: string;
  headquarters: string;
  strategicThreatLevel: '极高' | '高' | '中等';
  radarMetrics: Array<{
    subject: string;
    competitor: number; // 0 - 100
    us: number; // 0 - 100
  }>;
  fourDimensions: {
    patents: { count: number; yoy: string; topFocus: string; highlight: string };
    talent: { netFlow: string; keyHires: string[]; focusDomain: string };
    capex: { amount: string; locations: string[]; mainProject: string };
    ma: { dealsCount: number; latestDeal: string; strategicIntent: string };
  };
  recentMoves: Array<{
    date: string;
    title: string;
    type: '技术突破' | '产能扩张' | '战略并购' | '高管变动';
    severity: 'critical' | 'warning' | 'info';
    implication: string;
  }>;
  counterStrategy: {
    ourAdvantage: string;
    ourWeakness: string;
    immediateAction: string;
  };
}

const COMPETITOR_PROFILES: CompetitorProfile[] = [
  {
    id: 'nvidia',
    name: '英伟达',
    nameEn: 'NVIDIA',
    sector: 'AI 算力与加速计算',
    headquarters: '美国加州',
    strategicThreatLevel: '极高',
    radarMetrics: [
      { subject: '算力生态壁垒 (CUDA)', competitor: 98, us: 58 },
      { subject: '先进封装与供应链锁定', competitor: 92, us: 64 },
      { subject: '端侧与边缘 AI 渗透', competitor: 75, us: 82 },
      { subject: '跨国合规与属地化准入', competitor: 65, us: 88 },
      { subject: '全栈软件与模型协同', competitor: 95, us: 70 },
    ],
    fourDimensions: {
      patents: { count: 3420, yoy: '+42%', topFocus: 'CPO 光互连、下一代 Blackwell 晶圆互联拓扑', highlight: '公开 128 项硅光与跨芯片低延迟通信核心专利' },
      talent: { netFlow: '+185人', keyHires: ['前 DeepMind 强化学习首席研究员', '前 ASML 先进光刻量产架构师'], focusDomain: '端到端物理世界 AI 与机器人模拟器' },
      capex: { amount: '48 亿美元', locations: ['美国俄勒冈', '台湾台南', '日本横滨'], mainProject: '与台积电深度绑定定制 2nm / 3nm 晶圆级封装产线' },
      ma: { dealsCount: 4, latestDeal: '战略收购 Run:ai (GPU 算力集群虚拟化编排平台)', strategicIntent: '强化企业级私有云算力利用率统治力' },
    },
    recentMoves: [
      { date: '近期', title: '正式启动下代 Rubin 架构流片，全面采用 HBM4 堆叠', type: '技术突破', severity: 'critical', implication: '将大模型单卡推理吞吐提升 3.2 倍，拉大硬件代差' },
      { date: '近期', title: '在日本设立机器人 AI 联合研发中心', type: '产能扩张', severity: 'warning', implication: '提前卡位人形机器人具身智能专用芯片事实标准' },
      { date: '前序', title: '向中东主权基金与阿联酋 G42 交付定制合规算力集群', type: '技术突破', severity: 'info', implication: '通过地缘属地化合规方案抢占中东主权 AI 市场' },
    ],
    counterStrategy: {
      ourAdvantage: '在端侧轻量化模型推理成本、边缘工业嵌入式场景及本地化客户定制服务上响应极快。',
      ourWeakness: '高端 GPU 软件生态 (CUDA 替代方案) 开发者迁移成本高，先进封装产能受制于人。',
      immediateAction: '发力 PyTorch / Triton 兼容中间层编译器，主攻端侧 NPU 与混合精度推理细分场景实现局部超越。',
    },
  },
  {
    id: 'tesla',
    name: '特斯拉',
    nameEn: 'Tesla',
    sector: '智能电动汽车与具身智能',
    headquarters: '美国得州',
    strategicThreatLevel: '极高',
    radarMetrics: [
      { subject: '自动驾驶纯视觉算法 (FSD)', competitor: 94, us: 72 },
      { subject: '一体化压铸与制造成本', competitor: 96, us: 80 },
      { subject: '人形机器人本体协同 (Optimus)', competitor: 88, us: 65 },
      { subject: '供应链垂直整合度', competitor: 90, us: 85 },
      { subject: '海外本地化交付网络', competitor: 92, us: 78 },
    ],
    fourDimensions: {
      patents: { count: 2150, yoy: '+28%', topFocus: '端到端世界模型、干法电极 4680 电池', highlight: '公布第二代干法电极涂布均匀度控制算法' },
      talent: { netFlow: '+95人', keyHires: ['前 OpenAI 视觉生成架构主管', '前波士顿动力关节伺服专家'], focusDomain: 'Optimus 人形机器人灵巧手与触觉力反馈' },
      capex: { amount: '100 亿美元', locations: ['美国奥斯汀', '墨西哥新莱昂', '中国上海'], mainProject: '超级计算集群 Cortex 与储能超级工厂二期扩建' },
      ma: { dealsCount: 2, latestDeal: '收购无线充电与自动化补能初创 Wiferion 资产', strategicIntent: '为 Robotaxi 无人化运营闭环铺路' },
    },
    recentMoves: [
      { date: '近期', title: 'FSD V13 全量推送，端到端世界模型介入真实物理交互', type: '技术突破', severity: 'critical', implication: '断崖式减少人工接管率，推动 Robotaxi 商业化落地' },
      { date: '近期', title: 'Optimus 产线部署量突破 1,000 台，执行电池搬运任务', type: '技术突破', severity: 'warning', implication: '开启全球首个工厂级具身智能规模化内测' },
    ],
    counterStrategy: {
      ourAdvantage: '智能座舱生态交互体验丰富、多传感器冗余安全感知及本地化快充补能网络完备。',
      ourWeakness: '端到端纯视觉无图智驾算法泛化能力及自研超算芯片算力储备相对不足。',
      immediateAction: '联合国内头部云厂商共建百 EFLOPS 级智驾训练云，加速端到端视频生成模型迭代。',
    },
  },
  {
    id: 'catl',
    name: '宁德时代',
    nameEn: 'CATL',
    sector: '动力与储能电池',
    headquarters: '中国福建',
    strategicThreatLevel: '高',
    radarMetrics: [
      { subject: '全球装车量与产能规模', competitor: 98, us: 70 },
      { subject: '固态与凝聚态研发储备', competitor: 92, us: 76 },
      { subject: '欧美本土化建厂合规 (LRS/合资)', competitor: 85, us: 68 },
      { subject: '上游锂矿及关键材料整合', competitor: 95, us: 74 },
      { subject: '换电与储能系统集成', competitor: 90, us: 72 },
    ],
    fourDimensions: {
      patents: { count: 8600, yoy: '+35%', topFocus: '全固态电池硫化物路线、钠离子电池二代', highlight: '公布全固态电池 500Wh/kg 能量密度中试数据' },
      talent: { netFlow: '+320人', keyHires: ['前丰田固态电池首席材料学家', '前松下海外合资厂运营副总裁'], focusDomain: '全固态电芯量产制造工艺与欧洲属地化运营' },
      capex: { amount: '450 亿人民币', locations: ['匈牙利德布勒森', '德国图林根', '中国山东'], mainProject: '欧洲百 GWh 级超级电池基地全面投产' },
      ma: { dealsCount: 5, latestDeal: '战略入股西澳大利亚高品位锂辉石矿山', strategicIntent: '穿透式保障未来 10 年低成本锂资源供应' },
    },
    recentMoves: [
      { date: '近期', title: '正式发布全固态动力电池样品，计划 2027 年小批量上车', type: '技术突破', severity: 'critical', implication: '将全行业能量密度上限推高至 500Wh/kg' },
      { date: '近期', title: '匈牙利工厂首批电芯下线，符合欧盟电池护照全链追溯', type: '产能扩张', severity: 'warning', implication: '完成欧洲本土化绿电制造闭环，规避碳关税' },
    ],
    counterStrategy: {
      ourAdvantage: '特定车企定制化电芯开发响应周期短，在半固态电池差异化细分市场拥有先发应用。',
      ourWeakness: '规模效应与上游原材料综合采购议价权差距明显，欧洲本土化合规成本高。',
      immediateAction: '聚焦半固态与高压快充细分领域打造爆款，采用轻资产技术授权模式出海。',
    },
  },
  {
    id: 'openai',
    name: 'OpenAI',
    nameEn: 'OpenAI',
    sector: '大模型与通用人工智能 (AGI)',
    headquarters: '美国旧金山',
    strategicThreatLevel: '极高',
    radarMetrics: [
      { subject: '前沿模型通用推理 (Reasoning)', competitor: 98, us: 65 },
      { subject: '全球开发者与 API 粘性', competitor: 96, us: 60 },
      { subject: '多模态语音与视线交互 (Omni)', competitor: 94, us: 75 },
      { subject: '企业级数据安全与私有化', competitor: 72, us: 88 },
      { subject: '自研算力与硬件供应链', competitor: 68, us: 70 },
    ],
    fourDimensions: {
      patents: { count: 480, yoy: '+120%', topFocus: '强化学习长链思考 (o1/o3)、多模态合成数据蒸馏', highlight: '申请 40 项关于强化学习测试时计算 (Test-Time Compute) 的核心架构' },
      talent: { netFlow: '+60人', keyHires: ['前 Meta 首席系统研究员', '前苹果硬件设计主管'], focusDomain: '下一代 AI 硬件设备与自主智能体 (Autonomous Agents)' },
      capex: { amount: '100 亿美元 (含算力预付)', locations: ['微软云全球算力集群', '美国中西部数据中心'], mainProject: 'Stargate 百万卡超大规模 AI 数据中心联合规划' },
      ma: { dealsCount: 3, latestDeal: '收购 Multi (企业远程协作与屏幕智能共享工具)', strategicIntent: '将 AI Agent 直接嵌入操作系统级日常办公工作流' },
    },
    recentMoves: [
      { date: '近期', title: '发布具备自主深思长思考能力的 o3 系列模型', type: '技术突破', severity: 'critical', implication: '在编程竞赛与高难度数理逻辑上全面超越人类顶尖博士' },
      { date: '近期', title: '与苹果全面完成 iOS 深度系统级入口整合', type: '战略并购', severity: 'warning', implication: '锁定数以亿计的全球高端移动端设备流量主入口' },
    ],
    counterStrategy: {
      ourAdvantage: '在垂直行业场景私有化部署、中文与跨语种特定合规、私域数据安全与降本提速上更接地气。',
      ourWeakness: '超大算力集群资金消耗巨大，基础模型最前沿突破存在代差追赶压力。',
      immediateAction: '主攻 MoE 混合专家与端侧轻量化模型，深耕金融、法律、制造等企业级工作流应用闭环。',
    },
  },
];

export const CompetitorDynamicRadar: React.FC<CompetitorDynamicRadarProps> = ({
  articles = [],
  onSelectArticleTitle,
}) => {
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>(COMPETITOR_PROFILES[0].id);

  const activeProfile = useMemo(() => {
    return COMPETITOR_PROFILES.find((c) => c.id === selectedCompetitorId) || COMPETITOR_PROFILES[0];
  }, [selectedCompetitorId]);

  return (
    <div className="bg-white border-2 border-stone-900 rounded-2xl p-6 sm:p-8 shadow-sm font-sans space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-900 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-stone-900 text-amber-400 shadow-xs">
              <Compass className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950">
              跨国企业竞争对手异动雷达 (Competitive Dynamic Radar)
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            四维穿透：专利技术密度、顶级人才流动、全球扩产基建与生态并购 · 对标态势与反制攻防
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono font-bold">
          <Target className="w-3.5 h-3.5 text-amber-700" />
          <span>战略对标战情室</span>
        </div>
      </div>

      {/* Competitor Selector Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
        {COMPETITOR_PROFILES.map((comp) => {
          const isSelected = selectedCompetitorId === comp.id;
          return (
            <button
              key={comp.id}
              onClick={() => setSelectedCompetitorId(comp.id)}
              className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-serif font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-2 ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-[#FAF8F5] text-stone-700 border-stone-300 hover:border-stone-500 hover:bg-white'
              }`}
            >
              <span>{comp.name} ({comp.nameEn})</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-amber-400 text-stone-950' : 'bg-stone-200 text-stone-700'
                }`}
              >
                {comp.strategicThreatLevel}威胁
              </span>
            </button>
          );
        })}
      </div>

      {/* Profile Overview & 4-Dimensional Dynamics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recharts Radar Chart for Strategic Parity */}
        <div className="lg:col-span-5 bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
            <div>
              <h4 className="font-serif font-bold text-sm text-stone-950 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-stone-700" />
                <span>战略能力雷达对标 (Radar Parity)</span>
              </h4>
              <p className="text-[10px] text-stone-500 font-mono">
                {activeProfile.name} vs 行业中位/我方对标
              </p>
            </div>

            <div className="flex items-center space-x-2 text-[10px] font-mono font-bold">
              <span className="flex items-center gap-1 text-[#E3120B]">
                <span className="w-2.5 h-2.5 bg-[#E3120B] rounded-full" /> {activeProfile.name}
              </span>
              <span className="flex items-center gap-1 text-stone-600">
                <span className="w-2.5 h-2.5 bg-stone-500 rounded-full" /> 我方/基准
              </span>
            </div>
          </div>

          <div className="w-full h-56 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={activeProfile.radarMetrics} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <PolarGrid stroke="#E7E5E4" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#44403C' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <div className="bg-stone-900 text-white text-[11px] font-mono p-2 rounded-md shadow-md space-y-0.5">
                        <div className="font-bold text-amber-400">{payload[0]?.payload.subject}</div>
                        <div className="text-red-400">{activeProfile.name}: {payload[0]?.value} 分</div>
                        <div className="text-stone-300">我方/基准: {payload[1]?.value} 分</div>
                      </div>
                    ) : null
                  }
                />
                <Radar name={activeProfile.name} dataKey="competitor" stroke="#E3120B" fill="#E3120B" fillOpacity={0.35} />
                <Radar name="我方基准" dataKey="us" stroke="#78716C" fill="#78716C" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-lg bg-white border border-stone-200 text-xs text-stone-700 font-sans space-y-1">
            <div className="font-serif font-bold text-stone-950 text-[11px]">🎯 战情简评：</div>
            <p className="leading-relaxed">
              {activeProfile.name}在<strong>{activeProfile.radarMetrics[0].subject}</strong>建立绝对主导优势（{activeProfile.radarMetrics[0].competitor}分），但在<strong>{activeProfile.radarMetrics[3].subject}</strong>仍存在突破敞口。
            </p>
          </div>
        </div>

        {/* Right: Four Dimensions Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Dimension 1: Patents & IP */}
          <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-1.5">
              <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-600" />
                <span>1. 核心专利与技术密度</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-bold">
                YoY {activeProfile.fourDimensions.patents.yoy}
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-stone-500 font-mono">
                年度公开量：<strong className="text-stone-950 text-sm">{activeProfile.fourDimensions.patents.count} 项</strong>
              </div>
              <p className="text-xs text-stone-700 font-sans leading-snug">
                <strong>攻坚主线：</strong>{activeProfile.fourDimensions.patents.topFocus}
              </p>
              <div className="text-[11px] text-sky-900 bg-sky-50/60 p-2 rounded border border-sky-100 mt-1">
                💡 {activeProfile.fourDimensions.patents.highlight}
              </div>
            </div>
          </div>

          {/* Dimension 2: Talent & Scientists */}
          <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-1.5">
              <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>2. 关键人才与科学家流动</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold">
                净流入 {activeProfile.fourDimensions.talent.netFlow}
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-stone-500 font-mono">
                招揽主线：<strong className="text-stone-950">{activeProfile.fourDimensions.talent.focusDomain}</strong>
              </div>
              <div className="text-xs text-stone-700 space-y-0.5 pt-1">
                <strong className="text-[11px] text-stone-500">核心引进人才：</strong>
                {activeProfile.fourDimensions.talent.keyHires.map((hire, i) => (
                  <div key={i} className="text-[11px] flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full" /> {hire}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dimension 3: Capex & Expansion */}
          <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-1.5">
              <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                <Factory className="w-4 h-4 text-amber-600" />
                <span>3. 全球扩产与资本支出</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-bold">
                CapEx: {activeProfile.fourDimensions.capex.amount}
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-stone-500 font-mono">
                基地分布：<strong className="text-stone-950">{activeProfile.fourDimensions.capex.locations.join(' · ')}</strong>
              </div>
              <p className="text-xs text-stone-700 font-sans leading-snug">
                <strong>主力基地建设：</strong>{activeProfile.fourDimensions.capex.mainProject}
              </p>
            </div>
          </div>

          {/* Dimension 4: M&A & Ecosystem */}
          <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-1.5">
              <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span>4. 战略并购与生态投资</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-bold">
                近1年 {activeProfile.fourDimensions.ma.dealsCount} 笔
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-stone-700 font-sans leading-snug">
                <strong>最新动作：</strong>{activeProfile.fourDimensions.ma.latestDeal}
              </p>
              <div className="text-[11px] text-purple-900 bg-purple-50/60 p-2 rounded border border-purple-100 mt-1">
                🎯 战略意图：{activeProfile.fourDimensions.ma.strategicIntent}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Strategic Moves Timeline & Counter Strategies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Moves Timeline */}
        <div className="lg:col-span-7 bg-white border-2 border-stone-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-950 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#E3120B]" />
              <span>近期关键战略异动监测 (Strategic Moves Log)</span>
            </h4>
          </div>

          <div className="space-y-2.5">
            {activeProfile.recentMoves.map((m, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-stone-200 bg-[#FAF8F5] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.2 rounded bg-stone-900 text-white font-mono text-[10px]">
                      {m.type}
                    </span>
                    <strong className="text-stone-950 font-serif">{m.title}</strong>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">{m.date}</span>
                </div>
                <p className="text-[11px] text-stone-600 font-sans pl-2 border-l-2 border-amber-500 mt-1">
                  ⚡ <strong>深层战略影响：</strong>{m.implication}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Counter-Strategies Box */}
        <div className="lg:col-span-5 bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>我方对标防线与反制决策 (Counter-Strategy)</span>
              </h4>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-0.5">
                <strong className="text-[11px] text-emerald-800 font-serif">🟢 我方差异化优势：</strong>
                <p>{activeProfile.counterStrategy.ourAdvantage}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-950 space-y-0.5">
                <strong className="text-[11px] text-rose-800 font-serif">🔴 核心薄弱短板：</strong>
                <p>{activeProfile.counterStrategy.ourWeakness}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-950 space-y-0.5">
                <strong className="text-[11px] text-amber-800 font-serif">⚡ 当期反制建议：</strong>
                <p className="font-bold">{activeProfile.counterStrategy.immediateAction}</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-stone-400 text-right pt-2">
            战略雷达算法版本：v2.6-enterprise · 每日凌晨自动同步全球专利与工商动向
          </div>
        </div>
      </div>
    </div>
  );
};
