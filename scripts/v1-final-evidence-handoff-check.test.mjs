import assert from "node:assert/strict";
import test from "node:test";

import { evaluateV1FinalEvidenceHandoffSnapshot } from "./v1-final-evidence-handoff-check.mjs";

const releaseGateStatus = JSON.stringify({
  result: "FAIL",
  decision: "No-Go",
  ok: false,
  checks: [
    { id: "rc-uat-readiness", ok: true, message: "Ready." },
    { id: "go-decision", ok: false, message: "Project decision is No-Go." }
  ]
});

function completeDocuments(overrides = {}) {
  const shared = [
    "具名测试环境仍需补齐。",
    "业务验收签署仍需完成。",
    "当前不是正式 Go 证据包，不能作为 V1 准出完成。",
    "node scripts/v1-uat-readiness-check.mjs",
    "node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md",
    "node scripts/v1-generated-docs-check.mjs",
    "node scripts/v1-release-gate-status-check.mjs",
    "node scripts/v1-plan-status-check.mjs",
    "node scripts/v1-acceptance-checklist-check.mjs",
    "node scripts/v1-uat-coverage-check.mjs",
    "node scripts/v1-traceability-check.mjs",
    "node scripts/v1-blocker-consistency-check.mjs",
    "node scripts/v1-external-uat-request-coverage-check.mjs",
    "node scripts/v1-final-evidence-handoff-check.mjs",
    "node scripts/v1-secret-scan-check.mjs",
    "node scripts/v1-release-gate.mjs"
  ].join("\n");

  return {
    "README.md": shared,
    "docs/releases/v1.0.0-rc.8.md": `GitHub Actions success\n${shared}\n`,
    "docs/testing/v1-automated-validation-report-2026-06-18.md": shared,
    "docs/testing/crm-v1-test-environment-validation-runbook.md": shared,
    "docs/testing/crm-v1-acceptance-checklist.md": shared,
    "docs/testing/v1-uat-action-plan.md": shared,
    "docs/testing/v1-uat-execution-pack.md": shared,
    "docs/testing/v1-go-no-go-meeting.md": shared,
    "docs/testing/v1-external-uat-request.md": shared,
    "docs/testing/v1-release-gate-status.json": `${releaseGateStatus}\n`,
    ...overrides
  };
}

test("passes when final handoff materials keep No-Go blockers and commands visible", () => {
  const result = evaluateV1FinalEvidenceHandoffSnapshot(completeDocuments());

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.ok(result.passed.some((check) => check.id === "no-go-handoff-guardrail"));
});

test("fails when final handoff materials claim V1 acceptance while release gate is No-Go", () => {
  const result = evaluateV1FinalEvidenceHandoffSnapshot(completeDocuments({
    "docs/releases/v1.0.0-rc.8.md": "V1 项目验收通过，可正式发布。\n"
  }));

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-go-handoff-guardrail"));
});

test("fails when final handoff materials omit the final release gate command", () => {
  const docs = completeDocuments();
  for (const path of Object.keys(docs)) {
    docs[path] = docs[path].replaceAll("node scripts/v1-release-gate.mjs", "");
  }

  const result = evaluateV1FinalEvidenceHandoffSnapshot(docs);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "handoff-command-coverage"));
});

test("fails when final handoff materials omit acceptance and traceability commands", () => {
  const docs = completeDocuments();
  for (const path of Object.keys(docs)) {
    docs[path] = docs[path]
      .replaceAll("node scripts/v1-acceptance-checklist-check.mjs", "")
      .replaceAll("node scripts/v1-uat-coverage-check.mjs", "")
      .replaceAll("node scripts/v1-traceability-check.mjs", "")
      .replaceAll("node scripts/v1-final-evidence-handoff-check.mjs", "");
  }

  const result = evaluateV1FinalEvidenceHandoffSnapshot(docs);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "handoff-command-coverage"));
  assert.deepEqual(result.missingCommands, [
    "node scripts/v1-acceptance-checklist-check.mjs",
    "node scripts/v1-uat-coverage-check.mjs",
    "node scripts/v1-traceability-check.mjs",
    "node scripts/v1-final-evidence-handoff-check.mjs"
  ]);
});

test("fails when generated UAT handoff packets are missing", () => {
  const docs = completeDocuments();
  delete docs["docs/testing/v1-uat-action-plan.md"];
  delete docs["docs/testing/v1-uat-execution-pack.md"];
  delete docs["docs/testing/v1-go-no-go-meeting.md"];
  delete docs["docs/testing/v1-external-uat-request.md"];

  const result = evaluateV1FinalEvidenceHandoffSnapshot(docs);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "handoff-materials-present"));
  assert.deepEqual(result.missingDocs, [
    "docs/testing/v1-uat-action-plan.md",
    "docs/testing/v1-uat-execution-pack.md",
    "docs/testing/v1-go-no-go-meeting.md",
    "docs/testing/v1-external-uat-request.md"
  ]);
});

test("fails when No-Go final handoff materials hide external UAT blockers", () => {
  const docs = completeDocuments();
  for (const path of Object.keys(docs)) {
    docs[path] = docs[path]
      .replaceAll("具名测试环境", "")
      .replaceAll("业务验收签署", "")
      .replaceAll("仍需", "");
  }

  const result = evaluateV1FinalEvidenceHandoffSnapshot(docs);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "external-blockers-visible"));
});
