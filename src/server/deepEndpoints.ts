import express from "express";
import { getOrCreateCached, enrichKey } from "./cache";
import { activeProvider, callAI, callAIWithReasoning, providerModel } from "./ai";
import { serverCorpus, persistCorpus, findCorpusArticle } from "./corpus";
import { djb2 } from "./cache";
import { zhFullDate, isoToday, nowHHmm } from "./date";
import { inspectSource } from "./sourceVerification";
import { resolveEnrichArticleContent } from "./articleFetch";
import {
  ensureGuestDeferredQuota,
  chargeGuestDeepSuccess,
} from "./authMiddleware";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeFrequencyAnalysis,
  sanitizeRegionImpact,
  sanitizeEnrichPayload,
} from "./aiValidation";
import { buildAnalysisFrameworkPrompt, ANTI_BOILERPLATE_RULE } from "./prompts/analysisFrameworkPrompt";
import { findSpecificityIssues, stripGenericFields } from "./aiSpecificity";
import { findMissingEnrichGroups, groundEvidence, findUngroundedNumbers } from "./enrichQuality";
import { verifyEvidenceChainInBackground } from "./evidenceVerification";
import { ANALYSIS_DEEP_FIELD_KEYS } from "../shared/analysisFramework";
const HARDWARE_ANALYSIS_RULE = `【硬件/产品新闻专用规则】
1. 涉及硬件参数（屏幕、芯片、电池、影像、快充等）时，必须把参数翻译成用户可感知的体验或代价（例如：2K+185Hz → DDIC 功耗与续航下降、主流手游原生帧率上限、MEMC 插帧延迟与伪影；大电池 → 机身重量/厚度）。
2. 解释厂商动机时必须写清竞争格局与产品线区隔：对标谁、为什么此时做、牺牲了什么；不得复述配置参数。
3. 风险必须落到工程或生态约束（功耗、散热、帧率适配、外围缩水、BOM 挤压），不得只写“成本高/利润薄”。
4. 禁止空话：“同价位规格对标”“行业趋势向好”“市场竞争加剧”“需要重新划界”；每句必须带具体机制或主体。`;
export interface RateLimiter { (req: express.Request, res: express.Response, next: express.NextFunction): void; }
export function registerDeepEndpoints(app: express.Express, limit: RateLimiter): void {
  const applyRateLimit = limit;
app.post("/api/enrich", applyRateLimit, async (req, res) => {
  try {
    const { title, content, source, sourceUrl, publishedAt, category, articleId, force } = req.body || {};
    if (!title && !content && !sourceUrl) {
      return res.status(400).json({ error: "Title, content or sourceUrl is required" });
    }

    // 游客深度解读额度：先只读校验，成功后再扣；失败/无 Key/抓取失败不扣次。
    if (!ensureGuestDeferredQuota(req, res)) return;

    const provider = activeProvider();
    if (!provider) {
      return res.json({ enriched: false, reason: "no_api_key" });
    }
    const model = providerModel(provider);

    const target = articleId ? serverCorpus.find((a: any) => String(a?.id) === String(articleId)) : undefined;
    const resolvedUrl = String(sourceUrl || target?.sourceUrl || "").trim();

    // P1：AI 分析前先拿到原文；抓取失败诚实报错且不扣额度。
    const resolved = await resolveEnrichArticleContent({
      sourceUrl: resolvedUrl,
      requestContent: content,
      corpusContent: target?.content,
      force: force === true,
    });
    if (!resolved.ok) {
      return res.json({
        enriched: false,
        reason: resolved.reason,
        note: resolved.note,
        ...(resolved.status ? { status: resolved.status } : {}),
        ...(resolved.fetchReason ? { fetchReason: resolved.fetchReason } : {}),
      });
    }

    const effectiveContent = resolved.content;
    const contentBasis = resolved.contentBasis;
    const effectiveTitle = String(title || resolved.fetchedTitle || target?.title || "").trim();
    const effectiveSource = String(source || resolved.sourceName || target?.sourceName || "外部信源").trim();
    const key = enrichKey({
      title: effectiveTitle,
      articleId,
      content: effectiveContent,
      provider,
      model,
      promptVersion: PROMPT_VERSIONS.enrich,
    });

    const prompt = buildAnalysisFrameworkPrompt({
      mode: "enrich",
      title: effectiveTitle,
      source: effectiveSource,
      sourceUrl: resolvedUrl,
      publishedAt: publishedAt ? String(publishedAt) : undefined,
      category: category ? String(category) : undefined,
      content: effectiveContent,
      contentBasis,
    });

    const generated = await getOrCreateCached(key, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return sanitizeEnrichPayload(parsed);
    }, { force });
    // 完整性：缺字段组时做一次定向补生成（只请求缺失组，不重复整篇）。
    const wasCached = generated.cached || generated.deduped;
    let raw = generated.data;
    const missingGroups = findMissingEnrichGroups(raw);
    if (!wasCached && missingGroups.length > 0) {
      try {
        const retryPrompt = `${prompt}

【上一次输出缺少以下字段组】${missingGroups.join('、')}
请只输出这些字段组成的 JSON 对象（不要输出其他字段），并严格遵守上面的全部规则。`;
        const retryText = await callAI(retryPrompt, { json: true, temperature: 0.25 });
        let retryParsed: any;
        try {
          retryParsed = JSON.parse(retryText);
        } catch {
          retryParsed = JSON.parse(String(retryText).replace(/```json/g, "").replace(/```/g, "").trim());
        }
        retryParsed = sanitizeEnrichPayload(retryParsed);
        const merged = { ...raw };
        for (const key of missingGroups) {
          if (retryParsed?.[key] !== undefined && retryParsed[key] !== null) merged[key] = retryParsed[key];
        }
        raw = merged;
      } catch (retryError: any) {
        console.warn("[enrich] targeted completeness retry failed:", String(retryError?.message || retryError).slice(0, 200));
      }
    }

    const corpus = `${effectiveTitle}\n${effectiveSource}\n${effectiveContent}`;
    // 字段级具体性清洗：只置空「过泛」的字段，不整篇拒收。
    const { payload: parsed, strippedFields } = stripGenericFields(raw, corpus);
    // 证据接地：引句/数字必须来自输入材料。
    const grounding = groundEvidence(parsed, corpus);
    const remainingMissing = findMissingEnrichGroups(parsed);
    const ungroundedNumbers = findUngroundedNumbers(
      {
        oneSentenceVerdict: parsed?.oneSentenceVerdict,
        summary: parsed?.summary,
        sevenElements: parsed?.sevenElements,
        logicTree: parsed?.logicTree,
        bullBearDebate: parsed?.bullBearDebate,
        coreLogic: parsed?.coreLogic,
        dehydratedItems: parsed?.dehydratedItems,
        rippleEffect: parsed?.rippleEffect,
      },
      corpus
    );
    const fieldMeta = createFieldMeta(provider, model, PROMPT_VERSIONS.enrich);

    // 深度解析结果写回语料：刷新后仍算“已深度解读”（当日口径的“深度解读”计数因此持久）
    if (articleId) {
      if (target) {
        const deepKeys = [...ANALYSIS_DEEP_FIELD_KEYS];
        for (const k of deepKeys) {
          if (parsed?.[k] !== undefined && parsed[k] !== null) target[k] = parsed[k];
        }
        // 写回抓到的原文，供后续 skill / 再 enrich 复用
        if (contentBasis === "full_article" && effectiveContent && (!target.content || String(target.content).length < effectiveContent.length)) {
          target.content = effectiveContent.slice(0, 50_000);
        }
        target.contentBasis = contentBasis;
        attachFieldMeta(target, deepKeys.filter((k) => parsed?.[k] !== undefined && parsed[k] !== null), fieldMeta);
        // 若仍为浅层默认，标记为已补全（避免首页卡片误判“待补全”）
        if (Array.isArray(target.spectrumLayers) && target.spectrumLayers.length > 0) {
          target.spectrumLayers = target.spectrumLayers;
        }
        persistCorpus();
      }
    }

    const quota = chargeGuestDeepSuccess(req, articleId ? String(articleId) : undefined);
    res.json({
      enriched: true,
      cached: wasCached,
      contentBasis,
      overrides: { ...parsed, contentBasis, ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}) },
      fieldMeta,
      ...(strippedFields.length > 0 ? { specificity: { strippedFields } } : {}),
      ...(missingGroups.length > 0 ||
      remainingMissing.length > 0 ||
      grounding.discardedQuotes > 0 ||
      grounding.ungroundedEvidence > 0 ||
      ungroundedNumbers.length > 0
        ? {
            quality: {
              retriedGroups: missingGroups,
              missingGroups: remainingMissing,
              discardedQuotes: grounding.discardedQuotes,
              ungroundedEvidence: grounding.ungroundedEvidence,
              ungroundedNumbers: ungroundedNumbers.slice(0, 8),
            },
          }
        : {}),
      ...(quota ? { guestQuota: { remaining: quota.remaining, deepReads: quota.deepReads, charged: quota.charged } } : {}),
    });

    // 响应返回后，后台抓原文核验引句（不阻塞、同一篇 6 小时内只跑一次）。
    if (articleId) {
      setTimeout(() => verifyEvidenceChainInBackground(String(articleId)), 1500);
    }
  } catch (err: any) {
    console.error("Enrich error:", err);
    res.json({ enriched: false, reason: "error" });
  }
});

