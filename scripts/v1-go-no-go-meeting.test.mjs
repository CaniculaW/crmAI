import assert from "node:assert/strict";
import test from "node:test";

import { generateV1GoNoGoMeetingMarkdown } from "./v1-go-no-go-meeting.mjs";

const passingReadiness = {
  ok: true,
  failed: []
};

const failingEvidence = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-results", message: "Missing passed environment evidence: 销售个人账号, 销售负责人账号" },
    { id: "signoff-complete", message: "Incomplete signoff rows: 销售侧验收人, 项目负责人" }
  ]
};

const failingTracker = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "roles-assigned", message: "Roles pending assignment or status: 销售侧验收人, 管理侧验收人" },
    { id: "uat-cases", message: "Incomplete UAT cases: UAT-001, UAT-010" }
  ]
};

const failingManifest = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "evidence-complete", message: "Evidence rows not marked PASS: PRE-001, UAT-010" }
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
    { id: "p0-p1-summary", message: "Invalid P0/P1 summary rows: P0 / S1 阻断, P1 / S2 严重" }
  ]
};

const failingSignoffRegister = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "required-signoffs", message: "Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-PM" }
  ]
};

const failingLaunchIntake = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-intake", message: "Incomplete launch environment fields: 测试环境名称, UAT窗口" },
    { id: "participant-roster", message: "Incomplete UAT participants: UAT-SALES, UAT-PM" }
  ]
};

const failingKickoff = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "required-owners", message: "Incomplete kickoff owners: 产品负责人, 业务验收人-销售侧" }
  ]
};

const failingReleaseGate = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "kickoff-governance", message: "Kickoff governance failed: required-owners" },
    { id: "uat-environment", message: "UAT environment evidence failed: environment-summary, environment-checks" },
    { id: "uat-evidence-pack", message: "UAT evidence pack failed: environment-results, signoff-complete" },
    { id: "uat-evidence-manifest", message: "UAT evidence manifest failed: evidence-complete" },
    { id: "uat-defect-register", message: "UAT defect register failed: p0-p1-summary" },
    { id: "uat-signoff-register", message: "UAT signoff register failed: required-signoffs" },
    { id: "go-decision", message: "Project decision is No-Go; V1 release gate requires Go." }
  ]
};

test("generates a No-Go meeting pack that blocks approval until validators pass", () => {
  const markdown = generateV1GoNoGoMeetingMarkdown({
    generatedAt: "2026-06-19T04:00:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: failingKickoff,
    environmentResult: failingEnvironment,
    evidenceResult: failingEvidence,
    manifestResult: failingManifest,
    defectRegisterResult: failingDefectRegister,
    signoffRegisterResult: failingSignoffRegister,
    launchIntakeResult: failingLaunchIntake,
    trackerResult: failingTracker,
    releaseGateResult: failingReleaseGate
  });

  assert.match(markdown, /# CRM V1 Go\/No-Go Meeting Pack/);
  assert.match(markdown, /Decision Recommendation: No-Go/);
  assert.match(markdown, /Required Attendees/);
  assert.match(markdown, /销售侧验收人/);
  assert.match(markdown, /管理侧验收人/);
  assert.match(markdown, /Cannot approve V1 until every validator returns PASS and the project decision is Go/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-pack-validate\.mjs docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md/);
  assert.match(markdown, /node scripts\/v1-uat-environment-validate\.mjs docs\/testing\/v1-uat-environment-evidence\.md/);
  assert.match(markdown, /node scripts\/v1-uat-defect-register-validate\.mjs docs\/testing\/v1-uat-defect-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-signoff-register-validate\.mjs docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-launch-intake-validate\.mjs docs\/testing\/v1-uat-launch-intake\.md/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-manifest-validate\.mjs docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md docs\/testing\/v1-uat-evidence-manifest\.md docs\/testing\/v1-uat-defect-register\.md docs\/testing\/v1-uat-environment-evidence\.md docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /UAT Environment Evidence\/environment-summary: Invalid environment summary items/);
  assert.match(markdown, /Kickoff Governance\/required-owners: Incomplete kickoff owners/);
  assert.match(markdown, /UAT Evidence Pack\/environment-results: Missing passed environment evidence/);
  assert.match(markdown, /UAT Evidence Manifest\/evidence-complete: Evidence rows not marked PASS/);
  assert.match(markdown, /UAT Defect Register\/p0-p1-summary: Invalid P0\/P1 summary rows/);
  assert.match(markdown, /UAT Signoff Register\/required-signoffs: Incomplete signoffs/);
  assert.match(markdown, /UAT Launch Intake\/participant-roster: Incomplete UAT participants/);
  assert.match(markdown, /Release Gate\/go-decision: Project decision is No-Go/);
});

test("generates a Go meeting pack only when release gate passes with Go decision", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1GoNoGoMeetingMarkdown({
    generatedAt: "2026-06-19T04:00:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: passing,
    environmentResult: passing,
    evidenceResult: passing,
    manifestResult: passing,
    defectRegisterResult: passing,
    signoffRegisterResult: passing,
    launchIntakeResult: passing,
    trackerResult: passing,
    releaseGateResult: passing
  });

  assert.match(markdown, /Decision Recommendation: Go/);
  assert.match(markdown, /Final Signoff Table/);
  assert.match(markdown, /\| 项目负责人 \| .* \| Go \|/);
  assert.doesNotMatch(markdown, /Cannot approve V1 until/);
});
