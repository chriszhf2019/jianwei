import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Activity,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Layers,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Compass,
  Zap,
  PackageCheck,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';

interface SupplyChainStressSimulatorProps {
  articles?: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
}

interface ChokepointScenario {
  id: string;
  name: string;
  category: string;
  originRegion: string;
  globalShare: number; // percentage
  defaultBufferDays: number;
  currentRiskScore: number; // 0 - 100
  keyAffectedIndustries: string[];
  substitutes: Array<{
    name: string;
    source: string;
    readiness: '已量产可替代' | '在测验证中' | '早期研发未就绪';
    capacityShare: number;
    leadTimeMonths: number;
  }>;
  emergencyMeasures: string[];
}

const CHOKEPOINT_SCENARIOS: ChokepointScenario[] = [
  {
    id: 'cowos_packaging',
    name: '先进封测 CoWoS / 晶圆级封装产能',
    category: '算力芯片与半导体',
    originRegion: '亚太 / 中国台湾',
    globalShare: 88,
    defaultBufferDays: 45,
    currentRiskScore: 86,
    keyAffectedIndustries: ['AI 大模型训练卡', '数据中心加速器', '自动驾驶旗舰 SoC'],
    substitutes: [
      { name: 'Intel EMIB 2.5D 封装方案', source: '美国 / 欧洲', readiness: '在测验证中', capacityShare: 18, leadTimeMonths: 6 },
      { name: '国内长电/通富微电 2.5D 先进封测线', source: '中国大陆', readiness: '在测验证中', capacityShare: 24, leadTimeMonths: 4 },
      { name: 'Samsung I-Cube 封装方案', source: '韩国', readiness: '已量产可替代', capacityShare: 15, leadTimeMonths: 3 },
    ],
    emergencyMeasures: [
      '启动双供应商锁定协议，预付 180 天产能保证金锁定备用封测配额',
      '推动下代计算架构向 3D 芯片堆叠与板级光互连 (CPO) 提前演进',
      '调降次级产品算力功耗比要求，采用非 CoWoS 的 Chiplet 散片拼接过渡',
      '向商务合规部门申请海外转口中转保税仓特殊通关许可',
    ],
  },
  {
    id: 'hbm3e_memory',
    name: 'HBM3e / 超高带宽堆叠显存',
    category: '存储与核心元器件',
    originRegion: '韩国 / 日本',
    globalShare: 92,
    defaultBufferDays: 60,
    currentRiskScore: 78,
    keyAffectedIndustries: ['高性能 GPU / TPU', 'AI 边缘计算模组', '高带宽网络交换机'],
    substitutes: [
      { name: 'LPDDR5X 多通道高密度并行方案', source: '国内 / 全球', readiness: '已量产可替代', capacityShare: 35, leadTimeMonths: 2 },
      { name: '长鑫存储下一代高带宽堆叠原型 (研发中)', source: '中国大陆', readiness: '早期研发未就绪', capacityShare: 10, leadTimeMonths: 12 },
      { name: '美光 HBM3e 第二供应商扩产线', source: '美国 / 新加坡', readiness: '在测验证中', capacityShare: 25, leadTimeMonths: 5 },
    ],
    emergencyMeasures: [
      '对战略大客户实行配额限量交付，优先保供核心云端推理集群',
      '联合算法团队优化模型激活值显存占用 (KV Cache 压缩 4x)，缓解带宽渴求',
      '提高现货库存储备天数至 120 天，分批采购二代替代颗粒',
    ],
  },
  {
    id: 'solid_electrolyte',
    name: '硫化物固态电解质关键原材料',
    category: '新能源与高端材料',
    originRegion: '日本 / 德国',
    globalShare: 75,
    defaultBufferDays: 90,
    currentRiskScore: 68,
    keyAffectedIndustries: ['全固态动力电池', 'eVTOL 航空电池', '极寒特种储能'],
    substitutes: [
      { name: '氧化物固态/聚合物复合电解质体系', source: '中国大陆', readiness: '已量产可替代', capacityShare: 60, leadTimeMonths: 1 },
      { name: '国内自研硫化锂 (Li2S) 中试提纯线', source: '中国大陆', readiness: '在测验证中', capacityShare: 30, leadTimeMonths: 4 },
    ],
    emergencyMeasures: [
      '加速半固态过渡方案装车验证，避免单点依赖全固态进口纯度料',
      '与国内上游锂盐龙头共建联合合成实验室，攻克高纯硫化锂降本难关',
    ],
  },
  {
    id: 'photoresist_euv',
    name: 'EUV / ArFi 高端光刻胶与感光引发剂',
    category: '半导体制造材料',
    originRegion: '日本',
    globalShare: 82,
    defaultBufferDays: 35,
    currentRiskScore: 89,
    keyAffectedIndustries: ['7nm 及以下先进制程晶圆代工', '先进制程存储芯片'],
    substitutes: [
      { name: '国内彤程新材 / 南大光电 ArFi 光刻胶认证批次', source: '中国大陆', readiness: '在测验证中', capacityShare: 32, leadTimeMonths: 3 },
      { name: '欧洲默克集团 (Merck KGaA) 特种配方胶', source: '德国', readiness: '已量产可替代', capacityShare: 20, leadTimeMonths: 4 },
    ],
    emergencyMeasures: [
      '在保税区与战略供应链节点建立常温恒湿战略光刻胶安全地窖储备',
      '推动晶圆产线放宽批次容差窗口，加快国产胶上机全流程盲测验证',
    ],
  },
  {
    id: 'heavy_rare_earth',
    name: '高纯镝/铽重稀土与烧结钕铁硼',
    category: '高端制造与电机材料',
    originRegion: '中国大陆',
    globalShare: 94,
    defaultBufferDays: 120,
    currentRiskScore: 62,
    keyAffectedIndustries: ['人形机器人关节电机', '高性能新能源驱动电机', '风电永磁发电机'],
    substitutes: [
      { name: '无重稀土晶界扩散技术钕铁硼', source: '中国/日本', readiness: '已量产可替代', capacityShare: 55, leadTimeMonths: 2 },
      { name: '铁氧体辅助同步磁阻电机方案', source: '欧洲/北美', readiness: '已量产可替代', capacityShare: 25, leadTimeMonths: 6 },
    ],
    emergencyMeasures: [
      '优化电机磁路拓扑设计，全面推广晶界渗透技术，降低单位重稀土用量 60%',
      '布局废旧永磁材料闭环拆解与高纯度镝铽二次萃取产线',
    ],
  },
];

