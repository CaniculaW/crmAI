# CRM V1 External UAT Closure Checklist

Generated at: 2026-06-21T14:38:17.343Z

Overall: No-Go

Open blocker count: 43

Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in closure evidence.

## Next Closure Phase

Phase: `1-governance`
Order: 10
Open blockers: 4
Owner side: 项目/产品
Blocker IDs: `Kickoff Governance/project-go-decision`, `Kickoff Governance/required-owners`, `Kickoff Governance/scope-freeze`, `Release Gate/kickoff-governance`
Source documents: `docs/meeting-notes/crm-kickoff-minutes.md`
Validation commands:
- `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`
- `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`

## 项目/产品

| Status | Gate | Check ID | Source document | Validation command | Closure evidence needed |
|---|---|---|---|---|---|
| Open | Kickoff Governance | required-owners | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | Incomplete kickoff owners: 产品负责人, 业务验收人-销售侧, 业务验收人-管理侧, 研发负责人, 前端负责人, 后端负责人, 测试负责人 |
| Open | Kickoff Governance | scope-freeze | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | Incomplete kickoff scope freeze items: V1 模块范围, V1 业务闭环, V1 暂不做, 上线周期, 技术栈, 验收方式, V1范围冻结 |
| Open | Kickoff Governance | project-go-decision | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | Kickoff governance decision is No-Go; V1 validation requires Go. |
| Open | UAT Launch Intake | environment-intake | docs/testing/v1-uat-launch-intake.md | `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md` | Incomplete launch environment fields: 测试环境名称, 前端访问地址, 后端 API 地址, Git 提交号, UAT窗口, 证据归档位置 |
| Open | UAT Launch Intake | participant-roster | docs/testing/v1-uat-launch-intake.md | `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md` | Incomplete UAT participants: UAT-SALES, UAT-MANAGER, UAT-PRODUCT, UAT-TEST, UAT-DEV, UAT-PM |
| Open | UAT Launch Intake | account-custody | docs/testing/v1-uat-launch-intake.md | `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md` | Incomplete account custody items: 管理员账号, 销售个人账号, 销售负责人账号, 权限样本账号 |
| Open | UAT Launch Intake | project-go-decision | docs/testing/v1-uat-launch-intake.md | `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md` | Launch intake decision is No-Go; UAT launch requires Go. |
| Open | UAT Evidence Pack | no-placeholders | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | Evidence pack still contains draft placeholders. |
| Open | UAT Evidence Pack | basic-owners-complete | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | Missing basic evidence pack owners: 测试负责人, 产品负责人, 销售侧验收人, 管理侧验收人 |
| Open | UAT Evidence Pack | basic-owner-name-format | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | Basic evidence pack owners use role labels instead of named people: 研发负责人 |
| Open | UAT Evidence Pack | go-criteria | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | Unsatisfied Go/No-Go criteria: 测试环境 Smoke, P0 缺陷, P1 缺陷, 业务验收, 上线风险 |
| Open | UAT Evidence Pack | signoff-complete | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | Incomplete signoff rows: 销售侧验收人, 管理侧验收人, 产品负责人, 测试负责人, 研发负责人, 项目负责人 |
| Open | UAT Execution Tracker | roles-assigned | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | Roles pending assignment or status: 销售侧验收人, 管理侧验收人, 产品负责人, 测试负责人, 项目负责人 |
| Open | UAT Execution Tracker | tracker-role-owner-name-format | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | Tracker role owners use role labels instead of named people: 研发负责人 |
| Open | UAT Execution Tracker | release-gates | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | Incomplete release gates: UAT证据包一致性, UAT缺陷台账一致性, UAT签署台账一致性, V1最终放行门禁, 项目签署 |
| Open | UAT Execution Tracker | go-decision | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | Tracker conclusion is No-Go; V1 validation requires Go. |
| Open | UAT Signoff Register | required-signoffs | docs/testing/v1-uat-signoff-register.md | `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md` | Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-MANAGER, SIGNOFF-PRODUCT, SIGNOFF-TEST, SIGNOFF-DEV, SIGNOFF-PM |
| Open | UAT Signoff Register | project-go-decision | docs/testing/v1-uat-signoff-register.md | `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md` | Project signoff is No-Go and register decision is No-Go; V1 validation requires Go. |
| Open | Release Gate | kickoff-governance | docs/meeting-notes/crm-kickoff-minutes.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | Kickoff governance failed: required-owners, scope-freeze, project-go-decision |
| Open | Release Gate | uat-launch-intake | docs/testing/v1-uat-launch-intake.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | UAT launch intake failed: environment-intake, participant-roster, account-custody, project-go-decision |
| Open | Release Gate | uat-signoff-register | docs/testing/v1-uat-signoff-register.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | UAT signoff register failed: required-signoffs, project-go-decision |
| Open | Release Gate | uat-execution-tracker | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | UAT execution tracker failed: roles-assigned, tracker-role-owner-name-format, pre-checks, smoke-checks, uat-cases, p0-p1-defects, release-gates, go-decision |
| Open | Release Gate | go-decision | docs/testing/v1-go-no-go-meeting.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | Project decision is No-Go; V1 release gate requires Go. |

