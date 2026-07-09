import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EXPECTED_TEXTS = ["V1演示管理员", "系统概览", "角色权限", "AI配置"];

export function resolveSmokeConfig(env = process.env) {
  return {
    url: env.CRM_SMOKE_URL ?? "http://127.0.0.1:5174/system",
    username: env.CRM_SMOKE_USERNAME ?? "demo_admin",
    password: env.CRM_SMOKE_PASSWORD ?? "S3cure!123",
    expectedTexts: (env.CRM_SMOKE_EXPECTED_TEXTS ?? DEFAULT_EXPECTED_TEXTS.join(","))
      .split(",")
      .map((text) => text.trim())
      .filter(Boolean),
    chromePath: env.CRM_SMOKE_CHROME_PATH ?? findChromePath(),
    port: Number(env.CRM_SMOKE_DEBUG_PORT ?? 9223),
    screenshotPath: env.CRM_SMOKE_SCREENSHOT ?? path.join(tmpdir(), "crm-v1-browser-smoke.png"),
    timeoutMs: Number(env.CRM_SMOKE_TIMEOUT_MS ?? 30000)
  };
}

export function assertSmokeResult(result, expectedTexts = DEFAULT_EXPECTED_TEXTS) {
  const missingTexts = expectedTexts.filter((text) => !result.bodyText.includes(text));
  if (missingTexts.length > 0) {
    throw new Error(`Missing expected V1 smoke text: ${missingTexts.join(", ")}`);
  }
  if (result.consoleFailures.length > 0) {
    const details = result.consoleFailures.map((entry) => `${entry.type}: ${entry.text}`).join("; ");
    throw new Error(`V1 browser smoke found browser console failures: ${details}`);
  }
}

async function runSmoke(config = resolveSmokeConfig()) {
  if (!config.chromePath) {
    throw new Error("Chrome executable not found. Set CRM_SMOKE_CHROME_PATH to run the V1 browser smoke.");
  }

  const userDataDir = await mkdtemp(path.join(tmpdir(), "crm-v1-smoke-chrome-"));
  const chrome = spawn(config.chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1000",
    `--remote-debugging-port=${config.port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"] });

  try {
    const page = await openCdpPage(config);
    const failures = [];
    page.onEvent((event) => {
      if (event.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn"].includes(event.params.type)) {
        failures.push({
          type: event.params.type,
          text: event.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ")
        });
      }
      if (event.method === "Runtime.exceptionThrown") {
        failures.push({
          type: "exception",
          text: event.params.exceptionDetails?.text ?? "Runtime exception"
        });
      }
      if (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level)) {
        failures.push({ type: event.params.entry.level, text: event.params.entry.text });
      }
    });

    await page.send("Runtime.enable");
    await page.send("Log.enable");
    await page.send("Page.enable");
    await navigate(page, config.url, config.timeoutMs);
    await waitForText(page, "用户名", config.timeoutMs);
    await login(page, config.username, config.password);
    try {
      await waitForAllTexts(page, config.expectedTexts, config.timeoutMs);
    } catch (error) {
      const pageState = await describePage(page);
      const consoleDetails = failures.map((entry) => `${entry.type}: ${entry.text}`).join("; ") || "none";
      throw new Error(`${error.message}. Current URL: ${pageState.url}. Body: ${pageState.bodyText}. Console: ${consoleDetails}`);
    }

    const result = await page.send("Runtime.evaluate", {
      expression: "({ title: document.title, url: location.href, bodyText: document.body.innerText })",
      returnByValue: true
    });
    const pageResult = result.result.value;
    const screenshot = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(config.screenshotPath, Buffer.from(screenshot.data, "base64"));

    const smokeResult = {
      ...pageResult,
      consoleFailures: failures
    };
    assertSmokeResult(smokeResult, config.expectedTexts);

    return {
      ...smokeResult,
      screenshotPath: config.screenshotPath
    };
  } finally {
    chrome.kill("SIGTERM");
    await rm(userDataDir, { recursive: true, force: true });
  }
}

async function login(page, username, password) {
  await focusSelector(page, "input#username");
  await page.send("Input.insertText", { text: username });
  await focusSelector(page, "input#password");
  await page.send("Input.insertText", { text: password });
  await page.send("Runtime.evaluate", {
    expression: `
      (() => {
        const form = document.querySelector("form");
        if (!form) throw new Error("Missing login form");
        form.requestSubmit();
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

async function navigate(page, url, timeoutMs) {
  const loaded = page.waitForEvent("Page.loadEventFired", timeoutMs);
  await page.send("Page.navigate", { url });
  await loaded;
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
  }, timeoutMs, `Timed out waiting for V1 smoke texts: ${texts.join(", ")}`);
}

async function describePage(page) {
  const result = await page.send("Runtime.evaluate", {
    expression: "({ url: location.href, bodyText: document.body?.innerText?.slice(0, 1000) ?? '' })",
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSmoke()
    .then((result) => {
      console.log(JSON.stringify({
        status: "passed",
        url: result.url,
        title: result.title,
        screenshotPath: result.screenshotPath
      }, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
