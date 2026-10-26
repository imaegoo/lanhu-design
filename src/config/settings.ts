import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { paths } from "./paths.js";

export interface Settings {
  version: 1;
  /** 蓝湖服务地址；未配置时使用 https://lanhuapp.com。 */
  host?: string;
}

export const settingsPath = path.join(paths.config, "config.json");

function emptySettings(): Settings {
  return { version: 1 };
}

export async function readSettings(): Promise<Settings> {
  let raw: string;
  try {
    raw = await readFile(settingsPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptySettings();
    throw error;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (parsed?.version === 1 && (parsed.host === undefined || typeof parsed.host === "string")) {
      return parsed.host?.trim() ? { version: 1, host: parsed.host } : emptySettings();
    }
  } catch {
    // 配置文件损坏时不阻塞命令，按未配置处理。
  }
  return emptySettings();
}

export async function writeSettings(settings: Settings): Promise<void> {
  await mkdir(paths.config, { recursive: true, mode: 0o700 });
  await chmod(paths.config, 0o700).catch(() => undefined);
  const temporary = `${settingsPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(temporary, 0o600).catch(() => undefined);
  await rename(temporary, settingsPath);
}
