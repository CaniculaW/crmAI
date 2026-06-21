#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";
const DEFAULT_EVIDENCE_ROOT = "docs/meeting-notes/evidence/kickoff";
const DEFAULT_OUTPUT_PATH = "docs/meeting-notes/crm-kickoff-governance-closure-intake.md";

const OWNER_ROWS = [
  ["产品负责人", "product-owner.md"],
  ["业务验收人-销售侧", "sales-owner.md"],
  ["业务验收人-管理侧", "manager-owner.md"],
  ["研发负责人", "dev-owner.md"],
  ["前端负责人", "frontend-owner.md"],
  ["后端负责人", "backend-owner.md"],
  ["测试负责人", "qa-owner.md"]
];

const SCOPE_ROWS = [
  ["V1 模块范围", "Confirmed V1 sales foundation modules", "已确认", "v1-scope.md"],
  ["V1 业务闭环", "Confirmed end-to-end sales foundation flow", "已确认", "v1-loop.md"],
  ["V1 暂不做", "Confirmed later-version and out-of-scope items", "已确认", "out-of-scope.md"],
  ["上线周期", "`YYYY-MM-DD 至 YYYY-MM-DD` with end after start", "已确认", "schedule.md"],
  ["技术栈", "Confirmed React + Ant Design, Java Spring Boot, PostgreSQL or approved change", "已确认", "tech-stack.md"],
  ["验收方式", "Confirmed sales-side and management-side acceptance mode", "已确认", "acceptance-mode.md"],
  ["V1范围冻结", "Confirm V1 only includes sales foundation loop and later-version items stay out", "已冻结", "scope-freeze.md"]
];

function evidencePath(evidenceRoot, filename) {
  return `${evidenceRoot.replace(/\/+$/, "")}/${filename}`;
}

export function generateKickoffGovernanceClosureIntakeMarkdown({
  generatedAt = new Date().toISOString(),
  kickoffPath = DEFAULT_KICKOFF_PATH,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT
} = {}) {
  const lines = [
    "# CRM V1 Kickoff Governance Closure Intake",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Target source document: ${kickoffPath}`,
    "",
    "Current blocker phase: `1-governance`",
    "",
    "Decision target: `Go`",
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in kickoff closure evidence.",
    "",
    "## Required Owner Closures",
    "",
    "| Role | Required closure value | Target status | Evidence requirement | Suggested evidence path |",
    "|---|---|---|---|---|"
  ];

  for (const [role, filename] of OWNER_ROWS) {
    lines.push(`| ${role} | Named person, not a role label | 已确认 | Existing non-empty \`docs/\` artifact or external \`http(s)\` URL | ${evidencePath(evidenceRoot, filename)} |`);
  }

  lines.push("");
  lines.push("## Required Scope Freeze Closures");
  lines.push("");
  lines.push("| Scope item | Required closure value | Target status | Evidence requirement | Suggested evidence path |");
  lines.push("|---|---|---|---|---|");

  for (const [item, closureValue, status, filename] of SCOPE_ROWS) {
    lines.push(`| ${item} | ${closureValue} | ${status} | Existing non-empty \`docs/\` artifact or external \`http(s)\` URL | ${evidencePath(evidenceRoot, filename)} |`);
  }

  lines.push("");
  lines.push("## Closure Steps");
  lines.push("");
  lines.push(`1. Update \`${kickoffPath}\` with named owners, confirmed scope rows, retained evidence references, and \`Decision: Go\`.`);
  lines.push("2. Keep V2/V3/V4 items out of the V1 scope and leave them in the later-version pool.");
  lines.push("3. Run the validation commands below and retain command output in the UAT evidence pack or meeting evidence.");
  lines.push("");
  lines.push("## Validation Commands");
  lines.push("");
  lines.push(`- \`node scripts/v1-kickoff-governance-validate.mjs ${kickoffPath}\``);
  lines.push("- `node scripts/v1-release-gate.mjs --json`");
  lines.push("");
  lines.push("Note: This intake file is a closure worksheet. It does not prove project approval until the target source document validates PASS and the final release gate returns Go.");

  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const parsed = {
    outputPath: null,
    kickoffPath: DEFAULT_KICKOFF_PATH,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      parsed.outputPath = argv[index + 1];
      index += 1;
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
  console.error(`Usage: node scripts/v1-kickoff-governance-closure-intake.mjs [--output ${DEFAULT_OUTPUT_PATH}] [--kickoff ${DEFAULT_KICKOFF_PATH}] [--evidence-root ${DEFAULT_EVIDENCE_ROOT}]`);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const output = generateKickoffGovernanceClosureIntakeMarkdown(options);
    if (options.outputPath) {
      writeFileSync(path.resolve(options.outputPath), output);
    } else {
      process.stdout.write(output);
    }
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
