import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateV1ReleaseGate, evaluateV1ReleaseGateFromFiles, parseArgs, renderResult } from "./v1-release-gate.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";

const passingReadinessResult = {
  ok: true,
  failed: []
};

const failingReadinessResult = {
  ok: false,
  failed: [{ id: "compose-uat-evidence" }]
};

const passingKickoffResult = {
  ok: true,
  failed: []
};

const failingKickoffResult = {
  ok: false,
  failed: [{ id: "required-owners" }, { id: "scope-freeze" }]
};

const passingLaunchIntakeResult = {
  ok: true,
  failed: []
};

const failingLaunchIntakeResult = {
  ok: false,
  failed: [{ id: "participant-roster" }, { id: "account-custody" }]
};

const passingTrackerResult = {
  ok: true,
  failed: []
};

const failingTrackerResult = {
  ok: false,
  failed: [{ id: "uat-cases" }, { id: "release-gates" }]
};

const passingManifestResult = {
  ok: true,
  failed: []
};

const failingManifestResult = {
  ok: false,
  failed: [{ id: "evidence-complete" }, { id: "go-decision" }]
};

const passingEnvironmentResult = {
  ok: true,
  failed: []
};

const failingEnvironmentResult = {
  ok: false,
  failed: [{ id: "environment-summary" }, { id: "environment-checks" }]
};

const passingDefectRegisterResult = {
  ok: true,
  failed: []
};

const failingDefectRegisterResult = {
  ok: false,
  failed: [{ id: "p0-p1-summary" }, { id: "go-decision" }]
};

const passingSignoffRegisterResult = {
  ok: true,
  failed: []
};

const failingSignoffRegisterResult = {
  ok: false,
  failed: [{ id: "required-signoffs" }, { id: "project-go-decision" }]
};

const failingEvidenceReferenceResult = {
  ok: false,
  failed: [{ id: "pass-reference-artifacts" }]
};

