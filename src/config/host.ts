import { LanhuError } from "../errors/lanhu-error.js";
import { readSettings } from "./settings.js";

export const DEFAULT_HOST = "https://lanhuapp.com";
export const DEFAULT_DDS_HOST = "https://dds.lanhuapp.com";

export type HostSource = "flag" | "environment" | "config" | "default";

export interface ResolvedHost {
  host: string;
  source: HostSource;
}

/** 规范化 host：保留协议、域名端口与可选子路径，去掉末尾斜杠和查询串。 */
export function normalizeHost(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) throw new LanhuError("LANHU_INVALID_ARGUMENT", "蓝湖 host 不能为空。");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new LanhuError(
      "LANHU_INVALID_ARGUMENT",
      `蓝湖 host 不是合法 URL：${value}`,
      "示例：https://lanhu.example.com 或 https://lanhu.example.com:30080",
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new LanhuError("LANHU_INVALID_ARGUMENT", `蓝湖 host 只支持 http/https：${value}`);
  }
  if (url.username || url.password) {
    throw new LanhuError("LANHU_INVALID_ARGUMENT", "蓝湖 host 不能包含账号密码。");
  }
  if (url.search || url.hash) {
    throw new LanhuError("LANHU_INVALID_ARGUMENT", "蓝湖 host 不能包含查询串或锚点。");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export function isDefaultHost(host: string): boolean {
  return normalizeHost(host) === DEFAULT_HOST;
}

/** 公开版的设计数据服务在独立域名；私有部署与主站同源（/api/dds/...）。 */
export function ddsHostFor(host: string): string {
  return isDefaultHost(host) ? DEFAULT_DDS_HOST : normalizeHost(host);
}

export async function resolveHostWithSource(explicit?: string): Promise<ResolvedHost> {
  if (explicit?.trim()) return { host: normalizeHost(explicit), source: "flag" };
  const environment = process.env.LANHU_HOST?.trim();
  if (environment) return { host: normalizeHost(environment), source: "environment" };
  const settings = await readSettings();
  if (settings.host?.trim()) return { host: normalizeHost(settings.host), source: "config" };
  return { host: DEFAULT_HOST, source: "default" };
}

export async function resolveHost(explicit?: string): Promise<string> {
  return (await resolveHostWithSource(explicit)).host;
}
