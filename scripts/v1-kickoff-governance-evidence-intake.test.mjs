import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKickoffGovernanceEvidenceTemplatesFromIntake,
  generateKickoffGovernanceEvidenceIntakeTemplate
} from "./v1-kickoff-governance-evidence-intake.mjs";
import { evaluateKickoffGovernanceEvidenceTemplates } from "./v1-kickoff-governance-evidence-apply.mjs";

const readyItems = [
  ["product-owner.md", "owner", "产品负责人", "Wang Qiang", "Wang Qiang", "已确认"],
  ["sales-owner.md", "owner", "业务验收人-销售侧", "Li Na", "Li Na", "已确认"],
  ["manager-owner.md", "owner", "业务验收人-管理侧", "Zhou Rui", "Zhou Rui", "已确认"],
  ["dev-owner.md", "owner", "研发负责人", "Liu Yang", "Liu Yang", "已确认"],
  ["frontend-owner.md", "owner", "前端负责人", "Sun Hao", "Sun Hao", "已确认"],
  ["backend-owner.md", "owner", "后端负责人", "He Lei", "He Lei", "已确认"],
  ["qa-owner.md", "owner", "测试负责人", "Chen Min", "Chen Min", "已确认"],
  ["v1-scope.md", "scope", "V1 模块范围", "Wang Qiang", "系统基础与权限管理、客户池、联系人与干系人、商机生命周期、销售行动、商机周进展汇总", "已确认"],
  ["v1-loop.md", "scope", "V1 业务闭环", "Wang Qiang", "登录 -> 创建客户 -> 创建联系人/干系人 -> 创建商机 -> 推进商机阶段与状态 -> 创建销售行动 -> 自动回写客户和商机最近跟进 -> 自动生成商机周进展汇总", "已确认"],
  ["out-of-scope.md", "scope", "V1 暂不做", "Wang Qiang", "方案标书、合同、开票、回款、发票与回款多对多核销、经营驾驶舱完整指标、AI 销售助手完整能力", "已确认"],
  ["schedule.md", "scope", "上线周期", "Wang Qiang", "2026-07-29 至 2026-08-12", "已确认"],
  ["tech-stack.md", "scope", "技术栈", "Liu Yang", "React + Ant Design、Java Spring Boot、PostgreSQL", "已确认"],
  ["acceptance-mode.md", "scope", "验收方式", "Wang Qiang", "以核心链路和页面验收点为主，销售侧与管理侧共同确认", "已确认"],
  ["scope-freeze.md", "scope", "V1范围冻结", "Wang Qiang", "V1 仅包含销售基础闭环，超出范围进入后续版本池", "已冻结"]
];

function completeIntake() {
  return {
    decision: "Go",
    confirmationDate: "2026-06-22",
    evidenceRoot: "docs/meeting-notes/evidence/kickoff",
    items: readyItems.map(([
      filename,
      type,
      label,
      ownerOrApprover,
      closureValue,
      targetStatus
    ]) => ({
      filename,
      type,
      label,
      evidenceStatus: "Ready",
      targetStatus,
      ownerOrApprover,
      closureValue,
      confirmationSource: `docs/meeting-notes/evidence/kickoff/${filename}`,
      retainedEvidenceReference: `docs/meeting-notes/evidence/kickoff/${filename}`,
      notes: "启动治理补证"
    }))
  };
}

test("generates a single JSON intake template covering every kickoff governance evidence item", () => {
  const template = JSON.parse(generateKickoffGovernanceEvidenceIntakeTemplate({
    generatedAt: "2026-06-22T00:40:00.000Z"
  }));

  assert.equal(template.generatedAt, "2026-06-22T00:40:00.000Z");
  assert.equal(template.decision, "Go");
  assert.equal(template.evidenceRoot, "docs/meeting-notes/evidence/kickoff");
  assert.equal(template.items.length, 14);
  assert.deepEqual(template.items.map((item) => item.filename), readyItems.map(([filename]) => filename));
  assert.ok(template.items.every((item) => item.evidenceStatus === "Pending"));
  assert.ok(template.items.every((item) => item.ownerOrApprover === "待填写"));
  assert.ok(template.items.every((item) => item.retainedEvidenceReference.includes("docs/")));
});

test("builds Ready kickoff governance evidence templates only from complete named intake", () => {
  const result = buildKickoffGovernanceEvidenceTemplatesFromIntake(completeIntake());

  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.templatesByPath).length, 14);
  assert.match(
    result.templatesByPath["docs/meeting-notes/evidence/kickoff/product-owner.md"],
    /Evidence status: `Ready`/
  );
  assert.match(
    result.templatesByPath["docs/meeting-notes/evidence/kickoff/v1-scope.md"],
    /\| Closure value \| 系统基础与权限管理、客户池、联系人与干系人、商机生命周期、销售行动、商机周进展汇总 \|/
  );

  const readiness = evaluateKickoffGovernanceEvidenceTemplates(result.templatesByPath);
  assert.equal(readiness.ok, true);
  assert.deepEqual(readiness.failed, []);
});

test("rejects pending or role-label intake before writing Ready templates", () => {
  const intake = completeIntake();
  intake.items[0] = {
    ...intake.items[0],
    evidenceStatus: "Pending",
    ownerOrApprover: "产品负责人",
    retainedEvidenceReference: "待补充"
  };

  const result = buildKickoffGovernanceEvidenceTemplatesFromIntake(intake);

  assert.equal(result.ok, false);
  assert.equal(result.templatesByPath, undefined);
  assert.ok(result.failed.some((failure) => failure.path === "docs/meeting-notes/evidence/kickoff/product-owner.md"));
  assert.ok(result.failed.some((failure) => failure.failures.includes("Evidence status must be `Ready` before applying.")));
});
