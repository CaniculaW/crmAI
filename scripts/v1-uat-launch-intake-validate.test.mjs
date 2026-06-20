import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateUatLaunchIntake } from "./v1-uat-launch-intake-validate.mjs";

const completeIntake = `# CRM V1 UAT Launch Intake

Version: v1.0.0-rc.8
Decision: Go

Rules:

- 不记录明文密码、生产密钥、API tokens 或个人敏感信息。

| Field | Value | Evidence |
|---|---|---|
| 测试环境名称 | CRM-V1-UAT-20260619 | docs/testing/evidence/launch/environment-record.md |
| 前端访问地址 | https://crm-v1-uat.example.test | docs/testing/evidence/launch/frontend-url.md |
| 后端 API 地址 | https://crm-v1-uat-api.example.test | docs/testing/evidence/launch/backend-api.md |
| Git 提交号 | 09c46ac031469604f2a680ef011621854d2d9e23 | https://github.com/CaniculaW/crmAI/actions/runs/27822689146 |
| UAT窗口 | 2026-06-20 09:00 至 2026-06-21 18:00 | docs/testing/evidence/launch/uat-calendar.md |
| 证据归档位置 | docs/testing/evidence/v1-uat/ | docs/testing/evidence/launch/evidence-index.md |

| Participant ID | Role | Owner | Contact | Responsibility | Status |
|---|---|---|---|---|---|
| UAT-SALES | 销售侧验收人 | Zhang Wei | sales@example.test | 验收销售主流程 | 已确认 |
| UAT-MANAGER | 管理侧验收人 | Li Na | manager@example.test | 验收管理视图和权限边界 | 已确认 |
| UAT-PRODUCT | 产品负责人 | Wang Qiang | product@example.test | 确认范围和准出口径 | 已确认 |
| UAT-TEST | 测试负责人 | Chen Min | qa@example.test | 组织执行和证据归档 | 已确认 |
| UAT-DEV | 研发负责人 | Liu Yang | dev@example.test | 支持环境和缺陷修复 | 已确认 |
| UAT-PM | 项目负责人 | Zhao Lin | pm@example.test | 组织 Go/No-Go 会议 | 已确认 |

| Account item | Owner | Status | Evidence |
|---|---|---|---|
| 管理员账号 | Chen Min | 已准备 | docs/testing/evidence/launch/account-admin.md |
| 销售个人账号 | Chen Min | 已准备 | docs/testing/evidence/launch/account-sales.md |
| 销售负责人账号 | Chen Min | 已准备 | docs/testing/evidence/launch/account-manager.md |
| 权限样本账号 | Chen Min | 已准备 | docs/testing/evidence/launch/account-permission-sample.md |
`;

test("passes a complete UAT launch intake", () => {
  const result = evaluateUatLaunchIntake(completeIntake);

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("fails a draft launch intake because external UAT inputs are pending", () => {
  const draft = `# CRM V1 UAT Launch Intake

Version: v1.0.0-rc.8
Decision: No-Go

| Field | Value | Evidence |
|---|---|---|
| 测试环境名称 | 待填写 | 待补充 |
| 前端访问地址 | 待填写 | 待补充 |
| 后端 API 地址 | 待填写 | 待补充 |
| Git 提交号 | 待填写 | 待补充 |
| UAT窗口 | 待确认 | 待补充 |
| 证据归档位置 | 待确认 | 待补充 |

| Participant ID | Role | Owner | Contact | Responsibility | Status |
|---|---|---|---|---|---|
| UAT-SALES | 销售侧验收人 | 待填写 | 待补充 | 验收销售主流程 | 待确认 |
| UAT-MANAGER | 管理侧验收人 | 待填写 | 待补充 | 验收管理视图和权限边界 | 待确认 |
| UAT-PRODUCT | 产品负责人 | 待填写 | 待补充 | 确认范围和准出口径 | 待确认 |
| UAT-TEST | 测试负责人 | 待填写 | 待补充 | 组织执行和证据归档 | 待确认 |
| UAT-DEV | 研发负责人 | 待填写 | 待补充 | 支持环境和缺陷修复 | 待确认 |
| UAT-PM | 项目负责人 | 待填写 | 待补充 | 组织 Go/No-Go 会议 | 待确认 |

| Account item | Owner | Status | Evidence |
|---|---|---|---|
| 管理员账号 | 待填写 | 待准备 | 待补充 |
| 销售个人账号 | 待填写 | 待准备 | 待补充 |
| 销售负责人账号 | 待填写 | 待准备 | 待补充 |
| 权限样本账号 | 待填写 | 待准备 | 待补充 |
`;

  const result = evaluateUatLaunchIntake(draft);

  assert.equal(result.ok, false);
  assert.equal(result.decision, "No-Go");
  assert.ok(result.failed.some((check) => check.id === "environment-intake"));
  assert.ok(result.failed.some((check) => check.id === "participant-roster"));
  assert.ok(result.failed.some((check) => check.id === "account-custody"));
  assert.ok(result.failed.some((check) => check.id === "project-go-decision"));
});

test("fails when a required participant role is missing", () => {
  const result = evaluateUatLaunchIntake(completeIntake.replace(/\| UAT-TEST .+\n/, ""));

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "participant-roster"));
});

