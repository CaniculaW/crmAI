#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateV1GoNoGoMeetingFromFiles } from "./v1-go-no-go-meeting.mjs";
import { generateV1UatActionPlanFromFiles } from "./v1-uat-action-plan.mjs";
import { generateV1UatExecutionPackFromFiles } from "./v1-uat-execution-pack.mjs";
import { generateV1ValidationStatusFromFiles } from "./v1-validation-status.mjs";

const GENERATED_DOC_PATHS = [
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-uat-execution-pack.md",
  "docs/testing/v1-go-no-go-meeting.md"
];

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function readFile(rootDir, docPath) {
  return readFileSync(path.join(rootDir, docPath), "utf8");
}

function metadataValue(markdown, label) {
  const match = markdown.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim();
}

function generatedAtFrom(rootDir, docPath) {
  return metadataValue(readFile(rootDir, docPath), "Generated at");
}

function gitCommitFrom(rootDir, docPath) {
  return metadataValue(readFile(rootDir, docPath), "Git commit");
}

function defaultGenerators(rootDir) {
  return {
    "docs/testing/v1-validation-status.md": () => generateV1ValidationStatusFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-validation-status.md"),
      gitCommit: gitCommitFrom(rootDir, "docs/testing/v1-validation-status.md")
    }),
    "docs/testing/v1-uat-action-plan.md": () => generateV1UatActionPlanFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-uat-action-plan.md")
    }),
    "docs/testing/v1-uat-execution-pack.md": () => generateV1UatExecutionPackFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-uat-execution-pack.md")
    }),
    "docs/testing/v1-go-no-go-meeting.md": () => generateV1GoNoGoMeetingFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-go-no-go-meeting.md")
    })
  };
}

export function evaluateGeneratedDocsSnapshot({
  rootDir = process.cwd(),
  generators = defaultGenerators(rootDir)
} = {}) {
  const checks = GENERATED_DOC_PATHS.map((docPath) => {
    const absolutePath = path.join(rootDir, docPath);
    if (!existsSync(absolutePath)) {
      return makeCheck(docPath, false, `Generated document is missing: ${docPath}.`);
    }

    const generator = generators[docPath];
    if (typeof generator !== "function") {
      return makeCheck(docPath, false, `Generated document has no registered generator: ${docPath}.`);
    }

    const current = readFileSync(absolutePath, "utf8");
    const regenerated = generator();
    return makeCheck(
      docPath,
      current === regenerated,
      current === regenerated
        ? `Generated document is current: ${docPath}.`
        : `Generated document is stale: ${docPath}. Re-run its generator.`
    );
  });

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    passed,
    failed,
    checks
  };
}

function printResult(result) {
  const lines = [
    "# V1 Generated Docs Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means generated V1 status, action, execution, and Go/No-Go documents match their current generator outputs.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateGeneratedDocsSnapshot({ rootDir });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
