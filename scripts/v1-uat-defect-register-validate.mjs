#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED_SUMMARY_SEVERITIES = [
  "P0 / S1 阻断",
  "P1 / S2 严重"
];

const CLOSED_STATUSES = new Set(["CLOSED", "VERIFIED"]);

function tableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function hasPlaceholder(value) {
  return /待补充|待填写|待执行|待确认|待关闭|PENDING|TBD|TODO/i.test(value);
}

function hasSecretMaterial(value) {
  return /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization)\s*[:=]/i.test(value);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function parseInteger(value) {
  if (!/^\d+$/.test(value ?? "")) {
    return Number.NaN;
  }
  return Number.parseInt(value, 10);
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value) && !/^[-—无]+$/.test(value);
}

function evidenceReferenceTokens(value) {
  return String(value ?? "")
    .replace(/`/g, "")
    .split(/[,\s;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isRetainedEvidenceReference(value) {
  return isConcrete(value) && evidenceReferenceTokens(value).some((token) =>
    token.startsWith("docs/") || /^https?:\/\//i.test(token)
  );
}

function extractDecision(markdown) {
  const match = markdown.match(/Decision:\s*(Conditional Go|No-Go|Go)/i);
  return match?.[1] ?? "";
}

function summaryRows(rows) {
  return rows.filter((row) => REQUIRED_SUMMARY_SEVERITIES.includes(row[0]));
}

function defectRows(rows) {
  return rows.filter((row) => /^DEF-[A-Z0-9-]+$/.test(row[0]));
}

function isP0P1Severity(severity) {
  return REQUIRED_SUMMARY_SEVERITIES.includes(severity);
}

function rowClosed(row) {
  return CLOSED_STATUSES.has(row[3]);
}

function isTraceableSourceCase(value) {
  return /^(PRE|SMK|UAT)-\d{3}$/.test(value ?? "");
}

export function evaluateUatDefectRegister(markdown) {
  const rows = tableRows(markdown);
  const decision = extractDecision(markdown);
  const summaries = summaryRows(rows);
  const defects = defectRows(rows);
  const checks = [];

  const invalidSummaries = REQUIRED_SUMMARY_SEVERITIES.filter((severity) => {
    const row = summaries.find((candidate) => candidate[0] === severity);
    return !row
      || Number.isNaN(parseInteger(row[1]))
      || Number.isNaN(parseInteger(row[2]))
      || !isConcrete(row[3]);
  });
  checks.push(makeCheck(
    "p0-p1-summary",
    invalidSummaries.length === 0,
    invalidSummaries.length === 0
      ? "P0/S1 and P1/S2 summary rows contain numeric totals, numeric open counts, and closure evidence."
      : `Invalid P0/P1 summary rows: ${invalidSummaries.join(", ")}`
  ));

  const openP0P1 = summaries
    .filter((row) => isP0P1Severity(row[0]) && parseInteger(row[2]) > 0)
    .map((row) => `${row[0]} open=${row[2]}`);
  checks.push(makeCheck(
    "p0-p1-open-defects",
    openP0P1.length === 0,
    openP0P1.length === 0
      ? "P0/S1 and P1/S2 open defect counts are zero."
      : `Open P0/P1 defects remain: ${openP0P1.join(", ")}`
  ));

  const p0p1Defects = defects.filter((row) => isP0P1Severity(row[1]));
  const expectedDetailCounts = REQUIRED_SUMMARY_SEVERITIES.flatMap((severity) => {
    const row = summaries.find((candidate) => candidate[0] === severity);
    const total = parseInteger(row?.[1] ?? "");
    if (Number.isNaN(total)) {
      return [];
    }
    const actual = p0p1Defects.filter((defect) => defect[1] === severity).length;
    return actual === total ? [] : `${severity} expected=${total} actual=${actual}`;
  });
  const incompleteDetails = p0p1Defects
    .filter((row) => !rowClosed(row) || !isConcrete(row[4]) || !isConcrete(row[5]) || !isConcrete(row[7]))
    .map((row) => row[0]);
  const placeholderDetails = defects
    .filter((row) => row.some((cell) => hasPlaceholder(cell)))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "defect-details",
    expectedDetailCounts.length === 0 && incompleteDetails.length === 0 && placeholderDetails.length === 0,
    expectedDetailCounts.length === 0 && incompleteDetails.length === 0 && placeholderDetails.length === 0
      ? "P0/S1 and P1/S2 defect detail rows match summary counts and contain owner, resolution, and business decision."
      : `Incomplete defect details: ${[...expectedDetailCounts, ...incompleteDetails, ...placeholderDetails].join(", ")}`
  ));

  const invalidSourceCaseDefects = p0p1Defects
    .filter((row) => !isTraceableSourceCase(row[2]))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "defect-source-case-format",
    invalidSourceCaseDefects.length === 0,
    invalidSourceCaseDefects.length === 0
      ? "P0/S1 and P1/S2 defect source cases reference PRE, SMK, or UAT case IDs."
      : `P0/P1 defects have untraceable source cases: ${invalidSourceCaseDefects.join(", ")}`
  ));

  const missingRegression = p0p1Defects
    .filter((row) => rowClosed(row) && !isConcrete(row[6]))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "regression-evidence",
    missingRegression.length === 0,
    missingRegression.length === 0
      ? "Closed P0/S1 and P1/S2 defects include concrete regression evidence."
      : `Closed P0/P1 defects missing regression evidence: ${missingRegression.join(", ")}`
  ));

  const unretainedRegressionEvidenceDefects = p0p1Defects
    .filter((row) => rowClosed(row) && isConcrete(row[6]) && !isRetainedEvidenceReference(row[6]))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "defect-evidence-retained",
    unretainedRegressionEvidenceDefects.length === 0,
    unretainedRegressionEvidenceDefects.length === 0
      ? "Closed P0/S1 and P1/S2 regression evidence references point to retained artifacts or external URLs."
      : `Closed P0/P1 defects have unretained regression evidence references: ${unretainedRegressionEvidenceDefects.join(", ")}`
  ));

  checks.push(makeCheck(
    "no-secret-material",
    !hasSecretMaterial(markdown),
    hasSecretMaterial(markdown)
      ? "Defect register contains secret-like material and must be sanitized."
      : "Defect register does not contain secret-like material."
  ));

  checks.push(makeCheck(
    "go-decision",
    decision === "Go",
    decision === "Go"
      ? "Defect register decision is Go."
      : `Defect register decision is ${decision || "MISSING"}; V1 validation requires Go.`
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    invalidSourceCaseDefects,
    unretainedRegressionEvidenceDefects,
    passed,
    failed,
    checks
  };
}

function printResult(result) {
  const lines = [
    "# V1 UAT Defect Register Validation",
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
  console.error("Usage: node scripts/v1-uat-defect-register-validate.mjs <v1-uat-defect-register.md>");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const registerPath = process.argv[2];
  if (!registerPath) {
    printUsage();
    process.exitCode = 1;
  } else {
    const result = evaluateUatDefectRegister(readFileSync(registerPath, "utf8"));
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
