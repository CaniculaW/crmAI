#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BLOCKERS_JSON_PATH = "docs/testing/v1-external-uat-blockers.json";
const DEFAULT_OUTPUT_PATH = "docs/testing/v1-progress-todo.md";

function ownerSideText(byOwnerSide = {}) {
  const ownerSides = Object.keys(byOwnerSide).sort();
  return ownerSides.length > 0
    ? ownerSides.join(", ")
    : "-";
}

function blockerRows(blockers = [], phase) {
  return blockers
    .filter((blocker) => !phase || blocker.closurePhase === phase)
    .map((blocker) => [
      "Open",
      blocker.blockerId,
      blocker.gate,
      blocker.checkId,
      blocker.ownerSide,
      blocker.sourceDocument,
      `\`${blocker.validationCommand}\``,
      blocker.message
    ].join(" | "))
    .map((row) => `| ${row} |`);
}

export function generateV1ProgressTodoMarkdown({
  generatedAt = new Date().toISOString(),
  blockersPayload
} = {}) {
  const summary = blockersPayload?.summary ?? {};
  const closurePhases = summary.closurePhases ?? [];
  const nextPhase = summary.nextClosurePhase ?? null;
  const blockers = blockersPayload?.blockers ?? [];
  const currentTask = nextPhase?.phase ?? "complete";
  const currentOwnerSide = nextPhase ? ownerSideText(nextPhase.byOwnerSide) : "-";

  const lines = [
    "# CRM V1 Progress TODO",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Overall status: \`${blockersPayload?.status ?? "Unknown"}\``,
    `Overall decision: \`${blockersPayload?.decision ?? "Unknown"}\``,
    `Open blockers: ${summary.totalBlockers ?? blockers.length}`,
    `Current task: \`${currentTask}\``,
    `Current owner side: ${currentOwnerSide}`,
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in progress evidence.",
    "",
    "## TODOList",
    "",
    "| Status | Phase | Open blockers | Owner side | Completion standard |",
    "|---|---|---:|---|---|"
  ];

  if (closurePhases.length === 0) {
    lines.push("| Done | `complete` | 0 | - | No open V1 blockers remain |");
  } else {
    for (const phase of closurePhases) {
      const status = phase.phase === currentTask ? "In Progress" : "Pending";
      lines.push(`| ${status} | \`${phase.phase}\` | ${phase.totalBlockers} | ${ownerSideText(phase.byOwnerSide)} | Source validators PASS and final release gate returns Go |`);
    }
  }

  lines.push("");
  lines.push("## Current Task Progress");
  lines.push("");

  if (!nextPhase) {
    lines.push("No open V1 blockers remain.");
  } else {
    lines.push(`Current task: \`${nextPhase.phase}\``);
    lines.push(`Open blockers: ${nextPhase.totalBlockers}`);
    lines.push(`Owner side: ${ownerSideText(nextPhase.byOwnerSide)}`);
    lines.push(`Source documents: ${nextPhase.sourceDocuments.map((docPath) => `\`${docPath}\``).join(", ")}`);
    lines.push("");
    lines.push("Validation commands:");
    for (const command of nextPhase.validationCommands) {
      lines.push(`- \`${command}\``);
    }
    lines.push("");
    lines.push("| Status | Blocker ID | Gate | Check ID | Owner side | Source document | Validation command | Closure evidence needed |");
    lines.push("|---|---|---|---|---|---|---|---|");
    lines.push(...blockerRows(blockers, nextPhase.phase));
  }

  lines.push("");
  lines.push("## Task Switch Display Rule");
  lines.push("");
  lines.push("每次切换任务时必须展示：");
  lines.push("- 上一任务：完成状态和验证证据。");
  lines.push("- 当前任务：TODOList 中的阶段、责任侧、阻塞数。");
  lines.push("- 完成标准：对应源文档 validator PASS，最终 release gate 返回 Go。");
  lines.push("- 验证命令：本节列出的命令或下一闭环阶段交接包中的命令。");
  lines.push("");
  lines.push("Note: This progress board is generated from machine-readable V1 blocker output. Update source evidence documents, regenerate blocker output, then regenerate this board.");

  return `${lines.join("\n")}\n`;
}

export function generateV1ProgressTodoFromFiles({
  rootDir = process.cwd(),
  generatedAt = new Date().toISOString(),
  blockersJsonPath = DEFAULT_BLOCKERS_JSON_PATH
} = {}) {
  const blockersPayload = JSON.parse(readFileSync(path.join(rootDir, blockersJsonPath), "utf8"));
  return generateV1ProgressTodoMarkdown({ generatedAt, blockersPayload });
}

function parseArgs(argv) {
  const parsed = {
    outputPath: null,
    blockersJsonPath: DEFAULT_BLOCKERS_JSON_PATH
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      parsed.outputPath = argv[index + 1];
      index += 1;
    } else if (arg === "--blockers-json") {
      parsed.blockersJsonPath = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function printUsage() {
  console.error(`Usage: node scripts/v1-progress-todo.mjs [--output ${DEFAULT_OUTPUT_PATH}] [--blockers-json ${DEFAULT_BLOCKERS_JSON_PATH}]`);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const output = generateV1ProgressTodoFromFiles(options);
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
