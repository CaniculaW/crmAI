import assert from "node:assert/strict";
import test from "node:test";

import {
  generateKickoffGovernanceClosureIntakeMarkdown
} from "./v1-kickoff-governance-closure-intake.mjs";

test("generates a kickoff governance closure intake template", () => {
  const markdown = generateKickoffGovernanceClosureIntakeMarkdown({
    generatedAt: "2026-06-21T13:00:00.000Z"
  });

  assert.match(markdown, /# CRM V1 Kickoff Governance Closure Intake/);
  assert.match(markdown, /Generated at: 2026-06-21T13:00:00\.000Z/);
  assert.match(markdown, /Target source document: docs\/meeting-notes\/crm-kickoff-minutes\.md/);
  assert.match(markdown, /Current blocker phase: `1-governance`/);
  assert.match(markdown, /Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets/);
  assert.match(markdown, /\| Role \| Required closure value \| Target status \| Evidence requirement \|/);
  assert.match(markdown, /\| 产品负责人 \| Named person, not a role label \| 已确认 \| Existing non-empty `docs\/` artifact or external `http\(s\)` URL \|/);
  assert.match(markdown, /\| 业务验收人-销售侧 \| Named person, not a role label \| 已确认 \|/);
  assert.match(markdown, /\| 测试负责人 \| Named person, not a role label \| 已确认 \|/);
  assert.match(markdown, /\| Scope item \| Required closure value \| Target status \| Evidence requirement \|/);
  assert.match(markdown, /\| V1 模块范围 \| Confirmed V1 sales foundation modules \| 已确认 \| Existing non-empty `docs\/` artifact or external `http\(s\)` URL \|/);
  assert.match(markdown, /\| 上线周期 \| `YYYY-MM-DD 至 YYYY-MM-DD` with end after start \| 已确认 \|/);
  assert.match(markdown, /\| V1范围冻结 \| Confirm V1 only includes sales foundation loop and later-version items stay out \| 已冻结 \|/);
  assert.match(markdown, /Decision target: `Go`/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md/);
  assert.ok(markdown.includes("node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md"));
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json/);
});

test("uses custom source and output guidance paths", () => {
  const markdown = generateKickoffGovernanceClosureIntakeMarkdown({
    generatedAt: "2026-06-21T13:00:00.000Z",
    kickoffPath: "custom/kickoff.md",
    evidenceRoot: "docs/custom/evidence/kickoff"
  });

  assert.match(markdown, /Target source document: custom\/kickoff\.md/);
  assert.match(markdown, /docs\/custom\/evidence\/kickoff\/product-owner\.md/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs custom\/kickoff\.md/);
});
