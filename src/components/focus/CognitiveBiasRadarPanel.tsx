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
  Sparkles,
} from 'lucide-react';

interface CognitiveBiasRadarPanelProps {
  contracts: PredictionContract[];
}

/** 仅展示可从契约字段直接复核的统计；样本不足时不画伪雷达分。 */
export const CognitiveBiasRadarPanel: React.FC<CognitiveBiasRadarPanelProps> = ({ contracts = [] }) => {
  const stats = useMemo(() => {
    const total = contracts.length;
    const withConfidence = contracts.filter((c) => typeof c.userPred?.confidence === 'number');
    const resolved = contracts.filter((c) => c.status && c.status !== 'pending');
    const avgConfidence =
      withConfidence.length > 0
        ? Math.round(
            withConfidence.reduce((acc, c) => acc + Number(c.userPred?.confidence || 0), 0) /
              withConfidence.length
          )
        : null;

    const highConfidence = withConfidence.filter((c) => Number(c.userPred?.confidence) > 75).length;
    const highShare =
      withConfidence.length > 0 ? Math.round((highConfidence / withConfidence.length) * 100) : null;

    // 五维雷达只在有足够「已出价」样本时展示，且分值来自可复核比例，不做群体假基准。
    const canDrawRadar = withConfidence.length >= 3;
    const radarData = canDrawRadar
      ? [
          {
            subject: '已出价覆盖',
            A: Math.min(100, Math.round((withConfidence.length / Math.max(1, total)) * 100)),
            fullMark: 100,
            desc: '有主观概率出价的契约占比',
          },
          {
            subject: '高置信占比',
            A: highShare ?? 0,
            fullMark: 100,
            desc: '出价 >75% 的契约占比（越高越需警惕过度自信）',
          },
          {
            subject: '已结算占比',
            A: Math.min(100, Math.round((resolved.length / Math.max(1, total)) * 100)),
            fullMark: 100,
            desc: '非 pending 契约占比；结算后才可谈校准',
          },
          {
            subject: '平均出价',
            A: avgConfidence ?? 0,
            fullMark: 100,
            desc: '主观概率均值（不是命中率）',
          },
          {
            subject: '样本充足度',
            A: Math.min(100, withConfidence.length * 10),
            fullMark: 100,
            desc: '有出价样本数×10，封顶 100；少于 3 条不画雷达',
          },
        ]
      : [];

    return {
      total,
      withConfidence: withConfidence.length,
      resolved: resolved.length,
      avgConfidence,
      highShare,
      canDrawRadar,
      radarData,
      note:
        withConfidence.length === 0
          ? '尚无带主观概率的预测契约。录入出价后，这里只展示可复核占比与均值，不生成伪「超级预测」得分。'
          : withConfidence.length < 3
            ? `当前仅 ${withConfidence.length} 条有出价样本（需 ≥3 才画雷达）。平均出价 ${avgConfidence ?? '—'}%，不是校准命中率。`
            : `雷达五维均来自契约字段占比/均值，不是经历史结果校准的能力评分；也没有群体对照真值。`,
    };
  }, [contracts]);

  return (
    <div className="bg-stone-900 border-2 border-stone-800 rounded-2xl p-5 sm:p-6 text-stone-100 space-y-6 shadow-sm font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-serif font-black text-white">
              预测出价对照 · 认知偏差提示
            </h3>
            <p className="text-[11px] text-stone-400">
              只汇总您已记录的主观概率与结算状态；不伪造能力雷达分或群体基准
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-stone-400">
          契约 {stats.total} · 有出价 {stats.withConfidence} · 已结算 {stats.resolved}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-6 h-64 select-none relative">
          {stats.canDrawRadar ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.radarData}>
                <PolarGrid stroke="#44403C" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#D6D3D1', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#78716C" tick={{ fontSize: 9 }} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <div className="bg-stone-950 text-white text-xs font-mono p-2.5 rounded-lg border border-stone-700 shadow-xl space-y-1">
                        <div className="font-bold text-amber-400">{payload[0]?.payload?.subject}</div>
                        <div className="text-stone-300">相对分: {payload[0]?.value} / 100</div>
                        <div className="text-stone-400 text-[10px]">{payload[0]?.payload?.desc}</div>
                      </div>
                    ) : null
                  }
                />
                <Radar name="可复核占比/均值" dataKey="A" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.4} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-stone-700 bg-stone-950/50 px-6 text-center">
              <p className="text-xs text-stone-400 leading-relaxed font-sans">{stats.note}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-stone-400 uppercase">平均出价</span>
              <div className="text-lg font-mono font-bold text-white">
                {stats.avgConfidence == null ? '—' : `${stats.avgConfidence}%`}
              </div>
              <span className="text-[10px] text-stone-500">主观概率均值 · 非命中率</span>
            </div>

            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-stone-400 uppercase">高置信占比</span>
              <div className="text-sm font-mono text-amber-300 font-bold">
                {stats.highShare == null ? '—' : `${stats.highShare}%`}
              </div>
              <span className="text-[10px] text-stone-500">出价 &gt;75% 的比例</span>
            </div>
          </div>

          <div className="p-4 bg-amber-950/30 border border-amber-900/60 rounded-xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>口径说明</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed font-sans">{stats.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
