import { describe, expect, it } from "vitest";
import { parseCredential } from "../src/auth/credential-store.js";

describe("credential store", () => {
  it("accepts stored credentials and rejects invalid files", () => {
    const raw = JSON.stringify({
      version: 2,
      credentials: {
        "https://lanhu.example.com:30080": { type: "cookie", value: "a=1", source: "test", createdAt: "2026-01-01" },
      },
    });
    expect(parseCredential(raw).credentials["https://lanhu.example.com:30080"]?.value).toBe("a=1");
    expect(() => parseCredential("{}")).toThrow("凭据文件格式无效");
  });

  it("migrates a 1.x single-credential file to the public host", () => {
    const raw = JSON.stringify({
      version: 1,
      credential: { type: "cookie", value: "a=1", source: "test", createdAt: "2026-01-01" },
    });
    expect(parseCredential(raw).credentials["https://lanhuapp.com"]?.value).toBe("a=1");
  });
});
