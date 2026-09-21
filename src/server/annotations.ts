import express from "express";
import { serverCorpus, persistCorpus } from "./corpus";
import { callAI, activeProvider, providerModel } from "./ai";
import { PROMPT_VERSIONS, attachFieldMeta, createFieldMeta } from "./aiValidation";
import { normalizeEntityMentions } from "../utils/entityGraph";
import { normalizeRegionMentions } from "../utils/regionSemantics";
import { recordAuditEvent } from "./database";

export type AnnotatorKind = "regions" | "entities";

export interface JobState {
  kind: AnnotatorKind;
  running: boolean;
  processed: number;
  total: number;
  failed: number;
  cancelRequested: boolean;
  status: "idle" | "running" | "finished" | "cancelled";
  startedAt: string | null;
  finishedAt: string | null;
}

function createJob(kind: AnnotatorKind): JobState {
  return {
    kind,
    running: false,
    processed: 0,
    total: 0,
    failed: 0,
    cancelRequested: false,
    status: "idle",
    startedAt: null,
    finishedAt: null,
  };
}

const JOBS: Record<AnnotatorKind, JobState> = {
  regions: createJob("regions"),
  entities: createJob("entities"),
};
const BATCH = 20;
const REGION_VALUES = new Set(["中国大陆", "美国", "欧洲", "日韩", "东南亚", "中东", "拉美", "其他"]);
const ENTITY_TYPES = new Set(["公司", "机构", "人物", "其他"]);

function normalizeRegion(value: unknown): string {
  const region = String(value || "").trim();
  return REGION_VALUES.has(region) ? region : "其他";
}

function normalizeEntityType(value: unknown): string {
  const type = String(value || "").trim();
  return ENTITY_TYPES.has(type) ? type : "其他";
}

function parseJsonSafely(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  }
}

function jobTodo(job: JobState): any[] {
  const field = job.kind === "regions" ? "regionMentions" : "entityMentions";
  return serverCorpus.filter((a: any) => {
    if (!a.isExternal || !((a.title || "") + (a.summary || "")).trim()) return false;
    if (!Array.isArray(a[field])) return true;
    if (a.aiFieldMeta?.[field]?.promptVersion !== PROMPT_VERSIONS.annotations) return true;
    if (job.kind === "regions") {
      return a[field].length === 0 || a[field].some((item: any) => item?.scope === "unspecified");
    }
    return false;
  });
}

function jobPrompt(job: JobState, chunk: any[], base: number): string {
  const role = job.kind === "regions" ? "地区标注员" : "主体抽取员";
  const target = job.kind === "regions"
    ? '分别识别"报道提及地区""事件发生地区""实际受影响地区"（合计最多 6 个，置信度 0-1）'
    : '抽取"主要涉事主体"（公司/机构/人物，≤3 个，保留原文表面词、类型与置信度 0-1）';
  const schema = job.kind === "regions"
    ? '{"results":[{"index":0,"regions":[{"region":"中国大陆|美国|欧洲|日韩|东南亚|中东|拉美|其他","scope":"mentioned|event|affected","confidence":0.0}]}]}'
    : '{"results":[{"index":0,"entities":[{"name":"","type":"公司|机构|人物|其他","confidence":0.0}]}]}';
  return `你是「见微 Genway」的${role}。对以下每条新闻${target}，仅输出 JSON：${schema}
规则：地区范围必须区分提及、发生和受影响；无法从输入判断时不要臆测。实体 name 必须保留输入中的表面词。
条目列表：
${chunk.map((a: any, idx: number) => `${base + idx}. ${a.title}。${a.summary || ""}`).join("\n")}`;
}

