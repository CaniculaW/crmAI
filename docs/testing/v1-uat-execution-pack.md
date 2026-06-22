# CRM V1 UAT Execution Pack

Generated at: 2026-06-22T02:54:05.620Z

Overall: Go

## Execution Items

No open execution items.

## Verification Commands

- `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`
- `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md`
- `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md`
- `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md`
- `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md`
- `node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md`
- `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md`
- `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md`
- `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md`
- `node scripts/v1-release-gate.mjs --json . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`
- `node scripts/v1-release-gate.mjs . docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`

## Completion Rule

Every execution item must have concrete evidence in the source UAT documents before the final release gate can be treated as V1 validation evidence.
