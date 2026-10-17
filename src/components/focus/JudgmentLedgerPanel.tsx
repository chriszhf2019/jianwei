import React, { useMemo } from 'react';
import type { PredictionContract } from '../../types';
import { Activity, CheckCircle2, X } from 'lucide-react';

interface JudgmentLedgerPanelProps {
  contracts: PredictionContract[];
}

/** 用户是否命中：verified_hit_user / verified_both_win 记为命中。 */
function userHit(status: PredictionContract['status']): boolean {
  return status === 'verified_hit_user' || status === 'verified_both_win';
}

/** 判断履历：按回测时间倒序，逐条列出命中/未中、Brier 与复盘，顶部给命中率与平均 Brier。 */
export const JudgmentLedgerPanel: React.FC<JudgmentLedgerPanelProps> = ({ contracts = [] }) => {
  const resolved = useMemo(
    () =>
      contracts
        .filter((c) => c.status !== 'pending')
        .sort((a, b) => (b.resolutionDate || b.createdAt).localeCompare(a.resolutionDate || a.createdAt)),
    [contracts],
  );

  const stats = useMemo(() => {
    const withOutcome = resolved.filter((c) => String(c.actualOutcome || '').trim());
    const hits = withOutcome.filter((c) => userHit(c.status));
    const briers = resolved
      .map((c) => c.brierScore)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return {
      total: resolved.length,
      withOutcome: withOutcome.length,
      hitRate: withOutcome.length ? Math.round((hits.length / withOutcome.length) * 100) : null,
      avgBrier: briers.length ? Math.round((briers.reduce((s, v) => s + v, 0) / briers.length) * 1000) / 1000 : null,
    };
  }, [resolved]);

  const groups = useMemo(() => {
    const map = new Map<string, PredictionContract[]>();
    for (const c of resolved) {
      const raw = (c.resolutionDate || c.createdAt).slice(0, 7);
      const key = /^\d{4}-\d{2}$/.test(raw) ? raw : '未标日期';
      const arr = map.get(key) || [];
      arr.push(c);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [resolved]);

  return (
    <div className="bg-stone-900 border-2 border-stone-800 rounded-2xl p-5 sm:p-6 text-stone-100 space-y-5 shadow-sm font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-serif font-black text-white">判断履历</h3>
            <p className="text-[11px] text-stone-400">已回测的判断按时间倒序，逐条看结果与复盘</p>
          </div>
        </div>
        <span className="text-xs font-mono text-stone-400">已回测 {stats.total} 条</span>
      </div>

      {stats.total === 0 ? (
        <p className="text-xs text-stone-400">
          还没有已回测的判断。签下预测契约、到期录入实际结果后，这里会逐条列出你的命中/未中、Brier 分数与复盘笔记。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1">
              <div className="text-[10px] font-mono text-stone-400 uppercase">总判断</div>
              <div className="text-lg font-mono font-bold text-white">{stats.total}</div>
              <div className="text-[10px] text-stone-500">已回测（含缺证据）</div>
            </div>
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1">
              <div className="text-[10px] font-mono text-stone-400 uppercase">命中率</div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {stats.hitRate === null ? '—' : `${stats.hitRate}%`}
              </div>
              <div className="text-[10px] text-stone-500">命中/有结果（≠校准度）</div>
            </div>
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1">
              <div className="text-[10px] font-mono text-stone-400 uppercase">平均 Brier</div>
              <div className="text-lg font-mono font-bold text-amber-400">
                {stats.avgBrier === null ? '—' : stats.avgBrier}
              </div>
              <div className="text-[10px] text-stone-500">越低越准（0–2）</div>
            </div>
          </div>

          <p className="text-[10px] text-stone-500 leading-relaxed">
            命中率高不代表判断可靠：若你长期报 90% 而命中率只有 60%，是过度自信。校准度请看上方「校准曲线」；命中率只统计「有结果」的条目，缺证据的不计入。
          </p>

          {groups.map(([month, items]) => (
            <div key={month} className="space-y-2">
              <div className="text-[11px] font-mono text-stone-500 border-b border-stone-800 pb-1">
                {month} · {items.length} 条
              </div>
              <div className="space-y-2">
                {items.map((c) => {
                  const hit = userHit(c.status);
                  const hasOutcome = !!String(c.actualOutcome || '').trim();
                  const trusted = c.ledger === 'server' && c.integrityValid === true && c.reviewStatus === 'confirmed';
                  return (
                    <div key={c.id} className="p-3 bg-stone-950/60 border border-stone-800 rounded-lg space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-serif font-bold text-white line-clamp-2">{c.question}</div>
                          <div className="text-[10px] text-stone-500">《{c.articleTitle}》</div>
                        </div>
                        {hasOutcome ? (
                          hit ? (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> 命中
                            </span>
                          ) : (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                              <X className="w-3 h-3" /> 未中
                            </span>
                          )
                        ) : (
                          <span className="shrink-0 text-[10px] font-mono text-stone-500 border border-stone-700 px-2 py-0.5 rounded">缺结果证据</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-400 font-mono">
                        <div>我报：{c.userPred.directionText} · {c.userPred.confidence}%</div>
                        <div>实际：{c.actualOutcome || '未录入'}</div>
                        <div>Brier：{typeof c.brierScore === 'number' ? c.brierScore : '—'}</div>
                        <div className={trusted ? 'text-emerald-500' : 'text-amber-500'}>
                          {trusted ? '服务端存证·已复核' : '未过完整性校验'}
                        </div>
                      </div>

                      {c.reflectionNotes && (
                        <p className="text-[11px] text-stone-300 leading-relaxed">
                          <span className="text-stone-500">复盘：</span>
                          {c.reflectionNotes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
