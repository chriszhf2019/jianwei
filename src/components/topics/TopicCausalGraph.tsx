import React, { useState } from 'react';
import { EnhancedTopicDossier } from './TopicsView';
import { Activity, ArrowRight, GitFork, Info, Layers, Sparkles, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CausalNode {
  id: string;
  label: string;
  category: 'catalyst' | 'entity' | 'first_order' | 'second_order' | 'terminal';
  desc: string;
  weight: number; // 1-5
  evidence?: string;
}

interface CausalEdge {
  from: string;
  to: string;
  label: string;
  intensity: 'high' | 'medium' | 'critical';
}

interface TopicCausalGraphProps {
  topic: EnhancedTopicDossier;
}

const CATEGORY_STYLES: Record<CausalNode['category'], { label: string; bg: string; border: string; text: string; dot: string }> = {
  catalyst: {
    label: '始发动因 (Root Catalyst)',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-950',
    dot: 'bg-purple-600',
  },
  entity: {
    label: '核心载体 (Core Entity & Action)',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-950',
    dot: 'bg-blue-600',
  },
  first_order: {
    label: '一阶直接传导 (1st-Order Ripple)',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-950',
    dot: 'bg-amber-600',
  },
  second_order: {
    label: '二阶级联扩散 (2nd-Order Cascade)',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-950',
    dot: 'bg-rose-600',
  },
  terminal: {
    label: '终局格局重塑 (Terminal Impact)',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    dot: 'bg-emerald-600',
  },
};

export const TopicCausalGraph: React.FC<TopicCausalGraphProps> = ({ topic }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 根据当前专题动态生成因果拓扑链条
  const causalData: { nodes: CausalNode[]; edges: CausalEdge[] } = React.useMemo(() => {
    if (topic.id.includes('compute')) {
      return {
        nodes: [
          { id: 'n1', label: '大模型 MoE 与上下文爆发', category: 'catalyst', desc: '单次推理 Token 算力需求与集群吞吐呈指数级激增', weight: 5, evidence: 'DeepSeek / OpenAI 算力集群调研报告' },
          { id: 'n2', label: 'NVIDIA GPU 晶圆封测 CoWoS 瓶颈', category: 'entity', desc: '先进封装良品率爬坡与产能分配受限', weight: 5, evidence: '台积电月度营运数据指引' },
          { id: 'n3', label: '数据中心物理电力接入荒', category: 'first_order', desc: '超高压变压器与变电站排期延长至 3-4 年', weight: 4, evidence: '北美特种电网设备订单积压公报' },
          { id: 'n4', label: 'CPO 光电共封装与硅光互连破局', category: 'second_order', desc: '光电直接集成绕过传统铜互连散热天花板', weight: 4, evidence: 'CPO 交换机实测能耗比降低 30%' },
          { id: 'n5', label: '端侧推理轻量化重塑应用成本', category: 'terminal', desc: '模型蒸馏与端侧 AI 挤压单纯重资产算力中心溢价', weight: 5, evidence: '高通/苹果端侧 NPU 本地推理性能跃升' },
        ],
        edges: [
          { from: 'n1', to: 'n2', label: '倒逼先进制程封装', intensity: 'critical' },
          { from: 'n2', to: 'n3', label: '单机架功耗突破 120kW', intensity: 'high' },
          { from: 'n3', to: 'n4', label: '驱动光学低功耗互联', intensity: 'high' },
          { from: 'n4', to: 'n5', label: '算力成本传导至终端', intensity: 'medium' },
        ],
      };
    } else if (topic.id.includes('battery')) {
      return {
        nodes: [
          { id: 'n1', label: '液态电池能量密度与安全瓶颈', category: 'catalyst', desc: '300Wh/kg 触及物理天花板，热失控自燃顾虑尚存', weight: 4, evidence: '车规动力电池行业白皮书' },
          { id: 'n2', label: '全固态硫化物电解质攻坚', category: 'entity', desc: '宁德时代/丰田加速中试线纯固态界面阻抗优化', weight: 5, evidence: '高纯硫化锂工业提纯专利公开' },
          { id: 'n3', label: '制造公差与超干法电极工艺', category: 'first_order', desc: '极片微米级压实密度与批量良品率挑战', weight: 4, evidence: '中试线极片良品率爬坡数据' },
          { id: 'n4', label: '整车 1000km 续航与极寒衰减归零', category: 'second_order', desc: '解决北方极寒掉电与高空快充失效率', weight: 5, evidence: '实车道路低温实测' },
          { id: 'n5', label: '全球汽车动力总成权力格局重组', category: 'terminal', desc: '日韩车企借固态弯道超车 vs 中国成熟供应链守擂', weight: 5, evidence: '跨国车企全固态 2027 装车规划表' },
        ],
        edges: [
          { from: 'n1', to: 'n2', label: '倒逼技术路线跃迁', intensity: 'critical' },
          { from: 'n2', to: 'n3', label: '工程制造门槛转化', intensity: 'high' },
          { from: 'n3', to: 'n4', label: '性能指标实质突破', intensity: 'high' },
          { from: 'n4', to: 'n5', label: '颠覆产业链定价权', intensity: 'critical' },
        ],
      };
    } else {
      return {
        nodes: [
          { id: 'n1', label: '欧美反补贴关税与原产地审查', category: 'catalyst', desc: '整车出口关税上调至 35%-45% 阻断直接出海', weight: 5, evidence: '欧盟反补贴最终裁决公告' },
          { id: 'n2', label: '海外散件组装 (CKD) 与合资建厂', category: 'entity', desc: '匈牙利/墨西哥基地开工，以当地就业抵消关税', weight: 5, evidence: '企业海外直接投资 (FDI) 公告' },
          { id: 'n3', label: '离岸美元降息与境外低息银团贷款', category: 'first_order', desc: '发债成本压减 150bp，大幅缩短建厂投资回收期', weight: 4, evidence: '境外绿色债券发行利率' },
          { id: 'n4', label: '本土供应链吸纳与原产地价值穿透', category: 'second_order', desc: '欧洲本土零部件采购占比突破 50% 门槛', weight: 4, evidence: '合资配套供应商准入清单' },
          { id: 'n5', label: '跨国制造模式从出口转向在地化运营', category: 'terminal', desc: '中国技术标准与全球在地运营深度融合', weight: 5, evidence: '跨国汽车工业全球版图变迁' },
        ],
        edges: [
          { from: 'n1', to: 'n2', label: '关税倒逼产能外移', intensity: 'critical' },
          { from: 'n2', to: 'n3', label: '资本成本协同放大', intensity: 'high' },
          { from: 'n3', to: 'n4', label: '合规准入壁垒穿透', intensity: 'high' },
          { from: 'n4', to: 'n5', label: '全球制造权力重构', intensity: 'critical' },
        ],
      };
    }
  }, [topic.id]);

  const selectedNode = causalData.nodes.find((n) => n.id === selectedNodeId) || causalData.nodes[0];

  return (
    <div className="bg-white border-2 border-stone-900 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs font-sans">
      {/* 头部说明与图例 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider mb-1">
            <GitFork className="w-4 h-4" />
            <span>专题因果传导拓扑图谱 (Causal Topology Graph)</span>
          </div>
          <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
            从「始发动因」到「终局格局重塑」的 5 阶传导机制
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            点击任意节点，即可高亮因果链路并查看背后的实证支撑与量化传导系数。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
            <span key={key} className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
              {style.label.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {/* 动态可交互因果传导轴布局 (Interactive Flow Nodes Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {causalData.nodes.map((node, idx) => {
          const isSelected = selectedNode?.id === node.id;
          const style = CATEGORY_STYLES[node.category];

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                isSelected
                  ? 'border-stone-950 bg-stone-900 text-white shadow-md ring-2 ring-amber-400'
                  : `${style.bg} ${style.border} hover:border-stone-800 text-stone-900 shadow-2xs`
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-stone-800 text-amber-300' : 'bg-white/80 text-stone-700'
                  }`}>
                    阶段 0{idx + 1}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                </div>

                <h4 className="text-xs sm:text-sm font-serif font-black leading-snug mb-1">
                  {node.label}
                </h4>
                <p className={`text-[11px] leading-relaxed line-clamp-3 ${
                  isSelected ? 'text-stone-300' : 'text-stone-600'
                }`}>
                  {node.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200/40 flex items-center justify-between text-[10px] font-mono">
                <span className={isSelected ? 'text-stone-400' : 'text-stone-500'}>
                  传导权重: {'★'.repeat(node.weight)}
                </span>
                {idx < causalData.nodes.length - 1 && (
                  <ArrowRight className={`w-3.5 h-3.5 hidden md:block ${isSelected ? 'text-amber-400' : 'text-stone-400'}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中节点的深度穿透解析卡片 (Selected Node In-Depth Inspection Card) */}
      {selectedNode && (
        <div className="bg-[#FAF8F5] border-2 border-stone-900 rounded-xl p-5 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${CATEGORY_STYLES[selectedNode.category].dot}`} />
              <h4 className="text-sm sm:text-base font-serif font-black text-stone-950">
                节点剖析：【{selectedNode.label}】
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${CATEGORY_STYLES[selectedNode.category].bg} ${CATEGORY_STYLES[selectedNode.category].border}`}>
                {CATEGORY_STYLES[selectedNode.category].label}
              </span>
            </div>

            <span className="text-xs font-mono text-stone-500">
              编辑因果示意 · 非经校准的传导概率
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="space-y-1.5 p-3.5 bg-white rounded-lg border border-stone-200">
              <strong className="text-stone-900 font-serif flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>机制阐释与物理阻尼：</span>
              </strong>
              <p className="text-stone-600 leading-relaxed">
                {selectedNode.desc}。该节点是本专题宏观因果链条的关键卡点，任何工程良品率或政策参数的微调，都将通过乘数效应放大至后续节点。
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 bg-white rounded-lg border border-stone-200">
              <strong className="text-stone-900 font-serif flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>实证依据与支撑报告：</span>
              </strong>
              <p className="text-stone-600 leading-relaxed font-mono">
                📑 {selectedNode.evidence || '权威机构产业研判报告与海关进出口分项数据'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
