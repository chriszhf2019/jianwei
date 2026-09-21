import { GoogleGenAI } from "@google/genai";
import { NO_PERSIST, settings } from "./settings";
import {
  checkAiBudget,
  getAiUsageToday,
  getAiCostToday,
  recordAiUsageEvent,
  recordAuditEvent,
} from "./database";

export type AIProvider = "gemini" | "deepseek";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = settings.geminiApiKey;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI", e);
    return null;
  }
}

export function geminiKeyOk(): boolean {
  const k = settings.geminiApiKey;
  return !!k && k !== "MY_GEMINI_API_KEY";
}

export function deepseekKeyOk(): boolean {
  return !!settings.deepseekApiKey;
}

export function activeProvider(): AIProvider | null {
  const explicit = settings.aiChoice;
  if (explicit === "deepseek") return deepseekKeyOk() ? "deepseek" : geminiKeyOk() ? "gemini" : null;
  if (explicit === "gemini") return geminiKeyOk() ? "gemini" : deepseekKeyOk() ? "deepseek" : null;
  return geminiKeyOk() ? "gemini" : deepseekKeyOk() ? "deepseek" : null;
}

export function providerModel(provider: AIProvider): string {
  return provider === "deepseek"
    ? settings.deepseekModel || "deepseek-chat"
    : settings.geminiModel || "gemini-2.5-flash";
}

export interface AIResult {
  text: string;
  reasoning?: string;
}

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45_000);

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

interface UsageBucket {
  calls: number;
  promptChars: number;
  outputChars: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

let usage = {
  totalCalls: 0,
  promptChars: 0,
  outputChars: 0,
  promptTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  lastResetAt: new Date().toISOString(),
  byProvider: {} as Record<string, UsageBucket>,
};

function recordUsage(
  provider: AIProvider,
  model: string,
  prompt: string,
  output: string,
  tokens: { promptTokens?: number | null; outputTokens?: number | null; totalTokens?: number | null } = {},
  status: "success" | "error" = "success",
  error?: unknown
): void {
  const bucket = usage.byProvider[`${provider}:${model}`] || {
    calls: 0,
    promptChars: 0,
    outputChars: 0,
    promptTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  bucket.calls += 1;
  bucket.promptChars += prompt.length;
  bucket.outputChars += output.length;
  bucket.promptTokens += Number(tokens.promptTokens || 0);
  bucket.outputTokens += Number(tokens.outputTokens || 0);
  bucket.totalTokens += Number(tokens.totalTokens || 0);
  usage.byProvider[`${provider}:${model}`] = bucket;
  usage.totalCalls += 1;
  usage.promptChars += prompt.length;
  usage.outputChars += output.length;
  usage.promptTokens += Number(tokens.promptTokens || 0);
  usage.outputTokens += Number(tokens.outputTokens || 0);
  usage.totalTokens += Number(tokens.totalTokens || 0);
  if (!NO_PERSIST) {
    try {
      recordAiUsageEvent({
        provider,
        model,
        promptChars: prompt.length,
        outputChars: output.length,
        promptTokens: tokens.promptTokens,
        outputTokens: tokens.outputTokens,
        totalTokens: tokens.totalTokens,
        status,
        error: error ? String((error as any)?.message || error).slice(0, 500) : null,
      });
    } catch (persistError) {
      console.error("failed to persist AI usage:", persistError);
    }
  }
  recordAuditEvent({
    actor: "system",
    action: "ai.call",
    entityType: "provider",
    entityId: `${provider}:${model}`,
    status,
    metadata: {
      promptChars: prompt.length,
      outputChars: output.length,
      promptTokens: tokens.promptTokens ?? null,
      outputTokens: tokens.outputTokens ?? null,
      totalTokens: tokens.totalTokens ?? null,
      error: error ? String((error as any)?.message || error).slice(0, 300) : null,
    },
  });
}

export function getAIUsage() {
  return {
    ...usage,
    persistedToday: NO_PERSIST ? null : getAiUsageToday(),
    costToday: NO_PERSIST ? null : getAiCostToday(),
    limits: {
      dailyCalls: Number(process.env.AI_DAILY_CALL_LIMIT || 500),
      dailyTokens: Number(process.env.AI_DAILY_TOKEN_LIMIT || 0),
    },
  };
}

export function resetAIUsage(): void {
  usage = {
    totalCalls: 0,
    promptChars: 0,
    outputChars: 0,
    promptTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    lastResetAt: new Date().toISOString(),
    byProvider: {},
  };
}

export async function runAI(
  prompt: string,
  opts: { json?: boolean; temperature?: number } = {}
): Promise<AIResult> {
  const provider = activeProvider();
  if (!provider) throw new Error("no AI provider configured");
  if (!NO_PERSIST) {
    const budget = checkAiBudget(
      Number(process.env.AI_DAILY_CALL_LIMIT || 500),
      Number(process.env.AI_DAILY_TOKEN_LIMIT || 0)
    );
    if (!budget.allowed) {
      throw new Error(`ai_budget_exceeded:${budget.reason}:calls=${budget.usage.calls}`);
    }
  }
  const temperature = opts.temperature ?? 0.3;

  try {
    if (provider === "gemini") {
      const ai = getGeminiClient();
      if (!ai) throw new Error("gemini client unavailable");
      const config: { temperature: number; responseMimeType?: string } = { temperature };
      if (opts.json) config.responseMimeType = "application/json";
      const response = await withTimeout(
        ai.models.generateContent({
          model: providerModel("gemini"),
          contents: prompt,
          config,
        }),
        "Gemini request"
      );
      const text = response.text || "";
      const usageMeta: any = (response as any).usageMetadata || {};
      recordUsage("gemini", providerModel("gemini"), prompt, text, {
        promptTokens: usageMeta.promptTokenCount,
        outputTokens: usageMeta.candidatesTokenCount,
        totalTokens: usageMeta.totalTokenCount,
      });
      return { text };
    }

    const baseUrl = (settings.deepseekBaseUrl || "https://api.deepseek.com").replace(/\/+$/, "");
    const dsModel = providerModel("deepseek");
    const isReasoner = dsModel.toLowerCase().includes("reasoner");
    const body: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
      temperature?: number;
      response_format?: { type: "json_object" };
    } = {
      model: dsModel,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    };
    if (!isReasoner) {
      body.temperature = temperature;
      if (opts.json) body.response_format = { type: "json_object" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.deepseekApiKey}`,
        },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "error",
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`DeepSeek HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const message = data?.choices?.[0]?.message || {};
    const text: string = message.content || "";
    const reasoning: string | undefined = message.reasoning_content || undefined;
    if (!text) throw new Error("DeepSeek returned empty content");
    recordUsage("deepseek", dsModel, prompt, text + (reasoning || ""), {
      promptTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    });
    return { text, reasoning };
  } catch (error) {
    recordUsage(provider, providerModel(provider), prompt, "", {}, "error", error);
    throw error;
  }
}

export async function callAI(
  prompt: string,
  opts: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  return (await runAI(prompt, opts)).text;
}

export async function callAIWithReasoning(
  prompt: string,
  opts: { json?: boolean; temperature?: number } = {}
): Promise<AIResult> {
  return runAI(prompt, opts);
}
