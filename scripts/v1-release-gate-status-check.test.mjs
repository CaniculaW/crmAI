import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_RELEASE_GATE_CHECK_IDS,
  evaluateV1ReleaseGateStatusSnapshot
} from "./v1-release-gate-status-check.mjs";

function validStatus(overrides = {}) {
  const checks = REQUIRED_RELEASE_GATE_CHECK_IDS.map((id) => ({
    id,
    ok: id === "rc-uat-readiness" || id === "uat-evidence-references",
    message: `${id} message`
  }));

  return {
    result: "FAIL",
    decision: "No-Go",
    ok: false,
    checks,
    ...overrides
  };
}

test("passes for a schema-stable V1 release gate JSON snapshot", () => {
  const result = evaluateV1ReleaseGateStatusSnapshot(JSON.stringify(validStatus()));

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.ok(result.passed.some((check) => check.id === "required-checks"));
});

test("fails when the release gate JSON snapshot is invalid JSON", () => {
  const result = evaluateV1ReleaseGateStatusSnapshot("{not-json");

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "valid-json"));
});

test("fails when the release gate JSON snapshot omits a required check", () => {
  const status = validStatus({
    checks: validStatus().checks.filter((check) => check.id !== "go-decision")
  });

  const result = evaluateV1ReleaseGateStatusSnapshot(JSON.stringify(status));

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingRequiredChecks, ["go-decision"]);
  assert.ok(result.failed.some((check) => check.id === "required-checks"));
});

test("fails when the release gate JSON snapshot repeats a check id", () => {
  const status = validStatus({
    checks: [
      ...validStatus().checks,
      {
        id: "go-decision",
        ok: false,
        message: "Duplicate project decision row."
      }
    ]
  });

  const result = evaluateV1ReleaseGateStatusSnapshot(JSON.stringify(status));

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicateCheckIds, ["go-decision"]);
  assert.ok(result.failed.some((check) => check.id === "unique-check-ids"));
});

test("fails when the release gate result and ok flag disagree", () => {
  const result = evaluateV1ReleaseGateStatusSnapshot(JSON.stringify(validStatus({
    result: "PASS",
    ok: false
  })));

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "result-consistency"));
});

test("fails when the release gate result and decision disagree", () => {
  const result = evaluateV1ReleaseGateStatusSnapshot(JSON.stringify(validStatus({
    result: "FAIL",
    ok: false,
    decision: "Go"
  })));

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "decision-consistency"));
});

test("fails when the release gate JSON snapshot does not match the current release gate result", () => {
  const currentStatus = validStatus({
    checks: validStatus().checks.map((check) => check.id === "go-decision"
      ? { ...check, message: "Project decision is No-Go; V1 release gate requires Go." }
      : check)
  });
  const staleStatus = validStatus({
    checks: validStatus().checks.map((check) => check.id === "go-decision"
      ? { ...check, message: "Stale project decision message." }
      : check)
  });

  const result = evaluateV1ReleaseGateStatusSnapshot(JSON.stringify(staleStatus), {
    expectedStatus: currentStatus
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "live-release-gate-match"));
});
