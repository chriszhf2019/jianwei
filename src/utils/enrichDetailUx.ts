/**
 * 详情页浅层→深度（/api/enrich）UX 纯函数：进度文案、占位 note、成功落地。
 * 与 NewsDetailView 解耦，便于 unit.test 直接断言。
 */

export type EnrichPhase = 'idle' | 'loading' | 'done' | 'unavailable' | 'error';

/** 深度分析约 45s；按阶段给诚实进度，避免只有秒数无语义。 */
export const ENRICH_ETA_SECONDS = 45;

export function enrichProgressLabel(elapsedSec: number): string {
  const s = Math.max(0, Math.floor(elapsedSec));
  if (s < 8) return '正在获取原文…';
  if (s < 20) return '正在调用模型研判…';
  if (s < 40) return '正在结构化七要素与光谱…';
  return '仍在生成，请稍候（高峰期可能更久）…';
}

/** 加载条进度 0–100（软上限，超时后停在 95，避免假「完成」）。 */
export function enrichProgressPercent(elapsedSec: number, etaSec = ENRICH_ETA_SECONDS): number {
  const s = Math.max(0, elapsedSec);
  if (s <= 0) return 4;
  const raw = Math.round((s / Math.max(1, etaSec)) * 100);
  return Math.min(95, Math.max(4, raw));
}

export function enrichDeepNote(input: {
  phase: EnrichPhase;
  error?: string | null;
  elapsedSec?: number;
}): string {
  const { phase, error, elapsedSec = 0 } = input;
  if (phase === 'loading') {
    return `${enrichProgressLabel(elapsedSec)} 已等待 ${elapsedSec}s / 约 ${ENRICH_ETA_SECONDS}s`;
  }
  if (phase === 'unavailable') {
    return (
      error ||
      'AI 懒加载补全暂不可用：服务端未配置 Gemini 或 DeepSeek Key；配置后重新打开本页即可。'
    );
  }
  if (phase === 'error') {
    return error || '深度分析生成失败，请稍后重试。';
  }
  if (phase === 'done') {
    return '深度分析已生成。若本模块仍为空，可能是本次未返回该字段——请先查看「事实全貌与溯源」。';
  }
  // idle
  return (
    error ||
    '深度分析尚未生成。只有点击“生成深度分析”后才会调用模型。'
  );
}

/** 成功后默认落到第一篇（七要素），避免停在空的深 Tab / MissingDeep。 */
export const POST_ENRICH_LANDING_TAB = 'seven_elements' as const;

export function shouldShowShallowEnrichCta(isShallow: boolean, phase: EnrichPhase): boolean {
  return isShallow && phase !== 'done';
}

export function formatGuestQuotaHint(quota?: {
  remaining?: number;
  limit?: number;
} | null): string | null {
  if (!quota || typeof quota.remaining !== 'number') return null;
  const rem = Math.max(0, quota.remaining);
  if (typeof quota.limit === 'number') {
    return `游客深度额度剩余 ${rem}/${quota.limit}（成功才扣次）`;
  }
  return `游客深度额度剩余 ${rem} 次（成功才扣次）`;
}

export function formatPostEnrichQuotaNote(guestQuota?: {
  remaining?: number;
  charged?: boolean;
} | null): string | null {
  if (!guestQuota || typeof guestQuota.remaining !== 'number') return null;
  const rem = Math.max(0, guestQuota.remaining);
  if (guestQuota.charged === false) {
    return `本篇未额外扣次；游客额度仍剩余 ${rem} 次`;
  }
  return `游客额度剩余 ${rem} 次`;
}
