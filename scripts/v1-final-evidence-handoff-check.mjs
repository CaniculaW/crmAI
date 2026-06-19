#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HANDOFF_DOC_PATHS = [
  "README.md",
  "docs/releases/v1.0.0-rc.8.md",
  "docs/testing/v1-automated-validation-report-2026-06-18.md",
  "docs/testing/crm-v1-test-environment-validation-runbook.md",
  "docs/testing/crm-v1-acceptance-checklist.md"
];

const STATUS_PATH = "docs/testing/v1-release-gate-status.json";

const REQUIRED_HANDOFF_COMMANDS = [
  "node scripts/v1-uat-readiness-check.mjs",
  "node scripts/v1-generated-docs-check.mjs",
  "node scripts/v1-release-gate-status-check.mjs",
  "node scripts/v1-blocker-consistency-check.mjs",
  "node scripts/v1-secret-scan-check.mjs",
  "node scripts/v1-release-gate.mjs"
];

const REQUIRED_NO_GO_BLOCKER_TERMS = [
  "具名测试环境",
  "业务验收签署",
  "仍需"
];

const FINAL_GO_CLAIM_PATTERNS = [
  /V1\s*(?:项目)?验收通过/,
  /项目\s*V1\s*验收通过/,
  /可正式发布/,
  /正式发布版本/,
  /准出通过/,
  /放行通过/,
  /最终放行门禁.*PASS/
];

const CAVEAT_PATTERN = /仍需|待|不能|不可|才(?:能|应)|必须|前|后|若|不替代|不代表|准备|模板|示例|用于|防止|覆盖|要求|通过标准|不是正式|expected|as expected|完整 Go|只有|No-Go|FAIL/;

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function parseReleaseGateStatus(statusText) {
  try {
    return { value: JSON.parse(statusText), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

function isNoGoStatus(status) {
  return status?.ok === false || status?.result === "FAIL" || status?.decision === "No-Go";
}

function claimsFinalGo(line) {
  return FINAL_GO_CLAIM_PATTERNS.some((pattern) => pattern.test(line))
    && !CAVEAT_PATTERN.test(line);
}

function misleadingFinalGoClaims(documents) {
  return HANDOFF_DOC_PATHS.flatMap((docPath) => {
    const text = documents[docPath] ?? "";
    return text
      .split("\n")
      .map((line, index) => ({ docPath, line: index + 1, text: line.trim() }))
      .filter((item) => claimsFinalGo(item.text));
  });
}

export function evaluateV1FinalEvidenceHandoffSnapshot(documents) {
  const missingDocs = [...HANDOFF_DOC_PATHS, STATUS_PATH].filter((docPath) => {
    const text = documents[docPath];
    return typeof text !== "string" || text.trim().length === 0;
  });
  const handoffText = HANDOFF_DOC_PATHS.map((docPath) => documents[docPath] ?? "").join("\n");
  const parsedStatus = parseReleaseGateStatus(documents[STATUS_PATH] ?? "");
  const status = parsedStatus.value;
  const noGoStatus = isNoGoStatus(status);
  const missingCommands = REQUIRED_HANDOFF_COMMANDS.filter((command) => !handoffText.includes(command));
  const missingBlockerTerms = noGoStatus
    ? REQUIRED_NO_GO_BLOCKER_TERMS.filter((term) => !handoffText.includes(term))
    : [];
  const misleadingClaims = noGoStatus ? misleadingFinalGoClaims(documents) : [];

  const checks = [
    makeCheck(
      "handoff-materials-present",
      missingDocs.length === 0,
      missingDocs.length === 0
        ? "Final evidence handoff materials are present."
        : `Final evidence handoff materials are missing: ${missingDocs.join(", ")}`
    ),
    makeCheck(
      "release-gate-status-readable",
      parsedStatus.error === null
        && typeof status?.result === "string"
        && typeof status?.ok === "boolean"
        && typeof status?.decision === "string",
      parsedStatus.error === null
        ? "Release gate status JSON is readable by the final evidence handoff check."
        : `Release gate status JSON is invalid: ${parsedStatus.error.message}`
    ),
    makeCheck(
      "handoff-command-coverage",
      missingCommands.length === 0,
      missingCommands.length === 0
        ? "Final handoff materials list every required V1 verification command."
        : `Final handoff materials are missing commands: ${missingCommands.join(", ")}`
    ),
    makeCheck(
      "external-blockers-visible",
      missingBlockerTerms.length === 0,
      missingBlockerTerms.length === 0
        ? "External UAT and signoff blockers remain visible while V1 is No-Go."
        : `No-Go handoff materials hide blocker terms: ${missingBlockerTerms.join(", ")}`
    ),
    makeCheck(
      "no-go-handoff-guardrail",
      misleadingClaims.length === 0,
      misleadingClaims.length === 0
        ? "No-Go handoff materials do not claim final V1 acceptance or formal release."
        : `No-Go handoff materials contain misleading final Go claims: ${misleadingClaims.map((item) => `${item.docPath}:${item.line}`).join(", ")}`
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    passed,
    failed,
    checks,
    missingCommands,
    missingBlockerTerms,
    misleadingClaims
  };
}

export function readFinalEvidenceHandoffSnapshot(rootDir = process.cwd()) {
  const documents = {};
  for (const docPath of [...HANDOFF_DOC_PATHS, STATUS_PATH]) {
    const absolutePath = path.join(rootDir, docPath);
    if (existsSync(absolutePath)) {
      documents[docPath] = readFileSync(absolutePath, "utf8");
    }
  }
  return documents;
}

function printResult(result) {
  const lines = [
    "# V1 Final Evidence Handoff Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means final handoff materials keep required verification commands, release gate status, and No-Go blockers aligned. It does not prove external UAT or business signoff completion.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateV1FinalEvidenceHandoffSnapshot(readFinalEvidenceHandoffSnapshot(rootDir));
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
