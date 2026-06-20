import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";

const completeGoPack = `# CRM V1 UAT 证据包与 Go/No-Go 记录

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 验收日期 | 2026-06-19 |
| 测试环境名称 | crm-v1-test |
| 前端访问地址 | https://crm-test.example.com |
| 后端 API 地址 | https://crm-test-api.example.com |
| Git 提交号 | 0b3579ff9027417f4f363ae11ec206e37b33c113 |
| 候选版本 | v1.0.0-rc.6 |
| 前端版本/构建号 | Vite build 20260619.1 |
| 后端版本/构建号 | Maven package 20260619.1 |
| 数据库版本 | PostgreSQL 16.14 |
| 测试负责人 | Chen Min |
| 产品负责人 | Wang Qiang |
| 研发负责人 | Liu Yang |
| 销售侧验收人 | Zhang Wei |
| 管理侧验收人 | Li Na |

## 2. 自动化验证结果

| 命令 | 执行环境 | 结果 | 证据文件 |
|---|---|---|---|
| \`mvn test\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27747151121 |
| \`mvn verify -Ppostgres-it\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27747151121 |
| \`npm test\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27747151121 |
| \`npm run build\` | crm-v1-test | 通过 | https://github.com/CaniculaW/crmAI/actions/runs/27747151121 |
| \`npm run smoke:v1:browser\` | crm-v1-test | 通过 | docs/testing/evidence/smoke-output.json |
| \`/api/bootstrap Smoke\` | crm-v1-test | 通过 | docs/testing/evidence/bootstrap-response.json |

## 3. 环境与账号证据

| 证据项 | 通过标准 | 结果 | 证据文件 |
|---|---|---|---|
| 前端登录页可访问 | 显示 CRM 登录表单 | 通过 | docs/testing/evidence/env/login-page.png |
| 后端健康检查 | /api/health 返回 200 | 通过 | docs/testing/evidence/env/health.txt |
| 数据库迁移 | Flyway 14 个迁移脚本完成 | 通过 | docs/testing/evidence/env/migration.png |
| 管理员账号 | 可登录，可进入系统管理页 | 通过 | docs/testing/evidence/env/admin.png |
| 销售个人账号 | 可登录，可创建客户/商机/行动 | 通过 | docs/testing/evidence/env/sales.png |
| 销售负责人账号 | 可查看本部门数据 | 通过 | docs/testing/evidence/env/manager.png |
| 权限样本账号 | 可验证数据范围 | 通过 | docs/testing/evidence/env/permissions.png |

## 4. 业务演示验收记录

| 编号 | 验收链路 | 验收人 | 结果 | 证据文件 | 遗留问题 |
|---|---|---|---|---|---|
${Array.from({ length: 10 }, (_, index) => {
  const id = `UAT-${String(index + 1).padStart(3, "0")}`;
  return `| ${id} | V1 验收链路 | Zhang Wei | 通过 | docs/testing/evidence/uat/${id.toLowerCase()}.png | 无 |`;
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
选择：Go

结论说明：同意进入 V1 试点。
\`\`\`

## 8. 签署

| 角色 | 姓名 | 结论 | 日期 | 证据文件 |
|---|---|---|---|---|
| 销售侧验收人 | Zhang Wei | 同意 | 2026-06-19 | docs/testing/evidence/signoff/sales-approval.md |
| 管理侧验收人 | Li Na | 同意 | 2026-06-19 | docs/testing/evidence/signoff/manager-approval.md |
| 产品负责人 | Wang Qiang | 同意 | 2026-06-19 | docs/testing/evidence/signoff/product-approval.md |
| 测试负责人 | Chen Min | 同意 | 2026-06-19 | docs/testing/evidence/signoff/test-approval.md |
| 研发负责人 | Liu Yang | 同意 | 2026-06-19 | docs/testing/evidence/signoff/dev-approval.md |
| 项目负责人 | Zhao Lin | Go | 2026-06-19 | docs/testing/evidence/signoff/project-go.md |
`;

test("passes a complete signed Go evidence pack", () => {
  const result = evaluateUatEvidencePack(completeGoPack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.failed, []);
});

test("fails a Go evidence pack when a P0 defect remains open", () => {
  const pack = completeGoPack.replace("| P0 / S1 阻断 | 0 | 0 |", "| P0 / S1 阻断 | 1 | 1 |");
  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.match(result.failed.map((check) => check.id).join(","), /p0-defects/);
});

test("fails a Go evidence pack when business signoff is missing", () => {
  const pack = completeGoPack.replace(
    "| 销售侧验收人 | Zhang Wei | 同意 | 2026-06-19 | docs/testing/evidence/signoff/sales-approval.md |",
    "| 销售侧验收人 | 待填写 | 同意 | 2026-06-19 | docs/testing/evidence/signoff/sales-approval.md |"
  );
  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.match(result.failed.map((check) => check.id).join(","), /signoff-complete/);
});

