import { describe, expect, it } from "vitest";
import { assertSmokeResult, cleanupUserDataDir, resolveSmokeConfig } from "./v1-browser-smoke.mjs";

describe("v1 browser smoke script helpers", () => {
  it("resolves defaults for the local V1 system smoke flow", () => {
    const config = resolveSmokeConfig({});

    expect(config.url).toBe("http://127.0.0.1:5174/system");
    expect(config.username).toBe("demo_admin");
    expect(config.password).toBe("S3cure!123");
    expect(config.expectedTexts).toEqual(["V1演示管理员", "系统概览", "角色权限", "AI配置"]);
  });

  it("accepts a healthy smoke result with all expected texts and no console failures", () => {
    expect(() =>
      assertSmokeResult({
        url: "http://127.0.0.1:5174/system",
        title: "Canicula CRM",
        bodyText: "系统管理 V1演示管理员 系统概览 角色权限 AI配置",
        consoleFailures: []
      })
    ).not.toThrow();
  });

  it("rejects smoke results that miss expected system-management evidence", () => {
    expect(() =>
      assertSmokeResult({
        url: "http://127.0.0.1:5174/system",
        title: "Canicula CRM",
        bodyText: "系统管理 V1演示管理员 角色权限 AI配置",
        consoleFailures: []
      })
    ).toThrow("系统概览");
  });

  it("rejects browser console errors and warnings", () => {
    expect(() =>
      assertSmokeResult({
        url: "http://127.0.0.1:5174/system",
        title: "Canicula CRM",
        bodyText: "系统管理 V1演示管理员 系统概览 角色权限 AI配置",
        consoleFailures: [{ type: "error", text: "boom" }]
      })
    ).toThrow("browser console");
  });

  it("retries transient Chrome profile cleanup failures", async () => {
    let attempts = 0;
    const remover = async () => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error("profile is busy");
        error.code = "EBUSY";
        throw error;
      }
    };

    await cleanupUserDataDir("/tmp/crm-smoke-profile", remover, async () => {});

    expect(attempts).toBe(2);
  });
});
