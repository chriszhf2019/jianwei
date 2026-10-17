import type { Express, Request, Response } from "express";
import {
  activeProvider,
  callAI,
  callAIWithReasoning,
  providerModel,
} from "../ai";
import {
  generateAnalysisKey,
  getAnalysisFromDatabase,
  saveAnalysisToDatabase,
} from "../database";
import { zhFullDate, isoToday, nowHHmm } from "../date";
import {
  getOrCreatePredict,
  predictKey,
} from "../cache";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeEnrichPayload,
} from "../aiValidation";
import {
  ensureGuestDeferredQuota,
  chargeGuestDeepSuccess,
} from "../authMiddleware";
import { buildAnalysisFrameworkPrompt } from "../prompts/analysisFrameworkPrompt";
import { ANALYSIS_DEEP_FIELD_KEYS } from "../../shared/analysisFramework";

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

const NO_KEY_FALLBACK_NOTE = "未配置可用 AI 模型（Gemini / DeepSeek Key），本次未生成内容。";
const UPSTREAM_ERROR_FALLBACK_NOTE = "AI 调用失败或超时，本次未生成内容。";

/** AI 深度分析 / 顾问 / 探针 / 简报追问 / 预测推演。 */
export function registerAiChatRoutes(app: Express, applyRateLimit: RateLimiter): void {
  // AI News Interpretation & Cognitive Analysis endpoint
  app.post("/api/analyze", applyRateLimit, async (req, res) => {
    try {
      const { title, content, source, sourceUrl, category, articleId, forceRefresh } = req.body;
      if (!title && !content) {
        return res.status(400).json({ error: "Title or content is required" });
      }

      // 游客：校验失败不扣；成功交付后再扣（同 articleId 与 enrich/skill 共享）
      if (!ensureGuestDeferredQuota(req, res)) return;

      const analysisKey = generateAnalysisKey({ articleId, title, source, content });

      // 优先从数据库缓存查询
      if (!forceRefresh) {
        const cached = getAnalysisFromDatabase(analysisKey);
        if (cached && cached.payload) {
          const quota = chargeGuestDeepSuccess(req, articleId ? String(articleId) : undefined);
          return res.json({
            fallback: false,
            cached: true,
            hitCount: cached.hitCount,
            data: cached.payload,
            ...(quota
              ? { guestQuota: { remaining: quota.remaining, deepReads: quota.deepReads, charged: quota.charged } }
              : {}),
          });
        }
      }

      const provider = activeProvider();
      if (!provider) {
        return res.json({
          fallback: true,
          fallbackReason: "no_api_key",
          fallbackNote: NO_KEY_FALLBACK_NOTE,
          data: null,
        });
      }
      const model = providerModel(provider);

      const prompt = buildAnalysisFrameworkPrompt({
        mode: "analyze",
        title: title || "无标题",
        source: source || "媒体报道",
        sourceUrl: sourceUrl || "未提供",
        category: category || "科技前沿",
        content: content || "请结合标题分析当前热点",
        dateLabel: zhFullDate(new Date()),
        timeLabel: nowHHmm(new Date()),
        sourceDateLabel: `${isoToday(new Date())} ${nowHHmm(new Date())}`,
      });

      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      }

      parsed = sanitizeEnrichPayload(parsed);
      const deepPresent = ANALYSIS_DEEP_FIELD_KEYS.filter(
        (k) => parsed?.[k] !== undefined && parsed[k] !== null
      );
      attachFieldMeta(parsed, deepPresent.length ? [...deepPresent] : ["evidenceChain", "sevenElements", "rippleEffect"], createFieldMeta(provider, model, PROMPT_VERSIONS.analyze));

      // 存储分析结果到后台 SQLite 语料数据库
      saveAnalysisToDatabase({
        key: analysisKey,
        articleId: articleId || (parsed as any).id,
        title: title || parsed.title || "未命名语料",
        source: source || parsed.sourceName || "用户/Feed投递",
        category: category || parsed.category || "科技前沿",
        provider,
        model,
        payload: parsed,
      });

      const quota = chargeGuestDeepSuccess(req, articleId ? String(articleId) : undefined);
      res.json({
        fallback: false,
        cached: false,
        data: parsed,
        ...(quota
          ? { guestQuota: { remaining: quota.remaining, deepReads: quota.deepReads, charged: quota.charged } }
          : {}),
      });
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      res.json({
        fallback: true,
        fallbackReason: "error",
        fallbackNote: UPSTREAM_ERROR_FALLBACK_NOTE,
        error: err.message,
        data: null,
      });
    }
  });

  // AI Strategic Advisor endpoint (基于今天的新闻情报回答我)
  app.post("/api/strategic-advisor", applyRateLimit, async (req, res) => {
    try {
      const { question, userPersona, contextArticles } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const provider = activeProvider();
      if (!provider) {
        return res.json({
          fallback: true,
          fallbackReason: "no_api_key",
          fallbackNote: NO_KEY_FALLBACK_NOTE,
          citations: [],
          answer: null,
        });
      }

      const prompt = `你作为《见微 Genway》AI战略指挥室的首席特约情报顾问。
  请基于今日平台聚合的核心情报库，针对用户的战略提问提供极高认知密度、客观克制、直击要害的战略咨询答复。

  用户提问身份：${userPersona || "战略决策者"}
  用户战略问题："${question}"
  今日核心情报上下文：
  ${JSON.stringify((contextArticles || []).slice(0, 3))}

  答复规范：
  1. 语言具备《经济学人》和麦肯锡战略简报的严密逻辑与高穿透力；
  2. 结构清晰：分为【情报定性】、【传导逻辑】、【对您身份的直接机会与威胁】、【具体行动建议】；
  3. 严格引用具体事实与量化线索作为论据支撑；
  4. 控制在 260 - 380 字之间。`;

      const text = await callAI(prompt, { temperature: 0.35 });

      res.json({
        answer: text,
        citations: (contextArticles || []).map((a: any) => a.title).slice(0, 3),
      });
    } catch (err: any) {
      console.error("Strategic Advisor error:", err);
      res.json({
        fallback: true,
        fallbackReason: "error",
        fallbackNote: UPSTREAM_ERROR_FALLBACK_NOTE,
        answer: null,
        citations: [],
      });
    }
  });

  // Nuance In-depth Inquiry endpoint
  app.post("/api/ask-nuance", applyRateLimit, async (req, res) => {
    try {
      const { question, articleContext, articleId } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      // 游客：400/无 Key/AI 失败不扣；成功回答后再扣（同文共享）
      if (!ensureGuestDeferredQuota(req, res)) return;

      const provider = activeProvider();
      if (!provider) {
        return res.json({
          fallback: true,
          fallbackReason: "no_api_key",
          fallbackNote: NO_KEY_FALLBACK_NOTE,
          answer: null,
        });
      }

      const prompt = `你作为《见微 Genway》新闻深度解读系统的首席特约分析师。
  读者正在阅读以下这篇新闻的深度拆解报告：
  ${JSON.stringify(articleContext || {})}

  读者的具体追问：
  "${question}"

  请遵循见微的“报刊为骨，数据为翼”原则：
  1. 语言凝练、克制、一针见血，具有《经济学人》和顶级智库的洞察力；
  2. 明确指出新闻中哪项“微观细节”或“证据链”支撑了你的判断；
  3. 回答控制在 180-260 字之间，分点清晰。`;

      const text = await callAI(prompt, { temperature: 0.4 });

      const linkedArticleId = String(articleId || articleContext?.id || "").trim();
      const quota = chargeGuestDeepSuccess(req, linkedArticleId || undefined);
      res.json({
        answer: text,
        ...(quota
          ? { guestQuota: { remaining: quota.remaining, deepReads: quota.deepReads, charged: quota.charged } }
          : {}),
      });
    } catch (err: any) {
      console.error("Nuance Ask error:", err);
      res.json({
        fallback: true,
        fallbackReason: "error",
        fallbackNote: UPSTREAM_ERROR_FALLBACK_NOTE,
        answer: null,
      });
    }
  });

  // Morning Briefing Interactive Dialogue endpoint
  app.post("/api/briefing/chat", applyRateLimit, async (req, res) => {
    try {
      const { question, persona, articles } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const provider = activeProvider();
      const articlesDigest = (articles || [])
        .slice(0, 5)
        .map(
          (a: any, i: number) =>
            `【要情${i + 1}】《${a.title}》\n  - 核心事实：${a.summary || a.subtitle || '暂无摘要'}\n  - 异动与反常：${a.anomalyNote || a.oneSentenceVerdict || '关注边际公差异动'}\n  - 涉及行业/区域：${a.category || '核心战略产业'}`
        )
        .join("\n\n");

      const personaName = persona?.name || '资深决策者';

      if (!provider) {
        const answer = generateBriefingAnswer(question, personaName);
        return res.json({ answer, fallback: true });
      }

      const prompt = `你作为《见微 Genway》的晨间情报高级研讨顾问（Chief Intelligence Advisor）。
  用户刚收听完今日晨间全景简报，正在与你发起实时研讨追问。
  读者当前选择的透镜身份是：${personaName}（核心诉求：${persona?.tagline || '战略洞察与避险'}）。

  今日早报关键要情摘要：
  ${articlesDigest}

  读者提出的具体追问：
  "${question}"

  请遵循见微的“报刊为骨，数据为翼”原则为读者作答：
  1. 语言沉着、凝练、一针见血，如同英国《金融时报》首席评论员与顶级智库闭门研讨发言；
  2. 结合今日播报的具体反常点、敏感度驱动变量或走廊阻尼，给出逻辑严密的因果阐释；
  3. 从用户的角色透镜（${personaName}）出发，明确指出核心利害与实操避险抓手；
  4. 字数控制在 200-300 字之间，分点清晰，适合语音朗读，严禁假大空的空话。`;

      const text = await callAI(prompt, { temperature: 0.45 });
      res.json({ answer: text });
    } catch (err: any) {
      console.error("Briefing chat error:", err);
      const personaName = req.body?.persona?.name || '资深决策者';
      const fallbackAnswer = generateBriefingAnswer(req.body?.question || '', personaName);
      res.json({
        answer: fallbackAnswer,
        fallback: true,
      });
    }
  });

  function generateBriefingAnswer(question: string, personaName: string) {
    return (
      `当前没有可用的 AI 模型密钥，无法针对「${question}」生成实时研讨答复` +
      `（透镜：${personaName}）。请配置 Gemini / DeepSeek Key 后再试；见微不会用模板话术冒充分析结果。`
    );
  }

  // —— 本地启发式基准推演（服务端兜底，与前端 computeLocalPrediction 同一口径） ——
  function localBaselinePrediction(body: any) {
    // 与前端「人机预测擂台/与我何干·双向预测」共用同一口径：逻辑树驱动变量净动量（单一公式镜像）。
    // 已移除下线占位口径（信用星级/变化速度）；无逻辑树变量时诚实给 neutral、不做伪精确。
    const article = body?.articleContext || {};
    const weights: Array<{ impactDirection: string; weight: number }> = Array.isArray(
      article?.logicTree?.variableWeights
    )
      ? article.logicTree.variableWeights
      : [];
    const totalWeight = weights.reduce((s, w) => s + (w.weight || 0), 0);
    const hasWeights = weights.length > 0 && totalWeight > 0;
    const upSum = weights
      .filter((w) => w.impactDirection === "up")
      .reduce((s, w) => s + (w.weight || 0), 0);
    const downSum = weights
      .filter((w) => w.impactDirection === "down")
      .reduce((s, w) => s + (w.weight || 0), 0);
    const momentum = hasWeights ? (upSum - downSum) / totalWeight : 0; // -1..1
    const pPos = hasWeights ? Math.max(8, Math.min(92, Math.round(50 + momentum * 35))) : 50;
    const pNeg = 100 - pPos;
    const opts = body?.questionOptions || {};
    const direction: "positive" | "negative" | "neutral" = !hasWeights
      ? "neutral"
      : pPos >= 56
        ? "positive"
        : pPos <= 44
          ? "negative"
          : "neutral";
    const directionText =
      direction === "positive"
        ? opts.positive || "是/发生"
        : direction === "negative"
          ? opts.negative || "否/未发生"
          : opts.neutral || "方向不明（中性震荡）";
    const pBias = hasWeights ? Math.max(pPos, pNeg) : 0;
    const confidenceScore = hasWeights ? Math.round(Math.min(85, Math.max(25, pBias))) : 0;
    const baseRatePercentage = hasWeights ? pBias : 0; // 无历史样本时明确为 0，不伪造先验
    return {
      modelChoice: "jianwei-local",
      modelName: "见微·本地主线加权引擎（透明可复核）",
      modelRationale:
        "不调用外部大模型：由「逻辑树驱动变量」利好/利空净动量换算方向强度。该指数没有经过历史结果校准，因此不冒充概率；无变量时不估算。",
      direction,
      directionText,
      confidenceScore,
      baseRatePercentage,
      probabilityKind: "direction_strength",
      certificationStandard: "heuristic",
      calibrationStatus: "uncalibrated",
      causalLogicChain: hasWeights
        ? [
            {
              step: "1. 方向净动量测算",
              deduction: `逻辑树驱动变量上行权重合计 ${upSum}、下行合计 ${downSum}（总 ${totalWeight}），净动量 ${momentum >= 0 ? "+" : ""}${momentum.toFixed(2)}，主线偏乐观 ~${pPos}% / 偏悲观 ~${pNeg}%。`,
            },
            {
              step: "2. 方向强度收敛",
              deduction: `对所选方向「${directionText}」得到方向强度 ${confidenceScore}/100（区间 25-85，避免伪精确）。该数值不是概率。`,
            },
            {
              step: "3. 收敛与证伪提示",
              deduction: `本地引擎无历史基准样本、未校准；若检验期内出现与方向相反的核心官方/供应链数据，该推演自动失效。`,
            },
          ]
        : [
            { step: "1. 数据可得性检查", deduction: "本文未提供逻辑树驱动变量，本地引擎不估计主线方向（避免伪精确）。" },
            { step: "2. 建议", deduction: "可先在详情「七要素事实」补齐底层逻辑/正反方博弈要素，或切换在线引擎做 AI 推演。" },
          ],
      keyAssumptions: ["本文证据链与信源分级维持现状", "约定检验期内未发生突发政策或黑天鹅事件"],
      counterIntuitiveBlindspot:
        "本地引擎盲区提示：仅覆盖逻辑树内给出的驱动变量，未覆盖情绪面瞬间反转与突发政策冲击；请以自设可证伪指标持续跟踪。",
      falsifiableTriggers: [
        "检验期内出现与推演方向相反的官方/供应链硬数据时，该推演自动失效",
        "原文关键假设被证伪（如交付、良品率、利率口径变化）时，请立即下调置信度",
      ],
      verdictSummary: hasWeights
        ? `本地加权引擎判断：方向「${directionText}」，方向强度 ${confidenceScore}/100。该指数不是概率。`
        : `本地引擎不估方向（本文无逻辑树驱动变量）：请先生成相关要素，或切换在线引擎。`,
    };
  }
  app.post("/api/predict", applyRateLimit, async (req, res) => {
    try {
      const { question, modelChoice, userDirection, userConfidence, premises, falsifiableIndicator, articleContext, questionOptions } = req.body || {};
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const local = localBaselinePrediction({ questionOptions, articleContext });

      // 无 API Key 或显式选择本地引擎：直接返回确定性规则结果
      const provider = activeProvider();
      if (!provider || modelChoice === "jianwei-local") {
        return res.json({ fallback: true, data: local });
      }

      const model = providerModel(provider);
      // 在线结果缓存：问题、文章上下文、用户前提、供应商和模型版本共同决定缓存键。
      const pKey = predictKey({
        question,
        articleId: articleContext?.id,
        articleTitle: articleContext?.title,
        modelChoice: modelChoice || provider || "auto",
        provider,
        model,
        userDirection,
        userConfidence,
        premises,
        falsifiableIndicator,
        articleContext,
        questionOptions,
      });

      const prompt = `你是「见微 Genway」的先验预测校准员。请基于给定的文章上下文与用户命题做一份可证伪的二元预测，并严格输出 JSON（不要输出任何 JSON 以外的文字），结构如下：
  {
    "direction": "positive | negative",
    "directionText": "一句话方向描述（贴合并选择对应选项文案）",
    "confidenceScore": 0到100的整数,
    "baseRatePercentage": 0到100的整数（仅当你能说明真实、可核验的历史样本口径时填写；否则填 null）,
    "causalLogicChain": [{"step":"1. …","deduction":"…"},{"step":"2. …","deduction":"…"},{"step":"3. …","deduction":"…"}],
    "keyAssumptions": ["假设1","假设2"],
    "counterIntuitiveBlindspot": "模型发现的用户易忽略的认知盲区",
    "falsifiableTriggers": ["失效触发硬指标1","失效触发硬指标2"],
    "verdictSummary": "克制、客观的总结论（避免谄媚式乐观）"
  }
  文章上下文：${JSON.stringify(articleContext || {})}
  选项文案：正面=「${questionOptions?.positive || ""}」 负面=「${questionOptions?.negative || ""}」
  用户命题：${question}
  用户自判方向：${userDirection || ""}（置信度 ${userConfidence ?? ""}%）
  用户立论前提：${JSON.stringify(premises || [])}
  用户自设证伪线：${falsifiableIndicator || ""}`;

      const generated = pKey
        ? await getOrCreatePredict(pKey, async () => {
            const { text, reasoning } = await callAIWithReasoning(prompt, { json: true, temperature: 0.35 });
            let parsed: any;
            try {
              parsed = JSON.parse(text);
            } catch {
              parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
            }
            return {
              ...parsed,
              thinkingTrace: reasoning || undefined,
              modelChoice: provider === "deepseek" ? "deepseek-r1" : "gemini-2.5-flash",
              modelName:
                provider === "deepseek"
                  ? `DeepSeek ${model} · 在线推演引擎`
                  : `Gemini ${model} · 在线推演引擎`,
              baseRatePercentage:
                typeof parsed.baseRatePercentage === "number" ? parsed.baseRatePercentage : undefined,
              probabilityKind: "model_estimate",
              certificationStandard: "prediction_uncalibrated",
              calibrationStatus: "uncalibrated",
            };
          })
        : { data: null, cached: false, deduped: false };
      res.json({
        fallback: false,
        cached: generated.cached || generated.deduped,
        data: generated.data,
      });
    } catch (err: any) {
      console.error("Predict error:", err);
      res.json({
        fallback: true,
        data: localBaselinePrediction({
          questionOptions: req.body?.questionOptions,
          articleContext: req.body?.articleContext,
        }),
      });
    }
  });

}
