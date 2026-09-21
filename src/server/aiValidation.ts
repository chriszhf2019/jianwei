import type { AiFieldMeta, EvidenceItem, GrayscaleAssessment, NewsArticle } from "../types";
import type { AIProvider } from "./ai";

export const PROMPT_VERSIONS = {
  analyze: "analyze-2026-09-12-v2",
  enrich: "enrich-2026-09-12-v2",
  skill: "skill-2026-09-13-v5",
  region_interpret: "region-interpret-2026-09-13-v1",
  frequency_analysis: "frequency-analysis-2026-09-13-v1",
  annotations: "annotations-2026-09-12-v3",
  evidence_reextract: "evidence-reextract-2026-09-12-v1",
} as const;

function asText(value: unknown, max = 500): string {
  return String(value || "").trim().slice(0, max);
}

function safeHttpUrl(value: unknown): string | null {
  const raw = asText(value, 2000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(100, n)));
}

/** 把模型证据链限定为可展示、可审计的结构；链接存在也不代表已核验。 */
export function sanitizeEvidenceChain(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((raw: any, index) => {
    const claim = asText(raw?.claim, 300);
    const sourceFact = asText(raw?.sourceFact, 800);
    if (!claim || !sourceFact) return [];
    const sourceUrl = safeHttpUrl(raw?.sourceUrl);
    const relation: EvidenceItem['relation'] = ["supports", "contradicts", "context"].includes(String(raw?.relation))
      ? String(raw.relation) as EvidenceItem['relation']
      : "supports";
    return [{
      id: asText(raw?.id, 80) || `ev-${index + 1}`,
      claim,
      sourceFact,
      reliability: asText(raw?.reliability, 160) || "模型未说明可靠性依据",
      confidenceScore: clampScore(raw?.confidenceScore),
      sourceUrl,
      quote: asText(raw?.quote, 500),
      sourceName: asText(raw?.sourceName, 160),
      publishedAt: asText(raw?.publishedAt, 80) || null,
      sourceType: ["primary_document", "official_statement", "reported_media", "unknown"].includes(String(raw?.sourceType))
        ? String(raw.sourceType)
        : "unknown",
      relation,
      verificationStatus: sourceUrl ? "linked" : "unlinked",
    }];
  });
}

/**
 * 灰度认知：把极端定性改为 0-100 的模型隶属度，并执行黑/白决策阈值。
 * 阈值：顶级隶属度 >= 70、至少 2 条支持证据、证据强度中/高、支持证据不少于反对证据。
 */
export function sanitizeGrayscaleAssessment(input: any): GrayscaleAssessment | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const memberships: Array<{ hypothesis: string; score: number }> = Array.isArray(input.memberships)
    ? input.memberships.slice(0, 6).flatMap((raw: any) => {
        const hypothesis = asText(raw?.hypothesis, 120);
        if (!hypothesis) return [];
        return [{ hypothesis, score: clampScore(raw?.score) }];
      })
    : [];
  const support = Array.isArray(input.support)
    ? input.support.map((item: any) => asText(item, 320)).filter(Boolean).slice(0, 8)
    : [];
  const oppose = Array.isArray(input.oppose)
    ? input.oppose.map((item: any) => asText(item, 320)).filter(Boolean).slice(0, 8)
    : [];
  const uncertain = Array.isArray(input.uncertain)
    ? input.uncertain.map((item: any) => asText(item, 320)).filter(Boolean).slice(0, 8)
    : [];
  const reverseRisks = Array.isArray(input.reverseRisks)
    ? input.reverseRisks.map((item: any) => asText(item, 320)).filter(Boolean).slice(0, 8)
    : [];
  const evidenceStrength: GrayscaleAssessment["evidenceStrength"] =
    ["高", "中", "低"].includes(String(input.evidenceStrength))
      ? String(input.evidenceStrength) as GrayscaleAssessment["evidenceStrength"]
      : "低";
  const topScore = memberships.reduce((max, item) => Math.max(max, item.score), 0);
  const passesThreshold =
    topScore >= 70 &&
    support.length >= 2 &&
    evidenceStrength !== "低" &&
    support.length >= oppose.length;
  const decision: GrayscaleAssessment["decision"] = passesThreshold ? "行动" : "持续观察";
  const decisionReason = passesThreshold
    ? asText(input.decisionReason, 500) || "顶级隶属度、支持证据数量与证据强度达到行动评估阈值。"
    : [
        topScore < 70 ? `顶级隶属度仅 ${topScore}%，未达到 70% 阈值` : "",
        support.length < 2 ? `支持证据只有 ${support.length} 条，少于 2 条` : "",
        evidenceStrength === "低" ? "证据强度为低" : "",
        support.length < oppose.length ? "反对证据多于支持证据" : "",
      ].filter(Boolean).join("；") || "未达到行动阈值。";
  return {
    memberships,
    evidenceStrength,
    support,
    oppose,
    uncertain,
    reverseRisks,
    decision,
    decisionReason,
  };
}

/**
 * 清洗模型返回的深层字段。
 * 当前只做结构与范围校验；语义真实性仍由逐条核验流程负责。
 */