export const SupplyChainStressSimulator: React.FC<SupplyChainStressSimulatorProps> = ({
  articles = [],
  onSelectArticleTitle,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(CHOKEPOINT_SCENARIOS[0].id);
  const [durationDays, setDurationDays] = useState<number>(90);
  const [severityLevel, setSeverityLevel] = useState<'partial' | 'strict' | 'total'>('strict');

  const activeScenario = useMemo(() => {
    return CHOKEPOINT_SCENARIOS.find((s) => s.id === selectedScenarioId) || CHOKEPOINT_SCENARIOS[0];
  }, [selectedScenarioId]);

  // Dynamic simulation calculations
  const simulationResults = useMemo(() => {
    const severityFactor = severityLevel === 'partial' ? 0.35 : severityLevel === 'strict' ? 0.7 : 1.0;
    const effectiveCut = activeScenario.globalShare * severityFactor;
    
    // Safety buffer remaining days under shock
    const bufferDaysRemaining = Math.max(0, Math.round(activeScenario.defaultBufferDays * (1 - severityFactor * 0.75)));
    
    // Potential secondary price surge (%)
    const priceSurgePercent = Math.round(effectiveCut * 1.65 + (durationDays / 30) * 12);
    
    // Chokepoint Vulnerability Index (0 - 100)
    const vulnerabilityScore = Math.min(99, Math.round(activeScenario.currentRiskScore * (0.6 + severityFactor * 0.4)));

    // Generate depletion timeline curve for Recharts
    const timelineData = [];
    const steps = 6;
    const stepDays = durationDays / steps;
    for (let i = 0; i <= steps; i++) {
      const currentDay = Math.round(i * stepDays);
      const normalStock = Math.max(0, 100 - (currentDay / activeScenario.defaultBufferDays) * 100);
      const stockWithShock = Math.max(
        0,
        Math.round(100 - (currentDay / Math.max(10, bufferDaysRemaining)) * 100)
      );
      const substituteFill = Math.min(
        80,
        Math.round((currentDay / durationDays) * 45 * (activeScenario.substitutes.filter((x) => x.readiness !== '早期研发未就绪').length / 2))
      );
      const supplyGap = Math.max(0, 100 - stockWithShock - substituteFill);

      timelineData.push({
        day: `T+${currentDay}D`,
        stock: stockWithShock,
        substitute: substituteFill,
        gap: supplyGap,
      });
    }

    return {
      effectiveCut,
      bufferDaysRemaining,
      priceSurgePercent,
      vulnerabilityScore,
      timelineData,
    };
  }, [activeScenario, durationDays, severityLevel]);

  return (
    <div className="bg-white border-2 border-stone-900 rounded-2xl p-6 sm:p-8 shadow-sm font-sans space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-900 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-rose-600 text-white shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950">
              全球供应链断供压力测试与卡脖子模拟器 (Chokepoint Simulator)
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            假设地缘管制与物理断供极端场景 · 实时推演安全库存消耗倒计时、次生溢价与替代料号就绪度
          </p>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono font-bold">
          <Flame className="w-3.5 h-3.5 text-rose-600" />
          <span>动态应力测试模式</span>
        </div>
      </div>

      {/* Control Panel: Scenario Selector & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#FAF8F5] border border-stone-300 rounded-xl p-5">
        {/* Scenario Selection */}
        <div className="lg:col-span-6 space-y-2">
          <label className="text-xs font-serif font-bold text-stone-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-stone-700" />
            <span>1. 选择卡脖子关键依赖项 (Chokepoint Scenario)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHOKEPOINT_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`text-left p-3 rounded-xl border text-xs font-serif transition-all cursor-pointer ${
                  selectedScenarioId === sc.id
                    ? 'border-rose-600 bg-white shadow-xs text-rose-950 font-bold ring-2 ring-rose-100'
                    : 'border-stone-200 bg-white/70 hover:bg-white text-stone-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-stone-500 font-mono">{sc.category}</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[10px]">
                    占全球 {sc.globalShare}%
                  </span>
                </div>
                <div className="font-bold line-clamp-1">{sc.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Shock Parameters: Duration & Severity */}
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-stone-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-stone-700" />
                <span>2. 设定地缘管制与断供应力参数</span>
              </label>
            </div>

            {/* Severity radio buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-stone-500 font-mono">出口管制与物理断供严苛度：</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'partial', label: '局部配额缩减 (-35%)', desc: '延迟交货' },
                  { id: 'strict', label: '严苛许可证管制 (-70%)', desc: '大面积断供' },
                  { id: 'total', label: '全面物理断供 (-100%)', desc: '极端归零' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setSeverityLevel(lvl.id as any)}
                    className={`p-2 rounded-lg border text-xs text-center transition-all cursor-pointer font-serif ${
                      severityLevel === lvl.id
                        ? 'bg-stone-900 text-white font-bold border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div>{lvl.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration selector */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-stone-500 font-mono">
                <span>断供冲击持续周期：</span>
                <span className="font-bold text-stone-900">{durationDays} 天</span>
              </div>
              <div className="flex items-center space-x-2">
                {[30, 90, 180, 360].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDurationDays(d)}
                    className={`flex-1 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                      durationDays === d
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {d} 天
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Output Dashboard: 3 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Buffer Days */}
        <div className="bg-white border-2 border-stone-300 rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
            <span>安全库存缓冲消耗期</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-black text-stone-950 font-mono">
              {simulationResults.bufferDaysRemaining}
            </span>
            <span className="text-xs text-stone-500 font-medium">天后触及断料红线</span>
          </div>
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${
                simulationResults.bufferDaysRemaining < 30 ? 'bg-rose-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (simulationResults.bufferDaysRemaining / activeScenario.defaultBufferDays) * 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Vulnerability Score */}
        <div className="bg-white border-2 border-rose-200 bg-rose-50/20 rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-mono">
            <span>断供脆弱度综合评分</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-black text-rose-700 font-mono">
              {simulationResults.vulnerabilityScore}
            </span>
            <span className="text-xs text-rose-600 font-serif font-bold">
              / 100 ({simulationResults.vulnerabilityScore > 80 ? '极度危险' : '高危承压'})
            </span>
          </div>
          <p className="text-[11px] text-rose-800 font-sans mt-1">
            产地集中度高，前序备货窗口紧迫
          </p>
        </div>

        {/* Metric 3: Price Spike */}
        <div className="bg-white border-2 border-stone-300 rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
            <span>次生现货溢价预警</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-black text-purple-700 font-mono">
              +{simulationResults.priceSurgePercent}%
            </span>
            <span className="text-xs text-purple-600 font-medium">采购溢价幅度</span>
          </div>
          <p className="text-[11px] text-stone-600 font-sans mt-1">
            替代料号产能爬坡存在时间差
          </p>
        </div>
      </div>

      {/* Simulation Recharts: Inventory Depletion vs Supply Gap */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
          <div>
            <h4 className="font-serif font-bold text-sm sm:text-base text-stone-950 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>库存消耗曲线与供需缺口演变沙盘 (Inventory vs Supply Gap)</span>
            </h4>
            <p className="text-[11px] text-stone-500">
              绿色=原生库存余量 ｜ 蓝色=备选替代产能弥补 ｜ 红色=产线面临停工的净供需缺口
            </p>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> 原生安全库存
            </span>
            <span className="flex items-center gap-1 text-sky-700 font-bold">
              <span className="w-2.5 h-2.5 bg-sky-500 rounded-xs" /> 替代产能弥补
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-bold">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" /> 净断供缺口
            </span>
          </div>
        </div>

        <div className="w-full h-48 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulationResults.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload && payload.length ? (
                    <div className="bg-stone-900 text-white text-xs font-mono p-2.5 rounded-lg shadow-lg space-y-1">
                      <div className="font-bold text-stone-200 border-b border-stone-700 pb-1">{label}</div>
                      <div className="text-emerald-400">原生库存: {payload[0]?.value}%</div>
                      <div className="text-sky-400">替代弥补: {payload[1]?.value}%</div>
                      <div className="text-rose-400 font-bold">断供缺口: {payload[2]?.value}%</div>
                    </div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="stock" stackId="1" stroke="#059669" fill="#10B981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="substitute" stackId="1" stroke="#0284C7" fill="#38BDF8" fillOpacity={0.6} />
              <Area type="monotone" dataKey="gap" stackId="1" stroke="#E11D48" fill="#F43F5E" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Substitutes Matrix & Emergency Measures */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Substitutes Readiness Table */}
        <div className="lg:col-span-7 bg-[#FAF8F5] border border-stone-300 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>备选替代料号与第二供应商就绪度矩阵</span>
            </h4>
            <span className="text-[10px] font-mono text-stone-500">
              {activeScenario.substitutes.length} 项备选方案
            </span>
          </div>

          <div className="space-y-2.5">
            {activeScenario.substitutes.map((sub, idx) => (
              <div key={idx} className="bg-white border border-stone-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-serif font-bold text-xs text-stone-950">
                    {sub.name}
                  </div>
                  <span
                    className={`text-[10px] font-serif font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      sub.readiness === '已量产可替代'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.readiness === '在测验证中'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {sub.readiness}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-500 font-mono gap-2 pt-1 border-t border-stone-100">
                  <span>产地：{sub.source}</span>
                  <span>可替代产能份额：<strong className="text-stone-800">{sub.capacityShare}%</strong></span>
                  <span>验证周期：<strong className="text-stone-800">{sub.leadTimeMonths} 个月</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Action Plan */}
        <div className="lg:col-span-5 bg-white border-2 border-stone-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>应急保供 4 大 SOP 行动预案</span>
            </h4>
          </div>

          <div className="space-y-2">
            {activeScenario.emergencyMeasures.map((measure, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-stone-700 font-sans">
                <span className="w-4 h-4 rounded-full bg-stone-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-snug">{measure}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
