import assert from "node:assert/strict";
import test from "node:test";

import { generateV1ExternalUatRequestMarkdown } from "./v1-external-uat-request.mjs";

const passingReadiness = {
  ok: true,
  failed: []
};

const failingKickoff = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "required-owners", message: "Incomplete kickoff owners: 产品负责人, 业务验收人-销售侧" },
    { id: "scope-freeze", message: "Incomplete kickoff scope freeze items: V1 模块范围, V1范围冻结" }
  ]
};

const failingLaunchIntake = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-intake", message: "Incomplete launch environment fields: 测试环境名称, 前端访问地址" },
    { id: "participant-roster", message: "Incomplete UAT participants: UAT-SALES, UAT-PM" }
  ]
};

const failingEnvironment = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-summary", message: "Invalid environment summary items: 测试环境名称, Git 提交号" },
    { id: "environment-checks", message: "Incomplete environment checks: ENV-001, ENV-008" }
  ]
};

const failingEvidence = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "uat-business-cases", message: "Missing passed UAT evidence: UAT-001, UAT-010" },
    { id: "signoff-complete", message: "Incomplete signoff rows: 销售侧验收人, 项目负责人" }
  ]
};

const failingManifest = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "evidence-complete", message: "Evidence rows not marked PASS: PRE-001, SMK-001, UAT-010" }
  ]
};

const failingTracker = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "roles-assigned", message: "Roles pending assignment or status: 销售侧验收人, 项目负责人" },
    { id: "release-gates", message: "Incomplete release gates: UAT证据包一致性, 项目签署" }
  ]
};

const failingDefects = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "p0-p1-summary", message: "Invalid P0/P1 summary rows: P0 / S1 阻断, P1 / S2 严重" }
  ]
};

const failingSignoffs = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "required-signoffs", message: "Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-PM" }
  ]
};

const failingReleaseGate = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "kickoff-governance", message: "Kickoff governance failed: required-owners, scope-freeze" },
    { id: "uat-launch-intake", message: "UAT launch intake failed: environment-intake, participant-roster" },
    { id: "go-decision", message: "Project decision is No-Go; V1 release gate requires Go." }
  ]
};

test("generates a No-Go external UAT request packet with source documents and validation commands", () => {
  const markdown = generateV1ExternalUatRequestMarkdown({
    generatedAt: "2026-06-19T12:30:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: failingKickoff,
    launchIntakeResult: failingLaunchIntake,
    environmentResult: failingEnvironment,
    evidenceResult: failingEvidence,
    manifestResult: failingManifest,
    trackerResult: failingTracker,
    defectRegisterResult: failingDefects,
    signoffRegisterResult: failingSignoffs,
    releaseGateResult: failingReleaseGate
  });

  assert.match(markdown, /# CRM V1 External UAT Request Packet/);
  assert.match(markdown, /Request Status: External UAT Evidence Required/);
  assert.match(markdown, /Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets/);
  assert.match(markdown, /\| Project \/ Product \| 项目\/产品 \| docs\/meeting-notes\/crm-kickoff-minutes\.md; docs\/testing\/v1-uat-launch-intake\.md; docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /\| Test \| 测试 \| docs\/testing\/v1-uat-environment-evidence\.md; docs\/testing\/v1-uat-defect-register\.md; docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /\| Business UAT \| 业务 \| docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md; docs\/testing\/crm-v1-uat-execution-tracker\.md/);
  assert.match(markdown, /\| Engineering \| 研发 \| docs\/testing\/crm-v1-test-environment-validation-runbook\.md; docs\/testing\/v1-automated-validation-report-2026-06-18\.md/);
  assert.match(markdown, /node scripts\/v1-uat-launch-intake-validate\.mjs docs\/testing\/v1-uat-launch-intake\.md/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-manifest-validate\.mjs docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md/);
  assert.match(markdown, /Kickoff Governance\/required-owners: Incomplete kickoff owners/);
  assert.match(markdown, /UAT Launch Intake\/participant-roster: Incomplete UAT participants/);
  assert.match(markdown, /UAT Evidence Manifest\/evidence-complete: Evidence rows not marked PASS/);
  assert.match(markdown, /Release Gate\/go-decision: Project decision is No-Go/);
});

test("generates a closed request packet only when the final release gate is Go", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1ExternalUatRequestMarkdown({
    generatedAt: "2026-06-19T12:30:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: passing,
    launchIntakeResult: passing,
    environmentResult: passing,
    evidenceResult: passing,
    manifestResult: passing,
    trackerResult: passing,
    defectRegisterResult: passing,
    signoffRegisterResult: passing,
    releaseGateResult: passing
  });

  assert.match(markdown, /Request Status: No External UAT Requests Open/);
  assert.match(markdown, /All external UAT request items are closed by validator evidence/);
  assert.doesNotMatch(markdown, /External UAT Evidence Required/);
});
