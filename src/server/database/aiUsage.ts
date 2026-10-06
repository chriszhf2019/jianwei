import fs from "node:fs";
import { DB_FILE, openDatabase } from "./connection";

function startOfLocalDayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export function getAiUsageToday(): {
  calls: number;
  promptChars: number;
  outputChars: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokenReportedCalls: number;
} {
  if (!fs.existsSync(DB_FILE)) {
    return { calls: 0, promptChars: 0, outputChars: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0, tokenReportedCalls: 0 };
  }
  const db = openDatabase();
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) AS calls,
        COALESCE(SUM(prompt_chars), 0) AS promptChars,
        COALESCE(SUM(output_chars), 0) AS outputChars,
        COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
        COALESCE(SUM(output_tokens), 0) AS outputTokens,
        COALESCE(SUM(total_tokens), 0) AS totalTokens,
        COALESCE(SUM(CASE WHEN total_tokens IS NOT NULL THEN 1 ELSE 0 END), 0) AS tokenReportedCalls
      FROM ai_usage_events
      WHERE at >= ?
    `).get(startOfLocalDayIso()) as Record<string, number>;
    return {
      calls: Number(row?.calls || 0),
      promptChars: Number(row?.promptChars || 0),
      outputChars: Number(row?.outputChars || 0),
      promptTokens: Number(row?.promptTokens || 0),
      outputTokens: Number(row?.outputTokens || 0),
      totalTokens: Number(row?.totalTokens || 0),
      tokenReportedCalls: Number(row?.tokenReportedCalls || 0),
    };
  } finally {
    db.close();
  }
}

/**
 * AI 模型参考价格表（USD per 1M tokens）。
 * 来源：各供应商官网公开定价（2025-09 参考），实际价格以供应商官网为准。
 * 未列出的模型按 provider 默认价估算；无法匹配时返回 null。
 */
const AI_PRICE_TABLE: Record<string, { input: number; output: number; label: string }> = {
  // DeepSeek
  "deepseek:deepseek-chat": { input: 0.14, output: 0.28, label: "DeepSeek Chat" },
  "deepseek:deepseek-reasoner": { input: 0.55, output: 2.19, label: "DeepSeek Reasoner" },
  // Gemini
  "gemini:gemini-2.0-flash": { input: 0.1, output: 0.4, label: "Gemini 2.0 Flash" },
  "gemini:gemini-1.5-flash": { input: 0.075, output: 0.3, label: "Gemini 1.5 Flash" },
  "gemini:gemini-1.5-pro": { input: 1.25, output: 5.0, label: "Gemini 1.5 Pro" },
};

const PROVIDER_DEFAULT_PRICE: Record<string, { input: number; output: number }> = {
  deepseek: { input: 0.27, output: 1.1 }, // DeepSeek 均值
  gemini: { input: 0.1, output: 0.4 },   // Gemini Flash 默认
};

export function estimateAiCost(provider: string, model: string, promptTokens: number, outputTokens: number): number | null {
  if (promptTokens <= 0 && outputTokens <= 0) return null;
  const key = `${provider}:${model}`;
  const price = AI_PRICE_TABLE[key] || PROVIDER_DEFAULT_PRICE[provider];
  if (!price) return null;
  const cost = (promptTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
  return Math.round(cost * 10000) / 10000; // 保留 4 位小数
}

export function getAiCostToday(): { estimatedCostUsd: number | null; priceSource: string } {
  if (!fs.existsSync(DB_FILE)) {
    return { estimatedCostUsd: null, priceSource: "无数据" };
  }
  const db = openDatabase();
  try {
    const rows = db.prepare(`
      SELECT provider, model,
        COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
        COALESCE(SUM(output_tokens), 0) AS outputTokens
      FROM ai_usage_events
      WHERE at >= ? AND total_tokens IS NOT NULL
      GROUP BY provider, model
    `).all(startOfLocalDayIso()) as Array<{ provider: string; model: string; promptTokens: number; outputTokens: number }>;
    let total = 0;
    let hasAny = false;
    for (const row of rows) {
      const cost = estimateAiCost(row.provider, row.model, Number(row.promptTokens || 0), Number(row.outputTokens || 0));
      if (cost != null) { total += cost; hasAny = true; }
    }
    return {
      estimatedCostUsd: hasAny ? Math.round(total * 10000) / 10000 : null,
      priceSource: "供应商官网公开定价（2025-09 参考）",
    };
  } finally {
    db.close();
  }
}


export function recordAiUsageEvent(input: {
  at?: string;
  provider: string;
  model: string;
  promptChars: number;
  outputChars: number;
  promptTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  operation?: string;
  status?: "success" | "error";
  error?: string | null;
}): void {
  const db = openDatabase();
  try {
    db.prepare(`
      INSERT INTO ai_usage_events (
        at, provider, model, prompt_chars, output_chars,
        prompt_tokens, output_tokens, total_tokens, operation, status, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.at || new Date().toISOString(),
      input.provider,
      input.model,
      Math.max(0, Math.round(input.promptChars || 0)),
      Math.max(0, Math.round(input.outputChars || 0)),
      input.promptTokens == null ? null : Math.max(0, Math.round(input.promptTokens)),
      input.outputTokens == null ? null : Math.max(0, Math.round(input.outputTokens)),
      input.totalTokens == null ? null : Math.max(0, Math.round(input.totalTokens)),
      input.operation || null,
      input.status || "success",
      input.error || null
    );
  } finally {
    db.close();
  }
}

export function checkAiBudget(callLimit: number, tokenLimit: number): {
  allowed: boolean;
  reason?: "daily_call_limit" | "daily_token_limit";
  usage: ReturnType<typeof getAiUsageToday>;
} {
  const usage = getAiUsageToday();
  if (callLimit > 0 && usage.calls >= callLimit) {
    return { allowed: false, reason: "daily_call_limit", usage };
  }
  if (tokenLimit > 0 && usage.totalTokens >= tokenLimit) {
    return { allowed: false, reason: "daily_token_limit", usage };
  }
  return { allowed: true, usage };
}

