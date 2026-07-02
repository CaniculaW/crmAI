import { describe, expect, it } from "vitest";
import {
  DEFAULT_V2_PAGE_CHECKS,
  assertSmokeReport,
  resolveSmokeConfig
} from "./v2-browser-smoke.mjs";

describe("v2 browser smoke script helpers", () => {
  it("resolves defaults for the local V2 full-chain smoke flow", () => {
    const config = resolveSmokeConfig({});

    expect(config.baseUrl).toBe("http://127.0.0.1:5175");
    expect(config.username).toBe("demo_admin");
    expect(config.password).toBe("S3cure!123");
    expect(config.viewports.map((viewport) => viewport.name)).toEqual(["desktop", "tablet", "mobile"]);
    expect(config.pageChecks.map((check) => check.path)).toEqual(DEFAULT_V2_PAGE_CHECKS.map((check) => check.path));
    expect(config.evidenceDir).toContain("v2-browser-smoke-");
  });

  it("requires V2 sales-to-finance and system governance routes", () => {
    expect(DEFAULT_V2_PAGE_CHECKS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/", expectedTexts: expect.arrayContaining(["工作台"]) }),
        expect.objectContaining({ path: "/solutions", expectedTexts: expect.arrayContaining(["方案"]) }),
        expect.objectContaining({ path: "/contracts", expectedTexts: expect.arrayContaining(["合同"]) }),
        expect.objectContaining({ path: "/invoices", expectedTexts: expect.arrayContaining(["开票"]) }),
        expect.objectContaining({ path: "/receivables", expectedTexts: expect.arrayContaining(["回款"]) }),
        expect.objectContaining({ path: "/reconciliations", expectedTexts: expect.arrayContaining(["核销"]) }),
        expect.objectContaining({ path: "/system/roles", expectedTexts: expect.arrayContaining(["角色权限"]) }),
        expect.objectContaining({ path: "/system/dictionaries", expectedTexts: expect.arrayContaining(["字典"]) })
      ])
    );
  });

  it("accepts a healthy smoke report with route and screenshot evidence", () => {
    expect(() =>
      assertSmokeReport({
        pageResults: [
          {
            viewport: "desktop",
            path: "/contracts",
            bodyText: "合同 合同编号 客户 商机",
            screenshotPath: "/tmp/contracts.png",
            url: "http://127.0.0.1:5175/contracts"
          }
        ],
        consoleFailures: [],
        failedResponses: []
      })
    ).not.toThrow();
  });

  it("rejects service failures surfaced in page content", () => {
    expect(() =>
      assertSmokeReport({
        pageResults: [
          {
            viewport: "desktop",
            path: "/contacts",
            bodyText: "联系人 服务端异常",
            screenshotPath: "/tmp/contacts.png",
            url: "http://127.0.0.1:5175/contacts"
          }
        ],
        consoleFailures: [],
        failedResponses: []
      })
    ).toThrow("服务端异常");
  });

  it("rejects failed API responses and console errors", () => {
    expect(() =>
      assertSmokeReport({
        pageResults: [
          {
            viewport: "mobile",
            path: "/reconciliations",
            bodyText: "核销工作台 待核销发票 待分配回款",
            screenshotPath: "/tmp/reconciliations.png",
            url: "http://127.0.0.1:5175/reconciliations"
          }
        ],
        consoleFailures: [{ type: "error", text: "boom" }],
        failedResponses: [{ status: 500, url: "http://127.0.0.1:5175/api/contracts" }]
      })
    ).toThrow("browser console");
  });
});
