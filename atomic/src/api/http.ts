/**
 * 统一 HTTP 客户端
 * 与后端约定的响应信封：{ code, message, data, trace_id }
 */

import { lsGet, lsSet } from '../composables/utils';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const TOKEN_KEY = 'atomic-auth-tokens-v1';

interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_at: number; // 毫秒时间戳
}

interface Envelope<T> {
  code?: number;
  success?: boolean;
  message?: string;
  data?: T;
  trace_id?: string;
}

export class ApiError extends Error {
  code: number;
  data?: unknown;
  traceId?: string;
  status: number;

  constructor(opts: { code: number; message: string; status: number; data?: unknown; traceId?: string }) {
    super(opts.message);
    this.name = 'ApiError';
    this.code = opts.code;
    this.data = opts.data;
    this.traceId = opts.traceId;
    this.status = opts.status;
  }
}

/* ==================== Token 管理 ==================== */

export function getTokens(): TokenPair | null {
  return lsGet<TokenPair | null>(TOKEN_KEY, null);
}

export function setTokens(t: TokenPair | null) {
  if (t) lsSet(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Client-Version', '1.0.0');

  // 时区
  try {
    headers.set('X-Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch { /* ignore */ }

  // Token
  const tokens = getTokens();
  if (tokens?.access_token) {
    headers.set('Authorization', `Bearer ${tokens.access_token}`);
  }
  return headers;
}

/* ==================== 请求方法 ==================== */

interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : '/' + path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) throw new ApiError({ code: 1002, message: '需要重新登录', status: 401 });
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });
  if (!res.ok) {
    setTokens(null);
    throw new ApiError({ code: 1002, message: '会话已过期，请重新登录', status: 401 });
  }
  const text = await res.text();
  const env = (text ? JSON.parse(text) : {}) as Envelope<{ access_token: string; refresh_token: string; expires_in: number }>;
  const data = extractData(env) as { access_token: string; refresh_token: string; expires_in: number } | null;
  if (!data) {
    setTokens(null);
    throw new ApiError({ code: 1002, message: (env as { message?: string }).message ?? '刷新失败', status: 401 });
  }
  setTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
}

/** 统一解析 Spring / 自定义 信封与裸 JSON */
function extractData<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw) || (typeof raw !== 'object')) return raw as T;
  const o = raw as Envelope<unknown> & { result?: T };
  if (o.success === false) {
    const code = Number(o.code ?? 400);
    throw new ApiError({ code, message: o.message || '业务失败', status: 200, traceId: o.trace_id });
  }
  const c = o.code;
  if (typeof c === 'number' && c !== 0 && c !== 200) {
    throw new ApiError({
      code: c,
      message: o.message || '业务失败',
      status: 200,
      data: o.data,
      traceId: o.trace_id,
    });
  }
  if (o.data !== undefined) return o.data as T;
  if (o.result !== undefined) return o.result as T;
  return o as T;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { query, body, headers: extraHeaders, ...rest } = opts;
  const url = buildUrl(path, query);

  const exec = async (): Promise<Response> => fetch(url, {
    method,
    headers: buildHeaders(extraHeaders),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  let res = await exec();

  // 401 → 尝试刷新一次
  if (res.status === 401) {
    if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
    try {
      await refreshPromise;
      res = await exec();
    } catch (e) {
      throw e instanceof ApiError ? e : new ApiError({ code: 1002, message: '登录失效', status: 401 });
    }
  }

  // 网络层错误
  if (!res.ok && res.status !== 200) {
    let payload: Partial<Envelope<unknown>> = {};
    try { payload = await res.json(); } catch { /* ignore */ }
    throw new ApiError({
      code: payload.code ?? res.status,
      message: payload.message ?? res.statusText,
      status: res.status,
      data: payload.data,
      traceId: payload.trace_id,
    });
  }

  const text = await res.text();
  if (!text || !text.trim()) {
    if (res.status === 204 || method === 'DELETE' || method === 'POST') {
      return undefined as T;
    }
    return undefined as T;
  }
  const raw = JSON.parse(text) as unknown;
  return extractData<T>(raw) as T;
}

/* ==================== 公开 API ==================== */

export const http = {
  get:    <T>(path: string, query?: RequestOptions['query'])              => request<T>('GET',    path, { query }),
  post:   <T>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>('POST',   path, { body, query }),
  put:    <T>(path: string, body?: unknown)                                => request<T>('PUT',    path, { body }),
  patch:  <T>(path: string, body?: unknown)                                => request<T>('PATCH',  path, { body }),
  delete: <T>(path: string, query?: RequestOptions['query'])              => request<T>('DELETE', path, { query }),
};

/** 数据源开关：mock 走本地 seed，remote 走 http */
export const isRemote = import.meta.env.VITE_DATA_SOURCE === 'remote';
