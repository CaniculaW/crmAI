import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUatExecutionTracker } from "./v1-uat-execution-tracker-validate.mjs";

const completeTracker = `# CRM V1 UAT执行派工与证据追踪表

版本：v1.0.0-rc.8

状态：具名测试环境已确认。正式 UAT 已通过，当前结论：Go。

## 2. 角色与签署责任

| 角色 | 当前负责人 | 责任 | 状态 |
|---|---|---|---|
| 销售侧验收人 | Sales Owner | 验收销售个人主流程 | 已签署 |
| 管理侧验收人 | Manager Owner | 验收团队查看和权限边界 | 已签署 |
| 产品负责人 | Product Owner | 确认V1范围 | 已签署 |
| 测试负责人 | QA Owner | 组织UAT执行 | 已签署 |
| 研发负责人 | Dev Owner | 提供版本和缺陷修复支持 | 已签署 |
| 项目负责人 | PM Owner | 做最终准出判定 | Go |

## 3. 前置检查派工

| 编号 | 检查项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
${Array.from({ length: 6 }, (_, index) => {
  const id = `PRE-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1前置检查 | 项目/测试 | evidence/${id.toLowerCase()}.png | 通过 |`;
}).join("\n")}

## 4. 测试环境Smoke派工

| 编号 | 验证项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
${Array.from({ length: 5 }, (_, index) => {
  const id = `SMK-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1环境Smoke | 测试 | evidence/${id.toLowerCase()}.png | 通过 |`;
}).join("\n")}

## 5. 业务UAT派工

| 编号 | 验收链路 | 主要验收人 | 对应验收项 | 证据要求 | 当前状态 |
|---|---|---|---|---|---|
${Array.from({ length: 10 }, (_, index) => {
  const id = `UAT-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1业务验收链路 | Sales Owner | AC-${String(index + 1).padStart(3, "0")} | evidence/${id.toLowerCase()}.png | 通过 |`;
}).join("\n")}

## 6. 缺陷与回归追踪

| 等级 | 准出要求 | 当前状态 | 证据 |
|---|---|---|---|
| P0 / S1 阻断 | 必须全部关闭并回归通过 | 0未关闭 | defect-summary.md |
| P1 / S2 严重 | 原则上关闭 | 0未关闭 | defect-summary.md |
| P2 / S3 一般 | 评估试点影响 | 已评估 | defect-summary.md |
| P3 / S4 轻微 | 可后续优化 | 已记录 | defect-summary.md |

## 7. Go/No-Go执行门禁

| 门禁 | 命令或证据 | 通过条件 | 当前状态 |
|---|---|---|---|
| UAT证据清单一致性 | \`node scripts/v1-uat-evidence-manifest-validate.mjs v1-uat-evidence-manifest.md\` | 返回 \`PASS\` | PASS |
| UAT具名环境一致性 | \`node scripts/v1-uat-environment-validate.mjs v1-uat-environment-evidence.md\` | 返回 \`PASS\` | PASS |
| UAT证据包一致性 | \`node scripts/v1-uat-evidence-pack-validate.mjs crm-v1-uat-evidence-pack.md\` | 返回 \`PASS\` | PASS |
| UAT缺陷台账一致性 | \`node scripts/v1-uat-defect-register-validate.mjs v1-uat-defect-register.md\` | 返回 \`PASS\` | PASS |
| UAT签署台账一致性 | \`node scripts/v1-uat-signoff-register-validate.mjs v1-uat-signoff-register.md\` | 返回 \`PASS\` | PASS |
| V1最终放行门禁 | \`node scripts/v1-release-gate.mjs . crm-v1-uat-evidence-pack.md crm-v1-uat-execution-tracker.md v1-uat-evidence-manifest.md v1-uat-defect-register.md v1-uat-environment-evidence.md v1-uat-signoff-register.md\` | 返回 \`PASS\` | PASS |
| 项目签署 | 销售侧验收人、管理侧验收人、产品负责人、测试负责人、研发负责人、项目负责人 | 全部签署完成 | 已完成 |

## 8. 当前结论

当前结论：Go。
`;

test("passes a complete UAT execution tracker with Go decision", () => {
  const result = evaluateUatExecutionTracker(completeTracker);

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("fails the current rc8 tracker because external UAT remains pending", () => {
  const currentTracker = `# CRM V1 UAT执行派工与证据追踪表

版本：v1.0.0-rc.8

状态：具名测试环境待确认。当前工程侧证据已完成，正式 UAT 仍为 \`No-Go\`。

| 角色 | 当前负责人 | 责任 | 状态 |
|---|---|---|---|
| 销售侧验收人 | 待项目指定 | 验收销售个人主流程 | 待确认 |
| 管理侧验收人 | 待项目指定 | 验收团队查看 | 待确认 |
| 产品负责人 | 待项目指定 | 确认V1范围 | 待确认 |
| 测试负责人 | 待项目指定 | 组织UAT执行 | 待确认 |
| 研发负责人 | Codex研发Agent | 提供版本支持 | 工程侧已就绪 |
| 项目负责人 | 待项目指定 | 做最终准出判定 | 待确认 |

| 编号 | 检查项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
| PRE-001 | 测试环境域名 | 研发/运维 | 截图 | 待执行 |

当前结论：No-Go。
`;

  const result = evaluateUatExecutionTracker(currentTracker);

  assert.equal(result.ok, false);
  assert.equal(result.decision, "No-Go");
  assert.ok(result.failed.some((check) => check.id === "required-items"));
  assert.ok(result.failed.some((check) => check.id === "roles-assigned"));
  assert.ok(result.failed.some((check) => check.id === "go-decision"));
});

test("fails when a passed UAT row lacks concrete evidence", () => {
  const tracker = completeTracker.replace(
    "| UAT-006 | V1业务验收链路 | Sales Owner | AC-006 | evidence/uat-006.png | 通过 |",
    "| UAT-006 | V1业务验收链路 | Sales Owner | AC-006 | 待填写 | 通过 |"
  );

  const result = evaluateUatExecutionTracker(tracker);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-cases"));
});

test("fails when the UAT defect register gate is not PASS", () => {
  const tracker = completeTracker.replace(
    "| UAT缺陷台账一致性 | `node scripts/v1-uat-defect-register-validate.mjs v1-uat-defect-register.md` | 返回 `PASS` | PASS |",
    "| UAT缺陷台账一致性 | `node scripts/v1-uat-defect-register-validate.mjs v1-uat-defect-register.md` | 返回 `PASS` | FAIL |"
  );

  const result = evaluateUatExecutionTracker(tracker);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => (
    check.id === "release-gates" && check.message.includes("UAT缺陷台账一致性")
  )));
});

test("fails when the UAT signoff register gate is missing", () => {
  const tracker = completeTracker.replace(
    "| UAT签署台账一致性 | `node scripts/v1-uat-signoff-register-validate.mjs v1-uat-signoff-register.md` | 返回 `PASS` | PASS |\n",
    ""
  );

  const result = evaluateUatExecutionTracker(tracker);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => (
    check.id === "release-gates" && check.message.includes("UAT签署台账一致性")
  )));
});
