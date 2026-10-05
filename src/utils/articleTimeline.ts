export interface ArticleTimelineNode {
  phase: string;
  phaseLabel: string;
  timeLabel: string;
  title: string;
  detail: string;
  impact: string;
  keySignals?: string[];
}

export interface ArticleTimelineResult {
  summary: string;
  timeline: ArticleTimelineNode[];
  fallback: boolean;
  fallbackReason?: string;
  fallbackNote?: string;
}

export interface ArticleTimelineInput {
  id?: string;
  title: string;
  summary?: string;
  tongsuSummary?: string;
  oneSentenceVerdict?: string;
  category?: string;
  publishedAt?: string;
}

const memory = new Map<string, ArticleTimelineResult>();
const inflight = new Map<string, Promise<ArticleTimelineResult>>();

function cacheKey(input: ArticleTimelineInput): string {
  return `${input.id || ""}|${input.title}`;
}

function localTemplate(input: ArticleTimelineInput): ArticleTimelineResult {
  return {
    fallback: true,
    fallbackReason: "request_failed",
    fallbackNote: "时间线请求失败，下面是固定模板，不是模型判断。",
    summary: `围绕《${input.title}》的模板脉络：只保留前因、当前标题和未来观察框架。`,
    timeline: [
      {
        phase: "antecedent",
        phaseLabel: "前因与溯源",
        timeLabel: "模板",
        title: "前序背景（模板）",
        detail: "这里没有根据本文生成前因，只保留阅读位置。",
        impact: "不作为事实或预测。",
        keySignals: ["需对照原文"],
      },
      {
        phase: "current",
        phaseLabel: "当前关键节点",
        timeLabel: "当前",
        title: input.title,
        detail: input.summary || input.tongsuSummary || "当前节点使用文章标题和摘要。",
        impact: input.oneSentenceVerdict || "未生成影响判断。",
        keySignals: ["文章标题"],
      },
      {
        phase: "future",
        phaseLabel: "潜在未来触发点",
        timeLabel: "模板",
        title: "后续观察（模板）",
        detail: "未来节点未生成，不能据此推断后续走势。",
        impact: "不作为预测。",
        keySignals: ["需另行核验"],
      },
    ],
  };
}

export function fetchArticleTimeline(
  input: ArticleTimelineInput,
  force = false
): Promise<ArticleTimelineResult> {
  const key = cacheKey(input);
  if (force) {
    memory.delete(key);
  } else if (memory.has(key)) {
    return Promise.resolve(memory.get(key)!);
  } else if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  const task = (async () => {
    try {
      const res = await fetch("/api/article-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: {
            id: input.id,
            title: input.title,
            summary: input.summary,
            tongsuSummary: input.tongsuSummary,
            oneSentenceVerdict: input.oneSentenceVerdict,
            category: input.category,
            publishedAt: input.publishedAt,
          },
        }),
      });
      if (!res.ok) throw new Error(`timeline ${res.status}`);
      const json = await res.json();
      const timeline = Array.isArray(json?.timeline) ? json.timeline : [];
      if (timeline.length === 0) throw new Error("empty timeline");
      const result: ArticleTimelineResult = {
        summary: String(json.summary || ""),
        timeline,
        fallback: Boolean(json.fallback),
        fallbackReason: json.fallbackReason ? String(json.fallbackReason) : undefined,
        fallbackNote: json.fallback
          ? String(json.fallbackNote || "本次为模板时间线，不是模型判断。")
          : undefined,
      };
      memory.set(key, result);
      return result;
    } catch {
      const result = localTemplate(input);
      memory.set(key, result);
      return result;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}
