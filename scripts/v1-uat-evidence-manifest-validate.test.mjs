import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUatEvidenceManifest } from "./v1-uat-evidence-manifest-validate.mjs";

const requiredIds = [
  ...Array.from({ length: 6 }, (_, index) => `PRE-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 5 }, (_, index) => `SMK-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`),
  "DEF-REGISTER",
  "DEF-P0",
  "DEF-P1",
  "SIGNOFF-SALES",
  "SIGNOFF-MANAGER",
  "SIGNOFF-PRODUCT",
  "SIGNOFF-TEST",
  "SIGNOFF-DEV",
  "SIGNOFF-PM",
  "GO-NOGO"
];

const completeManifest = `# CRM V1 UAT Evidence Manifest

Version: v1.0.0-rc.8
Decision: Go

| Evidence ID | Type | Owner | Status | Evidence reference | Notes |
|---|---|---|---|---|---|
${requiredIds.map((id) => `| ${id} | UAT evidence | QA Owner | PASS | docs/testing/evidence/${id.toLowerCase()}.png | Verified |`).join("\n")}
`;

test("passes a complete UAT evidence manifest with every required evidence item", () => {
  const result = evaluateUatEvidenceManifest(completeManifest);

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("fails the current draft manifest because external UAT evidence is pending", () => {
  const draftManifest = `# CRM V1 UAT Evidence Manifest

Version: v1.0.0-rc.8
Decision: No-Go

| Evidence ID | Type | Owner | Status | Evidence reference | Notes |
|---|---|---|---|---|---|
| PRE-001 | 前置检查 | 测试 | PENDING | 待补充 | 具名测试环境待确认 |
| SMK-001 | Smoke | 测试 | PENDING | 待补充 | 待执行 |
| UAT-001 | 业务UAT | 销售侧验收人 | PENDING | 待补充 | 待业务验收 |
| DEF-P0 | 缺陷闭环 | 测试 | PENDING | 待补充 | P0缺陷汇总待填写 |
| SIGNOFF-SALES | 签署 | 销售侧验收人 | PENDING | 待补充 | 待签署 |
| GO-NOGO | 项目判定 | 项目负责人 | PENDING | 待补充 | Go/No-Go会议待召开 |
`;

  const result = evaluateUatEvidenceManifest(draftManifest);

  assert.equal(result.ok, false);
  assert.equal(result.decision, "No-Go");
  assert.ok(result.failed.some((check) => check.id === "required-items"));
  assert.ok(result.failed.some((check) => check.id === "evidence-complete"));
  assert.ok(result.failed.some((check) => check.id === "go-decision"));
});

test("fails when a PASS evidence row lacks a concrete reference", () => {
  const manifest = completeManifest.replace(
    "| UAT-006 | UAT evidence | QA Owner | PASS | docs/testing/evidence/uat-006.png | Verified |",
    "| UAT-006 | UAT evidence | QA Owner | PASS | 待补充 | Verified |"
  );

  const result = evaluateUatEvidenceManifest(manifest);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "evidence-references"));
});

test("fails when manifest text contains secret-like material", () => {
  const manifest = completeManifest.replace(
    "| SMK-003 | UAT evidence | QA Owner | PASS | docs/testing/evidence/smk-003.png | Verified |",
    "| SMK-003 | UAT evidence | QA Owner | PASS | docs/testing/evidence/smk-003.png | password=S3cure!123 |"
  );

  const result = evaluateUatEvidenceManifest(manifest);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});