function jobAttach(job: JobState, chunk: any[], parsed: any, base: number): void {
  const list = Array.isArray(parsed?.results) ? parsed.results : [];
  chunk.forEach((a: any, k: number) => {
    const found = list.find((r: any) => Number(r?.index) === base + k);
    if (!found) return;
    if (job.kind === "regions" && Array.isArray(found.regions)) {
      a.regionMentions = normalizeRegionMentions(
        found.regions.map((r: any) => ({
          region: normalizeRegion(r?.region),
          scope: r?.scope,
          confidence: Math.max(0, Math.min(1, Number(r?.confidence) || 0)),
        }))
      );
    } else if (job.kind === "entities" && Array.isArray(found.entities)) {
      a.entityMentions = normalizeEntityMentions(
        found.entities.map((e: any) => ({
          name: e?.name,
          type: normalizeEntityType(e?.type),
          confidence: Math.max(0, Math.min(1, Number(e?.confidence) || 0)),
        })),
        { title: a.title, summary: a.summary }
      );
    }
  });
}

async function runJob(job: JobState): Promise<void> {
  const todo = jobTodo(job);
  job.total = todo.length;
  job.startedAt = new Date().toISOString();
  job.finishedAt = null;
  job.processed = 0;
  job.failed = 0;
  job.cancelRequested = false;
  job.status = "running";

  for (let base = 0; base < todo.length && !job.cancelRequested; base += BATCH) {
    const chunk = todo.slice(base, base + BATCH);
    try {
      const provider = activeProvider();
      if (!provider) throw new Error("no_api_key");
      const text = await callAI(jobPrompt(job, chunk, base), { json: true, temperature: 0.1 });
      const parsed = parseJsonSafely(text);
      jobAttach(job, chunk, parsed, base);
      const field = job.kind === "regions" ? "regionMentions" : "entityMentions";
      const meta = createFieldMeta(provider, providerModel(provider), PROMPT_VERSIONS.annotations);
      for (const article of chunk) {
        if (Array.isArray(article?.[field])) attachFieldMeta(article, [field], meta);
      }
    } catch {
      job.failed += chunk.length;
    } finally {
      job.processed = Math.min(job.total, job.processed + chunk.length);
    }
  }
  persistCorpus();
  job.finishedAt = new Date().toISOString();
  job.running = false;
  job.status = job.cancelRequested ? "cancelled" : "finished";
  recordAuditEvent({
    actor: "local",
    action: "annotation.batch",
    entityType: job.kind,
    entityId: "full_corpus",
    status: job.failed > 0 ? "error" : "success",
    metadata: {
      processed: job.processed,
      failed: job.failed,
      total: job.total,
      status: job.status,
    },
  });
}

export interface RateLimiter {
  (req: express.Request, res: express.Response, next: express.NextFunction): void;
}

function registerAnnotator(app: express.Express, path: string, job: JobState, limit: RateLimiter): void {
  app.post(`${path}/annotate`, limit, (_req, res) => {
    if (job.running) return res.json({ ok: true, running: true, task: job });
    if (!activeProvider()) return res.json({ ok: false, reason: "no_api_key" });
    if (jobTodo(job).length === 0) return res.json({ ok: true, running: false, done: true, task: job });
    job.running = true;
    void runJob(job);
    res.json({ ok: true, running: true, task: job });
  });
  app.post(`${path}/cancel`, limit, (_req, res) => {
    job.cancelRequested = true;
    res.json({ ok: true, task: job });
  });
  app.get(`${path}/status`, (_req, res) => {
    res.json({ ok: true, task: job });
  });
}