// —— 地区影响解读：按用户点击的“地区 × 行业”组合，对相关真实文章做一次条件推演 ——
app.post("/api/region/interpret", applyRateLimit, async (req, res) => {
  const region = String(req.body?.region || "").trim().slice(0, 80);
  const sector = String(req.body?.sector || "").trim().slice(0, 120);
  const articles = Array.isArray(req.body?.articles)
    ? req.body.articles.slice(0, 12).map((item: any) => ({
        title: String(item?.title || "").trim().slice(0, 240),
        source: String(item?.source || "").trim().slice(0, 120),
        publishedAt: String(item?.publishedAt || "").trim().slice(0, 80),
        summary: String(item?.summary || "").trim().slice(0, 900),
      })).filter((item: any) => item.title || item.summary)
    : [];
  if (!region || !sector || articles.length === 0) {
    return res.status(400).json({ error: "region, sector and articles are required" });
  }

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `regioninterpret:${djb2([
    region,
    sector,
    JSON.stringify(articles),
    provider,
    model,
    PROMPT_VERSIONS.region_interpret,
  ].join("\n"))}`;
  const prompt = `你是「见微 Genway」的地区影响推演分析师。请仅依据输入的真实文章材料，解释一个“地区 × 行业”组合，严格只输出 JSON：
{
  "whyHere": "为什么会在这个地区、这个行业出现这批事件；区分材料明确事实与模型推断，1-3 句",
  "drivers": ["主要原因1", "主要原因2", "主要原因3"],
  "crossRegion": [
    {
      "target": "可能受到传导的地区、行业或主体",
      "direction": "benefit|pressure|mixed",
      "mechanism": "影响如何传导，一句话",
      "confidence": "高|中|低"
    }
  ],
  "watch": ["接下来可核验的观察指标1", "观察指标2", "观察指标3"],
  "guidance": "给决策者的下一步指引：观察、核验或行动，1-2 句",
  "limits": "判断边界：哪些内容材料没有说明，什么情况会让上述推演失效"
}
地区：${region}
行业：${sector}
真实文章材料：${JSON.stringify(articles)}
要求：drivers 2-4 条，crossRegion 2-5 条，watch 2-5 条；不得补造数字、政策、公司动作或来源；没有依据时写“现有材料未说明”；crossRegion 是条件传导假设，不是概率预测。`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.25 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return sanitizeRegionImpact(parsed);
    });
    res.json({ ok: true, cached: generated.cached || generated.deduped, data: generated.data });
  } catch (err) {
    console.error("Region interpret error:", err);
    res.json({ ok: false, reason: "error" });
  }
});

