# CRM V4 AI销售作战助手全链路 UAT Runbook

日期：2026-07-08

范围：V4 模块10，全链路回归与本地 UAT。目标是验证 AI 销售作战助手从事实输入、建议生成、人工确认、业务写入到 AI 日志追溯的闭环。

## 1. 环境

| 项 | 值 |
|---|---|
| 前端 | `http://127.0.0.1:5178/` |
| 后端 | `http://127.0.0.1:8085/` |
| 账号 | `demo_admin` |
| 密码 | `S3cure!123` |
| 数据库 | 本地 PostgreSQL `jdbc:postgresql://localhost:55432/crm_ai` |

## 2. 自动化回归

| 编号 | 检查项 | 命令 | 通过标准 |
|---|---|---|---|
| V4-AUTO-001 | AI 后端、迁移与演示数据回归 | `mvn -Dtest=DatabaseMigrationTest,V1DemoDataSeederTest,AiContextControllerTest,AiDraftControllerTest,AiWeeklyReportControllerTest,AiOpportunityAnalysisControllerTest,AiVisitPlanControllerTest,AiCommunicationRecommendationControllerTest,AiLogControllerTest,OpenApiContractCoverageTest test` | 0 failure / 0 error |
| V4-AUTO-002 | 前端 V4 页面与主 App 回归 | `npm test -- --run src/App.test.tsx` | 0 failure |
| V4-AUTO-003 | 前端生产构建 | `npm run build` | 构建退出码 0 |
| V4-AUTO-004 | OpenAPI 覆盖 | 已包含在 V4-AUTO-001 | 所有运行时 `/api` 路径均被 OpenAPI 覆盖 |

## 3. API Smoke

| 编号 | 接口 | 检查点 |
|---|---|---|
| V4-API-001 | `POST /api/auth/login` | `demo_admin` 可登录，返回 token，权限包含 AI 相关权限和 `ai.log.read` |
| V4-API-002 | `GET /api/ai-context/summary` | 返回客户、商机、行动、风险和证据摘要 |
| V4-API-003 | `POST /api/ai-drafts/parse` | 文本可生成待确认草稿，不直接写业务表 |
| V4-API-004 | `GET /api/ai-drafts` | 草稿列表可查，状态可追踪 |
| V4-API-005 | `POST /api/ai-weekly-reports/generate` | 可生成周报，包含个人总结、商机周进展和证据 |
| V4-API-006 | `POST /api/ai-opportunity-analyses/generate` | 可生成商机分析，包含阶段健康、风险、阻塞点和下一步 |
| V4-API-007 | `POST /api/ai-visit-plans/generate` | 可生成拜访计划，包含目标、议程、材料、问题和跟进动作 |
| V4-API-008 | `POST /api/ai-communication-recommendations/generate` | 可生成沟通建议，包含渠道、语气、重点和开场话术 |
| V4-API-009 | `GET /api/ai-logs` | 可追踪生成、确认写入、业务对象、Trace 和时间筛选 |

## 4. 浏览器 UAT

| 编号 | 页面 | 检查点 |
|---|---|---|
| V4-UAT-001 | `/ai-assistant` | AI 工作台展示快捷任务、上下文摘要、待确认草稿、最近 AI 建议；无服务端异常 |
| V4-UAT-002 | `/ai-assistant/drafts` | 可查看草稿、补充缺失/冲突、确认或拒绝，确认后能回到业务对象 |
| V4-UAT-003 | `/ai-assistant/weekly-report` | 可生成周报、查看证据、确认写入周进展行动 |
| V4-UAT-004 | `/ai-assistant/opportunities` | 可选择商机生成分析，查看证据和下一步行动建议 |
| V4-UAT-005 | `/ai-assistant/visit-plans` | 可生成拜访计划，查看对象、议程、材料、问题和跟进动作 |
| V4-UAT-006 | `/ai-assistant/communication` | 可生成沟通建议，查看渠道、语气、重点、时机和升级路径 |
| V4-UAT-007 | `/ai-assistant/logs` | 可筛选 AI 日志，打开详情，查看 Trace，并跳转业务对象 |

## 5. 准出标准

- 自动化回归、构建和 OpenAPI 覆盖均通过。
- 浏览器 UAT 页面无服务端异常横幅，无前端应用控制台错误。
- AI 生成结果均有人工确认或拒绝入口，不允许 AI 跳过人工确认。
- 确认写入后的销售行动、周进展或业务对象可追溯。
- AI 日志可追踪生成、确认、拒绝、写入成功/失败和权限拒绝审计。
- 证据截图和执行结论归档到 `docs/testing/evidence/` 与 `docs/testing/evidence/artifacts/`。