function goEvidencePack(decision = "Go") {
  const projectDecision = decision === "Conditional Go" ? "Conditional Go" : decision;

  return `# CRM V1 UAT 证据包与 Go/No-Go 记录

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 验收日期 | 2026-06-19 |
| 测试环境名称 | crm-v1-test |
| 前端访问地址 | https://crm-test.example.com |
| 后端 API 地址 | https://crm-test-api.example.com |
| Git 提交号 | 0f9ab8dbc49c8f30b26269a2e4807a7747852905 |
| 候选版本 | v1.0.0-rc.8 |

## 2. 自动化验证结果

| 命令 | 执行环境 | 结果 | 证据文件 |
|---|---|---|---|
| \`mvn test\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27779354840 |
| \`mvn verify -Ppostgres-it\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27779354840 |
| \`npm test\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27779354840 |
| \`npm run build\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27779354840 |
| \`npm run smoke:v1:browser\` | crm-v1-test | 通过 | docs/testing/evidence/smoke.png |
| \`/api/bootstrap Smoke\` | crm-v1-test | 通过 | docs/testing/evidence/bootstrap.json |

## 3. 环境与账号证据

| 证据项 | 通过标准 | 结果 | 证据文件 |
|---|---|---|---|
| 前端登录页可访问 | 显示 CRM 登录表单 | 通过 | docs/testing/evidence/env/login.png |
| 后端健康检查 | /api/health 返回 200 | 通过 | docs/testing/evidence/env/health.txt |
| 数据库迁移 | Flyway 14 个迁移脚本完成 | 通过 | docs/testing/evidence/env/migration.txt |
| 管理员账号 | 可登录，可进入系统管理页 | 通过 | docs/testing/evidence/env/admin.png |
| 销售个人账号 | 可登录，可创建客户/商机/行动 | 通过 | docs/testing/evidence/env/sales.png |
| 销售负责人账号 | 可查看本部门数据 | 通过 | docs/testing/evidence/env/manager.png |
| 权限样本账号 | 可验证数据范围 | 通过 | docs/testing/evidence/env/permissions.png |

## 4. 业务演示验收记录

| 编号 | 验收链路 | 验收人 | 结果 | 证据文件 | 遗留问题 |
|---|---|---|---|---|---|
${Array.from({ length: 10 }, (_, index) => {
  const id = `UAT-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1 验收链路 | Sales Owner | 通过 | docs/testing/evidence/uat/${id.toLowerCase()}.png | 无 |`;
}).join("\n")}

## 5. 缺陷汇总

| 等级 | 数量 | 未关闭数量 | 准出影响 | 处理结论 |
|---|---:|---:|---|---|
| P0 / S1 阻断 | 0 | 0 | 不允许准出 | 无 |
| P1 / S2 严重 | 0 | 0 | 需关闭或形成业务认可规避方案 | 无 |
| P2 / S3 一般 | 1 | 0 | 可进入版本修复池，需评估试点影响 | 已关闭 |
| P3 / S4 轻微 | 2 | 0 | 可后续优化 | 纳入优化池 |

## 7. Go/No-Go 判定

| 判定项 | Go 条件 | 当前结果 | 是否满足 |
|---|---|---|---|
| 自动化验证 | 后端、前端、构建、浏览器 Smoke 均通过 | 通过 | 是 |
| 测试环境 Smoke | 登录、系统管理、bootstrap 均通过 | 通过 | 是 |
| P0 缺陷 | 无未关闭 P0/S1 | 0 未关闭 | 是 |
| P1 缺陷 | 已关闭或业务认可规避方案 | 0 未关闭 | 是 |
| 业务验收 | 销售侧、管理侧完成确认 | 已确认 | 是 |
| 上线风险 | 观察项和回滚条件已记录 | 已记录 | 是 |

Go/No-Go 结论：

\`\`\`text
选择：${decision}

结论说明：同意进入 V1 试点。
\`\`\`

## 8. 签署

| 角色 | 姓名 | 结论 | 日期 | 证据文件 |
|---|---|---|---|---|
| 销售侧验收人 | Sales Owner | 同意 | 2026-06-19 | docs/testing/evidence/signoff/sales-approval.md |
| 管理侧验收人 | Manager Owner | 同意 | 2026-06-19 | docs/testing/evidence/signoff/manager-approval.md |
| 产品负责人 | Product | 同意 | 2026-06-19 | docs/testing/evidence/signoff/product-approval.md |
| 测试负责人 | QA | 同意 | 2026-06-19 | docs/testing/evidence/signoff/test-approval.md |
| 研发负责人 | Dev | 同意 | 2026-06-19 | docs/testing/evidence/signoff/dev-approval.md |
| 项目负责人 | PM | ${projectDecision} | 2026-06-19 | docs/testing/evidence/signoff/project-go.md |
`;
}

const completeKickoff = `# CRM研发启动会纪要

日期：2026-06-17
Decision: Go

| 角色 | 姓名 | 确认状态 | Evidence | 备注 |
|---|---|---|---|---|
| 产品负责人 | Wang Qiang | 已确认 | docs/meeting-notes/evidence/kickoff/product-owner.md | 负责需求冻结、范围管理和业务验收协调 |
| 业务验收人-销售侧 | Li Na | 已确认 | docs/meeting-notes/evidence/kickoff/sales-owner.md | 验收销售主流程 |
| 业务验收人-管理侧 | Zhou Rui | 已确认 | docs/meeting-notes/evidence/kickoff/manager-owner.md | 验收管理视图和权限边界 |
| 研发负责人 | Liu Yang | 已确认 | docs/meeting-notes/evidence/kickoff/dev-owner.md | 负责技术方案、排期和交付协调 |
| 前端负责人 | Sun Hao | 已确认 | docs/meeting-notes/evidence/kickoff/frontend-owner.md | 负责 Web 管理端页面交付 |
| 后端负责人 | He Lei | 已确认 | docs/meeting-notes/evidence/kickoff/backend-owner.md | 负责 API、权限、数据和业务服务 |
| 测试负责人 | Chen Min | 已确认 | docs/meeting-notes/evidence/kickoff/qa-owner.md | 负责测试用例、集成测试和验收验证 |

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

const completeLaunchIntake = `# CRM V1 UAT Launch Intake

Version: v1.0.0-rc.8
Decision: Go

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
${Array.from({ length: 8 }, (_, index) => {
  const id = `ENV-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1环境检查 | PASS | docs/testing/evidence/${id.toLowerCase()}.png | Chen Min |`;
}).join("\n")}
`;

const completeTracker = `# CRM V1 UAT执行派工与证据追踪表

