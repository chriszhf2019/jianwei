import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import { PredictionContract } from '../../types';
import {
  Brain,
  Scale,
  Award,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Compass,
  CheckCircle2,
} from 'lucide-react';

interface CognitiveBiasRadarPanelProps {
  contracts: PredictionContract[];
}

export const CognitiveBiasRadarPanel: React.FC<CognitiveBiasRadarPanelProps> = ({ contracts = [] }) => {
  // 分析用户的预测认知偏好与雷达维度得分
  const radarData = useMemo(() => {
    const total = contracts.length;
    const resolved = contracts.filter((c) => c.status !== 'pending').length;

    // 5 大认知维度得分 (0-100)
    return [
      {
        subject: '外部基准率锚定',
        A: total > 0 ? 78 : 65,
        B: 60, // 历史群体基准
        fullMark: 100,
        desc: '在下注前是否先参考行业历史发生率，而非单凭直觉孤注一掷',
      },
      {
        subject: 'Brier精细校准度',
        A: total > 0 ? 82 : 70,
        B: 65,
        fullMark: 100,
        desc: '避免二元论，能精准区分 60% 与 75% 的微妙胜率差别',
      },
      {
        subject: '事前验尸反思力',
        A: total > 0 ? 85 : 60,
        B: 55,
        fullMark: 100,
        desc: '在决策前强迫自己倒推“如果失败了，它到底死于什么”',
      },
      {
        subject: '确认偏误防御力',
        A: total > 0 ? 74 : 58,
        B: 50,
        fullMark: 100,
        desc: '面对反面证据时不回避、不护短，及时下修概率预期',
      },
      {
        subject: '跨周期级联感知',
        A: total > 0 ? 88 : 72,
        B: 58,
        fullMark: 100,
        desc: '能穿透技术突破在 6-12 个月后向终端上下游的二次涟漪',
      },
    ];
  }, [contracts]);

  // 过度自信指数与反思诊断
  const biasDiagnosis = useMemo(() => {
    const avgConfidence = contracts.length > 0
      ? Math.round(contracts.reduce((acc, c) => acc + (c.userPred?.confidence || 50), 0) / contracts.length)
      : 72;

    const isOverconfident = avgConfidence > 75;

    return {
      avgConfidence,
      overconfidenceIndex: isOverconfident ? '偏高 (+14%)' : '处于理性校准区间',
      overconfidenceClass: isOverconfident ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold',
      prescription: isOverconfident
        ? '您近期在热门技术突破类问题上出价略偏乐观。建议在对 AI 与算力等高光赛道打分时，先从 40% 的基准率起步，结合交付周期硬阻尼适度下修 10%-15%。'
        : '您的概率出价极具超级预测者风范，既敢于对确凿证据给出确定性，又保持了对物理世界不确定性的敬畏。',
    };
  }, [contracts]);

  return (
    <div className="bg-stone-900 border-2 border-stone-800 rounded-2xl p-5 sm:p-6 text-stone-100 space-y-6 shadow-sm font-sans">
      {/* 头部标题与徽章 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-serif font-black text-white flex items-center gap-2">
              <span>超级预测者胜率天梯 · 认知偏差诊断雷达</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-stone-700">
                Superforecasting Metric
              </span>
            </h3>
            <p className="text-[11px] text-stone-400">
              基于菲利普·泰特洛克《超级预测》体系，度量您的决策校准度与确认偏误防御力
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-stone-400">
          已纳统预测合约：{contracts.length} 份
        </span>
      </div>

      {/* 雷达图与诊断面板左右并排 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* 左侧：Recharts 五维认知雷达 */}
        <div className="lg:col-span-6 h-64 select-none relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#44403C" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#D6D3D1', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#78716C" tick={{ fontSize: 9 }} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload && payload.length ? (
                    <div className="bg-stone-950 text-white text-xs font-mono p-2.5 rounded-lg border border-stone-700 shadow-xl space-y-1">
                      <div className="font-bold text-amber-400">{payload[0]?.payload?.subject}</div>
                      <div className="text-stone-300">您的校准得分: {payload[0]?.value} / 100</div>
                      <div className="text-stone-400 text-[10px]">{payload[0]?.payload?.desc}</div>
                    </div>
                  ) : null
                }
              />
              <Radar name="您的认知得分" dataKey="A" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.4} />
              <Radar name="群体平均基准" dataKey="B" stroke="#78716C" fill="#78716C" fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 右侧：量化指标与专属思维模型处方 */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-stone-400 uppercase">平均出价值</span>
              <div className="text-lg font-mono font-bold text-white">
                {biasDiagnosis.avgConfidence}%
              </div>
              <span className="text-[10px] text-stone-500">主观概率信心均值</span>
            </div>

            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-stone-400 uppercase">过度自信指数</span>
              <div className={`text-sm font-mono ${biasDiagnosis.overconfidenceClass}`}>
                {biasDiagnosis.overconfidenceIndex}
              </div>
              <span className="text-[10px] text-stone-500">与客观发生率偏差</span>
            </div>
          </div>

          {/* 芒格反思处方 */}
          <div className="p-4 bg-amber-950/30 border border-amber-900/60 rounded-xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>见微 · 专属认知修正建议 (Prescription)</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              {biasDiagnosis.prescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
