import test from "node:test";
import assert from "node:assert/strict";

import { evaluateV1SecretScanSnapshot } from "./v1-secret-scan-check.mjs";

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
