import React from 'react';
import { MethodBadge } from '../common/MethodBadge';
import {
  AI_PRICE_REFERENCES,
  formatListedUsd,
  type ListedSpend,
  type OmitReason,
} from '../../utils/aiPriceTable';

interface AiUsageView {
  persistedToday?: {
    calls: number;
    tokenReportedCalls: number;
    promptTokens: number;
    outputTokens: number;
  } | null;
  costToday?: (ListedSpend & { estimatedCostUsd?: number | null }) | null;
}

const OMIT_TEXT: Record<OmitReason, string> = {
  not_listed: '价格表没有这个型号',
  context_tier: '单次输入超过这一档标价',
  incomplete_usage: '输入和输出 token 不完整',
};

export const AiCostPanel: React.FC<{ usage?: AiUsageView | null }> = ({ usage }) => {
  const today = usage?.persistedToday;
  const cost = usage?.costToday;
  const calls = today?.calls ?? 0;

  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-serif font-bold text-sm text-stone-950">供应商价格表</h3>
        <MethodBadge methodId="cost_governance" compact />
      </div>
      <p className="text-[11px] text-stone-600 leading-relaxed">
        今日费用只乘下面标明「会计入」的单价。其余标价留在表上，不拿来补一笔估计。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {AI_PRICE_REFERENCES.map((rate) => (
          <div key={rate.id} className="rounded-lg border border-stone-200 bg-white p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif font-bold text-xs text-stone-900">{rate.label}</span>
              <span className={`font-mono text-[10px] ${rate.applied ? 'text-emerald-800' : 'text-stone-500'}`}>
                {rate.applied ? '会计入' : '不乘进费用'}
              </span>
            </div>
            {rate.lines.map((line) => (
              <p key={line} className="text-[11px] text-stone-600 leading-relaxed">{line}</p>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-1 text-xs text-stone-700">
        {!usage ? (
          <p>今日用量还没读到，所以不乘出费用。</p>
        ) : !today || !cost ? (
          <p>用量没有写入数据库，不估算费用。</p>
        ) : calls === 0 ? (
          <p>今日还没有调用，不乘出费用。</p>
        ) : (
          <>
            <p>
              今日调用 {calls} 次。已标价 {cost.pricedCalls} 次，参考费用 {formatListedUsd(cost.listedCostUsd)}。
              未返回 token 的 {cost.unreportedCalls} 次不折算。
            </p>
            {cost.omitted.length > 0 && (
              <ul className="space-y-1">
                {cost.omitted.map((item) => (
                  <li key={`${item.reason}-${item.provider}-${item.model}`} className="font-mono text-[11px] text-stone-600">
                    {item.provider}:{item.model} · {item.calls} 次 · 输入 {item.promptTokens} · 输出 {item.outputTokens} · {OMIT_TEXT[item.reason]}，不估算
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <p className="text-[11px] text-stone-500">{cost?.note || '付费档公开标价不是供应商账单。'}</p>
      </div>
    </section>
  );
};
