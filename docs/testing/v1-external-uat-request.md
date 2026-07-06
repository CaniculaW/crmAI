# CRM V1 External UAT Request Packet

Generated at: 2026-07-05T15:05:27.660Z

Request Status: No External UAT Requests Open

Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in any request evidence.

## Request Board

All external UAT request items are closed by validator evidence.

## Validation Commands

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

## Current Blocking Evidence Requests

- None.

Note: This packet is a stakeholder-facing request board. It does not replace the UAT source documents, validator output, or final release gate.
