# CRM AI 功能缺陷修复验收记录

日期：2026-07-14
公网环境：`http://120.55.73.23/`
最终 Git 提交：`7cfb760`
数据库版本：Flyway V39
验收结论：`GO`

## 1. 验收范围

本轮关闭首轮功能测试发现的 3 个 P1、7 个 P2，并补充修复复审期间发现的前端最小权限问题：直接路由守卫、跨模块列表请求、详情附件/到账请求、驾驶舱父菜单、AI 生成前置条件以及 AI 风险/证据业务链接。

## 2. 本地质量门禁

| 门禁 | 结果 |
|---|---|
| 后端单元测试 | 196/196 通过 |
| PostgreSQL 集成测试 | 7/7 通过，39 个迁移验证成功 |
| 前端 Vitest | 8 个文件，169/169 通过 |
| 前端生产构建 | TypeScript 与 Vite 构建成功 |
| 独立代码复审 | 最终无 findings |

## 3. 公网发布校验

- 前端发布提交：`7cfb760`。
- 公网主制品：`assets/index-BEUZXVWY.js`。
- 本地与公网主制品 SHA-256：`528174f66bd131dfc7026b3019e1f5035aef721558161e9417661d9e33180844`，完全一致。
- 后端健康检查：`UP`。
- 回滚目录：`/opt/crmAI/runtime/frontend/dist-before-7cfb760`。
- 发布前已备份公网数据库，并仅清理测试产生的负金额合同及其已确认不存在的依赖记录。

## 4. 公网功能回归

| 范围 | 结果 | 证据 |
|---|---|---|
| V4 AI API smoke | 通过 | `artifacts/functional-remediation-public-20260714/v4-api/report.json` |
| 最终 V4 浏览器回归 | 24/24，0 控制台错误，0 失败响应 | `artifacts/functional-remediation-public-20260714/v4-browser-7cfb760/report.json` |
| 受限管理直链 | 18/18 均回到工作台 | `artifacts/functional-remediation-public-20260714/restricted-routes/report.json` |
| 受限管理 API | 8/8 返回 403 | 一次性 RBAC 用户执行记录 |
| 停用用户会话 | 旧 token 的认证/业务请求与重新登录均返回 401 | 一次性 RBAC 用户执行记录 |
| 审批 API 端到端 | 29/29 通过 | `artifacts/functional-remediation-public-20260714/approval-e2e/report.json` |
| 审批页面 | 4/4，0 控制台错误，0 失败响应 | `artifacts/functional-remediation-public-20260714/approval-browser/report.json` |

审批回归覆盖报价同意、投标驳回、合同同意，以及重复发起 409、错误角色审批 403、空驳回意见 409。一次性 RBAC 验收用户已停用，旧会话已验证失效。

## 5. 结论与边界

首轮 10 个功能缺陷及后续最小权限复审问题均已关闭，P0/P1/P2 未留开放项，满足本轮功能修复准出条件。

当前 AI 生成仍为 `rules_fallback` 业务规则模式，AI 配置页用于 OpenAI 连接配置与测试，不应将当前生成结果表述为已调用远程模型。公网仍使用 HTTP，且 CentOS 7 已停止常规维护；TLS、操作系统升级和正式凭据轮换属于上线运维加固项，不影响本轮功能回归结论。
