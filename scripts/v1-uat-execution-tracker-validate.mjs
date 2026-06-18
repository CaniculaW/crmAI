#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED_ROLES = [
  "销售侧验收人",
  "管理侧验收人",
  "产品负责人",
  "测试负责人",
  "研发负责人",
  "项目负责人"
];

const REQUIRED_PRE_CHECKS = Array.from(
  { length: 6 },
  (_, index) => `PRE-${String(index + 1).padStart(3, "0")}`
);

const REQUIRED_SMOKE_CHECKS = Array.from(
  { length: 5 },
  (_, index) => `SMK-${String(index + 1).padStart(3, "0")}`
);

const REQUIRED_UAT_CASES = Array.from(
  { length: 10 },
  (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`
);

const REQUIRED_GATES = [
  "UAT证据包一致性",
  "UAT缺陷台账一致性",
  "V1最终放行门禁",
  "项目签署"
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
  return /待填写|待执行|待确认|待项目指定|待测试侧汇总|通过 \/ 不通过|同意 \/ 不同意/.test(value);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function findRow(rows, firstCell) {
  return rows.find((row) => row[0] === firstCell);
}

function findRowContaining(rows, needle) {
  return rows.find((row) => row.some((cell) => cell.includes(needle)));
}

function isConcreteEvidence(value) {
  return Boolean(value) && !hasPlaceholder(value) && !/证据要求|截图、命令输出、缺陷单或会议纪要之一/.test(value);
}

function extractDecision(markdown) {
  const match = markdown.match(/当前结论：\s*(Conditional Go|No-Go|Go)/);
  return match?.[1] ?? "";
}

function rowPassedWithEvidence(row, statusIndex, evidenceIndex) {
  return row?.[statusIndex] === "通过" && isConcreteEvidence(row?.[evidenceIndex] ?? "");
}

function defectClosed(row) {
  const status = row?.[2] ?? "";
  const evidence = row?.[3] ?? "";
  return (/0\s*未关闭|已关闭|无未关闭/.test(status)) && isConcreteEvidence(evidence);
}

export function evaluateUatExecutionTracker(markdown) {
  const rows = tableRows(markdown);
  const decision = extractDecision(markdown);
  const checks = [];

  const missingItems = [
    ...REQUIRED_ROLES,
    ...REQUIRED_PRE_CHECKS,
    ...REQUIRED_SMOKE_CHECKS,
    ...REQUIRED_UAT_CASES,
    ...REQUIRED_GATES
  ].filter((item) => !findRow(rows, item) && !findRowContaining(rows, item));

  checks.push(makeCheck(
    "required-items",
    missingItems.length === 0,
    missingItems.length === 0
      ? "Tracker contains all required roles, pre-checks, smoke checks, UAT cases, and release gates."
      : `Missing tracker items: ${missingItems.join(", ")}`
  ));

  const incompleteRoles = REQUIRED_ROLES.filter((role) => {
    const row = findRow(rows, role);
    const owner = row?.[1] ?? "";
    const status = row?.[3] ?? "";
    return !row || hasPlaceholder(owner) || hasPlaceholder(status) || !owner || !status;
  });
  checks.push(makeCheck(
    "roles-assigned",
    incompleteRoles.length === 0,
    incompleteRoles.length === 0
      ? "All signoff roles have named owners and non-placeholder statuses."
      : `Roles pending assignment or status: ${incompleteRoles.join(", ")}`
  ));

  const incompletePreChecks = REQUIRED_PRE_CHECKS.filter((id) => {
    const row = findRow(rows, id);
    return !rowPassedWithEvidence(row, 4, 3);
  });
  checks.push(makeCheck(
    "pre-checks",
    incompletePreChecks.length === 0,
    incompletePreChecks.length === 0
      ? "PRE-001 through PRE-006 are passed with concrete evidence."
      : `Incomplete PRE checks: ${incompletePreChecks.join(", ")}`
  ));

  const incompleteSmokeChecks = REQUIRED_SMOKE_CHECKS.filter((id) => {
    const row = findRow(rows, id);
    return !rowPassedWithEvidence(row, 4, 3);
  });
  checks.push(makeCheck(
    "smoke-checks",
    incompleteSmokeChecks.length === 0,
    incompleteSmokeChecks.length === 0
      ? "SMK-001 through SMK-005 are passed with concrete evidence."
      : `Incomplete SMK checks: ${incompleteSmokeChecks.join(", ")}`
  ));

  const incompleteUatCases = REQUIRED_UAT_CASES.filter((id) => {
    const row = findRow(rows, id);
    const owner = row?.[2] ?? "";
    return !row || row[5] !== "通过" || hasPlaceholder(owner) || !isConcreteEvidence(row[4] ?? "");
  });
  checks.push(makeCheck(
    "uat-cases",
    incompleteUatCases.length === 0,
    incompleteUatCases.length === 0
      ? "UAT-001 through UAT-010 are passed with owner and concrete evidence."
      : `Incomplete UAT cases: ${incompleteUatCases.join(", ")}`
  ));

  const p0 = findRow(rows, "P0 / S1 阻断");
  const p1 = findRow(rows, "P1 / S2 严重");
  checks.push(makeCheck(
    "p0-p1-defects",
    defectClosed(p0) && defectClosed(p1),
    "P0/S1 and P1/S2 defect rows must show no open defects and concrete evidence."
  ));

  const incompleteGates = REQUIRED_GATES.filter((gate) => {
    const row = findRow(rows, gate);
    const status = row?.[3] ?? "";
    if (!row) {
      return true;
    }
    return gate === "项目签署" ? status !== "已完成" : status !== "PASS";
  });
  checks.push(makeCheck(
    "release-gates",
    incompleteGates.length === 0,
    incompleteGates.length === 0
      ? "Evidence-pack validator, defect-register validator, final release gate, and project signoff are complete."
      : `Incomplete release gates: ${incompleteGates.join(", ")}`
  ));

  checks.push(makeCheck(
    "go-decision",
    decision === "Go",
    decision === "Go"
      ? "Tracker conclusion is Go."
      : `Tracker conclusion is ${decision || "MISSING"}; V1 validation requires Go.`
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    passed,
    failed,
    checks
  };
}

function printResult(result) {
  const lines = [
    "# V1 UAT Execution Tracker Validation",
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
  console.error("Usage: node scripts/v1-uat-execution-tracker-validate.mjs <crm-v1-uat-execution-tracker.md>");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const trackerPath = process.argv[2];
  if (!trackerPath) {
    printUsage();
    process.exitCode = 1;
  } else {
    const result = evaluateUatExecutionTracker(readFileSync(trackerPath, "utf8"));
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
