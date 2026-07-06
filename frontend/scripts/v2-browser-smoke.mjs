import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");

export const DEFAULT_V2_PAGE_CHECKS = [
  { path: "/", expectedTexts: ["工作台"] },
  { path: "/accounts", expectedTexts: ["客户"] },
  { path: "/contacts", expectedTexts: ["联系人"] },
  { path: "/opportunities", expectedTexts: ["商机"] },
  { path: "/activities", expectedTexts: ["销售行动"] },
  { path: "/weekly-progress", expectedTexts: ["周进展"] },
  { path: "/solutions", expectedTexts: ["方案"] },
  { path: "/contracts", expectedTexts: ["合同"] },
  { path: "/contracts?account_id=1&opportunity_id=10", expectedTexts: ["合同"] },
  { path: "/invoices", expectedTexts: ["开票"] },
  { path: "/receivables", expectedTexts: ["回款"] },
  { path: "/reconciliations", expectedTexts: ["核销"] },
  { path: "/system", expectedTexts: ["系统"] },
  { path: "/system/departments", expectedTexts: ["组织"] },
  { path: "/system/users", expectedTexts: ["用户"] },
  { path: "/system/roles", expectedTexts: ["角色权限"] },
  { path: "/system/audit-logs", expectedTexts: ["审计日志"] },
  { path: "/system/dictionaries", expectedTexts: ["字典"] }
];

const DEFAULT_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000, mobile: false, deviceScaleFactor: 1 },
  { name: "tablet", width: 768, height: 1024, mobile: true, deviceScaleFactor: 2 },
  { name: "mobile", width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }
];

const BLOCKING_TEXTS = ["服务端异常", "Failed to fetch", "Network Error", "Internal Server Error"];

export function resolveSmokeConfig(env = process.env) {
  const timestamp = formatTimestamp(new Date());
  const evidenceDir = env.CRM_SMOKE_EVIDENCE_DIR
    ?? path.join(REPO_ROOT, "docs/testing/evidence/artifacts", `v2-browser-smoke-${timestamp}`);

  return {
    baseUrl: trimTrailingSlash(env.CRM_SMOKE_URL ?? "http://127.0.0.1:5175"),
    username: env.CRM_SMOKE_USERNAME ?? "demo_admin",
    password: env.CRM_SMOKE_PASSWORD ?? "S3cure!123",
    chromePath: env.CRM_SMOKE_CHROME_PATH ?? findChromePath(),
    port: Number(env.CRM_SMOKE_DEBUG_PORT ?? 9224),
    timeoutMs: Number(env.CRM_SMOKE_TIMEOUT_MS ?? 30000),
    evidenceDir,
    reportPath: env.CRM_SMOKE_REPORT ?? path.join(evidenceDir, "report.json"),
    pageChecks: DEFAULT_V2_PAGE_CHECKS,
    viewports: DEFAULT_VIEWPORTS
  };
}

export function assertSmokeReport(report) {
  const serviceFailures = report.pageResults.filter((result) =>
    BLOCKING_TEXTS.some((text) => result.bodyText.includes(text))
  );
  if (serviceFailures.length > 0) {
    const details = serviceFailures
      .map((result) => `${result.viewport} ${result.path}: ${findBlockingText(result.bodyText)}`)
      .join("; ");
    throw new Error(`V2 browser smoke found service failure text: ${details}`);
  }

  if (report.consoleFailures.length > 0) {
    const details = report.consoleFailures.map((entry) => `${entry.type}: ${entry.text}`).join("; ");
    throw new Error(`V2 browser smoke found browser console failures: ${details}`);
  }

  if (report.failedResponses.length > 0) {
    const details = report.failedResponses.map((entry) => `${entry.status} ${entry.url}`).join("; ");
    throw new Error(`V2 browser smoke found failed API responses: ${details}`);
  }
}

