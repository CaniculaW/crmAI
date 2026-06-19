import assert from "node:assert/strict";
import test from "node:test";

import { evaluateV1ReleaseGate } from "./v1-release-gate.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";

const passingReadinessResult = {
  ok: true,
  failed: []
};

const failingReadinessResult = {
  ok: false,
  failed: [{ id: "compose-uat-evidence" }]
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
| \`mvn test\` | crm-v1-test | 通过 | ci-27779354840 |
| \`mvn verify -Ppostgres-it\` | crm-v1-test | 通过 | ci-27779354840 |
| \`npm test\` | crm-v1-test | 通过 | ci-27779354840 |
| \`npm run build\` | crm-v1-test | 通过 | ci-27779354840 |
| \`npm run smoke:v1:browser\` | crm-v1-test | 通过 | smoke.png |
| \`/api/bootstrap Smoke\` | crm-v1-test | 通过 | bootstrap.json |

## 3. 环境与账号证据

| 证据项 | 通过标准 | 结果 | 证据文件 |
|---|---|---|---|
| 前端登录页可访问 | 显示 CRM 登录表单 | 通过 | login.png |
| 后端健康检查 | /api/health 返回 200 | 通过 | health.txt |
| 数据库迁移 | Flyway 14 个迁移脚本完成 | 通过 | migration.txt |
| 管理员账号 | 可登录，可进入系统管理页 | 通过 | admin.png |
| 销售个人账号 | 可登录，可创建客户/商机/行动 | 通过 | sales.png |
| 销售负责人账号 | 可查看本部门数据 | 通过 | manager.png |
| 权限样本账号 | 可验证数据范围 | 通过 | permissions.png |

## 4. 业务演示验收记录

| 编号 | 验收链路 | 验收人 | 结果 | 证据文件 | 遗留问题 |
|---|---|---|---|---|---|
${Array.from({ length: 10 }, (_, index) => {
  const id = `UAT-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1 验收链路 | Sales Owner | 通过 | ${id.toLowerCase()}.png | 无 |`;
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

| 角色 | 姓名 | 结论 | 日期 |
|---|---|---|---|
| 销售侧验收人 | Sales Owner | 同意 | 2026-06-19 |
| 管理侧验收人 | Manager Owner | 同意 | 2026-06-19 |
| 产品负责人 | Product | 同意 | 2026-06-19 |
| 测试负责人 | QA | 同意 | 2026-06-19 |
| 研发负责人 | Dev | 同意 | 2026-06-19 |
| 项目负责人 | PM | ${projectDecision} | 2026-06-19 |
`;
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
