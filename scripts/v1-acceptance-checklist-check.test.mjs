import assert from "node:assert/strict";
import test from "node:test";

import { evaluateV1AcceptanceChecklistSnapshot } from "./v1-acceptance-checklist-check.mjs";

function handoffArtifactRows() {
  return `
| V1外部UAT请求包 | 已形成 | docs/testing/v1-external-uat-request.md |
| V1外部UAT关闭台账 | 已形成 | docs/testing/v1-external-uat-closure-checklist.md |
| V1外部UAT证据收件清单 | 已形成 | docs/testing/v1-external-uat-evidence-intake.md |
| V1外部UAT阻塞项JSON | 已形成 | docs/testing/v1-external-uat-blockers.json |
| V1生成文档一致性检查 | 已形成 | scripts/v1-generated-docs-check.mjs |
| V1最终交接证据一致性检查 | 已形成 | scripts/v1-final-evidence-handoff-check.mjs |
| V1证据秘密扫描 | 已形成 | scripts/v1-secret-scan-check.mjs |
`;
}

function checklistWithStatuses(statuses, { includeHandoffArtifacts = true } = {}) {
  return `
# 项目型大客户CRM V1验收清单

## 3. V1上线验收清单

| 编号 | 验收项 | 验收标准 | 建议验证方式 | 状态 |
|---|---|---|---|---|
${statuses.map((status, index) => {
  const id = `AC-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | 验收项${index + 1} | 标准 | 执行 CASE-${index + 1} | ${status} |`;
}).join("\n")}

## 10. 待确认项

| 编号 | 待确认项 | 影响 |
|---|---|---|
| TBD-001 | 销售侧验收人和管理侧验收人 | 影响业务验收签署和试点反馈归口 |
${includeHandoffArtifacts ? handoffArtifactRows() : ""}
`;
}

const releaseNoGo = {
  ok: false,
  decision: "No-Go",
  failed: [{ id: "uat-evidence-pack" }, { id: "uat-signoff-register" }]
};

test("passes when acceptance items remain pending business acceptance under a No-Go release gate", () => {
  const result = evaluateV1AcceptanceChecklistSnapshot({
    checklistText: checklistWithStatuses(Array.from({ length: 17 }, () => "研发验证通过，待业务验收")),
    releaseGateResult: releaseNoGo
  });

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.ok(result.passed.some((check) => check.id === "acceptance-status-release-alignment"));
});

test("fails when all acceptance items are marked business passed while the release gate is No-Go", () => {
  const result = evaluateV1AcceptanceChecklistSnapshot({
    checklistText: checklistWithStatuses(Array.from({ length: 17 }, () => "业务验收通过")),
    releaseGateResult: releaseNoGo
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "acceptance-status-release-alignment"));
});

test("passes when acceptance checklist lists current V1 external UAT handoff artifacts", () => {
  const result = evaluateV1AcceptanceChecklistSnapshot({
    checklistText: checklistWithStatuses(Array.from({ length: 17 }, () => "研发验证通过，待业务验收")),
    releaseGateResult: releaseNoGo
  });

  assert.equal(result.ok, true);
  assert.ok(result.passed.some((check) => check.id === "handoff-artifacts-visible"));
});

test("fails when acceptance checklist omits a current V1 external UAT handoff artifact", () => {
  const result = evaluateV1AcceptanceChecklistSnapshot({
    checklistText: `${checklistWithStatuses(
      Array.from({ length: 17 }, () => "研发验证通过，待业务验收"),
      { includeHandoffArtifacts: false }
    )}

| V1外部UAT请求包 | 已形成 | docs/testing/v1-external-uat-request.md |
| V1外部UAT关闭台账 | 已形成 | docs/testing/v1-external-uat-closure-checklist.md |
| V1外部UAT阻塞项JSON | 已形成 | docs/testing/v1-external-uat-blockers.json |
| V1生成文档一致性检查 | 已形成 | scripts/v1-generated-docs-check.mjs |
| V1最终交接证据一致性检查 | 已形成 | scripts/v1-final-evidence-handoff-check.mjs |
| V1证据秘密扫描 | 已形成 | scripts/v1-secret-scan-check.mjs |
`,
    releaseGateResult: releaseNoGo
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "handoff-artifacts-visible"));
});
