import { useCallback, useEffect, useRef, useState } from 'react';
import type { SnapshotResponse } from '../types';

export type SnapshotStatus = 'loading' | 'ok' | 'error';

/**
 * 情报数据层：拉取服务端 /api/snapshot 派生快照。
 * - ok：服务端返回派生数据（demo 与否看 meta.demo）；
 * - error：接口不可达（离线），调用方显示空态并提示，不使用示例数据。
 */
export function useSnapshot() {
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [status, setStatus] = useState<SnapshotStatus>('loading');
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);

    setStatus('loading');
    try {
      const res = await fetch('/api/snapshot', { signal: controller.signal });
      if (!res.ok) throw new Error(`snapshot ${res.status}`);
      const data = (await res.json()) as SnapshotResponse;
      if (controller.signal.aborted) return;
      setSnapshot(data);
      setStatus('ok');
    } catch {
      if (!controller.signal.aborted) {
        setStatus('error');
      }
    } finally {
      clearTimeout(timer);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, status, refresh };
}
