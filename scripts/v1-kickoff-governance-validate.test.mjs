import assert from "node:assert/strict";
import test from "node:test";

import { evaluateKickoffGovernance } from "./v1-kickoff-governance-validate.mjs";

const completeKickoff = `# CRM研发启动会纪要

日期：2026-06-17
Decision: Go

## 参会人

| 角色 | 姓名 | 确认状态 | Evidence | 备注 |
|---|---|---|---|---|
| 产品负责人 | Product Owner | 已确认 | docs/meeting-notes/evidence/kickoff/product-owner.md | 负责需求冻结、范围管理和业务验收协调 |
| 业务验收人-销售侧 | Sales Owner | 已确认 | docs/meeting-notes/evidence/kickoff/sales-owner.md | 验收销售主流程 |
| 业务验收人-管理侧 | Manager Owner | 已确认 | docs/meeting-notes/evidence/kickoff/manager-owner.md | 验收管理视图和权限边界 |
| 研发负责人 | Dev Owner | 已确认 | docs/meeting-notes/evidence/kickoff/dev-owner.md | 负责技术方案、排期和交付协调 |
| 前端负责人 | Frontend Owner | 已确认 | docs/meeting-notes/evidence/kickoff/frontend-owner.md | 负责 Web 管理端页面交付 |
| 后端负责人 | Backend Owner | 已确认 | docs/meeting-notes/evidence/kickoff/backend-owner.md | 负责 API、权限、数据和业务服务 |
| 测试负责人 | QA Owner | 已确认 | docs/meeting-notes/evidence/kickoff/qa-owner.md | 负责测试用例、集成测试和验收验证 |

## 启动确认基线

| 事项 | 当前口径 | 确认状态 | Evidence |
|---|---|---|---|
| 产品目标 | 替代销售 Excel 中核心客户、商机、行动和周进展管理，先跑通销售基础闭环 | 已确认 | docs/meeting-notes/evidence/kickoff/product-goal.md |
| V1 模块范围 | 系统基础与权限管理、客户池、联系人与干系人、商机生命周期、销售行动、商机周进展汇总 | 已确认 | docs/meeting-notes/evidence/kickoff/v1-scope.md |
| V1 业务闭环 | 登录 -> 创建客户 -> 创建联系人/干系人 -> 创建商机 -> 推进商机阶段与状态 -> 创建销售行动 -> 自动回写客户和商机最近跟进 -> 自动生成商机周进展汇总 | 已确认 | docs/meeting-notes/evidence/kickoff/v1-loop.md |
| V1 暂不做 | 方案标书、合同、开票、回款、发票与回款多对多核销、经营驾驶舱完整指标、AI 销售助手完整能力 | 已确认 | docs/meeting-notes/evidence/kickoff/out-of-scope.md |
| 上线周期 | 2026-07-29 至 2026-08-12 | 已确认 | docs/meeting-notes/evidence/kickoff/schedule.md |
| 技术栈 | React + Ant Design、Java Spring Boot、PostgreSQL | 已确认 | docs/architecture/tech-stack-decision.md |
| 验收方式 | 以核心链路和页面验收点为主，销售侧与管理侧共同确认 | 已确认 | docs/meeting-notes/evidence/kickoff/acceptance-mode.md |
| V1范围冻结 | V1 仅包含销售基础闭环，超出范围进入后续版本池 | 已冻结 | docs/meeting-notes/evidence/kickoff/scope-freeze.md |

## V1 范围

- 系统基础与权限管理
- 客户池
- 联系人与干系人
- 商机生命周期
- 销售行动
- 周进展

## V1 不含范围

- 方案与标书模块。
- 合同管理模块。
- 开票管理模块。
- 回款管理模块。
- 经营驾驶舱完整指标。
- AI 销售助手完整能力。
`;

