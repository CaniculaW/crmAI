#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_RUNBOOK_PATH = "docs/testing/crm-v1-test-environment-validation-runbook.md";
const REQUIRED_UAT_IDS = Array.from(
  { length: 10 },
  (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`
);
const REQUIRED_ACCEPTANCE_IDS = Array.from(
  { length: 17 },
  (_, index) => `AC-${String(index + 1).padStart(3, "0")}`
);

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function uatRows(runbookText) {
  return runbookText
    .split("\n")
    .filter((line) => /^\|\s*UAT-\d{3}\s*\|/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return {
        id: cells[0],
        scenario: cells[1],
        acceptanceIds: Array.from(new Set((line.match(/AC-\d{3}/g) ?? [])))
      };
    });
}

export function evaluateV1UatCoverageSnapshot({ runbookText }) {
  const rows = uatRows(runbookText);
  const uatIds = rows.map((row) => row.id);
  const missingUatIds = REQUIRED_UAT_IDS.filter((id) => !uatIds.includes(id));
  const duplicateUatIds = uatIds.filter((id, index) => uatIds.indexOf(id) !== index);
  const coveredAcceptanceIds = Array.from(new Set(rows.flatMap((row) => row.acceptanceIds))).sort();
  const missingAcceptanceIds = REQUIRED_ACCEPTANCE_IDS.filter((id) => !coveredAcceptanceIds.includes(id));

  const checks = [
    makeCheck(
      "uat-cases-complete",
      missingUatIds.length === 0 && duplicateUatIds.length === 0,
      missingUatIds.length === 0 && duplicateUatIds.length === 0
        ? "UAT runbook covers UAT-001 through UAT-010 exactly once."
        : `UAT runbook issue. Missing: ${missingUatIds.join(", ") || "none"}; duplicates: ${duplicateUatIds.join(", ") || "none"}.`
    ),
    makeCheck(
      "uat-covers-all-acceptance-items",
      missingAcceptanceIds.length === 0,
      missingAcceptanceIds.length === 0
        ? "UAT case mapping covers AC-001 through AC-017."
        : `UAT case mapping is missing acceptance items: ${missingAcceptanceIds.join(", ")}.`
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    passed,
    failed,
    checks,
    rows,
    coveredAcceptanceIds,
    missingAcceptanceIds
  };
}

function evaluateFromFiles({
  rootDir = process.cwd(),
  runbookPath = DEFAULT_RUNBOOK_PATH
} = {}) {
  const runbookText = readFileSync(path.join(rootDir, runbookPath), "utf8");
  return evaluateV1UatCoverageSnapshot({ runbookText });
}

function printResult(result) {
  const lines = [
    "# V1 UAT Coverage Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push(`Covered acceptance items: ${result.coveredAcceptanceIds.length}`);
  lines.push(`Missing acceptance items: ${result.missingAcceptanceIds.join(", ") || "none"}`);
  lines.push("");
  lines.push("Note: PASS means every V1 acceptance item has at least one mapped UAT case in the execution runbook. It does not replace real business UAT evidence.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateFromFiles({ rootDir });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
