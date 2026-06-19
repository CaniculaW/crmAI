import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUatDefectRegister } from "./v1-uat-defect-register-validate.mjs";

const completeRegister = `# CRM V1 UAT Defect Register

Version: v1.0.0-rc.8
Decision: Go

## Severity Summary

| Severity | Total | Open | Closure evidence |
|---|---:|---:|---|
| P0 / S1 阻断 | 1 | 0 | docs/testing/evidence/defects/p0-regression.md |
| P1 / S2 严重 | 1 | 0 | docs/testing/evidence/defects/p1-regression.md |
| P2 / S3 一般 | 1 | 0 | docs/testing/evidence/defects/p2-triage.md |
| P3 / S4 轻微 | 0 | 0 | docs/testing/evidence/defects/p3-triage.md |

## Defect Details

| Defect ID | Severity | Source case | Status | Owner | Resolution | Regression evidence | Business decision |
|---|---|---|---|---|---|---|---|
| DEF-001 | P0 / S1 阻断 | UAT-004 | VERIFIED | Dev Owner | 修复客户保存失败 | docs/testing/evidence/defects/def-001-regression.png | 已关闭 |
| DEF-002 | P1 / S2 严重 | UAT-009 | VERIFIED | Dev Owner | 修复部门数据范围 | docs/testing/evidence/defects/def-002-regression.png | 已关闭 |
| DEF-003 | P2 / S3 一般 | UAT-007 | CLOSED | Product Owner | 纳入优化池 | docs/testing/evidence/defects/def-003-triage.md | 不影响试点 |
`;

test("passes a complete defect register with closed P0 and P1 defects", () => {
  const result = evaluateUatDefectRegister(completeRegister);

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("fails the current draft defect register because P0 and P1 closure evidence is pending", () => {
  const draftRegister = `# CRM V1 UAT Defect Register

Version: v1.0.0-rc.8
Decision: No-Go

| Severity | Total | Open | Closure evidence |
|---|---:|---:|---|
| P0 / S1 阻断 | 待填写 | 待填写 | 待补充 |
| P1 / S2 严重 | 待填写 | 待填写 | 待补充 |

| Defect ID | Severity | Source case | Status | Owner | Resolution | Regression evidence | Business decision |
|---|---|---|---|---|---|---|---|
| DEF-DRAFT | PENDING | 待补充 | PENDING | 待补充 | 待补充 | 待补充 | 待补充 |
`;

  const result = evaluateUatDefectRegister(draftRegister);

  assert.equal(result.ok, false);
  assert.equal(result.decision, "No-Go");
  assert.ok(result.failed.some((check) => check.id === "p0-p1-summary"));
  assert.ok(result.failed.some((check) => check.id === "defect-details"));
  assert.ok(result.failed.some((check) => check.id === "go-decision"));
});

test("fails when a P0 or P1 defect remains open", () => {
  const register = completeRegister.replace(
    "| P1 / S2 严重 | 1 | 0 | docs/testing/evidence/defects/p1-regression.md |",
    "| P1 / S2 严重 | 1 | 1 | docs/testing/evidence/defects/p1-regression.md |"
  ).replace(
    "| DEF-002 | P1 / S2 严重 | UAT-009 | VERIFIED | Dev Owner | 修复部门数据范围 | docs/testing/evidence/defects/def-002-regression.png | 已关闭 |",
    "| DEF-002 | P1 / S2 严重 | UAT-009 | OPEN | Dev Owner | 修复部门数据范围 | docs/testing/evidence/defects/def-002-regression.png | 待关闭 |"
  );

  const result = evaluateUatDefectRegister(register);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "p0-p1-open-defects"));
});

test("fails when a closed P0 or P1 defect lacks regression evidence", () => {
  const register = completeRegister.replace(
    "| DEF-001 | P0 / S1 阻断 | UAT-004 | VERIFIED | Dev Owner | 修复客户保存失败 | docs/testing/evidence/defects/def-001-regression.png | 已关闭 |",
    "| DEF-001 | P0 / S1 阻断 | UAT-004 | VERIFIED | Dev Owner | 修复客户保存失败 | 待补充 | 已关闭 |"
  );

  const result = evaluateUatDefectRegister(register);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "regression-evidence"));
});

test("fails when closed P0 or P1 regression evidence is not retained", () => {
  const register = completeRegister.replace(
    "docs/testing/evidence/defects/def-001-regression.png",
    "regression-note#def-001"
  );

  const result = evaluateUatDefectRegister(register);

  assert.equal(result.ok, false);
  assert.deepEqual(result.unretainedRegressionEvidenceDefects, ["DEF-001"]);
  assert.ok(result.failed.some((check) => check.id === "defect-evidence-retained"));
});

test("fails when defect register contains secret-like material", () => {
  const register = completeRegister.replace(
    "| DEF-003 | P2 / S3 一般 | UAT-007 | CLOSED | Product Owner | 纳入优化池 | docs/testing/evidence/defects/def-003-triage.md | 不影响试点 |",
    "| DEF-003 | P2 / S3 一般 | UAT-007 | CLOSED | Product Owner | password=S3cure!123 | docs/testing/evidence/defects/def-003-triage.md | 不影响试点 |"
  );

  const result = evaluateUatDefectRegister(register);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});