test("explains that draft placeholders remain when the no-placeholder check fails", () => {
  const pack = completeGoPack.replace("Zhang Wei", "待填写");
  const result = evaluateUatEvidencePack(pack);
  const placeholderFailure = result.failed.find((check) => check.id === "no-placeholders");

  assert.equal(placeholderFailure?.message, "Evidence pack still contains draft placeholders.");
});

test("fails when a basic evidence pack owner is only a role label", () => {
  const pack = completeGoPack.replace(
    "| 测试负责人 | Chen Min |",
    "| 测试负责人 | QA Owner |"
  );

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidBasicOwnerRows, ["测试负责人"]);
  assert.ok(result.failed.some((check) => check.id === "basic-owner-name-format"));
});

test("fails when a basic evidence pack owner row is missing", () => {
  const pack = completeGoPack.replace("| 测试负责人 | Chen Min |\n", "");

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingBasicOwnerRows, ["测试负责人"]);
  assert.ok(result.failed.some((check) => check.id === "basic-owners-complete"));
});

test("fails when basic evidence pack metadata is not structured", () => {
  const pack = completeGoPack
    .replace("| 验收日期 | 2026-06-19 |", "| 验收日期 | June 19 |")
    .replace("| 前端访问地址 | https://crm-test.example.com |", "| 前端访问地址 | crm-test.example.com |")
    .replace("| Git 提交号 | 0b3579ff9027417f4f363ae11ec206e37b33c113 |", "| Git 提交号 | abc123 |");

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidBasicInfoFields, ["验收日期", "前端访问地址", "Git 提交号"]);
  assert.ok(result.failed.some((check) => check.id === "basic-info-format"));
});

test("fails when evidence pack version rows are missing", () => {
  const pack = completeGoPack
    .replace("| 前端版本/构建号 | Vite build 20260619.1 |\n", "")
    .replace("| 数据库版本 | PostgreSQL 16.14 |", "| 数据库版本 | PostgreSQL 16 或实际版本： |");

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingBasicVersionRows, ["前端版本/构建号", "数据库版本"]);
  assert.ok(result.failed.some((check) => check.id === "basic-version-fields-complete"));
});

test("fails when evidence pack contains secret-like material", () => {
  const pack = `${completeGoPack}\n\nAuthorization: Bearer abcdef1234567890\n`;

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.equal(result.hasSecretLikeMaterial, true);
  assert.ok(result.failed.some((check) => check.id === "no-secret-material"));
});

test("fails when a passed UAT case owner is only a role label", () => {
  const pack = completeGoPack.replace(
    "| UAT-006 | V1 验收链路 | Zhang Wei | 通过 | docs/testing/evidence/uat/uat-006.png | 无 |",
    "| UAT-006 | V1 验收链路 | 销售侧验收人 | 通过 | docs/testing/evidence/uat/uat-006.png | 无 |"
  );

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidUatCaseOwnerRows, ["UAT-006"]);
  assert.ok(result.failed.some((check) => check.id === "uat-case-owner-name-format"));
});

test("fails when an approved signoff owner is only a role label", () => {
  const pack = completeGoPack.replace(
    "| 项目负责人 | Zhao Lin | Go | 2026-06-19 | docs/testing/evidence/signoff/project-go.md |",
    "| 项目负责人 | PM Owner | Go | 2026-06-19 | docs/testing/evidence/signoff/project-go.md |"
  );

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidSignoffOwnerRows, ["项目负责人"]);
  assert.ok(result.failed.some((check) => check.id === "signoff-owner-name-format"));
});

test("fails when an approved signoff date is not structured", () => {
  const pack = completeGoPack.replace(
    "| 产品负责人 | Wang Qiang | 同意 | 2026-06-19 | docs/testing/evidence/signoff/product-approval.md |",
    "| 产品负责人 | Wang Qiang | 同意 | June 19 | docs/testing/evidence/signoff/product-approval.md |"
  );

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidSignoffDateRows, ["产品负责人"]);
  assert.ok(result.failed.some((check) => check.id === "signoff-date-format"));
});

test("fails when passed UAT evidence references are not retained", () => {
  const pack = completeGoPack
    .replace("docs/testing/evidence/env/login-page.png", "login.png")
    .replace("docs/testing/evidence/signoff/project-go.md", "project-go.md");

  const result = evaluateUatEvidencePack(pack);

  assert.equal(result.ok, false);
  assert.deepEqual(result.unretainedEvidenceReferences.environment, ["前端登录页可访问"]);
  assert.deepEqual(result.unretainedEvidenceReferences.signoff, ["项目负责人"]);
  assert.ok(result.failed.some((check) => check.id === "evidence-references-retained"));
});
