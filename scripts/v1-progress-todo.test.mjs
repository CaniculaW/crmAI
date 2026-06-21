import assert from "node:assert/strict";
import test from "node:test";

import { generateV1ProgressTodoMarkdown } from "./v1-progress-todo.mjs";

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
        "Kickoff Governance/project-go-decision",
        "Kickoff Governance/required-owners",
        "Kickoff Governance/scope-freeze",
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
    }
  ]
};

const pendingKickoffEvidenceReadiness = {
  ok: false,
  entries: [
    ["product-owner.md", "owner", "产品负责人"],
    ["sales-owner.md", "owner", "业务验收人-销售侧"],
    ["manager-owner.md", "owner", "业务验收人-管理侧"],
    ["dev-owner.md", "owner", "研发负责人"],
    ["frontend-owner.md", "owner", "前端负责人"],
    ["backend-owner.md", "owner", "后端负责人"],
    ["qa-owner.md", "owner", "测试负责人"],
    ["v1-scope.md", "scope", "V1 模块范围"],
    ["v1-loop.md", "scope", "V1 业务闭环"],
    ["out-of-scope.md", "scope", "V1 暂不做"],
    ["schedule.md", "scope", "上线周期"],
    ["tech-stack.md", "scope", "技术栈"],
    ["acceptance-mode.md", "scope", "验收方式"],
    ["scope-freeze.md", "scope", "V1范围冻结"]
  ].map(([filename, type, label]) => ({
    path: `docs/meeting-notes/evidence/kickoff/${filename}`,
    type,
    label,
    status: "Pending",
    failures: [
      "Evidence status must be `Ready` before applying.",
      "Closure value is incomplete."
    ]
  })),
  failed: [
    {
      path: "docs/meeting-notes/evidence/kickoff/product-owner.md",
      failures: [
        "Evidence status must be `Ready` before applying.",
        "Closure value is incomplete."
      ]
    }
  ]
};

const pendingKickoffIntakeReadiness = {
  total: 14,
  ready: 0,
  pending: 14,
  failed: [
    {
      filename: "product-owner.md",
      label: "产品负责人",
      type: "owner",
      failures: [
        "Evidence status must be `Ready` before writing templates.",
        "Owner or approver is incomplete."
      ]
    },
    {
      filename: "v1-scope.md",
      label: "V1 模块范围",
      type: "scope",
      failures: [
        "Evidence status must be `Ready` before writing templates.",
        "Closure value is incomplete."
      ]
    }
  ]
};

test("generates a V1 progress TODO board from blockers", () => {
  const markdown = generateV1ProgressTodoMarkdown({
    generatedAt: "2026-06-21T15:00:00.000Z",
    blockersPayload,
    kickoffGovernanceEvidenceReadiness: pendingKickoffEvidenceReadiness,
    kickoffGovernanceIntakeReadiness: pendingKickoffIntakeReadiness
  });

  assert.match(markdown, /# CRM V1 Progress TODO/);
  assert.match(markdown, /Generated at: 2026-06-21T15:00:00\.000Z/);
  assert.match(markdown, /Overall decision: `No-Go`/);
  assert.match(markdown, /Open blockers: 4/);
  assert.match(markdown, /Current task: `1-governance`/);
  assert.match(markdown, /Current owner side: 项目\/产品/);
  assert.match(markdown, /## TODOList/);
  assert.match(markdown, /\| In Progress \| `1-governance` \| 4 \| 项目\/产品 \|/);
  assert.match(markdown, /## Current Task Progress/);
  assert.match(markdown, /## Current Task Evidence Readiness/);
  assert.match(markdown, /## Current Task Intake Readiness/);
  assert.match(markdown, /Intake rows ready: `0\/14`/);
  assert.match(markdown, /Intake rows pending: `14`/);
  assert.match(markdown, /\| product-owner\.md \| owner \| 产品负责人 \| Evidence status must be `Ready` before writing templates\.; Owner or approver is incomplete\. \|/);
  assert.match(markdown, /\| v1-scope\.md \| scope \| V1 模块范围 \| Evidence status must be `Ready` before writing templates\.; Closure value is incomplete\. \|/);
  assert.match(markdown, /Evidence templates ready: `0\/14`/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-evidence-intake\.mjs --template --output docs\/meeting-notes\/evidence\/kickoff\/intake\.json/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-evidence-intake\.mjs --input docs\/meeting-notes\/evidence\/kickoff\/intake\.json --write/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-evidence-apply\.mjs --decision Go --write/);
  assert.match(markdown, /\| Pending \| docs\/meeting-notes\/evidence\/kickoff\/product-owner\.md \| owner \| 产品负责人 \| Evidence status must be `Ready` before applying\.; Closure value is incomplete\. \|/);
  assert.match(markdown, /\| Pending \| docs\/meeting-notes\/evidence\/kickoff\/v1-scope\.md \| scope \| V1 模块范围 \| Evidence status must be `Ready` before applying\.; Closure value is incomplete\. \|/);
  assert.match(markdown, /Kickoff Governance\/required-owners/);
  assert.match(markdown, /Incomplete kickoff owners: 产品负责人/);
  assert.match(markdown, /## Task Switch Snapshot/);
  assert.match(markdown, /Previous task: `none`/);
  assert.match(markdown, /Current task: `1-governance`/);
  assert.match(markdown, /Switch readiness: `Blocked`/);
  assert.match(markdown, /Remaining blockers before switch: 4/);
  assert.match(markdown, /Next required validation:/);
  assert.match(markdown, /## Task Switch Display Rule/);
  assert.match(markdown, /当前任务/);
  assert.match(markdown, /完成标准/);
  assert.match(markdown, /验证命令/);
  assert.match(markdown, /node scripts\/v1-kickoff-governance-validate\.mjs docs\/meeting-notes\/crm-kickoff-minutes\.md/);
  assert.match(markdown, /node scripts\/v1-release-gate\.mjs --json/);
});

test("generates a closed progress board when no blockers remain", () => {
  const markdown = generateV1ProgressTodoMarkdown({
    generatedAt: "2026-06-21T15:00:00.000Z",
    blockersPayload: {
      status: "Closed",
      decision: "Go",
      ok: true,
      summary: {
        totalBlockers: 0,
        byOwnerSide: {},
        byClosurePhase: {},
        closurePhases: [],
        nextClosurePhase: null
      },
      blockers: []
    }
  });

  assert.match(markdown, /Overall decision: `Go`/);
  assert.match(markdown, /Open blockers: 0/);
  assert.match(markdown, /Current task: `complete`/);
  assert.match(markdown, /No open V1 blockers remain/);
  assert.match(markdown, /Switch readiness: `Ready`/);
  assert.match(markdown, /Previous task: `6-final-go-decision`/);
});
