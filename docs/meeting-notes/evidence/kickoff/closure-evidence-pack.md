# CRM V1 Kickoff Governance Evidence Pack

Generated at: 2026-06-22T02:04:48.421Z

Current task: `1-governance`
Current owner side: 项目/产品
Open kickoff blockers: 0
Target source document: `docs/meeting-notes/crm-kickoff-minutes.md`
Decision target: `Go`

Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in kickoff governance evidence.

## Owner Confirmation TODOList

| Role | Required closure value | Target status | Evidence path | Update target row |
|---|---|---|---|---|
| 产品负责人 | Named person, not a role label | 已确认 | `docs/meeting-notes/evidence/kickoff/product-owner.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 参会人/产品负责人 |
| 业务验收人-销售侧 | Named person, not a role label | 已确认 | `docs/meeting-notes/evidence/kickoff/sales-owner.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 参会人/业务验收人-销售侧 |
| 业务验收人-管理侧 | Named person, not a role label | 已确认 | `docs/meeting-notes/evidence/kickoff/manager-owner.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 参会人/业务验收人-管理侧 |
| 研发负责人 | Named person, not a role label | 已确认 | `docs/meeting-notes/evidence/kickoff/dev-owner.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 参会人/研发负责人 |
| 前端负责人 | Named person, not a role label | 已确认 | `docs/meeting-notes/evidence/kickoff/frontend-owner.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 参会人/前端负责人 |
| 后端负责人 | Named person, not a role label | 已确认 | `docs/meeting-notes/evidence/kickoff/backend-owner.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 参会人/后端负责人 |
| 测试负责人 | Named person, not a role label | 已确认 | `docs/meeting-notes/evidence/kickoff/qa-owner.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 参会人/测试负责人 |

## Scope Freeze TODOList

| Scope item | Required closure value | Target status | Evidence path | Update target row |
|---|---|---|---|---|
| V1 模块范围 | Confirmed V1 sales foundation modules | 已确认 | `docs/meeting-notes/evidence/kickoff/v1-scope.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 启动确认基线/V1 模块范围 |
| V1 业务闭环 | Confirmed end-to-end sales foundation flow | 已确认 | `docs/meeting-notes/evidence/kickoff/v1-loop.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 启动确认基线/V1 业务闭环 |
| V1 暂不做 | Confirmed later-version and out-of-scope items | 已确认 | `docs/meeting-notes/evidence/kickoff/out-of-scope.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 启动确认基线/V1 暂不做 |
| 上线周期 | `YYYY-MM-DD 至 YYYY-MM-DD` with end after start | 已确认 | `docs/meeting-notes/evidence/kickoff/schedule.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 启动确认基线/上线周期 |
| 技术栈 | Confirmed React + Ant Design, Java Spring Boot, PostgreSQL or approved change | 已确认 | `docs/meeting-notes/evidence/kickoff/tech-stack.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 启动确认基线/技术栈 |
| 验收方式 | Confirmed sales-side and management-side acceptance mode | 已确认 | `docs/meeting-notes/evidence/kickoff/acceptance-mode.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 启动确认基线/验收方式 |
| V1范围冻结 | Confirm V1 only includes sales foundation loop and later-version items stay out | 已冻结 | `docs/meeting-notes/evidence/kickoff/scope-freeze.md` | `docs/meeting-notes/crm-kickoff-minutes.md` 启动确认基线/V1范围冻结 |

## Current Governance Blockers

No open `1-governance` blockers are present in the current blockers JSON.

## Closure Procedure

1. Collect every evidence path listed above as a retained non-empty `docs/` artifact or external `http(s)` URL.
2. Update `docs/meeting-notes/crm-kickoff-minutes.md` with named owners, confirmed scope rows, retained evidence references, and `Decision: Go`.
3. Keep V2/V3/V4 items out of the V1 scope and leave them in the later-version pool.
4. Run the validation commands below and retain the output with V1 evidence.

## Validation Commands

- `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`
- `node scripts/v1-release-gate.mjs --json`

## Task Switch Display Rule

每次切换任务时必须展示：
- 上一任务：完成状态和验证证据。
- 当前任务：`1-governance` 的责任侧、阻塞数和 TODOList。
- 完成标准：`v1-kickoff-governance-validate.mjs` PASS，最终 release gate 不再因 kickoff governance 阻塞。
- 验证命令：本节列出的命令。

Note: This evidence pack is a collection guide. It does not prove project approval until the target source document validates PASS and the final release gate returns Go.
