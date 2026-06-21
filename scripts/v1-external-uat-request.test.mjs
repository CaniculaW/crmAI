import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import * as externalUatRequest from "./v1-external-uat-request.mjs";

const {
  generateV1ExternalUatClosureChecklistMarkdown,
  generateV1ExternalUatRequestFromFiles,
  generateV1ExternalUatRequestMarkdown
} = externalUatRequest;

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

function copyFixture(rootDir, filename, sourcePath) {
  const targetPath = path.join(rootDir, filename);
  writeFileSync(targetPath, readFileSync(sourcePath, "utf8"));
  return targetPath;
}

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
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md/);
  assert.match(markdown, /Kickoff Governance\/required-owners: Incomplete kickoff owners/);
  assert.match(markdown, /UAT Launch Intake\/participant-roster: Incomplete UAT participants/);
  assert.match(markdown, /UAT Evidence Manifest\/evidence-complete: Evidence rows not marked PASS/);
  assert.match(markdown, /Release Gate\/go-decision: Project decision is No-Go/);
});

test("exports machine-readable external UAT blockers with owner routing and validation commands", () => {
  assert.equal(typeof externalUatRequest.generateV1ExternalUatBlockersJson, "function");

  const json = externalUatRequest.generateV1ExternalUatBlockersJson({
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

  const payload = JSON.parse(json);

  assert.equal(payload.generatedAt, "2026-06-19T12:30:00+08:00");
  assert.equal(payload.status, "External UAT Evidence Required");
  assert.equal(payload.decision, "No-Go");
  assert.equal(payload.ok, false);
  assert.ok(payload.summary.totalBlockers > 0);
  assert.ok(payload.summary.byOwnerSide["项目/产品"] > 0);
  assert.ok(payload.summary.byOwnerSide["业务UAT"] > 0);
  assert.ok(payload.summary.byOwnerSide["测试"] > 0);

  const businessCaseBlocker = payload.blockers.find((blocker) => (
    blocker.gate === "UAT Evidence Pack" && blocker.checkId === "uat-business-cases"
  ));

  assert.equal(businessCaseBlocker.ownerSide, "业务UAT");
  assert.equal(businessCaseBlocker.sourceDocument, "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md");
  assert.equal(
    businessCaseBlocker.validationCommand,
    "node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md"
  );
  assert.match(businessCaseBlocker.message, /Missing passed UAT evidence/);

  const releaseGateBlocker = payload.blockers.find((blocker) => (
    blocker.gate === "Release Gate" && blocker.checkId === "go-decision"
  ));
  assert.equal(releaseGateBlocker.ownerSide, "项目/产品");
  assert.match(releaseGateBlocker.validationCommand, /node scripts\/v1-release-gate\.mjs --json/);
});

test("generates an external UAT closure checklist grouped by owner side", () => {
  assert.equal(typeof generateV1ExternalUatClosureChecklistMarkdown, "function");

  const markdown = generateV1ExternalUatClosureChecklistMarkdown({
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

  assert.match(markdown, /# CRM V1 External UAT Closure Checklist/);
  assert.match(markdown, /Generated at: 2026-06-19T12:30:00\+08:00/);
  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /Open blocker count: \d+/);
  assert.match(markdown, /## 项目\/产品/);
  assert.match(markdown, /## 测试/);
  assert.match(markdown, /## 业务UAT/);
  assert.match(markdown, /\| Status \| Gate \| Check ID \| Source document \| Validation command \| Closure evidence needed \|/);
  assert.match(markdown, /\| Open \| Kickoff Governance \| required-owners \| docs\/meeting-notes\/crm-kickoff-minutes\.md \| `node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md` \| Incomplete kickoff owners/);
  assert.match(markdown, /\| Open \| UAT Environment Evidence \| environment-summary \| docs\/testing\/v1-uat-environment-evidence\.md \| `node scripts\/v1-uat-environment-validate\.mjs docs\/testing\/v1-uat-environment-evidence\.md` \| Invalid environment summary items/);
  assert.match(markdown, /\| Open \| UAT Evidence Pack \| uat-business-cases \| docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md \| `node scripts\/v1-uat-evidence-pack-validate\.mjs docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md` \| Missing passed UAT evidence/);
  assert.match(markdown, /Do not mark a row Closed until its source document validates PASS and the final release gate returns Go/);
});

test("generates request packet from absolute UAT source document paths", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "crm-v1-external-uat-request-"));
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

  const markdown = generateV1ExternalUatRequestFromFiles({
    rootDir: process.cwd(),
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    generatedAt: "2026-06-19T12:30:00+08:00"
  });

  assert.match(markdown, /Request Status: External UAT Evidence Required/);
  assert.match(markdown, new RegExp(`node scripts/v1-uat-evidence-pack-validate\\.mjs ${evidencePath}`));
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
