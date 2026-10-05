/**
 * 供应商公开标价。只保存能唯一对应到一次调用的单价。
 * 缓存命中、峰谷和超过分档的长上下文不在这里折中取值。
 */

export interface AppliedTokenPrice {
  provider: string;
  model: string;
  label: string;
  inputPerMillion: number;
  outputPerMillion: number;
  /** 单次输入 token 超过该值时，这档标价不适用。 */
  maxPromptTokens?: number;
}

export interface PriceReference {
  id: string;
  label: string;
  /** 为 false 时只展示标价，不乘进今日费用。 */
  applied: boolean;
  lines: string[];
  source: string;
}

export const LISTED_COST_NOTE =
  '只乘付费档公开标价。没有返回 token、价格表对不上、或一次输入超过标价分档的调用，不估算。这不是供应商账单。';

const APPLIED_PRICES: AppliedTokenPrice[] = [
  {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash 文本',
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
  },
  {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    maxPromptTokens: 200_000,
  },
];

export const AI_PRICE_REFERENCES: PriceReference[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    applied: true,
    lines: [
      '付费档标准价，文本、图像和视频输入：每百万 token 0.30 美元。',
      '输出：每百万 token 2.50 美元。音频、缓存、批处理和免费档不使用这个单价。',
    ],
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    applied: true,
    lines: [
      '付费档标准价，单次输入不超过 20 万 token：输入每百万 token 1.25 美元，输出每百万 token 10 美元。',
      '单次输入超过 20 万 token 时官网另有标价，这里不估算。',
    ],
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    applied: false,
    lines: [
      'deepseek-flash 非高峰：缓存未命中输入每百万 token 0.15 美元，缓存命中 0.003 美元，输出 0.60 美元。',
      '高峰（UTC 周一至周五 01:00–04:00 与 06:00–10:00，不含中国法定假日）为上述价格的两倍。',
      '用量记录分不出缓存命中，也没有法定假日表，所以不把这些价格乘进今日费用。',
      'deepseek-chat 和 deepseek-reasoner 不在当前价目页上，不另估。',
    ],
    source: 'https://api-docs.deepseek.com/quick_start/pricing',
  },
];

export interface UsageEventForPrice {
  provider: string;
  model: string;
  promptTokens: number | null;
  outputTokens: number | null;
}

export type OmitReason = 'not_listed' | 'context_tier' | 'incomplete_usage';

export interface OmittedSpend {
  provider: string;
  model: string;
  calls: number;
  promptTokens: number;
  outputTokens: number;
  reason: OmitReason;
}

export interface ListedSpend {
  listedCostUsd: number | null;
  pricedCalls: number;
  unreportedCalls: number;
  omitted: OmittedSpend[];
  note: string;
}

function priceFor(provider: string, model: string): AppliedTokenPrice | null {
  return APPLIED_PRICES.find((item) => item.provider === provider && item.model === model) || null;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function summarizeListedSpend(events: UsageEventForPrice[]): ListedSpend {
  let usd = 0;
  let pricedCalls = 0;
  let unreportedCalls = 0;
  const omitted = new Map<string, OmittedSpend>();

  const remember = (
    event: UsageEventForPrice,
    reason: OmitReason,
    promptTokens: number,
    outputTokens: number,
  ) => {
    const key = `${reason}\n${event.provider}\n${event.model}`;
    const current = omitted.get(key) || {
      provider: event.provider,
      model: event.model,
      calls: 0,
      promptTokens: 0,
      outputTokens: 0,
      reason,
    };
    current.calls += 1;
    current.promptTokens += promptTokens;
    current.outputTokens += outputTokens;
    omitted.set(key, current);
  };

  for (const event of events) {
    const provider = String(event.provider || '').trim();
    const model = String(event.model || '').trim();
    const named = { provider, model, promptTokens: event.promptTokens, outputTokens: event.outputTokens };
    if (event.promptTokens == null || event.outputTokens == null) {
      unreportedCalls += 1;
      continue;
    }
    const promptTokens = Number(event.promptTokens);
    const outputTokens = Number(event.outputTokens);
    if (!Number.isFinite(promptTokens) || !Number.isFinite(outputTokens) || promptTokens < 0 || outputTokens < 0) {
      remember(named, 'incomplete_usage', 0, 0);
      continue;
    }
    if (promptTokens === 0 && outputTokens === 0) {
      unreportedCalls += 1;
      continue;
    }
    const price = priceFor(provider, model);
    if (!price) {
      remember(named, 'not_listed', promptTokens, outputTokens);
      continue;
    }
    if (price.maxPromptTokens != null && promptTokens > price.maxPromptTokens) {
      remember(named, 'context_tier', promptTokens, outputTokens);
      continue;
    }
    usd += (promptTokens / 1_000_000) * price.inputPerMillion + (outputTokens / 1_000_000) * price.outputPerMillion;
    pricedCalls += 1;
  }

  return {
    listedCostUsd: pricedCalls > 0 ? roundUsd(usd) : null,
    pricedCalls,
    unreportedCalls,
    omitted: [...omitted.values()].sort((a, b) => a.model.localeCompare(b.model) || a.reason.localeCompare(b.reason)),
    note: LISTED_COST_NOTE,
  };
}

export function formatListedUsd(value: number | null): string {
  if (value == null) return '不估算';
  if (value > 0 && value < 0.0001) return '不足 0.0001 美元';
  return `${value.toFixed(4)} 美元`;
}
