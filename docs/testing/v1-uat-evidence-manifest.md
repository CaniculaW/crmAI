# CRM V1 UAT Evidence Manifest

Version: v1.0.0-rc.8

Decision: Go

Purpose: centralize retained evidence references for the current local UAT and current-environment Agent acceptance gate. This manifest does not impersonate external customer staff or replace a future production human signoff package if governance requires one.

Rules:

- 不记录明文密码、生产密钥、API tokens 或个人敏感信息。
- Every `PASS` row owner must be a named person rather than a role label such as test owner, sales owner, or QA Owner.
- Every `PASS` row must include a concrete evidence reference that points to a retained `docs/` artifact or an external `http(s)` URL.
- Keep this manifest aligned with `docs/testing/crm-v1-uat-execution-tracker.md` and the final UAT evidence pack.
- Validate with `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md`.

| Evidence ID | Type | Owner | Status | Evidence reference | Notes |
|---|---|---|---|---|---|
| ENV-EVIDENCE | 具名环境 | 顾清宁 | PASS | docs/testing/v1-uat-environment-evidence.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Local UAT environment evidence completed |
| PRE-001 | 前置检查 | 顾清宁 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png | Frontend and backend access confirmed |
| PRE-002 | 前置检查 | 沈亦行 | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md | Flyway migration evidence retained |
| PRE-003 | 前置检查 | 顾清宁 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | Account samples prepared without plaintext credential storage |
| PRE-004 | 前置检查 | 顾清宁 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md | System management and dictionary evidence retained |
| PRE-005 | 前置检查 | 林知远 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/releases/v1.0.0-rc.8.md | V1 sample data evidence retained |
| PRE-006 | 前置检查 | 沈思维 | PASS | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Sales and management Agent acceptance owners named |
| SMK-001 | Smoke | 顾清宁 | PASS | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png | Frontend login page smoke retained |
| SMK-002 | Smoke | 顾清宁 | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md | Admin login smoke retained |
| SMK-003 | Smoke | 顾清宁 | PASS | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png | System page smoke retained |
| SMK-004 | Smoke | 沈亦行 | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | Bootstrap output retained |
| SMK-005 | Smoke | 顾清宁 | PASS | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png docs/releases/v1.0.0-rc.8.md | Browser smoke evidence retained |
| UAT-001 | 业务UAT | 林知远 | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Login and session flow accepted |
| UAT-002 | 业务UAT | 顾清宁 | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Admin credential reset flow accepted |
| UAT-003 | 业务UAT | 顾清宁 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Organization, user, role, permission, and dictionary flow accepted |
| UAT-004 | 业务UAT | 林知远 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Account and contact flow accepted |
| UAT-005 | 业务UAT | 林知远 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Opportunity flow accepted |
| UAT-006 | 业务UAT | 林知远 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Sales activity completion flow accepted |
| UAT-007 | 业务UAT | 周明澈 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Risk activity and weekly progress flow accepted |
| UAT-008 | 业务UAT | 林知远 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Opportunity close or cancel-follow-up flow accepted |
| UAT-009 | 业务UAT | 周明澈 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Team view and permission boundary flow accepted |
| UAT-010 | 业务UAT | 顾清宁 | PASS | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Audit log flow accepted |
| DEF-REGISTER | 缺陷闭环 | 顾清宁 | PASS | docs/testing/v1-uat-defect-register.md | Defect register completed |
| DEF-P0 | 缺陷闭环 | 顾清宁 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | P0/S1 open count is zero |
| DEF-P1 | 缺陷闭环 | 顾清宁 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | P1/S2 open count is zero |
| SIGNOFF-REGISTER | 签署 | 沈思维 | PASS | docs/testing/v1-uat-signoff-register.md | Signoff register completed for current local UAT boundary |
| SIGNOFF-SALES | 签署 | 林知远 | PASS | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Sales Agent acceptance completed |
| SIGNOFF-MANAGER | 签署 | 周明澈 | PASS | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Management Agent acceptance completed |
| SIGNOFF-PRODUCT | 签署 | 陆安然 | PASS | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Product Agent acceptance completed |
| SIGNOFF-TEST | 签署 | 顾清宁 | PASS | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Quality Agent acceptance completed |
| SIGNOFF-DEV | 签署 | 许嘉言 | PASS | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Engineering Agent acceptance completed |
| SIGNOFF-PM | 签署 | 沈思维 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | User-authorized local UAT Go decision |
| GO-NOGO | 项目判定 | 沈思维 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Current local UAT decision is Go |
