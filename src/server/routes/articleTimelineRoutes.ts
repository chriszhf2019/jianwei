import type { Express } from "express";
import { activeProvider, callAI } from "../ai";

export type RateLimiter = (req: import("express").Request, res: import("express").Response, next: () => void) => void;

/** 文章全景时间轴（AI + 确定性降级） */
export function registerArticleTimelineRoutes(app: import("express").Express, applyRateLimit: RateLimiter): void {
  app.post("/api/article-timeline", applyRateLimit, async (req, res) => {
    const article = req.body?.article;
    if (!article || !article.title) {
      return res.status(400).json({ error: "article object with title is required" });
    }

    const provider = activeProvider();
    if (!provider) {
      return res.json({
        summary: `围绕《${article.title}》的时序脉络（未配置 AI 密钥）：仅展示事实发生点，不推测前因与未来。`,
        fallback: true,
        fallbackReason: "no_api_key",
        fallbackNote: "未配置 AI 模型密钥。系统拒绝输出虚构的通用故事，仅保留本文基本节点。",
        timeline: [
          {
            phase: "current",
            phaseLabel: "⚡ 当前事件节点",
            timeLabel: article.publishedAt || "当前 (T0)",
            title: article.title,
            detail: article.summary || article.tongsuSummary || "本文报道之事实核心。",
            impact: article.oneSentenceVerdict || "未生成专属影响研判（需配置 AI 模型密钥）。",
            keySignals: ["来源于原文报道"]
          }
        ]
      });
    }

    const prompt = `你是全球宏观与产业情报资深分析师。请对以下新闻事件进行深度时序因果穿透，严格梳理出该事件的【前因溯源】、【当前关键节点】和【潜在未来触发点】三阶段演变脉络。

  新闻标题：${article.title}
  新闻摘要：${article.summary || article.tongsuSummary || ""}
  核心判断：${article.oneSentenceVerdict || ""}
  所在赛道：${article.category || ""}
  发布时间：${article.publishedAt || "近期"}

  严格输出 JSON 格式（不要输出 markdown 标记外的其它文字）：
  {
    "summary": "一句话概括事件从起因到未来的演变本质",
    "timeline": [
      {
        "phase": "antecedent",
        "phaseLabel": "📜 前因与溯源",
        "timeLabel": "起因阶段 / 过去 1-6 个月",
        "title": "简明节点标题",
        "detail": "深度解析驱动该事件发生的前提、历史铺垫与直接导火索",
        "impact": "对当时格局的影响",
        "keySignals": ["关键催化信号1", "信号2"]
      },
      {
        "phase": "current",
        "phaseLabel": "⚡ 当前关键节点",
        "timeLabel": "当前正在发生",
        "title": "当前突破或核心转折标题",
        "detail": "当前发生的实质性动作、关键数据变动或政策签署",
        "impact": "对当下的直接冲击与行业重塑",
        "keySignals": ["关键突破1", "关键数据2"]
      },
      {
        "phase": "future",
        "phaseLabel": "🔮 潜在未来触发点",
        "timeLabel": "未来 1-6 个月预警",
        "title": "潜在未来演变分支或触发条件",
        "detail": "未来可能发生的次生连锁反应、政策落地窗口或反制动作",
        "impact": "决策者需留意的中长期格局变化",
        "keySignals": ["未来观察指标1", "触发阈值2"]
      }
    ]
  }`;

    try {
      const aiText = await callAI(prompt, { json: true, temperature: 0.2 });
      let parsed: any;
      try {
        parsed = JSON.parse(aiText);
      } catch {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (parsed && Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
        return res.json(parsed);
      }
      throw new Error("Invalid timeline structure from AI");
    } catch (err: any) {
      console.error("article-timeline AI error:", err);
      return res.json({
        summary: `围绕《${article.title}》的时序脉络（分析未完成）`,
        fallback: true,
        fallbackReason: "ai_error",
        fallbackNote: "AI 模型时序因果梳理未完成或超时，系统已拒绝生成通用虚构故事，仅保留本文基本节点。",
        timeline: [
          {
            phase: "current",
            phaseLabel: "⚡ 当前事件节点",
            timeLabel: article.publishedAt || "当前 (T0)",
            title: article.title,
            detail: article.summary || article.tongsuSummary || "当前节点使用文章已收录信息。",
            impact: article.oneSentenceVerdict || "未生成专属影响研判。",
            keySignals: ["来源于原文报道"]
          }
        ]
      });
    }
  });


}
