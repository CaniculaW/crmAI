# CRM V1 Validation Status

Generated at: 2026-07-05T15:20:02.912Z
Git commit: 26df99fe35f4f399faa32241b839c39f8dc0adb8

Overall: Go

## Gate Summary

| Gate | Result | Decision | Failed checks |
|---|---|---|---:|
| Readiness | PASS | - | 0 |
| Kickoff Governance | PASS | Go | 0 |
| UAT Launch Intake | PASS | Go | 0 |
| UAT Environment Evidence | PASS | Go | 0 |
| UAT Evidence Pack | PASS | Go | 0 |
| UAT Evidence Manifest | PASS | Go | 0 |
| UAT Evidence References | PASS | Go | 0 |
| UAT Execution Tracker | PASS | Go | 0 |
| UAT Defect Register | PASS | Go | 0 |
| UAT Signoff Register | PASS | Go | 0 |
| Release Gate | PASS | Go | 0 |

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
- `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`

## Open Blockers

- None. V1 release gate is ready for Go evidence retention.

## Completion Rule

V1验证通过必须同时满足：readiness PASS、启动治理 validator PASS、UAT启动输入 validator PASS、UAT具名环境证据 validator PASS、UAT证据包 validator PASS、UAT证据清单 validator PASS、证据引用保全检查 PASS、UAT执行追踪表 validator PASS、UAT缺陷台账 validator PASS、UAT签署台账 validator PASS、最终 release gate PASS，且项目负责人结论为 `Go`。