// —— 频发归因：按用户选择的赛道，基于真实文章生成“为什么近期集中发生”的条件解释 ——
app.post("/api/intelligence/frequency", applyRateLimit, async (req, res) => {
  const topic = String(req.body?.topic || "").trim().slice(0, 120);
  const windowDays = Math.max(1, Math.min(90, Number(req.body?.windowDays) || 30));
  const articles = Array.isArray(req.body?.articles)
    ? req.body.articles.slice(0, 16).map((item: any) => ({
        title: String(item?.title || "").trim().slice(0, 240),
        source: String(item?.source || "").trim().slice(0, 120),
        publishedAt: String(item?.publishedAt || "").trim().slice(0, 80),
        summary: String(item?.summary || "").trim().slice(0, 900),
      })).filter((item: any) => item.title || item.summary)
    : [];
  if (!topic || articles.length === 0) {
    return res.status(400).json({ error: "topic and articles are required" });
  }

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `frequencyanalysis:${djb2([
    topic,
    String(windowDays),
    JSON.stringify(articles),
    provider,
    model,
    PROMPT_VERSIONS.frequency_analysis,
  ].join("\n"))}`;
  const prompt = `你是「见微 Genway」的频发事件归因分析师。请仅依据输入的真实文章，解释为什么某个主题在近期集中出现，严格只输出 JSON：
{
  "observedPattern": "先描述观察到的频发模式：时间范围、主题、文章与来源覆盖；只写输入能够支持的内容",
  "possibleDrivers": [
    {
      "driver": "候选原因",
      "evidence": "输入中的支持证据，一句话；没有证据就写现有材料未说明",
      "mechanism": "这个原因如何可能导致事件集中出现，一句话",
      "confidence": "高|中|低"
    }
  ],
  "alternativeExplanation": "同样能够解释频发现象的替代原因，例如报道周期、热点炒作、来源集中或统计口径",
  "watch": ["可验证的频率原因观察信号1", "观察信号2", "观察信号3"],
  "limits": "哪些因果关系尚未被证明，以及材料缺少什么"
}
主题：${topic}
观察窗口：近 ${windowDays} 天
真实文章材料：${JSON.stringify(articles)}
要求：possibleDrivers 2-4 条，watch 2-5 条；因果只能是候选假设，不得写成已证实结论；不得补造政策、数字、公司动作或来源；要主动考虑“只是同一媒体连续报道”这种替代解释。`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.25 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return sanitizeFrequencyAnalysis(parsed);
    });
    res.json({ ok: true, cached: generated.cached || generated.deduped, data: generated.data });
  } catch (err) {
    console.error("Frequency analysis error:", err);
    res.json({ ok: false, reason: "error" });
  }
});

