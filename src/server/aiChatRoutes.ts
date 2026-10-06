import express from "express";
import { activeProvider, callAI, callAIWithReasoning, providerModel } from "./ai";
import { getOrCreatePredict, predictKey, applyRateLimit } from "./cache";
import { zhFullDate, isoToday, nowHHmm } from "./date";
import { PROMPT_VERSIONS, attachFieldMeta, createFieldMeta, sanitizeEnrichPayload } from "./aiValidation";
import { generateAnalysisKey, getAnalysisFromDatabase, saveAnalysisToDatabase } from "./database";

const FALLBACK_NOTE = "未配置可用模型或上游请求失败，本次未生成内容。";

export function registerAiChatRoutes(app: express.Express): void {
  // AI News Interpretation & Cognitive Analysis endpoint
  app.post("/api/analyze", applyRateLimit, async (req, res) => {
    try {
      const { title, content, source, sourceUrl, category, articleId, forceRefresh } = req.body;
      if (!title && !content) {
        return res.status(400).json({ error: "Title or content is required" });
      }

      const analysisKey = generateAnalysisKey({ articleId, title, source, content });

      // 优先从数据库缓存查询
      if (!forceRefresh) {
        const cached = getAnalysisFromDatabase(analysisKey);
        if (cached && cached.payload) {
          return res.json({
            fallback: false,
            cached: true,
            hitCount: cached.hitCount,
            data: cached.payload,
          });
        }
      }

      const provider = activeProvider();
      if (!provider) {
        return res.json({
          fallback: true,
          fallbackReason: "no_api_key",
          fallbackNote: FALLBACK_NOTE,
          data: null,
        });
      }
      const model = providerModel(provider);

      const prompt = `你是一个顶级深度调查记者、政经智库宏观分析师与《见微 Genway》特约总编。
  《见微 Genway》的核心理念是：“于细微处，读懂新闻背后。报刊为骨，数据为翼，光谱拆解为记”。

  请对以下提供的新闻标题及内容进行极其精辟、深刻的“认知路径拆解”（七要素、逻辑因果树、六大身份“与我何干”、涟漪效应、五层光谱）：

  新闻标题：${title || "无标题"}
  新闻来源/背景：${source || "媒体报道"}
  原文链接：${sourceUrl || "未提供"}
  新闻正文/要点：${content || "请结合标题分析当前热点"}

  请严格输出合法的 JSON 格式，JSON 结构必须严格符合以下格式：
  {
    "title": "精炼的主标题（经典大报刊风格）",
    "subtitle": "副标题：提炼出最核心的隐蔽逻辑或细微反转",
    "oneSentenceVerdict": "高密度的一句话结论/定性（报刊黑体加粗风格）",
    "readTimeMinutes": 4,
    "category": "${category || "科技前沿"}",
    "tags": ["核心标签1", "标签2", "标签3"],
    "date": "${zhFullDate(new Date())}",
    "timeAgo": "刚刚",
    "sourceName": "${source || "见微·特约深度观察"}",
    "sourceDate": "${isoToday(new Date())} ${nowHHmm(new Date())}",
    "sourceCount": 1,
    "impactScope": "全球",
    "summary": "100-150字见微速读：直击核心真相",
    "coreQuote": "最具有穿透力的一句金句（报刊排版用）",
    "quoteAuthor": "见微·特约观察员",
    "tongsuSummary": {
      "simpleSay": "小白能完全听懂的大白话概括",
      "whyExplanation": "用极其生动的生活日常比喻解释为什么",
      "whatItMeans": "普通人能感受到的直接影响",
      "jargonTerms": ["专业术语1", "专业术语2"]
    },
    "dehydratedItems": {
      "coreEntity": "核心主体",
      "keyAction": "核心动作与事实",
      "relatedCount": 8,
      "coreShifts": ["核心变化1", "核心变化2", "核心变化3"],
      "impactHighlights": ["关键影响1", "关键影响2"]
    },
    "sevenElements": {
      "what": "具体发生了什么",
      "who": "核心参与各方与推手",
      "when": "发生时间节点与周期",
      "where": "地理与行业空间",
      "why": "深层动因与未言明的诉求",
      "how": "实现路径与操作手法",
      "soWhat": "对未来格局的终极影响",
      "aiVerdict": {
        "confidenceScore": 92,
        "volatility": "高",
        "actionLevel": "行动",
        "verdictSummary": "针对该事件的 AI 综合裁决建议"
      }
    },
    "logicTree": {
      "rootCause": "最底层的始发根因",
      "nodes": [
        { "id": "n-1", "label": "根因节点", "category": "cause", "description": "详细描述" },
        { "id": "n-2", "label": "传导节点1", "category": "mid_effect", "description": "详细描述" },
        { "id": "n-3", "label": "传导节点2", "category": "mid_effect", "description": "详细描述" },
        { "id": "n-4", "label": "终局市场影响", "category": "market_impact", "description": "详细描述" }
      ],
      "variableWeights": [
        { "name": "核心影响变量1", "weight": 40, "impactDirection": "up", "description": "说明" },
        { "name": "核心影响变量2", "weight": 30, "impactDirection": "down", "description": "说明" },
        { "name": "核心影响变量3", "weight": 20, "impactDirection": "neutral", "description": "说明" },
        { "name": "核心影响变量4", "weight": 10, "impactDirection": "up", "description": "说明" }
      ]
    },
    "personaImpacts": [
      { "personaId": "investor", "coreImpact": "对投资者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
      { "personaId": "manager", "coreImpact": "对企业决策者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
      { "personaId": "founder", "coreImpact": "对创业者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
      { "personaId": "pm", "coreImpact": "对产品经理的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
      { "personaId": "dev", "coreImpact": "对开发者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
      { "personaId": "sales_mkt", "coreImpact": "对销售市场的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" }
    ],
    "rippleEffect": {
      "stages": [
        { "stage": "一阶影响", "title": "直接影响", "timeframe": "1-3个月", "items": ["影响点1", "影响点2"], "severity": "高" },
        { "stage": "二阶影响", "title": "产业链连锁反应", "timeframe": "3-12个月", "items": ["影响点1", "影响点2"], "severity": "高" },
        { "stage": "三阶影响", "title": "宏观生态与地缘格局", "timeframe": "1-3年", "items": ["影响点1", "影响点2"], "severity": "中" }
      ],
      "knowledgeGraph": [
        { "id": "kg-1", "name": "主要机构/公司", "type": "company", "relationToMain": "核心发起方" },
        { "id": "kg-2", "name": "核心技术/协议", "type": "tech", "relationToMain": "关键突破" },
        { "id": "kg-3", "name": "关联行业市场", "type": "market", "relationToMain": "受影响下游" }
      ],
      "multiSources": [
        { "sourceName": "官方披露/白皮书", "tier": "Tier 1 顶级权威", "stance": "正面", "verified": false, "excerpt": "核心证据引述" },
        { "sourceName": "路透/彭博主流媒体", "tier": "Tier 1 顶级权威", "stance": "中性", "verified": false, "excerpt": "市场观点引述" }
      ]
    },
    "spectrumLayers": [
      {
        "layer": "micro_signal",
        "name": "事实层·微观线索",
        "color": "#F59E0B",
        "headline": "常人忽略的细节/数字/反常措辞",
        "content": "深入解析这个细微事实的异常之处...",
        "keyIndicators": ["线索1", "线索2"]
      },
      {
        "layer": "interests",
        "name": "利益层·各方博弈",
        "color": "#0284C7",
        "headline": "台前发声者 vs 幕后最大获益方",
        "content": "剖析各主体的隐秘动机...",
        "keyIndicators": ["获利方", "受损方"]
      },
      {
        "layer": "logic_chain",
        "name": "逻辑层·因果推演",
        "color": "#8B5CF6",
        "headline": "从表面现象到深层传导链条",
        "content": "推导因果逻辑...",
        "keyIndicators": ["传导链1", "传导链2"]
      },
      {
        "layer": "data_signal",
        "name": "信号层·量化指标",
        "color": "#0D9488",
        "headline": "行业与宏观五维信号强度",
        "content": "数据侧反映的真实热度与冷思考...",
        "keyIndicators": ["数据点1", "数据点2"]
      },
      {
        "layer": "deduction",
        "name": "推演层·见微之见",
        "color": "#E3120B",
        "headline": "未来6-18个月终局预测与行动盲区",
        "content": "终局洞察与给读者的认知升级提示...",
        "keyIndicators": ["中长期判断", "行动启示"]
      }
    ],
    "evidenceChain": [
      {
        "id": "ev-1",
        "claim": "论断1",
        "sourceFact": "输入材料中可查证的细节",
        "quote": "输入材料中的原文短引句；没有则留空",
        "sourceName": "来源名称；输入未提供则留空",
        "sourceUrl": "真实可访问链接；输入未提供则填 null，不得编造",
        "publishedAt": "来源发布时间；未知则 null",
        "sourceType": "primary_document|official_statement|reported_media|unknown",
        "relation": "supports|contradicts|context",
        "reliability": "可靠性依据说明",
        "confidenceScore": 0
      }
    ],
    "industrySignals": [
      { "sector": "核心行业", "strength": 88, "trend": "up", "detail": "行业异动描述" }
    ],
    "fastReadPoints": [
      { "tag": "核心转折", "text": "精辟解释这件事为什么在今天爆发" }
    ],
    "narrativeSections": [
      { "chapter": "第一章：平静湖面下的第一缕微澜", "paragraphs": ["深度叙事段落1...", "深度叙事段落2..."] }
    ]
  }

  证据边界（必须遵守）：
  1. multiSources 只允许列出输入材料中明确出现、能对应到原文表述的来源；无法核验时返回 []，不得补造媒体名或把模型记忆包装成“已核实”。
  2. evidenceChain.sourceFact 只能引用输入材料中的事实、数字或可解析出处；输入未提供的硬数据不得生成。
  3. confidenceScore 是模型自报的相对把握，不是经历史数据校准的真实概率；文案中不得称其为“命中率”“基准率”或“事实概率”。
  4. 所有推断用“可能/取决于/若…则…”表达，并明确列出可能推翻判断的信号。`;

      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      }

      parsed = sanitizeEnrichPayload(parsed);
      attachFieldMeta(parsed, ["evidenceChain", "sevenElements", "rippleEffect"], createFieldMeta(provider, model, PROMPT_VERSIONS.analyze));

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

      res.json({ fallback: false, cached: false, data: parsed });
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      res.json({
        fallback: true,
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
          fallbackNote: FALLBACK_NOTE,
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
        fallbackNote: FALLBACK_NOTE,
        answer: null,
        citations: [],
      });
    }
  });

  // Nuance In-depth Inquiry endpoint
  app.post("/api/ask-nuance", applyRateLimit, async (req, res) => {
    try {
      const { question, articleContext } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const provider = activeProvider();
      if (!provider) {
        return res.json({
          fallback: true,
          fallbackReason: "no_api_key",
          fallbackNote: FALLBACK_NOTE,
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

      res.json({ answer: text });
    } catch (err: any) {
      console.error("Nuance Ask error:", err);
      res.json({
        fallback: true,
        fallbackReason: "error",
        fallbackNote: FALLBACK_NOTE,
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
        const answer = generateBriefingAnswer(question);
        return res.json({ answer, fallback: true, fallbackReason: "no_api_key", fallbackNote: FALLBACK_NOTE });
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
      const fallbackAnswer = generateBriefingAnswer(req.body?.question || "");
      res.json({
        answer: fallbackAnswer,
        fallback: true,
        fallbackReason: "upstream_failed",
        fallbackNote: FALLBACK_NOTE,
      });
    }
  });

  function generateBriefingAnswer(question: string): string {
    const q = String(question || "").trim();
    return q
      ? `未生成回答。问题「${q.slice(0, 80)}」没有可用模型结果，这里不提供模板数字或行动建议。`
      : "未生成回答。没有可用模型结果。";
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
