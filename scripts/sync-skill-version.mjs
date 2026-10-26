#!/usr/bin/env node
// 由 `npm version` 生命周期调用：把 package.json 的版本同步到 Agent Skill 的 frontmatter。
// self_check 会校验两者一致，避免发版时因版本号不同步而失败。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const skillPath = path.join(root, "skills/lanhu-design/SKILL.md");
const skill = await readFile(skillPath, "utf8");
const next = skill.replace(/^  version: .*$/m, `  version: ${pkg.version}`);

if (next !== skill) {
  await writeFile(skillPath, next, "utf8");
  console.log(`SKILL.md version -> ${pkg.version}`);
} else {
  console.log(`SKILL.md version already ${pkg.version}`);
}
