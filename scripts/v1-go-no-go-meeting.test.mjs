import assert from "node:assert/strict";
import test from "node:test";

import { generateV1GoNoGoMeetingMarkdown } from "./v1-go-no-go-meeting.mjs";

const passingReadiness = {
  ok: true,
  failed: []
};

const failingEvidence = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "environment-results", message: "Missing passed environment evidence: 销售个人账号, 销售负责人账号" },
    { id: "signoff-complete", message: "Incomplete signoff rows: 销售侧验收人, 项目负责人" }
  ]
};

const failingTracker = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "roles-assigned", message: "Roles pending assignment or status: 销售侧验收人, 管理侧验收人" },
    { id: "uat-cases", message: "Incomplete UAT cases: UAT-001, UAT-010" }
  ]
};

const failingReleaseGate = {
  ok: false,
  decision: "No-Go",
  failed: [
    { id: "uat-evidence-pack", message: "UAT evidence pack failed: environment-results, signoff-complete" },
    { id: "go-decision", message: "Project decision is No-Go; V1 release gate requires Go." }
  ]
};

test("generates a No-Go meeting pack that blocks approval until validators pass", () => {
  const markdown = generateV1GoNoGoMeetingMarkdown({
    generatedAt: "2026-06-19T04:00:00+08:00",
    readinessResult: passingReadiness,
    evidenceResult: failingEvidence,
    trackerResult: failingTracker,
    releaseGateResult: failingReleaseGate
  });

  assert.match(markdown, /# CRM V1 Go\/No-Go Meeting Pack/);
  assert.match(markdown, /Decision Recommendation: No-Go/);
  assert.match(markdown, /Required Attendees/);
  assert.match(markdown, /销售侧验收人/);
  assert.match(markdown, /管理侧验收人/);
  assert.match(markdown, /Cannot approve V1 until every validator returns PASS and the project decision is Go/);
  assert.match(markdown, /node scripts\/v1-uat-evidence-pack-validate\.mjs docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs \. docs\/testing\/evidence\/crm-v1-uat-evidence-pack-rc8-draft\.md docs\/testing\/crm-v1-uat-execution-tracker\.md/);
  assert.match(markdown, /UAT Evidence Pack\/environment-results: Missing passed environment evidence/);
  assert.match(markdown, /Release Gate\/go-decision: Project decision is No-Go/);
});

test("generates a Go meeting pack only when release gate passes with Go decision", () => {
  const passing = { ok: true, decision: "Go", failed: [] };
  const markdown = generateV1GoNoGoMeetingMarkdown({
    generatedAt: "2026-06-19T04:00:00+08:00",
    readinessResult: passingReadiness,
    evidenceResult: passing,
    trackerResult: passing,
    releaseGateResult: passing
  });

  assert.match(markdown, /Decision Recommendation: Go/);
  assert.match(markdown, /Final Signoff Table/);
  assert.match(markdown, /\| 项目负责人 \| .* \| Go \|/);
  assert.doesNotMatch(markdown, /Cannot approve V1 until/);
});
