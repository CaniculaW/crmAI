import assert from "node:assert/strict";
import test from "node:test";

import {
  generateKickoffGovernanceEvidenceScaffoldMarkdown,
  generateKickoffGovernanceEvidenceScaffolds
} from "./v1-kickoff-governance-evidence-scaffold.mjs";

test("generates pending kickoff owner evidence templates without approving governance", () => {
  const markdown = generateKickoffGovernanceEvidenceScaffoldMarkdown({
    generatedAt: "2026-06-21T16:30:00.000Z",
    itemType: "owner",
    label: "产品负责人",
    requiredClosureValue: "Named person, not a role label",
    targetStatus: "已确认",
    targetRow: "参会人/产品负责人",
    kickoffPath: "docs/meeting-notes/crm-kickoff-minutes.md"
  });

  assert.match(markdown, /# CRM V1 Kickoff Governance Evidence - 产品负责人/);
  assert.match(markdown, /Generated at: 2026-06-21T16:30:00\.000Z/);
  assert.match(markdown, /Evidence type: `owner`/);
  assert.match(markdown, /Evidence status: `Pending`/);
  assert.match(markdown, /Required closure value: Named person, not a role label/);
  assert.match(markdown, /Target status in kickoff minutes: `已确认`/);
  assert.match(markdown, /Update target row: `docs\/meeting-notes\/crm-kickoff-minutes\.md` 参会人\/产品负责人/);
  assert.match(markdown, /This scaffold is not approval evidence until a named owner fills it/);
  assert.doesNotMatch(markdown, /^Decision:\s*Go$/m);
  assert.doesNotMatch(markdown, /S3cure!123|Bearer\s+[A-Za-z0-9._-]{20,}|api[_ -]?token\s*[:=]/i);
});

test("generates every kickoff governance evidence scaffold path", () => {
  const scaffolds = generateKickoffGovernanceEvidenceScaffolds({
    generatedAt: "2026-06-21T16:30:00.000Z",
    evidenceRoot: "docs/meeting-notes/evidence/kickoff"
  });

  const paths = scaffolds.map((scaffold) => scaffold.path);
  assert.equal(scaffolds.length, 14);
  assert.deepEqual(paths, [
    "docs/meeting-notes/evidence/kickoff/product-owner.md",
    "docs/meeting-notes/evidence/kickoff/sales-owner.md",
    "docs/meeting-notes/evidence/kickoff/manager-owner.md",
    "docs/meeting-notes/evidence/kickoff/dev-owner.md",
    "docs/meeting-notes/evidence/kickoff/frontend-owner.md",
    "docs/meeting-notes/evidence/kickoff/backend-owner.md",
    "docs/meeting-notes/evidence/kickoff/qa-owner.md",
    "docs/meeting-notes/evidence/kickoff/v1-scope.md",
    "docs/meeting-notes/evidence/kickoff/v1-loop.md",
    "docs/meeting-notes/evidence/kickoff/out-of-scope.md",
    "docs/meeting-notes/evidence/kickoff/schedule.md",
    "docs/meeting-notes/evidence/kickoff/tech-stack.md",
    "docs/meeting-notes/evidence/kickoff/acceptance-mode.md",
    "docs/meeting-notes/evidence/kickoff/scope-freeze.md"
  ]);
  assert.ok(scaffolds.every((scaffold) => scaffold.content.includes("Evidence status: `Pending`")));
  assert.ok(scaffolds.every((scaffold) => scaffold.content.includes("Do not record plaintext passwords")));
});
