import { CommanderError } from "commander";
import { createProgram } from "./program.js";
import { enableLegacyTls } from "../core/tls.js";
import { LanhuError } from "../errors/lanhu-error.js";

// 私有部署可能仍在使用旧版 TLS 重协商，需在发起任何请求前打开兼容开关。
enableLegacyTls();

try {
  await createProgram().exitOverride().parseAsync(process.argv);
} catch (error) {
  if (error instanceof LanhuError) {
    process.exitCode = error.exitCode;
  } else if (error instanceof CommanderError) {
    process.exitCode = error.exitCode;
  } else {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
