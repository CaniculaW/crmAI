import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  generateV1UatActionPlanFromFiles,
  generateV1UatActionPlanMarkdown
} from "./v1-uat-action-plan.mjs";

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
    { id: "uat-evidence-pack", message: "UAT evidence pack failed: environment-results, uat-business-cases, p0-defects, signoff-complete" },
    { id: "uat-evidence-manifest", message: "UAT evidence manifest failed: evidence-complete, go-decision" },
    { id: "uat-defect-register", message: "UAT defect register failed: p0-p1-summary" },
    { id: "uat-signoff-register", message: "UAT signoff register failed: required-signoffs" },
    { id: "go-decision", message: "Project decision is No-Go; V1 release gate requires Go." }
  ]
};

function copyFixture(rootDir, filename, sourcePath) {
  const targetPath = path.join(rootDir, filename);
  writeFileSync(targetPath, readFileSync(sourcePath, "utf8"));
  return targetPath;
}

test("generates a No-Go UAT action plan grouped by project, test, business, and engineering workstreams", () => {
  const markdown = generateV1UatActionPlanMarkdown({
    generatedAt: "2026-06-19T03:00:00+08:00",
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

  assert.match(markdown, /# CRM V1 UAT Action Plan/);
  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /Project \/ Product \| 项目\/产品 \| 指定销售侧验收人、管理侧验收人、产品负责人、测试负责人和项目负责人/);
  assert.match(markdown, /Test \| 测试 \| 完成 PRE-001 至 PRE-006、SMK-001 至 SMK-005、UAT证据包、UAT证据清单、P0\/P1缺陷汇总和回归证据/);
  assert.match(markdown, /Business UAT \| 业务 \| 完成 UAT-001 至 UAT-010 并为每项提供截图、操作记录或缺陷单/);
  assert.match(markdown, /Engineering \| 研发 \| 支持具名测试环境、账号权限、Smoke问题定位，并在证据补齐后重跑最终放行门禁/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md/);
  assert.match(markdown, /node scripts\/v1-uat-environment-validate\.mjs docs\/testing\/v1-uat-environment-evidence\.md/);
  assert.match(markdown, /node scripts\/v1-uat-defect-register-validate\.mjs docs\/testing\/v1-uat-defect-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-signoff-register-validate\.mjs docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-launch-intake-validate\.mjs docs\/testing\/v1-uat-launch-intake\.md/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-manifest-validate\.mjs docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /node scripts\/v1-uat-execution-tracker-validate\.mjs docs\/testing\/crm-v1-uat-execution-tracker\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md docs\/testing\/v1-uat-evidence-manifest\.md docs\/testing\/v1-uat-defect-register\.md docs\/testing\/v1-uat-environment-evidence\.md docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md docs\/testing\/v1-uat-evidence-manifest\.md docs\/testing\/v1-uat-defect-register\.md docs\/testing\/v1-uat-environment-evidence\.md docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /UAT Environment Evidence\/environment-summary: Invalid environment summary items/);
  assert.match(markdown, /Kickoff Governance\/required-owners: Incomplete kickoff owners/);
  assert.match(markdown, /UAT Evidence Manifest\/evidence-complete: Evidence rows not marked PASS/);
  assert.match(markdown, /UAT Defect Register\/p0-p1-summary: Invalid P0\/P1 summary rows/);
  assert.match(markdown, /UAT Signoff Register\/required-signoffs: Incomplete signoffs/);
  assert.match(markdown, /UAT Launch Intake\/participant-roster: Incomplete UAT participants/);
  assert.match(markdown, /Do not mark V1 as Go until every listed gate is PASS and the project decision is Go/);
});

test("generates action plan from absolute UAT source document paths", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "crm-v1-uat-action-plan-"));
  const evidencePath = copyFixture(
    fixtureDir,
    "evidence-pack.md",
    "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md"
  );
  const trackerPath = copyFixture(
    fixtureDir,
    "execution-tracker.md",
    "docs/testing/crm-v1-uat-execution-tracker.md"
  );
  const manifestPath = copyFixture(
    fixtureDir,
    "evidence-manifest.md",
    "docs/testing/v1-uat-evidence-manifest.md"
  );
  const defectRegisterPath = copyFixture(
    fixtureDir,
    "defect-register.md",
    "docs/testing/v1-uat-defect-register.md"
  );
  const environmentPath = copyFixture(
    fixtureDir,
    "environment.md",
    "docs/testing/v1-uat-environment-evidence.md"
  );
  const signoffRegisterPath = copyFixture(
    fixtureDir,
    "signoff-register.md",
    "docs/testing/v1-uat-signoff-register.md"
  );
  const launchIntakePath = copyFixture(
    fixtureDir,
    "launch-intake.md",
    "docs/testing/v1-uat-launch-intake.md"
  );
  const kickoffPath = copyFixture(
    fixtureDir,
    "kickoff.md",
    "docs/meeting-notes/crm-kickoff-minutes.md"
  );

  const markdown = generateV1UatActionPlanFromFiles({
    rootDir: process.cwd(),
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    generatedAt: "2026-06-19T04:00:00+08:00"
  });

  assert.match(markdown, /Overall: Go/);
  assert.match(markdown, new RegExp(`node scripts/v1-uat-evidence-pack-validate\\.mjs ${evidencePath}`));
  assert.match(markdown, /No open UAT blockers/);
  assert.doesNotMatch(markdown, /Release Gate\/go-decision: Project decision is No-Go/);
});

test("generates a Go action plan with no open blockers only when all gates pass", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1UatActionPlanMarkdown({
    generatedAt: "2026-06-19T03:00:00+08:00",
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

  assert.match(markdown, /Overall: Go/);
  assert.match(markdown, /No open UAT blockers./);
  assert.doesNotMatch(markdown, /Do not mark V1 as Go/);
});