/** 技能型单项生成公共骨架：定位文章 → 查缓存 → 调 AI → 写回对应字段 */
async function runSingleSkill(
  req: any,
  res: any,
  opts: {
    field: string;
    skillKey: string;
    /** false = 不占游客深度额度（如大白话） */
    consumeGuestQuota?: boolean;
    certificationStandard?: "ai_single" | "scenario";
    buildPrompt: (input: {
      title: string;
      source: string;
      sourceUrl: string;
      publishedAt: string;
      category: string;
      content: string;
    }) => string;
  }
) {
  const { title, content, source, sourceUrl, publishedAt, category, articleId } = req.body || {};
  if (!title && !content) return res.status(400).json({ error: "Title or content is required" });

  const consumeGuestQuota = opts.consumeGuestQuota !== false;
  if (consumeGuestQuota && !ensureGuestDeferredQuota(req, res)) return;

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);

  const target = articleId ? serverCorpus.find((a: any) => String(a?.id) === String(articleId)) : undefined;
  let effectiveContent = String(content || "").trim();
  let contentBasis: "full_article" | "rss_summary_only" = "rss_summary_only";

  // 尝试优先使用正文原文：1. 语料库自身已有的正文；2. 抓取 sourceUrl 提取全文
  if (target?.content && target.content.length > 400) {
    effectiveContent = target.content;
    contentBasis = "full_article";
  } else if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
    try {
      const inspected = await inspectSource(sourceUrl);
      if (inspected?.pageText && inspected.pageText.length > 300) {
        effectiveContent = inspected.pageText.slice(0, 6000);
        contentBasis = "full_article";
        if (target && !target.content) {
          target.content = inspected.pageText.slice(0, 50000);
          persistCorpus();
        }
      }
    } catch {
      // 网络抓取不可用或超时，保持 rss_summary_only
    }
  }

  const cacheKey = `${opts.skillKey}:${djb2([
    String(articleId || "").trim(),
    String(title || "").trim(),
    effectiveContent.slice(0, 500),
    contentBasis,
    provider,
    model,
    PROMPT_VERSIONS.skill,
  ].join("\n"))}`;

  const prompt = `${opts.buildPrompt({
    title: String(title || "无标题"),
    source: String(source || "外部信源"),
    sourceUrl: String(sourceUrl || ""),
    publishedAt: String(publishedAt || ""),
    category: String(category || "外部信源"),
    content: effectiveContent || "请基于标题讲解",
  })}

${ANTI_BOILERPLATE_RULE}`;
  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const parseOnce = (text: string) => {
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        }
        const cleaned = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? sanitizeEnrichPayload(parsed)
          : parsed;
        return cleaned?.[opts.field] && typeof cleaned[opts.field] === "object"
          ? cleaned[opts.field]
          : cleaned;
      };

      let value = parseOnce(await callAI(prompt, { json: true, temperature: 0.3 }));
      // 具体性校验：过泛时带着问题重试一次；仍然过泛则拒收，避免把模板话写回语料。
      let check = findSpecificityIssues(value, effectiveContent);
      if (check.issues.length > 0) {
        const retryPrompt = `${prompt}

【上次输出不合格，必须修正】
${check.issues.map((issue) => `- ${issue}`).join("\n")}
请重写，必须逐项引用输入材料中的具体实体、数字、时间或动作；无法核实就写「现有材料未说明」。`;
        value = parseOnce(await callAI(retryPrompt, { json: true, temperature: 0.2 }));
        check = findSpecificityIssues(value, effectiveContent);
        if (check.issues.length > 0) {
          const err: any = new Error(`insufficient_specificity: ${check.issues.join("; ")}`);
          err.code = "insufficient_specificity";
          throw err;
        }
      }
      return value;
    });
    const value = generated.data;
    const wasCached = generated.cached || generated.deduped;
    const fieldMeta = createFieldMeta(
      provider,
      model,
      PROMPT_VERSIONS.skill,
      opts.certificationStandard || "ai_single"
    );
    if (target) {
      target[opts.field] = value;
      target.contentBasis = contentBasis;
      attachFieldMeta(target, [opts.field], fieldMeta);
      persistCorpus();
    }
    const quota = consumeGuestQuota
      ? chargeGuestDeepSuccess(req, articleId ? String(articleId) : undefined)
      : null;
    res.json({
      ok: true,
      cached: wasCached,
      contentBasis,
      overrides: {
        [opts.field]: value,
        contentBasis,
        ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}),
      },
      fieldMeta,
      ...(quota ? { guestQuota: { remaining: quota.remaining, deepReads: quota.deepReads, charged: quota.charged } } : {}),
    });
  } catch (err: any) {
    console.error(`${opts.skillKey} error:`, err);
    if (err?.code === "insufficient_specificity" || String(err?.message || "").startsWith("insufficient_specificity")) {
      return res.json({
        ok: false,
        reason: "insufficient_specificity",
        message: "模型输出过于笼统，缺少输入材料中的具体事实，已拒绝写入。请补充原文或重试。",
      });
    }
    res.json({ ok: false, reason: "error" });
  }
}

