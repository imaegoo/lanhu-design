import { LanhuError } from "../errors/lanhu-error.js";

export interface PasswordLoginResult {
  host: string;
  cookie: string;
  user: { id?: string; name?: string; email?: string };
  teamCount: number;
}

interface LoginResponse {
  id?: string;
  name?: string;
  nickname?: string;
  email?: string;
  token?: string;
  teams?: unknown[];
  code?: string;
  msg?: string;
  message?: string;
}

/**
 * 私有部署的账号密码登录：POST /api/account/login（form-urlencoded）。
 * 成功时服务端通过 Set-Cookie 下发 session，后续业务请求复用该 Cookie。
 */
export async function loginWithPassword(options: {
  host: string;
  username: string;
  password: string;
  timeoutMs: number;
}): Promise<PasswordLoginResult> {
  const host = options.host;
  if (!options.username.trim()) throw new LanhuError("LANHU_INVALID_ARGUMENT", "用户名不能为空。");
  if (!options.password) throw new LanhuError("LANHU_INVALID_ARGUMENT", "密码不能为空。");

  const body = new URLSearchParams({ email: options.username.trim(), password: options.password }).toString();
  let response: Response;
  try {
    response = await fetch(`${host}/api/account/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "request-from": "web",
        "real-path": "/item/project/stage",
        Accept: "application/json, text/plain, */*",
      },
      body,
      redirect: "follow",
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    throw new LanhuError(
      "LANHU_NETWORK_ERROR",
      `无法连接蓝湖服务：${host}`,
      "请确认 host 正确、网络可达；自签证书可设置 NODE_TLS_REJECT_UNAUTHORIZED=0 后重试。",
      true,
      { cause: error },
    );
  }

  const text = await response.text();
  let data: LoginResponse = {};
  try {
    data = text ? JSON.parse(text) as LoginResponse : {};
  } catch {
    // 非 JSON 响应在下面统一按失败处理。
  }

  if (!response.ok) {
    const reason = data.message || data.msg || text.slice(0, 200) || `HTTP ${response.status}`;
    throw new LanhuError(
      "LANHU_AUTH_REQUIRED",
      `蓝湖登录失败（HTTP ${response.status}）：${reason}`,
      response.status === 401 || response.status === 400 ? "请确认账号密码；若企业开启了 SSO，请改用 lanhu auth import 导入浏览器 Cookie。" : undefined,
    );
  }
  // 私有部署失败时仍返回 HTTP 200，用 code/msg 表达错误（如 10002 用户名或密码错误）。
  if (data.code && data.code !== "00000") {
    throw new LanhuError(
      "LANHU_AUTH_REQUIRED",
      `蓝湖登录失败：${data.msg || data.message || `code=${data.code}`}`,
      "请确认账号密码；若企业开启了 SSO，请改用 lanhu auth import 导入浏览器 Cookie。",
    );
  }
  if (!data.id && !data.token) {
    throw new LanhuError("LANHU_AUTH_REQUIRED", "蓝湖登录未返回有效用户信息。", "请确认该地址是蓝湖服务且账号可正常登录。");
  }

  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const cookie = setCookies
    .map((value) => value.split(";")[0]?.trim())
    .filter((value): value is string => Boolean(value && value.includes("=")))
    .join("; ");
  if (!cookie) {
    throw new LanhuError(
      "LANHU_AUTH_REQUIRED",
      "登录成功，但服务端没有下发会话 Cookie。",
      "该部署可能使用 Authorization 令牌鉴权，请改用 lanhu auth import 导入浏览器 Cookie。",
    );
  }

  return {
    host,
    cookie,
    user: { id: data.id, name: data.name || data.nickname, email: data.email },
    teamCount: Array.isArray(data.teams) ? data.teams.length : 0,
  };
}