test("passes a complete kickoff governance record", () => {
  const result = evaluateKickoffGovernance(completeKickoff);

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("fails the current kickoff draft because owners and scope freeze remain pending", () => {
  const draft = `# CRM研发启动会纪要

日期：2026-06-17
Decision: No-Go

| 角色 | 姓名 | 确认状态 | 备注 |
|---|---|---|---|
| 产品负责人 | 待确认 | 待确认 | 负责需求冻结、范围管理和业务验收协调 |
| 业务验收人-销售侧 | 待确认 | 待确认 | 必须在 Sprint 0 完成指定 |
| 业务验收人-管理侧 | 待确认 | 待确认 | 必须在 Sprint 0 完成指定 |
| 研发负责人 | 待确认 | 待确认 | 负责技术方案、排期和交付协调 |
| 前端负责人 | 待确认 | 待确认 | 负责 Web 管理端页面交付 |
| 后端负责人 | 待确认 | 待确认 | 负责 API、权限、数据和业务服务 |
| 测试负责人 | 待确认 | 待确认 | 负责测试用例、集成测试和验收验证 |

| 事项 | 当前口径 | 确认状态 |
|---|---|---|
| V1 模块范围 | 系统基础与权限管理、客户池、联系人与干系人、商机生命周期、销售行动、商机周进展汇总 | 待确认 |
| V1 暂不做 | 方案标书、合同、开票、回款、经营驾驶舱完整指标、AI 销售助手完整能力 | 待确认 |
| V1范围冻结 | V1 仅包含销售基础闭环，超出范围进入后续版本池 | 待确认 |
`;

  const result = evaluateKickoffGovernance(draft);

  assert.equal(result.ok, false);
  assert.equal(result.decision, "No-Go");
  assert.ok(result.failed.some((check) => check.id === "required-owners"));
  assert.ok(result.failed.some((check) => check.id === "scope-freeze"));
  assert.ok(result.failed.some((check) => check.id === "project-go-decision"));
});

test("fails when a required owner role is missing", () => {
  const result = evaluateKickoffGovernance(completeKickoff.replace(/\| 测试负责人 .+\n/, ""));

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-owners"));
});

test("fails when V2 or AI scope is allowed into V1", () => {
  const expanded = completeKickoff.replace(
    "| V1范围冻结 | V1 仅包含销售基础闭环，超出范围进入后续版本池 | 已冻结 | docs/meeting-notes/evidence/kickoff/scope-freeze.md |",
    "| V1范围冻结 | V1 同时交付合同管理和 AI 销售助手完整能力 | 已冻结 | docs/meeting-notes/evidence/kickoff/scope-freeze.md |"
  );

  const result = evaluateKickoffGovernance(expanded);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "scope-boundary"));
});

test("fails when kickoff schedule is not a structured date range", () => {
  const looseSchedule = completeKickoff.replace(
    "| 上线周期 | 2026-07-29 至 2026-08-12 | 已确认 | docs/meeting-notes/evidence/kickoff/schedule.md |",
    "| 上线周期 | 6-8周 | 已确认 | docs/meeting-notes/evidence/kickoff/schedule.md |"
  );

  const result = evaluateKickoffGovernance(looseSchedule);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidScheduleFields, ["上线周期"]);
  assert.ok(result.failed.some((check) => check.id === "schedule-format"));
});

test("fails when confirmed kickoff governance evidence is not retained", () => {
  const unretained = completeKickoff
    .replace("docs/meeting-notes/evidence/kickoff/product-owner.md", "meeting-minutes#product-owner")
    .replace("docs/meeting-notes/evidence/kickoff/scope-freeze.md", "meeting-minutes#scope-freeze");

  const result = evaluateKickoffGovernance(unretained);

  assert.equal(result.ok, false);
  assert.deepEqual(result.unretainedOwnerEvidenceRoles, ["产品负责人"]);
  assert.deepEqual(result.unretainedScopeEvidenceItems, ["V1范围冻结"]);
  assert.ok(result.failed.some((check) => check.id === "kickoff-evidence-retained"));
});

test("fails when kickoff governance contains secret-like material", () => {
  const unsafe = `${completeKickoff}\nCRM_ADMIN_PASSWORD=S3cure!123\n`;

  const result = evaluateKickoffGovernance(unsafe);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});