async function runSmoke(config = resolveSmokeConfig()) {
  if (!config.chromePath) {
    throw new Error("Chrome executable not found. Set CRM_SMOKE_CHROME_PATH to run the V2 browser smoke.");
  }

  await mkdir(config.evidenceDir, { recursive: true });
  const userDataDir = await mkdtemp(path.join(tmpdir(), "crm-v2-smoke-chrome-"));

  const chrome = spawn(config.chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--remote-debugging-port=${config.port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"] });

  try {
    const page = await openCdpPage(config);
    const consoleFailures = [];
    const failedResponses = [];

    page.onEvent((event) => {
      if (event.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn"].includes(event.params.type)) {
        consoleFailures.push({
          type: event.params.type,
          text: event.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ")
        });
      }
      if (event.method === "Runtime.exceptionThrown") {
        consoleFailures.push({
          type: "exception",
          text: event.params.exceptionDetails?.text ?? "Runtime exception"
        });
      }
      if (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level)) {
        consoleFailures.push({ type: event.params.entry.level, text: event.params.entry.text });
      }
      if (event.method === "Network.responseReceived") {
        const { response } = event.params;
        if (response.status >= 400 && isApplicationApiUrl(response.url)) {
          failedResponses.push({ status: response.status, url: response.url });
        }
      }
      if (event.method === "Network.loadingFailed" && isApplicationApiUrl(event.params.requestId ?? "")) {
        failedResponses.push({ status: "FAILED", url: event.params.requestId, errorText: event.params.errorText });
      }
    });

    await page.send("Runtime.enable");
    await page.send("Log.enable");
    await page.send("Network.enable");
    await page.send("Page.enable");

    await setViewport(page, config.viewports[0]);
    await navigate(page, config.baseUrl, config.timeoutMs);
    await login(page, config.username, config.password);
    await navigate(page, config.baseUrl, config.timeoutMs);
    try {
      await waitForText(page, "修改密码", config.timeoutMs);
    } catch (error) {
      const pageState = await describePage(page);
      const authState = await page.send("Runtime.evaluate", {
        expression: "({ hasToken: Boolean(localStorage.getItem('crm.access_token')), tokenPrefix: localStorage.getItem('crm.access_token')?.slice(0, 12) ?? null })",
        returnByValue: true
      });
      const debugScreenshotPath = path.join(config.evidenceDir, "failed-login.png");
      const debugScreenshot = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true });
      await writeFile(debugScreenshotPath, Buffer.from(debugScreenshot.data, "base64"));
      throw new Error(`${error.message}. Auth: ${JSON.stringify(authState.result.value)}. Current URL: ${pageState.url}. Body: ${pageState.bodyText.slice(0, 1200)}. Screenshot: ${debugScreenshotPath}`);
    }

    const pageResults = [];
    for (const viewport of config.viewports) {
      await setViewport(page, viewport);
      for (const check of config.pageChecks) {
        let pageState;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          await navigate(page, `${config.baseUrl}${check.path}`, config.timeoutMs);
          try {
            await waitForAllTexts(page, check.expectedTexts, config.timeoutMs);
          } catch (error) {
            pageState = await describePage(page);
            const debugScreenshotPath = path.join(config.evidenceDir, `failed-${viewport.name}-${slugify(check.path)}.png`);
            const debugScreenshot = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true });
            await writeFile(debugScreenshotPath, Buffer.from(debugScreenshot.data, "base64"));
            throw new Error(`${error.message}. Current URL: ${pageState.url}. Body: ${pageState.bodyText.slice(0, 1200)}. Screenshot: ${debugScreenshotPath}`);
          }
          pageState = await describePage(page);
          if (!hasBlockingText(pageState.bodyText) || attempt === 2) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        const screenshotPath = path.join(config.evidenceDir, `${viewport.name}-${slugify(check.path)}.png`);
        const screenshot = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true });
        await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
        pageResults.push({
          viewport: viewport.name,
          path: check.path,
          url: pageState.url,
          title: pageState.title,
          bodyText: pageState.bodyText,
          screenshotPath
        });
      }
    }

    const report = {
      status: "passed",
      generatedAt: new Date().toISOString(),
      baseUrl: config.baseUrl,
      viewports: config.viewports,
      pageResults,
      consoleFailures,
      failedResponses
    };
    assertSmokeReport(report);
    await writeFile(config.reportPath, `${JSON.stringify(report, null, 2)}\n`);
    return { ...report, reportPath: config.reportPath, evidenceDir: config.evidenceDir };
  } finally {
    chrome.kill("SIGTERM");
    await waitForProcessExit(chrome, 2000);
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function login(page, username, password) {
  await page.send("Runtime.evaluate", {
    expression: `
      (async () => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: ${JSON.stringify(username)}, password: ${JSON.stringify(password)} })
        });
        if (!response.ok) {
          throw new Error("Smoke login failed with HTTP " + response.status);
        }
        const payload = await response.json();
        const token = payload?.data?.access_token;
        if (!token) {
          throw new Error("Smoke login response missed access_token");
        }
        localStorage.setItem("crm.access_token", token);
      })();
    `,
    awaitPromise: true
  });
}

async function focusSelector(page, selector) {
  await page.send("Runtime.evaluate", {
    expression: `
      (() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        if (!input) throw new Error("Missing input ${selector}");
        input.focus();
      })();
    `
  });
}

async function setViewport(page, viewport) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: viewport.mobile
  });
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile });
}

