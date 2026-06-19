# CRM V1 Validation Status

Generated at: 2026-06-19T16:43:17.040Z
Git commit: e7e9d7b3a622cdef6ce186048246f4531aaea414

Overall: No-Go

## Gate Summary

| Gate | Result | Decision | Failed checks |
|---|---|---|---:|
| Readiness | PASS | - | 0 |
| Kickoff Governance | FAIL | No-Go | 3 |
| UAT Launch Intake | FAIL | No-Go | 4 |
| UAT Environment Evidence | FAIL | No-Go | 3 |
| UAT Evidence Pack | FAIL | No-Go | 8 |
| UAT Evidence Manifest | FAIL | No-Go | 2 |
| UAT Evidence References | PASS | No-Go | 0 |
| UAT Execution Tracker | FAIL | No-Go | 8 |
| UAT Defect Register | FAIL | No-Go | 3 |
| UAT Signoff Register | FAIL | No-Go | 2 |
| Release Gate | FAIL | No-Go | 9 |

## Verification Commands

- `node scripts/v1-uat-readiness-check.mjs`
- `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`
- `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md`
- `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md`
- `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md`
- `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md`
- `node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md`
- `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md`
- `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md`
- `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md`
- `node scripts/v1-release-gate.mjs . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`

## Open Blockers

