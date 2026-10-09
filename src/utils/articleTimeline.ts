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
    fallbackNote: "时序因果脉络请求失败或未配置 AI 密钥，系统已拒绝生成通用虚构故事，仅保留本文基本节点。",
    summary: `围绕《${input.title}》的时序脉络（分析未完成）`,
    timeline: [
      {
        phase: "current",
        phaseLabel: "⚡ 当前事件节点",
        timeLabel: input.publishedAt || "当前",
        title: input.title,
        detail: input.summary || input.tongsuSummary || "当前节点使用文章已收录信息。",
        impact: input.oneSentenceVerdict || "未生成专属影响研判。",
        keySignals: ["来源于原文报道"],
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
