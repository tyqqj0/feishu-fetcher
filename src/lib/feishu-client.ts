import { stderr } from 'node:process';

const BASE_URL = 'https://open.feishu.cn';
const MIN_INTERVAL_MS = 20;

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

async function request(
  path: string,
  options: { method?: string; token?: string; body?: unknown; params?: Record<string, string> }
): Promise<any> {
  await rateLimit();

  const url = new URL(path, BASE_URL);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions: RequestInit = { method: options.method || 'GET', headers };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), fetchOptions);

      if (res.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        stderr.write(`Rate limited, retrying in ${delay / 1000}s...\n`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const json = await res.json();

      if (json.code && json.code !== 0) {
        throw new Error(`Feishu API error [${json.code}]: ${json.msg || JSON.stringify(json)}`);
      }

      return json;
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes('Feishu API error')) throw e;
      const delay = Math.pow(2, attempt) * 1000;
      stderr.write(`Request failed (attempt ${attempt + 1}/3): ${e.message}. Retrying in ${delay / 1000}s...\n`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError || new Error('Request failed after 3 attempts');
}

export async function getTenantAccessToken(appId: string, appSecret: string): Promise<string> {
  const res = await request('/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    body: { app_id: appId, app_secret: appSecret },
  });
  if (!res.tenant_access_token) {
    throw new Error('Failed to get tenant access token. Check app_id and app_secret.');
  }
  return res.tenant_access_token;
}

export interface PageResult<T> {
  items: T[];
  hasMore: boolean;
  pageToken?: string;
}

export async function getAppName(token: string): Promise<string> {
  const res = await request('/open-apis/application/v6/applications/me', {
    token,
    params: { lang: 'zh_cn' },
  });
  return res.data?.app?.app_name || '';
}

export async function getChildDepartments(
  token: string,
  departmentId: string,
  pageToken?: string
): Promise<PageResult<{ department_id: string; name: string; open_department_id: string }>> {
  const params: Record<string, string> = {
    department_id_type: 'open_department_id',
    page_size: '50',
  };
  if (pageToken) params.page_token = pageToken;

  const res = await request(`/open-apis/contact/v3/departments/${departmentId}/children`, {
    token,
    params,
  });

  const data = res.data || {};
  return {
    items: data.items || [],
    hasMore: data.has_more || false,
    pageToken: data.page_token,
  };
}

export async function getUsersByDepartment(
  token: string,
  departmentId: string,
  pageToken?: string
): Promise<PageResult<{ open_id: string; user_id: string; union_id: string; name: string }>> {
  const params: Record<string, string> = {
    department_id: departmentId,
    department_id_type: 'open_department_id',
    user_id_type: 'open_id',
    page_size: '50',
  };
  if (pageToken) params.page_token = pageToken;

  const res = await request('/open-apis/contact/v3/users/find_by_department', {
    token,
    params,
  });

  const data = res.data || {};
  return {
    items: data.items || [],
    hasMore: data.has_more || false,
    pageToken: data.page_token,
  };
}