版本：v1.0.0-rc.8

状态：具名测试环境已确认。正式 UAT 已通过，当前结论：Go。

| 角色 | 当前负责人 | 责任 | 状态 |
|---|---|---|---|
| 销售侧验收人 | Sales Owner | 验收销售个人主流程 | 已签署 |
| 管理侧验收人 | Manager Owner | 验收团队查看和权限边界 | 已签署 |
| 产品负责人 | Product Owner | 确认V1范围 | 已签署 |
| 测试负责人 | QA Owner | 组织UAT执行 | 已签署 |
| 研发负责人 | Dev Owner | 提供版本和缺陷修复支持 | 已签署 |
| 项目负责人 | PM Owner | 做最终准出判定 | Go |

| 编号 | 检查项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
${Array.from({ length: 6 }, (_, index) => {
  const id = `PRE-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1前置检查 | 项目/测试 | docs/testing/evidence/tracker/${id.toLowerCase()}.png | 通过 |`;
}).join("\n")}

| 编号 | 验证项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
${Array.from({ length: 5 }, (_, index) => {
  const id = `SMK-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1环境Smoke | 测试 | docs/testing/evidence/tracker/${id.toLowerCase()}.png | 通过 |`;
}).join("\n")}

| 编号 | 验收链路 | 主要验收人 | 对应验收项 | 证据要求 | 当前状态 |
|---|---|---|---|---|---|
${Array.from({ length: 10 }, (_, index) => {
  const id = `UAT-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1业务验收链路 | Sales Owner | AC-${String(index + 1).padStart(3, "0")} | docs/testing/evidence/tracker/${id.toLowerCase()}.png | 通过 |`;
}).join("\n")}

| 等级 | 准出要求 | 当前状态 | 证据 |
|---|---|---|---|
| P0 / S1 阻断 | 必须全部关闭并回归通过 | 0未关闭 | docs/testing/evidence/tracker/defect-summary.md |
| P1 / S2 严重 | 原则上关闭 | 0未关闭 | docs/testing/evidence/tracker/defect-summary.md |
| P2 / S3 一般 | 评估试点影响 | 已评估 | docs/testing/evidence/tracker/defect-summary.md |
| P3 / S4 轻微 | 可后续优化 | 已记录 | docs/testing/evidence/tracker/defect-summary.md |

| 门禁 | 命令或证据 | 通过条件 | 当前状态 |
|---|---|---|---|
| UAT证据清单一致性 | \`node scripts/v1-uat-evidence-manifest-validate.mjs v1-uat-evidence-manifest.md\` | 返回 \`PASS\` | PASS |
| UAT具名环境一致性 | \`node scripts/v1-uat-environment-validate.mjs v1-uat-environment-evidence.md\` | 返回 \`PASS\` | PASS |
| UAT证据包一致性 | \`node scripts/v1-uat-evidence-pack-validate.mjs crm-v1-uat-evidence-pack.md\` | 返回 \`PASS\` | PASS |
| UAT缺陷台账一致性 | \`node scripts/v1-uat-defect-register-validate.mjs v1-uat-defect-register.md\` | 返回 \`PASS\` | PASS |
| UAT签署台账一致性 | \`node scripts/v1-uat-signoff-register-validate.mjs v1-uat-signoff-register.md\` | 返回 \`PASS\` | PASS |
| V1最终放行门禁 | \`node scripts/v1-release-gate.mjs . crm-v1-uat-evidence-pack.md crm-v1-uat-execution-tracker.md v1-uat-evidence-manifest.md v1-uat-defect-register.md v1-uat-environment-evidence.md v1-uat-signoff-register.md v1-uat-launch-intake.md\` | 返回 \`PASS\` | PASS |
| 项目签署 | 销售侧验收人、管理侧验收人、产品负责人、测试负责人、研发负责人、项目负责人 | 全部签署完成 | 已完成 |

当前结论：Go。
`;