- FAIL Kickoff Governance/required-owners: Incomplete kickoff owners: 产品负责人, 业务验收人-销售侧, 业务验收人-管理侧, 研发负责人, 前端负责人, 后端负责人, 测试负责人
- FAIL Kickoff Governance/scope-freeze: Incomplete kickoff scope freeze items: V1 模块范围, V1 业务闭环, V1 暂不做, 上线周期, 技术栈, 验收方式, V1范围冻结
- FAIL Kickoff Governance/project-go-decision: Kickoff governance decision is No-Go; V1 validation requires Go.
- FAIL UAT Launch Intake/environment-intake: Incomplete launch environment fields: 测试环境名称, 前端访问地址, 后端 API 地址, Git 提交号, UAT窗口, 证据归档位置
- FAIL UAT Launch Intake/participant-roster: Incomplete UAT participants: UAT-SALES, UAT-MANAGER, UAT-PRODUCT, UAT-TEST, UAT-DEV, UAT-PM
- FAIL UAT Launch Intake/account-custody: Incomplete account custody items: 管理员账号, 销售个人账号, 销售负责人账号, 权限样本账号
- FAIL UAT Launch Intake/project-go-decision: Launch intake decision is No-Go; UAT launch requires Go.
- FAIL UAT Environment Evidence/environment-summary: Invalid environment summary items: 测试环境名称, 前端访问地址, 后端 API 地址, Git 提交号
- FAIL UAT Environment Evidence/environment-checks: Incomplete environment checks: ENV-001, ENV-002, ENV-003, ENV-004, ENV-005, ENV-006, ENV-007, ENV-008
- FAIL UAT Environment Evidence/go-decision: Environment evidence decision is No-Go; V1 validation requires Go.
- FAIL UAT Evidence Pack/no-placeholders: Evidence pack still contains draft placeholders.
- FAIL UAT Evidence Pack/basic-owner-name-format: Basic evidence pack owners use role labels instead of named people: 研发负责人
- FAIL UAT Evidence Pack/environment-results: Missing passed environment evidence: 销售个人账号, 销售负责人账号, 权限样本账号
- FAIL UAT Evidence Pack/uat-business-cases: Missing passed UAT evidence: UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010
- FAIL UAT Evidence Pack/p0-defects: P0/S1 defect row is missing or invalid.
- FAIL UAT Evidence Pack/p1-defects: P1/S2 defect row is missing or invalid.
- FAIL UAT Evidence Pack/go-criteria: Unsatisfied Go/No-Go criteria: 测试环境 Smoke, P0 缺陷, P1 缺陷, 业务验收, 上线风险
- FAIL UAT Evidence Pack/signoff-complete: Incomplete signoff rows: 销售侧验收人, 管理侧验收人, 产品负责人, 测试负责人, 研发负责人, 项目负责人
- FAIL UAT Evidence Manifest/evidence-complete: Evidence rows not marked PASS: ENV-EVIDENCE, PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006, SMK-001, SMK-002, SMK-003, SMK-004, SMK-005, UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010, DEF-REGISTER, DEF-P0, DEF-P1, SIGNOFF-REGISTER, SIGNOFF-SALES, SIGNOFF-MANAGER, SIGNOFF-PRODUCT, SIGNOFF-TEST, SIGNOFF-DEV, SIGNOFF-PM, GO-NOGO
- FAIL UAT Evidence Manifest/go-decision: Manifest decision is No-Go; V1 validation requires Go.
- FAIL UAT Execution Tracker/roles-assigned: Roles pending assignment or status: 销售侧验收人, 管理侧验收人, 产品负责人, 测试负责人, 项目负责人
- FAIL UAT Execution Tracker/tracker-role-owner-name-format: Tracker role owners use role labels instead of named people: 研发负责人
- FAIL UAT Execution Tracker/pre-checks: Incomplete PRE checks: PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006
- FAIL UAT Execution Tracker/smoke-checks: Incomplete SMK checks: SMK-001, SMK-002, SMK-003, SMK-004, SMK-005
- FAIL UAT Execution Tracker/uat-cases: Incomplete UAT cases: UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010
- FAIL UAT Execution Tracker/p0-p1-defects: P0/S1 and P1/S2 defect rows must show no open defects and concrete evidence.
- FAIL UAT Execution Tracker/release-gates: Incomplete release gates: UAT证据包一致性, UAT缺陷台账一致性, UAT签署台账一致性, V1最终放行门禁, 项目签署
- FAIL UAT Execution Tracker/go-decision: Tracker conclusion is No-Go; V1 validation requires Go.
- FAIL UAT Defect Register/p0-p1-summary: Invalid P0/P1 summary rows: P0 / S1 阻断, P1 / S2 严重
- FAIL UAT Defect Register/defect-details: Incomplete defect details: DEF-DRAFT
- FAIL UAT Defect Register/go-decision: Defect register decision is No-Go; V1 validation requires Go.
- FAIL UAT Signoff Register/required-signoffs: Incomplete signoffs: SIGNOFF-SALES, SIGNOFF-MANAGER, SIGNOFF-PRODUCT, SIGNOFF-TEST, SIGNOFF-DEV, SIGNOFF-PM
- FAIL UAT Signoff Register/project-go-decision: Project signoff is No-Go and register decision is No-Go; V1 validation requires Go.
- FAIL Release Gate/kickoff-governance: Kickoff governance failed: required-owners, scope-freeze, project-go-decision
- FAIL Release Gate/uat-launch-intake: UAT launch intake failed: environment-intake, participant-roster, account-custody, project-go-decision
- FAIL Release Gate/uat-environment: UAT environment evidence failed: environment-summary, environment-checks, go-decision
- FAIL Release Gate/uat-evidence-pack: UAT evidence pack failed: no-placeholders, basic-owner-name-format, environment-results, uat-business-cases, p0-defects, p1-defects, go-criteria, signoff-complete
- FAIL Release Gate/uat-evidence-manifest: UAT evidence manifest failed: evidence-complete, go-decision
- FAIL Release Gate/uat-defect-register: UAT defect register failed: p0-p1-summary, defect-details, go-decision
- FAIL Release Gate/uat-signoff-register: UAT signoff register failed: required-signoffs, project-go-decision
- FAIL Release Gate/uat-execution-tracker: UAT execution tracker failed: roles-assigned, tracker-role-owner-name-format, pre-checks, smoke-checks, uat-cases, p0-p1-defects, release-gates, go-decision
- FAIL Release Gate/go-decision: Project decision is No-Go; V1 release gate requires Go.

## Completion Rule

V1验证通过必须同时满足：readiness PASS、启动治理 validator PASS、UAT启动输入 validator PASS、UAT具名环境证据 validator PASS、UAT证据包 validator PASS、UAT证据清单 validator PASS、证据引用保全检查 PASS、UAT执行追踪表 validator PASS、UAT缺陷台账 validator PASS、UAT签署台账 validator PASS、最终 release gate PASS，且项目负责人结论为 `Go`。
