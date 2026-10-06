import type { Express } from "express";
import { activeProvider, callAI } from "../ai";
import { serverCorpus } from "../corpus";
import { serverDetectSectors, serverSectorList } from "../sectors";

export type RateLimiter = (req: import("express").Request, res: import("express").Response, next: () => void) => void;

/** 多源立场冲突仲裁 */
export function registerConflictsRoutes(app: import("express").Express, applyRateLimit: RateLimiter): void {
  // —— 多源立场冲突仲裁（真实同话题分组 + 在线模型立场判定；无 Key/失败时如实返回） ——
  app.post("/api/conflicts", applyRateLimit, async (_req, res) => {
    try {
      const ext: any[] = serverCorpus.filter(
        (a: any) => a.isExternal === true && ((a.title || "") + (a.summary || "")).trim().length > 2
      );
      if (ext.length < 2) {
        return res.json({ ok: true, candidates: [], note: "语料中外部条目不足 2 篇，无法进行跨源比对。" });
      }

      // 1) 按赛道分组（关键词词典，见 src/utils/sectorTaxonomy.ts）
      const groups = new Map<string, any[]>();
      for (const a of ext) {
        for (const id of serverDetectSectors(a)) {
          const arr = groups.get(id) || [];
          arr.push(a);
          groups.set(id, arr);
        }
      }

      const candidates: Array<{ sectorId: string; sectorName: string; items: any[] }> = [];
      for (const sector of serverSectorList()) {
        const items = groups.get(sector.id) || [];
        const sources = new Set(items.map((i) => i.sourceName));
        if (sources.size >= 2 && items.length >= 2) {
          candidates.push({ sectorId: sector.id, sectorName: sector.name, items });
        }
      }
      candidates.sort((a, b) => new Set(b.items.map((i) => i.sourceName)).size - new Set(a.items.map((i) => i.sourceName)).size);
      const top = candidates.slice(0, 3);

      const provider = activeProvider();
      if (!provider) {
        return res.json({ ok: false, reason: "no_api_key", candidateSectors: top.map((c) => c.sectorName) });
      }

      const results = [];
      for (const cand of top) {
        // 每个候选取两个不同来源的“最新”条目
        const picked: any[] = [];
        const usedSrc = new Set<string>();
        for (let i = cand.items.length - 1; i >= 0 && picked.length < 2; i -= 1) {
          const it = cand.items[i];
          if (usedSrc.has(it.sourceName)) continue;
          usedSrc.add(it.sourceName);
          picked.push(it);
        }
        if (picked.length < 2) continue;

        const A = picked[0];
        const B = picked[1];
        const prompt = `你是「见微 Genway」的多源立场仲裁员。请对同一话题（${cand.sectorName}）来自两家不同来源的报道做立场判定，仅输出 JSON：
  {"sources":[{"source":"来源A名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"},{"source":"来源B名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"}],"divergence":"一致|分歧|部分分歧","summary":"≤120字的克制仲裁小结"}
  来源A（${A.sourceName}）：${String(A.title)}。${String(A.summary || "")}
  来源B（${B.sourceName}）：${String(B.title)}。${String(B.summary || "")}`;
        const text = await callAI(prompt, { json: true, temperature: 0.2 });
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        }
        if (parsed && Array.isArray(parsed.sources)) {
          results.push({
            topic: cand.sectorName,
            sources: parsed.sources.map((s: any) => ({
              source: String(s?.source || "").slice(0, 80),
              stance: s?.stance === "正面" ? "正面" : s?.stance === "负面" ? "负面" : "中性",
              quote: String(s?.quote || "").slice(0, 120),
            })),
            divergence: String(parsed.divergence || "未知").slice(0, 20),
            summary: String(parsed.summary || "").slice(0, 300),
          });
        }
      }

      res.json({ ok: true, provider, candidates: results, candidateSectors: top.map((c) => c.sectorName) });
    } catch (e: any) {
      console.error("Conflicts error:", e);
      res.json({ ok: false, reason: "error" });
    }
  });


}
