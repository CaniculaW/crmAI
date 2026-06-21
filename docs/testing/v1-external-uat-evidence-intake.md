# CRM V1 External UAT Evidence Intake

Generated at: 2026-06-21T14:35:47.171Z

Overall: No-Go

Closure checklist: docs/testing/v1-external-uat-closure-checklist.md

Evidence manifest: docs/testing/v1-uat-evidence-manifest.md

Do not paste passwords, bearer tokens, API keys, or unmasked account secrets into intake evidence.

## Intake Rows

| Intake ID | Owner side | Manifest evidence IDs | Source documents | Validation commands | Intake notes |
|---|---|---|---|---|---|
| KICKOFF-LAUNCH | 项目/产品 | PRE-006 | docs/meeting-notes/crm-kickoff-minutes.md; docs/testing/v1-uat-launch-intake.md; docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`<br>`node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md`<br>`node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | 补齐启动治理负责人、V1范围冻结、UAT窗口、参与人、账号保管和项目Go证据。 |
| TEST-ENV | 测试 | ENV-EVIDENCE, PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, SMK-001, SMK-002, SMK-003, SMK-004, SMK-005 | docs/testing/v1-uat-environment-evidence.md; docs/testing/crm-v1-uat-execution-tracker.md; docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md`<br>`node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md`<br>`node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | 补齐具名环境、Smoke、账号权限样本和可留存截图/日志证据。 |
| BUSINESS-UAT | 业务UAT | UAT-001, UAT-002, UAT-003, UAT-004, UAT-005, UAT-006, UAT-007, UAT-008, UAT-009, UAT-010 | docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md; docs/testing/crm-v1-uat-execution-tracker.md; docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md`<br>`node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md`<br>`node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | 逐项执行 UAT-001 至 UAT-010，留存截图、操作记录、缺陷单或外部URL。 |
| DEFECT-CLOSURE | 测试 | DEF-REGISTER, DEF-P0, DEF-P1 | docs/testing/v1-uat-defect-register.md; docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md`<br>`node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | 补齐P0/P1汇总、缺陷Owner、关闭状态、回归证据和保全引用。 |
| SIGNOFF-GO | 项目/产品 | SIGNOFF-REGISTER, SIGNOFF-SALES, SIGNOFF-MANAGER, SIGNOFF-PRODUCT, SIGNOFF-TEST, SIGNOFF-DEV, SIGNOFF-PM, GO-NOGO | docs/testing/v1-uat-signoff-register.md; docs/testing/v1-go-no-go-meeting.md; docs/testing/v1-uat-evidence-manifest.md | `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md`<br>`node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | 补齐六方具名签署、签署日期、签署证据引用和项目Go结论。 |

## Final Verification

- `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md`
- `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`

Note: This intake checklist routes incoming evidence into the formal UAT source documents. It does not replace the validators, manifest, closure checklist, or final release gate.
