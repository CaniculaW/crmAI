import test from "node:test";
import assert from "node:assert/strict";

import {
  CURRENT_V1_EVIDENCE_DOCS,
  evaluateV1SecretScanSnapshot
} from "./v1-secret-scan-check.mjs";

test("tracks the external UAT request packet as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/testing/v1-external-uat-request.md"));
});

test("tracks the release gate JSON snapshot as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/testing/v1-release-gate-status.json"));
});

test("tracks the external UAT blockers JSON snapshot as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/testing/v1-external-uat-blockers.json"));
});

test("tracks the external UAT closure checklist as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/testing/v1-external-uat-closure-checklist.md"));
});

test("tracks the external UAT evidence intake checklist as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/testing/v1-external-uat-evidence-intake.md"));
});

test("tracks the next closure phase handoff as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/testing/v1-next-closure-phase.md"));
});

test("tracks the kickoff governance closure intake as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/meeting-notes/crm-kickoff-governance-closure-intake.md"));
});

test("tracks the kickoff governance evidence pack as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/meeting-notes/evidence/kickoff/closure-evidence-pack.md"));
});

test("tracks the kickoff governance evidence intake JSON as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/meeting-notes/evidence/kickoff/intake.json"));
});

test("tracks the V1 progress TODO board as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("docs/testing/v1-progress-todo.md"));
});

test("tracks the README final handoff entrypoint as current V1 evidence", () => {
  assert.ok(CURRENT_V1_EVIDENCE_DOCS.includes("README.md"));
});

test("passes when current V1 evidence uses redacted placeholders", () => {
  const result = evaluateV1SecretScanSnapshot({
    documents: {
      "docs/testing/evidence/v1-local-uat-2026-06-18.md": [
        'curl -d {"username":"demo_admin","password":"<demo-password>"}',
        "CRM_SMOKE_PASSWORD=<test-admin-password>",
        "Docker Hub token endpoint timed out"
      ].join("\n"),
      "docs/testing/v1-uat-launch-intake.md": "Account custody rows must confirm prepared masked accounts only."
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test("fails when a current V1 evidence document contains a literal password", () => {
  const result = evaluateV1SecretScanSnapshot({
    documents: {
      "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md": "Operator password=S3cure!123"
    }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.findings, [
    {
      docPath: "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md",
      pattern: "literal-secret-value",
      line: 1
    },
    {
      docPath: "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md",
      pattern: "secret-assignment",
      line: 1
    }
  ]);
});

test("fails when a current V1 evidence document contains a bearer token", () => {
  const result = evaluateV1SecretScanSnapshot({
    documents: {
      "docs/testing/v1-uat-environment-evidence.md": "Authorization: Bearer abcdef1234567890"
    }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.findings, [
    {
      docPath: "docs/testing/v1-uat-environment-evidence.md",
      pattern: "bearer-token",
      line: 1
    }
  ]);
});