export function registerAnnotationRoutes(app: express.Express, limit: RateLimiter): void {
  registerAnnotator(app, "/api/regions", JOBS.regions, limit);
  registerAnnotator(app, "/api/entities", JOBS.entities, limit);

  // 抽样判定端点
  app.post("/api/regions", limit, async (req, res) => {
    try {
      const items: Array<{ id: string; title: string; summary?: string }> = Array.isArray(req.body?.items)
        ? req.body.items.slice(0, 24).map((i: any) => ({
            id: String(i?.id || ""),
            title: String(i?.title || "").slice(0, 160),
            summary: String(i?.summary || "").slice(0, 300),
          })).filter((i: any) => i.id && i.title)
        : [];
      const provider = activeProvider();
      if (items.length === 0) return res.json({ ok: true, provider, results: [] });
      if (!provider) return res.json({ ok: false, reason: "no_api_key" });
      const text = await callAI(
        `你是「见微 Genway」的地区标注员。请判断以下每条新闻的“内容主要涉事地区”（最多 3 个，置信度 0-1 之和可>1），仅输出 JSON：
{"results":[{"index":0,"regions":[{"region":"中国大陆|美国|欧洲|日韩|东南亚|中东|拉美|其他","scope":"mentioned|event|affected","confidence":0.0}]}]}
规则：分别识别报道提及地区、事件发生地区和实际受影响地区；无法从输入判断的范围不要臆测。
条目列表：
${items.map((it, idx) => `${idx}. ${it.title}。${it.summary || ""}`).join("\n")}`,
        { json: true, temperature: 0.1 }
      );
      const parsed = parseJsonSafely(text);
      const list = Array.isArray(parsed?.results) ? parsed.results : [];
      const results = items
        .map((it, idx) => {
          const found = list.find((r: any) => Number(r?.index) === idx);
          if (found && Array.isArray(found.regions)) {
            return {
              id: it.id,
              title: it.title,
              source: "ai" as const,
              regions: found.regions
                .map((r: any) => ({
                  region: normalizeRegion(r?.region),
                  scope: r?.scope,
                  confidence: Math.max(0, Math.min(1, Number(r?.confidence) || 0)),
                }))
                .filter((r: any) => r.region)
                .slice(0, 6),
            };
          }
          return null;
        })
        .filter(Boolean);
      res.json({ ok: true, provider, results });
    } catch (e: any) {
      console.error("Regions error:", e);
      res.json({ ok: false, reason: "error" });
    }
  });

  app.post("/api/entities", limit, async (req, res) => {
    try {
      const items: Array<{ id: string; title: string; summary?: string }> = Array.isArray(req.body?.items)
        ? req.body.items.slice(0, 24).map((i: any) => ({
            id: String(i?.id || ""),
            title: String(i?.title || "").slice(0, 160),
            summary: String(i?.summary || "").slice(0, 300),
          })).filter((i: any) => i.id && i.title)
        : [];
      const provider = activeProvider();
      if (items.length === 0) return res.json({ ok: true, provider, results: [] });
      if (!provider) return res.json({ ok: false, reason: "no_api_key" });
      const text = await callAI(
        `你是「见微 Genway」的主体抽取员。对以下每条新闻抽取“主要涉事主体”（公司/机构/人物，≤3 个，带类型与置信度 0-1），仅输出 JSON：
{"results":[{"index":0,"entities":[{"name":"","type":"公司|机构|人物|其他","confidence":0.0}]}]}
条目列表：
${items.map((it, idx) => `${idx}. ${it.title}。${it.summary || ""}`).join("\n")}`,
        { json: true, temperature: 0.1 }
      );
      const parsed = parseJsonSafely(text);
      const list = Array.isArray(parsed?.results) ? parsed.results : [];
      const results = items
        .map((it, idx) => {
          const found = list.find((r: any) => Number(r?.index) === idx);
          if (!found || !Array.isArray(found.entities)) return null;
          return {
            id: it.id,
            title: it.title,
            source: "ai" as const,
            entities: normalizeEntityMentions(
              found.entities.map((e: any) => ({
                name: e?.name,
                type: normalizeEntityType(e?.type),
                confidence: Math.max(0, Math.min(1, Number(e?.confidence) || 0)),
              })),
              { title: it.title, summary: it.summary }
            ),
          };
        })
        .filter(Boolean);
      res.json({ ok: true, provider, results });
    } catch (e: any) {
      console.error("Entities error:", e);
      res.json({ ok: false, reason: "error" });
    }
  });
}
