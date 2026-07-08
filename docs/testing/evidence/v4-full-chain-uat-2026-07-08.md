# V4 AI销售作战助手全链路 UAT 证据

日期：2026-07-08

范围：V4 模块10，全链路回归与本地 UAT。验证链路覆盖 AI输入、草稿处理、周报、商机分析、拜访计划、沟通建议、AI日志与权限审计。

## 环境

| 项 | 值 |
|---|---|
| 前端 | `http://127.0.0.1:5178/` |
| 后端 | `http://127.0.0.1:8085/` |
| 账号 | `demo_admin` |
| 密码 | `S3cure!123` |
| 测试与验收 | AI研发主力 + 测试验收复核 Agent |

## 自动化验证

| 项 | 命令 | 结果 |
|---|---|---|
| V4 AI 后端、迁移、演示数据、OpenAPI | `mvn -Dtest=DatabaseMigrationTest,V1DemoDataSeederTest,AiContextControllerTest,AiDraftControllerTest,AiWeeklyReportControllerTest,AiOpportunityAnalysisControllerTest,AiVisitPlanControllerTest,AiCommunicationRecommendationControllerTest,AiLogControllerTest,OpenApiContractCoverageTest test` | `42 tests, 0 failures, 0 errors` |
| 后端完整 verify + Postgres IT | `mvn verify -Ppostgres-it` | Surefire `137 tests, 0 failures, 0 errors`; Failsafe `7 tests, 0 failures, 0 errors` |
| 前端 App + smoke helper 测试 | `npm test -- --run src/App.test.tsx scripts/v2-browser-smoke.test.mjs scripts/v4-browser-smoke.test.mjs` | `67 tests, 0 failures` |
| 前端生产构建 | `npm run build` | 通过；保留既有 Vite chunk 体积提示 |

## API Smoke

命令：

```bash
CRM_API_SMOKE_URL=http://127.0.0.1:8085 CRM_SMOKE_EVIDENCE_DIR=/Users/shensiwei/AIJob/codex_presolution/code/docs/testing/evidence/artifacts/v4-api-smoke-20260708 npm run smoke:v4:api
```

结果：

- 状态：passed
- AI 权限：7 个权限点全部具备
- 选择上下文：商机 `智能制造CRM一期试点`，联系人 ID `1`
- 上下文覆盖：客户 3、商机 1、近期行动 6、证据 6
- 草稿：生成 1 条并拒绝，状态 `rejected`
- 周报：生成并拒绝，状态 `rejected`
- 商机分析：生成并拒绝，证据 8，状态 `rejected`
- 拜访计划：生成并拒绝，证据 8，状态 `rejected`
- 沟通建议：生成并拒绝，证据 8，状态 `rejected`
- AI日志：24 条，覆盖 `draft`、`weekly_report`、`opportunity_analysis`、`visit_plan`、`communication_recommendation`

证据：`docs/testing/evidence/artifacts/v4-api-smoke-20260708/report.json`

## 浏览器 UAT

命令：

```bash
CRM_SMOKE_URL=http://127.0.0.1:5178 CRM_SMOKE_EVIDENCE_DIR=/Users/shensiwei/AIJob/codex_presolution/code/docs/testing/evidence/artifacts/v4-browser-smoke-20260708 npm run smoke:v4:browser
```

结果：

- 状态：passed
- 路由检查：24 个，覆盖 desktop/tablet/mobile
- 控制台失败：0
- 失败 API 响应：0
- 页面覆盖：`/`、`/ai-assistant`、`/ai-assistant/drafts`、`/ai-assistant/weekly-report`、`/ai-assistant/opportunities`、`/ai-assistant/visit-plans`、`/ai-assistant/communication`、`/ai-assistant/logs`

证据目录：`docs/testing/evidence/artifacts/v4-browser-smoke-20260708/`

## 修复项

- 修复 Postgres 迁移集成测试仍断言 V33 的问题，更新为 V34 并补充 `ai.log.read` 权限断言。
- 新增 V4 API Smoke 脚本，覆盖登录、权限、上下文、生成、人工拒绝和 AI 日志追溯。
- 新增 V4 Browser Smoke 脚本，覆盖 AI 助手核心页面、三个视口、控制台和 API 响应。
- 修复 V4 页面 AntD `Space direction` 弃用告警。
- 修复 AI 日志表格复合 row key，避免不同日志源同 ID 导致 React 重复 key 告警。

## 结论

V4 模块10全链路回归与 UAT 通过。当前版本满足进入模块11 `V4 Go/No-Go 与合并准备` 的条件。
