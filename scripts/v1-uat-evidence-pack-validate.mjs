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

const BASIC_OWNER_FIELDS = [
  "测试负责人",
  "产品负责人",
  "研发负责人",
  "销售侧验收人",
  "管理侧验收人"
];

function tableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function sectionMarkdown(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start === -1) {
    return "";
  }

  const rest = markdown.slice(start + heading.length);
  const nextHeading = rest.search(/\n##\s+\d+\./);
  return nextHeading === -1
    ? markdown.slice(start)
    : markdown.slice(start, start + heading.length + nextHeading);
}

function hasPlaceholder(value) {
  return /待填写|待执行|通过 \/ 不通过|是 \/ 否|同意 \/ 不同意/.test(value);
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value);
}

function isNamedOwner(value) {
  return isConcrete(value)
    && !/(Owner|负责人|验收人|测试|研发|产品|项目|销售|管理|运维|QA|Dev|PM|Manager|Product|Sales|Test|Frontend|Backend|DevOps)/i.test(value);
}

function evidenceReferenceTokens(value) {
  return String(value ?? "")
    .replace(/`/g, "")
    .split(/[\s,，;；]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isRetainedEvidenceReference(value) {
  return isConcrete(value) && evidenceReferenceTokens(value).some((token) => (
    token.startsWith("docs/") || /^https?:\/\//i.test(token)
  ));
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
  const basicRows = tableRows(sectionMarkdown(markdown, "## 1. 基本信息"));
  const checks = [];
  const decision = extractDecision(markdown);

  const hasDraftPlaceholders = hasPlaceholder(markdown);
  checks.push(makeCheck(
    "no-placeholders",
    !hasDraftPlaceholders,
    hasDraftPlaceholders
      ? "Evidence pack still contains draft placeholders."
      : "Evidence pack has no draft placeholders."
  ));

  checks.push(makeCheck(
    "basic-info-complete",
    ["验收日期", "测试环境名称", "前端访问地址", "后端 API 地址", "Git 提交号", "候选版本"].every((field) => {
      const row = findRow(basicRows, field);
      return row?.[1] && !hasPlaceholder(row[1]);
    }),
    "Basic environment, version, and commit fields are complete."
  ));

  const missingBasicOwnerRows = BASIC_OWNER_FIELDS
    .filter((field) => !isConcrete(findRow(basicRows, field)?.[1] ?? ""));
  checks.push(makeCheck(
    "basic-owners-complete",
    missingBasicOwnerRows.length === 0,
    missingBasicOwnerRows.length === 0
      ? "Basic evidence pack owner rows are complete."
      : `Missing basic evidence pack owners: ${missingBasicOwnerRows.join(", ")}`
  ));

  const invalidBasicOwnerRows = BASIC_OWNER_FIELDS
    .map((field) => findRow(basicRows, field))
    .filter((row) => isConcrete(row?.[1] ?? "") && !isNamedOwner(row[1]))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "basic-owner-name-format",
    invalidBasicOwnerRows.length === 0,
    invalidBasicOwnerRows.length === 0
      ? "Basic evidence pack owners are named people rather than role labels."
      : `Basic evidence pack owners use role labels instead of named people: ${invalidBasicOwnerRows.join(", ")}`
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

  const unretainedAutomationEvidence = REQUIRED_AUTOMATION_COMMANDS.filter((command) => {
    const row = findRowContaining(rows, command);
    return rowPasses(row, 2) && isConcrete(row?.[3] ?? "") && !isRetainedEvidenceReference(row[3]);
  });

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

  const unretainedEnvironmentEvidence = REQUIRED_ENVIRONMENT_CHECKS.filter((item) => {
    const row = findRow(rows, item);
    return rowPasses(row, 2) && isConcrete(row?.[3] ?? "") && !isRetainedEvidenceReference(row[3]);
  });

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

  const invalidUatCaseOwnerRows = REQUIRED_UAT_CASES
    .map((id) => findRow(rows, id))
    .filter((row) => row?.[3] === "通过" && isConcrete(row?.[2] ?? "") && !isNamedOwner(row[2]))
    .map((row) => row[0]);
  checks.push(makeCheck(
    "uat-case-owner-name-format",
    invalidUatCaseOwnerRows.length === 0,
    invalidUatCaseOwnerRows.length === 0
      ? "Passed UAT case owners are named people rather than role labels."
      : `Passed UAT case owners use role labels instead of named people: ${invalidUatCaseOwnerRows.join(", ")}`
  ));

  const unretainedUatEvidence = REQUIRED_UAT_CASES.filter((id) => {
    const row = findRow(rows, id);
    return row?.[3] === "通过" && isConcrete(row?.[4] ?? "") && !isRetainedEvidenceReference(row[4]);
  });

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

  const invalidSignoffOwnerRows = REQUIRED_SIGNOFF_ROLES
    .map((role) => findLastRow(rows, role))
    .filter((row) => {
      const role = row?.[0];
      const accepted = role === "项目负责人" ? row?.[2] === decision : row?.[2] === "同意";
      return accepted && isConcrete(row?.[1] ?? "") && !isNamedOwner(row[1]);
    })
    .map((row) => row[0]);
  checks.push(makeCheck(
    "signoff-owner-name-format",
    invalidSignoffOwnerRows.length === 0,
    invalidSignoffOwnerRows.length === 0
      ? "Approved signoff owners are named people rather than role labels."
      : `Approved signoff owners use role labels instead of named people: ${invalidSignoffOwnerRows.join(", ")}`
  ));

  const unretainedSignoffEvidence = REQUIRED_SIGNOFF_ROLES.filter((role) => {
    const row = findLastRow(rows, role);
    const accepted = role === "项目负责人" ? row?.[2] === decision : row?.[2] === "同意";
    return accepted && !isRetainedEvidenceReference(row?.[4] ?? "");
  });
  const unretainedEvidenceReferences = {
    automation: unretainedAutomationEvidence,
    environment: unretainedEnvironmentEvidence,
    uat: unretainedUatEvidence,
    signoff: unretainedSignoffEvidence
  };
  const unretainedEvidenceMessages = [
    unretainedAutomationEvidence.length === 0
      ? ""
      : `automation: ${unretainedAutomationEvidence.join(", ")}`,
    unretainedEnvironmentEvidence.length === 0
      ? ""
      : `environment: ${unretainedEnvironmentEvidence.join(", ")}`,
    unretainedUatEvidence.length === 0
      ? ""
      : `uat: ${unretainedUatEvidence.join(", ")}`,
    unretainedSignoffEvidence.length === 0
      ? ""
      : `signoff: ${unretainedSignoffEvidence.join(", ")}`
  ].filter(Boolean);
  checks.push(makeCheck(
    "evidence-references-retained",
    unretainedEvidenceMessages.length === 0,
    unretainedEvidenceMessages.length === 0
      ? "Passed automation, environment, UAT, and signoff evidence references point to retained docs or external URLs."
      : `Unretained evidence references: ${unretainedEvidenceMessages.join("; ")}`
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
    missingBasicOwnerRows,
    invalidBasicOwnerRows,
    invalidUatCaseOwnerRows,
    invalidSignoffOwnerRows,
    unretainedEvidenceReferences,
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
