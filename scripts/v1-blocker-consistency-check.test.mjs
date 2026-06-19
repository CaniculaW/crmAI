import test from "node:test";
import assert from "node:assert/strict";

import { evaluateV1BlockerConsistencySnapshot } from "./v1-blocker-consistency-check.mjs";

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
