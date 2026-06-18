import { describe, expect, it } from "vitest";
import { assertSmokeResult, resolveSmokeConfig } from "./v1-browser-smoke.mjs";

describe("v1 browser smoke script helpers", () => {
  it("resolves defaults for the local V1 system smoke flow", () => {
    const config = resolveSmokeConfig({});

    expect(config.url).toBe("http://127.0.0.1:5175/system");
    expect(config.username).toBe("demo_admin");
    expect(config.password).toBe("S3cure!123");
    expect(config.expectedTexts).toEqual(["V1演示销售部", "V1演示管理员", "v1_demo_admin"]);
  });

  it("accepts a healthy smoke result with all expected texts and no console failures", () => {
    expect(() =>
      assertSmokeResult({
        url: "http://127.0.0.1:5175/system",
        title: "Canicula CRM",
        bodyText: "系统管理 V1演示销售部 V1演示管理员 v1_demo_admin",
        consoleFailures: []
      })
    ).not.toThrow();
  });

  it("rejects smoke results that miss expected system-management evidence", () => {
    expect(() =>
      assertSmokeResult({
        url: "http://127.0.0.1:5175/system",
        title: "Canicula CRM",
        bodyText: "系统管理 V1演示管理员 v1_demo_admin",
        consoleFailures: []
      })
    ).toThrow("V1演示销售部");
  });

  it("rejects browser console errors and warnings", () => {
    expect(() =>
      assertSmokeResult({
        url: "http://127.0.0.1:5175/system",
        title: "Canicula CRM",
        bodyText: "系统管理 V1演示销售部 V1演示管理员 v1_demo_admin",
        consoleFailures: [{ type: "error", text: "boom" }]
      })
    ).toThrow("browser console");
  });
});