// —— 技能①：用大白话把这条新闻完整讲一遍（小白/通俗模式）——
app.post("/api/skill/plain", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "tongsuSummary",
    skillKey: "plain",
    consumeGuestQuota: false,
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的“小白讲解员”。请把下面这条新闻，用完全不懂行的大白话从头到尾讲一遍，严格只输出 JSON：
{
  "simpleSay": "用大白话把整件事讲完整（像对朋友解释：谁、干了什么、为什么、影响谁；2-4 句，零术语）",
  "whyExplanation": "用一个生活日常比喻解释“为什么会这样”",
  "whatItMeans": "对普通人直接意味着什么（1-2 句）",
  "jargonTerms": ["原文出现的术语/黑话，供点击释义", "至少2个（若有）"]
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题用克制、可复核的表述讲解"}
要求：simpleSay 必须是完整叙述而不是口号；禁止臆造原文没有的硬数据，无法核实的用定性说法。`,
  })
);

// —— 技能②：30 秒脱水干货（核心变化 + 影响要点）——
app.post("/api/skill/dehydrate", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "dehydratedItems",
    skillKey: "dehydrate",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的“速读压缩师”。请把下面这条新闻压成 30 秒可读完的干货清单，严格只输出 JSON：
{
  "coreEntity": "核心主体（公司/机构/人名/产品）",
  "keyAction": "一句话：它干了什么/发生了什么",
  "relatedCount": 3,
  "coreShifts": ["核心事实变化1", "核心事实变化2", "核心事实变化3"],
  "impactHighlights": ["对谁有什么影响", "关键看点"]
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题压缩"}
要求：coreShifts 每项一句话直给要点；impactHighlights 写清“影响谁、怎样影响”；禁止编造原文没有的硬数据。`,
  })
);

