import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateGeneratedDocsSnapshot } from "./v1-generated-docs-check.mjs";

const MARKDOWN_DOCS = [
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-uat-execution-pack.md",
  "docs/testing/v1-go-no-go-meeting.md",
  "docs/testing/v1-external-uat-request.md"
];

const DOCS = [
  ...MARKDOWN_DOCS,
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
