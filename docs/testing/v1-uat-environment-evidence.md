# CRM V1 UAT Environment Evidence

Version: v1.0.0-rc.8
Decision: Go

> Current status: local UAT evidence completed for `V1-local-uat-20260622`. Boundary: current local UAT environment and current-environment Agent acceptance only.

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
| 测试环境名称 | V1-local-uat-20260622 |
| 前端访问地址 | http://127.0.0.1:5174/ |
| 后端 API 地址 | http://127.0.0.1:8080/ |
| 候选版本 | v1.0.0-rc.8 |
| Git 提交号 | 921af70601762659adc7b6dad098d3e149e45c84 |

## Environment Checks

| Check ID | Check item | Status | Evidence reference | Owner |
|---|---|---|---|---|
| ENV-001 | 前端登录页可访问 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png | 顾清宁 |
| ENV-002 | 后端健康检查可用 | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | 沈亦行 |
| ENV-003 | 数据库迁移完成 | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md | 沈亦行 |
| ENV-004 | 管理员账号可登录 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-local-uat-2026-06-18.md | 顾清宁 |
| ENV-005 | 销售个人账号可登录并可操作 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | 林知远 |
| ENV-006 | 销售负责人账号可查看团队 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | 周明澈 |
| ENV-007 | 权限样本账号覆盖本人/本部门/协同/全局 | PASS | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | 顾清宁 |
| ENV-008 | 浏览器 Smoke 无 console warning/error | PASS | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png docs/releases/v1.0.0-rc.8.md | 顾清宁 |
