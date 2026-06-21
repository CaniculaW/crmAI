import assert from "node:assert/strict";
import test from "node:test";

import { generateKickoffGovernanceEvidencePackMarkdown } from "./v1-kickoff-governance-evidence-pack.mjs";

const blockersPayload = {
  status: "External UAT Evidence Required",
  decision: "No-Go",
  ok: false,
  summary: {
    totalBlockers: 4,
    byOwnerSide: {
      "项目/产品": 4
    },
    byClosurePhase: {
      "1-governance": 4
    },
    closurePhases: [
      {
        phase: "1-governance",
        order: 10,
        totalBlockers: 4,
        byOwnerSide: {
          "项目/产品": 4
        }
      }
    ],
    nextClosurePhase: {
      phase: "1-governance",
      order: 10,
      totalBlockers: 4,
      byOwnerSide: {
        "项目/产品": 4
      },
      blockerIds: [
        "Kickoff Governance/required-owners",
        "Kickoff Governance/scope-freeze",
        "Kickoff Governance/project-go-decision",
        "Release Gate/kickoff-governance"
      ],
      sourceDocuments: [
        "docs/meeting-notes/crm-kickoff-minutes.md"
      ],
      validationCommands: [
        "node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md",
        "node scripts/v1-release-gate.mjs --json"
      ]
    }
  },
  blockers: [
    {
      blockerId: "Kickoff Governance/required-owners",
      gate: "Kickoff Governance",
      checkId: "required-owners",
      ownerSide: "项目/产品",
      closurePhase: "1-governance",
      sourceDocument: "docs/meeting-notes/crm-kickoff-minutes.md",
      validationCommand: "node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md",
      message: "Incomplete kickoff owners: 产品负责人"
    },
    {
      blockerId: "Kickoff Governance/scope-freeze",
      gate: "Kickoff Governance",
      checkId: "scope-freeze",
      ownerSide: "项目/产品",
      closurePhase: "1-governance",
      sourceDocument: "docs/meeting-notes/crm-kickoff-minutes.md",
      validationCommand: "node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md",
      message: "Incomplete kickoff scope freeze items: V1 模块范围"
    }
  ]
};

test("generates a kickoff governance evidence pack for the current 1-governance task", () => {
  const markdown = generateKickoffGovernanceEvidencePackMarkdown({
    generatedAt: "2026-06-21T16:00:00.000Z",
    blockersPayload
  });

  assert.match(markdown, /# CRM V1 Kickoff Governance Evidence Pack/);
  assert.match(markdown, /Generated at: 2026-06-21T16:00:00\.000Z/);
  assert.match(markdown, /Current task: `1-governance`/);
  assert.match(markdown, /Open kickoff blockers: 4/);
  assert.match(markdown, /Target source document: `docs\/meeting-notes\/crm-kickoff-minutes\.md`/);
  assert.match(markdown, /Decision target: `Go`/);
  assert.match(markdown, /Do not record plaintext passwords/);
  assert.match(markdown, /## Owner Confirmation TODOList/);
  assert.match(markdown, /\| 产品负责人 \| Named person, not a role label \| 已确认 \| `docs\/meeting-notes\/evidence\/kickoff\/product-owner\.md` \|/);
  assert.match(markdown, /## Scope Freeze TODOList/);
  assert.match(markdown, /\| V1 模块范围 \| Confirmed V1 sales foundation modules \| 已确认 \| `docs\/meeting-notes\/evidence\/kickoff\/v1-scope\.md` \|/);
  assert.match(markdown, /## Current Governance Blockers/);
  assert.match(markdown, /Kickoff Governance\/required-owners/);
  assert.match(markdown, /Incomplete kickoff owners: 产品负责人/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json/);
  assert.match(markdown, /上一任务/);
  assert.match(markdown, /当前任务/);
  assert.match(markdown, /完成标准/);
});

test("uses custom target kickoff and evidence paths", () => {
  const markdown = generateKickoffGovernanceEvidencePackMarkdown({
    generatedAt: "2026-06-21T16:00:00.000Z",
    kickoffPath: "docs/custom/kickoff.md",
    evidenceRoot: "docs/custom/evidence",
    blockersPayload
  });

  assert.match(markdown, /Target source document: `docs\/custom\/kickoff\.md`/);
  assert.match(markdown, /`docs\/custom\/evidence\/product-owner\.md`/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs docs\/custom\/kickoff\.md/);
});