test("fails when a confirmed UAT participant owner is only a role label", () => {
  const withRoleLabel = completeIntake.replace(
    "| UAT-SALES | 销售侧验收人 | Zhang Wei | sales@example.test | 验收销售主流程 | 已确认 |",
    "| UAT-SALES | 销售侧验收人 | 销售侧验收人 | sales@example.test | 验收销售主流程 | 已确认 |"
  );

  const result = evaluateUatLaunchIntake(withRoleLabel);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidParticipantOwnerIntakes, ["UAT-SALES"]);
  assert.ok(result.failed.some((check) => check.id === "participant-owner-name-format"));
});

test("fails when a required environment field lacks evidence", () => {
  const withoutEvidence = completeIntake.replace(
    "| 前端访问地址 | https://crm-v1-uat.example.test | docs/testing/evidence/launch/frontend-url.md |",
    "| 前端访问地址 | https://crm-v1-uat.example.test | 待补充 |"
  );

  const result = evaluateUatLaunchIntake(withoutEvidence);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "environment-intake"));
});

test("fails when launch environment URLs or git commit are not structured", () => {
  const intake = completeIntake
    .replace("https://crm-v1-uat.example.test", "crm-v1-uat")
    .replace("https://crm-v1-uat-api.example.test", "api host")
    .replace("09c46ac031469604f2a680ef011621854d2d9e23", "latest");

  const result = evaluateUatLaunchIntake(intake);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidEnvironmentFormats, ["前端访问地址", "后端 API 地址", "Git 提交号"]);
  assert.ok(result.failed.some((check) => check.id === "environment-format"));
});

test("fails when the UAT launch window is not a structured date time range", () => {
  const looseWindow = completeIntake.replace(
    "| UAT窗口 | 2026-06-20 09:00 至 2026-06-21 18:00 | docs/testing/evidence/launch/uat-calendar.md |",
    "| UAT窗口 | 下周 | docs/testing/evidence/launch/uat-calendar.md |"
  );

  const result = evaluateUatLaunchIntake(looseWindow);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidLaunchWindowFields, ["UAT窗口"]);
  assert.ok(result.failed.some((check) => check.id === "launch-window-format"));
});

test("fails when an account custody item is not prepared", () => {
  const notPrepared = completeIntake.replace(
    "| 销售个人账号 | Chen Min | 已准备 | docs/testing/evidence/launch/account-sales.md |",
    "| 销售个人账号 | Chen Min | 待准备 | docs/testing/evidence/launch/account-sales.md |"
  );

  const result = evaluateUatLaunchIntake(notPrepared);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "account-custody"));
});

test("fails when a prepared account custody owner is only a role label", () => {
  const withRoleLabel = completeIntake.replace(
    "| 销售个人账号 | Chen Min | 已准备 | docs/testing/evidence/launch/account-sales.md |",
    "| 销售个人账号 | 测试负责人 | 已准备 | docs/testing/evidence/launch/account-sales.md |"
  );

  const result = evaluateUatLaunchIntake(withRoleLabel);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidAccountOwnerItems, ["销售个人账号"]);
  assert.ok(result.failed.some((check) => check.id === "account-owner-name-format"));
});

test("fails when UAT launch evidence references are not retained", () => {
  const intake = completeIntake
    .replace("docs/testing/evidence/launch/frontend-url.md", "deployment-record#frontend")
    .replace("docs/testing/evidence/launch/account-sales.md", "account-custody#sales");

  const result = evaluateUatLaunchIntake(intake);

  assert.equal(result.ok, false);
  assert.deepEqual(result.unretainedLaunchEvidenceFields, ["前端访问地址"]);
  assert.deepEqual(result.unretainedAccountEvidenceItems, ["销售个人账号"]);
  assert.ok(result.failed.some((check) => check.id === "launch-evidence-retained"));
});

test("fails when UAT launch evidence references point to missing docs artifacts", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "crm-v1-launch-intake-missing-artifact-"));
  const result = evaluateUatLaunchIntake(completeIntake, { rootDir });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingLaunchEvidenceArtifacts, [
    "docs/testing/evidence/launch/environment-record.md",
    "docs/testing/evidence/launch/frontend-url.md",
    "docs/testing/evidence/launch/backend-api.md",
    "docs/testing/evidence/launch/uat-calendar.md",
    "docs/testing/evidence/launch/evidence-index.md",
    "docs/testing/evidence/launch/account-admin.md",
    "docs/testing/evidence/launch/account-sales.md",
    "docs/testing/evidence/launch/account-manager.md",
    "docs/testing/evidence/launch/account-permission-sample.md"
  ]);
  assert.ok(result.failed.some((check) => check.id === "launch-evidence-artifacts"));
});

test("fails when launch intake contains secret-like material", () => {
  const unsafe = `${completeIntake}\nCRM_SMOKE_PASSWORD=S3cure!123\n`;

  const result = evaluateUatLaunchIntake(unsafe);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});