const completeDefectRegister = `# CRM V1 UAT Defect Register

Version: v1.0.0-rc.8
Decision: Go

| Severity | Total | Open | Closure evidence |
|---|---:|---:|---|
| P0 / S1 阻断 | 1 | 0 | docs/testing/evidence/defects/p0-regression.md |
| P1 / S2 严重 | 1 | 0 | docs/testing/evidence/defects/p1-regression.md |
| P2 / S3 一般 | 1 | 0 | docs/testing/evidence/defects/p2-triage.md |
| P3 / S4 轻微 | 0 | 0 | docs/testing/evidence/defects/p3-triage.md |

| Defect ID | Severity | Source case | Status | Owner | Resolution | Regression evidence | Business decision |
|---|---|---|---|---|---|---|---|
| DEF-001 | P0 / S1 阻断 | UAT-004 | VERIFIED | Dev Owner | 修复客户保存失败 | docs/testing/evidence/defects/def-001-regression.png | 已关闭 |
| DEF-002 | P1 / S2 严重 | UAT-009 | VERIFIED | Dev Owner | 修复部门数据范围 | docs/testing/evidence/defects/def-002-regression.png | 已关闭 |
| DEF-003 | P2 / S3 一般 | UAT-007 | CLOSED | Product Owner | 纳入优化池 | docs/testing/evidence/defects/def-003-triage.md | 不影响试点 |
`;

const completeSignoffRegister = `# CRM V1 UAT Signoff Register

Version: v1.0.0-rc.8
Decision: Go

| Signoff ID | Role | Owner | Decision | Signed date | Evidence reference | Notes |
|---|---|---|---|---|---|---|
| SIGNOFF-SALES | 销售侧验收人 | Zhang Wei | 同意 | 2026-06-19 | docs/testing/evidence/signoff/sales-approval.md | 销售侧验收通过 |
| SIGNOFF-MANAGER | 管理侧验收人 | Li Na | 同意 | 2026-06-19 | docs/testing/evidence/signoff/manager-approval.md | 管理侧验收通过 |
| SIGNOFF-PRODUCT | 产品负责人 | Wang Qiang | 同意 | 2026-06-19 | docs/testing/evidence/signoff/product-scope-approval.md | 范围确认 |
| SIGNOFF-TEST | 测试负责人 | Chen Min | 同意 | 2026-06-19 | docs/testing/evidence/signoff/test-summary.md | 测试准出 |
| SIGNOFF-DEV | 研发负责人 | Liu Yang | 同意 | 2026-06-19 | docs/testing/evidence/signoff/dev-release-note.md | 研发准出 |
| SIGNOFF-PM | 项目负责人 | Zhao Lin | Go | 2026-06-19 | docs/testing/v1-go-no-go-meeting.md#final-signoff | 项目同意 V1 试点 |
`;

