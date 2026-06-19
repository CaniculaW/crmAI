import assert from "node:assert/strict";
import test from "node:test";

import { evaluateV1ExternalUatRequestCoverageSnapshot } from "./v1-external-uat-request-coverage-check.mjs";

const gateResults = {
  readinessResult: { ok: true, failed: [] },
  kickoffResult: {
    ok: false,
    failed: [
      { id: "required-owners", message: "Incomplete kickoff owners." },
      { id: "scope-freeze", message: "Incomplete scope freeze." }
    ]
  },
  launchIntakeResult: {
    ok: false,
    failed: [
      { id: "environment-intake", message: "Incomplete launch environment." }
    ]
  },
  environmentResult: {
    ok: false,
    failed: [
      { id: "environment-checks", message: "Incomplete ENV checks." }
    ]
  },
  evidenceResult: {
    ok: false,
    failed: [
      { id: "uat-business-cases", message: "Missing UAT cases." }
    ]
  },
  manifestResult: {
    ok: false,
    failed: [
      { id: "evidence-complete", message: "Evidence rows not PASS." }
    ]
  },
  evidenceReferenceResult: { ok: true, failed: [] },
  trackerResult: {
    ok: false,
    failed: [
      { id: "release-gates", message: "Release gates incomplete." }
    ]
  },
  defectRegisterResult: {
    ok: false,
    failed: [
      { id: "p0-p1-summary", message: "Invalid P0/P1 summary." }
    ]
  },
  signoffRegisterResult: {
    ok: false,
    failed: [
      { id: "required-signoffs", message: "Incomplete signoffs." }
    ]
  },
  releaseGateResult: {
    ok: false,
    failed: [
      { id: "go-decision", message: "Project decision is No-Go." }
    ]
  }
};

function completeRequestText() {
  return [
    "Request Status: External UAT Evidence Required",
    "node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md",
    "node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md",
    "node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md",
    "node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md",
    "node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md",
    "node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md",
    "node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md",
    "node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md",
    "node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md",
    "node scripts/v1-release-gate.mjs . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md",
    "Kickoff Governance/required-owners",
    "Kickoff Governance/scope-freeze",
    "UAT Launch Intake/environment-intake",
    "UAT Environment Evidence/environment-checks",
    "UAT Evidence Pack/uat-business-cases",
    "UAT Evidence Manifest/evidence-complete",
    "UAT Execution Tracker/release-gates",
    "UAT Defect Register/p0-p1-summary",
    "UAT Signoff Register/required-signoffs",
    "Release Gate/go-decision"
  ].join("\n");
}

test("passes when the external UAT request packet lists every failed validator check", () => {
  const result = evaluateV1ExternalUatRequestCoverageSnapshot({
    requestText: completeRequestText(),
    ...gateResults
  });

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.ok(result.passed.some((check) => check.id === "request-blocker-coverage"));
});

test("fails when the external UAT request packet omits a failed validator check", () => {
  const result = evaluateV1ExternalUatRequestCoverageSnapshot({
    requestText: completeRequestText().replace("UAT Evidence Pack/uat-business-cases", ""),
    ...gateResults
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingBlockers, ["UAT Evidence Pack/uat-business-cases"]);
  assert.ok(result.failed.some((check) => check.id === "request-blocker-coverage"));
});

test("fails when the external UAT request packet omits a required validation command", () => {
  const result = evaluateV1ExternalUatRequestCoverageSnapshot({
    requestText: completeRequestText().replace("node scripts/v1-uat-signoff-register-validate.mjs", ""),
    ...gateResults
  });

  assert.equal(result.ok, false);
  assert.ok(result.missingCommands.some((command) => command.includes("v1-uat-signoff-register-validate.mjs")));
  assert.ok(result.failed.some((check) => check.id === "request-command-coverage"));
});

test("fails when No-Go external UAT request blockers are hidden behind a closed status", () => {
  const result = evaluateV1ExternalUatRequestCoverageSnapshot({
    requestText: completeRequestText().replace("Request Status: External UAT Evidence Required", "Request Status: No External UAT Requests Open"),
    ...gateResults
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "request-status-alignment"));
});
