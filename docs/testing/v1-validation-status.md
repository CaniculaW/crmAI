# CRM V1 Validation Status

Generated at: 2026-06-18T18:56:19.504Z
Git commit: 0d46c2fa5dde50cb00c051b855cb27a5e8781764

Overall: No-Go

## Gate Summary

| Gate | Result | Decision | Failed checks |
|---|---|---|---:|
| Readiness | PASS | - | 0 |
| UAT Evidence Pack | FAIL | No-Go | 7 |
| UAT Execution Tracker | FAIL | No-Go | 7 |
| Release Gate | FAIL | No-Go | 3 |

## Verification Commands

- `node scripts/v1-uat-readiness-check.mjs`
- `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md`
- `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md`
- `node scripts/v1-release-gate.mjs . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md`

## Open Blockers

- FAIL UAT Evidence Pack/no-placeholders: Evidence pack still contains draft placeholders.
- FAIL UAT Evidence Pack/environment-results: Missing passed environment evidence: 销售个人账号, 销售负责人账号, 权限样本账号
- FAIL UAT Evidence Pack/uat-business-cases: Missing passed UAT evidence: UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010
- FAIL UAT Evidence Pack/p0-defects: P0/S1 defect row is missing or invalid.
- FAIL UAT Evidence Pack/p1-defects: P1/S2 defect row is missing or invalid.
- FAIL UAT Evidence Pack/go-criteria: Unsatisfied Go/No-Go criteria: 测试环境 Smoke, P0 缺陷, P1 缺陷, 业务验收, 上线风险
- FAIL UAT Evidence Pack/signoff-complete: Incomplete signoff rows: 销售侧验收人, 管理侧验收人, 产品负责人, 测试负责人, 研发负责人, 项目负责人
- FAIL UAT Execution Tracker/roles-assigned: Roles pending assignment or status: 销售侧验收人, 管理侧验收人, 产品负责人, 测试负责人, 项目负责人
- FAIL UAT Execution Tracker/pre-checks: Incomplete PRE checks: PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006
- FAIL UAT Execution Tracker/smoke-checks: Incomplete SMK checks: SMK-001, SMK-002, SMK-003, SMK-004, SMK-005
- FAIL UAT Execution Tracker/uat-cases: Incomplete UAT cases: UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010
- FAIL UAT Execution Tracker/p0-p1-defects: P0/S1 and P1/S2 defect rows must show no open defects and concrete evidence.
- FAIL UAT Execution Tracker/release-gates: Incomplete release gates: UAT证据包一致性, V1最终放行门禁, 项目签署
- FAIL UAT Execution Tracker/go-decision: Tracker conclusion is No-Go; V1 validation requires Go.
- FAIL Release Gate/uat-evidence-pack: UAT evidence pack failed: no-placeholders, environment-results, uat-business-cases, p0-defects, p1-defects, go-criteria, signoff-complete
- FAIL Release Gate/uat-execution-tracker: UAT execution tracker failed: roles-assigned, pre-checks, smoke-checks, uat-cases, p0-p1-defects, release-gates, go-decision
- FAIL Release Gate/go-decision: Project decision is No-Go; V1 release gate requires Go.

## Completion Rule

V1验证通过必须同时满足：readiness PASS、UAT证据包 validator PASS、UAT执行追踪表 validator PASS、最终 release gate PASS，且项目负责人结论为 `Go`。
