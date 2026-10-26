import { isDefaultHost } from "../config/host.js";
import { LanhuError } from "../errors/lanhu-error.js";
import { getStoredCredential } from "./credential-store.js";

export async function findCredential(host: string, explicit?: string): Promise<{
  value: string;
  source: string;
  profile?: string;
  createdAt?: string;
} | null> {
  if (explicit?.trim()) return { value: explicit.trim(), source: "explicit" };
  const envCookie = process.env.LANHU_COOKIE?.trim();
  if (envCookie && envCookie !== "your_lanhu_cookie_here") {
    return { value: envCookie, source: "environment" };
  }
  const stored = await getStoredCredential(host);
  if (stored) return stored;
  return null;
}

export async function resolveCredential(host: string, explicit?: string): Promise<string> {
  const credential = await findCredential(host, explicit);
  if (credential) return credential.value;
  throw new LanhuError(
    "LANHU_AUTH_REQUIRED",
    "未找到当前蓝湖 host 的登录凭据。",
    isDefaultHost(host)
      ? "运行：lanhu auth；若浏览器 Cookie 无法读取，运行：lanhu auth import"
      : `运行：lanhu auth login -u <账号> --host ${host}`,
  );
}
