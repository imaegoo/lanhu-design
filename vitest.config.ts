import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // .research 保存的是上游仓库快照，不参与本项目测试。
    exclude: ["**/node_modules/**", "**/dist/**", ".research/**"],
  },
});