// —— 技能③：AI 综合解读（判断 / 依据 / 影响 / 边界）——
app.post("/api/skill/interpret", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "aiInterpretation",
    skillKey: "interpret",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的新闻综合解读员。请对下面这条新闻做简短、克制、可复核的 AI 解读，严格只输出 JSON：
{
  "aiInterpretation": {
    "core": "核心判断：这件事最值得记住的结论，一句话",
    "basis": "关键依据：支撑判断的事实或机制，一句话",
    "impact": "主要影响：最需要关注的变化或受影响方，一句话",
    "limits": "判断边界：哪里仍不确定，或什么情况会推翻判断，一句话",
    "motivation": ["动机1：为什么现在做、要打谁、牺牲什么（不得复述配置）", "动机2：竞争格局/产品线区隔/品牌诉求"],
    "grayscale": {
      "memberships": [
        { "hypothesis": "假设A，例如产业利好", "score": 72 },
        { "hypothesis": "假设B，例如产业利空", "score": 28 }
      ],
      "evidenceStrength": "高|中|低",
      "support": ["支持该组判断的事实或机制1", "支持证据2"],
      "oppose": ["反对证据或相反事实1", "反对证据2"],
      "uncertain": ["目前无法确认的变量1", "不确定变量2"],
      "reverseRisks": ["潜在反向风险点1", "反向风险点2"],
      "decisionReason": "为什么当前只能观察，或为什么可以进入行动评估"
    }
  }
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题解读"}
要求：core 必须是战略/行业定性（如心智突围/生态防守/价格挤压/技术试水），不得写成新闻导语或复述配置参数；motivation 固定 2 条、每条 40-80 字，必须回答“为什么是现在、要打谁、牺牲什么”，至少含一个具体对象/数字/竞品，禁止复述事实；若无法判断写“现有信息不足以判断”。grayscale.memberships 2-4 条，score 为 0-100 的模型隶属度，不是校准概率；support/oppose/uncertain 各 2-4 条，必须区分材料事实与模型推断；reverseRisks 1-3 条；只基于输入材料，不补造事实、数字或来源；证据不足时写“现有信息有限，需继续核验”。不要自行输出最终行动结论，系统会按阈值计算。
${HARDWARE_ANALYSIS_RULE}`,
  })
);

// —— 技能④：精简七要素（7W）——
app.post("/api/skill/sevenw", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "sevenWBrief",
    skillKey: "sevenw",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的新闻结构分析员。请用 7W 精简概括下面这条新闻，严格只输出 JSON：
{
  "sevenWBrief": {
    "what": "发生了什么，一句话",
    "who": "核心主体，一句话",
    "when": "关键时间，没有就写未说明",
    "where": "事件发生地或行业空间，没有就写未说明",
    "why": "主要动因，一句话",
    "how": "实现路径，一句话",
    "soWhat": "最重要的影响，一句话"
  }
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题概括"}
要求：每项只写一句，合计约 100-180 字；只概括输入材料，不补造硬数据；无法判断时写“未说明”。`,
  })
);

// 旧版 verdict 技能已移除：
// 定性由 enrich 的 oneSentenceVerdict / sevenElements.aiVerdict 统一提供，原端点产出无 UI 展示（死字段）。

// —— 技能⑤：趋势情景（短期/中期/关键变量/失效条件）——
app.post("/api/skill/trend", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "trendForecastText",
    skillKey: "trend",
    certificationStandard: "scenario",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的趋势情景分析师。请为下面这条新闻建立四行趋势模型，严格只输出 JSON：
{
  "shortTerm": "短期（1-3 个月）最可能的变化，一句话",
  "midTerm": "中期（3-12 个月）关键演化，一句话",
  "keyVariables": "需要持续观察的 1-3 个变量或信号，一句话",
  "invalidation": "出现什么条件时上述判断失效，一句话",
  "trends": ["行业/产业链趋势1：技术代际或上下游传导，≥20字并含具体机制/主体", "趋势2", "趋势3"]
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：shortTerm/midTerm/keyVariables/invalidation 每项至少 20 字，写具体驱动机制或可核验信号；trends 固定 2-3 条、每条 40-80 字，必须是行业/产业链级判断（技术代际演进、上下游传导、下一阶段竞争重点），点名具体环节/厂商/技术，禁止单机型复述；允许基于公开行业规则做简单推算，但必须标注“（推算）”；不得用“同价位规格对标”“趋势向好”等空话；不编造概率、比例或时间点；证据不足时写“现有信息不足以支撑强判断”。
${HARDWARE_ANALYSIS_RULE}`,
  })
);

// —— 技能⑥：风险审稿（风险/误解/盲点/指标）——
app.post("/api/skill/risk", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "riskReviewText",
    skillKey: "risk",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的对抗性审稿人（红队思维）。请为下面这条新闻建立四行风险模型，严格只输出 JSON：
{
  "mainRisk": "最重要的下行风险，并指出受影响方，一句话",
  "misread": "这条新闻最容易被怎样误读，一句话",
  "blindSpot": "报道没有说明但会影响判断的关键盲点，一句话",
  "watchMetrics": "接下来可核验的关注指标，一句话",
  "risks": ["风险1：工程物理极限/整机取舍/体验落差/商业落地，≥20字并含具体机制", "风险2", "风险3"]
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：每项至少 20 字；risks 固定 2-3 条、每条 40-90 字，分别覆盖工程物理极限、整机取舍代价、用户体验落差、商业落地阻力，必须含具体机制（如 DDIC 功耗、插帧延迟、BOM 挤压、EVT/DVT 良率）；能推算回收线/功耗/良率时给出数字，并标注“（推算）”及计算依据（如“按行业 2.5-3 倍宣发规则”）；mainRisk 不得只写“成本高/利润薄/未经证实”；只基于输入材料和可普遍核验的公开常识；无法判断时写“未说明”；不编造数据，不为制造冲突而夸大。
${HARDWARE_ANALYSIS_RULE}`,
  })
);

