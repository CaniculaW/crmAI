#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateV1ReleaseGateFromFiles } from "./v1-release-gate.mjs";

const DEFAULT_CHECKLIST_PATH = "docs/testing/crm-v1-acceptance-checklist.md";
const REQUIRED_ACCEPTANCE_IDS = Array.from(
  { length: 17 },
  (_, index) => `AC-${String(index + 1).padStart(3, "0")}`
);

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function acceptanceRows(checklistText) {
  return checklistText
    .split("\n")
    .filter((line) => /^\|\s*AC-\d{3}\s*\|/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return {
        id: cells[0],
        title: cells[1],
        status: cells[4] ?? ""
      };
    });
}

function businessAccepted(status) {
  return /业务验收通过|业务已验收|已业务验收|业务确认通过/.test(status)
    && !/待业务验收/.test(status);
}

function hasPendingBusinessAcceptance(status) {
  return /待业务验收/.test(status);
}

export function evaluateV1AcceptanceChecklistSnapshot({
  checklistText,
  releaseGateResult
}) {
  const rows = acceptanceRows(checklistText);
  const ids = rows.map((row) => row.id);
  const missingIds = REQUIRED_ACCEPTANCE_IDS.filter((id) => !ids.includes(id));
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const businessAcceptedRows = rows.filter((row) => businessAccepted(row.status));
  const pendingRows = rows.filter((row) => hasPendingBusinessAcceptance(row.status));
  const releaseGateIsGo = releaseGateResult.ok === true && releaseGateResult.decision === "Go";
  const allBusinessAccepted = rows.length === REQUIRED_ACCEPTANCE_IDS.length
    && businessAcceptedRows.length === REQUIRED_ACCEPTANCE_IDS.length;

  const checks = [
    makeCheck(
      "acceptance-items-complete",
      missingIds.length === 0 && duplicateIds.length === 0,
      missingIds.length === 0 && duplicateIds.length === 0
        ? "Acceptance checklist covers AC-001 through AC-017 exactly once."
        : `Acceptance checklist issue. Missing: ${missingIds.join(", ") || "none"}; duplicates: ${duplicateIds.join(", ") || "none"}.`
    ),
    makeCheck(
      "acceptance-status-release-alignment",
      releaseGateIsGo || !allBusinessAccepted,
      releaseGateIsGo || !allBusinessAccepted
        ? "Acceptance checklist status is aligned with the current release gate decision."
        : "All acceptance items are marked business accepted, but the V1 release gate is not Go."
    ),
    makeCheck(
      "pending-acceptance-visible",
      releaseGateIsGo || pendingRows.length > 0,
      releaseGateIsGo || pendingRows.length > 0
        ? "Pending business acceptance remains visible while V1 is not Go."
        : "V1 is not Go, but the acceptance checklist no longer shows pending business acceptance."
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
    pendingRows,
    businessAcceptedRows
  };
}

function evaluateFromFiles({
  rootDir = process.cwd(),
  checklistPath = DEFAULT_CHECKLIST_PATH
} = {}) {
  const checklistText = readFileSync(path.join(rootDir, checklistPath), "utf8");
  const releaseGateResult = evaluateV1ReleaseGateFromFiles(rootDir);
  return evaluateV1AcceptanceChecklistSnapshot({ checklistText, releaseGateResult });
}

function printResult(result) {
  const lines = [
    "# V1 Acceptance Checklist Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push(`Pending business acceptance rows: ${result.pendingRows.length}`);
  lines.push(`Business accepted rows: ${result.businessAcceptedRows.length}`);
  lines.push("");
  lines.push("Note: PASS means the acceptance checklist is structurally complete and its business-acceptance status is consistent with the current V1 release gate. It does not replace real business UAT signoff.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateFromFiles({ rootDir });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
