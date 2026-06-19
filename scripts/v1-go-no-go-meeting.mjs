#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateKickoffGovernance } from "./v1-kickoff-governance-validate.mjs";
import { evaluateV1ReleaseGate } from "./v1-release-gate.mjs";
import { evaluateReadinessSnapshot, readSnapshot } from "./v1-uat-readiness-check.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";
import { evaluateUatEvidenceManifest } from "./v1-uat-evidence-manifest-validate.mjs";
import { evaluateUatExecutionTracker } from "./v1-uat-execution-tracker-validate.mjs";
import { evaluateUatDefectRegister } from "./v1-uat-defect-register-validate.mjs";
import { evaluateUatEnvironmentEvidence } from "./v1-uat-environment-validate.mjs";
import { evaluateUatLaunchIntake } from "./v1-uat-launch-intake-validate.mjs";
import { evaluateUatSignoffRegister } from "./v1-uat-signoff-register-validate.mjs";
import { evaluateEvidenceReferencesFromFiles } from "./v1-evidence-reference-check.mjs";

const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";
const DEFAULT_TRACKER_PATH = "docs/testing/crm-v1-uat-execution-tracker.md";
const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";
const DEFAULT_DEFECT_REGISTER_PATH = "docs/testing/v1-uat-defect-register.md";
const DEFAULT_ENVIRONMENT_PATH = "docs/testing/v1-uat-environment-evidence.md";
const DEFAULT_SIGNOFF_REGISTER_PATH = "docs/testing/v1-uat-signoff-register.md";
const DEFAULT_LAUNCH_INTAKE_PATH = "docs/testing/v1-uat-launch-intake.md";
const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";
const DEFAULT_OUTPUT_PATH = "docs/testing/v1-go-no-go-meeting.md";

const SIGNOFF_ROLES = [
  "销售侧验收人",
  "管理侧验收人",
  "产品负责人",
  "测试负责人",
  "研发负责人",
  "项目负责人"
];

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
    `node scripts/v1-uat-readiness-check.mjs`,
    `node scripts/v1-kickoff-governance-validate.mjs ${kickoffPath}`,
    `node scripts/v1-uat-launch-intake-validate.mjs ${launchIntakePath}`,
    `node scripts/v1-uat-environment-validate.mjs ${environmentPath}`,
    `node scripts/v1-uat-evidence-pack-validate.mjs ${evidencePath}`,
    `node scripts/v1-uat-evidence-manifest-validate.mjs ${manifestPath}`,
    `node scripts/v1-evidence-reference-check.mjs ${manifestPath}`,
    `node scripts/v1-uat-execution-tracker-validate.mjs ${trackerPath}`,
    `node scripts/v1-uat-defect-register-validate.mjs ${defectRegisterPath}`,
    `node scripts/v1-uat-signoff-register-validate.mjs ${signoffRegisterPath}`,
    `node scripts/v1-release-gate.mjs . ${evidencePath} ${trackerPath} ${manifestPath} ${defectRegisterPath} ${environmentPath} ${signoffRegisterPath} ${launchIntakePath} ${kickoffPath}`
  ];
}

function failedLines(label, result) {
  return (result.failed ?? []).map((check) => `- ${label}/${check.id}: ${check.message}`);
}

function resolveFromRoot(rootDir, filePath) {
  return path.resolve(rootDir, filePath);
}

function recommendation(releaseGateResult) {
  return releaseGateResult.ok && releaseGateResult.decision === "Go" ? "Go" : "No-Go";
}

