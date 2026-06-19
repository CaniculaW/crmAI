#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED_OWNER_ROLES = [
  "产品负责人",
  "业务验收人-销售侧",
  "业务验收人-管理侧",
  "研发负责人",
  "前端负责人",
  "后端负责人",
  "测试负责人"
];

const REQUIRED_SCOPE_ITEMS = [
  "V1 模块范围",
  "V1 业务闭环",
  "V1 暂不做",
  "上线周期",
  "技术栈",
  "验收方式",
  "V1范围冻结"
];

const REQUIRED_V1_TERMS = [
  "系统基础",
  "客户池",
  "联系人",
  "商机",
  "销售行动",
  "周进展"
];

const FORBIDDEN_V1_SCOPE_TERMS = [
  "合同管理",
  "开票",
  "回款",
  "经营驾驶舱完整指标",
  "AI 销售助手完整能力"
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
  return /待填写|待补充|待确认|待准备|待执行|PENDING|TBD|TODO|<.+>/i.test(value);
}

function hasSecretLikeMaterial(markdown) {
  return /((password|passwd|secret|api[_ -]?token|access[_ -]?token|refresh[_ -]?token)\s*[:=]|S3cure!123|Bearer\s+[A-Za-z0-9._-]+)/i.test(markdown);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function findRow(rows, firstCell) {
  return rows.find((row) => row[0] === firstCell);
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value);
}

function evidenceReferenceTokens(value) {
  return value
    .split(/[\s,，;；]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isRetainedEvidenceReference(value) {
  return isConcrete(value) && evidenceReferenceTokens(value).some((token) => (
    token.startsWith("docs/") || /^https?:\/\//i.test(token)
  ));
}

function extractDecision(markdown) {
  const match = markdown.match(/^Decision:\s*(Go|Conditional Go|No-Go)\s*$/m);
  return match?.[1] ?? "";
}

function isConfirmedStatus(value) {
  return value === "已确认" || value === "已冻结";
}

function scopeInclusionText(rows) {
  return ["V1 模块范围", "V1 业务闭环", "V1范围冻结"]
    .map((item) => findRow(rows, item)?.slice(1).join(" ") ?? "")
    .join(" ");
}

export function evaluateKickoffGovernance(markdown) {
  const rows = tableRows(markdown);
  const decision = extractDecision(markdown);
  const checks = [];

  const incompleteOwners = REQUIRED_OWNER_ROLES.filter((role) => {
    const row = findRow(rows, role);
    return !row || !isConcrete(row[1] ?? "") || row[2] !== "已确认";
  });

  checks.push(makeCheck(
    "required-owners",
    incompleteOwners.length === 0,
    incompleteOwners.length === 0
      ? "Kickoff owners and business acceptance owners are named and confirmed."
      : `Incomplete kickoff owners: ${incompleteOwners.join(", ")}`
  ));

  const incompleteScopeItems = REQUIRED_SCOPE_ITEMS.filter((item) => {
    const row = findRow(rows, item);
    return !row || !isConcrete(row[1] ?? "") || !isConfirmedStatus(row[2] ?? "");
  });

  checks.push(makeCheck(
    "scope-freeze",
    incompleteScopeItems.length === 0,
    incompleteScopeItems.length === 0
      ? "V1 scope, out-of-scope items, schedule, stack, acceptance mode, and freeze decision are confirmed."
      : `Incomplete kickoff scope freeze items: ${incompleteScopeItems.join(", ")}`
  ));

  const includedScope = scopeInclusionText(rows);
  const missingV1Terms = REQUIRED_V1_TERMS.filter((term) => !markdown.includes(term));
  const forbiddenInV1Scope = FORBIDDEN_V1_SCOPE_TERMS.filter((term) => includedScope.includes(term));

  checks.push(makeCheck(
    "scope-boundary",
    missingV1Terms.length === 0 && forbiddenInV1Scope.length === 0,
    missingV1Terms.length === 0 && forbiddenInV1Scope.length === 0
      ? "V1 scope covers the sales foundation loop and excludes later-version capabilities."
      : [
        missingV1Terms.length === 0 ? "" : `Missing V1 terms: ${missingV1Terms.join(", ")}`,
        forbiddenInV1Scope.length === 0 ? "" : `Forbidden terms in V1 scope: ${forbiddenInV1Scope.join(", ")}`
      ].filter(Boolean).join("; ")
  ));

  const unretainedOwnerEvidenceRoles = REQUIRED_OWNER_ROLES.filter((role) => {
    const row = findRow(rows, role);
    return row
      && isConcrete(row[1] ?? "")
      && row[2] === "已确认"
      && !isRetainedEvidenceReference(row[3] ?? "");
  });

  const unretainedScopeEvidenceItems = REQUIRED_SCOPE_ITEMS.filter((item) => {
    const row = findRow(rows, item);
    return row
      && isConcrete(row[1] ?? "")
      && isConfirmedStatus(row[2] ?? "")
      && !isRetainedEvidenceReference(row[3] ?? "");
  });

  checks.push(makeCheck(
    "kickoff-evidence-retained",
    unretainedOwnerEvidenceRoles.length === 0 && unretainedScopeEvidenceItems.length === 0,
    unretainedOwnerEvidenceRoles.length === 0 && unretainedScopeEvidenceItems.length === 0
      ? "Confirmed kickoff owners and scope freeze items point to retained docs or external systems."
      : [
        unretainedOwnerEvidenceRoles.length === 0
          ? ""
          : `Unretained kickoff owner evidence roles: ${unretainedOwnerEvidenceRoles.join(", ")}`,
        unretainedScopeEvidenceItems.length === 0
          ? ""
          : `Unretained kickoff scope evidence items: ${unretainedScopeEvidenceItems.join(", ")}`
      ].filter(Boolean).join("; ")
  ));

  checks.push(makeCheck(
    "project-go-decision",
    decision === "Go",
    decision === "Go"
      ? "Project has approved kickoff governance and V1 scope freeze."
      : `Kickoff governance decision is ${decision || "MISSING"}; V1 validation requires Go.`
  ));

  checks.push(makeCheck(
    "no-secret-material",
    !hasSecretLikeMaterial(markdown),
    hasSecretLikeMaterial(markdown)
      ? "Kickoff governance contains secret-like material."
      : "Kickoff governance does not contain secret-like material."
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    unretainedOwnerEvidenceRoles,
    unretainedScopeEvidenceItems,
    passed,
    failed,
    checks
  };
}

function printResult(result) {
  const lines = [
    "# V1 Kickoff Governance Validation",
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

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.error("Usage: node scripts/v1-kickoff-governance-validate.mjs <crm-kickoff-minutes.md>");
    process.exitCode = 1;
  } else {
    const result = evaluateKickoffGovernance(readFileSync(targetPath, "utf8"));
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
