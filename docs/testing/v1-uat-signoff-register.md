# CRM V1 UAT Signoff Register

Version: v1.0.0-rc.8
Decision: No-Go

Purpose: collect formal V1 UAT signoff evidence before the final release gate can pass. This register does not replace the UAT evidence pack; it is the role-level approval source for sales, management, product, test, development, and project ownership.

Rules:

- 不记录明文密码、生产密钥、API tokens 或个人敏感信息。
- Every signoff row must include a named owner, decision, signed date, and concrete evidence reference.
- Completed signoff evidence must reference a retained repository artifact under `docs/` or an external `http(s)` URL; meeting-note anchors or free-text references are not sufficient.
- `SIGNOFF-PM` must be `Go` before V1 can be marked validated.
- Validate with `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md`.

| Signoff ID | Role | Owner | Decision | Signed date | Evidence reference | Notes |
|---|---|---|---|---|---|---|
| SIGNOFF-SALES | 销售侧验收人 | 待填写 | PENDING | 待补充 | 待补充 | 销售侧签署待完成 |
| SIGNOFF-MANAGER | 管理侧验收人 | 待填写 | PENDING | 待补充 | 待补充 | 管理侧签署待完成 |
| SIGNOFF-PRODUCT | 产品负责人 | 待填写 | PENDING | 待补充 | 待补充 | 产品范围确认待完成 |
| SIGNOFF-TEST | 测试负责人 | 待填写 | PENDING | 待补充 | 待补充 | 测试结论签署待完成 |
| SIGNOFF-DEV | 研发负责人 | 待填写 | PENDING | 待补充 | 待补充 | 研发准出签署待完成 |
| SIGNOFF-PM | 项目负责人 | 待填写 | No-Go | 待补充 | 待补充 | 项目最终 Go/No-Go 结论待完成 |
