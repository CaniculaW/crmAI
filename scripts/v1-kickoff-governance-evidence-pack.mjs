#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BLOCKERS_JSON_PATH = "docs/testing/v1-external-uat-blockers.json";
const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";
const DEFAULT_EVIDENCE_ROOT = "docs/meeting-notes/evidence/kickoff";
const DEFAULT_OUTPUT_PATH = "docs/meeting-notes/evidence/kickoff/closure-evidence-pack.md";

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

function ownerSideText(byOwnerSide = {}) {
  const ownerSides = Object.keys(byOwnerSide).sort();
  return ownerSides.length > 0 ? ownerSides.join(", ") : "-";
}

function governanceBlockers(blockers = []) {
  return blockers.filter((blocker) => blocker.closurePhase === "1-governance");
}

function blockerRows(blockers = []) {
  return governanceBlockers(blockers).map((blocker) => [
    "Open",
    blocker.blockerId,
    blocker.gate,
    blocker.checkId,
    blocker.ownerSide,
    blocker.sourceDocument,
    `\`${blocker.validationCommand}\``,
    blocker.message
  ].join(" | ")).map((row) => `| ${row} |`);
}

export function generateKickoffGovernanceEvidencePackMarkdown({
  generatedAt = new Date().toISOString(),
  kickoffPath = DEFAULT_KICKOFF_PATH,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT,
  blockersPayload
} = {}) {
  const nextPhase = blockersPayload?.summary?.nextClosurePhase ?? null;
  const phaseSummary = (blockersPayload?.summary?.closurePhases ?? [])
    .find((phase) => phase.phase === "1-governance");
  const currentBlockers = governanceBlockers(blockersPayload?.blockers ?? []);
  const openKickoffBlockers = phaseSummary?.totalBlockers ?? currentBlockers.length;

  const lines = [
    "# CRM V1 Kickoff Governance Evidence Pack",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "Current task: `1-governance`",
    `Current owner side: ${ownerSideText(phaseSummary?.byOwnerSide ?? nextPhase?.byOwnerSide)}`,
    `Open kickoff blockers: ${openKickoffBlockers}`,
    `Target source document: \`${kickoffPath}\``,
    "Decision target: `Go`",
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in kickoff governance evidence.",
    "",
    "## Owner Confirmation TODOList",
    "",
    "| Role | Required closure value | Target status | Evidence path | Update target row |",
    "|---|---|---|---|---|"
  ];

  for (const [role, filename] of OWNER_ROWS) {
    lines.push(`| ${role} | Named person, not a role label | 已确认 | \`${evidencePath(evidenceRoot, filename)}\` | \`${kickoffPath}\` 参会人/${role} |`);
  }

  lines.push("");
  lines.push("## Scope Freeze TODOList");
  lines.push("");
  lines.push("| Scope item | Required closure value | Target status | Evidence path | Update target row |");
  lines.push("|---|---|---|---|---|");

  for (const [item, closureValue, status, filename] of SCOPE_ROWS) {
    lines.push(`| ${item} | ${closureValue} | ${status} | \`${evidencePath(evidenceRoot, filename)}\` | \`${kickoffPath}\` 启动确认基线/${item} |`);
  }

  lines.push("");
  lines.push("## Current Governance Blockers");
  lines.push("");

  if (currentBlockers.length === 0) {
    lines.push("No open `1-governance` blockers are present in the current blockers JSON.");
  } else {
    lines.push("| Status | Blocker ID | Gate | Check ID | Owner side | Source document | Validation command | Closure evidence needed |");
    lines.push("|---|---|---|---|---|---|---|---|");
    lines.push(...blockerRows(blockersPayload?.blockers ?? []));
  }

  lines.push("");
  lines.push("## Closure Procedure");
  lines.push("");
  lines.push(`1. Collect every evidence path listed above as a retained non-empty \`docs/\` artifact or external \`http(s)\` URL.`);
  lines.push(`2. Update \`${kickoffPath}\` with named owners, confirmed scope rows, retained evidence references, and \`Decision: Go\`.`);
  lines.push("3. Keep V2/V3/V4 items out of the V1 scope and leave them in the later-version pool.");
  lines.push("4. Run the validation commands below and retain the output with V1 evidence.");
  lines.push("");
  lines.push("## Validation Commands");
  lines.push("");
  lines.push(`- \`node scripts/v1-kickoff-governance-validate.mjs ${kickoffPath}\``);
  lines.push("- `node scripts/v1-release-gate.mjs --json`");
  lines.push("");
  lines.push("## Task Switch Display Rule");
  lines.push("");
  lines.push("每次切换任务时必须展示：");
  lines.push("- 上一任务：完成状态和验证证据。");
  lines.push("- 当前任务：`1-governance` 的责任侧、阻塞数和 TODOList。");
  lines.push("- 完成标准：`v1-kickoff-governance-validate.mjs` PASS，最终 release gate 不再因 kickoff governance 阻塞。");
  lines.push("- 验证命令：本节列出的命令。");
  lines.push("");
  lines.push("Note: This evidence pack is a collection guide. It does not prove project approval until the target source document validates PASS and the final release gate returns Go.");

  return `${lines.join("\n")}\n`;
}

export function generateKickoffGovernanceEvidencePackFromFiles({
  rootDir = process.cwd(),
  generatedAt = new Date().toISOString(),
  kickoffPath = DEFAULT_KICKOFF_PATH,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT,
  blockersJsonPath = DEFAULT_BLOCKERS_JSON_PATH
} = {}) {
  const blockersPayload = JSON.parse(readFileSync(path.join(rootDir, blockersJsonPath), "utf8"));
  return generateKickoffGovernanceEvidencePackMarkdown({
    generatedAt,
    kickoffPath,
    evidenceRoot,
    blockersPayload
  });
}

function parseArgs(argv) {
  const parsed = {
    outputPath: null,
    kickoffPath: DEFAULT_KICKOFF_PATH,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT,
    blockersJsonPath: DEFAULT_BLOCKERS_JSON_PATH
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
    } else if (arg === "--blockers-json") {
      parsed.blockersJsonPath = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function printUsage() {
  console.error(`Usage: node scripts/v1-kickoff-governance-evidence-pack.mjs [--output ${DEFAULT_OUTPUT_PATH}] [--kickoff ${DEFAULT_KICKOFF_PATH}] [--evidence-root ${DEFAULT_EVIDENCE_ROOT}] [--blockers-json ${DEFAULT_BLOCKERS_JSON_PATH}]`);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const output = generateKickoffGovernanceEvidencePackFromFiles(options);
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

