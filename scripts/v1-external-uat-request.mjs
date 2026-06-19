#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateKickoffGovernance } from "./v1-kickoff-governance-validate.mjs";
import { evaluateV1ReleaseGate } from "./v1-release-gate.mjs";
import { evaluateReadinessSnapshot, readSnapshot } from "./v1-uat-readiness-check.mjs";
import { evaluateUatDefectRegister } from "./v1-uat-defect-register-validate.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";
import { evaluateUatEvidenceManifest } from "./v1-uat-evidence-manifest-validate.mjs";
import { evaluateUatEnvironmentEvidence } from "./v1-uat-environment-validate.mjs";
import { evaluateUatExecutionTracker } from "./v1-uat-execution-tracker-validate.mjs";
import { evaluateUatLaunchIntake } from "./v1-uat-launch-intake-validate.mjs";
import { evaluateUatSignoffRegister } from "./v1-uat-signoff-register-validate.mjs";

const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";
const DEFAULT_TRACKER_PATH = "docs/testing/crm-v1-uat-execution-tracker.md";
const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";
const DEFAULT_DEFECT_REGISTER_PATH = "docs/testing/v1-uat-defect-register.md";
const DEFAULT_ENVIRONMENT_PATH = "docs/testing/v1-uat-environment-evidence.md";
const DEFAULT_SIGNOFF_REGISTER_PATH = "docs/testing/v1-uat-signoff-register.md";
const DEFAULT_LAUNCH_INTAKE_PATH = "docs/testing/v1-uat-launch-intake.md";
const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";
const DEFAULT_RUNBOOK_PATH = "docs/testing/crm-v1-test-environment-validation-runbook.md";
const DEFAULT_AUTOMATED_REPORT_PATH = "docs/testing/v1-automated-validation-report-2026-06-18.md";
const DEFAULT_OUTPUT_PATH = "docs/testing/v1-external-uat-request.md";

function gateCommands(
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH
) {
  return [
    `node scripts/v1-kickoff-governance-validate.mjs ${kickoffPath}`,
    `node scripts/v1-uat-launch-intake-validate.mjs ${launchIntakePath}`,
    `node scripts/v1-uat-environment-validate.mjs ${environmentPath}`,
    `node scripts/v1-uat-evidence-pack-validate.mjs ${evidencePath}`,
    `node scripts/v1-uat-evidence-manifest-validate.mjs ${manifestPath}`,
    `node scripts/v1-uat-execution-tracker-validate.mjs ${trackerPath}`,
    `node scripts/v1-uat-defect-register-validate.mjs ${defectRegisterPath}`,
    `node scripts/v1-uat-signoff-register-validate.mjs ${signoffRegisterPath}`,
    `node scripts/v1-release-gate.mjs . ${evidencePath} ${trackerPath} ${manifestPath} ${defectRegisterPath} ${environmentPath} ${signoffRegisterPath} ${launchIntakePath} ${kickoffPath}`
  ];
}

function failedLines(label, result) {
  return (result.failed ?? []).map((check) => `- ${label}/${check.id}: ${check.message}`);
}

function requestRows({
  evidencePath,
  trackerPath,
  manifestPath,
  defectRegisterPath,
  environmentPath,
  signoffRegisterPath,
  launchIntakePath,
  kickoffPath,
  runbookPath,
  automatedReportPath
}) {
  return [
    `| Project / Product | 项目/产品 | ${kickoffPath}; ${launchIntakePath}; ${signoffRegisterPath} | 指定负责人、冻结V1范围、确认UAT窗口、组织签署和Go/No-Go会议 |`,
    `| Test | 测试 | ${environmentPath}; ${defectRegisterPath}; ${manifestPath} | 执行具名环境检查、维护缺陷闭环、汇总证据清单并重跑校验命令 |`,
    `| Business UAT | 业务 | ${evidencePath}; ${trackerPath} | 执行UAT-001至UAT-010，提供截图、操作记录、缺陷单和验收结论 |`,
    `| Engineering | 研发 | ${runbookPath}; ${automatedReportPath} | 支撑环境、账号、Smoke定位和最终release gate复验 |`
  ];
}

