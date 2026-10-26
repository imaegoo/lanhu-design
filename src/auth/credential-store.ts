import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_HOST, normalizeHost } from "../config/host.js";
import { paths } from "../config/paths.js";

export interface StoredCredential {
  type: "cookie";
  value: string;
  source: string;
  profile?: string;
  createdAt: string;
}

export interface StoredCredentialFile {
  version: 2;
  /** 按蓝湖 host 分桶保存，切换私有部署时不会互相覆盖。 */
  credentials: Record<string, StoredCredential>;
}

export const credentialPath = path.join(paths.config, "credentials.json");

function isCredential(value: unknown): value is StoredCredential {
  const credential = value as Partial<StoredCredential> | null;
  return Boolean(
    credential
    && credential.type === "cookie"
    && typeof credential.value === "string"
    && credential.value
    && typeof credential.source === "string"
    && typeof credential.createdAt === "string"
    && (credential.profile === undefined || typeof credential.profile === "string"),
  );
}

function normalizeKey(value: string): string {
  try {
    return normalizeHost(value);
  } catch {
    throw new TypeError("凭据文件格式无效。");
  }
}

export function parseCredential(raw: string): StoredCredentialFile {
  const parsed = JSON.parse(raw) as unknown;

  // 兼容 1.x 的单凭据文件：默认属于公开版蓝湖。
  const legacy = parsed as { version?: unknown; credential?: unknown };
  if (legacy?.version === 1) {
    if (!isCredential(legacy.credential)) throw new TypeError("凭据文件格式无效。");
    return { version: 2, credentials: { [DEFAULT_HOST]: legacy.credential } };
  }

  const file = parsed as Partial<StoredCredentialFile> | null;
  if (file?.version !== 2 || typeof file.credentials !== "object" || file.credentials === null) {
    throw new TypeError("凭据文件格式无效。");
  }
  const credentials: Record<string, StoredCredential> = {};
  for (const [host, credential] of Object.entries(file.credentials)) {
    if (!isCredential(credential)) throw new TypeError("凭据文件格式无效。");
    credentials[normalizeKey(host)] = credential;
  }
  return { version: 2, credentials };
}

export async function readCredentials(): Promise<StoredCredentialFile> {
  try {
    return parseCredential(await readFile(credentialPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 2, credentials: {} };
    throw error;
  }
}

export async function getStoredCredential(host: string): Promise<StoredCredential | null> {
  const file = await readCredentials();
  return file.credentials[normalizeHost(host)] ?? null;
}

async function persist(file: StoredCredentialFile): Promise<void> {
  await mkdir(paths.config, { recursive: true, mode: 0o700 });
  await chmod(paths.config, 0o700).catch(() => undefined);
  // 先写临时文件再原子替换，避免进程中断后留下半写入的凭据文件。
  const temporary = `${credentialPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(temporary, 0o600).catch(() => undefined);
  await rename(temporary, credentialPath);
}

export async function writeCredential(host: string, cookie: string, source: string, profile?: string): Promise<void> {
  const file = await readCredentials();
  file.credentials[normalizeHost(host)] = {
    type: "cookie",
    value: cookie,
    source,
    ...(profile ? { profile } : {}),
    createdAt: new Date().toISOString(),
  };
  await persist(file);
}

export async function deleteCredential(host?: string): Promise<boolean> {
  const file = await readCredentials();
  if (!host) {
    if (Object.keys(file.credentials).length === 0) return false;
    await rm(credentialPath, { force: true });
    return true;
  }
  const key = normalizeHost(host);
  if (!Object.hasOwn(file.credentials, key)) return false;
  delete file.credentials[key];
  if (Object.keys(file.credentials).length === 0) {
    await rm(credentialPath, { force: true });
  } else {
    await persist(file);
  }
  return true;
}
