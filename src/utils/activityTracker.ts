/**
 * 见微 Genway · 用户使用与登录行为打点工具
 */

export interface TrackActivityParams {
  action: string;
  actor?: string;
  entityType?: 'article' | 'topic' | 'prediction' | 'knowledge' | 'radar' | 'auth';
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function logUserActivity(params: TrackActivityParams): Promise<void> {
  try {
    const actor = params.actor || localStorage.getItem('jianwei-user-name') || 'analyst_guest';
    const payload = {
      actor,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: {
        ...params.metadata,
        clientTimestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '',
      },
    };

    // Fire and forget, non-blocking
    fetch('/api/activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // ignore transient network errors
    });
  } catch {
    // ignore
  }
}
