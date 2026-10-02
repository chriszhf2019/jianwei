import React, { useState, useMemo } from 'react';
import { NewsArticle, UserPersona } from '../../types';
import {
  Sparkles,
  ShieldAlert,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Briefcase,
  Cpu,
  ShieldCheck,
  Building,
  ArrowRight,
  Download,
  Copy,
  Check,
  Zap,
  Target,
  FileText,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface StrategicActionPlaybookProps {
  selectedPersona: UserPersona;
  contextArticles: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
  onOpenArticleById?: (articleId: string) => void;
  onOpenTermExplain?: (term: string) => void;
}

type RoleTab = 'ceo' | 'investor' | 'cto' | 'compliance';
type TimeframeTab = 'urgent_24h' | 'tactical_30d' | 'strategic_long';

interface PlaybookRecommendation {
  id: string;
  role: RoleTab;
  timeframe: TimeframeTab;
  title: string;
  situationContext: string;
  actionItems: string[];
  riskWarning: string;
  expectedOutcome: string;
  priority: 'high' | 'medium';
  relatedKeywords: string[];
  scenarioLabel: string;
}

export const StrategicActionPlaybook: React.FC<StrategicActionPlaybookProps> = ({
  selectedPersona,
  contextArticles,
  onSelectArticleTitle,
  onOpenArticleById,
  onOpenTermExplain,
}) => {
  const [activeRole, setActiveRole] = useState<RoleTab>('ceo');
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeTab | 'all'>('all');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Recommendations Database
  const recommendations: PlaybookRecommendation[] = useMemo(() => [
    // --- CEO / 战略高管 ---
    {
      id: 'rec_ceo_1',
      role: 'ceo',
      timeframe: 'urgent_24h',
      title: '排查关税原产地规则与散件合资 (CKD) 准入清单',
      situationContext: '海外新一轮反补贴与经贸规则审查收紧，整机出口面临关税壁垒激增风险。',
      actionItems: [
        '盘点未来 2 个季度出口订单中的核心零部件国产化率与增值比例；',
        '向东南亚与拉美属地律所发起《本地合资建厂与 CKD 散件组装政策适配性》加急评估；',
        '锁定关键港口物流与本地分销商保税仓备货，预留 45 天通关缓冲期。',
      ],
      riskWarning: '避免单纯通过第三方转口贸易规避，需建立真实的属地化研发与增值工序。',
      expectedOutcome: '将综合关税冲击从 35% 降至 8% 以内，并锁定属地政策补贴。',
      priority: 'high',
      relatedKeywords: ['逆向本土化', 'CKD散件', '关税壁垒'],
      scenarioLabel: '经贸关税冲击应对',
    },
    {
      id: 'rec_ceo_2',
      role: 'ceo',
      timeframe: 'tactical_30d',
      title: '重构大模型与业务系统采购预算，切入 MoE 架构降本',
      situationContext: '头部模型 API 价格战加剧，同等参数模型推理调用成本大幅下降 70%。',
      actionItems: [
        '叫停传统高溢价专属全尺寸模型的续费谈判，推动团队评估轻量化 MoE 混合专家模型；',
        '要求业务线测算“按任务调用收益”与“底层算力成本”的单位经济模型 (UE)；',
        '将节约的算力预算转移至企业专有数据资产沉淀与工作流自动化系统整合。',
      ],
      riskWarning: '警惕算力供应商超售引发的峰值推理延迟抖动，核心场景需保留双活备用。',
      expectedOutcome: '企业 AI 基础设施年度运营支出降低 40-60%，单次业务履约成本转正。',
      priority: 'high',
      relatedKeywords: ['MoE架构', '单位经济模型', '工作流自动化'],
      scenarioLabel: '技术降本与预算重构',
    },
    {
      id: 'rec_ceo_3',
      role: 'ceo',
      timeframe: 'strategic_long',
      title: '构建全球双轨制供应链与属地化专利防御护城河',
      situationContext: '逆向本土化进入深水区，单纯产品出海必须升级为全要素组织出海。',
      actionItems: [
        '在目标市场设立联合研发中心，参与制定下一代行业能耗与接口国家标准；',
        '在关键核心技术（如电解质配方、光学封装）上建立全球交叉专利许可池；',
        '培养具备跨文化管理与地缘政治合规意识的属地化管理梯队。',
      ],
      riskWarning: '防止母公司核心技术资产在海外合资实体中被稀释或失控。',
      expectedOutcome: '确立目标市场前三地位，抵抗地缘政策周期性波动的抗压能力显著提升。',
      priority: 'medium',
      relatedKeywords: ['逆向本土化', '公差', '期限错配'],
      scenarioLabel: '长期竞争壁垒建设',
    },

    // --- 投资人 / 基金经理 ---
    {
      id: 'rec_inv_1',
      role: 'investor',
      timeframe: 'urgent_24h',
      title: '对传统液态锂电正负极材料过剩产能敞口进行压力测试',
      situationContext: '固态电池中试线运转加速，全固态能量密度突破引发产业链估值重构。',
      actionItems: [
        '量化被投企业中传统湿法隔膜与电解液厂商的应收账款回收周期与资产减值风险；',
        '梳理一级市场硫化物固态电解质、锂金属负极及干法电极设备关键初创项目清单；',
        '在二级市场对纯组装型电池标的收紧估值容忍度，适度对冲周期下行风险。',
      ],
      riskWarning: '全固态量产良品率爬坡仍需 12-18 个月，警惕短期概念过热回调。',
      expectedOutcome: '规避传统落后产能估值腰斩风险，提前锁定下一代材料龙头优先认购权。',
      priority: 'high',
      relatedKeywords: ['公差', '单位经济模型', '期限错配'],
      scenarioLabel: '技术迭代多空对冲',
    },
    {
      id: 'rec_inv_2',
      role: 'investor',
      timeframe: 'tactical_30d',
      title: '严审 AI 落地初创公司的单位经济模型 (UE) 与留存率',
      situationContext: '资本市场已从单纯追求“模型跑分”转向追问“客户愿不愿意持续买单”。',
      actionItems: [
        '核实项目单次任务调用收入是否高于模型推理算力成本 (Token Cost)；',
        '考察企业是否具备专有业务工作流深度绑定能力，而非单纯的套壳 API 包装；',
        '重点投资在细分垂直场景（如跨境报关、工业质检、医疗问答）具备闭环数据的标的。',
      ],
      riskWarning: '通用大模型价格战可能随时降维打击没有专有工作流数据的轻型工具层应用。',
      expectedOutcome: '投资组合整体抗周期性与自我造血能力提高，后续轮次融资胜率提升。',
      priority: 'high',
      relatedKeywords: ['AI Agent', '单位经济模型', '工作流自动化'],
      scenarioLabel: '投资尽调核验标准',
    },

    // --- CTO / 研发与架构负责人 ---
    {
      id: 'rec_cto_1',
      role: 'cto',
      timeframe: 'urgent_24h',
      title: '锁定先进封装与高带宽内存 (HBM3e) 供货排期',
      situationContext: '算力硬件集群扩容遭遇先进封装与光学引擎交付周期延长。',
      actionItems: [
        '复核当前模型训练与线上推理服务集群的算力峰值利用率 (MFU)；',
        '与云厂商及模组供应商签署 Q3/Q4 保供锁价协议，防范现货溢价；',
        '启动模型量化与剪枝技术预研，将 16-bit 浮点推理平滑迁移至 8-bit / 4-bit 混合精度。',
      ],
      riskWarning: '避免过度超额囤积芯片导致下代架构发布后的算力资产减值。',
      expectedOutcome: '线上推理服务 P99 延迟稳定在 150ms 以内，保障核心业务平稳扩展。',
      priority: 'high',
      relatedKeywords: ['HBM', 'CPO光电共封装', '公差'],
      scenarioLabel: '算力架构与资源保障',
    },
    {
      id: 'rec_cto_2',
      role: 'cto',
      timeframe: 'tactical_30d',
      title: '上线端侧轻量化 AI Agent 与混合路由架构',
      situationContext: '端侧芯片 NPU 算力爆发，直接在手机/PC/汽车本地运行模型成为可能。',
      actionItems: [
        '设计“端云协同分流引擎”：简单任务本地秒级完成，复杂推理再回传云端；',
        '重构核心业务流程，引入具备自主调用内部 API 能力的 Agentic 工作流；',
        '在客户端本地建立轻量级向量检索与敏感信息脱敏过滤器。',
      ],
      riskWarning: '端侧发热与功耗控制是用户体验红线，需严格压测持续运行工况。',
      expectedOutcome: '云端带宽与算力成本骤降 55%，用户离线体验与交互响应零延迟。',
      priority: 'high',
      relatedKeywords: ['端侧AI', 'AI Agent', 'MoE架构'],
      scenarioLabel: '端云协同演化',
    },

    // --- 法务与合规总监 ---
    {
      id: 'rec_comp_1',
      role: 'compliance',
      timeframe: 'urgent_24h',
      title: '启动跨国数据跨境传输合规自查与本地脱敏隔离',
      situationContext: '欧洲与跨国司法辖区对 AI 训练语料与用户敏感数据跨境流动处罚趋严。',
      actionItems: [
        '排查跨国业务中调用境外公有云大模型时是否存在明文 PII 数据传输；',
        '部署本地私有化脱敏网关，确保出境前完成不可逆匿名化处理；',
        '更新用户服务协议与隐私条款中关于“AI 模型持续学习”的数据授权范围。',
      ],
      riskWarning: '严禁抱有侥幸心理直接调用未经合规审查的公开第三方境外接口。',
      expectedOutcome: '零合规处罚风险，保障海外应用商店与重点企业客户准入资质。',
      priority: 'high',
      relatedKeywords: ['逆向本土化', '期限错配'],
      scenarioLabel: '数据跨境合规防御',
    },
    {
      id: 'rec_comp_2',
      role: 'compliance',
      timeframe: 'tactical_30d',
      title: '建立产品碳足迹 (CBAM) 全生命周期可信溯源账本',
      situationContext: '跨国碳关税政策正式实施，高耗能硬件与出口工业品面临溯源审查。',
      actionItems: [
        '联合上游供应商采集原材料生产、运输及组装环节的电耗与碳排放因子；',
        '对接国际互认的第三方碳认证机构开展产品碳足迹核查；',
        '在制造基地推行绿电直购与分布式屋顶光伏并网抵消。',
      ],
      riskWarning: '非标准第三方认证可能不被目标国海关采信，必须对齐官方核算白名单。',
      expectedOutcome: '顺利通过海关绿色通关审核，避免被征收惩罚性边境碳调节税。',
      priority: 'medium',
      relatedKeywords: ['逆向本土化', '公差'],
      scenarioLabel: '绿色出海与碳关税应对',
    },
  ], []);

  // Filter recommendations based on activeRole & activeTimeframe
  const filteredRecs = useMemo(() => {
    return recommendations.filter((r) => {
      const matchRole = r.role === activeRole;
      const matchTime = activeTimeframe === 'all' || r.timeframe === activeTimeframe;
      return matchRole && matchTime;
    });
  }, [recommendations, activeRole, activeTimeframe]);

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySummary = () => {
    const lines = filteredRecs.map((r, i) => {
      return `【建议 ${i + 1}】${r.title} (${r.scenarioLabel})\n- 态势背景：${r.situationContext}\n- 关键行动：\n  ${r.actionItems.join('\n  ')}\n- 预期收益：${r.expectedOutcome}\n- 风险预警：${r.riskWarning}\n`;
    });
    const summaryText = `见微 · 全球情报中心战略决策建议备忘录\n针对角色：${activeRole.toUpperCase()}\n生成时间：${new Date().toLocaleDateString()}\n\n${lines.join('\n-------------------\n')}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3120B] text-white">
              <Target className="w-4 h-4" />
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-black text-stone-950">
              全球战略决策行动指南 (Executive Strategic Action Playbook)
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            基于当前全球宏观、赛道突变与微观事件 · 提供分角色、分时效的确定性决策建议清单
          </p>
        </div>

        {/* Action Export Button */}
        <button
          onClick={handleCopySummary}
          className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 border border-stone-300 font-serif font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '已复制建议备忘录' : '一键复制决策备忘录'}</span>
        </button>
      </div>

      {/* Role Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveRole('ceo')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeRole === 'ceo'
              ? 'border-stone-900 bg-stone-900 text-white shadow-md'
              : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <Building className="w-4 h-4 text-amber-400" />
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${activeRole === 'ceo' ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-700'}`}>
              CEO / CSO
            </span>
          </div>
          <div className="font-serif font-bold text-xs mt-2">企业掌舵与战略高管</div>
          <div className={`text-[10px] mt-0.5 ${activeRole === 'ceo' ? 'text-stone-300' : 'text-stone-500'}`}>
            产能布局 · 预算重构 · 组织出海
          </div>
        </button>

        <button
          onClick={() => setActiveRole('investor')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeRole === 'investor'
              ? 'border-stone-900 bg-stone-900 text-white shadow-md'
              : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${activeRole === 'investor' ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-700'}`}>
              Investor
            </span>
          </div>
          <div className="font-serif font-bold text-xs mt-2">投资人与基金经理</div>
          <div className={`text-[10px] mt-0.5 ${activeRole === 'investor' ? 'text-stone-300' : 'text-stone-500'}`}>
            多空对冲 · UE核验 · 周期防御
          </div>
        </button>

        <button
          onClick={() => setActiveRole('cto')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeRole === 'cto'
              ? 'border-stone-900 bg-stone-900 text-white shadow-md'
              : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${activeRole === 'cto' ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-700'}`}>
              CTO / 架构
            </span>
          </div>
          <div className="font-serif font-bold text-xs mt-2">研发总监与技术架构师</div>
          <div className={`text-[10px] mt-0.5 ${activeRole === 'cto' ? 'text-stone-300' : 'text-stone-500'}`}>
            算力保供 · 端侧Agent · 混合路由
          </div>
        </button>

        <button
          onClick={() => setActiveRole('compliance')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeRole === 'compliance'
              ? 'border-stone-900 bg-stone-900 text-white shadow-md'
              : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${activeRole === 'compliance' ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-700'}`}>
              Legal / ESG
            </span>
          </div>
          <div className="font-serif font-bold text-xs mt-2">法务总监与合规审查官</div>
          <div className={`text-[10px] mt-0.5 ${activeRole === 'compliance' ? 'text-stone-300' : 'text-stone-500'}`}>
            数据出境 · 碳关税 · 跨国准入
          </div>
        </button>
      </div>

      {/* Time Horizon Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF8F5] p-2.5 rounded-xl border border-stone-300 text-xs font-serif font-bold">
        <div className="flex items-center gap-1.5 text-stone-700">
          <Clock className="w-3.5 h-3.5 text-stone-500" />
          <span>行动时效级别筛选：</span>
        </div>

        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5 text-xs">
          <button
            onClick={() => setActiveTimeframe('all')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTimeframe === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-950'
            }`}
          >
            全部行动 ({recommendations.filter((r) => r.role === activeRole).length})
          </button>
          <button
            onClick={() => setActiveTimeframe('urgent_24h')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
              activeTimeframe === 'urgent_24h' ? 'bg-red-700 text-white' : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <span>🚨 24H 紧急行动</span>
          </button>
          <button
            onClick={() => setActiveTimeframe('tactical_30d')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
              activeTimeframe === 'tactical_30d' ? 'bg-amber-800 text-white' : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span>⚡ 30D 战术布局</span>
          </button>
          <button
            onClick={() => setActiveTimeframe('strategic_long')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
              activeTimeframe === 'strategic_long' ? 'bg-stone-800 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <span>🏛️ 长期战略壁垒</span>
          </button>
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-4">
        {filteredRecs.map((rec) => {
          const isDone = Boolean(completedItems[rec.id]);
          return (
            <div
              key={rec.id}
              className={`border-2 rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-xs ${
                isDone
                  ? 'border-emerald-300 bg-emerald-50/30 opacity-75'
                  : 'border-stone-800 bg-white hover:border-[#E3120B]'
              }`}
            >
              {/* Top Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => toggleCheck(rec.id, e)}
                    className="cursor-pointer text-stone-400 hover:text-emerald-600 transition-colors"
                    title={isDone ? '标记为未完成' : '标记为已采纳/已执行'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-300">
                    {rec.scenarioLabel}
                  </span>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      rec.timeframe === 'urgent_24h'
                        ? 'bg-red-100 text-red-900 border border-red-300'
                        : rec.timeframe === 'tactical_30d'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {rec.timeframe === 'urgent_24h' ? '🚨 24H 紧急' : rec.timeframe === 'tactical_30d' ? '⚡ 30D 战术' : '🏛️ 长期壁垒'}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {rec.relatedKeywords.map((kw) => (
                    <span
                      key={kw}
                      onClick={() => onOpenTermExplain && onOpenTermExplain(kw)}
                      className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200 font-mono text-[10px] cursor-pointer hover:bg-purple-100 transition-colors"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Title & Context */}
              <div className="space-y-1.5">
                <h4 className={`text-base sm:text-lg font-serif font-black text-stone-950 ${isDone ? 'line-through text-stone-500' : ''}`}>
                  {rec.title}
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  <strong>态势背景：</strong>{rec.situationContext}
                </p>
              </div>

              {/* Action Steps */}
              <div className="bg-[#FAF8F5] border border-stone-300 rounded-xl p-4 space-y-2">
                <div className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#E3120B]" />
                  <span>落地执行关键步骤 (Action Checklist)：</span>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-800 font-sans">
                  {rec.actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="font-mono text-stone-400 shrink-0">{idx + 1}.</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcome & Risk Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <div className="font-serif font-bold text-emerald-950 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>预期决策收益 (Expected Outcome)</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/90 leading-snug">
                    {rec.expectedOutcome}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
                  <div className="font-serif font-bold text-rose-950 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>操作风险预警 (Risk Warning)</span>
                  </div>
                  <p className="text-[11px] text-rose-900/90 leading-snug">
                    {rec.riskWarning}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
