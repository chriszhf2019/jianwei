import React, { useMemo } from 'react';
import type { PredictionContract } from '../../types';
import { Activity, AlertTriangle, Scale } from 'lucide-react';
import {
  calibrationBuckets,
  forecastMetrics,
  predictionOutcomes,
  type ForecastPoint,
} from '../../utils/predictionCalibration';

interface PredictionCalibrationPanelProps {
  contracts: PredictionContract[];
  excludeIds?: Set<string>;
}

export const PredictionCalibrationPanel: React.FC<PredictionCalibrationPanelProps> = ({
  contracts,
  excludeIds = new Set(),
}) => {
  const data = useMemo(() => {
    const userPoints: ForecastPoint[] = [];
    const aiPoints: ForecastPoint[] = [];
    for (const contract of contracts) {
      if (excludeIds.has(contract.id)) continue;
      if (
        contract.ledger !== 'server' ||
        contract.integrityValid !== true ||
        contract.reviewStatus !== 'confirmed'
      ) continue;
      const hit = predictionOutcomes(contract);
      if (!hit) continue;
      userPoints.push({ probability: contract.userPred.confidence / 100, outcome: hit.user });
      aiPoints.push({ probability: contract.aiPred.confidence / 100, outcome: hit.ai });
    }
    const buckets = calibrationBuckets(userPoints, aiPoints);
    return {
      user: forecastMetrics(userPoints),
      ai: forecastMetrics(aiPoints),
      buckets,
    };
  }, [contracts, excludeIds]);

  const sample = data.user.count;
  const missingEvidence = contracts.filter(
    (contract) =>
      !excludeIds.has(contract.id) &&
      contract.status !== 'pending' &&
      !String(contract.actualOutcome || '').trim()
  ).length;
  const awaitingTwoPersonReview = contracts.filter(
    (contract) =>
      !excludeIds.has(contract.id) &&
      contract.status !== 'pending' &&
      contract.reviewStatus !== 'confirmed'
  ).length;
  const enough = sample >= 20;
  const winner =
    enough && data.user.brier !== null && data.ai.brier !== null
      ? data.user.brier < data.ai.brier
        ? '用户在本次样本中 Brier 更低'
        : data.ai.brier < data.user.brier
          ? '模型在本次样本中 Brier 更低'
          : '双方本次 Brier 相同'
      : null;

  return (
    <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-serif font-bold text-stone-100">真实契约校准面板</span>
        </div>
        <span className="text-[10px] font-mono text-stone-400">
          已解决 {sample} 条 · 仅统计真实回测
        </span>
      </div>

      {sample === 0 ? (
        <p className="text-xs text-stone-400">
          暂无已解决的真实契约。完成预测回测后，这里会按概率区间计算命中率，不会用单次结果宣称模型已校准。
          {missingEvidence > 0 ? ` 另有 ${missingEvidence} 条旧记录缺少结果证据，未进入统计。` : ''}
          {awaitingTwoPersonReview > 0 ? ` 另有 ${awaitingTwoPersonReview} 条尚未完成双人复核，未进入统计。` : ''}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: '用户预测', metric: data.user, cls: 'text-red-300' },
              { label: '模型估计', metric: data.ai, cls: 'text-amber-300' },
            ].map((row) => (
              <div key={row.label} className="bg-stone-950 rounded-lg border border-stone-800 p-3">
                <div className="text-[10px] font-mono text-stone-500">{row.label}</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className={`text-lg font-mono font-black ${row.cls}`}>
                    {row.metric.brier ?? '—'}
                  </span>
                  <span className="text-[10px] text-stone-500">Brier 越低越好</span>
                </div>
                <div className="mt-0.5 text-[10px] text-stone-500 font-mono">
                  Log Loss {row.metric.logLoss ?? '—'} · N={row.metric.count}
                </div>
              </div>
            ))}
          </div>

          {!enough && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>当前样本少于 20 条，只展示累计误差，不比较“谁更准”，也不据此判断模型已校准。</span>
            </div>
          )}

          {winner && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-300">
              <Activity className="w-3.5 h-3.5" />
              <span>{winner}；结论仅适用于当前样本，不代表跨领域稳定表现。</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-stone-500 font-mono">
                <tr className="border-b border-stone-700">
                  <th className="text-left py-1.5">预测区间</th>
                  <th className="text-right py-1.5">用户 N / 实际命中</th>
                  <th className="text-right py-1.5">模型 N / 实际命中</th>
                </tr>
              </thead>
              <tbody className="text-stone-300">
                {data.buckets.map((bucket) => (
                  <tr key={bucket.label} className="border-b border-stone-800/70">
                    <td className="py-1.5 font-mono">{bucket.label}</td>
                    <td className="py-1.5 text-right font-mono">
                      {bucket.userCount} / {bucket.userObserved === null ? '—' : `${bucket.userObserved}%`}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {bucket.aiCount} / {bucket.aiObserved === null ? '—' : `${bucket.aiObserved}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-stone-500">
            口径：Brier=(P-O)²，Log Loss 对概率和结果联合评分；预测区间按 20 个百分点分桶。
            模型概率仍为未校准估计，样本达到更大规模后还应检查时间漂移和领域差异。
            只有服务端存证、完整性校验通过且双人复核确认的记录才进入统计。
          </p>
        </>
      )}
    </div>
  );
};
