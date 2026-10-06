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
      // Deterministic fallback if AI provider is not available
      const isTech = String(article.category || "").includes("科技") || String(article.title).includes("AI") || String(article.title).includes("电池");
      const isGov = String(article.category || "").includes("政策") || String(article.title).includes("关税") || String(article.title).includes("监管");
    
      return res.json({
        summary: `围绕《${article.title}》的产业链演变脉络：从前期技术/政策酝酿到当前实质突破，再到后续连锁溢出。`,
        timeline: [
          {
            phase: "antecedent",
            phaseLabel: "📜 前因与溯源",
            timeLabel: "T-180D ~ T-30D 酝酿期",
            title: isGov ? "地缘贸易规则重审与前期反补贴立案调查" : isTech ? "上一代架构瓶颈凸显与研发中试线持续投入" : "供需失衡与行业集中度提升",
            detail: `在此次事件爆发前，相关主体已在行业标准制定、供应链原材料备货及专利布局上进行了多轮博弈与测试。`,
            impact: "推升了行业准入门槛与单点技术迁移成本。",
            keySignals: ["专利公开激增", "前期政策吹风会", "供应链散件排期延长"]
          },
          {
            phase: "current",
            phaseLabel: "⚡ 当前关键节点",
            timeLabel: "当前 (T0) 突破发生",
            title: article.title,
            detail: article.summary || article.tongsuSummary || "核心指标落地或关键协议签署，正式确立新的事实标准。",
            impact: article.oneSentenceVerdict || "重塑产业链利润分配格局，倒逼同业竞品调整应对策略。",
            keySignals: ["核心性能突破", "正式通告下发", "同业股价与现货价格波动"]
          },
          {
            phase: "future",
            phaseLabel: "🔮 潜在未来触发点",
            timeLabel: "T+30D ~ T+180D 演变窗口",
            title: isGov ? "属地化合规审查落地与关税正式执行节点" : isTech ? "规模化量产良品率爬坡与二代商业化竞品入场" : "上下游议价权重排与新订单周期释放",
            detail: "未来 90 天内需重点关注下游应用端客户采纳率、监管司法审查终裁及供应链二次扩产节奏。",
            impact: "决定该技术或政策是否能成为跨周期主导范式。",
            keySignals: ["客户留存与复购率", "海关通关抽检率", "第三方基准评测报告"]
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
      // Fallback response
      return res.json({
        summary: `围绕《${article.title}》的产业链演变脉络：从前期技术/政策酝酿到当前实质突破，再到后续连锁溢出。`,
        timeline: [
          {
            phase: "antecedent",
            phaseLabel: "📜 前因与溯源",
            timeLabel: "前序发酵期 (T-180D ~ T-30D)",
            title: "行业前置技术研发与政策立项准备",
            detail: "前期积累的研发投入、实验数据沉淀与地缘政策酝酿构成事件爆发的底层土壤。",
            impact: "催化上下游供应链提前进行产能与技术选型预备。",
            keySignals: ["早期论文与专利申报", "属地政策意见征求稿"]
          },
          {
            phase: "current",
            phaseLabel: "⚡ 当前关键节点",
            timeLabel: "当前正在发生 (T0)",
            title: article.title,
            detail: article.summary || article.tongsuSummary || "实质性技术点火或官方通告出台，确立全新市场预期。",
            impact: article.oneSentenceVerdict || "重塑行业竞争格局与利润分配机制。",
            keySignals: ["正式发布会 / 官方公报", "行业现货价格与订单异动"]
          },
          {
            phase: "future",
            phaseLabel: "🔮 潜在未来触发点",
            timeLabel: "未来演变窗口 (T+30D ~ T+180D)",
            title: "商业化规模量产验收与次生政策监管终裁",
            detail: "未来需密切跟进良品率爬坡数据、关键客户装车/部署反馈及海外监管跟进举措。",
            impact: "验证商业闭环成立并决定中长期市场占有率。",
            keySignals: ["首批大宗交付验收", "合规审查与反制通报"]
          }
        ]
      });
    }
  });


}
