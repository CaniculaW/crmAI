import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSmokeReport, runSmoke } from "./v2-browser-smoke.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");

export const DEFAULT_V4_PAGE_CHECKS = [
  { path: "/", expectedTexts: ["工作台"] },
  { path: "/ai-assistant", expectedTexts: ["AI销售作战助手", "上下文", "最近AI建议"] },
  { path: "/ai-assistant/drafts", expectedTexts: ["草稿确认", "待确认"] },
  { path: "/ai-assistant/weekly-report", expectedTexts: ["AI周报", "生成周报"] },
  { path: "/ai-assistant/opportunities", expectedTexts: ["AI商机分析", "生成商机分析"] },
  { path: "/ai-assistant/visit-plans", expectedTexts: ["AI拜访计划", "生成拜访计划"] },
  { path: "/ai-assistant/communication", expectedTexts: ["AI沟通建议", "生成沟通建议"] },
  { path: "/ai-assistant/logs", expectedTexts: ["AI日志", "AI操作记录"] }
];

export function resolveV4SmokeConfig(env = process.env) {
  const timestamp = formatTimestamp(new Date());
  const evidenceDir = env.CRM_SMOKE_EVIDENCE_DIR
    ?? path.join(REPO_ROOT, "docs/testing/evidence/artifacts", `v4-browser-smoke-${timestamp}`);

  return {
    baseUrl: trimTrailingSlash(env.CRM_SMOKE_URL ?? "http://127.0.0.1:5178"),
    username: env.CRM_SMOKE_USERNAME ?? "demo_admin",
    password: env.CRM_SMOKE_PASSWORD ?? "S3cure!123",
    chromePath: env.CRM_SMOKE_CHROME_PATH ?? undefined,
    port: Number(env.CRM_SMOKE_DEBUG_PORT ?? 9228),
    timeoutMs: Number(env.CRM_SMOKE_TIMEOUT_MS ?? 30000),
    evidenceDir,
    reportPath: env.CRM_SMOKE_REPORT ?? path.join(evidenceDir, "report.json"),
    pageChecks: DEFAULT_V4_PAGE_CHECKS,
    viewports: [
      { name: "desktop", width: 1440, height: 1000, mobile: false, deviceScaleFactor: 1 },
      { name: "tablet", width: 768, height: 1024, mobile: true, deviceScaleFactor: 2 },
      { name: "mobile", width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }
    ]
  };
}

export function assertV4SmokeReport(report) {
  assertSmokeReport(report);

  const checkedPaths = report.pageResults.map((result) => result.path);
  const requiredPaths = DEFAULT_V4_PAGE_CHECKS.map((check) => check.path);
  const missedPaths = requiredPaths.filter((pathName) => !checkedPaths.includes(pathName));
  if (missedPaths.length > 0) {
    throw new Error(`V4 browser smoke missed required routes: ${missedPaths.join(", ")}`);
  }
}

async function runV4Smoke(config = resolveV4SmokeConfig()) {
  const mergedConfig = {
    ...config,
    chromePath: config.chromePath ?? resolveV2ChromePath(),
    pageChecks: config.pageChecks ?? DEFAULT_V4_PAGE_CHECKS
  };
  const report = await runSmoke(mergedConfig);
  assertV4SmokeReport(report);
  return report;
}

function resolveV2ChromePath() {
  return process.env.CRM_SMOKE_CHROME_PATH
    ?? [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser"
    ].find((candidate) => existsSync(candidate));
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runV4Smoke()
    .then((result) => {
      console.log(JSON.stringify({
        status: result.status,
        baseUrl: result.baseUrl,
        routeChecks: result.pageResults.length,
        consoleFailures: result.consoleFailures.length,
        failedResponses: result.failedResponses.length,
        evidenceDir: result.evidenceDir,
        reportPath: result.reportPath
      }, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
