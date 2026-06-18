#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED_UAT_CASES = Array.from(
  { length: 10 },
  (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`
);

const REQUIRED_AUTOMATION_COMMANDS = [
  "mvn test",
  "mvn verify -Ppostgres-it",
  "npm test",
  "npm run build",
  "npm run smoke:v1:browser",
  "/api/bootstrap Smoke"
];

const REQUIRED_ENVIRONMENT_CHECKS = [
  "前端登录页可访问",
  "后端健康检查",
  "数据库迁移",
  "管理员账号",
  "销售个人账号",
  "销售负责人账号",
  "权限样本账号"
];

const REQUIRED_SIGNOFF_ROLES = [
  "销售侧验收人",
  "管理侧验收人",
  "产品负责人",
  "测试负责人",
  "研发负责人",
  "项目负责人"
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
  return /待填写|待执行|通过 \/ 不通过|是 \/ 否|同意 \/ 不同意/.test(value);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function findRow(rows, firstCell) {
  return rows.find((row) => row[0] === firstCell);
}

function findLastRow(rows, firstCell) {
  return rows.findLast((row) => row[0] === firstCell);
}

function findRowContaining(rows, needle) {
  return rows.find((row) => row.some((cell) => cell.includes(needle)));
}

function rowPasses(row, resultIndex) {
  return row?.[resultIndex] === "通过";
}

function parseOpenDefectCount(rows, severityLabel) {
  const row = findRow(rows, severityLabel);
  if (!row) {
    return Number.NaN;
  }
  const parsed = Number.parseInt(row[2], 10);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function extractDecision(markdown) {
  const match = markdown.match(/选择：\s*(Go|Conditional Go|No-Go)/);
  return match?.[1] ?? "";
}

export function evaluateUatEvidencePack(markdown) {
  const rows = tableRows(markdown);
  const checks = [];
  const decision = extractDecision(markdown);

  checks.push(makeCheck(
    "no-placeholders",
    !hasPlaceholder(markdown),
    "Evidence pack has no draft placeholders."
  ));

  checks.push(makeCheck(
    "basic-info-complete",
    ["验收日期", "测试环境名称", "前端访问地址", "后端 API 地址", "Git 提交号", "候选版本"].every((field) => {
      const row = findRow(rows, field);
      return row?.[1] && !hasPlaceholder(row[1]);
    }),
    "Basic environment, version, and commit fields are complete."
  ));

  const missingAutomation = REQUIRED_AUTOMATION_COMMANDS.filter((command) => {
    const row = findRowContaining(rows, command);
    return !row || !rowPasses(row, 2) || !row[3] || hasPlaceholder(row[3]);
  });
  checks.push(makeCheck(
    "automation-results",
    missingAutomation.length === 0,
    missingAutomation.length === 0
      ? "Required automation and smoke results are marked passed with evidence."
      : `Missing passed automation evidence: ${missingAutomation.join(", ")}`
  ));

  const missingEnvironment = REQUIRED_ENVIRONMENT_CHECKS.filter((item) => {
    const row = findRow(rows, item);
    return !row || !rowPasses(row, 2) || !row[3] || hasPlaceholder(row[3]);
  });
  checks.push(makeCheck(
    "environment-results",
    missingEnvironment.length === 0,
    missingEnvironment.length === 0
      ? "Required environment and account checks are marked passed with evidence."
      : `Missing passed environment evidence: ${missingEnvironment.join(", ")}`
  ));

  const missingUatCases = REQUIRED_UAT_CASES.filter((id) => {
    const row = findRow(rows, id);
    return !row || row[3] !== "通过" || !row[2] || !row[4] || hasPlaceholder(row.join(" "));
  });
  checks.push(makeCheck(
    "uat-business-cases",
    missingUatCases.length === 0,
    missingUatCases.length === 0
      ? "UAT-001 through UAT-010 are marked passed with owner and evidence."
      : `Missing passed UAT evidence: ${missingUatCases.join(", ")}`
  ));

  const p0Open = parseOpenDefectCount(rows, "P0 / S1 阻断");
  checks.push(makeCheck(
    "p0-defects",
    p0Open === 0,
    Number.isNaN(p0Open)
      ? "P0/S1 defect row is missing or invalid."
      : `P0/S1 open defect count is ${p0Open}.`
  ));

  const p1Open = parseOpenDefectCount(rows, "P1 / S2 严重");
  checks.push(makeCheck(
    "p1-defects",
    p1Open === 0 || decision === "Conditional Go",
    Number.isNaN(p1Open)
      ? "P1/S2 defect row is missing or invalid."
      : `P1/S2 open defect count is ${p1Open}.`
  ));

  const goCriteriaRows = [
    "自动化验证",
    "测试环境 Smoke",
    "P0 缺陷",
    "P1 缺陷",
    "业务验收",
    "上线风险"
  ];
  const unmetGoCriteria = goCriteriaRows.filter((item) => findRow(rows, item)?.[3] !== "是");
  checks.push(makeCheck(
    "go-criteria",
    unmetGoCriteria.length === 0,
    unmetGoCriteria.length === 0
      ? "All Go/No-Go criteria are marked satisfied."
      : `Unsatisfied Go/No-Go criteria: ${unmetGoCriteria.join(", ")}`
  ));

  const incompleteSignoff = REQUIRED_SIGNOFF_ROLES.filter((role) => {
    const row = findLastRow(rows, role);
    const accepted = role === "项目负责人" ? row?.[2] === decision : row?.[2] === "同意";
    return !row || !row[1] || !row[3] || hasPlaceholder(row.join(" ")) || !accepted;
  });
  checks.push(makeCheck(
    "signoff-complete",
    incompleteSignoff.length === 0,
    incompleteSignoff.length === 0
      ? "Required business, product, test, development, and project signoffs are complete."
      : `Incomplete signoff rows: ${incompleteSignoff.join(", ")}`
  ));

  checks.push(makeCheck(
    "go-decision-valid",
    decision === "Go" || decision === "Conditional Go" || decision === "No-Go",
    "Go/No-Go decision is explicit."
  ));

  if (decision === "Go") {
    const hardGateFailures = checks.filter((check) => !check.ok && check.id !== "go-decision-valid");
    checks.push(makeCheck(
      "go-hard-gates",
      hardGateFailures.length === 0,
      hardGateFailures.length === 0
        ? "Go decision is consistent with all hard gates."
        : `Go decision is blocked by: ${hardGateFailures.map((check) => check.id).join(", ")}`
    ));
  }

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
    "# V1 UAT Evidence Pack Validation",
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
  console.error("Usage: node scripts/v1-uat-evidence-pack-validate.mjs <crm-v1-uat-evidence-pack.md>");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const evidencePath = process.argv[2];
  if (!evidencePath) {
    printUsage();
    process.exitCode = 1;
  } else {
    const result = evaluateUatEvidencePack(readFileSync(evidencePath, "utf8"));
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
