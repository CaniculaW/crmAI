#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_STATUS_PATH = "docs/testing/v1-release-gate-status.json";
const VALID_RESULTS = new Set(["PASS", "FAIL"]);
const VALID_DECISIONS = new Set(["Go", "Conditional Go", "No-Go", "MISSING"]);

export const REQUIRED_RELEASE_GATE_CHECK_IDS = [
  "rc-uat-readiness",
  "kickoff-governance",
  "uat-launch-intake",
  "uat-environment",
  "uat-evidence-pack",
  "uat-evidence-manifest",
  "uat-evidence-references",
  "uat-defect-register",
  "uat-signoff-register",
  "uat-execution-tracker",
  "go-decision"
];

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function parseSnapshot(snapshotText) {
  try {
    return { value: JSON.parse(snapshotText), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

function hasValidCheckShape(status) {
  return Array.isArray(status?.checks)
    && status.checks.length > 0
    && status.checks.every((check) => typeof check?.id === "string"
      && typeof check.ok === "boolean"
      && typeof check.message === "string");
}

function missingRequiredChecks(status) {
  const ids = new Set(Array.isArray(status?.checks) ? status.checks.map((check) => check?.id) : []);
  return REQUIRED_RELEASE_GATE_CHECK_IDS.filter((id) => !ids.has(id));
}

function resultIsConsistent(status) {
  if (!status || !VALID_RESULTS.has(status.result) || typeof status.ok !== "boolean") {
    return false;
  }

  const failedChecks = Array.isArray(status.checks)
    ? status.checks.filter((check) => check?.ok === false)
    : [];

  if (status.ok) {
    return status.result === "PASS" && failedChecks.length === 0;
  }

  return status.result === "FAIL" && failedChecks.length > 0;
}

function decisionIsConsistent(status) {
  if (!status || !VALID_RESULTS.has(status.result) || typeof status.ok !== "boolean" || !VALID_DECISIONS.has(status.decision)) {
    return false;
  }

  if (status.ok || status.result === "PASS") {
    return status.decision === "Go";
  }

  return status.decision !== "Go";
}

export function evaluateV1ReleaseGateStatusSnapshot(snapshotText) {
  const parsed = parseSnapshot(snapshotText);
  const status = parsed.value;
  const missing = missingRequiredChecks(status);

  const checks = [
    makeCheck(
      "valid-json",
      parsed.error === null,
      parsed.error === null
        ? "Release gate status snapshot is valid JSON."
        : `Release gate status snapshot is invalid JSON: ${parsed.error.message}`
    ),
    makeCheck(
      "result-shape",
      VALID_RESULTS.has(status?.result)
        && typeof status?.ok === "boolean"
        && VALID_DECISIONS.has(status?.decision),
      "Release gate status snapshot has stable result, ok, and decision fields."
    ),
    makeCheck(
      "check-shape",
      hasValidCheckShape(status),
      "Release gate status snapshot has a non-empty checks array with id, ok, and message fields."
    ),
    makeCheck(
      "required-checks",
      missing.length === 0,
      missing.length === 0
        ? "Release gate status snapshot includes every required V1 release gate check id."
        : `Release gate status snapshot is missing required check ids: ${missing.join(", ")}`
    ),
    makeCheck(
      "result-consistency",
      resultIsConsistent(status),
      "Release gate result, ok flag, and failed checks are consistent."
    ),
    makeCheck(
      "decision-consistency",
      decisionIsConsistent(status),
      "Release gate decision is consistent with result and ok flag."
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    missingRequiredChecks: missing,
    passed,
    failed,
    checks
  };
}

export function evaluateV1ReleaseGateStatusFromFiles(
  rootDir = process.cwd(),
  statusPath = DEFAULT_STATUS_PATH
) {
  const absoluteStatusPath = path.resolve(rootDir, statusPath);
  return evaluateV1ReleaseGateStatusSnapshot(readFileSync(absoluteStatusPath, "utf8"));
}

function printResult(result) {
  const lines = [
    "# V1 Release Gate Status JSON Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means docs/testing/v1-release-gate-status.json is valid JSON with the expected release-gate status shape and required check ids.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateV1ReleaseGateStatusFromFiles(rootDir);
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
