#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateV1ReleaseGateFromFiles } from "./v1-release-gate.mjs";

const DEFAULT_TRACEABILITY_PATH = "docs/testing/crm-v1-validation-traceability.md";
const REQUIRED_ACCEPTANCE_IDS = Array.from(
  { length: 17 },
  (_, index) => `AC-${String(index + 1).padStart(3, "0")}`
);

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function traceabilityRows(traceabilityText) {
  return traceabilityText
    .split("\n")
    .filter((line) => /^\|\s*AC-\d{3}\b/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      const id = cells[0]?.match(/AC-\d{3}/)?.[0] ?? "";
      return {
        id,
        item: cells[0] ?? "",
        engineeringStatus: cells[1] ?? "",
        evidence: cells[2] ?? "",
        remainingAction: cells[3] ?? ""
      };
    });
}

function summaryCount(traceabilityText, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = traceabilityText.match(new RegExp(`^\\|\\s*${escapedLabel}\\s*\\|\\s*(\\d+)\\s*\\|`, "m"));
  return match ? Number.parseInt(match[1], 10) : null;
}

function isConcreteEvidence(value) {
  return Boolean(value)
    && !/待补充|待确认|TBD|TODO|无|N\/A/i.test(value)
    && /`[^`]+`|Test|Smoke|验证|证据/.test(value);
}

function claimsProjectAccepted(traceabilityText) {
  return traceabilityText
    .split("\n")
    .some((line) => /项目\s*V1\s*验收通过|V1\s*项目验收通过|可正式发布/.test(line)
      && !/仍需|待|不能作为|若目标口径|需要/.test(line));
}

export function evaluateV1TraceabilitySnapshot({
  traceabilityText,
  releaseGateResult
}) {
  const rows = traceabilityRows(traceabilityText);
  const ids = rows.map((row) => row.id);
  const missingAcceptanceIds = REQUIRED_ACCEPTANCE_IDS.filter((id) => !ids.includes(id));
  const duplicateAcceptanceIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const incompleteEngineeringRows = rows.filter((row) => row.engineeringStatus !== "研发验证通过");
  const weakEvidenceRows = rows.filter((row) => !isConcreteEvidence(row.evidence));
  const missingBusinessPendingRows = rows.filter((row) => !/业务|环境|待|确认|验收|复核|执行/.test(row.remainingAction));
  const engineeringSummary = summaryCount(traceabilityText, "研发验证通过");
  const businessPendingSummary = summaryCount(traceabilityText, "业务待验收");
  const releaseGateIsGo = releaseGateResult.ok === true && releaseGateResult.decision === "Go";
  const projectAcceptedClaim = claimsProjectAccepted(traceabilityText);

  const checks = [
    makeCheck(
      "traceability-covers-acceptance-items",
      missingAcceptanceIds.length === 0 && duplicateAcceptanceIds.length === 0,
      missingAcceptanceIds.length === 0 && duplicateAcceptanceIds.length === 0
        ? "Traceability matrix covers AC-001 through AC-017 exactly once."
        : `Traceability matrix issue. Missing: ${missingAcceptanceIds.join(", ") || "none"}; duplicates: ${duplicateAcceptanceIds.join(", ") || "none"}.`
    ),
    makeCheck(
      "traceability-engineering-evidence",
      incompleteEngineeringRows.length === 0 && weakEvidenceRows.length === 0,
      incompleteEngineeringRows.length === 0 && weakEvidenceRows.length === 0
        ? "Every acceptance row has engineering pass status and concrete evidence."
        : `Traceability rows need stronger engineering evidence: ${[...incompleteEngineeringRows, ...weakEvidenceRows].map((row) => row.id).join(", ")}.`
    ),
    makeCheck(
      "traceability-business-pending-visible",
      missingBusinessPendingRows.length === 0,
      missingBusinessPendingRows.length === 0
        ? "Business or environment validation remains visible for every acceptance item."
        : `Traceability rows do not show remaining business/environment validation: ${missingBusinessPendingRows.map((row) => row.id).join(", ")}.`
    ),
    makeCheck(
      "traceability-summary-counts",
      engineeringSummary === REQUIRED_ACCEPTANCE_IDS.length && businessPendingSummary === REQUIRED_ACCEPTANCE_IDS.length,
      engineeringSummary === REQUIRED_ACCEPTANCE_IDS.length && businessPendingSummary === REQUIRED_ACCEPTANCE_IDS.length
        ? "Traceability summary counts match AC-001 through AC-017."
        : `Traceability summary counts mismatch. Engineering: ${engineeringSummary ?? "missing"}; business pending: ${businessPendingSummary ?? "missing"}.`
    ),
    makeCheck(
      "traceability-release-alignment",
      releaseGateIsGo || !projectAcceptedClaim,
      releaseGateIsGo || !projectAcceptedClaim
        ? "Traceability conclusion is aligned with the current release gate decision."
        : "Traceability claims project acceptance or formal release while the V1 release gate is not Go."
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
    missingAcceptanceIds,
    duplicateAcceptanceIds
  };
}

function evaluateFromFiles({
  rootDir = process.cwd(),
  traceabilityPath = DEFAULT_TRACEABILITY_PATH
} = {}) {
  const traceabilityText = readFileSync(path.join(rootDir, traceabilityPath), "utf8");
  const releaseGateResult = evaluateV1ReleaseGateFromFiles(rootDir);
  return evaluateV1TraceabilitySnapshot({ traceabilityText, releaseGateResult });
}

function printResult(result) {
  const lines = [
    "# V1 Traceability Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push(`Traceability rows: ${result.rows.length}`);
  lines.push(`Missing acceptance items: ${result.missingAcceptanceIds.join(", ") || "none"}`);
  lines.push("");
  lines.push("Note: PASS means the traceability matrix covers all V1 acceptance items, keeps engineering evidence explicit, and stays aligned with the current release gate. It does not replace real business UAT signoff.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateFromFiles({ rootDir });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