export function sanitizeEnrichPayload(input: any): any {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const cleaned = { ...input };

  if (input.aiInterpretation && typeof input.aiInterpretation === "object") {
    const { grayscale: _rawGrayscale, ...interpretation } = input.aiInterpretation;
    const grayscale = sanitizeGrayscaleAssessment(input.aiInterpretation.grayscale);
    cleaned.aiInterpretation = grayscale
      ? { ...interpretation, grayscale }
      : interpretation;
  }

  if (Array.isArray(input.evidenceChain)) {
    cleaned.evidenceChain = sanitizeEvidenceChain(input.evidenceChain);
  }

  if (input.sevenElements && typeof input.sevenElements === "object") {
    const aiVerdict = input.sevenElements.aiVerdict;
    if (aiVerdict && typeof aiVerdict === "object") {
      cleaned.sevenElements = {
        ...input.sevenElements,
        aiVerdict: {
          ...aiVerdict,
          confidenceScore: clampScore(aiVerdict.confidenceScore),
          volatility: ["高", "中", "低"].includes(String(aiVerdict.volatility)) ? aiVerdict.volatility : "中",
          actionLevel: ["行动", "关注", "观望"].includes(String(aiVerdict.actionLevel)) ? aiVerdict.actionLevel : "观望",
        },
      };
    }
  }

  if (input.rippleEffect && typeof input.rippleEffect === "object" && Array.isArray(input.rippleEffect.multiSources)) {
    cleaned.rippleEffect = {
      ...input.rippleEffect,
      multiSources: input.rippleEffect.multiSources.slice(0, 8).flatMap((raw: any) => {
        const sourceName = asText(raw?.sourceName, 160);
        const excerpt = asText(raw?.excerpt, 500);
        if (!sourceName) return [];
        return [{
          sourceName,
          tier: asText(raw?.tier, 80) || "未标注",
          stance: asText(raw?.stance, 40) || "中性",
          verified: false,
          excerpt,
        }];
      }),
    };
  }

  return cleaned;
}

export interface RegionImpactInterpretation {
  whyHere: string;
  drivers: string[];
  crossRegion: Array<{
    target: string;
    direction: "benefit" | "pressure" | "mixed";
    mechanism: string;
    confidence: "高" | "中" | "低";
  }>;
  watch: string[];
  guidance: string;
  limits: string;
}

export function sanitizeRegionImpact(input: any): RegionImpactInterpretation {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const crossRegion = Array.isArray(source.crossRegion)
    ? source.crossRegion.slice(0, 8).flatMap((raw: any) => {
        const target = asText(raw?.target, 120);
        const mechanism = asText(raw?.mechanism, 360);
        if (!target || !mechanism) return [];
        return [{
          target,
          direction: ["benefit", "pressure", "mixed"].includes(String(raw?.direction))
            ? String(raw.direction) as "benefit" | "pressure" | "mixed"
            : "mixed",
          mechanism,
          confidence: ["高", "中", "低"].includes(String(raw?.confidence))
            ? String(raw.confidence) as "高" | "中" | "低"
            : "低",
        }];
      })
    : [];
  return {
    whyHere: asText(source.whyHere, 700),
    drivers: Array.isArray(source.drivers)
      ? source.drivers.map((item: any) => asText(item, 240)).filter(Boolean).slice(0, 6)
      : [],
    crossRegion,
    watch: Array.isArray(source.watch)
      ? source.watch.map((item: any) => asText(item, 240)).filter(Boolean).slice(0, 8)
      : [],
    guidance: asText(source.guidance, 700),
    limits: asText(source.limits, 700),
  };
}

export interface FrequencyAnalysisResult {
  observedPattern: string;
  possibleDrivers: Array<{
    driver: string;
    evidence: string;
    mechanism: string;
    confidence: "高" | "中" | "低";
  }>;
  alternativeExplanation: string;
  watch: string[];
  limits: string;
}

export function sanitizeFrequencyAnalysis(input: any): FrequencyAnalysisResult {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    observedPattern: asText(source.observedPattern, 800),
    possibleDrivers: Array.isArray(source.possibleDrivers)
      ? source.possibleDrivers.slice(0, 6).flatMap((raw: any) => {
          const driver = asText(raw?.driver, 180);
          const evidence = asText(raw?.evidence, 500);
          const mechanism = asText(raw?.mechanism, 500);
          if (!driver || (!evidence && !mechanism)) return [];
          return [{
            driver,
            evidence,
            mechanism,
            confidence: ["高", "中", "低"].includes(String(raw?.confidence))
              ? String(raw.confidence) as "高" | "中" | "低"
              : "低",
          }];
        })
      : [],
    alternativeExplanation: asText(source.alternativeExplanation, 800),
    watch: Array.isArray(source.watch)
      ? source.watch.map((item: any) => asText(item, 240)).filter(Boolean).slice(0, 8)
      : [],
    limits: asText(source.limits, 800),
  };
}

export function createFieldMeta(
  provider: AIProvider,
  model: string,
  promptVersion: string,
  certificationStandard: AiFieldMeta["certificationStandard"] = "ai_single"
): AiFieldMeta {
  return {
    generatedAt: new Date().toISOString(),
    provider,
    model,
    promptVersion,
    method: "ai_generation",
    certificationStandard,
    calibrationStatus: "uncalibrated",
  };
}

export function attachFieldMeta(
  target: NewsArticle | Record<string, any>,
  fields: string[],
  meta: AiFieldMeta
): void {
  const current = (target as any).aiFieldMeta && typeof (target as any).aiFieldMeta === "object"
    ? (target as any).aiFieldMeta
    : {};
  for (const field of fields) current[field] = meta;
  (target as any).aiFieldMeta = current;
}
