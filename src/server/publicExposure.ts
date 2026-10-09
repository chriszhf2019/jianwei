export type TlsMode = 'node' | 'upstream' | 'none';

export interface PublicExposureInput {
  bindHost: string;
  authToken?: string;
  encryptionSecret?: string;
  adminUser?: string;
  adminPassword?: string;
  persistDisabled?: boolean;
  tlsCertPath?: string;
  tlsKeyPath?: string;
  tlsMaterialReadable?: boolean;
  behindTls?: string;
}

export interface PublicExposureDecision {
  bindHost: string;
  exposed: boolean;
  ok: boolean;
  tls: TlsMode;
  missing: string[];
  note: string;
}

export function resolveBindHost(explicit?: string): string {
  const host = String(explicit || '').trim();
  return host || '127.0.0.1';
}

export function isLoopbackHost(host: string): boolean {
  const value = host.trim().toLowerCase();
  if (value === 'localhost' || value === '::1' || value === '[::1]') return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value);
}

export function assessPublicExposure(input: PublicExposureInput): PublicExposureDecision {
  const bindHost = resolveBindHost(input.bindHost);
  const exposed = !isLoopbackHost(bindHost);
  const certPath = String(input.tlsCertPath || '').trim();
  const keyPath = String(input.tlsKeyPath || '').trim();
  const tlsRequested = Boolean(certPath || keyPath);
  const tlsReady = Boolean(certPath && keyPath && input.tlsMaterialReadable);
  const behindTls = input.behindTls === '1';
  const missing: string[] = [];

  if (tlsRequested && !tlsReady) {
    missing.push('JIANWEI_TLS_CERT 或 JIANWEI_TLS_KEY 读不到。');
  }

  if (exposed) {
    if (!String(input.authToken || '').trim()) {
      missing.push('未设置 JIANWEI_AUTH_TOKEN。对外监听时，未登录请求不能再当成管理员。');
    }
    if (!String(input.encryptionSecret || '').trim()) {
      missing.push('未设置 JIANWEI_SECRET。设置文件里的模型密钥不会加密。');
    }
    if (!String(input.adminUser || '').trim() || !String(input.adminPassword || '').trim()) {
      missing.push('未同时设置 JIANWEI_ADMIN_USER 和 JIANWEI_ADMIN_PASSWORD。对外需要一个引导管理员账号，不能只靠共享令牌。');
    }
    if (input.persistDisabled) {
      missing.push('设置了 JIANWEI_NO_SETTINGS=1。对外监听需要留下审计和账号。');
    }
    if (!tlsReady && !behindTls) {
      missing.push('未配置进程 TLS 证书，也没有把 JIANWEI_BEHIND_TLS 设为 1。进程不会假装自己在使用 HTTPS。');
    }
  }

  const tls: TlsMode = tlsReady ? 'node' : exposed && behindTls ? 'upstream' : 'none';
  const ok = missing.length === 0;
  const note = !ok
    ? `拒绝对外监听 ${bindHost}。`
    : exposed && tls === 'node'
      ? `对外监听 ${bindHost}。进程已加载 TLS 证书并以 HTTPS 启动。访问令牌、密钥加密和管理员账号已就绪。`
      : exposed && tls === 'upstream'
        ? `对外监听 ${bindHost}。进程本身仍是 HTTP，TLS 由前置反向代理终止。访问令牌、密钥加密和管理员账号已就绪。`
        : `环境监听 ${bindHost} (HTTP)。未配置进程 TLS 证书，传输层保持明文 HTTP。`;

  return { bindHost, exposed, ok, tls, missing, note };
}