export function generateV1GoNoGoMeetingMarkdown({
  generatedAt,
  readinessResult,
  kickoffResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  launchIntakeResult,
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH
}) {
  const decisionRecommendation = recommendation(releaseGateResult);
  const blockers = [
    ...failedLines("Readiness", readinessResult),
    ...failedLines("Kickoff Governance", kickoffResult),
    ...failedLines("UAT Launch Intake", launchIntakeResult),
    ...failedLines("UAT Environment Evidence", environmentResult),
    ...failedLines("UAT Evidence Pack", evidenceResult),
    ...failedLines("UAT Evidence Manifest", manifestResult),
    ...failedLines("UAT Evidence References", evidenceReferenceResult),
    ...failedLines("UAT Execution Tracker", trackerResult),
    ...failedLines("UAT Defect Register", defectRegisterResult),
    ...failedLines("UAT Signoff Register", signoffRegisterResult),
    ...failedLines("Release Gate", releaseGateResult)
  ];

  const lines = [
    "# CRM V1 Go/No-Go Meeting Pack",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Decision Recommendation: ${decisionRecommendation}`,
    "",
    "## Required Attendees",
    "",
    ...SIGNOFF_ROLES.map((role) => `- ${role}`),
    "",
    "## Required Gate Commands",
    "",
    ...gateCommands(evidencePath, trackerPath, manifestPath, defectRegisterPath, environmentPath, signoffRegisterPath, launchIntakePath, kickoffPath).map((command) => `- \`${command}\``),
    "",
    "## Meeting Agenda",
    "",
    "1. Confirm candidate version, test environment, and evidence package.",
    "2. Review UAT execution tracker, P0/P1 defect closure, and regression evidence.",
    "3. Review sales-side and management-side acceptance results.",
    "4. Record final Go/No-Go decision and signoff owners.",
    "",
    "## Open Approval Blockers",
    ""
  ];

  if (blockers.length === 0) {
    lines.push("- None. Release gate is ready for final project Go signoff.");
  } else {
    lines.push(...blockers);
    lines.push("");
    lines.push("Cannot approve V1 until every validator returns PASS and the project decision is Go.");
  }

  lines.push("");
  lines.push("## Final Signoff Table");
  lines.push("");
  lines.push("| Role | Name | Decision | Date | Evidence |");
  lines.push("|---|---|---|---|---|");

  for (const role of SIGNOFF_ROLES) {
    const decision = role === "项目负责人" && decisionRecommendation === "Go" ? "Go" : "待填写";
    lines.push(`| ${role} | 待填写 | ${decision} | 待填写 | 待填写 |`);
  }

  lines.push("");
  lines.push("Note: This meeting pack organizes final approval evidence. It does not replace kickoff-governance validation, UAT execution, launch-intake validation, named-environment validation, defect closure, signoff-register validation, evidence-pack validation, evidence-manifest validation, tracker validation, defect-register validation, or the final release gate.");

  return `${lines.join("\n")}\n`;
}

export function generateV1GoNoGoMeetingFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const kickoffResult = evaluateKickoffGovernance(readFileSync(resolveFromRoot(rootDir, kickoffPath), "utf8"));
  const launchIntakeResult = evaluateUatLaunchIntake(readFileSync(resolveFromRoot(rootDir, launchIntakePath), "utf8"));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(resolveFromRoot(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(resolveFromRoot(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(resolveFromRoot(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(resolveFromRoot(rootDir, manifestPath), "utf8"));
  const evidenceReferenceResult = evaluateEvidenceReferencesFromFiles(rootDir, manifestPath);
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(resolveFromRoot(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(resolveFromRoot(rootDir, signoffRegisterPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult,
    evidenceReferenceResult,
    defectRegisterResult,
    signoffRegisterResult
  });

  return generateV1GoNoGoMeetingMarkdown({
    generatedAt,
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
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
    kickoffPath
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
      parsed.outputPath = argv[index + 1] ?? DEFAULT_OUTPUT_PATH;
      index += 1;
    }
  }

  return parsed;
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  const markdown = generateV1GoNoGoMeetingFromFiles(args);
  if (args.outputPath) {
    writeFileSync(resolveFromRoot(args.rootDir, args.outputPath), markdown);
  } else {
    console.log(markdown.trimEnd());
  }
}
