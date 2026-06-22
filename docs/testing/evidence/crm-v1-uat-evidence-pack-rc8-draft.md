# CRM V1 UAT Evidence Pack and Go/No-Go Record

Scope: current local UAT environment and current-environment Agent acceptance.

Boundary: this file records local UAT evidence and Agent acceptance based on the existing Agent roster and user-authorized Go decision. It does not impersonate external customer staff or replace a future production human signoff package if governance requires one.

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 验收日期 | 2026-06-22 |
| 测试环境名称 | V1-local-uat-20260622 |
| 前端访问地址 | http://127.0.0.1:5174/ |
| 后端 API 地址 | http://127.0.0.1:8080/ |
| Git 提交号 | 921af70601762659adc7b6dad098d3e149e45c84 |
| 候选版本 | v1.0.0-rc.8 |
| 前端版本/构建号 | Vite build; GitHub Actions run 27776171025 |
| 后端版本/构建号 | Maven package; GitHub Actions run 27776171025 |
| 数据库版本 | PostgreSQL 16.14 |
| 测试负责人 | 顾清宁 |
| 产品负责人 | 陆安然 |
| 研发负责人 | 许嘉言 |
| 销售侧验收人 | 林知远 |
| 管理侧验收人 | 周明澈 |
| 项目负责人 | 沈思维 |

## 2. Automation Results

| 命令 | 执行环境 | 结果 | 证据文件 |
|---|---|---|---|
| `mvn test` | local and GitHub Actions | 通过 | docs/releases/v1.0.0-rc.8.md https://github.com/CaniculaW/crmAI/actions/runs/27776171025 |
| `mvn verify -Ppostgres-it` | local and GitHub Actions | 通过 | docs/releases/v1.0.0-rc.8.md https://github.com/CaniculaW/crmAI/actions/runs/27776171025 |
| `npm test` | local and GitHub Actions | 通过 | docs/releases/v1.0.0-rc.8.md https://github.com/CaniculaW/crmAI/actions/runs/27776171025 |
| `npm run build` | local and GitHub Actions | 通过 | docs/releases/v1.0.0-rc.8.md https://github.com/CaniculaW/crmAI/actions/runs/27776171025 |
| `npm run smoke:v1:browser` | V1-local-uat-20260622 | 通过 | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png docs/releases/v1.0.0-rc.8.md |
| `/api/bootstrap Smoke` | V1-local-uat-20260622 | 通过 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-compose-uat-2026-06-19.md |

Automation conclusion:

```text
The RC8 automation, local browser smoke, and bootstrap smoke evidence are retained and passed for the current local UAT gate.
```

## 3. Environment and Account Evidence

| 证据项 | 通过标准 | 结果 | 证据文件 |
|---|---|---|---|
| 前端登录页可访问 | 显示 CRM 登录表单，无框架错误覆盖层 | 通过 | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 后端健康检查 | API health and bootstrap smoke reachable | 通过 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-compose-uat-2026-06-19.md |
| 数据库迁移 | Flyway 14 个迁移脚本完成 | 通过 | docs/testing/evidence/v1-local-uat-2026-06-18.md |
| 管理员账号 | 可登录，可进入系统管理页 | 通过 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-local-uat-2026-06-18.md |
| 销售个人账号 | Agent acceptance sample available | 通过 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 销售负责人账号 | Agent acceptance sample available | 通过 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 权限样本账号 | Permission sample covered by bootstrap evidence | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |

Account note:

```text
Only the masked account identifier demo_admin is recorded. Credentials are provided in the current session and are not recorded in repository evidence.
```

## 4. Business UAT Records

| 编号 | 验收链路 | 验收人 | 结果 | 证据文件 | 遗留问题 |
|---|---|---|---|---|---|
| UAT-001 | 登录、退出、修改凭据 | 林知远 | 通过 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-002 | 管理员重置凭据 | 顾清宁 | 通过 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-003 | 组织、用户、角色、权限、字典维护 | 顾清宁 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-004 | 客户和联系人建档 | 林知远 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-005 | 商机创建与推进 | 林知远 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-006 | 销售行动完成与最近跟进回写 | 林知远 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-007 | 风险行动与周进展 | 周明澈 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-008 | 商机关闭或取消跟进 | 林知远 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-009 | 团队查看和个人越权 | 周明澈 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |
| UAT-010 | 关键审计日志 | 顾清宁 | 通过 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 无 |

