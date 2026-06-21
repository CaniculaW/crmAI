#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";
const DEFAULT_EVIDENCE_ROOT = "docs/meeting-notes/evidence/kickoff";

const OWNER_SCAFFOLDS = [
  ["product-owner.md", "owner", "产品负责人", "Named person, not a role label", "已确认", "参会人/产品负责人"],
  ["sales-owner.md", "owner", "业务验收人-销售侧", "Named person, not a role label", "已确认", "参会人/业务验收人-销售侧"],
  ["manager-owner.md", "owner", "业务验收人-管理侧", "Named person, not a role label", "已确认", "参会人/业务验收人-管理侧"],
  ["dev-owner.md", "owner", "研发负责人", "Named person, not a role label", "已确认", "参会人/研发负责人"],
  ["frontend-owner.md", "owner", "前端负责人", "Named person, not a role label", "已确认", "参会人/前端负责人"],
  ["backend-owner.md", "owner", "后端负责人", "Named person, not a role label", "已确认", "参会人/后端负责人"],
  ["qa-owner.md", "owner", "测试负责人", "Named person, not a role label", "已确认", "参会人/测试负责人"]
];

const SCOPE_SCAFFOLDS = [
  ["v1-scope.md", "scope", "V1 模块范围", "Confirmed V1 sales foundation modules", "已确认", "启动确认基线/V1 模块范围"],
  ["v1-loop.md", "scope", "V1 业务闭环", "Confirmed end-to-end sales foundation flow", "已确认", "启动确认基线/V1 业务闭环"],
  ["out-of-scope.md", "scope", "V1 暂不做", "Confirmed later-version and out-of-scope items", "已确认", "启动确认基线/V1 暂不做"],
  ["schedule.md", "scope", "上线周期", "`YYYY-MM-DD 至 YYYY-MM-DD` with end after start", "已确认", "启动确认基线/上线周期"],
  ["tech-stack.md", "scope", "技术栈", "Confirmed React + Ant Design, Java Spring Boot, PostgreSQL or approved change", "已确认", "启动确认基线/技术栈"],
  ["acceptance-mode.md", "scope", "验收方式", "Confirmed sales-side and management-side acceptance mode", "已确认", "启动确认基线/验收方式"],
  ["scope-freeze.md", "scope", "V1范围冻结", "Confirm V1 only includes sales foundation loop and later-version items stay out", "已冻结", "启动确认基线/V1范围冻结"]
];

function evidencePath(evidenceRoot, filename) {
  return `${evidenceRoot.replace(/\/+$/, "")}/${filename}`;
}

export function generateKickoffGovernanceEvidenceScaffoldMarkdown({
  generatedAt = new Date().toISOString(),
  itemType,
  label,
  requiredClosureValue,
  targetStatus,
  targetRow,
  kickoffPath = DEFAULT_KICKOFF_PATH
}) {
  const lines = [
    `# CRM V1 Kickoff Governance Evidence - ${label}`,
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Evidence type: \`${itemType}\``,
    "Evidence status: `Pending`",
    `Required closure value: ${requiredClosureValue}`,
    `Target status in kickoff minutes: \`${targetStatus}\``,
    `Update target row: \`${kickoffPath}\` ${targetRow}`,
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked personal secrets in this evidence.",
    "",
    "## Evidence Intake",
    "",
    "| Field | Value |",
    "|---|---|",
    "| Named owner or approver | 待填写 |",
    "| Closure value | 待填写 |",
    "| Confirmation date | 待填写，格式 YYYY-MM-DD |",
    "| Confirmation source | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL |",
    "| Retained evidence reference | 待填写，必须是 `docs/` 留存工件或 `http(s)` URL |",
    "| Notes | 待填写 |",
    "",
    "## Closure Instructions",
    "",
    `1. Replace every pending value with concrete evidence for \`${label}\`.`,
    `2. Update the target row in \`${kickoffPath}\` only after this evidence is complete.`,
    "3. Keep this file retained under `docs/` and reference it from the kickoff minutes Evidence column.",
    "4. Re-run `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`.",
    "",
    "This scaffold is not approval evidence until a named owner fills it and the kickoff governance validator passes."
  ];

  return `${lines.join("\n")}\n`;
}

export function generateKickoffGovernanceEvidenceScaffolds({
  generatedAt = new Date().toISOString(),
  kickoffPath = DEFAULT_KICKOFF_PATH,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT
} = {}) {
  return [...OWNER_SCAFFOLDS, ...SCOPE_SCAFFOLDS].map(([
    filename,
    itemType,
    label,
    requiredClosureValue,
    targetStatus,
    targetRow
  ]) => ({
    path: evidencePath(evidenceRoot, filename),
    content: generateKickoffGovernanceEvidenceScaffoldMarkdown({
      generatedAt,
      itemType,
      label,
      requiredClosureValue,
      targetStatus,
      targetRow,
      kickoffPath
    })
  }));
}

export function writeKickoffGovernanceEvidenceScaffolds({
  rootDir = process.cwd(),
  generatedAt = new Date().toISOString(),
  kickoffPath = DEFAULT_KICKOFF_PATH,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT
} = {}) {
  const scaffolds = generateKickoffGovernanceEvidenceScaffolds({
    generatedAt,
    kickoffPath,
    evidenceRoot
  });

  for (const scaffold of scaffolds) {
    const targetPath = path.resolve(rootDir, scaffold.path);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, scaffold.content);
  }

  return scaffolds;
}

function parseArgs(argv) {
  const parsed = {
    write: false,
    kickoffPath: DEFAULT_KICKOFF_PATH,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") {
      parsed.write = true;
    } else if (arg === "--kickoff") {
      parsed.kickoffPath = argv[index + 1];
      index += 1;
    } else if (arg === "--evidence-root") {
      parsed.evidenceRoot = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function printUsage() {
  console.error("Usage: node scripts/v1-kickoff-governance-evidence-scaffold.mjs --write [--kickoff docs/meeting-notes/crm-kickoff-minutes.md] [--evidence-root docs/meeting-notes/evidence/kickoff]");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.write) {
    printUsage();
    process.exitCode = 1;
  } else {
    const scaffolds = writeKickoffGovernanceEvidenceScaffolds(options);
    for (const scaffold of scaffolds) {
      console.log(scaffold.path);
    }
  }
}
