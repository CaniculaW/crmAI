# CRM V1 UAT Launch Intake

Version: v1.0.0-rc.8
Decision: No-Go

Purpose: collect the external UAT launch inputs required before project, test, business, and engineering teams can execute formal V1 UAT in a named environment. This intake does not replace the UAT evidence pack, execution tracker, defect register, signoff register, or final release gate.

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
| 测试环境名称 | 待填写 | 待补充 |
| 前端访问地址 | 待填写 | 待补充 |
| 后端 API 地址 | 待填写 | 待补充 |
| Git 提交号 | 待填写 | 待补充 |
| UAT窗口 | 待确认 | 待补充 |
| 证据归档位置 | 待确认 | 待补充 |

## Participant Roster

| Participant ID | Role | Owner | Contact | Responsibility | Status |
|---|---|---|---|---|---|
| UAT-SALES | 销售侧验收人 | 待填写 | 待补充 | 验收销售主流程 | 待确认 |
| UAT-MANAGER | 管理侧验收人 | 待填写 | 待补充 | 验收管理视图和权限边界 | 待确认 |
| UAT-PRODUCT | 产品负责人 | 待填写 | 待补充 | 确认范围和准出口径 | 待确认 |
| UAT-TEST | 测试负责人 | 待填写 | 待补充 | 组织执行和证据归档 | 待确认 |
| UAT-DEV | 研发负责人 | 待填写 | 待补充 | 支持环境和缺陷修复 | 待确认 |
| UAT-PM | 项目负责人 | 待填写 | 待补充 | 组织 Go/No-Go 会议 | 待确认 |

## Account Custody

| Account item | Owner | Status | Evidence |
|---|---|---|---|
| 管理员账号 | 待填写 | 待准备 | 待补充 |
| 销售个人账号 | 待填写 | 待准备 | 待补充 |
| 销售负责人账号 | 待填写 | 待准备 | 待补充 |
| 权限样本账号 | 待填写 | 待准备 | 待补充 |

## Launch Gate

Current result: `No-Go`.

Required before launch:

- UAT launch intake validator returns `PASS`.
- `docs/testing/v1-uat-environment-evidence.md` has a named environment and matching commit.
- `docs/testing/crm-v1-uat-execution-tracker.md` has owners assigned for PRE, SMK, UAT, defects, release gates, and signoff work.
- Project owner confirms the UAT window and evidence repository.
