#!/usr/bin/env node

import { readFileSync } from "node:fs";
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
import { evaluateEvidenceReferencesFromFiles } from "./v1-evidence-reference-check.mjs";

const DEFAULT_REQUEST_PATH = "docs/testing/v1-external-uat-request.md";
const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";
const DEFAULT_TRACKER_PATH = "docs/testing/crm-v1-uat-execution-tracker.md";
const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";
const DEFAULT_DEFECT_REGISTER_PATH = "docs/testing/v1-uat-defect-register.md";
const DEFAULT_ENVIRONMENT_PATH = "docs/testing/v1-uat-environment-evidence.md";
const DEFAULT_SIGNOFF_REGISTER_PATH = "docs/testing/v1-uat-signoff-register.md";
const DEFAULT_LAUNCH_INTAKE_PATH = "docs/testing/v1-uat-launch-intake.md";
const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";

const REQUIRED_COMMANDS = [
  "node scripts/v1-kickoff-governance-validate.mjs",
  "node scripts/v1-uat-launch-intake-validate.mjs",
  "node scripts/v1-uat-environment-validate.mjs",
  "node scripts/v1-uat-evidence-pack-validate.mjs",
  "node scripts/v1-uat-evidence-manifest-validate.mjs",
  "node scripts/v1-evidence-reference-check.mjs",
  "node scripts/v1-uat-execution-tracker-validate.mjs",
  "node scripts/v1-uat-defect-register-validate.mjs",
  "node scripts/v1-uat-signoff-register-validate.mjs",
  "node scripts/v1-release-gate.mjs"
];

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function failedBlockerIds(label, result) {
  return (result.failed ?? []).map((check) => `${label}/${check.id}`);
}

function expectedBlockers({
  readinessResult,
  kickoffResult,
  launchIntakeResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  releaseGateResult
}) {
  return [
    ...failedBlockerIds("Readiness", readinessResult),
    ...failedBlockerIds("Kickoff Governance", kickoffResult),
    ...failedBlockerIds("UAT Launch Intake", launchIntakeResult),
    ...failedBlockerIds("UAT Environment Evidence", environmentResult),
    ...failedBlockerIds("UAT Evidence Pack", evidenceResult),
    ...failedBlockerIds("UAT Evidence Manifest", manifestResult),
    ...failedBlockerIds("UAT Evidence References", evidenceReferenceResult),
    ...failedBlockerIds("UAT Execution Tracker", trackerResult),
    ...failedBlockerIds("UAT Defect Register", defectRegisterResult),
    ...failedBlockerIds("UAT Signoff Register", signoffRegisterResult),
    ...failedBlockerIds("Release Gate", releaseGateResult)
  ];
}

function resolveFromRoot(rootDir, filePath) {
  return path.resolve(rootDir, filePath);
}

export function evaluateV1ExternalUatRequestCoverageSnapshot({
  requestText,
  readinessResult,
  kickoffResult,
  launchIntakeResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  releaseGateResult
}) {
  const blockers = expectedBlockers({
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
    releaseGateResult
  });
  const missingBlockers = blockers.filter((blocker) => !requestText.includes(blocker));
  const missingCommands = REQUIRED_COMMANDS.filter((command) => !requestText.includes(command));
  const releaseGateIsGo = releaseGateResult.ok === true && releaseGateResult.decision === "Go";
  const statusIsOpen = /Request Status:\s*External UAT Evidence Required/.test(requestText);
  const statusIsClosed = /Request Status:\s*No External UAT Requests Open/.test(requestText);

  const checks = [
    makeCheck(
      "request-command-coverage",
      missingCommands.length === 0,
      missingCommands.length === 0
        ? "External UAT request packet lists every required validation command."
        : `External UAT request packet is missing validation commands: ${missingCommands.join(", ")}`
    ),
    makeCheck(
      "request-blocker-coverage",
      missingBlockers.length === 0,
      missingBlockers.length === 0
        ? "External UAT request packet lists every current failed validator check."
        : `External UAT request packet is missing failed validator checks: ${missingBlockers.join(", ")}`
    ),
    makeCheck(
      "request-status-alignment",
      releaseGateIsGo ? statusIsClosed : statusIsOpen,
      releaseGateIsGo
        ? "External UAT request status is closed because the release gate is Go."
        : "External UAT request status remains open while the release gate is No-Go."
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    passed,
    failed,
    checks,
    missingBlockers,
    missingCommands
  };
}

export function evaluateV1ExternalUatRequestCoverageFromFiles({
  rootDir = process.cwd(),
  requestPath = DEFAULT_REQUEST_PATH,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const kickoffResult = evaluateKickoffGovernance(readFileSync(resolveFromRoot(rootDir, kickoffPath), "utf8"));
  const launchIntakeResult = evaluateUatLaunchIntake(readFileSync(resolveFromRoot(rootDir, launchIntakePath), "utf8"));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(resolveFromRoot(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(resolveFromRoot(rootDir, evidencePath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(resolveFromRoot(rootDir, manifestPath), "utf8"));
  const evidenceReferenceResult = evaluateEvidenceReferencesFromFiles(rootDir, manifestPath);
  const trackerResult = evaluateUatExecutionTracker(readFileSync(resolveFromRoot(rootDir, trackerPath), "utf8"));
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

  return evaluateV1ExternalUatRequestCoverageSnapshot({
    requestText: readFileSync(resolveFromRoot(rootDir, requestPath), "utf8"),
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
    releaseGateResult
  });
}

function printResult(result) {
  const lines = [
    "# V1 External UAT Request Coverage Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means the external UAT request packet lists every current failed validator check and the commands needed to close them. It does not prove external UAT completion.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateV1ExternalUatRequestCoverageFromFiles({ rootDir });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
