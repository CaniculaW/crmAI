import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvidenceModel,
  generateEvidencePackMarkdown,
  parseEvidenceArgs
} from "./v1-uat-evidence-pack.mjs";

test("generates a V1 UAT evidence pack with all required business demo cases", () => {
  const model = buildEvidenceModel({
    now: new Date("2026-06-18T09:30:00.000Z"),
    environment: "crm-v1-test",
    frontendUrl: "https://crm-test.example.com",
    backendUrl: "https://crm-test-api.example.com",
    gitCommit: "dc45a5d37116cd39f6b913fa879f1b15025ef854",
    releaseCandidate: "v1.0.0-rc.5"
  });

  const markdown = generateEvidencePackMarkdown(model);

  assert.match(markdown, /# CRM V1 UAT 证据包与 Go\/No-Go 记录/);
  assert.match(markdown, /crm-v1-test/);
  assert.match(markdown, /https:\/\/crm-test\.example\.com/);
  assert.match(markdown, /v1\.0\.0-rc\.5/);
  for (let index = 1; index <= 10; index += 1) {
    assert.match(markdown, new RegExp(`UAT-${String(index).padStart(3, "0")}`));
  }
  assert.match(markdown, /Go \/ Conditional Go \/ No-Go/);
  assert.match(markdown, /不记录明文密码/);
});

test("does not copy password-like inputs into the evidence pack", () => {
  const model = buildEvidenceModel({
    environment: "uat",
    frontendUrl: "https://crm.example.com",
    backendUrl: "https://api.crm.example.com",
    gitCommit: "abc123",
    releaseCandidate: "v1.0.0-rc.5",
    username: "demo_admin",
    password: "S3cure!123",
    apiToken: "secret-token"
  });

  const markdown = generateEvidencePackMarkdown(model);

  assert.match(markdown, /demo_admin/);
  assert.doesNotMatch(markdown, /S3cure!123/);
  assert.doesNotMatch(markdown, /secret-token/);
});

test("parses CLI options for a named test environment", () => {
  const parsed = parseEvidenceArgs([
    "--environment", "crm-v1-test",
    "--frontend-url", "https://crm-test.example.com",
    "--backend-url", "https://crm-test-api.example.com",
    "--git-commit", "abc123",
    "--rc", "v1.0.0-rc.5",
    "--test-owner", "QA"
  ]);

  assert.deepEqual(parsed, {
    environment: "crm-v1-test",
    frontendUrl: "https://crm-test.example.com",
    backendUrl: "https://crm-test-api.example.com",
    gitCommit: "abc123",
    releaseCandidate: "v1.0.0-rc.5",
    testOwner: "QA"
  });
});
