import { useEffect, useState } from 'react';

export type AIProviderState = 'gemini' | 'deepseek' | 'none';

/**
 * 读取服务端 /api/health.ai 的当前 AI 通道（gemini | deepseek | none）。
 * 用于引擎标签、数据口径面板等展示；接口不可达视为 none。
 */
export function useAIProvider(): { provider: AIProviderState; loading: boolean } {
  const [provider, setProvider] = useState<AIProviderState>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`health ${res.status}`))))
      .then((json) => {
        const p = json?.ai?.provider;
        setProvider(p === 'deepseek' ? 'deepseek' : p === 'gemini' ? 'gemini' : 'none');
      })
      .catch(() => setProvider('none'))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { provider, loading };
}
