#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateV1ReleaseGate } from "./v1-release-gate.mjs";
import { evaluateReadinessSnapshot, readSnapshot } from "./v1-uat-readiness-check.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";
import { evaluateUatEvidenceManifest } from "./v1-uat-evidence-manifest-validate.mjs";
import { evaluateUatExecutionTracker } from "./v1-uat-execution-tracker-validate.mjs";

const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";
const DEFAULT_TRACKER_PATH = "docs/testing/crm-v1-uat-execution-tracker.md";
const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";
const DEFAULT_OUTPUT_PATH = "docs/testing/v1-uat-action-plan.md";

function gateCommands(
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH
) {
  return [
    `node scripts/v1-uat-evidence-pack-validate.mjs ${evidencePath}`,
    `node scripts/v1-uat-evidence-manifest-validate.mjs ${manifestPath}`,
    `node scripts/v1-uat-execution-tracker-validate.mjs ${trackerPath}`,
    `node scripts/v1-release-gate.mjs . ${evidencePath} ${trackerPath} ${manifestPath}`
  ];
}

function failedCheckLines(label, result) {
  return (result.failed ?? []).map((check) => `- ${label}/${check.id}: ${check.message}`);
}

function workstreamRows(hasBlockers) {
  if (!hasBlockers) {
    return [];
  }

  return [
    "| Project / Product | 项目/产品 | 指定销售侧验收人、管理侧验收人、产品负责人、测试负责人和项目负责人；组织Go/No-Go会议并保留签署证据 |",
    "| Test | 测试 | 完成 PRE-001 至 PRE-006、SMK-001 至 SMK-005、UAT证据包、UAT证据清单、P0/P1缺陷汇总和回归证据 |",
    "| Business UAT | 业务 | 完成 UAT-001 至 UAT-010 并为每项提供截图、操作记录或缺陷单 |",
    "| Engineering | 研发 | 支持具名测试环境、账号权限、Smoke问题定位，并在证据补齐后重跑最终放行门禁 |"
  ];
}

export function generateV1UatActionPlanMarkdown({
  generatedAt,
  readinessResult,
  evidenceResult,
  manifestResult,
  trackerResult,
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH
}) {
  const overall = releaseGateResult.ok && releaseGateResult.decision === "Go" ? "Go" : "No-Go";
  const blockers = [
    ...failedCheckLines("Readiness", readinessResult),
    ...failedCheckLines("UAT Evidence Pack", evidenceResult),
    ...failedCheckLines("UAT Evidence Manifest", manifestResult),
    ...failedCheckLines("UAT Execution Tracker", trackerResult),
    ...failedCheckLines("Release Gate", releaseGateResult)
  ];

  const lines = [
    "# CRM V1 UAT Action Plan",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Overall: ${overall}`,
    "",
    "## Role Workstreams",
    ""
  ];

  if (blockers.length === 0) {
    lines.push("No open UAT blockers.");
  } else {
    lines.push("| Workstream | Owner side | Next actions |");
    lines.push("|---|---|---|");
    lines.push(...workstreamRows(true));
  }

  lines.push("");
  lines.push("## Gate Commands");
  lines.push("");

  for (const command of gateCommands(evidencePath, trackerPath, manifestPath)) {
    lines.push(`- \`${command}\``);
  }

  lines.push("");
  lines.push("## Open Gate Findings");
  lines.push("");

  if (blockers.length === 0) {
    lines.push("- None.");
  } else {
    lines.push(...blockers);
    lines.push("");
    lines.push("Do not mark V1 as Go until every listed gate is PASS and the project decision is Go.");
  }

  return `${lines.join("\n")}\n`;
}

export function generateV1UatActionPlanFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(path.join(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(path.join(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(path.join(rootDir, manifestPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult
  });

  return generateV1UatActionPlanMarkdown({
    generatedAt,
    readinessResult,
    evidenceResult,
    manifestResult,
    trackerResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath
  });
}

function parseArgs(argv) {
  const parsed = {
    rootDir: process.cwd(),
    evidencePath: DEFAULT_EVIDENCE_PATH,
    trackerPath: DEFAULT_TRACKER_PATH,
    manifestPath: DEFAULT_MANIFEST_PATH,
    outputPath: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.rootDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--evidence") {
      parsed.evidencePath = argv[index + 1];
      index += 1;
    } else if (arg === "--tracker") {
      parsed.trackerPath = argv[index + 1];
      index += 1;
    } else if (arg === "--manifest") {
      parsed.manifestPath = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      parsed.outputPath = argv[index + 1] ?? DEFAULT_OUTPUT_PATH;
      index += 1;
    }
  }

  return parsed;
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  const markdown = generateV1UatActionPlanFromFiles(args);
  if (args.outputPath) {
    writeFileSync(path.join(args.rootDir, args.outputPath), markdown);
  } else {
    console.log(markdown.trimEnd());
  }
}
