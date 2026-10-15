import { useState } from 'react';
import type { ServerSettings } from '../adminTypes';

export type ShowToast = (type: 'success' | 'error' | 'info', text: string) => void;

/** 检测字符串是否含非 ASCII 字符（code point > 127）。空串返回 false。 */
export function hasNonAsciiChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 127) return true;
  }
  return false;
}

const GEMINI_KEY_ASCII_ERROR =
  'Gemini Key 含非 ASCII 字符（如全角括号/空格），请粘贴纯 ASCII 密钥。';
const DEEPSEEK_KEY_ASCII_ERROR =
  'DeepSeek Key 含非 ASCII 字符（如全角括号/空格），请粘贴纯 ASCII 密钥。';

/** 非空且含非 ASCII 时返回与后端一致的行内错误文案；空字段不算错误。 */
export function apiKeyAsciiError(value: string, label: 'Gemini' | 'DeepSeek'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!hasNonAsciiChars(trimmed)) return null;
  return label === 'Gemini' ? GEMINI_KEY_ASCII_ERROR : DEEPSEEK_KEY_ASCII_ERROR;
}

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

  const geminiKeyAsciiError = apiKeyAsciiError(geminiKeyInput, 'Gemini');
  const deepseekKeyAsciiError = apiKeyAsciiError(deepseekKeyInput, 'DeepSeek');
  const hasInvalidKeyAscii = Boolean(geminiKeyAsciiError || deepseekKeyAsciiError);

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
    geminiKeyAsciiError,
    deepseekKeyAsciiError,
    hasInvalidKeyAscii,
    hydrateFromSettings,
    buildSavePayload,
    clearKeyInputs,
    handleTestAi,
  };
}
