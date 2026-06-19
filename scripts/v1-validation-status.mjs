#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateV1ReleaseGate } from "./v1-release-gate.mjs";
import { evaluateReadinessSnapshot, readSnapshot } from "./v1-uat-readiness-check.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";
import { evaluateUatEvidenceManifest } from "./v1-uat-evidence-manifest-validate.mjs";
import { evaluateUatExecutionTracker } from "./v1-uat-execution-tracker-validate.mjs";
import { evaluateUatDefectRegister } from "./v1-uat-defect-register-validate.mjs";
import { evaluateUatEnvironmentEvidence } from "./v1-uat-environment-validate.mjs";
import { evaluateUatSignoffRegister } from "./v1-uat-signoff-register-validate.mjs";

const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";
const DEFAULT_TRACKER_PATH = "docs/testing/crm-v1-uat-execution-tracker.md";
const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";
const DEFAULT_DEFECT_REGISTER_PATH = "docs/testing/v1-uat-defect-register.md";
const DEFAULT_ENVIRONMENT_PATH = "docs/testing/v1-uat-environment-evidence.md";
const DEFAULT_SIGNOFF_REGISTER_PATH = "docs/testing/v1-uat-signoff-register.md";
const DEFAULT_OUTPUT_PATH = "docs/testing/v1-validation-status.md";

function statusLabel(ok) {
  return ok ? "PASS" : "FAIL";
}

function commandList(
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH
) {
  return [
    "node scripts/v1-uat-readiness-check.mjs",
    `node scripts/v1-uat-environment-validate.mjs ${environmentPath}`,
    `node scripts/v1-uat-evidence-pack-validate.mjs ${evidencePath}`,
    `node scripts/v1-uat-evidence-manifest-validate.mjs ${manifestPath}`,
    `node scripts/v1-uat-execution-tracker-validate.mjs ${trackerPath}`,
    `node scripts/v1-uat-defect-register-validate.mjs ${defectRegisterPath}`,
    `node scripts/v1-uat-signoff-register-validate.mjs ${signoffRegisterPath}`,
    `node scripts/v1-release-gate.mjs . ${evidencePath} ${trackerPath} ${manifestPath} ${defectRegisterPath} ${environmentPath} ${signoffRegisterPath}`
  ];
}

function collectFailedChecks(label, result) {
  return (result.failed ?? []).map((check) => ({
    label,
    id: check.id,
    message: check.message
  }));
}

function resultRow(label, result) {
  return `| ${label} | ${statusLabel(result.ok)} | ${result.decision ?? "-"} | ${result.failed?.length ?? 0} |`;
}

function blockerLine(blocker) {
  return `- FAIL ${blocker.label}/${blocker.id}: ${blocker.message}`;
}

export function generateV1ValidationStatusMarkdown({
  generatedAt,
  gitCommit,
  readinessResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH
}) {
  const overall = releaseGateResult.ok && releaseGateResult.decision === "Go" ? "Go" : "No-Go";
  const blockers = [
    ...collectFailedChecks("Readiness", readinessResult),
    ...collectFailedChecks("UAT Environment Evidence", environmentResult),
    ...collectFailedChecks("UAT Evidence Pack", evidenceResult),
    ...collectFailedChecks("UAT Evidence Manifest", manifestResult),
    ...collectFailedChecks("UAT Execution Tracker", trackerResult),
    ...collectFailedChecks("UAT Defect Register", defectRegisterResult),
    ...collectFailedChecks("UAT Signoff Register", signoffRegisterResult),
    ...collectFailedChecks("Release Gate", releaseGateResult)
  ];

  const lines = [
    "# CRM V1 Validation Status",
    "",
    `Generated at: ${generatedAt}`,
    `Git commit: ${gitCommit}`,
    "",
    `Overall: ${overall}`,
    "",
    "## Gate Summary",
    "",
    "| Gate | Result | Decision | Failed checks |",
    "|---|---|---|---:|",
    resultRow("Readiness", readinessResult),
    resultRow("UAT Environment Evidence", environmentResult),
    resultRow("UAT Evidence Pack", evidenceResult),
    resultRow("UAT Evidence Manifest", manifestResult),
    resultRow("UAT Execution Tracker", trackerResult),
    resultRow("UAT Defect Register", defectRegisterResult),
    resultRow("UAT Signoff Register", signoffRegisterResult),
    resultRow("Release Gate", releaseGateResult),
    "",
    "## Verification Commands",
    ""
  ];

  for (const command of commandList(evidencePath, trackerPath, manifestPath, defectRegisterPath, environmentPath, signoffRegisterPath)) {
    lines.push(`- \`${command}\``);
  }

  lines.push("");
  lines.push("## Open Blockers");
  lines.push("");

  if (blockers.length === 0) {
    lines.push("- None. V1 release gate is ready for Go evidence retention.");
  } else {
    for (const blocker of blockers) {
      lines.push(blockerLine(blocker));
    }
  }

  lines.push("");
  lines.push("## Completion Rule");
  lines.push("");
  lines.push("V1验证通过必须同时满足：readiness PASS、UAT具名环境证据 validator PASS、UAT证据包 validator PASS、UAT证据清单 validator PASS、UAT执行追踪表 validator PASS、UAT缺陷台账 validator PASS、UAT签署台账 validator PASS、最终 release gate PASS，且项目负责人结论为 `Go`。");

  return `${lines.join("\n")}\n`;
}

function readGitCommit(rootDir) {
  const headPath = path.join(rootDir, ".git", "HEAD");
  if (!existsSync(headPath)) {
    return "unknown";
  }
  const head = readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) {
    return head;
  }
  const refPath = path.join(rootDir, ".git", head.slice(5));
  return existsSync(refPath) ? readFileSync(refPath, "utf8").trim() : "unknown";
}

export function generateV1ValidationStatusFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  generatedAt = new Date().toISOString(),
  gitCommit = readGitCommit(rootDir)
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(path.join(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(path.join(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(path.join(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(path.join(rootDir, manifestPath), "utf8"));
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(path.join(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(path.join(rootDir, signoffRegisterPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    environmentResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult,
    defectRegisterResult,
    signoffRegisterResult
  });

  return generateV1ValidationStatusMarkdown({
    generatedAt,
    gitCommit,
    readinessResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath
  });
}

function parseArgs(argv) {
  const parsed = {
    rootDir: process.cwd(),
    evidencePath: DEFAULT_EVIDENCE_PATH,
    trackerPath: DEFAULT_TRACKER_PATH,
    manifestPath: DEFAULT_MANIFEST_PATH,
    defectRegisterPath: DEFAULT_DEFECT_REGISTER_PATH,
    environmentPath: DEFAULT_ENVIRONMENT_PATH,
    signoffRegisterPath: DEFAULT_SIGNOFF_REGISTER_PATH,
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
    } else if (arg === "--defects") {
      parsed.defectRegisterPath = argv[index + 1];
      index += 1;
    } else if (arg === "--environment") {
      parsed.environmentPath = argv[index + 1];
      index += 1;
    } else if (arg === "--signoffs") {
      parsed.signoffRegisterPath = argv[index + 1];
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
  const markdown = generateV1ValidationStatusFromFiles(args);
  if (args.outputPath) {
    writeFileSync(path.join(args.rootDir, args.outputPath), markdown);
  } else {
    console.log(markdown.trimEnd());
  }
}