## 测试

| Status | Gate | Check ID | Source document | Validation command | Closure evidence needed |
|---|---|---|---|---|---|
| Open | UAT Environment Evidence | environment-summary | docs/testing/v1-uat-environment-evidence.md | `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` | Invalid environment summary items: 测试环境名称, 前端访问地址, 后端 API 地址, Git 提交号 |
| Open | UAT Environment Evidence | environment-checks | docs/testing/v1-uat-environment-evidence.md | `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` | Incomplete environment checks: ENV-001, ENV-002, ENV-003, ENV-004, ENV-005, ENV-006, ENV-007, ENV-008 |
| Open | UAT Environment Evidence | go-decision | docs/testing/v1-uat-environment-evidence.md | `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` | Environment evidence decision is No-Go; V1 validation requires Go. |
| Open | UAT Evidence Pack | environment-results | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | Missing passed environment evidence: 销售个人账号, 销售负责人账号, 权限样本账号 |
| Open | UAT Evidence Pack | p0-defects | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | P0/S1 defect row is missing or invalid. |
| Open | UAT Evidence Pack | p1-defects | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | P1/S2 defect row is missing or invalid. |
| Open | UAT Evidence Manifest | evidence-complete | docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | Evidence rows not marked PASS: ENV-EVIDENCE, PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006, SMK-001, SMK-002, SMK-003, SMK-004, SMK-005, UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010, DEF-REGISTER, DEF-P0, DEF-P1, SIGNOFF-REGISTER, SIGNOFF-SALES, SIGNOFF-MANAGER, SIGNOFF-PRODUCT, SIGNOFF-TEST, SIGNOFF-DEV, SIGNOFF-PM, GO-NOGO |
| Open | UAT Evidence Manifest | go-decision | docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | Manifest decision is No-Go; V1 validation requires Go. |
| Open | UAT Execution Tracker | pre-checks | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | Incomplete PRE checks: PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006 |
| Open | UAT Execution Tracker | smoke-checks | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | Incomplete SMK checks: SMK-001, SMK-002, SMK-003, SMK-004, SMK-005 |
| Open | UAT Execution Tracker | p0-p1-defects | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | P0/S1 and P1/S2 defect rows must show no open defects and concrete evidence. |
| Open | UAT Defect Register | p0-p1-summary | docs/testing/v1-uat-defect-register.md | `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` | Invalid P0/P1 summary rows: P0 / S1 阻断, P1 / S2 严重 |
| Open | UAT Defect Register | defect-details | docs/testing/v1-uat-defect-register.md | `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` | Incomplete defect details: DEF-DRAFT |
| Open | UAT Defect Register | go-decision | docs/testing/v1-uat-defect-register.md | `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` | Defect register decision is No-Go; V1 validation requires Go. |
| Open | Release Gate | uat-environment | docs/testing/v1-uat-environment-evidence.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | UAT environment evidence failed: environment-summary, environment-checks, go-decision |
| Open | Release Gate | uat-evidence-manifest | docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | UAT evidence manifest failed: evidence-complete, go-decision |
| Open | Release Gate | uat-defect-register | docs/testing/v1-uat-defect-register.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | UAT defect register failed: p0-p1-summary, defect-details, go-decision |

## 业务UAT

| Status | Gate | Check ID | Source document | Validation command | Closure evidence needed |
|---|---|---|---|---|---|
| Open | UAT Evidence Pack | uat-business-cases | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | Missing passed UAT evidence: UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010 |
| Open | UAT Execution Tracker | uat-cases | docs/testing/crm-v1-uat-execution-tracker.md | `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | Incomplete UAT cases: UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010 |
| Open | Release Gate | uat-evidence-pack | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md | `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | UAT evidence pack failed: no-placeholders, basic-owners-complete, basic-owner-name-format, environment-results, uat-business-cases, p0-defects, p1-defects, go-criteria, signoff-complete |

Do not mark a row Closed until its source document validates PASS and the final release gate returns Go.

Note: This checklist is generated from validator output. Update the source evidence documents, then regenerate this file instead of editing closure rows manually.
