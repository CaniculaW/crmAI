import assert from "node:assert/strict";
import test from "node:test";

import { generateV1UatExecutionPackMarkdown } from "./v1-uat-execution-pack.mjs";

const failingEnvironment = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-summary", message: "Invalid environment summary items: 测试环境名称, 前端访问地址, 后端 API 地址, Git 提交号" },
    { id: "environment-checks", message: "Incomplete environment checks: ENV-001, ENV-004, ENV-008" }
  ]
};

const failingTracker = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "roles-assigned", message: "Roles pending assignment or status: 销售侧验收人, 管理侧验收人, 项目负责人" },
    { id: "pre-checks", message: "Incomplete PRE checks: PRE-001, PRE-006" },
    { id: "smoke-checks", message: "Incomplete SMK checks: SMK-001, SMK-005" },
    { id: "uat-cases", message: "Incomplete UAT cases: UAT-001, UAT-010" },
    { id: "release-gates", message: "Incomplete release gates: UAT证据包一致性, 项目签署" }
  ]
};

const failingManifest = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "evidence-complete", message: "Evidence rows not marked PASS: ENV-EVIDENCE, PRE-001, SMK-001, UAT-001, DEF-REGISTER, SIGNOFF-SALES, GO-NOGO" }
  ]
};

const failingDefectRegister = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "p0-p1-summary", message: "Invalid P0/P1 summary rows: P0 / S1 阻断, P1 / S2 严重" },
    { id: "defect-details", message: "Incomplete defect details: DEF-DRAFT" }
  ]
};

const failingEvidence = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "signoff-complete", message: "Incomplete signoff rows: 销售侧验收人, 项目负责人" }
  ]
};

const failingSignoffRegister = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "required-signoffs", message: "Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-PM" }
  ]
};

test("generates an executable UAT evidence collection pack from failed gates", () => {
  const markdown = generateV1UatExecutionPackMarkdown({
    generatedAt: "2026-06-19T04:00:00+08:00",
    environmentResult: failingEnvironment,
    trackerResult: failingTracker,
    manifestResult: failingManifest,
    defectRegisterResult: failingDefectRegister,
    signoffRegisterResult: failingSignoffRegister,
    evidenceResult: failingEvidence
  });

  assert.match(markdown, /# CRM V1 UAT Execution Pack/);
  assert.match(markdown, /Generated at: 2026-06-19T04:00:00\+08:00/);
  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /ENV-001 \| 测试 \| 补充具名环境 Smoke 证据/);
  assert.match(markdown, /ENV-004 \| 测试 \| 补充具名环境 Smoke 证据/);
  assert.match(markdown, /PRE-001 \| 测试 \| 完成 UAT 前置检查/);
  assert.match(markdown, /SMK-005 \| 测试 \| 完成具名环境 Smoke 检查/);
  assert.match(markdown, /UAT-010 \| 业务UAT \| 完成业务验收用例/);
  assert.match(markdown, /DEF-REGISTER \| 测试 \| 补齐缺陷台账/);
  assert.match(markdown, /SIGNOFF-SALES \| 业务UAT \| 补齐签署证据/);
  assert.match(markdown, /SIGNOFF-PM \| 项目\/产品 \| 补齐签署证据/);
  assert.match(markdown, /GO-NOGO \| 项目\/产品 \| 完成 Go\/No-Go 会议结论/);
  assert.match(markdown, /node scripts\/v1-uat-environment-validate\.mjs docs\/testing\/v1-uat-environment-evidence\.md/);
  assert.match(markdown, /node scripts\/v1-uat-signoff-register-validate\.mjs docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs/);
  assert.doesNotMatch(markdown, /undefined/);
});

test("generates a Go execution pack only when there are no failed gate items", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1UatExecutionPackMarkdown({
    generatedAt: "2026-06-19T04:00:00+08:00",
    environmentResult: passing,
    trackerResult: passing,
    manifestResult: passing,
    defectRegisterResult: passing,
    signoffRegisterResult: passing,
    evidenceResult: passing
  });

  assert.match(markdown, /Overall: Go/);
  assert.match(markdown, /No open execution items./);
});
