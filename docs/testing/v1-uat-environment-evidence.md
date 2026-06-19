# CRM V1 UAT Environment Evidence

Version: v1.0.0-rc.8
Decision: No-Go

> Current status: draft. This record must be completed with evidence from the project-named UAT environment before V1 can be marked Go.

## Rules

- Do not record plaintext passwords, production secrets, API tokens, or personal sensitive information.
- 不记录明文密码、生产密钥、API Token 或个人敏感信息。
- Use masked usernames, screenshots, command output, CI links, or ticket IDs as evidence references.
- 前端访问地址 and 后端 API 地址 must be `http(s)` URLs; Git 提交号 must be a 40-character commit SHA.
- PASS evidence references must point to retained repository artifacts under `docs/` or external `http(s)` URLs; meeting-note anchors or free-text references are not sufficient.
- PASS environment check owners must be named people; role labels such as test owner or engineering/operations are not sufficient.
- Validate with `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md`.
- The final V1 release gate requires this validator to return `PASS`.

## Environment Summary

| Item | Value |
|---|---|
| 测试环境名称 | 待确认 |
| 前端访问地址 | 待填写 |
| 后端 API 地址 | 待填写 |
| 候选版本 | v1.0.0-rc.8 |
| Git 提交号 | 待填写 |

## Environment Checks

| Check ID | Check item | Status | Evidence reference | Owner |
|---|---|---|---|---|
| ENV-001 | 前端登录页可访问 | PENDING | 待补充 | 测试负责人 |
| ENV-002 | 后端健康检查可用 | PENDING | 待补充 | 研发/运维 |
| ENV-003 | 数据库迁移完成 | PENDING | 待补充 | 研发/运维 |
| ENV-004 | 管理员账号可登录 | PENDING | 待补充 | 测试负责人 |
| ENV-005 | 销售个人账号可登录并可操作 | PENDING | 待补充 | 销售侧验收人 |
| ENV-006 | 销售负责人账号可查看团队 | PENDING | 待补充 | 管理侧验收人 |
| ENV-007 | 权限样本账号覆盖本人/本部门/协同/全局 | PENDING | 待补充 | 测试负责人 |
| ENV-008 | 浏览器 Smoke 无 console warning/error | PENDING | 待补充 | 测试负责人 |
