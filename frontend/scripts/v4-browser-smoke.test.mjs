import { describe, expect, it } from "vitest";
import {
  DEFAULT_V4_PAGE_CHECKS,
  assertV4SmokeReport,
  resolveV4SmokeConfig
} from "./v4-browser-smoke.mjs";

describe("v4 browser smoke script helpers", () => {
  it("resolves defaults for the local V4 AI sales assistant smoke flow", () => {
    const config = resolveV4SmokeConfig({});

    expect(config.baseUrl).toBe("http://127.0.0.1:5178");
    expect(config.username).toBe("demo_admin");
    expect(config.password).toBe("S3cure!123");
    expect(config.viewports.map((viewport) => viewport.name)).toEqual(["desktop", "tablet", "mobile"]);
    expect(config.pageChecks.map((check) => check.path)).toEqual(DEFAULT_V4_PAGE_CHECKS.map((check) => check.path));
    expect(config.evidenceDir).toContain("v4-browser-smoke-");
  });

  it("requires all V4 AI assistant routes", () => {
    expect(DEFAULT_V4_PAGE_CHECKS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/ai-assistant", expectedTexts: expect.arrayContaining(["AI销售作战助手"]) }),
        expect.objectContaining({ path: "/ai-assistant/drafts", expectedTexts: expect.arrayContaining(["草稿确认"]) }),
        expect.objectContaining({ path: "/ai-assistant/weekly-report", expectedTexts: expect.arrayContaining(["AI周报"]) }),
        expect.objectContaining({ path: "/ai-assistant/opportunities", expectedTexts: expect.arrayContaining(["AI商机分析"]) }),
        expect.objectContaining({ path: "/ai-assistant/visit-plans", expectedTexts: expect.arrayContaining(["AI拜访计划"]) }),
        expect.objectContaining({ path: "/ai-assistant/communication", expectedTexts: expect.arrayContaining(["AI沟通建议"]) }),
        expect.objectContaining({ path: "/ai-assistant/logs", expectedTexts: expect.arrayContaining(["AI日志"]) })
      ])
    );
  });

  it("accepts a healthy V4 smoke report with all required routes", () => {
    const pageResults = DEFAULT_V4_PAGE_CHECKS.map((check) => ({
      viewport: "desktop",
      path: check.path,
      bodyText: check.expectedTexts.join(" "),
      screenshotPath: `/tmp/${check.path.replaceAll("/", "-") || "dashboard"}.png`,
      url: `http://127.0.0.1:5178${check.path}`
    }));

    expect(() =>
      assertV4SmokeReport({
        pageResults,
        consoleFailures: [],
        failedResponses: []
      })
    ).not.toThrow();
  });

  it("rejects reports that miss V4 AI routes", () => {
    expect(() =>
      assertV4SmokeReport({
        pageResults: [
          {
            viewport: "desktop",
            path: "/ai-assistant",
            bodyText: "AI销售作战助手 上下文 最近AI建议",
            screenshotPath: "/tmp/ai-assistant.png",
            url: "http://127.0.0.1:5178/ai-assistant"
          }
        ],
        consoleFailures: [],
        failedResponses: []
      })
    ).toThrow("missed required routes");
  });
});
