import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  evaluateGeneratedDocsSnapshot,
  selectValidationStatusGitCommit
} from "./v1-generated-docs-check.mjs";

const MARKDOWN_DOCS = [
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-uat-execution-pack.md",
  "docs/testing/v1-go-no-go-meeting.md",
  "docs/testing/v1-external-uat-request.md",
  "docs/testing/v1-external-uat-closure-checklist.md"
];

const DOCS = [
  ...MARKDOWN_DOCS,
  "docs/testing/v1-external-uat-blockers.json",
  "docs/testing/v1-release-gate-status.json"
];

function writeSnapshot(files) {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), "v1-generated-docs-"));
  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDir, filePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }
  return rootDir;
}

test("passes when generated documents match their regenerated content", () => {
  const content = "# Generated\n\nCurrent content\n";
  const rootDir = writeSnapshot(Object.fromEntries(DOCS.map((docPath) => [docPath, content])));

  const result = evaluateGeneratedDocsSnapshot({
    rootDir,
    generators: Object.fromEntries(DOCS.map((docPath) => [docPath, () => content]))
  });

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
});

test("fails when a generated document drifts from its generator", () => {
  const rootDir = writeSnapshot({
    "docs/testing/v1-validation-status.md": "# Generated\n\nCurrent content\n",
    "docs/testing/v1-uat-action-plan.md": "# Generated\n\nCurrent content\n",
    "docs/testing/v1-uat-execution-pack.md": "# Generated\n\nCurrent content\n",
    "docs/testing/v1-go-no-go-meeting.md": "# Generated\n\nCurrent content\n",
    "docs/testing/v1-external-uat-request.md": "# Generated\n\nStale external request\n",
    "docs/testing/v1-external-uat-closure-checklist.md": "# Generated\n\nCurrent content\n",
    "docs/testing/v1-external-uat-blockers.json": "{\"status\":\"External UAT Evidence Required\"}\n",
    "docs/testing/v1-release-gate-status.json": "{\"result\":\"FAIL\"}\n"
  });

  const result = evaluateGeneratedDocsSnapshot({
    rootDir,
    generators: {
      "docs/testing/v1-validation-status.md": () => "# Generated\n\nCurrent content\n",
      "docs/testing/v1-uat-action-plan.md": () => "# Generated\n\nCurrent content\n",
      "docs/testing/v1-uat-execution-pack.md": () => "# Generated\n\nCurrent content\n",
      "docs/testing/v1-go-no-go-meeting.md": () => "# Generated\n\nCurrent content\n",
      "docs/testing/v1-external-uat-request.md": () => "# Generated\n\nCurrent content\n",
      "docs/testing/v1-external-uat-closure-checklist.md": () => "# Generated\n\nCurrent content\n",
      "docs/testing/v1-external-uat-blockers.json": () => "{\"status\":\"External UAT Evidence Required\"}\n",
      "docs/testing/v1-release-gate-status.json": () => "{\"result\":\"FAIL\"}\n"
    }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.failed.map((check) => check.id), ["docs/testing/v1-external-uat-request.md"]);
  assert.match(result.failed[0].message, /is stale/);
});

test("fails when the generated release gate JSON snapshot is missing", () => {
  const content = "# Generated\n\nCurrent content\n";
  const rootDir = writeSnapshot(Object.fromEntries(MARKDOWN_DOCS.map((docPath) => [docPath, content])));

  const result = evaluateGeneratedDocsSnapshot({
    rootDir,
    generators: Object.fromEntries(DOCS.map((docPath) => [docPath, () => content]))
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "docs/testing/v1-release-gate-status.json"));
});

test("fails when the generated external UAT blockers JSON snapshot is missing", () => {
  const content = "# Generated\n\nCurrent content\n";
  const rootDir = writeSnapshot({
    ...Object.fromEntries(MARKDOWN_DOCS.map((docPath) => [docPath, content])),
    "docs/testing/v1-release-gate-status.json": "{\"result\":\"FAIL\"}\n"
  });

  const result = evaluateGeneratedDocsSnapshot({
    rootDir,
    generators: Object.fromEntries(DOCS.map((docPath) => [docPath, () => content]))
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "docs/testing/v1-external-uat-blockers.json"));
});

test("fails when the generated external UAT closure checklist is missing", () => {
  const content = "# Generated\n\nCurrent content\n";
  const rootDir = writeSnapshot({
    "docs/testing/v1-validation-status.md": content,
    "docs/testing/v1-uat-action-plan.md": content,
    "docs/testing/v1-uat-execution-pack.md": content,
    "docs/testing/v1-go-no-go-meeting.md": content,
    "docs/testing/v1-external-uat-request.md": content,
    "docs/testing/v1-external-uat-blockers.json": "{\"status\":\"External UAT Evidence Required\"}\n",
    "docs/testing/v1-release-gate-status.json": "{\"result\":\"FAIL\"}\n"
  });

  const result = evaluateGeneratedDocsSnapshot({
    rootDir,
    generators: Object.fromEntries(DOCS.map((docPath) => [docPath, () => content]))
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "docs/testing/v1-external-uat-closure-checklist.md"));
});

test("fails when the validation status document is not bound to the current git commit", () => {
  const currentCommit = "b3f6b280935698e8bf4625412989fd7ddacfa35b";
  const staleCommit = "5bdd8ab7772b3c57b799c5c65db417b7da21db6d";
  const validationStatus = [
    "# CRM V1 Validation Status",
    "",
    "Generated at: 2026-06-20T06:44:19.125Z",
    `Git commit: ${staleCommit}`,
    "",
    "Overall: No-Go",
    ""
  ].join("\n");
  const content = "# Generated\n\nCurrent content\n";
  const rootDir = writeSnapshot({
    "docs/testing/v1-validation-status.md": validationStatus,
    "docs/testing/v1-uat-action-plan.md": content,
    "docs/testing/v1-uat-execution-pack.md": content,
    "docs/testing/v1-go-no-go-meeting.md": content,
    "docs/testing/v1-external-uat-request.md": content,
    "docs/testing/v1-external-uat-closure-checklist.md": content,
    "docs/testing/v1-external-uat-blockers.json": "{\"status\":\"External UAT Evidence Required\"}\n",
    "docs/testing/v1-release-gate-status.json": "{\"result\":\"FAIL\"}\n",
    ".git/HEAD": "ref: refs/heads/main\n",
    ".git/refs/heads/main": `${currentCommit}\n`
  });

  const result = evaluateGeneratedDocsSnapshot({
    rootDir,
    generators: {
      "docs/testing/v1-validation-status.md": () => validationStatus,
      "docs/testing/v1-uat-action-plan.md": () => content,
      "docs/testing/v1-uat-execution-pack.md": () => content,
      "docs/testing/v1-go-no-go-meeting.md": () => content,
      "docs/testing/v1-external-uat-request.md": () => content,
      "docs/testing/v1-external-uat-closure-checklist.md": () => content,
      "docs/testing/v1-external-uat-blockers.json": () => "{\"status\":\"External UAT Evidence Required\"}\n",
      "docs/testing/v1-release-gate-status.json": () => "{\"result\":\"FAIL\"}\n"
    }
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "validation-status-current-commit"));
});

test("reuses an immediately previous validation status commit during regeneration", () => {
  const currentCommit = "8c4f596a9a9c4b02d95b4b6f82d2e6c4c2f0c111";
  const previousCommit = "b3f6b280935698e8bf4625412989fd7ddacfa35b";

  assert.equal(
    selectValidationStatusGitCommit({
      existingGitCommit: previousCommit,
      allowedGitCommits: [currentCommit, previousCommit],
      currentGitCommit: currentCommit
    }),
    previousCommit
  );
});
