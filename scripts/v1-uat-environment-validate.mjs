#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED_SUMMARY_ITEMS = [
  "测试环境名称",
  "前端访问地址",
  "后端 API 地址",
  "候选版本",
  "Git 提交号"
];

const REQUIRED_ENVIRONMENT_CHECKS = [
  "ENV-001",
  "ENV-002",
  "ENV-003",
  "ENV-004",
  "ENV-005",
  "ENV-006",
  "ENV-007",
  "ENV-008"
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
  return /待补充|待填写|待执行|待确认|PENDING|TBD|TODO/i.test(value);
}

function hasSecretMaterial(value) {
  return /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization)\s*[:=]/i.test(value);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function findRow(rows, firstCell) {
  return rows.find((row) => row[0] === firstCell);
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value) && !/^[-—无]+$/.test(value);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isGitSha(value) {
  return /^[a-f0-9]{40}$/i.test(value ?? "");
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

function environmentCheckRows(rows) {
  return rows.filter((row) => /^ENV-\d{3}$/.test(row[0]));
}

export function evaluateUatEnvironmentEvidence(markdown) {
  const rows = tableRows(markdown);
  const decision = extractDecision(markdown);
  const checks = [];

  const invalidSummaryItems = REQUIRED_SUMMARY_ITEMS.filter((item) => {
    const row = findRow(rows, item);
    return !row || !isConcrete(row[1] ?? "");
  });
  checks.push(makeCheck(
    "environment-summary",
    invalidSummaryItems.length === 0,
    invalidSummaryItems.length === 0
      ? "Named UAT environment summary contains environment name, URLs, release candidate, and commit."
      : `Invalid environment summary items: ${invalidSummaryItems.join(", ")}`
  ));

  const summaryFormatRules = [
    { item: "前端访问地址", valid: isHttpUrl },
    { item: "后端 API 地址", valid: isHttpUrl },
    { item: "Git 提交号", valid: isGitSha }
  ];
  const invalidSummaryFormats = summaryFormatRules
    .filter(({ item, valid }) => {
      const row = findRow(rows, item);
      const value = row?.[1] ?? "";
      return isConcrete(value) && !valid(value);
    })
    .map(({ item }) => item);
  checks.push(makeCheck(
    "environment-summary-format",
    invalidSummaryFormats.length === 0,
    invalidSummaryFormats.length === 0
      ? "Environment URLs are http(s) and Git commit is a 40-character SHA."
      : `Invalid environment summary formats: ${invalidSummaryFormats.join(", ")}`
  ));

  const envRows = environmentCheckRows(rows);
  const missingChecks = REQUIRED_ENVIRONMENT_CHECKS.filter((id) => !findRow(rows, id));
  checks.push(makeCheck(
    "required-checks",
    missingChecks.length === 0,
    missingChecks.length === 0
      ? "Environment evidence contains every required ENV-001 through ENV-008 check."
      : `Missing environment checks: ${missingChecks.join(", ")}`
  ));

  const incompleteChecks = REQUIRED_ENVIRONMENT_CHECKS.filter((id) => {
    const row = findRow(rows, id);
    return !row || row[2] !== "PASS" || !isConcrete(row[3] ?? "") || !isConcrete(row[4] ?? "");
  });
  const placeholderRows = envRows
    .filter((row) => row.some((cell) => hasPlaceholder(cell)))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "environment-checks",
    incompleteChecks.length === 0 && placeholderRows.length === 0,
    incompleteChecks.length === 0 && placeholderRows.length === 0
      ? "All required environment checks are PASS with concrete evidence and owners."
      : `Incomplete environment checks: ${[...new Set([...incompleteChecks, ...placeholderRows])].join(", ")}`
  ));

  const unretainedEnvironmentEvidenceChecks = envRows
    .filter((row) => row[2] === "PASS" && isConcrete(row[3]) && !isRetainedEvidenceReference(row[3]))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "environment-evidence-retained",
    unretainedEnvironmentEvidenceChecks.length === 0,
    unretainedEnvironmentEvidenceChecks.length === 0
      ? "PASS environment evidence references point to retained artifacts or external URLs."
      : `PASS environment checks have unretained evidence references: ${unretainedEnvironmentEvidenceChecks.join(", ")}`
  ));

  checks.push(makeCheck(
    "no-secret-material",
    !hasSecretMaterial(markdown),
    hasSecretMaterial(markdown)
      ? "Environment evidence contains secret-like material and must be sanitized."
      : "Environment evidence does not contain secret-like material."
  ));

  checks.push(makeCheck(
    "go-decision",
    decision === "Go",
    decision === "Go"
      ? "Environment evidence decision is Go."
      : `Environment evidence decision is ${decision || "MISSING"}; V1 validation requires Go.`
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    unretainedEnvironmentEvidenceChecks,
    invalidSummaryFormats,
    passed,
    failed,
    checks
  };
}

function printResult(result) {
  const lines = [
    "# V1 UAT Environment Evidence Validation",
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
  console.error("Usage: node scripts/v1-uat-environment-validate.mjs <v1-uat-environment-evidence.md>");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const evidencePath = process.argv[2];
  if (!evidencePath) {
    printUsage();
    process.exitCode = 1;
  } else {
    const result = evaluateUatEnvironmentEvidence(readFileSync(evidencePath, "utf8"));
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
