import assert from "node:assert/strict";
import test from "node:test";

import { evaluateKickoffGovernance } from "./v1-kickoff-governance-validate.mjs";
import {
  applyKickoffGovernanceEvidenceToMarkdown,
  evaluateKickoffGovernanceEvidenceTemplates
} from "./v1-kickoff-governance-evidence-apply.mjs";

const draftKickoff = `# CRM研发启动会纪要

日期：2026-06-17

Decision: No-Go

## 参会人

| 角色 | 姓名 | 确认状态 | Evidence | 备注 |
|---|---|---|---|---|
| 产品负责人 | 待确认 | 待确认 | 待补充 | 负责需求冻结、范围管理和业务验收协调 |
| 业务验收人-销售侧 | 待确认 | 待确认 | 待补充 | 必须在 Sprint 0 完成指定 |
| 业务验收人-管理侧 | 待确认 | 待确认 | 待补充 | 必须在 Sprint 0 完成指定 |
| 研发负责人 | 待确认 | 待确认 | 待补充 | 负责技术方案、排期和交付协调 |
| 前端负责人 | 待确认 | 待确认 | 待补充 | 负责 Web 管理端页面交付 |
| 后端负责人 | 待确认 | 待确认 | 待补充 | 负责 API、权限、数据和业务服务 |
| 测试负责人 | 待确认 | 待确认 | 待补充 | 负责测试用例、集成测试和验收验证 |

## 启动确认基线

| 事项 | 当前口径 | 确认状态 | Evidence |
|---|---|---|---|
| V1 模块范围 | 待确认 | 待确认 | 待补充 |
| V1 业务闭环 | 待确认 | 待确认 | 待补充 |
| V1 暂不做 | 待确认 | 待确认 | 待补充 |
| 上线周期 | 待确认 | 待确认 | 待补充 |
| 技术栈 | 待确认 | 待确认 | 待补充 |
| 验收方式 | 待确认 | 待确认 | 待补充 |
| V1范围冻结 | 待确认 | 待确认 | 待补充 |

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

const ownerTemplates = [
  ["product-owner.md", "产品负责人", "Wang Qiang"],
  ["sales-owner.md", "业务验收人-销售侧", "Li Na"],
  ["manager-owner.md", "业务验收人-管理侧", "Zhou Rui"],
  ["dev-owner.md", "研发负责人", "Liu Yang"],
  ["frontend-owner.md", "前端负责人", "Sun Hao"],
  ["backend-owner.md", "后端负责人", "He Lei"],
  ["qa-owner.md", "测试负责人", "Chen Min"]
].map(([filename, label, owner]) => [
  `docs/meeting-notes/evidence/kickoff/${filename}`,
  `# CRM V1 Kickoff Governance Evidence - ${label}

Evidence type: \`owner\`
Evidence status: \`Ready\`
Target status in kickoff minutes: \`已确认\`
Update target row: \`docs/meeting-notes/crm-kickoff-minutes.md\` 参会人/${label}

| Field | Value |
|---|---|
| Named owner or approver | ${owner} |
| Closure value | ${owner} |
| Confirmation date | 2026-06-22 |
| Confirmation source | docs/meeting-notes/evidence/kickoff/${filename} |
| Retained evidence reference | docs/meeting-notes/evidence/kickoff/${filename} |
| Notes | 启动治理补证 |
`
]);

const scopeTemplates = [
  ["v1-scope.md", "V1 模块范围", "系统基础与权限管理、客户池、联系人与干系人、商机生命周期、销售行动、商机周进展汇总", "已确认"],
  ["v1-loop.md", "V1 业务闭环", "登录 -> 创建客户 -> 创建联系人/干系人 -> 创建商机 -> 推进商机阶段与状态 -> 创建销售行动 -> 自动回写客户和商机最近跟进 -> 自动生成商机周进展汇总", "已确认"],
  ["out-of-scope.md", "V1 暂不做", "方案标书、合同、开票、回款、发票与回款多对多核销、经营驾驶舱完整指标、AI 销售助手完整能力", "已确认"],
  ["schedule.md", "上线周期", "2026-07-29 至 2026-08-12", "已确认"],
  ["tech-stack.md", "技术栈", "React + Ant Design、Java Spring Boot、PostgreSQL", "已确认"],
  ["acceptance-mode.md", "验收方式", "以核心链路和页面验收点为主，销售侧与管理侧共同确认", "已确认"],
  ["scope-freeze.md", "V1范围冻结", "V1 仅包含销售基础闭环，超出范围进入后续版本池", "已冻结"]
].map(([filename, label, closureValue, targetStatus]) => [
  `docs/meeting-notes/evidence/kickoff/${filename}`,
  `# CRM V1 Kickoff Governance Evidence - ${label}

Evidence type: \`scope\`
Evidence status: \`Ready\`
Target status in kickoff minutes: \`${targetStatus}\`
Update target row: \`docs/meeting-notes/crm-kickoff-minutes.md\` 启动确认基线/${label}

| Field | Value |
|---|---|
| Named owner or approver | Wang Qiang |
| Closure value | ${closureValue} |
| Confirmation date | 2026-06-22 |
| Confirmation source | docs/meeting-notes/evidence/kickoff/${filename} |
| Retained evidence reference | docs/meeting-notes/evidence/kickoff/${filename} |
| Notes | 启动治理补证 |
`
]);

const completeTemplates = Object.fromEntries([...ownerTemplates, ...scopeTemplates]);

test("applies complete Ready kickoff governance templates and produces validator-ready kickoff markdown", () => {
  const result = applyKickoffGovernanceEvidenceToMarkdown({
    kickoffMarkdown: draftKickoff,
    templatesByPath: completeTemplates,
    decision: "Go"
  });

  assert.equal(result.ok, true);
  assert.equal(result.updatedMarkdown.includes("Decision: Go"), true);
  assert.match(result.updatedMarkdown, /\| 产品负责人 \| Wang Qiang \| 已确认 \| docs\/meeting-notes\/evidence\/kickoff\/product-owner\.md \|/);
  assert.match(result.updatedMarkdown, /\| V1 模块范围 \| 系统基础与权限管理、客户池、联系人与干系人、商机生命周期、销售行动、商机周进展汇总 \| 已确认 \| docs\/meeting-notes\/evidence\/kickoff\/v1-scope\.md \|/);
  assert.match(result.updatedMarkdown, /\| 上线周期 \| 2026-07-29 至 2026-08-12 \| 已确认 \| docs\/meeting-notes\/evidence\/kickoff\/schedule\.md \|/);

  const validation = evaluateKickoffGovernance(result.updatedMarkdown);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.failed, []);
});

test("keeps kickoff markdown unchanged when any required evidence template is still Pending", () => {
  const templatesByPath = {
    ...completeTemplates,
    "docs/meeting-notes/evidence/kickoff/product-owner.md": completeTemplates["docs/meeting-notes/evidence/kickoff/product-owner.md"]
      .replace("Evidence status: `Ready`", "Evidence status: `Pending`")
  };

  const readiness = evaluateKickoffGovernanceEvidenceTemplates(templatesByPath);
  assert.equal(readiness.ok, false);
  assert.ok(readiness.failed.some((failure) => failure.path === "docs/meeting-notes/evidence/kickoff/product-owner.md"));

  const result = applyKickoffGovernanceEvidenceToMarkdown({
    kickoffMarkdown: draftKickoff,
    templatesByPath,
    decision: "Go"
  });
  assert.equal(result.ok, false);
  assert.equal(result.updatedMarkdown, draftKickoff);
});
