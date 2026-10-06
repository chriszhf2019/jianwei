import { useState } from 'react';
import type { ServerSettings } from '../adminTypes';

export type ShowToast = (type: 'success' | 'error', text: string) => void;

/** 全局 AI 密钥与模型表单。 */
export function useAdminKeys() {
  const [aiChoice, setAiChoice] = useState<'auto' | 'gemini' | 'deepseek'>('auto');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [deepseekKeyInput, setDeepseekKeyInput] = useState('');
  const [deepseekBaseUrlInput, setDeepseekBaseUrlInput] = useState('https://api.deepseek.com');
  const [geminiModelInput, setGeminiModelInput] = useState('gemini-2.5-flash');
  const [deepseekModelInput, setDeepseekModelInput] = useState('deepseek-chat');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const hydrateFromSettings = (setts: ServerSettings) => {
    setAiChoice(setts.ai?.choice || 'auto');
    setDeepseekBaseUrlInput(setts.ai?.deepseekBaseUrl || 'https://api.deepseek.com');
    setGeminiModelInput(setts.ai?.geminiModel || 'gemini-2.5-flash');
    setDeepseekModelInput(setts.ai?.deepseekModel || 'deepseek-chat');
  };

  const buildSavePayload = () => {
    const payload: Record<string, unknown> = {
      aiChoice,
      geminiModel: geminiModelInput,
      deepseekModel: deepseekModelInput,
      deepseekBaseUrl: deepseekBaseUrlInput,
    };
    if (geminiKeyInput.trim()) payload.geminiApiKey = geminiKeyInput.trim();
    if (deepseekKeyInput.trim()) payload.deepseekApiKey = deepseekKeyInput.trim();
    return payload;
  };

  const clearKeyInputs = () => {
    setGeminiKeyInput('');
    setDeepseekKeyInput('');
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.hasApiKey) {
        setTestResult({
          ok: true,
          message: `连通性正常！当前活跃引擎: ${data.ai?.provider || 'Gemini'} · 模型就绪`,
        });
      } else {
        setTestResult({
          ok: false,
          message: '未检测到可用 API 密钥，请在下方配置 Gemini 或 DeepSeek 密钥',
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: `诊断测试异常: ${e.message}` });
    } finally {
      setTestingAi(false);
    }
  };

  return {
    aiChoice,
    setAiChoice,
    geminiKeyInput,
    setGeminiKeyInput,
    deepseekKeyInput,
    setDeepseekKeyInput,
    deepseekBaseUrlInput,
    setDeepseekBaseUrlInput,
    geminiModelInput,
    setGeminiModelInput,
    deepseekModelInput,
    setDeepseekModelInput,
    showGeminiKey,
    setShowGeminiKey,
    showDeepseekKey,
    setShowDeepseekKey,
    testingAi,
    testResult,
    hydrateFromSettings,
    buildSavePayload,
    clearKeyInputs,
    handleTestAi,
  };
}
