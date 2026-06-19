import assert from "node:assert/strict";
import test from "node:test";

import { evaluateV1TraceabilitySnapshot } from "./v1-traceability-check.mjs";

function traceabilityWithRows(rows, conclusion = "若目标口径是“项目 V1 验收通过”，仍需完成具名测试环境验证和业务验收签署。") {
  return `
# CRM V1 验证追踪矩阵

## 1. 当前总览

| 类别 | 数量 | 说明 |
|---|---:|---|
| 研发验证通过 | 17 | AC-001 至 AC-017 均已有研发侧自动化或本地部署态证据 |
| 业务待验收 | 17 | 所有 AC 仍需业务侧在具名测试环境中确认试点可用性 |
| 外部待确认 | 3 | 测试环境部署、真实试点账号/数据、验收人签署 |

## 2. 验收项追踪

| 验收项 | 研发侧状态 | 主要证据 | 业务/环境剩余动作 |
|---|---|---|---|
${rows.join("\n")}

## 5. 结论

${conclusion}
`;
}

const completeRows = Array.from({ length: 17 }, (_, index) => {
  const id = `AC-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} 验收项 | 研发验证通过 | \`Evidence${index + 1}Test\` | 业务侧待验收 |`;
});

const releaseNoGo = { ok: false, decision: "No-Go" };

test("passes when traceability covers every V1 acceptance item with pending business validation", () => {
  const result = evaluateV1TraceabilitySnapshot({
    traceabilityText: traceabilityWithRows(completeRows),
    releaseGateResult: releaseNoGo
  });

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.equal(result.rows.length, 17);
});

test("fails when traceability omits an acceptance item", () => {
  const result = evaluateV1TraceabilitySnapshot({
    traceabilityText: traceabilityWithRows(completeRows.filter((row) => !row.includes("AC-014"))),
    releaseGateResult: releaseNoGo
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "traceability-covers-acceptance-items"));
  assert.deepEqual(result.missingAcceptanceIds, ["AC-014"]);
});

test("fails when traceability claims project acceptance while release gate is No-Go", () => {
  const result = evaluateV1TraceabilitySnapshot({
    traceabilityText: traceabilityWithRows(completeRows, "项目 V1 验收通过，可正式发布。"),
    releaseGateResult: releaseNoGo
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "traceability-release-alignment"));
});