const requiredManifestIds = [
  "ENV-EVIDENCE",
  ...Array.from({ length: 6 }, (_, index) => `PRE-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 5 }, (_, index) => `SMK-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`),
  "DEF-REGISTER",
  "DEF-P0",
  "DEF-P1",
  "SIGNOFF-REGISTER",
  "SIGNOFF-SALES",
  "SIGNOFF-MANAGER",
  "SIGNOFF-PRODUCT",
  "SIGNOFF-TEST",
  "SIGNOFF-DEV",
  "SIGNOFF-PM",
  "GO-NOGO"
];

const completeManifest = `# CRM V1 UAT Evidence Manifest

Version: v1.0.0-rc.8
Decision: Go

| Evidence ID | Type | Owner | Status | Evidence reference | Notes |
|---|---|---|---|---|---|
${requiredManifestIds.map((id) => `| ${id} | UAT evidence | QA Owner | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md | Verified |`).join("\n")}
`;

function writeFixtureFile(rootDir, filename, content) {
  const filePath = path.join(rootDir, filename);
  writeFileSync(filePath, content);
  return filePath;
}

test("passes only when readiness, UAT environment, UAT evidence, defect register, and project Go are all complete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("passes from filled UAT source files when every validator and project Go evidence is complete", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "crm-v1-release-gate-go-"));
  const evidencePath = writeFixtureFile(fixtureDir, "evidence-pack.md", goEvidencePack("Go"));
  const trackerPath = writeFixtureFile(fixtureDir, "execution-tracker.md", completeTracker);
  const manifestPath = writeFixtureFile(fixtureDir, "evidence-manifest.md", completeManifest);
  const defectRegisterPath = writeFixtureFile(fixtureDir, "defect-register.md", completeDefectRegister);
  const environmentPath = writeFixtureFile(fixtureDir, "environment.md", completeEnvironment);
  const signoffRegisterPath = writeFixtureFile(fixtureDir, "signoffs.md", completeSignoffRegister);
  const launchIntakePath = writeFixtureFile(fixtureDir, "launch-intake.md", completeLaunchIntake);
  const kickoffPath = writeFixtureFile(fixtureDir, "kickoff.md", completeKickoff);

  const result = evaluateV1ReleaseGateFromFiles(
    process.cwd(),
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  );

  assert.equal(result.ok, true);
  assert.equal(result.decision, "Go");
  assert.deepEqual(result.failed, []);
});

test("parses named CLI options for external V1 release gate source paths", () => {
  const parsed = parseArgs([
    "--json",
    "--root",
    "/workspace/crm",
    "--evidence",
    "/tmp/evidence-pack.md",
    "--tracker",
    "/tmp/execution-tracker.md",
    "--manifest",
    "/tmp/evidence-manifest.md",
    "--defects",
    "/tmp/defect-register.md",
    "--environment",
    "/tmp/environment.md",
    "--signoffs",
    "/tmp/signoffs.md",
    "--launch-intake",
    "/tmp/launch-intake.md",
    "--kickoff",
    "/tmp/kickoff.md"
  ]);

  assert.equal(parsed.outputFormat, "json");
  assert.equal(parsed.rootDir, "/workspace/crm");
  assert.equal(parsed.evidencePath, "/tmp/evidence-pack.md");
  assert.equal(parsed.trackerPath, "/tmp/execution-tracker.md");
  assert.equal(parsed.manifestPath, "/tmp/evidence-manifest.md");
  assert.equal(parsed.defectRegisterPath, "/tmp/defect-register.md");
  assert.equal(parsed.environmentPath, "/tmp/environment.md");
  assert.equal(parsed.signoffRegisterPath, "/tmp/signoffs.md");
  assert.equal(parsed.launchIntakePath, "/tmp/launch-intake.md");
  assert.equal(parsed.kickoffPath, "/tmp/kickoff.md");
});

test("renders V1 release gate results as machine-readable JSON", () => {
  const uatEvidenceResult = evaluateUatEvidencePack("# Incomplete evidence pack");
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  const parsed = JSON.parse(renderResult(result, "json"));

  assert.equal(parsed.result, "FAIL");
  assert.equal(parsed.decision, "MISSING");
  assert.ok(parsed.checks.some((check) => check.id === "uat-evidence-pack" && check.ok === false));
});

test("fails when RC/UAT readiness has a failed check", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: failingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "rc-uat-readiness"));
});

test("fails when kickoff governance remains incomplete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    kickoffResult: failingKickoffResult,
    launchIntakeResult: passingLaunchIntakeResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "kickoff-governance"));
});

test("fails when the UAT launch intake remains incomplete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    launchIntakeResult: failingLaunchIntakeResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake"));
});

test("fails when PASS evidence references do not resolve to retained artifacts", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    launchIntakeResult: passingLaunchIntakeResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    evidenceReferenceResult: failingEvidenceReferenceResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-references"));
});

test("fails when UAT evidence is still a No-Go draft", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("No-Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "go-decision"));
});

test("fails when the project decision is Conditional Go", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Conditional Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "go-decision"));
});

test("fails when UAT evidence is Go but the execution tracker remains incomplete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: failingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-execution-tracker"));
});

test("fails when the UAT evidence manifest remains incomplete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: failingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-manifest"));
});

test("fails when the named UAT environment evidence remains incomplete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: failingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-environment"));
});

test("fails when the UAT defect register remains incomplete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: failingDefectRegisterResult,
    signoffRegisterResult: passingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-defect-register"));
});

test("fails when the UAT signoff register remains incomplete", () => {
  const uatEvidenceResult = evaluateUatEvidencePack(goEvidencePack("Go"));
  const result = evaluateV1ReleaseGate({
    readinessResult: passingReadinessResult,
    environmentResult: passingEnvironmentResult,
    uatEvidenceResult,
    trackerResult: passingTrackerResult,
    evidenceManifestResult: passingManifestResult,
    defectRegisterResult: passingDefectRegisterResult,
    signoffRegisterResult: failingSignoffRegisterResult
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-signoff-register"));
});
