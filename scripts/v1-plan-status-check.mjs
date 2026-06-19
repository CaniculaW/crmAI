#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateV1ReleaseGateFromFiles } from "./v1-release-gate.mjs";

const DEFAULT_PLAN_PATH = "docs/superpowers/plans/2026-06-17-crm-development-kickoff.md";
const DEFAULT_STATUS_PATH = "docs/testing/v1-validation-status.md";

const CRITICAL_OPEN_ITEMS = [
  "Step 1: 召开研发启动会",
  "Step 2: 形成启动会纪要",
  "Step 3: 冻结V1范围",
  "Step 3: 业务验收",
  "指定产品负责人、研发负责人、业务验收人",
  "召开研发启动会"
];

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function checkboxState(planText, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = planText.match(new RegExp(`- \\[([ xX])]\\s+(?:\\*\\*)?${escapedLabel}`));
  if (!match) {
    return "missing";
  }
  return match[1].toLowerCase() === "x" ? "checked" : "open";
}

function openCriticalItems(planText) {
  return CRITICAL_OPEN_ITEMS.filter((item) => checkboxState(planText, item) === "open");
}

function hasNoGoStatus(validationStatusText) {
  return /^Overall:\s*No-Go\s*$/m.test(validationStatusText);
}

function hasOpenBlockerSection(validationStatusText) {
  return validationStatusText.includes("## Open Blockers")
    && validationStatusText.includes("FAIL ");
}

export function evaluateV1PlanStatusSnapshot({
  planText,
  validationStatusText,
  releaseGateResult
}) {
  const openItems = openCriticalItems(planText);
  const missingItems = CRITICAL_OPEN_ITEMS.filter((item) => checkboxState(planText, item) === "missing");
  const hasOpenItems = openItems.length > 0;
  const releaseGateIsNoGo = releaseGateResult.ok === false && releaseGateResult.decision !== "Go";

  const checks = [
    makeCheck(
      "plan-critical-items-present",
      missingItems.length === 0,
      missingItems.length === 0
        ? "Critical launch and UAT plan checklist items are present."
        : `Critical plan checklist items are missing: ${missingItems.join(", ")}`
    ),
    makeCheck(
      "open-plan-items-no-go",
      !hasOpenItems || (hasNoGoStatus(validationStatusText) && releaseGateIsNoGo),
      !hasOpenItems
        ? "No critical open plan checklist items remain."
        : `Open critical plan items remain (${openItems.join(", ")}), so validation status and release gate must stay No-Go.`
    ),
    makeCheck(
      "open-plan-items-blockers-listed",
      !hasOpenItems || hasOpenBlockerSection(validationStatusText),
      !hasOpenItems
        ? "No critical open plan checklist items require blocker evidence."
        : "Validation status lists open blockers for unfinished launch and UAT plan work."
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    openItems,
    passed,
    failed,
    checks
  };
}

function evaluateFromFiles({
  rootDir = process.cwd(),
  planPath = DEFAULT_PLAN_PATH,
  validationStatusPath = DEFAULT_STATUS_PATH
} = {}) {
  const planText = readFileSync(path.join(rootDir, planPath), "utf8");
  const validationStatusText = readFileSync(path.join(rootDir, validationStatusPath), "utf8");
  const releaseGateResult = evaluateV1ReleaseGateFromFiles(rootDir);
  return evaluateV1PlanStatusSnapshot({ planText, validationStatusText, releaseGateResult });
}

function printResult(result) {
  const lines = [
    "# V1 Plan Status Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("## Open Critical Plan Items");
  lines.push("");
  if (result.openItems.length === 0) {
    lines.push("- None.");
  } else {
    for (const item of result.openItems) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("");
  lines.push("Note: PASS means the launch plan checklist is consistent with current V1 Go/No-Go evidence. It does not prove business UAT or signoff completion.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateFromFiles({ rootDir });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