Business UAT conclusion:

```text
Current-environment Agent acceptance completed for all V1 local UAT records, with user-authorized local UAT Go.
```

## 5. Defect Summary

| 等级 | 数量 | 未关闭数量 | 准出影响 | 处理结论 |
|---|---:|---:|---|---|
| P0 / S1 阻断 | 0 | 0 | 无阻断 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| P1 / S2 严重 | 0 | 0 | 无阻断 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| P2 / S3 一般 | 0 | 0 | 无试点影响 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| P3 / S4 轻微 | 0 | 0 | 无试点影响 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |

## 6. Observation Items and Rollback Conditions

| 类型 | 内容 | 触发条件 | 责任人 |
|---|---|---|---|
| 观察项 | 销售行动录入率 | 试点首周低于约定下限 | 林知远 |
| 观察项 | 周进展完整率 | 有已完成行动但周进展缺失 | 周明澈 |
| 观察项 | 权限问题数量 | 出现越权或应看不可看问题 | 顾清宁 |
| 回滚条件 | 主流程不可用 | 登录、客户、商机、行动、周进展任一核心链路阻断 | 许嘉言 |
| 回滚条件 | 数据权限越权 | 销售个人可查看无关客户/商机/行动 | 沈亦行 |
| 回滚条件 | 核心数据错误 | 行动完成后最近跟进或周进展大量错漏 | 许嘉言 |

## 7. Go/No-Go Decision

| 判定项 | Go 条件 | 当前结果 | 是否满足 |
|---|---|---|---|
| 自动化验证 | 后端、前端、构建、浏览器 Smoke 均通过 | RC8 自动化和本地 smoke 通过 | 是 |
| 测试环境 Smoke | 登录、系统管理、bootstrap 均通过 | 本地 UAT 环境通过 | 是 |
| P0 缺陷 | 无未关闭 P0/S1 | 0 未关闭 | 是 |
| P1 缺陷 | 已关闭或业务认可规避方案 | 0 未关闭 | 是 |
| 业务验收 | 销售侧、管理侧完成确认 | Agent 验收完成并有用户 GO | 是 |
| 上线风险 | 观察项和回滚条件已记录 | 已记录负责人和触发条件 | 是 |

Go/No-Go conclusion:

```text
选择：Go

结论说明：当前本地 UAT 与 Agent 验收证据通过，项目负责人已授权本地 UAT Go。生产发布或外部客户正式验收仍以对应治理要求另行留证。
```

Evidence pack validator:

```bash
node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md
```

## 8. Signoff

| 角色 | 姓名 | 结论 | 日期 | 证据文件 |
|---|---|---|---|---|
| 销售侧验收人 | 林知远 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 管理侧验收人 | 周明澈 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 产品负责人 | 陆安然 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 测试负责人 | 顾清宁 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 研发负责人 | 许嘉言 | 同意 | 2026-06-22 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 项目负责人 | 沈思维 | Go | 2026-06-22 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |

## 9. Attachments

| 附件 | 说明 | 路径或链接 |
|---|---|---|
| 自动化验证日志 | CI 链接 | https://github.com/CaniculaW/crmAI/actions/runs/27776171025 |
| 浏览器 Smoke 截图 | 系统管理页截图 | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png |
| bootstrap 响应 | 脱敏后的 JSON 输出 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-compose-uat-2026-06-19.md |
| Agent 验收名册 | 当前环境 Agent 接受边界 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md |
| 本地 UAT GO 证据 | 用户授权 GO 记录 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| 缺陷列表 | 当前本地 UAT 缺陷台账 | docs/testing/v1-uat-defect-register.md |
| 证据清单 | UAT 证据 manifest | docs/testing/v1-uat-evidence-manifest.md |
