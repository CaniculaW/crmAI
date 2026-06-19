#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateV1ReleaseGateFromFiles } from "./v1-release-gate.mjs";

const DECISION_DOC_PATHS = [
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-go-no-go-meeting.md",
  "docs/testing/v1-external-uat-request.md"
];

const EXECUTION_PACK_PATH = "docs/testing/v1-uat-execution-pack.md";

const EXECUTION_ITEMS_BY_RELEASE_BLOCKER = {
  "kickoff-governance": ["KICKOFF-OWNERS", "KICKOFF-SCOPE", "KICKOFF-GO"],
  "uat-launch-intake": ["LAUNCH-ENV", "LAUNCH-ROSTER", "LAUNCH-ACCOUNTS", "LAUNCH-GO"],
  "uat-environment": ["ENV-001", "ENV-008"],
  "uat-evidence-pack": ["UAT-001", "UAT-010", "DEF-P0", "DEF-P1", "SIGNOFF-PM", "GO-NOGO"],
  "uat-evidence-manifest": ["PRE-001", "UAT-010", "DEF-REGISTER", "SIGNOFF-REGISTER", "GO-NOGO"],
  "uat-defect-register": ["DEF-REGISTER", "DEF-P0", "DEF-P1"],
  "uat-signoff-register": ["SIGNOFF-SALES", "SIGNOFF-MANAGER", "SIGNOFF-PRODUCT", "SIGNOFF-TEST", "SIGNOFF-DEV", "SIGNOFF-PM"],
  "uat-execution-tracker": ["PRE-001", "SMK-001", "UAT-001", "DEF-REGISTER", "GO-NOGO"],
  "go-decision": ["GO-NOGO"]
};

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function releaseBlockers(releaseGateResult) {
  return (releaseGateResult.failed ?? []).map((check) => ({
    id: check.id,
    token: `Release Gate/${check.id}`
  }));
}

function missingDecisionDocBlockers(releaseGateResult, documents) {
  const blockers = releaseBlockers(releaseGateResult);
  return DECISION_DOC_PATHS.flatMap((docPath) => {
    const text = documents[docPath] ?? "";
    return blockers
      .filter((blocker) => !text.includes(blocker.token))
      .map((blocker) => ({ docPath, blocker: blocker.token }));
  });
}

function missingExecutionPackItems(releaseGateResult, documents) {
  const executionPack = documents[EXECUTION_PACK_PATH] ?? "";
  return releaseBlockers(releaseGateResult).flatMap((blocker) => {
    const expectedItems = EXECUTION_ITEMS_BY_RELEASE_BLOCKER[blocker.id] ?? [];
    return expectedItems
      .filter((item) => !executionPack.includes(item))
      .map((item) => ({ blocker: blocker.token, item }));
  });
}

export function evaluateV1BlockerConsistencySnapshot({ releaseGateResult, documents }) {
  const missingReleaseBlockers = missingDecisionDocBlockers(releaseGateResult, documents);
  const missingExecutionItems = missingExecutionPackItems(releaseGateResult, documents);
  const executionPack = documents[EXECUTION_PACK_PATH] ?? "";
  const hasReleaseGateCommand = executionPack.includes("node scripts/v1-release-gate.mjs");

  const checks = [
    makeCheck(
      "decision-doc-release-blockers",
      missingReleaseBlockers.length === 0,
      missingReleaseBlockers.length === 0
        ? "Decision documents list every current release-gate blocker."
        : `Decision documents are missing release-gate blockers: ${missingReleaseBlockers.map((item) => `${item.docPath} -> ${item.blocker}`).join(", ")}`
    ),
    makeCheck(
      "execution-pack-blocker-items",
      missingExecutionItems.length === 0,
      missingExecutionItems.length === 0
        ? "UAT execution pack contains action items for every current release-gate blocker."
        : `UAT execution pack is missing blocker action items: ${missingExecutionItems.map((item) => `${item.blocker} -> ${item.item}`).join(", ")}`
    ),
    makeCheck(
      "execution-pack-release-gate-command",
      hasReleaseGateCommand,
      hasReleaseGateCommand
        ? "UAT execution pack includes the final release-gate command."
        : "UAT execution pack is missing the final release-gate command."
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    missingReleaseBlockers,
    missingExecutionItems,
    passed,
    failed,
    checks
  };
}

export function evaluateV1BlockerConsistencyFromFiles(rootDir = process.cwd()) {
  const documents = {};
  for (const docPath of [...DECISION_DOC_PATHS, EXECUTION_PACK_PATH]) {
    documents[docPath] = readFileSync(path.join(rootDir, docPath), "utf8");
  }

  return evaluateV1BlockerConsistencySnapshot({
    releaseGateResult: evaluateV1ReleaseGateFromFiles(rootDir),
    documents
  });
}

function printResult(result) {
  const lines = [
    "# V1 Blocker Consistency Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means current release-gate blockers are visible in decision materials and mapped to actionable UAT execution items. It does not prove business UAT or signoff completion.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateV1BlockerConsistencyFromFiles(rootDir);
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
