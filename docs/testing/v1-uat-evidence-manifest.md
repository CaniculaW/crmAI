# CRM V1 UAT Evidence Manifest

Version: v1.0.0-rc.8

Decision: No-Go

Purpose: centralize the evidence reference that must be filled before V1 can pass final validation. This manifest is an index, not the evidence itself.

Rules:

- 不记录明文密码、生产密钥、API tokens 或个人敏感信息。
- Every `PASS` row must include a concrete evidence reference that points to a retained `docs/` artifact or an external `http(s)` URL.
- Keep this manifest aligned with `docs/testing/crm-v1-uat-execution-tracker.md` and the final UAT evidence pack.
- Validate with `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md`.

| Evidence ID | Type | Owner | Status | Evidence reference | Notes |
|---|---|---|---|---|---|
| ENV-EVIDENCE | 具名环境 | 测试负责人 | PENDING | 待补充 | 具名测试环境证据和 Smoke 结果待补充 |
| PRE-001 | 前置检查 | 研发/运维 | PENDING | 待补充 | 测试环境域名、前端和 `/api/health` 待确认 |
| PRE-002 | 前置检查 | 研发/运维 | PENDING | 待补充 | Flyway迁移证据待补充 |
| PRE-003 | 前置检查 | 研发/测试 | PENDING | 待补充 | 管理员、销售个人、销售负责人账号清单待脱敏记录 |
| PRE-004 | 前置检查 | 测试/业务 | PENDING | 待补充 | 系统管理页证据待补充 |
| PRE-005 | 前置检查 | 测试/业务 | PENDING | 待补充 | 客户、联系人、商机、行动和周进展样本待补充 |
| PRE-006 | 前置检查 | 项目/业务 | PENDING | 待补充 | 销售侧和管理侧验收人待具名 |
| SMK-001 | Smoke | 测试 | PENDING | 待补充 | 前端登录页截图待补充 |
| SMK-002 | Smoke | 测试 | PENDING | 待补充 | 管理员登录证据待补充 |
| SMK-003 | Smoke | 测试 | PENDING | 待补充 | 系统管理页和浏览器Smoke输出待补充 |
| SMK-004 | Smoke | 测试/研发 | PENDING | 待补充 | `/api/bootstrap` 脱敏输出待补充 |
| SMK-005 | Smoke | 测试 | PENDING | 待补充 | 浏览器console无warning/error证据待补充 |
| UAT-001 | 业务UAT | 销售侧验收人 | PENDING | 待补充 | 登录、退出、修改密码待验收 |
| UAT-002 | 业务UAT | 测试负责人 | PENDING | 待补充 | 管理员重置密码和审计日志待验收 |
| UAT-003 | 业务UAT | 测试负责人 | PENDING | 待补充 | 组织、用户、角色、权限、字典维护待验收 |
| UAT-004 | 业务UAT | 销售侧验收人 | PENDING | 待补充 | 客户和联系人建档待验收 |
| UAT-005 | 业务UAT | 销售侧验收人 | PENDING | 待补充 | 商机创建与推进待验收 |
| UAT-006 | 业务UAT | 销售侧验收人 | PENDING | 待补充 | 销售行动完成与最近跟进回写待验收 |
| UAT-007 | 业务UAT | 管理侧验收人 | PENDING | 待补充 | 风险行动与周进展待验收 |
| UAT-008 | 业务UAT | 销售侧验收人 | PENDING | 待补充 | 商机关闭或取消跟进待验收 |
| UAT-009 | 业务UAT | 管理侧验收人 | PENDING | 待补充 | 团队查看和个人越权待验收 |
| UAT-010 | 业务UAT | 测试负责人 | PENDING | 待补充 | 关键审计日志待验收 |
| DEF-REGISTER | 缺陷闭环 | 测试负责人 | PENDING | 待补充 | 缺陷台账和回归证据待补充 |
| DEF-P0 | 缺陷闭环 | 测试负责人 | PENDING | 待补充 | P0/S1缺陷汇总和回归证据待补充 |
| DEF-P1 | 缺陷闭环 | 测试负责人 | PENDING | 待补充 | P1/S2缺陷汇总、关闭或规避方案待补充 |
| SIGNOFF-REGISTER | 签署 | 项目负责人 | PENDING | 待补充 | 签署台账和项目Go结论待补充 |
| SIGNOFF-SALES | 签署 | 销售侧验收人 | PENDING | 待补充 | 销售侧签署待完成 |
| SIGNOFF-MANAGER | 签署 | 管理侧验收人 | PENDING | 待补充 | 管理侧签署待完成 |
| SIGNOFF-PRODUCT | 签署 | 产品负责人 | PENDING | 待补充 | 产品范围确认待完成 |
| SIGNOFF-TEST | 签署 | 测试负责人 | PENDING | 待补充 | 测试结论签署待完成 |
| SIGNOFF-DEV | 签署 | 研发负责人 | PENDING | 待补充 | 研发支持结论待完成 |
| SIGNOFF-PM | 签署 | 项目负责人 | PENDING | 待补充 | 项目准出签署待完成 |
| GO-NOGO | 项目判定 | 项目负责人 | PENDING | 待补充 | Go/No-Go会议记录待补充 |
