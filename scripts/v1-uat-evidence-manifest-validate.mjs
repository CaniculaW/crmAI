#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED_EVIDENCE_IDS = [
  "ENV-EVIDENCE",
  ...Array.from({ length: 6 }, (_, index) => `PRE-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 5 }, (_, index) => `SMK-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`),
  "DEF-REGISTER",
  "DEF-P0",
  "DEF-P1",
  "SIGNOFF-REGISTER",
  "SIGNOFF-SALES",
  "SIGNOFF-MANAGER",
  "SIGNOFF-PRODUCT",
  "SIGNOFF-TEST",
  "SIGNOFF-DEV",
  "SIGNOFF-PM",
  "GO-NOGO"
];

function tableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function hasPlaceholder(value) {
  return /待补充|待填写|待执行|待确认|待签署|TBD|TODO/i.test(value);
}

function hasSecretMaterial(value) {
  return /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization)\s*[:=]/i.test(value);
}

function isNamedOwner(value) {
  return isConcreteReference(value)
    && !/(Owner|负责人|验收人|测试|研发|产品|项目|销售|管理|运维|QA|Dev|PM|Manager|Product|Sales|Test|Frontend|Backend|DevOps)/i.test(value);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function findRow(rows, evidenceId) {
  return rows.find((row) => row[0] === evidenceId);
}

function isConcreteReference(value) {
  return Boolean(value) && !hasPlaceholder(value) && !/^[-—无]+$/.test(value);
}

function evidenceReferenceTokens(value) {
  return String(value ?? "")
    .replace(/`/g, "")
    .split(/[,\s;，；]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isRetainedEvidenceReference(value) {
  return isConcreteReference(value) && evidenceReferenceTokens(value).some((token) =>
    token.startsWith("docs/") || /^https?:\/\//i.test(token)
  );
}

function extractDecision(markdown) {
  const match = markdown.match(/Decision:\s*(Conditional Go|No-Go|Go)/i);
  return match?.[1] ?? "";
}

export function evaluateUatEvidenceManifest(markdown) {
  const rows = tableRows(markdown);
  const decision = extractDecision(markdown);
  const checks = [];

  const missingItems = REQUIRED_EVIDENCE_IDS.filter((id) => !findRow(rows, id));
  checks.push(makeCheck(
    "required-items",
    missingItems.length === 0,
    missingItems.length === 0
      ? "Manifest contains every required PRE, SMK, UAT, defect, signoff, and Go/No-Go evidence item."
      : `Missing evidence items: ${missingItems.join(", ")}`
  ));

  const incompleteItems = REQUIRED_EVIDENCE_IDS.filter((id) => findRow(rows, id)?.[3] !== "PASS");
  checks.push(makeCheck(
    "evidence-complete",
    incompleteItems.length === 0,
    incompleteItems.length === 0
      ? "All required evidence rows are marked PASS."
      : `Evidence rows not marked PASS: ${incompleteItems.join(", ")}`
  ));

  const passRowsWithoutEvidence = rows
    .filter((row) => row[3] === "PASS" && !isConcreteReference(row[4] ?? ""))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "evidence-references",
    passRowsWithoutEvidence.length === 0,
    passRowsWithoutEvidence.length === 0
      ? "All PASS evidence rows include concrete evidence references."
      : `PASS rows missing concrete evidence references: ${passRowsWithoutEvidence.join(", ")}`
  ));

  const unretainedEvidenceRows = rows
    .filter((row) => row[3] === "PASS" && isConcreteReference(row[4]) && !isRetainedEvidenceReference(row[4]))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "evidence-references-retained",
    unretainedEvidenceRows.length === 0,
    unretainedEvidenceRows.length === 0
      ? "All PASS evidence references point to retained docs or external URLs."
      : `PASS evidence references are not retained: ${unretainedEvidenceRows.join(", ")}`
  ));

  const invalidPassOwnerRows = rows
    .filter((row) => row[3] === "PASS" && !isNamedOwner(row[2] ?? ""))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "pass-owner-name-format",
    invalidPassOwnerRows.length === 0,
    invalidPassOwnerRows.length === 0
      ? "All PASS evidence owners are named people rather than role labels."
      : `PASS evidence owners use role labels instead of named people: ${invalidPassOwnerRows.join(", ")}`
  ));

  checks.push(makeCheck(
    "no-secret-material",
    !hasSecretMaterial(markdown),
    hasSecretMaterial(markdown)
      ? "Manifest contains secret-like material and must be sanitized."
      : "Manifest does not contain secret-like material."
  ));

  checks.push(makeCheck(
    "go-decision",
    decision === "Go",
    decision === "Go"
      ? "Manifest decision is Go."
      : `Manifest decision is ${decision || "MISSING"}; V1 validation requires Go.`
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    passed,
    failed,
    checks,
    unretainedEvidenceRows,
    invalidPassOwnerRows
  };
}

function printResult(result) {
  const lines = [
    "# V1 UAT Evidence Manifest Validation",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    `Decision: ${result.decision || "MISSING"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  console.log(lines.join("\n"));
}

function printUsage() {
  console.error("Usage: node scripts/v1-uat-evidence-manifest-validate.mjs <v1-uat-evidence-manifest.md>");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    printUsage();
    process.exitCode = 1;
  } else {
    const result = evaluateUatEvidenceManifest(readFileSync(manifestPath, "utf8"));
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
