import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const AUTH_TOKEN_KEY = 'jianwei:auth-token';
const originalFetch = window.fetch ? window.fetch.bind(window) : fetch.bind(globalThis);

const customFetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let token: string | null = null;
  try {
    token = localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
  const headers = new Headers(init?.headers);
  if (token && url.startsWith('/api/')) {
    headers.set('x-jianwei-token', token);
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await originalFetch(input, { ...init, headers });
  if (response.status === 401 || response.status === 403) {
    response.clone().json()
      .then((payload) => {
        if (
          payload?.error === 'registration_required' ||
          payload?.error === 'guest_deep_read_limit' ||
          payload?.error === 'password_change_required'
        ) {
          window.dispatchEvent(new CustomEvent('jianwei:auth-required', {
            detail: { error: payload.error, message: payload.message || '' },
          }));
        }
      })
      .catch(() => undefined);
  }
  return response;
}) as typeof fetch;

try {
  window.fetch = customFetch;
} catch {
  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      Object.defineProperty(Object.getPrototypeOf(window), 'fetch', {
        value: customFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      // If the environment prevents modifying window.fetch altogether, continue without breaking the app
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
