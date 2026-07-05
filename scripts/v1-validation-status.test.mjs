import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  generateV1ValidationStatusFromFiles,
  generateV1ValidationStatusMarkdown,
  parseArgs
} from "./v1-validation-status.mjs";

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

const failingKickoff = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "required-owners", message: "Incomplete kickoff owners: 产品负责人, 业务验收人-销售侧" },
    { id: "scope-freeze", message: "Incomplete kickoff scope freeze items: V1范围冻结" }
  ]
};

const failingReleaseGate = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "kickoff-governance", message: "Kickoff governance failed: required-owners, scope-freeze" },
    { id: "uat-environment", message: "UAT environment evidence failed: environment-summary, environment-checks" },
    { id: "uat-evidence-pack", message: "UAT evidence pack failed: uat-business-cases, signoff-complete" },
    { id: "uat-evidence-manifest", message: "UAT evidence manifest failed: evidence-complete, go-decision" },
    { id: "uat-defect-register", message: "UAT defect register failed: p0-p1-summary, go-decision" },
    { id: "uat-signoff-register", message: "UAT signoff register failed: required-signoffs, project-go-decision" },
    { id: "uat-execution-tracker", message: "UAT execution tracker failed: pre-checks, release-gates" },
    { id: "go-decision", message: "Project decision is No-Go; V1 release gate requires Go." }
  ]
};

function copyFixture(rootDir, filename, sourcePath) {
  const targetPath = path.join(rootDir, filename);
  writeFileSync(targetPath, readFileSync(sourcePath, "utf8"));
  return targetPath;
}

test("summarizes a No-Go V1 status with concrete blocker commands", () => {
  const markdown = generateV1ValidationStatusMarkdown({
    generatedAt: "2026-06-19T02:40:00+08:00",
    gitCommit: "918ffced1a9002e7b624db51ace724c56301b646",
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

  assert.match(markdown, /# CRM V1 Validation Status/);
  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /Readiness \| PASS/);
  assert.match(markdown, /Kickoff Governance \| FAIL/);
  assert.match(markdown, /UAT Environment Evidence \| FAIL/);
  assert.match(markdown, /UAT Evidence Pack \| FAIL/);
  assert.match(markdown, /UAT Evidence Manifest \| FAIL/);
  assert.match(markdown, /UAT Defect Register \| FAIL/);
  assert.match(markdown, /UAT Signoff Register \| FAIL/);
  assert.match(markdown, /UAT Launch Intake \| FAIL/);
  assert.match(markdown, /UAT Execution Tracker \| FAIL/);
  assert.match(markdown, /Release Gate \| FAIL/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md/);
  assert.match(markdown, /node scripts\/v1-uat-environment-validate\.mjs docs\/testing\/v1-uat-environment-evidence\.md/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-manifest-validate\.mjs docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /node scripts\/v1-uat-defect-register-validate\.mjs docs\/testing\/v1-uat-defect-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-signoff-register-validate\.mjs docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /node scripts\/v1-uat-launch-intake-validate\.mjs docs\/testing\/v1-uat-launch-intake\.md/);
  assert.match(markdown, /node scripts\/v1-uat-execution-tracker-validate\.mjs docs\/testing\/crm-v1-uat-execution-tracker\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md docs\/testing\/v1-uat-evidence-manifest\.md docs\/testing\/v1-uat-defect-register\.md docs\/testing\/v1-uat-environment-evidence\.md docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md docs\/testing\/v1-uat-evidence-manifest\.md docs\/testing\/v1-uat-defect-register\.md docs\/testing\/v1-uat-environment-evidence\.md docs\/testing\/v1-uat-signoff-register\.md/);
  assert.match(markdown, /Incomplete kickoff owners: 产品负责人, 业务验收人-销售侧/);
  assert.match(markdown, /Invalid environment summary items/);
  assert.match(markdown, /Missing passed UAT evidence: UAT-001, UAT-010/);
  assert.match(markdown, /Evidence rows not marked PASS: PRE-001, UAT-010/);
  assert.match(markdown, /Invalid P0\/P1 summary rows/);
  assert.match(markdown, /Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-PM/);
  assert.match(markdown, /Incomplete UAT participants: UAT-SALES, UAT-PM/);
  assert.match(markdown, /Incomplete PRE checks: PRE-001, PRE-006/);
});

test("summarizes status from absolute UAT source document paths", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "crm-v1-validation-status-"));
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

  const markdown = generateV1ValidationStatusFromFiles({
    rootDir: process.cwd(),
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    generatedAt: "2026-06-19T04:00:00+08:00",
    gitCommit: "867b71c25b4e9d227946557660cb4b7538689987"
  });

  assert.match(markdown, /Overall: Go/);
  assert.match(markdown, new RegExp(`node scripts/v1-uat-evidence-pack-validate\\.mjs ${evidencePath}`));
  assert.match(markdown, /None\. V1 release gate is ready for Go evidence retention/);
  assert.doesNotMatch(markdown, /Release Gate\/go-decision: Project decision is No-Go/);
});

test("summarizes a Go V1 status only when all gates pass and decision is Go", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1ValidationStatusMarkdown({
    generatedAt: "2026-06-19T02:40:00+08:00",
    gitCommit: "abc123",
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
  assert.match(markdown, /Release Gate \| PASS/);
  assert.doesNotMatch(markdown, /## Open Blockers\n\n- FAIL/);
});

test("parses an explicit git commit for traceable generated status reports", () => {
  const parsed = parseArgs([
    "--git-commit", "e2eb0ebff2b9de8c3d26d7f135e8804a3e4b2933",
    "--output", "docs/testing/v1-validation-status.md"
  ]);

  assert.equal(parsed.gitCommit, "e2eb0ebff2b9de8c3d26d7f135e8804a3e4b2933");
  assert.equal(parsed.outputPath, "docs/testing/v1-validation-status.md");
});
