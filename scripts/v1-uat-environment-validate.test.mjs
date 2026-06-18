import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUatEnvironmentEvidence } from "./v1-uat-environment-validate.mjs";

const completeEnvironment = `# CRM V1 UAT Environment Evidence

Version: v1.0.0-rc.8
Decision: Go

## Environment Summary

| Item | Value |
|---|---|
| 测试环境名称 | CRM-V1-UAT-20260619 |
| 前端访问地址 | https://crm-v1-uat.example.com/system |
| 后端 API 地址 | https://crm-v1-uat-api.example.com |
| 候选版本 | v1.0.0-rc.8 |
| Git 提交号 | ce6c06389fbde5cb5910d54b840a9afd6f7127f9 |

## Environment Checks

| Check ID | Check item | Status | Evidence reference | Owner |
|---|---|---|---|---|
| ENV-001 | 前端登录页可访问 | PASS | docs/testing/evidence/env/login-page.png | QA Owner |
| ENV-002 | 后端健康检查可用 | PASS | docs/testing/evidence/env/health-check.txt | DevOps Owner |
| ENV-003 | 数据库迁移完成 | PASS | docs/testing/evidence/env/flyway-history.png | DevOps Owner |
| ENV-004 | 管理员账号可登录 | PASS | docs/testing/evidence/env/admin-login.png | QA Owner |
| ENV-005 | 销售个人账号可登录并可操作 | PASS | docs/testing/evidence/env/sales-user.png | QA Owner |
| ENV-006 | 销售负责人账号可查看团队 | PASS | docs/testing/evidence/env/sales-manager.png | QA Owner |
| ENV-007 | 权限样本账号覆盖本人/本部门/协同/全局 | PASS | docs/testing/evidence/env/permission-samples.md | QA Owner |
| ENV-008 | 浏览器 Smoke 无 console warning/error | PASS | docs/testing/evidence/env/browser-smoke.json | QA Owner |
`;

test("passes a complete named UAT environment evidence record", () => {
  const result = evaluateUatEnvironmentEvidence(completeEnvironment);

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("fails a draft environment record when named environment evidence is pending", () => {
  const draftEnvironment = `# CRM V1 UAT Environment Evidence

Version: v1.0.0-rc.8
Decision: No-Go

| Item | Value |
|---|---|
| 测试环境名称 | 待确认 |
| 前端访问地址 | 待填写 |
| 后端 API 地址 | 待填写 |
| 候选版本 | v1.0.0-rc.8 |
| Git 提交号 | 待填写 |

| Check ID | Check item | Status | Evidence reference | Owner |
|---|---|---|---|---|
| ENV-DRAFT | 待补充 | PENDING | 待补充 | 待补充 |
`;

  const result = evaluateUatEnvironmentEvidence(draftEnvironment);

  assert.equal(result.ok, false);
  assert.equal(result.decision, "No-Go");
  assert.ok(result.failed.some((check) => check.id === "environment-summary"));
  assert.ok(result.failed.some((check) => check.id === "environment-checks"));
  assert.ok(result.failed.some((check) => check.id === "go-decision"));
});

test("fails when a required environment check is missing", () => {
  const environment = completeEnvironment.replace(
    "| ENV-006 | 销售负责人账号可查看团队 | PASS | docs/testing/evidence/env/sales-manager.png | QA Owner |\n",
    ""
  );

  const result = evaluateUatEnvironmentEvidence(environment);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-checks"));
});

test("fails when a PASS environment check lacks concrete evidence", () => {
  const environment = completeEnvironment.replace(
    "| ENV-005 | 销售个人账号可登录并可操作 | PASS | docs/testing/evidence/env/sales-user.png | QA Owner |",
    "| ENV-005 | 销售个人账号可登录并可操作 | PASS | 待补充 | QA Owner |"
  );

  const result = evaluateUatEnvironmentEvidence(environment);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "environment-checks"));
});

test("fails when environment evidence contains secret-like material", () => {
  const environment = completeEnvironment.replace(
    "| ENV-004 | 管理员账号可登录 | PASS | docs/testing/evidence/env/admin-login.png | QA Owner |",
    "| ENV-004 | 管理员账号可登录 | PASS | password=S3cure!123 | QA Owner |"
  );

  const result = evaluateUatEnvironmentEvidence(environment);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});