// —— 技能⑦：全景时间轴（只生成前情节点数组 backstoryTimeline）——
app.post("/api/skill/timeline", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "backstoryTimeline",
    skillKey: "timeline",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的新闻编年史梳理者。请梳理今天这条新闻【之前】的关键相关事件，严格只输出 JSON 数组（不要对象外壳）：
[
  { "date": "时间节点（尽量精确到年月；不确定写约2026年X月）", "event": "此前发生的相关事件一句话", "relevance": "它与今天这篇的关系（铺垫/诱因/同类进展/背景，一句话）" }
]
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：只列 3-6 个确属铺垫/诱因/同类进展的节点，时间正序（最久远在前），宁缺毋滥；不确定的用“约”；若确实没有值得写的前情，输出空数组 []。`,
  })
);

// —— 技能⑧：影响力与利益相关方分析（stakeholderImpact）——
app.post("/api/skill/stakeholders", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "stakeholderImpact",
    skillKey: "stakeholders",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的影响分析顾问。请分析下面这条新闻的主要受影响方（利益相关方），严格只输出 JSON 数组（不要对象外壳）：
[
  { "name": "受影响方名称（公司/机构/人群/行业）", "type": "company|government|person|group|industry|market", "direction": "benefit|pressure|neutral", "strength": 1, "why": "为什么受益/承压（一句话，克制可复核）" }
]
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：列出 3-6 个主要受影响方；direction=benefit 受益 / pressure 承压 / neutral 中性；strength 1-5 表示影响强度；why 说明理由，不臆造硬数据；宁缺毋滥。`,
  })
);

// —— 技能⑨：底层逻辑分析（coreLogic：本质 + 核心逻辑）——
app.post("/api/skill/corelogic", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "coreLogic",
    skillKey: "corelogic",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的第一性原理分析师。请剖析下面这条新闻的底层逻辑（本质与核心机制），严格只输出 JSON 对象：
{
  "essence": "事情的本质/底层逻辑一句话（第一性概括，不重复事件本身）",
  "points": ["核心逻辑1（结构性机制，如驱动的稀缺资源、约束条件、利益结构、演化规则）", "核心逻辑2", "核心逻辑3"],
  "counterIntuitive": "最反直觉或最易被误读的一点（没有则留空字符串）"
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：essence 一句话直击本质；points 列 2-4 条，每条约 20-40 字、讲机制不讲新闻复述；counterIntuitive 点出外行最容易想反的地方；克制、不臆造数据。`,
  })
);

// —— 技能⑩：正反方博弈（bullBearDebate）——
app.post("/api/skill/debate", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "bullBearDebate",
    skillKey: "debate",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的辩论建模师。请为下面这条新闻做"正反方博弈"分析，严格只输出 JSON 对象：
{
  "bull": [{ "point": "正方论点（支持/乐观方）", "basis": "依据或隐含假设，一句话" }],
  "bear": [{ "point": "反方论点（质疑/悲观方）", "basis": "依据或隐含假设，一句话" }],
  "coreDispute": "双方真正的分歧焦点（在争什么）一句话",
  "read": "当前力量判断：哪方论据更硬、或结果取决于什么关键条件（一句话，克制）"
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：bull 与 bear 各 2-3 条、针锋相对；basis 尽量落到可复核的事实/机制；coreDispute 与 read 各一句话；克制、不喊单、不臆造数据。`,
  })
);

