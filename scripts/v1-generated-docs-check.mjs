#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateV1GoNoGoMeetingFromFiles } from "./v1-go-no-go-meeting.mjs";
import {
  generateV1ExternalUatBlockersFromFiles,
  generateV1ExternalUatClosureChecklistFromFiles,
  generateV1ExternalUatEvidenceIntakeFromFiles,
  generateV1ExternalUatRequestFromFiles,
  generateV1NextClosurePhaseFromFiles
} from "./v1-external-uat-request.mjs";
import { generateV1UatActionPlanFromFiles } from "./v1-uat-action-plan.mjs";
import { generateV1UatExecutionPackFromFiles } from "./v1-uat-execution-pack.mjs";
import { generateV1ValidationStatusFromFiles } from "./v1-validation-status.mjs";
import { evaluateV1ReleaseGateFromFiles, renderResult } from "./v1-release-gate.mjs";
import { generateKickoffGovernanceClosureIntakeMarkdown } from "./v1-kickoff-governance-closure-intake.mjs";
import { generateV1ProgressTodoFromFiles } from "./v1-progress-todo.mjs";

const GENERATED_DOC_PATHS = [
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-uat-execution-pack.md",
  "docs/testing/v1-go-no-go-meeting.md",
  "docs/meeting-notes/crm-kickoff-governance-closure-intake.md",
  "docs/testing/v1-progress-todo.md",
  "docs/testing/v1-external-uat-request.md",
  "docs/testing/v1-external-uat-closure-checklist.md",
  "docs/testing/v1-external-uat-evidence-intake.md",
  "docs/testing/v1-next-closure-phase.md",
  "docs/testing/v1-external-uat-blockers.json",
  "docs/testing/v1-release-gate-status.json"
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

function readGitCommit(rootDir) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    // Fall back to reading .git directly for lightweight fixture repositories.
  }
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

function readPreviousGitCommit(rootDir) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD^"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "unknown";
  }
}

function allowedValidationStatusCommits(rootDir) {
  return [readGitCommit(rootDir), readPreviousGitCommit(rootDir)].filter((commit) => commit !== "unknown");
}

export function selectValidationStatusGitCommit({
  existingGitCommit,
  allowedGitCommits,
  currentGitCommit
}) {
  return allowedGitCommits.includes(existingGitCommit) ? existingGitCommit : currentGitCommit;
}

function defaultGenerators(rootDir) {
  const currentGitCommit = readGitCommit(rootDir);
  const allowedGitCommits = allowedValidationStatusCommits(rootDir);
  const statusGitCommit = gitCommitFrom(rootDir, "docs/testing/v1-validation-status.md");
  return {
    "docs/testing/v1-validation-status.md": () => generateV1ValidationStatusFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-validation-status.md"),
      gitCommit: currentGitCommit === "unknown"
        ? gitCommitFrom(rootDir, "docs/testing/v1-validation-status.md")
        : selectValidationStatusGitCommit({
          existingGitCommit: statusGitCommit,
          allowedGitCommits,
          currentGitCommit
        })
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
    }),
    "docs/meeting-notes/crm-kickoff-governance-closure-intake.md": () => generateKickoffGovernanceClosureIntakeMarkdown({
      generatedAt: generatedAtFrom(rootDir, "docs/meeting-notes/crm-kickoff-governance-closure-intake.md")
    }),
    "docs/testing/v1-progress-todo.md": () => generateV1ProgressTodoFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-progress-todo.md")
    }),
    "docs/testing/v1-external-uat-request.md": () => generateV1ExternalUatRequestFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-external-uat-request.md")
    }),
    "docs/testing/v1-external-uat-closure-checklist.md": () => generateV1ExternalUatClosureChecklistFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-external-uat-closure-checklist.md")
    }),
    "docs/testing/v1-external-uat-evidence-intake.md": () => generateV1ExternalUatEvidenceIntakeFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-external-uat-evidence-intake.md")
    }),
    "docs/testing/v1-next-closure-phase.md": () => generateV1NextClosurePhaseFromFiles({
      rootDir,
      generatedAt: generatedAtFrom(rootDir, "docs/testing/v1-next-closure-phase.md")
    }),
    "docs/testing/v1-external-uat-blockers.json": () => generateV1ExternalUatBlockersFromFiles({
      rootDir,
      generatedAt: JSON.parse(readFile(rootDir, "docs/testing/v1-external-uat-blockers.json")).generatedAt
    }),
    "docs/testing/v1-release-gate-status.json": () => renderResult(
      evaluateV1ReleaseGateFromFiles(rootDir),
      "json"
    )
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
  const allowedGitCommits = allowedValidationStatusCommits(rootDir);
  if (allowedGitCommits.length > 0) {
    const statusGitCommit = gitCommitFrom(rootDir, "docs/testing/v1-validation-status.md");
    const commitIsAllowed = allowedGitCommits.includes(statusGitCommit);
    checks.push(makeCheck(
      "validation-status-current-commit",
      commitIsAllowed,
      commitIsAllowed
        ? "Validation status document is bound to the current or immediately previous git commit."
        : `Validation status document git commit is stale: ${statusGitCommit ?? "missing"}; expected one of ${allowedGitCommits.join(", ")}.`
    ));
  }

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
  lines.push("Note: PASS means generated V1 status, action, execution, Go/No-Go, kickoff governance closure intake, progress TODO, external UAT request, external UAT closure checklist, external UAT evidence intake, next closure phase handoff, external UAT blockers JSON, and release gate JSON snapshot documents match their current generator outputs.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateGeneratedDocsSnapshot({ rootDir });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
