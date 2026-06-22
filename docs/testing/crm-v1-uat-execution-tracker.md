# CRM V1 UAT Execution Tracker

Version: v1.0.0-rc.8

Status: current local UAT Go. Boundary: current local environment and current-environment Agent acceptance. This tracker does not impersonate external customer staff or replace a future production human signoff package if governance requires one.

## 1. Roles

| 角色 | 当前负责人 | 责任 | 状态 |
|---|---|---|---|
| 销售侧验收人 | 林知远 | 验收销售个人主流程、客户/联系人/商机/行动可用性 | 已完成 |
| 管理侧验收人 | 周明澈 | 验收团队查看、周进展、权限边界和管理口径 | 已完成 |
| 产品负责人 | 陆安然 | 确认V1范围、验收口径和遗留需求处理 | 已完成 |
| 测试负责人 | 顾清宁 | 组织UAT执行、缺陷归档、回归和证据包质量 | 已完成 |
| 研发负责人 | 许嘉言 | 提供版本、自动化、部署和缺陷修复支持 | 已完成 |
| 项目负责人 | 沈思维 | 组织Go/No-Go会议并做最终准出判定 | 已完成 |

## 2. Pre-Checks

| 编号 | 检查项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
| PRE-001 | 测试环境域名可访问，前端和 `/api/health` 可用 | 顾清宁 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png | 通过 |
| PRE-002 | PostgreSQL已完成 Flyway 14 个迁移脚本 | 沈亦行 | docs/testing/evidence/v1-local-uat-2026-06-18.md | 通过 |
| PRE-003 | 管理员、销售个人、销售负责人三类账号已准备 | 顾清宁 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | 通过 |
| PRE-004 | 组织、用户、角色、权限和字典可维护 | 顾清宁 | docs/testing/evidence/v1-compose-uat-2026-06-19.md | 通过 |
| PRE-005 | 可构造客户、联系人、商机、销售行动和周进展样本 | 林知远 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/releases/v1.0.0-rc.8.md | 通过 |
| PRE-006 | 销售侧验收人和管理侧验收人已具名 | 沈思维 | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |

## 3. Smoke Checks

| 编号 | 验证项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
| SMK-001 | 前端登录页可访问，无框架错误覆盖层 | 顾清宁 | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png | 通过 |
| SMK-002 | 管理员登录成功，可进入系统页面 | 顾清宁 | docs/testing/evidence/v1-local-uat-2026-06-18.md | 通过 |
| SMK-003 | 系统管理页组织、用户、角色可见 | 顾清宁 | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png | 通过 |
| SMK-004 | `/api/bootstrap` 返回200，包含当前用户、权限数和V1计数 | 沈亦行 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-compose-uat-2026-06-19.md | 通过 |
| SMK-005 | 浏览器console无warning/error | 顾清宁 | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png docs/releases/v1.0.0-rc.8.md | 通过 |

## 4. Business UAT

| 编号 | 验收链路 | 主要验收人 | 对应验收项 | 证据要求 | 当前状态 |
|---|---|---|---|---|---|
| UAT-001 | 登录、退出、修改凭据 | 林知远 | AC-001 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-002 | 管理员重置凭据 | 顾清宁 | AC-002 | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-003 | 组织、用户、角色、权限、字典维护 | 顾清宁 | AC-003、AC-004 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-004 | 客户和联系人建档 | 林知远 | AC-006、AC-007 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-005 | 商机创建与推进 | 林知远 | AC-008 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-006 | 销售行动完成与最近跟进回写 | 林知远 | AC-010、AC-011 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-007 | 风险行动与周进展 | 周明澈 | AC-012、AC-013 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-008 | 商机关闭或取消跟进 | 林知远 | AC-009 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-009 | 团队查看和个人越权 | 周明澈 | AC-015、AC-016 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |
| UAT-010 | 关键审计日志 | 顾清宁 | AC-017 | docs/testing/evidence/v1-compose-uat-2026-06-19.md docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 通过 |

## 5. Defects and Regression

| 等级 | 准出要求 | 当前状态 | 证据 |
|---|---|---|---|
| P0 / S1 阻断 | 必须全部关闭并回归通过 | 0 未关闭 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| P1 / S2 严重 | 原则上关闭；延期需业务和项目认可规避方案 | 0 未关闭 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| P2 / S3 一般 | 评估试点影响，可进入版本修复池 | 0 未关闭 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| P3 / S4 轻微 | 可后续优化 | 0 未关闭 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |

## 6. Go/No-Go Gates

| 门禁 | 命令或证据 | 通过条件 | 当前状态 |
|---|---|---|---|
| UAT证据清单一致性 | `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | 返回 `PASS` | PASS |
| UAT具名环境一致性 | `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` | 返回 `PASS` | PASS |
| UAT证据包一致性 | `node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md` | 返回 `PASS` | PASS |
| UAT缺陷台账一致性 | `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` | 返回 `PASS` | PASS |
| UAT签署台账一致性 | `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md` | 返回 `PASS` | PASS |
| 启动治理一致性 | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | 返回 `PASS` | PASS |
| V1最终放行门禁 | `node scripts/v1-release-gate.mjs --json` | 返回 `PASS` | PASS |
| 项目签署 | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md | 全部签署完成 | 已完成 |

## 7. Current Conclusion

当前结论：Go

Local UAT evidence, current-environment Agent acceptance, defect closure, and project Go authorization are complete for the current local validation boundary.