async function navigate(page, url, timeoutMs) {
  const loaded = page.waitForEvent("Page.loadEventFired", timeoutMs);
  await page.send("Page.navigate", { url });
  await loaded;
  await waitUntil(async () => {
    const result = await page.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && document.body?.innerText?.length > 0",
      returnByValue: true
    });
    return result.result.value === true;
  }, timeoutMs, `Timed out waiting for page content: ${url}`);
}

async function waitForText(page, text, timeoutMs) {
  await waitUntil(async () => {
    const result = await page.send("Runtime.evaluate", {
      expression: `document.body?.innerText?.includes(${JSON.stringify(text)}) ?? false`,
      returnByValue: true
    });
    return result.result.value === true;
  }, timeoutMs, `Timed out waiting for text: ${text}`);
}

async function waitForAllTexts(page, texts, timeoutMs) {
  await waitUntil(async () => {
    const result = await page.send("Runtime.evaluate", {
      expression: `${JSON.stringify(texts)}.every((text) => document.body?.innerText?.includes(text))`,
      returnByValue: true
    });
    return result.result.value === true;
  }, timeoutMs, `Timed out waiting for V2 smoke texts: ${texts.join(", ")}`);
}

async function describePage(page) {
  const result = await page.send("Runtime.evaluate", {
    expression: "({ title: document.title, url: location.href, bodyText: document.body?.innerText ?? '' })",
    returnByValue: true
  });
  return result.result.value;
}

async function waitUntil(check, timeoutMs, timeoutMessage) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(timeoutMessage);
}

async function openCdpPage(config) {
  await waitUntil(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${config.port}/json/version`);
      return response.ok;
    } catch {
      return false;
    }
  }, config.timeoutMs, "Timed out waiting for Chrome DevTools endpoint");

  const response = await fetch(`http://127.0.0.1:${config.port}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) {
    throw new Error(`Failed to open Chrome DevTools page: HTTP ${response.status}`);
  }
  const target = await response.json();
  return createCdpClient(target.webSocketDebuggerUrl);
}

function createCdpClient(webSocketUrl) {
  let nextId = 1;
  const pending = new Map();
  const eventHandlers = new Set();
  const socket = new WebSocket(webSocketUrl);
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (message) => {
    const payload = JSON.parse(message.data);
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) {
        reject(new Error(payload.error.message));
      } else {
        resolve(payload.result);
      }
      return;
    }
    eventHandlers.forEach((handler) => handler(payload));
  });

  return {
    async send(method, params = {}) {
      await ready;
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    onEvent(handler) {
      eventHandlers.add(handler);
    },
    waitForEvent(method, timeoutMs) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          eventHandlers.delete(handler);
          reject(new Error(`Timed out waiting for CDP event: ${method}`));
        }, timeoutMs);
        const handler = (event) => {
          if (event.method === method) {
            clearTimeout(timer);
            eventHandlers.delete(handler);
            resolve(event);
          }
        };
        eventHandlers.add(handler);
      });
    }
  };
}

function findBlockingText(bodyText) {
  return BLOCKING_TEXTS.find((text) => bodyText.includes(text)) ?? "unknown";
}

function hasBlockingText(bodyText) {
  return BLOCKING_TEXTS.some((text) => bodyText.includes(text));
}

function isApplicationApiUrl(url) {
  return typeof url === "string" && /\/api\//.test(url);
}

function findChromePath() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function waitForProcessExit(process, timeoutMs) {
  if (process.exitCode !== null || process.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    process.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function slugify(value) {
  const normalized = value === "/" ? "dashboard" : value.replace(/^\//, "");
  return normalized.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
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
  runSmoke()
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
