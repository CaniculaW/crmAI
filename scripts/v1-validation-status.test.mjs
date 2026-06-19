import assert from "node:assert/strict";
import test from "node:test";

import { generateV1ValidationStatusMarkdown } from "./v1-validation-status.mjs";

const passingReadiness = {
  ok: true,
  failed: [],
  warnings: []
};

const failingEvidence = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "uat-business-cases", message: "Missing passed UAT evidence: UAT-001, UAT-010" },
    { id: "signoff-complete", message: "Incomplete signoff rows: 销售侧验收人, 项目负责人" }
  ]
};

const failingTracker = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "pre-checks", message: "Incomplete PRE checks: PRE-001, PRE-006" },
    { id: "release-gates", message: "Incomplete release gates: V1最终放行门禁" }
  ]
};

const failingManifest = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "evidence-complete", message: "Evidence rows not marked PASS: PRE-001, UAT-010" },
    { id: "go-decision", message: "Manifest decision is No-Go; V1 validation requires Go." }
  ]
};

const failingEnvironment = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-summary", message: "Invalid environment summary items: 测试环境名称, 前端访问地址" },
    { id: "environment-checks", message: "Incomplete environment checks: ENV-001, ENV-005" }
  ]
};

const failingDefectRegister = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "p0-p1-summary", message: "Invalid P0/P1 summary rows: P0 / S1 阻断, P1 / S2 严重" },
    { id: "go-decision", message: "Defect register decision is No-Go; V1 validation requires Go." }
  ]
};

const failingSignoffRegister = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "required-signoffs", message: "Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-PM" },
    { id: "project-go-decision", message: "Project signoff is No-Go and register decision is No-Go; V1 validation requires Go." }
  ]
};

const failingLaunchIntake = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-intake", message: "Incomplete launch environment fields: 测试环境名称, UAT窗口" },
    { id: "participant-roster", message: "Incomplete UAT participants: UAT-SALES, UAT-PM" },
    { id: "account-custody", message: "Incomplete account custody items: 销售个人账号" }
  ]
};

const failingReleaseGate = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "uat-environment", message: "UAT environment evidence failed: environment-summary, environment-checks" },
    { id: "uat-evidence-pack", message: "UAT evidence pack failed: uat-business-cases, signoff-complete" },
    { id: "uat-evidence-manifest", message: "UAT evidence manifest failed: evidence-complete, go-decision" },
    { id: "uat-defect-register", message: "UAT defect register failed: p0-p1-summary, go-decision" },
    { id: "uat-signoff-register", message: "UAT signoff register failed: required-signoffs, project-go-decision" },
    { id: "uat-execution-tracker", message: "UAT execution tracker failed: pre-checks, release-gates" },
    { id: "go-decision", message: "Project decision is No-Go; V1 release gate requires Go." }
  ]
};

test("summarizes a No-Go V1 status with concrete blocker commands", () => {
  const markdown = generateV1ValidationStatusMarkdown({
    generatedAt: "2026-06-19T02:40:00+08:00",
    gitCommit: "918ffced1a9002e7b624db51ace724c56301b646",
    readinessResult: passingReadiness,
    environmentResult: failingEnvironment,
    evidenceResult: failingEvidence,
    manifestResult: failingManifest,
    defectRegisterResult: failingDefectRegister,
    signoffRegisterResult: failingSignoffRegister,
    launchIntakeResult: failingLaunchIntake,
    trackerResult: failingTracker,
    releaseGateResult: failingReleaseGate
  });

  assert.match(markdown, /# CRM V1 Validation Status/);
  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /Readiness \| PASS/);
  assert.match(markdown, /UAT Environment Evidence \| FAIL/);
  assert.match(markdown, /UAT Evidence Pack \| FAIL/);
  assert.match(markdown, /UAT Evidence Manifest \| FAIL/);
  assert.match(markdown, /UAT Defect Register \| FAIL/);
  assert.match(markdown, /UAT Signoff Register \| FAIL/);
  assert.match(markdown, /UAT Launch Intake \| FAIL/);
  assert.match(markdown, /UAT Execution Tracker \| FAIL/);
  assert.match(markdown, /Release Gate \| FAIL/);
  assert.match(markdown, /node scripts\/v1-uat-environment-validate\.mjs docs\/testing\/v1-uat-environment-evidence\.md/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-manifest-validate\.mjs docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /node scripts\/v1-uat-defect-register-validate\.mjs docs\/testing\/v1-uat-defect-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-signoff-register-validate\.mjs docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-launch-intake-validate\.mjs docs\/testing\/v1-uat-launch-intake\.md/);
  assert.match(markdown, /node scripts\/v1-uat-execution-tracker-validate\.mjs docs\/testing\/crm-v1-uat-execution-tracker\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md docs\/testing\/v1-uat-evidence-manifest\.md docs\/testing\/v1-uat-defect-register\.md docs\/testing\/v1-uat-environment-evidence\.md docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /Invalid environment summary items/);
  assert.match(markdown, /Missing passed UAT evidence: UAT-001, UAT-010/);
  assert.match(markdown, /Evidence rows not marked PASS: PRE-001, UAT-010/);
  assert.match(markdown, /Invalid P0\/P1 summary rows/);
  assert.match(markdown, /Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-PM/);
  assert.match(markdown, /Incomplete UAT participants: UAT-SALES, UAT-PM/);
  assert.match(markdown, /Incomplete PRE checks: PRE-001, PRE-006/);
});

test("summarizes a Go V1 status only when all gates pass and decision is Go", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1ValidationStatusMarkdown({
    generatedAt: "2026-06-19T02:40:00+08:00",
    gitCommit: "abc123",
    readinessResult: passingReadiness,
    environmentResult: passing,
    evidenceResult: passing,
    manifestResult: passing,
    defectRegisterResult: passing,
    signoffRegisterResult: passing,
    launchIntakeResult: passing,
    trackerResult: passing,
    releaseGateResult: passing
  });

  assert.match(markdown, /Overall: Go/);
  assert.match(markdown, /Release Gate \| PASS/);
  assert.doesNotMatch(markdown, /## Open Blockers\n\n- FAIL/);
});
