/**
 * 跨模型交叉复核：用另一个可用通道独立检查核心结论是否有原文依据。
 * 后台执行、不阻塞 enrich；结果写入 article.crossCheck，供前端轮询展示。
 */
import { activeProvider, otherProvider, providerModel, callAIWithProvider, type AIProvider } from "./ai";
import { findCorpusArticle, persistCorpus } from "./corpus";
import { NO_PERSIST } from "./settings";

export type CrossCheckVerdict = "consistent" | "partial" | "contradicts";

export interface CrossCheckResult {
  verdict: CrossCheckVerdict;
  issues: string[];
  unsupportedClaims: string[];
  provider: string;
  model: string;
  checkedAt: string;
}

const TTL_MS = 6 * 3600 * 1000;
const inFlight = new Map<string, Promise<CrossCheckResult | null>>();
const lastRunAt = new Map<string, number>();

function enabled(): boolean {
  if (process.env.JIANWEI_CROSS_CHECK === "0") return false;
  const primary = activeProvider();
  return !!primary && !!otherProvider(primary);
}

function stringList(value: unknown, max = 5): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function crossCheckArticle(articleId: string): Promise<CrossCheckResult | null> {
  const id = String(articleId || "").trim();
  if (!id) return null;
  const primary = activeProvider();
  const reviewer: AIProvider | null = primary ? otherProvider(primary) : null;
  if (!primary || !reviewer) return null;

  const article: any = findCorpusArticle(id);
  const source = String(article?.content || article?.summary || "").trim();
  if (!article || source.length < 200) return null;

  const claims = {
    oneSentenceVerdict: article.oneSentenceVerdict || "",
    summary: article.summary || "",
    coreLogic: article.coreLogic?.essence || "",
    coreDispute: article.bullBearDebate?.coreDispute || "",
    evidenceClaims: (Array.isArray(article.evidenceChain) ? article.evidenceChain : [])
      .slice(0, 6)
      .map((ev: any) => String(ev?.claim || "").trim())
      .filter(Boolean),
  };

  const prompt = `你是独立复核员。下面是一篇新闻的原文节选，以及另一个模型给出的分析结论。
请只依据原文复核这些结论，严格只输出 JSON：
{"verdict":"consistent|partial|contradicts","unsupportedClaims":["原文找不到依据的结论，最多5条"],"issues":["与原文冲突或明显过度推断的表述，最多5条"]}
判定口径：
- consistent：核心结论均有原文支持；
- partial：部分结论缺乏依据或存在过度推断；
- contradicts：核心结论与原文矛盾。
原文节选：
${source.slice(0, 3500)}

待复核结论：
${JSON.stringify(claims)}

要求：不要复述原文；只列问题；没有问题就返回空数组。`;

  try {
    const text = await callAIWithProvider(reviewer, prompt, { json: true, temperature: 0 });
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = JSON.parse(String(text).replace(/```json/g, "").replace(/```/g, "").trim());
    }
    const verdict: CrossCheckVerdict = ["consistent", "partial", "contradicts"].includes(String(parsed?.verdict))
      ? (parsed.verdict as CrossCheckVerdict)
      : "partial";
    const result: CrossCheckResult = {
      verdict,
      issues: stringList(parsed?.issues),
      unsupportedClaims: stringList(parsed?.unsupportedClaims),
      provider: reviewer,
      model: providerModel(reviewer),
      checkedAt: new Date().toISOString(),
    };
    article.crossCheck = result;
    if (!NO_PERSIST) persistCorpus();
    return result;
  } catch (error: any) {
    console.warn("[cross-check] failed:", String(error?.message || error).slice(0, 200));
    return null;
  }
}

/** 后台复核：去重 + TTL；未同时配置两个通道时直接跳过。 */
export function crossCheckInBackground(articleId: string): void {
  if (!enabled()) return;
  const id = String(articleId || "").trim();
  if (!id) return;
  const last = lastRunAt.get(id) || 0;
  if (Date.now() - last < TTL_MS || inFlight.has(id)) return;

  lastRunAt.set(id, Date.now());
  const task = crossCheckArticle(id).finally(() => {
    inFlight.delete(id);
  });
  inFlight.set(id, task);
}
