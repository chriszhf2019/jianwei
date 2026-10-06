/** 把 AI / 网络失败映射成可行动的中文说明，避免一律「失败」。 */

export function classifyAiClientError(input: {
  status?: number;
  payload?: any;
  error?: unknown;
  fallbackMs?: number;
}): string {
  const payload = input.payload || {};
  const errMsg = input.error instanceof Error ? input.error.message : String(input.error || '');
  const note = String(payload.fallbackNote || payload.message || payload.note || payload.error || '');
  const reason = String(payload.fallbackReason || payload.reason || payload.error || '');

  if (reason === 'no_api_key' || payload.fallbackReason === 'no_api_key') {
    return '服务端未配置可用 AI Key。请在管理端或环境变量中配置 Gemini / DeepSeek 后再试。';
  }
  if (reason === 'guest_deep_read_limit' || payload.error === 'guest_deep_read_limit') {
    return '游客深度解读次数已用完。注册并等待管理员审批后可继续使用。';
  }
  if (reason === 'registration_required' || payload.error === 'registration_required') {
    return '该功能需要注册并完成审批。';
  }
  if (input.status === 429 || reason.includes('rate') || note.includes('频繁')) {
    return '请求过于频繁，请稍后再试。';
  }
  if (
    /timed?\s*out|aborted|AbortError|timeout/i.test(errMsg) ||
    /timed?\s*out|timeout/i.test(note) ||
    /timed?\s*out|timeout/i.test(reason)
  ) {
    const sec = Math.round((input.fallbackMs || 45_000) / 1000);
    return `请求超时（约 ${sec} 秒内未返回）。可取消后重试，或检查模型服务是否拥堵。`;
  }
  if (input.status === 401 || input.status === 403) {
    return note || '当前身份无权调用该接口，请登录或联系管理员。';
  }
  if (payload.fallback) {
    return note || '模型未生成有效分析（可能是额度、超时或上游异常）。输入内容已保留，请稍后重试。';
  }
  if (note) return note;
  if (input.status && input.status >= 500) {
    return '服务端异常，请稍后重试。';
  }
  return '网络或服务异常，请稍后重试。';
}
