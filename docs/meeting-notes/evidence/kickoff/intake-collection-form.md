# CRM V1 Kickoff Governance Evidence Collection Form

Generated at: 2026-06-21T17:37:55.552Z

Decision target: `Go`
Kickoff source: `docs/meeting-notes/crm-kickoff-minutes.md`
Evidence root: `docs/meeting-notes/evidence/kickoff`
Ready rows: `0/14`
Pending rows: `14`

Use this form to collect named owner, closure value, confirmation date, source, and retained evidence reference for the current `1-governance` task.
Do not paste secret material or unmasked account custody data in this form.

Validation commands:
- `node scripts/v1-kickoff-governance-evidence-intake.mjs --input docs/meeting-notes/evidence/kickoff/intake.json --status`
- `node scripts/v1-kickoff-governance-evidence-intake.mjs --input docs/meeting-notes/evidence/kickoff/intake.json --write`

| Intake row | Type | Target | Status | Required closure value | Owner or approver | Closure value | Confirmation date | Confirmation source | Retained evidence reference | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| product-owner.md | owner | 产品负责人 | Pending | Named person, not a role label | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/product-owner.md | 待填写 |
| sales-owner.md | owner | 业务验收人-销售侧 | Pending | Named person, not a role label | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/sales-owner.md | 待填写 |
| manager-owner.md | owner | 业务验收人-管理侧 | Pending | Named person, not a role label | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/manager-owner.md | 待填写 |
| dev-owner.md | owner | 研发负责人 | Pending | Named person, not a role label | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/dev-owner.md | 待填写 |
| frontend-owner.md | owner | 前端负责人 | Pending | Named person, not a role label | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/frontend-owner.md | 待填写 |
| backend-owner.md | owner | 后端负责人 | Pending | Named person, not a role label | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/backend-owner.md | 待填写 |
| qa-owner.md | owner | 测试负责人 | Pending | Named person, not a role label | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/qa-owner.md | 待填写 |
| v1-scope.md | scope | V1 模块范围 | Pending | Confirmed V1 sales foundation modules | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/v1-scope.md | 待填写 |
| v1-loop.md | scope | V1 业务闭环 | Pending | Confirmed end-to-end sales foundation flow | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/v1-loop.md | 待填写 |
| out-of-scope.md | scope | V1 暂不做 | Pending | Confirmed later-version and out-of-scope items | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/out-of-scope.md | 待填写 |
| schedule.md | scope | 上线周期 | Pending | `YYYY-MM-DD 至 YYYY-MM-DD` with end after start | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/schedule.md | 待填写 |
| tech-stack.md | scope | 技术栈 | Pending | Confirmed React + Ant Design, Java Spring Boot, PostgreSQL or approved change | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/tech-stack.md | 待填写 |
| acceptance-mode.md | scope | 验收方式 | Pending | Confirmed sales-side and management-side acceptance mode | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/acceptance-mode.md | 待填写 |
| scope-freeze.md | scope | V1范围冻结 | Pending | Confirm V1 only includes sales foundation loop and later-version items stay out | 待填写 | 待填写 | YYYY-MM-DD | 待填写，会议纪要、审批系统、邮件归档或外部系统 URL | docs/meeting-notes/evidence/kickoff/scope-freeze.md | 待填写 |

Completion standard: all 14 rows become `Ready`; then write evidence templates and run kickoff governance validation before moving to the next TODOList phase.