// —— 技能⑪：AI 补充相关报道线索（relatedNews；AI 记忆召回，非实时联网）——
app.post("/api/skill/relatednews", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "relatedNews",
    skillKey: "relatednews",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的编辑推荐员。基于你的知识，为下面这条新闻推荐 3-5 条"值得一并阅读的相关报道"（同题材/同主体/后续进展的知名媒体稿件），严格只输出 JSON 数组（不要对象外壳）：
[
  { "title": "相关报道标题", "media": "媒体/机构名", "why": "为什么值得一起看（跟进/背景/反方/后续，一句话）" }
]
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：只列知名媒体确实报道过的题材，宁缺毋滥；若无把握，输出空数组 []。`,
  })
);

// —— 技能⑫：身份化「正反双向预测」（personaForecast；服务“我的身份”视角）——
// 与 runSingleSkill 不同：① 需要 personaId 维度；② 结果按 personaId upsert 进 personaForecasts 数组；
// 概率带只用 低/中/高（模型估计），杜绝伪精确百分比。
app.post("/api/skill/personaforecast", applyRateLimit, async (req, res) => {
  const { articleId, title, content, source, category, personaId, personaName, personaDesc, extraContext } = req.body || {};
  if (!title && !content) return res.status(400).json({ error: "Title or content is required" });
  if (!ensureGuestDeferredQuota(req, res)) return;
  const pid = String(personaId || "default");
  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `personaforecast:${djb2([
    String(articleId || "").trim(),
    String(title || "").trim(),
    String(content || "").trim(),
    pid,
    provider,
    model,
    PROMPT_VERSIONS.skill,
  ].join("\n"))}`;
  const target = articleId
    ? serverCorpus.find((a: any) => String(a?.id) === String(articleId))
    : undefined;

  // 按 personaId upsert 并写回语料
  const upsertWrite = (item: any) => {
    const stamped = { ...(item || {}), personaId: item?.personaId || pid, generatedAt: new Date().toISOString() };
    if (target) {
      const list = Array.isArray(target.personaForecasts) ? (target.personaForecasts as any[]) : [];
      const idx = list.findIndex((x) => x?.personaId === stamped.personaId);
      if (idx >= 0) list[idx] = stamped; else list.push(stamped);
      target.personaForecasts = list;
      persistCorpus();
    }
    return stamped;
  };

  const prompt = `你是「见微 Genway」的身份化双向预测建模师。请以“身份透镜”视角，为下面这条新闻做【该身份人物】的正反双向预测：既推演“事件若沿乐观路径发展，此身份会在哪些方面受益、如何兑现”，也推演“若沿悲观路径发展，会在哪些方面受损、如何兑现”。两个方向都必须给出可验证的情景、触发条件与证伪信号。严格只输出 JSON 对象（不要任何额外文字、不要 Markdown）：
{
  "personaId": "${pid}（原样返回）",
  "horizon": "主推演时间窗（如 3-6 个月；据事件性质可调，写中文）",
  "directionBias": "positive|negative|mixed（综合判断：主线当前更可能利好还是利空该身份）",
  "bull": {
    "scenario": "正向情景：事件如何展开会兑现该身份的利好（2-4 句，落到可感知的具体结果，不要空话）",
    "band": "高|中|低（该情景兑现的概率带估计）",
    "horizon": "该路径大致时间窗",
    "payoff": "对此身份最具体的受益点（一句话）",
    "triggers": ["触发条件1（若……则……）", "触发条件2", "触发条件3"],
    "falsify": ["该路径被证伪的信号（出现即此路不通，1-2 条）"]
  },
  "bear": {
    "scenario": "反向情景：事件如何展开会兑现该身份的风险（2-4 句）",
    "band": "高|中|低",
    "horizon": "该路径大致时间窗",
    "impact": "对此身份最具体的受损点（一句话）",
    "triggers": ["触发条件1（若……则……）", "触发条件2", "触发条件3"],
    "falsify": ["该路径被证伪的信号（1-2 条）"]
  },
  "keyMonitor": "一句话建议：盯住哪个指标/事件能验证哪条路径更可能兑现"
}
身份：${personaName || "该身份人物"}（定位：${personaDesc || "关注这条新闻对其自身与所处角色的影响"}）
标题：${title || "无标题"}
来源：${source || "外部信源"}
分类：${category || "外部信源"}
正文/要点：${content || "请基于标题克制推断"}
已有上下文（供参考，勿编造与之矛盾的硬数据）：
${extraContext || "（暂无；请基于标题与常识，信息不足时在 scenario 中明确写‘取决于……’）"}
要求：band 只是模型估计、务必克制；triggers/falsify 必须具体到可观察的数据或事件；不得臆造硬数据；信息不足就明说取决于什么。scenario/band 均为 AI 观点而非事实结论。`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return Array.isArray(parsed) ? parsed[0] : parsed?.bull && parsed?.bear ? parsed : parsed?.personaForecast;
    });
    const stamped = upsertWrite(generated.data || {});
    const fieldMeta = createFieldMeta(provider, model, PROMPT_VERSIONS.skill);
    if (target) attachFieldMeta(target, ["personaForecasts"], fieldMeta);
    const quota = chargeGuestDeepSuccess(req, articleId ? String(articleId) : undefined);
    return res.json({
      ok: true,
      cached: generated.cached || generated.deduped,
      overrides: {
        personaForecasts: target ? target.personaForecasts : [stamped],
        ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}),
      },
      fieldMeta,
      ...(quota ? { guestQuota: { remaining: quota.remaining, deepReads: quota.deepReads, charged: quota.charged } } : {}),
    });
  } catch (err: any) {
    console.error("personaforecast error:", err);
    return res.json({ ok: false, reason: "error" });
  }
});
}
