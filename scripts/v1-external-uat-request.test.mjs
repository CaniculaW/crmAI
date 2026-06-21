import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import * as externalUatRequest from "./v1-external-uat-request.mjs";

const {
  generateV1ExternalUatClosureChecklistMarkdown,
  generateV1ExternalUatEvidenceIntakeMarkdown,
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

function manifestIdsFromIntakeMarkdown(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("|---") && !line.includes("Manifest evidence IDs"))
    .flatMap((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return (cells[3] ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    });
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
  assert.match(markdown, /## Next Closure Phase/);
  assert.match(markdown, /Phase: `1-governance`/);
  assert.match(markdown, /Owner side: 项目\/产品/);
  assert.match(markdown, /Blocker IDs: `Kickoff Governance\/required-owners`, `Kickoff Governance\/scope-freeze`, `Release Gate\/kickoff-governance`/);
  assert.match(markdown, /Source documents: `docs\/meeting-notes\/crm-kickoff-minutes\.md`/);
  assert.match(markdown, /node scripts\/v1-uat-launch-intake-validate\.mjs docs\/testing\/v1-uat-launch-intake\.md/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-manifest-validate\.mjs docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md/);
  assert.match(markdown, /Kickoff Governance\/required-owners: Incomplete kickoff owners/);
  assert.match(markdown, /UAT Launch Intake\/participant-roster: Incomplete UAT participants/);
  assert.match(markdown, /UAT Evidence Manifest\/evidence-complete: Evidence rows not marked PASS/);
  assert.match(markdown, /Release Gate\/go-decision: Project decision is No-Go/);
});

test("keeps external UAT request open when validator blockers remain despite release gate Go", () => {
  const markdown = generateV1ExternalUatRequestMarkdown({
    generatedAt: "2026-06-19T12:30:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: failingKickoff,
    launchIntakeResult: { ok: true, decision: "Go", failed: [] },
    environmentResult: { ok: true, decision: "Go", failed: [] },
    evidenceResult: { ok: true, decision: "Go", failed: [] },
    manifestResult: { ok: true, decision: "Go", failed: [] },
    trackerResult: { ok: true, decision: "Go", failed: [] },
    defectRegisterResult: { ok: true, decision: "Go", failed: [] },
    signoffRegisterResult: { ok: true, decision: "Go", failed: [] },
    releaseGateResult: { ok: true, decision: "Go", failed: [] }
  });

  assert.match(markdown, /Request Status: External UAT Evidence Required/);
  assert.match(markdown, /Kickoff Governance\/required-owners: Incomplete kickoff owners/);
  assert.doesNotMatch(markdown, /All external UAT request items are closed/);
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
  assert.equal(
    new Set(payload.blockers.map((blocker) => blocker.blockerId)).size,
    payload.summary.totalBlockers
  );

  const businessCaseBlocker = payload.blockers.find((blocker) => (
    blocker.gate === "UAT Evidence Pack" && blocker.checkId === "uat-business-cases"
  ));

  assert.equal(businessCaseBlocker.blockerId, "UAT Evidence Pack/uat-business-cases");
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
  assert.equal(releaseGateBlocker.blockerId, "Release Gate/go-decision");
  assert.equal(releaseGateBlocker.ownerSide, "项目/产品");
  assert.match(releaseGateBlocker.validationCommand, /node scripts\/v1-release-gate\.mjs --json/);
});

test("keeps blockers JSON No-Go when validator blockers remain despite release gate Go", () => {
  const json = externalUatRequest.generateV1ExternalUatBlockersJson({
    generatedAt: "2026-06-19T12:30:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: failingKickoff,
    launchIntakeResult: { ok: true, decision: "Go", failed: [] },
    environmentResult: { ok: true, decision: "Go", failed: [] },
    evidenceResult: { ok: true, decision: "Go", failed: [] },
    manifestResult: { ok: true, decision: "Go", failed: [] },
    trackerResult: { ok: true, decision: "Go", failed: [] },
    defectRegisterResult: { ok: true, decision: "Go", failed: [] },
    signoffRegisterResult: { ok: true, decision: "Go", failed: [] },
    releaseGateResult: { ok: true, decision: "Go", failed: [] }
  });

  const payload = JSON.parse(json);

  assert.equal(payload.status, "External UAT Evidence Required");
  assert.equal(payload.decision, "No-Go");
  assert.equal(payload.ok, false);
  assert.equal(payload.summary.totalBlockers, payload.blockers.length);
  assert.ok(payload.blockers.some((blocker) => (
    blocker.gate === "Kickoff Governance" && blocker.checkId === "required-owners"
  )));
});

test("exports stable machine-readable blocker ids", () => {
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
  const blockerIds = payload.blockers.map((blocker) => blocker.blockerId);

  assert.equal(new Set(blockerIds).size, payload.summary.totalBlockers);
  assert.ok(payload.blockers.every((blocker) => (
    blocker.blockerId === `${blocker.gate}/${blocker.checkId}`
  )));
  assert.ok(blockerIds.includes("UAT Evidence Pack/uat-business-cases"));
  assert.ok(blockerIds.includes("Release Gate/go-decision"));
});

test("exports machine-readable blocker closure sequencing", () => {
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
  const kickoffBlocker = payload.blockers.find((blocker) => blocker.blockerId === "Kickoff Governance/required-owners");
  const businessCaseBlocker = payload.blockers.find((blocker) => blocker.blockerId === "UAT Evidence Pack/uat-business-cases");
  const finalGoBlocker = payload.blockers.find((blocker) => blocker.blockerId === "Release Gate/go-decision");

  assert.equal(kickoffBlocker.closurePhase, "1-governance");
  assert.equal(kickoffBlocker.closureOrder, 10);
  assert.equal(businessCaseBlocker.closurePhase, "3-uat-evidence");
  assert.equal(businessCaseBlocker.closureOrder, 30);
  assert.equal(finalGoBlocker.closurePhase, "6-final-go-decision");
  assert.equal(finalGoBlocker.closureOrder, 60);
  assert.equal(
    payload.summary.byClosurePhase["3-uat-evidence"],
    payload.blockers.filter((blocker) => blocker.closurePhase === "3-uat-evidence").length
  );
});

test("exports ordered blocker closure phase summaries", () => {
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
  const phases = payload.summary.closurePhases;

  assert.deepEqual(phases.map((phase) => phase.phase), [
    "1-governance",
    "2-uat-launch",
    "2-uat-environment",
    "3-uat-evidence",
    "4-defect-closure",
    "5-signoff",
    "6-final-go-decision"
  ]);
  assert.ok(phases.every((phase, index) => index === 0 || phase.order >= phases[index - 1].order));
  assert.equal(
    phases.find((phase) => phase.phase === "3-uat-evidence").totalBlockers,
    payload.summary.byClosurePhase["3-uat-evidence"]
  );
  assert.deepEqual(
    phases.find((phase) => phase.phase === "1-governance").byOwnerSide,
    { "项目/产品": 3 }
  );
});

test("exports next closure phase handoff metadata", () => {
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
  const nextPhase = payload.summary.nextClosurePhase;
  const firstPhase = payload.summary.closurePhases[0];

  assert.equal(nextPhase.phase, "1-governance");
  assert.equal(nextPhase.order, 10);
  assert.equal(nextPhase.totalBlockers, firstPhase.totalBlockers);
  assert.deepEqual(nextPhase.byOwnerSide, firstPhase.byOwnerSide);
  assert.deepEqual(nextPhase.blockerIds, [
    "Kickoff Governance/required-owners",
    "Kickoff Governance/scope-freeze",
    "Release Gate/kickoff-governance"
  ]);
  assert.deepEqual(nextPhase.sourceDocuments, ["docs/meeting-notes/crm-kickoff-minutes.md"]);
  assert.deepEqual(nextPhase.validationCommands, [
    "node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md",
    "node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md"
  ]);
});

test("deduplicates machine-readable blockers by gate and check id", () => {
  const duplicatedEvidence = {
    ok: false,
    decision: "No-Go",
    failed: [
      { id: "uat-business-cases", message: "Missing passed UAT evidence: UAT-001" },
      { id: "uat-business-cases", message: "Missing passed UAT evidence: UAT-001" }
    ]
  };

  const json = externalUatRequest.generateV1ExternalUatBlockersJson({
    generatedAt: "2026-06-19T12:30:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: { ok: true, decision: "Go", failed: [] },
    launchIntakeResult: { ok: true, decision: "Go", failed: [] },
    environmentResult: { ok: true, decision: "Go", failed: [] },
    evidenceResult: duplicatedEvidence,
    manifestResult: { ok: true, decision: "Go", failed: [] },
    trackerResult: { ok: true, decision: "Go", failed: [] },
    defectRegisterResult: { ok: true, decision: "Go", failed: [] },
    signoffRegisterResult: { ok: true, decision: "Go", failed: [] },
    releaseGateResult: { ok: false, decision: "No-Go", failed: [] }
  });

  const payload = JSON.parse(json);
  const businessCaseRows = payload.blockers.filter((blocker) => (
    blocker.gate === "UAT Evidence Pack" && blocker.checkId === "uat-business-cases"
  ));

  assert.equal(payload.summary.totalBlockers, 1);
  assert.equal(payload.summary.byOwnerSide["业务UAT"], 1);
  assert.equal(businessCaseRows.length, 1);
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
  assert.match(markdown, /## Next Closure Phase/);
  assert.match(markdown, /Phase: `1-governance`/);
  assert.match(markdown, /Owner side: 项目\/产品/);
  assert.match(markdown, /Blocker IDs: `Kickoff Governance\/required-owners`, `Kickoff Governance\/scope-freeze`, `Release Gate\/kickoff-governance`/);
  assert.match(markdown, /Validation commands:/);
  assert.match(markdown, /\| Status \| Gate \| Check ID \| Source document \| Validation command \| Closure evidence needed \|/);
  assert.match(markdown, /\| Open \| Kickoff Governance \| required-owners \| docs\/meeting-notes\/crm-kickoff-minutes\.md \| `node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md` \| Incomplete kickoff owners/);
  assert.match(markdown, /\| Open \| UAT Environment Evidence \| environment-summary \| docs\/testing\/v1-uat-environment-evidence\.md \| `node scripts\/v1-uat-environment-validate\.mjs docs\/testing\/v1-uat-environment-evidence\.md` \| Invalid environment summary items/);
  assert.match(markdown, /\| Open \| UAT Evidence Pack \| uat-business-cases \| docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md \| `node scripts\/v1-uat-evidence-pack-validate\.mjs docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md` \| Missing passed UAT evidence/);
  assert.match(markdown, /Do not mark a row Closed until its source document validates PASS and the final release gate returns Go/);
});

test("keeps closure checklist No-Go when validator blockers remain despite release gate Go", () => {
  const markdown = generateV1ExternalUatClosureChecklistMarkdown({
    generatedAt: "2026-06-19T12:30:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: failingKickoff,
    launchIntakeResult: { ok: true, decision: "Go", failed: [] },
    environmentResult: { ok: true, decision: "Go", failed: [] },
    evidenceResult: { ok: true, decision: "Go", failed: [] },
    manifestResult: { ok: true, decision: "Go", failed: [] },
    trackerResult: { ok: true, decision: "Go", failed: [] },
    defectRegisterResult: { ok: true, decision: "Go", failed: [] },
    signoffRegisterResult: { ok: true, decision: "Go", failed: [] },
    releaseGateResult: { ok: true, decision: "Go", failed: [] }
  });

  const declaredCount = Number.parseInt(markdown.match(/Open blocker count: (\d+)/)[1], 10);
  const openRows = markdown.split("\n").filter((line) => line.startsWith("| Open |"));

  assert.match(markdown, /Overall: No-Go/);
  assert.equal(declaredCount, openRows.length);
  assert.equal(declaredCount, 2);
  assert.match(markdown, /\| Open \| Kickoff Governance \| required-owners \|/);
});

test("generates an external UAT evidence intake checklist tied to manifest ids", () => {
  assert.equal(typeof generateV1ExternalUatEvidenceIntakeMarkdown, "function");

  const markdown = generateV1ExternalUatEvidenceIntakeMarkdown({
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

  assert.match(markdown, /# CRM V1 External UAT Evidence Intake/);
  assert.match(markdown, /Generated at: 2026-06-19T12:30:00\+08:00/);
  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /docs\/testing\/v1-external-uat-closure-checklist\.md/);
  assert.match(markdown, /docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /\| TEST-ENV \| 测试 \| ENV-EVIDENCE, PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, SMK-001, SMK-002, SMK-003, SMK-004, SMK-005 \| docs\/testing\/v1-uat-environment-evidence\.md; docs\/testing\/crm-v1-uat-execution-tracker\.md; docs\/testing\/v1-uat-evidence-manifest\.md \|/);
  assert.match(markdown, /\| BUSINESS-UAT \| 业务UAT \| UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010 \| docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md; docs\/testing\/crm-v1-uat-execution-tracker\.md; docs\/testing\/v1-uat-evidence-manifest\.md \|/);
  assert.match(markdown, /\| DEFECT-CLOSURE \| 测试 \| DEF-REGISTER, DEF-P0, DEF-P1 \| docs\/testing\/v1-uat-defect-register\.md; docs\/testing\/v1-uat-evidence-manifest\.md \|/);
  assert.match(markdown, /\| SIGNOFF-GO \| 项目\/产品 \| SIGNOFF-REGISTER, SIGNOFF-SALES, SIGNOFF-MANAGER, SIGNOFF-PRODUCT, SIGNOFF-TEST, SIGNOFF-DEV, SIGNOFF-PM, GO-NOGO \| docs\/testing\/v1-uat-signoff-register\.md; docs\/testing\/v1-go-no-go-meeting\.md; docs\/testing\/v1-uat-evidence-manifest\.md \|/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-manifest-validate\.mjs docs\/testing\/v1-uat-evidence-manifest\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json/);
  assert.match(markdown, /Do not paste passwords, bearer tokens, API keys, or unmasked account secrets/);
});

test("keeps evidence intake No-Go when validator blockers remain despite release gate Go", () => {
  const markdown = generateV1ExternalUatEvidenceIntakeMarkdown({
    generatedAt: "2026-06-19T12:30:00+08:00",
    readinessResult: passingReadiness,
    kickoffResult: failingKickoff,
    launchIntakeResult: { ok: true, decision: "Go", failed: [] },
    environmentResult: { ok: true, decision: "Go", failed: [] },
    evidenceResult: { ok: true, decision: "Go", failed: [] },
    manifestResult: { ok: true, decision: "Go", failed: [] },
    trackerResult: { ok: true, decision: "Go", failed: [] },
    defectRegisterResult: { ok: true, decision: "Go", failed: [] },
    signoffRegisterResult: { ok: true, decision: "Go", failed: [] },
    releaseGateResult: { ok: true, decision: "Go", failed: [] }
  });

  assert.match(markdown, /Overall: No-Go/);
  assert.match(markdown, /\| KICKOFF-LAUNCH \| 项目\/产品 \| PRE-006 \|/);
  assert.doesNotMatch(markdown, /All intake rows are closed/);
});

test("keeps evidence intake manifest ids assigned to a single intake row", () => {
  const markdown = generateV1ExternalUatEvidenceIntakeMarkdown({
    generatedAt: "2026-06-19T12:30:00+08:00",
    releaseGateResult: failingReleaseGate
  });

  const manifestIds = manifestIdsFromIntakeMarkdown(markdown);
  const duplicates = manifestIds.filter((id, index) => manifestIds.indexOf(id) !== index);

  assert.deepEqual(duplicates, []);
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
