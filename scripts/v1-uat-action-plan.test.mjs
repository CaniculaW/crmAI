import assert from "node:assert/strict";
import test from "node:test";

import { generateV1UatActionPlanMarkdown } from "./v1-uat-action-plan.mjs";

const passingReadiness = {
  ok: true,
  failed: []
};

const failingEvidence = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-results", message: "Missing passed environment evidence: 销售个人账号, 销售负责人账号" },
    { id: "uat-business-cases", message: "Missing passed UAT evidence: UAT-001, UAT-010" },
    { id: "p0-defects", message: "P0/S1 defect row is missing or invalid." },
    { id: "signoff-complete", message: "Incomplete signoff rows: 销售侧验收人, 项目负责人" }
  ]
};

const failingTracker = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "roles-assigned", message: "Roles pending assignment or status: 销售侧验收人, 管理侧验收人" },
    { id: "pre-checks", message: "Incomplete PRE checks: PRE-001, PRE-006" },
    { id: "smoke-checks", message: "Incomplete SMK checks: SMK-001, SMK-005" },
    { id: "uat-cases", message: "Incomplete UAT cases: UAT-001, UAT-010" },
    { id: "release-gates", message: "Incomplete release gates: UAT证据包一致性, 项目签署" }
  ]
};

const failingReleaseGate = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "uat-evidence-pack", message: "UAT evidence pack failed: environment-results, uat-business-cases, p0-defects, signoff-complete" },
    { id: "go-decision", message: "Project decision is No-Go; V1 release gate requires Go." }
  ]
};

test("generates a No-Go UAT action plan grouped by project, test, business, and engineering workstreams", () => {
  const markdown = generateV1UatActionPlanMarkdown({
    generatedAt: "2026-06-19T03:00:00+08:00",
    readinessResult: passingReadiness,
    evidenceResult: failingEvidence,
    trackerResult: failingTracker,
    releaseGateResult: failingReleaseGate
  });

  assert.match(markdown, /# CRM V1 UAT Action Plan/);
  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /Project \/ Product \| 项目\/产品 \| 指定销售侧验收人、管理侧验收人、产品负责人、测试负责人和项目负责人/);
  assert.match(markdown, /Test \| 测试 \| 完成 PRE-001 至 PRE-006、SMK-001 至 SMK-005、UAT证据包、P0\/P1缺陷汇总和回归证据/);
  assert.match(markdown, /Business UAT \| 业务 \| 完成 UAT-001 至 UAT-010 并为每项提供截图、操作记录或缺陷单/);
  assert.match(markdown, /Engineering \| 研发 \| 支持具名测试环境、账号权限、Smoke问题定位，并在证据补齐后重跑最终放行门禁/);
  assert.match(markdown, /node scripts\/v1-uat-execution-tracker-validate\.mjs docs\/testing\/crm-v1-uat-execution-tracker\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md/);
  assert.match(markdown, /Do not mark V1 as Go until every listed gate is PASS and the project decision is Go/);
});

test("generates a Go action plan with no open blockers only when all gates pass", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1UatActionPlanMarkdown({
    generatedAt: "2026-06-19T03:00:00+08:00",
    readinessResult: passingReadiness,
    evidenceResult: passing,
    trackerResult: passing,
    releaseGateResult: passing
  });

  assert.match(markdown, /Overall: Go/);
  assert.match(markdown, /No open UAT blockers./);
  assert.doesNotMatch(markdown, /Do not mark V1 as Go/);
});
