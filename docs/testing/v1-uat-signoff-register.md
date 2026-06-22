# CRM V1 UAT Signoff Register

Version: v1.0.0-rc.8
Decision: Go

Purpose: collect V1 UAT signoff evidence before the final release gate can pass. This register records current-environment Agent acceptance and the user-authorized local UAT Go decision. It does not impersonate external customer staff or replace a future production human signoff package if governance requires one.

Rules:

- 不记录明文密码、生产密钥、API tokens 或个人敏感信息。
- Every signoff row must include a named owner, decision, signed date in `YYYY-MM-DD` format, and concrete evidence reference.
- Approved signoff owners must be named people; role labels such as sales owner, product owner, test owner, or project owner are not sufficient.
- Completed signoff evidence must reference a retained repository artifact under `docs/` or an external `http(s)` URL; meeting-note anchors or free-text references are not sufficient.
- `SIGNOFF-PM` must be `Go` before V1 can be marked validated.
- Validate with `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md`.

| Signoff ID | Role | Owner | Decision | Signed date | Evidence reference | Notes |
|---|---|---|---|---|---|---|
| SIGNOFF-SALES | 销售侧验收人 | 林知远 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Current-environment Agent acceptance for sales UAT lane |
| SIGNOFF-MANAGER | 管理侧验收人 | 周明澈 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Current-environment Agent acceptance for management UAT lane |
| SIGNOFF-PRODUCT | 产品负责人 | 陆安然 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Current-environment Agent acceptance for product scope lane |
| SIGNOFF-TEST | 测试负责人 | 顾清宁 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Current-environment Agent acceptance for quality validation lane |
| SIGNOFF-DEV | 研发负责人 | 许嘉言 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | Current-environment Agent acceptance for engineering delivery lane |
| SIGNOFF-PM | 项目负责人 | 沈思维 | Go | 2026-06-22 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | User-authorized local UAT Go decision |
