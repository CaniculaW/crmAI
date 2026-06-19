import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateEvidenceReferences } from "./v1-evidence-reference-check.mjs";

function manifestRow({ id = "UAT-001", status = "PASS", reference = "`docs/testing/evidence/uat-001.png`" } = {}) {
  return `| ${id} | 业务UAT | 销售侧验收人 | ${status} | ${reference} | 验收证据 |`;
}

function manifest(rows, decision = "Go") {
  return `# CRM V1 UAT Evidence Manifest

Decision: ${decision}

| Evidence ID | Type | Owner | Status | Evidence reference | Notes |
|---|---|---|---|---|---|
${rows.join("\n")}
`;
}

test("fails a PASS evidence row when its repository artifact path is missing", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "crm-v1-evidence-refs-"));
  const result = evaluateEvidenceReferences({
    rootDir,
    manifestMarkdown: manifest([manifestRow()])
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "pass-reference-artifacts"));
  assert.match(result.failed.find((check) => check.id === "pass-reference-artifacts").message, /UAT-001/);
});

test("passes PASS evidence rows with existing repository artifacts or external URLs", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "crm-v1-evidence-refs-"));
  mkdirSync(path.join(rootDir, "docs/testing/evidence"), { recursive: true });
  writeFileSync(path.join(rootDir, "docs/testing/evidence/uat-001.png"), "screenshot-bytes");

  const result = evaluateEvidenceReferences({
    rootDir,
    manifestMarkdown: manifest([
      manifestRow(),
      manifestRow({ id: "GO-NOGO", reference: "https://github.com/CaniculaW/crmAI/actions/runs/27805306102" })
    ])
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.failed, []);
});

test("fails a PASS evidence row when its reference is not retained under docs or an external URL", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "crm-v1-evidence-refs-"));
  writeFileSync(path.join(rootDir, "README.md"), "project overview");

  const result = evaluateEvidenceReferences({
    rootDir,
    manifestMarkdown: manifest([
      manifestRow({ reference: "README.md" })
    ])
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "pass-reference-artifacts"));
  assert.match(result.failed.find((check) => check.id === "pass-reference-artifacts").message, /UAT-001/);
});

test("keeps current No-Go pending rows valid for reference checking while source documents are being collected", () => {
  const result = evaluateEvidenceReferences({
    rootDir: process.cwd(),
    manifestMarkdown: manifest([
      manifestRow({ id: "UAT-001", status: "PENDING", reference: "待补充" }),
      manifestRow({ id: "SIGNOFF-PM", status: "PENDING", reference: "待补充" })
    ], "No-Go")
  });

  assert.equal(result.ok, true);
});

test("fails when an evidence reference contains secret-like material", () => {
  const result = evaluateEvidenceReferences({
    rootDir: process.cwd(),
    manifestMarkdown: manifest([
      manifestRow({ reference: "`docs/testing/evidence/uat-001.png`; token=abc123" })
    ])
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});
