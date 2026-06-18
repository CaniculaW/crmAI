#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateReadinessSnapshot, readSnapshot } from "./v1-uat-readiness-check.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";

const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

export function evaluateV1ReleaseGate({ readinessResult, uatEvidenceResult }) {
  const checks = [
    makeCheck(
      "rc-uat-readiness",
      readinessResult.ok,
      readinessResult.ok
        ? "RC/UAT engineering readiness evidence is complete."
        : `RC/UAT readiness failed: ${readinessResult.failed.map((check) => check.id).join(", ")}`
    ),
    makeCheck(
      "uat-evidence-pack",
      uatEvidenceResult.ok,
      uatEvidenceResult.ok
        ? "UAT evidence pack satisfies all validation checks."
        : `UAT evidence pack failed: ${uatEvidenceResult.failed.map((check) => check.id).join(", ")}`
    ),
    makeCheck(
      "go-decision",
      uatEvidenceResult.decision === "Go",
      uatEvidenceResult.decision === "Go"
        ? "Project Go decision is explicit."
        : `Project decision is ${uatEvidenceResult.decision || "MISSING"}; V1 release gate requires Go.`
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision: uatEvidenceResult.decision,
    passed,
    failed,
    checks
  };
}

export function evaluateV1ReleaseGateFromFiles(rootDir = process.cwd(), evidencePath = DEFAULT_EVIDENCE_PATH) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const absoluteEvidencePath = path.resolve(rootDir, evidencePath);
  const uatEvidenceResult = evaluateUatEvidencePack(readFileSync(absoluteEvidencePath, "utf8"));

  return evaluateV1ReleaseGate({ readinessResult, uatEvidenceResult });
}

function printResult(result) {
  const lines = [
    "# V1 Release Gate",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    `Decision: ${result.decision || "MISSING"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means the V1 candidate has completed engineering readiness, formal UAT evidence validation, and an explicit project Go decision.");

  console.log(lines.join("\n"));
}

function printUsage() {
  console.error("Usage: node scripts/v1-release-gate.mjs [root-dir] [uat-evidence-pack.md]");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
    const evidencePath = process.argv[3] ?? DEFAULT_EVIDENCE_PATH;
    const result = evaluateV1ReleaseGateFromFiles(rootDir, evidencePath);
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
