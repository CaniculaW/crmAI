# CRM V1 UAT Launch Intake

Version: v1.0.0-rc.8
Decision: Go

Purpose: collect the UAT launch inputs required before project, test, business, and engineering teams can execute V1 UAT in a named environment. This record is scoped to the current local UAT environment and current-environment Agent acceptance. It does not impersonate external customer staff or replace a future production human signoff package if governance requires one.

Rules:

- 不记录明文密码、生产密钥、API tokens 或个人敏感信息。
- Every environment field must include a concrete value and evidence reference.
- Frontend and backend API addresses must be `http(s)` URLs, and Git commit must be a 40-character SHA.
- UAT窗口 must use `YYYY-MM-DD HH:mm 至 YYYY-MM-DD HH:mm`, and the end must be later than the start.
- Environment and account custody evidence references must point to a retained `docs/` artifact or an external `http(s)` system URL; free-text anchors are not sufficient.
- Every required participant must be named and confirmed before UAT execution starts.
- Confirmed participant owners must be named people; role labels such as sales owner, product owner, test owner, or project owner are not sufficient.
- Prepared account custody owners must be named people; role labels such as test owner are not sufficient.
- Account custody rows must confirm prepared masked accounts only; passwords stay outside this repository.
- Validate with `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md`.

## Environment and Schedule

| Field | Value | Evidence |
|---|---|---|
| 测试环境名称 | V1-local-uat-20260622 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 前端访问地址 | http://127.0.0.1:5174/ | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png |
| 后端 API 地址 | http://127.0.0.1:8080/ | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-local-uat-2026-06-18.md |
| Git 提交号 | 921af70601762659adc7b6dad098d3e149e45c84 | docs/releases/v1.0.0-rc.8.md |
| UAT窗口 | 2026-06-22 00:00 至 2026-06-22 23:59 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 证据归档位置 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |

## Participant Roster

| Participant ID | Role | Owner | Contact | Responsibility | Status |
|---|---|---|---|---|---|
| UAT-SALES | 销售侧验收人 | 林知远 | lin.zhiyuan@crm-ai.local | 验收销售主流程 | 已确认 |
| UAT-MANAGER | 管理侧验收人 | 周明澈 | zhou.mingche@crm-ai.local | 验收管理视图和权限边界 | 已确认 |
| UAT-PRODUCT | 产品负责人 | 陆安然 | lu.anran@crm-ai.local | 确认范围和准出口径 | 已确认 |
| UAT-TEST | 测试负责人 | 顾清宁 | gu.qingning@crm-ai.local | 组织执行和证据归档 | 已确认 |
| UAT-DEV | 研发负责人 | 许嘉言 | xu.jiayan@crm-ai.local | 支持环境和缺陷修复 | 已确认 |
| UAT-PM | 项目负责人 | 沈思维 | shen.siwei@crm-ai.local | 组织 Go/No-Go 会议 | 已确认 |

## Account Custody

| Account item | Owner | Status | Evidence |
|---|---|---|---|
| 管理员账号 | 顾清宁 | 已准备 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-local-uat-2026-06-18.md |
| 销售个人账号 | 林知远 | 已准备 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md |
| 销售负责人账号 | 周明澈 | 已准备 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md |
| 权限样本账号 | 顾清宁 | 已准备 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md |

## Launch Gate

Current result: `Go`.

Launch evidence:

- UAT launch intake validator returns `PASS`.
- `docs/testing/v1-uat-environment-evidence.md` has a named environment and matching commit.
- `docs/testing/crm-v1-uat-execution-tracker.md` has owners assigned for PRE, SMK, UAT, defects, release gates, and signoff work.
- Project owner confirms the local UAT window and evidence repository in `docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md`.
