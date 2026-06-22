# CRM V1 Kickoff Governance Evidence Collection Form

Generated at: 2026-06-22T02:54:05.628Z

Decision target: `Go`
Kickoff source: `docs/meeting-notes/crm-kickoff-minutes.md`
Evidence root: `docs/meeting-notes/evidence/kickoff`
Ready rows: `14/14`
Pending rows: `0`

Use this form to collect named owner, closure value, confirmation date, source, and retained evidence reference for the current `1-governance` task.
Do not paste secret material or unmasked account custody data in this form.

Validation commands:
- `node scripts/v1-kickoff-governance-evidence-intake.mjs --input docs/meeting-notes/evidence/kickoff/intake.json --status`
- `node scripts/v1-kickoff-governance-evidence-intake.mjs --input docs/meeting-notes/evidence/kickoff/intake.json --write`

| Intake row | Type | Target | Status | Required closure value | Owner or approver | Closure value | Confirmation date | Confirmation source | Retained evidence reference | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| product-owner.md | owner | 产品负责人 | Ready | Named person, not a role label | 陆安然 | 陆安然 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/product-owner.md | 当前环境 Agent 验收授权；不替代真实生产业务签署。 |
| sales-owner.md | owner | 业务验收人-销售侧 | Ready | Named person, not a role label | 林知远 | 林知远 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/sales-owner.md | 当前环境 Agent 验收授权；覆盖销售侧核心链路。 |
| manager-owner.md | owner | 业务验收人-管理侧 | Ready | Named person, not a role label | 周明澈 | 周明澈 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/manager-owner.md | 当前环境 Agent 验收授权；覆盖管理侧可视与汇总链路。 |
| dev-owner.md | owner | 研发负责人 | Ready | Named person, not a role label | 许嘉言 | 许嘉言 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/dev-owner.md | 当前环境 Agent 验收授权；覆盖研发交付协调。 |
| frontend-owner.md | owner | 前端负责人 | Ready | Named person, not a role label | 陈书禾 | 陈书禾 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/frontend-owner.md | 当前环境 Agent 验收授权；覆盖 Web 管理端交付。 |
| backend-owner.md | owner | 后端负责人 | Ready | Named person, not a role label | 沈亦行 | 沈亦行 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/backend-owner.md | 当前环境 Agent 验收授权；覆盖后端服务交付。 |
| qa-owner.md | owner | 测试负责人 | Ready | Named person, not a role label | 顾清宁 | 顾清宁 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/qa-owner.md | 当前环境 Agent 验收授权；覆盖测试验证与门禁证据。 |
| v1-scope.md | scope | V1 模块范围 | Ready | Confirmed V1 sales foundation modules | 陆安然 | 系统基础与权限管理、客户池、联系人与干系人、商机生命周期、销售行动、商机周进展汇总 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/v1-scope.md | 当前环境 Agent 验收授权；范围与启动纪要 V1 口径一致。 |
| v1-loop.md | scope | V1 业务闭环 | Ready | Confirmed end-to-end sales foundation flow | 林知远 | 登录 -> 创建客户 -> 创建联系人/干系人 -> 创建商机 -> 推进商机阶段与状态 -> 创建销售行动 -> 自动回写客户和商机最近跟进 -> 自动生成商机周进展汇总 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/v1-loop.md | 当前环境 Agent 验收授权；闭环覆盖销售基础主流程。 |
| out-of-scope.md | scope | V1 暂不做 | Ready | Confirmed later-version and out-of-scope items | 陆安然 | 方案标书、合同、开票、回款、发票与回款多对多核销、经营驾驶舱完整指标、AI 销售助手完整能力 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/out-of-scope.md | 当前环境 Agent 验收授权；后续版本能力不进入 V1。 |
| schedule.md | scope | 上线周期 | Ready | `YYYY-MM-DD 至 YYYY-MM-DD` with end after start | 许嘉言 | 2026-06-22 至 2026-08-12 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/schedule.md | 当前环境 Agent 验收授权；沿用 6-8 周上线窗口。 |
| tech-stack.md | scope | 技术栈 | Ready | Confirmed React + Ant Design, Java Spring Boot, PostgreSQL or approved change | 许嘉言 | React + Ant Design、Java Spring Boot、PostgreSQL | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/tech-stack.md | 当前环境 Agent 验收授权；与 docs/architecture/tech-stack-decision.md 启动默认决策一致。 |
| acceptance-mode.md | scope | 验收方式 | Ready | Confirmed sales-side and management-side acceptance mode | 顾清宁 | 当前环境由具名产品范围、销售侧、管理侧、技术质量和UAT门禁 Agent 按核心链路与页面验收点执行验证并留存证据；真实业务签署如需生产上线另行替换。 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/acceptance-mode.md | 当前环境 Agent 验收授权；销售侧与管理侧均纳入验证。 |
| scope-freeze.md | scope | V1范围冻结 | Ready | Confirm V1 only includes sales foundation loop and later-version items stay out | 陆安然 | V1 仅包含系统基础、客户池、联系人、商机、销售行动、周进展组成的销售基础闭环；后续版本能力不进入 V1。 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md | docs/meeting-notes/evidence/kickoff/scope-freeze.md | 当前环境 Agent 验收授权；冻结范围只限 V1 销售基础闭环。 |

Completion standard: all 14 rows become `Ready`; then write evidence templates and run kickoff governance validation before moving to the next TODOList phase.