export function generateV1ExternalUatRequestMarkdown({
  generatedAt,
  readinessResult,
  kickoffResult,
  launchIntakeResult,
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
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH
}) {
  const blockers = [
    ...failedLines("Readiness", readinessResult),
    ...failedLines("Kickoff Governance", kickoffResult),
    ...failedLines("UAT Launch Intake", launchIntakeResult),
    ...failedLines("UAT Environment Evidence", environmentResult),
    ...failedLines("UAT Evidence Pack", evidenceResult),
    ...failedLines("UAT Evidence Manifest", manifestResult),
    ...failedLines("UAT Execution Tracker", trackerResult),
    ...failedLines("UAT Defect Register", defectRegisterResult),
    ...failedLines("UAT Signoff Register", signoffRegisterResult),
    ...failedLines("Release Gate", releaseGateResult)
  ];
  const isGo = releaseGateResult.ok && releaseGateResult.decision === "Go";

  const lines = [
    "# CRM V1 External UAT Request Packet",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Request Status: ${isGo ? "No External UAT Requests Open" : "External UAT Evidence Required"}`,
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in any request evidence.",
    "",
    "## Request Board",
    ""
  ];

  if (isGo) {
    lines.push("All external UAT request items are closed by validator evidence.");
  } else {
    lines.push("| Workstream | Owner side | Source documents | Request |");
    lines.push("|---|---|---|---|");
    lines.push(...requestRows({
      evidencePath,
      trackerPath,
      manifestPath,
      defectRegisterPath,
      environmentPath,
      signoffRegisterPath,
      launchIntakePath,
      kickoffPath,
      runbookPath,
      automatedReportPath
    }));
  }

  lines.push("");
  lines.push("## Validation Commands");
  lines.push("");
  for (const command of gateCommands(evidencePath, trackerPath, manifestPath, defectRegisterPath, environmentPath, signoffRegisterPath, launchIntakePath, kickoffPath)) {
    lines.push(`- \`${command}\``);
  }

  lines.push("");
  lines.push("## Current Blocking Evidence Requests");
  lines.push("");
  if (blockers.length === 0) {
    lines.push("- None.");
  } else {
    lines.push(...blockers);
    lines.push("");
    lines.push("Keep this request packet open until every source document validates PASS and the final release gate returns Go.");
  }

  lines.push("");
  lines.push("Note: This packet is a stakeholder-facing request board. It does not replace the UAT source documents, validator output, or final release gate.");

  return `${lines.join("\n")}\n`;
}

export function generateV1ExternalUatRequestFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const kickoffResult = evaluateKickoffGovernance(readFileSync(path.join(rootDir, kickoffPath), "utf8"));
  const launchIntakeResult = evaluateUatLaunchIntake(readFileSync(path.join(rootDir, launchIntakePath), "utf8"));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(path.join(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(path.join(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(path.join(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(path.join(rootDir, manifestPath), "utf8"));
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(path.join(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(path.join(rootDir, signoffRegisterPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult,
    defectRegisterResult,
    signoffRegisterResult
  });

  return generateV1ExternalUatRequestMarkdown({
    generatedAt,
    readinessResult,
    kickoffResult,
    launchIntakeResult,
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
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
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
    launchIntakePath: DEFAULT_LAUNCH_INTAKE_PATH,
    kickoffPath: DEFAULT_KICKOFF_PATH,
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
    } else if (arg === "--launch-intake") {
      parsed.launchIntakePath = argv[index + 1];
      index += 1;
    } else if (arg === "--kickoff") {
      parsed.kickoffPath = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      parsed.outputPath = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function printUsage() {
  console.error("Usage: node scripts/v1-external-uat-request.mjs [--root path] [--output docs/testing/v1-external-uat-request.md] [--evidence file] [--tracker file] [--manifest file] [--defects file] [--environment file] [--signoffs file] [--launch-intake file] [--kickoff file]");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const markdown = generateV1ExternalUatRequestFromFiles(options);
    if (options.outputPath) {
      writeFileSync(path.join(options.rootDir, options.outputPath), markdown);
    } else {
      process.stdout.write(markdown);
    }
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
