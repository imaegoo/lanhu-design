import { describe, expect, it } from "vitest";
import { ddsHostFor, normalizeHost } from "../src/config/host.js";

describe("host config", () => {
  it("normalizes a host and keeps the port and sub path", () => {
    expect(normalizeHost("https://lanhu.example.com:30080/")).toBe("https://lanhu.example.com:30080");
    expect(normalizeHost(" https://example.com/lanhu/ ")).toBe("https://example.com/lanhu");
  });

  it("rejects invalid hosts", () => {
    expect(() => normalizeHost("lanhu.example.com")).toThrow("不是合法 URL");
    expect(() => normalizeHost("ftp://lanhu.example.com")).toThrow("只支持 http/https");
    expect(() => normalizeHost("https://user:pass@lanhu.example.com")).toThrow("不能包含账号密码");
  });

  it("keeps the public DDS host and uses same-origin DDS for private deployments", () => {
    expect(ddsHostFor("https://lanhuapp.com")).toBe("https://dds.lanhuapp.com");
    expect(ddsHostFor("https://lanhu.example.com:30080")).toBe("https://lanhu.example.com:30080");
  });
});
