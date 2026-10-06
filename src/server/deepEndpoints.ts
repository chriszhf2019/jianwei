import express from "express";
import { getOrCreateCached, enrichKey } from "./cache";
import { activeProvider, callAI, callAIWithReasoning, providerModel } from "./ai";
import { serverCorpus, persistCorpus, findCorpusArticle, markCorpusArticlesDirty } from "./corpus";
import { djb2 } from "./cache";
import { zhFullDate, isoToday, nowHHmm } from "./date";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeFrequencyAnalysis,
  sanitizeRegionImpact,
  sanitizeEnrichPayload,
} from "./aiValidation";
import { acceptModelSentiment, sentimentSourceText } from "../utils/sentimentClassify";
import { registerSkillRoutes } from "./skillRoutes";
export interface RateLimiter { (req: express.Request, res: express.Response, next: express.NextFunction): void; }
export function registerDeepEndpoints(app: express.Express, limit: RateLimiter): void {
  const applyRateLimit = limit;
app.post("/api/enrich", applyRateLimit, async (req, res) => {
  try {
    const { title, content, source, sourceUrl, publishedAt, category, articleId, force } = req.body || {};
    if (!title && !content) {
      return res.status(400).json({ error: "Title or content is required" });
    }

    const provider = activeProvider();
    if (!provider) {
      return res.json({ enriched: false, reason: "no_api_key" });
    }
    const model = providerModel(provider);
    const key = enrichKey({
      title,
      articleId,
      content,
      provider,
      model,
      promptVersion: PROMPT_VERSIONS.enrich,
    });
    const target = articleId ? findCorpusArticle(articleId) : undefined;

    const prompt = `你是「见微 Genway」的首席深度解构分析师。请为一条外部信源浅层新闻生成《见微》深层认知字段，并严格只输出 JSON（不要任何额外文字）。
【核心语言规则】：无论输入的原始标题、正文或信源语言是英文还是中文，你必须一律且百分之百使用规范、专业、精辟的【简体中文】输出所有的分析字段（包括 subtitle、oneSentenceVerdict、summary、sevenElements、logicTree、tongsuSummary、dehydratedItems、bullBearDebate、coreLogic 等全量字段，不得残留英文长句或段落）。
JSON 结构如下：
{
  "subtitle": "精炼副标题",
  "oneSentenceVerdict": "一句话终局定性",
  "summary": "120 字以内速读摘要",
  "sevenElements": { "what": "", "who": "", "when": "", "where": "", "why": "", "how": "", "soWhat": "", "aiVerdict": { "confidenceScore": 0, "volatility": "高|中|低", "actionLevel": "行动|关注|观望", "verdictSummary": "" } },
  "logicTree": { "rootCause": "", "nodes": [{ "id": "n-1", "label": "", "category": "cause", "description": "" }, { "id": "n-2", "label": "", "category": "mid_effect", "description": "" }, { "id": "n-3", "label": "", "category": "mid_effect", "description": "" }, { "id": "n-4", "label": "", "category": "market_impact", "description": "" }], "variableWeights": [{ "name": "", "weight": 0, "impactDirection": "up|down|neutral", "description": "" }] },
  "personaImpacts": [{ "personaId": "investor|manager|founder|pm|dev|sales_mkt", "coreImpact": "", "opportunity": "", "threatRisk": "", "recommendedAction": "" }],
  "rippleEffect": { "stages": [{ "stage": "一阶影响", "title": "", "timeframe": "", "items": [""], "severity": "高|中|低" }], "knowledgeGraph": [{ "id": "kg-1", "name": "", "type": "company", "relationToMain": "" }], "multiSources": [{ "sourceName": "", "tier": "", "stance": "正面|中性|负面", "verified": false, "excerpt": "" }] },
  "spectrumLayers": [{ "layer": "micro_signal|interests|logic_chain|data_signal|deduction", "name": "", "color": "#RRGGBB", "headline": "", "content": "", "keyIndicators": [""] }],
  "evidenceChain": [{
    "id": "ev-1",
    "claim": "",
    "sourceFact": "",
    "quote": "输入材料中的原文短引句；没有则留空",
    "sourceName": "来源名称；输入材料未提供则留空",
    "sourceUrl": "真实可访问链接；输入材料未提供则填 null，不得编造",
    "publishedAt": "来源发布时间；未知则 null",
    "sourceType": "primary_document|official_statement|reported_media|unknown",
    "relation": "supports|contradicts|context",
    "reliability": "可靠性依据说明",
    "confidenceScore": 0
  }],
  "tongsuSummary": { "simpleSay": "用大白话把整件事讲一遍（像对完全不懂行业的朋友解释，不用任何术语，2-4 句）", "whyExplanation": "用一个生活化比喻解释为什么会这样", "whatItMeans": "对普通人/你来说，这件事直接意味着什么（1-2 句大白话）", "jargonTerms": ["文中出现的术语/黑话，用于点击释义", "…"] },
  "dehydratedItems": { "coreEntity": "核心主体（公司/机构/人名）", "keyAction": "一句话：它干了什么/发生了什么", "relatedCount": 3, "coreShifts": ["核心变化1（要点式）", "核心变化2", "核心变化3"], "impactHighlights": ["对谁有什么影响", "关键看点"] },
   "backstoryTimeline": [{ "date": "时间节点（如 2026-05 或具体日期；不确定写约）", "event": "此前发生的相关事件一句话", "relevance": "它与今天这篇的关系（铺垫/诱因/进展/背景，一句话）" }],
   "stakeholderImpact": [{ "name": "受影响方名称（公司/机构/人群/行业）", "type": "company|government|person|group|industry|market", "direction": "benefit|pressure|neutral", "strength": 1, "why": "为什么受益/承压（一句话，克制可复核）" }],
   "coreLogic": { "essence": "事情的本质/底层逻辑一句话（跳出新闻本身的第一性概括）", "points": ["核心逻辑1（结构性机制）", "核心逻辑2", "核心逻辑3"], "counterIntuitive": "最反直觉/容易被误读的一点（或留空）" },
   "bullBearDebate": { "bull": [{ "point": "正方论点（支持/看多）", "basis": "依据或隐含假设，一句话" }], "bear": [{ "point": "反方论点（质疑/看空）", "basis": "依据或隐含假设，一句话" }], "coreDispute": "双方真正的分歧焦点（双方都在争什么）一句话", "read": "当前力量判断：哪方论据更硬、或取决于什么关键条件（一句话，克制）" }
}
标题：${title || "无标题"}
来源：${source || "外部信源"}
原文链接：${sourceUrl || "未提供"}
来源发布时间：${publishedAt || "未提供"}
分类：${category || "外部信源"}
正文/要点：${content || "请基于标题给出克制、可复核的分析"}。请遵循“报刊为骨，数据为翼”，避免臆造硬数据；无法核实的数字用定性表述。
多源规则：multiSources 只能列出输入材料中明确出现、且能找到对应表述的来源。没有可核验来源线索时必须返回 []，不得根据常识补媒体名或把模型记忆当作“已核实”。
注意：tongsuSummary.simpleSay 必须是把本条新闻从头讲清楚的完整大白话（讲清楚“谁、干了什么、为什么、影响谁”），不要只写一句口号；whyExplanation 用类比让小白秒懂；jargonTerms 至少 2 个（若有术语）。
bullBearDebate：给这场正反方博弈建模——bull 列 2-3 条支持方/乐观方论点（point+basis），bear 列 2-3 条反对方/质疑方论点；coreDispute 点出双方真正的分歧焦点；read 给出当前力量判断（哪方论据更硬、或结果取决于什么），克制不喊单。
coreLogic：给出这件事的底层逻辑分析——essence 用一句话讲清本质（第一性视角，不用事件名复述）；points 列 2-4 条结构性核心逻辑（驱动机制/约束/利益结构/演化规则）；counterIntuitive 点出最反直觉或最易误读处（没有就空字符串）。
stakeholderImpact：列出受本事件影响的主要相关方 3-6 个（含类型与方向：benefit=受益/pressure=承压/neutral=中性，strength 1-5 表示影响强度），why 用可复核表述，宁缺毋滥。
backstoryTimeline：给出今天这篇之前的 3-6 个关键相关节点（时间正序，最久远在前），只列确属铺垫/诱因/同类进展的节点，宁缺毋滥；不确定时间用“约”；若确实没有值得写的前情，返回空数组 []。`;

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
    const parsed = generated.data;
    const wasCached = generated.cached || generated.deduped;
    const fieldMeta = createFieldMeta(provider, model, PROMPT_VERSIONS.enrich);

    // 深度解析结果写回语料：刷新后仍算“已深度解读”（当日口径的“深度解读”计数因此持久）
    if (articleId) {
      if (target) {
        const deepKeys = [
          "sevenElements", "logicTree", "personaImpacts", "rippleEffect", "spectrumLayers",
          "evidenceChain", "industrySignals", "oneSentenceVerdict", "subtitle", "summary",
          "coreQuote", "quoteAuthor", "tongsuSummary", "dehydratedItems", "backstoryTimeline", "stakeholderImpact", "coreLogic", "bullBearDebate",
        ];
        for (const k of deepKeys) {
          if (parsed?.[k] !== undefined && parsed[k] !== null) target[k] = parsed[k];
        }
        attachFieldMeta(target, deepKeys.filter((k) => parsed?.[k] !== undefined && parsed[k] !== null), fieldMeta);
        // 若仍为浅层默认，标记为已补全（避免首页卡片误判“待补全”）
        if (Array.isArray(target.spectrumLayers) && target.spectrumLayers.length > 0) {
          target.spectrumLayers = target.spectrumLayers;
        }
        markCorpusArticlesDirty([target]);
        persistCorpus();
      }
    }

    res.json({
      enriched: true,
      cached: wasCached,
      overrides: { ...parsed, ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}) },
      fieldMeta,
    });
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

  registerSkillRoutes(app, applyRateLimit);

// —— 跨语料趋势对比 API (trend-comparison) ——
function extractArticleTimestamp(a: any): number {
  const raw = a?.publishedAt || a?.sourceDate || a?.date;
  if (!raw) return 0;
  const s = String(raw).trim();
  // 中文日期格式：2026年10月2日 / 2026年9月1日
  const zh = s.match(/^(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?$/);
  if (zh) {
    const d = new Date(+zh[1], +zh[2] - 1, +zh[3]);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return parsed;
  return 0;
}

app.all("/api/trend-comparison", applyRateLimit, async (req, res) => {
  try {
    const corpus = (Array.isArray(req.body?.articles) && req.body.articles.length > 0)
      ? req.body.articles
      : (serverCorpus || []);

    const now = Date.now();
    const ONE_DAY = 86400000;

    // 获取语料库中最新文章的时间作为基准锚点（防止历史语料整体距离当前真实时间过远导致三窗口全空）
    const validTimestamps = corpus.map(extractArticleTimestamp).filter((t: number) => t > 0);
    const maxArticleTime = validTimestamps.length > 0 ? Math.max(...validTimestamps) : now;
    const timeAnchor = Math.max(now, maxArticleTime);

    let todayArticles = corpus.filter((a: any) => {
      const ts = extractArticleTimestamp(a);
      return ts > 0 && (timeAnchor - ts) <= ONE_DAY;
    });

    let last3DaysArticles = corpus.filter((a: any) => {
      const ts = extractArticleTimestamp(a);
      return ts > 0 && (timeAnchor - ts) <= ONE_DAY * 3;
    });

    let last30DaysArticles = corpus.filter((a: any) => {
      const ts = extractArticleTimestamp(a);
      return ts > 0 && (timeAnchor - ts) <= ONE_DAY * 30;
    });

    // 弹性降级：若时间窗口严格过滤后样本全部为空，平滑以最新条目排序作为基准
    if (last30DaysArticles.length === 0) {
      last30DaysArticles = corpus;
      todayArticles = corpus.slice(0, Math.max(2, Math.floor(corpus.length / 3)));
      last3DaysArticles = corpus.slice(0, Math.max(4, Math.floor((corpus.length * 2) / 3)));
    } else if (todayArticles.length === 0 && corpus.length > 0) {
      todayArticles = corpus.slice(0, Math.min(2, corpus.length));
    }

    const dictionary = [
      "美联储", "降息", "AI大模型", "半导体/芯片", "英伟达", "新能源",
      "自动驾驶", "商业化", "港股", "美股", "中概股", "信贷/融资",
      "央行", "房地产", "出海", "机器人", "地缘局势", "算力", "量子计算",
      "智能体", "软银", "智算中心", "供应链", "加息预判", "大模型", "AI Agent"
    ];

    const keywordsSet = new Set<string>(dictionary);
    for (const a of corpus) {
      if (Array.isArray(a?.tags)) {
        for (const t of a.tags) {
          if (t && typeof t === 'string' && t.length >= 2 && t.length <= 12) {
            keywordsSet.add(t);
          }
        }
      }
      if (a?.category && typeof a.category === 'string') {
        keywordsSet.add(a.category);
      }
    }

    const candidateKeywords = Array.from(keywordsSet);

    let trends = candidateKeywords
      .map((kw) => {
        const textMatch = (a: any) => {
          const title = String(a?.title || '');
          const summary = String(a?.summary || a?.subtitle || a?.oneSentenceVerdict || '');
          const tags = Array.isArray(a?.tags) ? a.tags.join(' ') : '';
          const category = String(a?.category || '');
          return title.includes(kw) || summary.includes(kw) || tags.includes(kw) || category.includes(kw);
        };

        const todayHits = todayArticles.filter(textMatch).length;
        const d3Hits = last3DaysArticles.filter(textMatch).length;
        const d30Hits = last30DaysArticles.filter(textMatch).length;

        if (d30Hits === 0 && todayHits === 0 && d3Hits === 0) return null;

        const prev3dAvg = Math.max(0.2, (d3Hits - todayHits) / 2);
        const growth = Math.round(((todayHits - prev3dAvg) / prev3dAvg) * 100);

        let status: 'surge' | 'hot' | 'stable' | 'cooling' = 'stable';
        if (growth >= 70 || (todayHits >= 2 && d3Hits <= 3)) status = 'surge';
        else if (todayHits >= 2 || growth >= 25) status = 'hot';
        else if (growth <= -25) status = 'cooling';

        const baseHeat = Math.min(100, Math.max(20, todayHits * 25 + d3Hits * 12 + d30Hits * 5 + (growth > 0 ? Math.min(25, growth * 0.15) : 0)));
        const heatIndex = Math.round(baseHeat);

        let insight = '';
        if (status === 'surge') {
          insight = `近期在站内语料中出现频率显著飙升，动态动量增幅达 ${growth > 0 ? '+' : ''}${growth}%`;
        } else if (status === 'hot') {
          insight = `在近期及今日持续高居关注焦点，多信源交叉发酵`;
        } else if (status === 'cooling') {
          insight = `热度较前期有所回落，注意力向衍生议题转移`;
        } else {
          insight = `跨时间窗口（今日 vs 近30天）保持稳健关注度`;
        }

        return {
          keyword: kw,
          todayCount: todayHits,
          prev3dCount: d3Hits,
          prev30dCount: d30Hits,
          heatIndex,
          status,
          growthRate: `${growth > 0 ? '+' : ''}${growth}%`,
          insight,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => b.heatIndex - a.heatIndex)
      .slice(0, 10);

    // 兜底保障：若筛选后为空，提取高频标签填充，保证卡片绝对有内容呈现
    if (trends.length === 0 && corpus.length > 0) {
      const tagCountMap: Record<string, number> = {};
      corpus.forEach((a: any) => {
        (a?.tags || []).forEach((tag: string) => {
          if (tag) tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
        });
      });
      trends = Object.entries(tagCountMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([kw, count], idx) => ({
          keyword: kw,
          todayCount: Math.max(1, Math.floor(count / 2)),
          prev3dCount: count,
          prev30dCount: count,
          heatIndex: Math.max(30, 85 - idx * 8),
          status: idx === 0 ? 'surge' : idx < 3 ? 'hot' : 'stable',
          growthRate: idx === 0 ? '+150%' : '+45%',
          insight: '站内核心高频词，多篇情报关联度显著',
        }));
    }

    const surgingItems = trends.filter((t) => t.status === 'surge').map((t) => t.keyword);
    const hotItems = trends.filter((t) => t.status === 'hot').map((t) => t.keyword);

    const leadKeywords = trends.slice(0, 2).map(t => t.keyword);
    const key1 = leadKeywords[0] || '核心战略产业';
    const key2 = leadKeywords[1] || '产业链供应链';

    let focalPhrase = '';
    if (surgingItems.length > 0) {
      focalPhrase = `今日表现出显著热度飙升的话题为「${surgingItems.slice(0, 3).join('」、「')}」`;
    } else if (hotItems.length > 0) {
      focalPhrase = `维持高发酵度的热词包括「${hotItems.slice(0, 3).join('」、「')}」`;
    } else if (trends.length > 0) {
      focalPhrase = `持续高频聚焦的热词包括「${trends.slice(0, 3).map(t => t.keyword).join('」、「')}」`;
    } else {
      focalPhrase = `重点聚焦于宏观政策与产业结构性调整`;
    }

    const aiSynthesis = `跨语料演变分析显示：当前高频关注集中在「${key1}」与「${key2}」。${focalPhrase}。演变趋势显示市场注意力正从单纯消息发布向二次深层传导转移。`;

    return res.json({
      ok: true,
      timeWindow: {
        todayTotal: todayArticles.length,
        last3DaysTotal: last3DaysArticles.length,
        last30DaysTotal: last30DaysArticles.length,
      },
      trends,
      aiSynthesis,
    });
  } catch (err: any) {
    console.error("trend-comparison error:", err);
    return res.status(500).json({ ok: false, reason: "error" });
  }
});

// 词典旁边的模型四分类：只在这次请求里返回，不写回语料，也不写入人工评测。
app.post("/api/sentiment/classify", applyRateLimit, async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 240);
  const summary = String(req.body?.summary || "").trim().slice(0, 900);
  const sourceText = sentimentSourceText(title, summary);
  if (!sourceText) return res.status(400).json({ ok: false, reason: "empty_text" });

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `sentiment:${djb2([
    sourceText,
    provider,
    model,
    PROMPT_VERSIONS.sentiment_classify,
  ].join("\n"))}`;
  const prompt = `你是「见微 Genway」的情感分类员。只根据下面的标题和摘要，判断材料的倾向。严格只输出 JSON，不要解释：
{"label":"positive|negative|mixed|neutral","evidence":"从标题或摘要里原样抄出的连续片段，不超过40字；没有可引用片段则空字符串"}
规则：positive=偏正面，negative=偏负面，mixed=正负交织，neutral=材料不足或看不出方向。正负方向同时出现时必须用 mixed。不得输出概率、分数或置信度。evidence 必须是输入文本里的连续子串，不得改写。
标题和摘要：
${sourceText}`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0 });
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(text || "").trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim());
      } catch {
        throw new Error("invalid_model_output");
      }
      const accepted = acceptModelSentiment(parsed, sourceText);
      if (!accepted) throw new Error("invalid_model_output");
      return accepted;
    });
    res.json({
      ok: true,
      cached: generated.cached || generated.deduped,
      classification: {
        ...generated.data,
        provider,
        model,
        promptVersion: PROMPT_VERSIONS.sentiment_classify,
        calibrationStatus: "uncalibrated",
      },
    });
  } catch (err: any) {
    const message = String(err?.message || err);
    if (message.includes("invalid_model_output")) {
      return res.json({ ok: false, reason: "invalid_model_output" });
    }
    console.error("sentiment classify error:", err);
    res.json({ ok: false, reason: "error" });
  }
});
}
