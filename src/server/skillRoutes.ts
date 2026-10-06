import type express from "express";
import { getOrCreateCached } from "./cache";
import { activeProvider, callAI, callAIWithReasoning, providerModel } from "./ai";
import { findCorpusArticle, markCorpusArticlesDirty, persistCorpus } from "./corpus";
import { djb2 } from "./cache";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeEnrichPayload,
} from "./aiValidation";

type RateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => void;
/** 技能型单项生成公共骨架：定位文章 → 查缓存 → 调 AI → 写回对应字段 */
async function runSingleSkill(
  req: any,
  res: any,
  opts: {
    field: string;
    skillKey: string;
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

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `${opts.skillKey}:${djb2([
    String(articleId || "").trim(),
    String(title || "").trim(),
    String(content || "").trim(),
    provider,
    model,
    PROMPT_VERSIONS.skill,
  ].join("\n"))}`;

  const prompt = opts.buildPrompt({
    title: String(title || "无标题"),
    source: String(source || "外部信源"),
    sourceUrl: String(sourceUrl || ""),
    publishedAt: String(publishedAt || ""),
    category: String(category || "外部信源"),
    content: String(content || ""),
  });
  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.3 });
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
    });
    const value = generated.data;
    const wasCached = generated.cached || generated.deduped;
    const target = articleId ? findCorpusArticle(articleId) : undefined;
    const fieldMeta = createFieldMeta(
      provider,
      model,
      PROMPT_VERSIONS.skill,
      opts.certificationStandard || "ai_single"
    );
    if (target) {
      target[opts.field] = value;
      attachFieldMeta(target, [opts.field], fieldMeta);
      markCorpusArticlesDirty([target]);
      persistCorpus();
    }
    res.json({
      ok: true,
      cached: wasCached,
      overrides: {
        [opts.field]: value,
        ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}),
      },
      fieldMeta,
    });
  } catch (err: any) {
    console.error(`${opts.skillKey} error:`, err);
    res.json({ ok: false, reason: "error" });
  }
}

// —— 技能①：用大白话把这条新闻完整讲一遍（小白/通俗模式）——

export function registerSkillRoutes(app: express.Express, applyRateLimit: RateLimiter): void {
  app.post("/api/skill/plain", applyRateLimit, (req, res) =>
    runSingleSkill(req, res, {
      field: "tongsuSummary",
      skillKey: "plain",
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
  要求：四项各一句；grayscale.memberships 2-4 条，score 为 0-100 的模型隶属度，不是校准概率；support/oppose/uncertain 各 2-4 条，必须区分材料事实与模型推断；reverseRisks 1-3 条；只基于输入材料，不补造事实、数字或来源；证据不足时写“现有信息有限，需继续核验”。不要自行输出最终行动结论，系统会按阈值计算。`,
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
    "invalidation": "出现什么条件时上述判断失效，一句话"
  }
  标题：${title}
  来源：${source}
  分类：${category}
  正文/要点：${content || "请基于标题"}
  要求：字段值只写内容，不重复“短期/中期/关键变量/失效条件”等标签，不写“一句话”；四项各一句，总计约 100-160 字；写条件变化和可核验信号，不重复新闻事实；不编造概率、比例或时间点；证据不足时写“现有信息不足以支撑强判断”。`,
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
    "watchMetrics": "接下来可核验的关注指标，一句话"
  }
  标题：${title}
  来源：${source}
  分类：${category}
  正文/要点：${content || "请基于标题"}
  要求：字段值只写内容，不重复“主要风险/易误读/盲点/关注指标”等标签，不写“一句话”；四项各一句，总计约 100-160 字；只基于输入材料和可普遍核验的公开常识；无法判断时写“未说明”；不编造数据，不为制造冲突而夸大。`,
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
    const target = articleId ? findCorpusArticle(articleId) : undefined;

    // 按 personaId upsert 并写回语料
    const upsertWrite = (item: any) => {
      const stamped = { ...(item || {}), personaId: item?.personaId || pid, generatedAt: new Date().toISOString() };
      if (target) {
        const list = Array.isArray(target.personaForecasts) ? (target.personaForecasts as any[]) : [];
        const idx = list.findIndex((x) => x?.personaId === stamped.personaId);
        if (idx >= 0) list[idx] = stamped; else list.push(stamped);
        target.personaForecasts = list;
        markCorpusArticlesDirty([target]);
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
      return res.json({
        ok: true,
        cached: generated.cached || generated.deduped,
        overrides: {
          personaForecasts: target ? target.personaForecasts : [stamped],
          ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}),
        },
        fieldMeta,
      });
    } catch (err: any) {
      console.error("personaforecast error:", err);
      return res.json({ ok: false, reason: "error" });
    }
  });

}
