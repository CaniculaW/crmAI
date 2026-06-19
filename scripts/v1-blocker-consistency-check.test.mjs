import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  evaluateV1BlockerConsistencyFromFiles,
  evaluateV1BlockerConsistencySnapshot,
  parseArgs
} from "./v1-blocker-consistency-check.mjs";

const DECISION_DOCS = {
  "docs/testing/v1-validation-status.md": [
    "Release Gate/uat-launch-intake",
    "Release Gate/go-decision"
  ].join("\n"),
  "docs/testing/v1-uat-action-plan.md": [
    "Release Gate/uat-launch-intake",
    "Release Gate/go-decision"
  ].join("\n"),
  "docs/testing/v1-go-no-go-meeting.md": [
    "Release Gate/uat-launch-intake",
    "Release Gate/go-decision"
  ].join("\n"),
  "docs/testing/v1-external-uat-request.md": [
    "Release Gate/uat-launch-intake",
    "Release Gate/go-decision"
  ].join("\n")
};

const EXECUTION_PACK = [
  "LAUNCH-ENV",
  "LAUNCH-ROSTER",
  "LAUNCH-ACCOUNTS",
  "LAUNCH-GO",
  "GO-NOGO",
  "node scripts/v1-release-gate.mjs"
].join("\n");

function releaseGateResult() {
  return {
    ok: false,
    decision: "No-Go",
    failed: [
      { id: "uat-launch-intake", message: "UAT launch intake failed." },
      { id: "go-decision", message: "Project decision is No-Go." }
    ]
  };
}

function copyFixture(rootDir, filename, sourcePath) {
  const targetPath = path.join(rootDir, filename);
  writeFileSync(targetPath, readFileSync(sourcePath, "utf8"));
  return targetPath;
}

test("passes when decision docs and execution pack cover every current release blocker", () => {
  const result = evaluateV1BlockerConsistencySnapshot({
    releaseGateResult: releaseGateResult(),
    documents: {
      ...DECISION_DOCS,
      "docs/testing/v1-uat-execution-pack.md": EXECUTION_PACK
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.missingReleaseBlockers, []);
  assert.deepEqual(result.missingExecutionItems, []);
});

test("checks blocker consistency from absolute UAT source and decision document paths", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "crm-v1-blocker-consistency-"));
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

  const validationStatusPath = copyFixture(
    fixtureDir,
    "v1-validation-status.md",
    "docs/testing/v1-validation-status.md"
  );
  const actionPlanPath = copyFixture(
    fixtureDir,
    "v1-uat-action-plan.md",
    "docs/testing/v1-uat-action-plan.md"
  );
  const goNoGoPath = copyFixture(
    fixtureDir,
    "v1-go-no-go-meeting.md",
    "docs/testing/v1-go-no-go-meeting.md"
  );
  const externalRequestPath = copyFixture(
    fixtureDir,
    "v1-external-uat-request.md",
    "docs/testing/v1-external-uat-request.md"
  );
  const executionPackPath = copyFixture(
    fixtureDir,
    "v1-uat-execution-pack.md",
    "docs/testing/v1-uat-execution-pack.md"
  );

  const result = evaluateV1BlockerConsistencyFromFiles({
    rootDir: process.cwd(),
    decisionDocPaths: [
      validationStatusPath,
      actionPlanPath,
      goNoGoPath,
      externalRequestPath
    ],
    executionPackPath,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.missingReleaseBlockers, []);
  assert.deepEqual(result.missingExecutionItems, []);
});

test("parses CLI options for external UAT source and decision document paths", () => {
  const parsed = parseArgs([
    "--root", "/workspace/crm",
    "--decision-doc", "/tmp/status.md",
    "--decision-doc", "/tmp/action-plan.md",
    "--decision-doc", "/tmp/go-no-go.md",
    "--decision-doc", "/tmp/external-request.md",
    "--execution-pack", "/tmp/execution-pack.md",
    "--evidence", "/tmp/evidence.md",
    "--tracker", "/tmp/tracker.md",
    "--manifest", "/tmp/manifest.md",
    "--defects", "/tmp/defects.md",
    "--environment", "/tmp/environment.md",
    "--signoffs", "/tmp/signoffs.md",
    "--launch-intake", "/tmp/launch-intake.md",
    "--kickoff", "/tmp/kickoff.md"
  ]);

  assert.equal(parsed.rootDir, "/workspace/crm");
  assert.deepEqual(parsed.decisionDocPaths, [
    "/tmp/status.md",
    "/tmp/action-plan.md",
    "/tmp/go-no-go.md",
    "/tmp/external-request.md"
  ]);
  assert.equal(parsed.executionPackPath, "/tmp/execution-pack.md");
  assert.equal(parsed.evidencePath, "/tmp/evidence.md");
  assert.equal(parsed.trackerPath, "/tmp/tracker.md");
  assert.equal(parsed.manifestPath, "/tmp/manifest.md");
  assert.equal(parsed.defectRegisterPath, "/tmp/defects.md");
  assert.equal(parsed.environmentPath, "/tmp/environment.md");
  assert.equal(parsed.signoffRegisterPath, "/tmp/signoffs.md");
  assert.equal(parsed.launchIntakePath, "/tmp/launch-intake.md");
  assert.equal(parsed.kickoffPath, "/tmp/kickoff.md");
});

test("fails when a decision document omits a release gate blocker", () => {
  const result = evaluateV1BlockerConsistencySnapshot({
    releaseGateResult: releaseGateResult(),
    documents: {
      ...DECISION_DOCS,
      "docs/testing/v1-validation-status.md": "Release Gate/go-decision",
      "docs/testing/v1-uat-execution-pack.md": EXECUTION_PACK
    }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingReleaseBlockers, [
    {
      docPath: "docs/testing/v1-validation-status.md",
      blocker: "Release Gate/uat-launch-intake"
    }
  ]);
});

test("fails when the external UAT request packet omits a release gate blocker", () => {
  const result = evaluateV1BlockerConsistencySnapshot({
    releaseGateResult: releaseGateResult(),
    documents: {
      ...DECISION_DOCS,
      "docs/testing/v1-external-uat-request.md": "Release Gate/go-decision",
      "docs/testing/v1-uat-execution-pack.md": EXECUTION_PACK
    }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingReleaseBlockers, [
    {
      docPath: "docs/testing/v1-external-uat-request.md",
      blocker: "Release Gate/uat-launch-intake"
    }
  ]);
});

test("fails when the execution pack omits the action item for a blocker", () => {
  const result = evaluateV1BlockerConsistencySnapshot({
    releaseGateResult: releaseGateResult(),
    documents: {
      ...DECISION_DOCS,
      "docs/testing/v1-uat-execution-pack.md": [
        "LAUNCH-ENV",
        "LAUNCH-ROSTER",
        "LAUNCH-GO",
        "GO-NOGO",
        "node scripts/v1-release-gate.mjs"
      ].join("\n")
    }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingExecutionItems, [
    {
      blocker: "Release Gate/uat-launch-intake",
      item: "LAUNCH-ACCOUNTS"
    }
  ]);
});
