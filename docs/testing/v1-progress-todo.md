# CRM V1 Progress TODO

Generated at: 2026-06-21T16:43:54.079Z

Overall status: `External UAT Evidence Required`
Overall decision: `No-Go`
Open blockers: 43
Current task: `1-governance`
Current owner side: 项目/产品

Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in progress evidence.

## TODOList

| Status | Phase | Open blockers | Owner side | Completion standard |
|---|---|---:|---|---|
| In Progress | `1-governance` | 4 | 项目/产品 | Source validators PASS and final release gate returns Go |
| Pending | `2-uat-launch` | 5 | 项目/产品 | Source validators PASS and final release gate returns Go |
| Pending | `2-uat-environment` | 4 | 测试 | Source validators PASS and final release gate returns Go |
| Pending | `3-uat-evidence` | 22 | 业务UAT, 测试, 项目/产品 | Source validators PASS and final release gate returns Go |
| Pending | `4-defect-closure` | 4 | 测试 | Source validators PASS and final release gate returns Go |
| Pending | `5-signoff` | 3 | 项目/产品 | Source validators PASS and final release gate returns Go |
| Pending | `6-final-go-decision` | 1 | 项目/产品 | Source validators PASS and final release gate returns Go |

## Current Task Progress

Current task: `1-governance`
Open blockers: 4
Owner side: 项目/产品
Source documents: `docs/meeting-notes/crm-kickoff-minutes.md`

Validation commands:
- `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`
- `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`

## Current Task Evidence Readiness

Evidence templates ready: `0/14`
Bulk intake commands before applying:
- `node scripts/v1-kickoff-governance-evidence-intake.mjs --template --output docs/meeting-notes/evidence/kickoff/intake.json`
- `node scripts/v1-kickoff-governance-evidence-intake.mjs --input docs/meeting-notes/evidence/kickoff/intake.json --write`
Apply command after all templates are Ready:
- `node scripts/v1-kickoff-governance-evidence-apply.mjs --decision Go --write`

| Status | Evidence template | Type | Target | Missing readiness |
|---|---|---|---|---|
| Pending | docs/meeting-notes/evidence/kickoff/acceptance-mode.md | scope | 验收方式 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Scope approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/backend-owner.md | owner | 后端负责人 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Named owner or approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/dev-owner.md | owner | 研发负责人 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Named owner or approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/frontend-owner.md | owner | 前端负责人 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Named owner or approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/manager-owner.md | owner | 业务验收人-管理侧 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Named owner or approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/out-of-scope.md | scope | V1 暂不做 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Scope approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/product-owner.md | owner | 产品负责人 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Named owner or approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/qa-owner.md | owner | 测试负责人 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Named owner or approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/sales-owner.md | owner | 业务验收人-销售侧 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Named owner or approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/schedule.md | scope | 上线周期 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Scope approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/scope-freeze.md | scope | V1范围冻结 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Scope approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/tech-stack.md | scope | 技术栈 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Scope approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/v1-loop.md | scope | V1 业务闭环 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Scope approver must be a named person, not a role label. |
| Pending | docs/meeting-notes/evidence/kickoff/v1-scope.md | scope | V1 模块范围 | Evidence status must be `Ready` before applying.; Closure value is incomplete.; Retained evidence reference must be a docs/ artifact or http(s) URL.; Scope approver must be a named person, not a role label. |

| Status | Blocker ID | Gate | Check ID | Owner side | Source document | Validation command | Closure evidence needed |
|---|---|---|---|---|---|---|---|
| Open | Kickoff Governance/required-owners | Kickoff Governance | required-owners | 项目/产品 | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | Incomplete kickoff owners: 产品负责人, 业务验收人-销售侧, 业务验收人-管理侧, 研发负责人, 前端负责人, 后端负责人, 测试负责人 |
| Open | Kickoff Governance/scope-freeze | Kickoff Governance | scope-freeze | 项目/产品 | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | Incomplete kickoff scope freeze items: V1 模块范围, V1 业务闭环, V1 暂不做, 上线周期, 技术栈, 验收方式, V1范围冻结 |
| Open | Kickoff Governance/project-go-decision | Kickoff Governance | project-go-decision | 项目/产品 | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | Kickoff governance decision is No-Go; V1 validation requires Go. |
| Open | Release Gate/kickoff-governance | Release Gate | kickoff-governance | 项目/产品 | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | Kickoff governance failed: required-owners, scope-freeze, project-go-decision |

## Task Switch Snapshot

Previous task: `none`
Current task: `1-governance`
Switch readiness: `Blocked`
Remaining blockers before switch: 4
Completion standard: Current source validators PASS and final release gate returns Go
Next required validation:
- `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`

## Task Switch Display Rule

每次切换任务时必须展示：
- 上一任务：完成状态和验证证据。
- 当前任务：TODOList 中的阶段、责任侧、阻塞数。
- 完成标准：对应源文档 validator PASS，最终 release gate 返回 Go。
- 验证命令：本节列出的命令或下一闭环阶段交接包中的命令。

Note: This progress board is generated from machine-readable V1 blocker output. Update source evidence documents, regenerate blocker output, then regenerate this board.
