import assert from "node:assert/strict";
import test from "node:test";

import { evaluateV1UatCoverageSnapshot } from "./v1-uat-coverage-check.mjs";

const completeRunbook = `
# UAT Runbook

| 用例 | 场景 | 角色 | 预期 | 证据要求 | 对应验收项 |
|---|---|---|---|---|---|
| UAT-001 | 登录、退出、修改密码 | 销售个人 | 账号可登录 | 截图、操作记录 | AC-001 |
| UAT-002 | 管理员重置密码 | 管理员 | 可重置密码 | 截图、审计记录 | AC-002 |
| UAT-003 | 组织、用户、角色、权限、字典维护 | 管理员 | 可维护基础资料 | 截图、操作记录 | AC-003、AC-004 |
| UAT-004 | 客户和联系人建档 | 销售个人 | 可新建客户联系人 | 截图、数据编号 | AC-006、AC-007 |
| UAT-005 | 商机创建与推进 | 销售个人 | 可维护商机 | 截图、数据编号 | AC-008 |
| UAT-006 | 销售行动完成 | 销售个人 | 最近跟进自动回写 | 截图、操作记录 | AC-010、AC-011 |
| UAT-007 | 风险行动与周进展 | 销售个人/负责人 | 周进展汇总 | 截图、周进展记录 | AC-012、AC-013 |
| UAT-008 | 商机关闭或取消跟进 | 销售个人 | 必填原因 | 截图、操作记录 | AC-009 |
| UAT-009 | 团队查看和个人越权 | 负责人/销售个人 | 数据边界正确 | 截图、账号记录 | AC-005、AC-015、AC-016 |
| UAT-010 | 关键审计日志 | 管理员 | 审计可追溯 | 截图、审计记录 | AC-014、AC-017 |
`;

test("passes when UAT case mapping covers AC-001 through AC-017", () => {
  const result = evaluateV1UatCoverageSnapshot({ runbookText: completeRunbook });

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.equal(result.coveredAcceptanceIds.length, 17);
});

test("fails when acceptance criteria are missing from UAT case mapping", () => {
  const result = evaluateV1UatCoverageSnapshot({
    runbookText: completeRunbook
      .replace("AC-005、", "")
      .replace("AC-014、", "")
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-covers-all-acceptance-items"));
  assert.deepEqual(result.missingAcceptanceIds, ["AC-005", "AC-014"]);
});

test("fails when UAT rows omit owner or evidence requirements", () => {
  const result = evaluateV1UatCoverageSnapshot({
    runbookText: completeRunbook
      .replace("| UAT-004 | 客户和联系人建档 | 销售个人 | 可新建客户联系人 | 截图、数据编号 | AC-006、AC-007 |", "| UAT-004 | 客户和联系人建档 |  | 可新建客户联系人 | 截图、数据编号 | AC-006、AC-007 |")
      .replace("| UAT-006 | 销售行动完成 | 销售个人 | 最近跟进自动回写 | 截图、操作记录 | AC-010、AC-011 |", "| UAT-006 | 销售行动完成 | 销售个人 | 最近跟进自动回写 | 待补充 | AC-010、AC-011 |")
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-case-execution-detail"));
  assert.deepEqual(result.incompleteExecutionDetailIds, ["UAT-004", "UAT-006"]);
});
