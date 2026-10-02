import React, { useState, useMemo } from 'react';
import { LogicTreeData, VariableWeight } from '../../types';
import { 
  GitFork, 
  ArrowDown, 
  ArrowUp, 
  ArrowRight,
  Minus, 
  Sparkles, 
  Layers, 
  Sliders, 
  RotateCcw, 
  TrendingUp, 
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  Bookmark
} from 'lucide-react';


interface LogicTreeTabProps {
  logicTree: LogicTreeData;
}

type ScenarioType = 'base' | 'bull' | 'stress';

export const LogicTreeTab: React.FC<LogicTreeTabProps> = ({ logicTree }) => {
  if (!logicTree) {
    return <div className="p-8 text-center text-stone-500">暂无因果逻辑树数据</div>;
  }

  // State for dynamic What-If simulation weights
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    (logicTree.variableWeights || []).forEach(v => {
      initial[v.name] = v.weight;
    });
    return initial;
  });

  const [activeScenario, setActiveScenario] = useState<ScenarioType>('base');
  const [savedSnapshot, setSavedSnapshot] = useState(false);

  // Handle variable weight slider changes
  const handleSliderChange = (name: string, newVal: number) => {
    setActiveScenario('base'); // custom
    setWeights(prev => ({
      ...prev,
      [name]: newVal
    }));
    setSavedSnapshot(false);
  };

  // Scenario presets
  const applyScenario = (scenario: ScenarioType) => {
    setActiveScenario(scenario);
    setSavedSnapshot(false);
    const updated: Record<string, number> = {};
    const defaultList = logicTree.variableWeights || [];

    if (scenario === 'base') {
      defaultList.forEach(v => {
        updated[v.name] = v.weight;
      });
    } else if (scenario === 'bull') {
      // Bull Case: amplify positive drivers, reduce bottlenecks
      defaultList.forEach((v, idx) => {
        if (v.impactDirection === 'up') {
          updated[v.name] = Math.min(80, Math.round(v.weight * 1.5));
        } else if (v.impactDirection === 'down') {
          updated[v.name] = Math.max(10, Math.round(v.weight * 0.6));
        } else {
          updated[v.name] = v.weight;
        }
      });
    } else if (scenario === 'stress') {
      // Stress Case / Black Swan: amplify bottlenecks & regulatory drag
      defaultList.forEach((v) => {
        if (v.impactDirection === 'down' || v.name.includes('审批') || v.name.includes('合规') || v.name.includes('用工') || v.name.includes('通胀')) {
          updated[v.name] = Math.min(85, Math.round(v.weight * 1.8));
        } else {
          updated[v.name] = Math.max(15, Math.round(v.weight * 0.7));
        }
      });
    }
    setWeights(updated);
  };

  // Reset to default
  const handleReset = () => {
    applyScenario('base');
  };

  // 权重 → 冲击分 的纯函数（基准/当前/微扰共用同一口径）
  const scoreWeights = (w: Record<string, number>) => {
    const list = logicTree.variableWeights || [];
    let upWeightedTotal = 0;
    let downWeightedTotal = 0;
    let neutralTotal = 0;
    list.forEach(v => {
      const cur = w[v.name] ?? v.weight;
      if (v.impactDirection === 'up') upWeightedTotal += cur * 1.2;
      else if (v.impactDirection === 'down') downWeightedTotal += cur * 1.1;
      else neutralTotal += cur;
    });
    const netMomentum = upWeightedTotal - downWeightedTotal * 0.7 + neutralTotal * 0.05;
    return {
      shock: Math.min(99, Math.max(25, Math.round(50 + netMomentum * 0.4))),
      up: Math.round(upWeightedTotal),
      down: Math.round(downWeightedTotal),
    };
  };

  // 动态仿真输出：当前配置 vs 基准差分 + 最敏感变量 + 条件化结论
  const simulationMetrics = useMemo(() => {
    const defaultList = logicTree.variableWeights || [];
    const baseline: Record<string, number> = {};
    defaultList.forEach(v => { baseline[v.name] = v.weight; });

    if (defaultList.length === 0) {
      return {
        shockIndex: 75,
        delta: 0,
        direction: 'neutral' as 'bull' | 'bear' | 'neutral',
        speedShift: '基准节奏 (按期)',
        rippleLevel: '中等扩散',
        aiVerdict: '因果动力处于历史均衡区间。',
        mostSensitive: [] as Array<{ name: string; impact: number }>,
        watchSignals: [] as string[],
        isCustom: false,
      };
    }

    const cur = scoreWeights(weights);
    const base = scoreWeights(baseline);
    const delta = cur.shock - base.shock;
    const isCustom = defaultList.some(v => (weights[v.name] ?? v.weight) !== v.weight);

    // 最敏感变量：对每个变量做 ±10% 微扰，取对冲击分影响最大的 Top3
    const sensitivity: Array<{ name: string; impact: number; dir: string }> = [];
    defaultList.forEach(v => {
      const up = scoreWeights({ ...weights, [v.name]: Math.min(95, (weights[v.name] ?? v.weight) + 10) });
      const down = scoreWeights({ ...weights, [v.name]: Math.max(5, (weights[v.name] ?? v.weight) - 10) });
      const impact = Math.abs(up.shock - down.shock);
      sensitivity.push({ name: v.name, impact, dir: v.impactDirection });
    });
    const mostSensitive = sensitivity
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map(s => ({ name: s.name, impact: s.impact }));

    // 传导窗口与涟漪
    let speedShift = '基准节奏传导 (平稳推进)';
    let rippleLevel = '均衡传导';
    if (cur.shock >= 80) { speedShift = '提前 3-6 个月加速爆发'; rippleLevel = '突变级剧烈共振'; }
    else if (cur.shock <= 45) { speedShift = '滞后 4-8 个月缓慢发酵'; rippleLevel = '阻尼衰减震荡'; }

    // 条件化结论（去指令化）：描述相对基准方向 + 让结论失效的条件
    const direction = delta > 8 ? 'bull' : delta < -8 ? 'bear' : 'neutral';
    const watchSignals = mostSensitive.map(s => s.name);
    const directionText = direction === 'bull' ? '比基准更乐观' : direction === 'bear' ? '比基准更悲观' : '与基准基本一致';
    const verdictBase = isCustom
      ? `您的配置 ${directionText}：冲击 ${cur.shock}（基准 ${base.shock}，${delta > 0 ? '+' : ''}${delta}）。`
      : `当前为基准配置：冲击 ${cur.shock}/100。`;
    const signalHint = mostSensitive.length > 0
      ? `对结局影响最大的是「${mostSensitive[0].name}」；建议重点跟踪：${mostSensitive.map(s => s.name).join('、')}。`
      : '';
    const falsify = watchSignals.length > 0
      ? `若上述变量走势与您的假设相反，此结论将失效——届时请切回基准或反向压力测试。`
      : '';
    const aiVerdict = `${verdictBase} ${signalHint} ${falsify}`.trim();

    return {
      shockIndex: cur.shock,
      baseShock: base.shock,
      delta,
      direction,
      speedShift,
      rippleLevel,
      aiVerdict,
      mostSensitive,
      watchSignals,
      isCustom,
    };
  }, [weights, logicTree]);

  // 情景说明（点预设时展示该情景的含义）
  const scenarioNote =
    activeScenario === 'bull'
      ? '高亢爆发：上行驱动 ×1.5、阻尼变量 ×0.6 —— 模拟乐观世界线'
      : activeScenario === 'stress'
        ? '压力测试：审批/合规/用工/通胀等阻力 ×1.8 —— 模拟黑天鹅世界线'
        : '基准情景：回到 AI 原始权重';

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Causal Flow Nodes */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitFork className="w-5 h-5 text-[#E3120B]" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              事件根因与传导链路 (Causal Chain)
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">从始发因到终局影响</span>
        </div>

        {/* Root Cause Banner */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-serif font-bold rounded shrink-0">
            始发根因 (Root Cause)
          </span>
          <span className="text-sm font-serif font-bold text-red-950 leading-snug">
            {logicTree.rootCause}
          </span>
        </div>

        {/* 极简传导拓扑示意图 (Simple Clean Pipeline) */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-serif font-bold text-stone-700">
          <div className="bg-white border border-stone-300 px-3 py-1.5 rounded-lg text-center w-full sm:w-auto">
            <span>🎯 动因触发</span>
          </div>
          <ArrowDown className="w-4 h-4 text-stone-400 sm:hidden" />
          <ArrowRight className="w-4 h-4 text-stone-400 hidden sm:block" />
          <div className="bg-white border border-stone-300 px-3 py-1.5 rounded-lg text-center w-full sm:w-auto">
            <span>⚙️ 产业链逻辑传导</span>
          </div>
          <ArrowDown className="w-4 h-4 text-stone-400 sm:hidden" />
          <ArrowRight className="w-4 h-4 text-stone-400 hidden sm:block" />
          <div className="bg-stone-900 text-white px-3 py-1.5 rounded-lg text-center w-full sm:w-auto shadow-xs">
            <span>💥 终局市场冲击</span>
          </div>
        </div>

        {/* Transmission Nodes */}

        <div className="space-y-3 relative pl-4 border-l-2 border-stone-300 ml-4">
          {logicTree.nodes.map((node, idx) => {
            const isLast = idx === logicTree.nodes.length - 1;
            return (
              <div key={node.id} className="relative pl-6">
                <span className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isLast ? 'bg-[#E3120B]' : 'bg-stone-800'
                }`} />
                
                <div className={`p-4 rounded-xl border ${
                  isLast
                    ? 'bg-[#FAF8F5] border-[#E3120B] shadow-xs'
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-serif font-bold text-stone-900">
                      节点 {idx + 1}：{node.label}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-stone-500 bg-stone-200 px-1.5 py-0.2 rounded">
                      {node.category === 'cause' ? '触发源' : node.category === 'market_impact' ? '市场终局' : '传导链'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed font-sans">
                    {node.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive What-If Simulation Sandbox (动态敏感度沙盒) */}
      <div className="bg-stone-950 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-900 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#E3120B] text-xs font-serif font-bold uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>What-If 敏感度推演沙盒 (Dynamic Causal Simulator)</span>
            </div>
            <h4 className="text-lg font-serif font-bold text-white">
              驱动变量权重交互调节与终局压力测试
            </h4>
            <p className="text-xs text-stone-400">
              拖动下方滑块微调变量权重，系统实时重新计算综合冲击指数、传导速率与次生涟漪烈度。
            </p>
            <p className="text-[10px] text-stone-500 leading-relaxed border-l-2 border-stone-700 pl-2">
              本页只回答“<b>哪个驱动变量一动、冲击如何变</b>”（敏感性），不做事件概率；要可回测的事件概率立约去「人机预测擂台」，要“对我意味着什么”的双向路径去「与我何干 · 双向预测」。
            </p>
          </div>

          {/* Scenario quick presets */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => applyScenario('base')}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${
                activeScenario === 'base'
                  ? 'bg-[#E3120B] text-white shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              基准情景 (Base)
            </button>
            <button
              onClick={() => applyScenario('bull')}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${
                activeScenario === 'bull'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              高亢爆发 (Bull)
            </button>
            <button
              onClick={() => applyScenario('stress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${
                activeScenario === 'stress'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              压力测试 (Stress)
            </button>
            <button
              onClick={handleReset}
              title="重置为默认权重"
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 情景含义说明 */}
        <div className="text-[11px] text-stone-400 -mt-2 border-b border-stone-800/60 pb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{scenarioNote}</span>
          {simulationMetrics.isCustom && activeScenario === 'base' && (
            <span className="ml-auto font-mono text-amber-400">当前为手动微调配置（非基准）</span>
          )}
        </div>

        {/* Dynamic Simulation Output Metrics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-900/90 p-4 rounded-xl border border-stone-800">
          <div className="space-y-1">
            <div className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-red-400" />
              <span>综合终端冲击指数</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-serif font-black text-amber-400 font-mono">
                {simulationMetrics.shockIndex}
              </span>
              <span className="text-xs text-stone-400">/ 100</span>
              {/* 差分 vs 基准 */}
              {(simulationMetrics as any).delta !== undefined && (
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    (simulationMetrics as any).delta > 0
                      ? 'bg-red-950/60 text-red-300'
                      : (simulationMetrics as any).delta < 0
                        ? 'bg-blue-950/60 text-blue-300'
                        : 'bg-stone-800 text-stone-400'
                  }`}
                  title={`相对基准 ${(simulationMetrics as any).baseShock} 的变化`}
                >
                  {(simulationMetrics as any).delta > 0 ? '+' : ''}{(simulationMetrics as any).delta} vs 基准
                </span>
              )}
            </div>
            <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${simulationMetrics.shockIndex}%` }}
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>传导时间窗口预估</span>
            </div>
            <div className="text-sm sm:text-base font-serif font-bold text-white pt-1">
              {simulationMetrics.speedShift}
            </div>
            <div className="text-[10px] text-stone-400">基于驱动力/阻尼比动态推导</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>次生涟漪烈度评级</span>
            </div>
            <div className="text-sm sm:text-base font-serif font-bold text-emerald-400 pt-1">
              {simulationMetrics.rippleLevel}
            </div>
            <div className="text-[10px] text-stone-400">触发多行业供应链洗牌概率</div>
          </div>
        </div>

        {/* AI Dynamic Simulation Verdict（条件化：方向 + 最敏感变量 + 失效条件） */}
        <div className="bg-stone-900 p-4 rounded-xl border-l-4 border-amber-400 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>敏感性推演结论（本地启发式 · 条件化表述）</span>
          </div>
          <p className="text-xs sm:text-sm font-serif text-stone-200 leading-relaxed">
            {simulationMetrics.aiVerdict}
          </p>
          {/* 最敏感变量 Top3 */}
          {simulationMetrics.mostSensitive && simulationMetrics.mostSensitive.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-stone-400">对结局影响最大的变量：</span>
              {simulationMetrics.mostSensitive.map((s, i) => (
                <span
                  key={s.name}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    i === 0 ? 'bg-red-950/70 text-red-300 border-red-800' : 'bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                  title={`±10% 微扰可使冲击指数改变约 ${s.impact} 点`}
                >
                  {s.name} · ±10%→{s.impact}点
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Variable Sliders Grid */}
        <div className="space-y-4 pt-2">
          <div className="text-xs font-mono text-stone-400 uppercase tracking-wider">
            调节影响变量权重 (0% - 100%)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(logicTree.variableWeights || []).map((v) => {
              const currentWeight = weights[v.name] ?? v.weight;
              const isModified = currentWeight !== v.weight;

              return (
                <div 
                  key={v.name}
                  className={`p-4 rounded-xl border transition-all ${
                    isModified 
                      ? 'bg-stone-900 border-amber-500/60 shadow-xs' 
                      : 'bg-stone-900/60 border-stone-800'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 font-serif font-bold text-white">
                      <span>{v.name}</span>
                      {v.impactDirection === 'up' && <ArrowUp className="w-3.5 h-3.5 text-red-400" />}
                      {v.impactDirection === 'down' && <ArrowDown className="w-3.5 h-3.5 text-blue-400" />}
                      {v.impactDirection === 'neutral' && <Minus className="w-3.5 h-3.5 text-stone-400" />}
                    </div>

                    <div className="flex items-center space-x-2">
                      {isModified && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                          已微调
                        </span>
                      )}
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {currentWeight}%
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="95"
                    step="5"
                    value={currentWeight}
                    onChange={(e) => handleSliderChange(v.name, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#E3120B]"
                  />

                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span className="truncate max-w-[200px]">{v.description}</span>
                    <span className="font-mono text-[10px] text-stone-500">
                      基准: {v.weight}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Snapshot / Action row */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
          <span className="text-stone-400 text-[11px]">
            当前为演示用线性加权敏感性沙盒（非真实 AI 模型），调节权重即时重算
          </span>
          <button
            onClick={() => setSavedSnapshot(true)}
            className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg flex items-center space-x-1.5 transition-colors font-serif"
          >
            {savedSnapshot ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">当前方案已标记（未持久化）</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>标记当前方案</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
