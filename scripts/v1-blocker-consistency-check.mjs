#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateV1ReleaseGateFromFiles } from "./v1-release-gate.mjs";

const DEFAULT_DECISION_DOC_PATHS = [
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-go-no-go-meeting.md",
  "docs/testing/v1-external-uat-request.md"
];

const DEFAULT_EXECUTION_PACK_PATH = "docs/testing/v1-uat-execution-pack.md";

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

function resolveFromRoot(rootDir, filePath) {
  return path.resolve(rootDir, filePath);
}

function missingDecisionDocBlockers(releaseGateResult, documents, decisionDocPaths = DEFAULT_DECISION_DOC_PATHS) {
  const blockers = releaseBlockers(releaseGateResult);
  return decisionDocPaths.flatMap((docPath) => {
    const text = documents[docPath] ?? "";
    return blockers
      .filter((blocker) => !text.includes(blocker.token))
      .map((blocker) => ({ docPath, blocker: blocker.token }));
  });
}

function missingExecutionPackItems(releaseGateResult, documents, executionPackPath = DEFAULT_EXECUTION_PACK_PATH) {
  const executionPack = documents[executionPackPath] ?? "";
  return releaseBlockers(releaseGateResult).flatMap((blocker) => {
    const expectedItems = EXECUTION_ITEMS_BY_RELEASE_BLOCKER[blocker.id] ?? [];
    return expectedItems
      .filter((item) => !executionPack.includes(item))
      .map((item) => ({ blocker: blocker.token, item }));
  });
}

export function evaluateV1BlockerConsistencySnapshot({
  releaseGateResult,
  documents,
  decisionDocPaths = DEFAULT_DECISION_DOC_PATHS,
  executionPackPath = DEFAULT_EXECUTION_PACK_PATH
}) {
  const missingReleaseBlockers = missingDecisionDocBlockers(releaseGateResult, documents, decisionDocPaths);
  const missingExecutionItems = missingExecutionPackItems(releaseGateResult, documents, executionPackPath);
  const executionPack = documents[executionPackPath] ?? "";
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

function normalizeFromFilesOptions(options) {
  if (typeof options === "string") {
    return { rootDir: options };
  }
  return options ?? {};
}

export function parseArgs(argv) {
  const parsed = {
    rootDir: process.cwd(),
    decisionDocPaths: [],
    executionPackPath: DEFAULT_EXECUTION_PACK_PATH,
    evidencePath: undefined,
    trackerPath: undefined,
    manifestPath: undefined,
    defectRegisterPath: undefined,
    environmentPath: undefined,
    signoffRegisterPath: undefined,
    launchIntakePath: undefined,
    kickoffPath: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.rootDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--decision-doc") {
      parsed.decisionDocPaths.push(argv[index + 1]);
      index += 1;
    } else if (arg === "--execution-pack") {
      parsed.executionPackPath = argv[index + 1];
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
    } else if (!arg.startsWith("--")) {
      parsed.rootDir = path.resolve(arg);
    }
  }

  if (parsed.decisionDocPaths.length === 0) {
    parsed.decisionDocPaths = DEFAULT_DECISION_DOC_PATHS;
  }

  return parsed;
}

export function evaluateV1BlockerConsistencyFromFiles(options = process.cwd()) {
  const {
    rootDir = process.cwd(),
    decisionDocPaths = DEFAULT_DECISION_DOC_PATHS,
    executionPackPath = DEFAULT_EXECUTION_PACK_PATH,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  } = normalizeFromFilesOptions(options);

  const documents = {};
  for (const docPath of [...decisionDocPaths, executionPackPath]) {
    documents[docPath] = readFileSync(resolveFromRoot(rootDir, docPath), "utf8");
  }

  return evaluateV1BlockerConsistencySnapshot({
    releaseGateResult: evaluateV1ReleaseGateFromFiles(
      rootDir,
      evidencePath,
      trackerPath,
      manifestPath,
      defectRegisterPath,
      environmentPath,
      signoffRegisterPath,
      launchIntakePath,
      kickoffPath
    ),
    documents,
    decisionDocPaths,
    executionPackPath
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
  const result = evaluateV1BlockerConsistencyFromFiles(parseArgs(process.argv.slice(2)));
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
