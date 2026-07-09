# V4 Comprehensive Validation Report - 2026-07-09

## 1. Test Team

| Agent | Role | Responsibility | Status |
|---|---|---|---|
| Main QA Coordinator | 验收组织与证据汇总 | 组织测试、复核失败项、修复本地验证环境、沉淀报告 | Completed |
| Business Flow Agent | 业务流程与用例设计 | 梳理 CRM 端到端业务链路，形成 P0/P1 用例矩阵 | Completed |
| Functional Test Agent | 功能验证 | 执行前端、后端、浏览器 smoke 与系统管理回归 | Completed |
| Performance Test Agent | 性能验证 | 对本地 API 执行轻量并发基准并识别 V4 AI 500 问题 | Completed |
| Security Test Agent | 安全验证 | 执行认证鉴权、CORS、默认账号、响应头和附件安全检查 | Completed |

## 2. Business Flow Scope

本轮按照 V4 业务闭环验证：

登录与权限 -> 系统管理（组织、用户、角色权限、审计日志、字典）-> 客户 -> 联系人 -> 商机 -> 销售行动 -> 周进展 -> 方案/标书 -> 合同 -> 开票 -> 回款计划 -> 到账流水 -> 核销 -> 驾驶舱 -> AI 助手（文本录入、周报、商机分析、拜访计划、沟通建议、AI 日志）。

本轮重点回归用户刚发现的问题：

- 右侧内容和菜单栏一起滑动。
- 二级组织保存失败。
- 新建用户保存失败。
- 新用户权限与登录是否真实生效。
- V4 AI 助手是否可在本地真实环境使用。

## 3. P0/P1 Test Case Matrix

| ID | Module | Scenario | Expected Result | Priority | Result |
|---|---|---|---|---|---|
| IAM-001 | 组织管理 | 创建二级组织并刷新组织列表 | parent_id 正确保存，列表展示上下级关系 | P0 | Passed by backend regression |
| IAM-002 | 用户管理 | 创建用户并归属二级组织 | 用户保存成功，部门字段正确 | P0 | Passed by backend regression |
| IAM-003 | 权限登录 | 新用户登录并读取权限 | 登录成功，permissions 与角色一致 | P0 | Passed by backend regression |
| IAM-004 | 越权访问 | 低权限用户访问系统管理接口 | 接口返回 403 | P0 | Passed by backend regression |
| UI-001 | 布局 | 左侧菜单固定，右侧内容独立滚动 | 菜单不随内容区滚动 | P0 | Passed by frontend regression |
| CRM-001 | 基础 CRM | 客户、联系人、商机、行动、周进展列表 | API 200，无服务端异常 | P0 | Passed by API performance smoke |
| FIN-001 | 财务闭环 | 合同、开票、回款、到账、核销 | V2 browser smoke 可通过 | P0 | Passed by Functional Test Agent |
| DASH-001 | 驾驶舱 | 总览、漏斗、合同、开票、回款、风险 | API 200，浏览器无 console/response failure | P0 | Passed |
| AI-001 | AI 草稿 | 文本解析生成草稿并拒绝 | 生成和拒绝均成功，日志可追溯 | P0 | Passed after 8080 backend refresh |
| AI-002 | AI 周报 | 按周生成周报并拒绝 | 生成和拒绝均成功，日志可追溯 | P0 | Passed after 8080 backend refresh |
| AI-003 | AI 商机分析 | 基于商机生成分析并拒绝 | 生成和拒绝均成功，日志可追溯 | P0 | Passed after 8080 backend refresh |
| AI-004 | AI 拜访计划 | 基于商机生成拜访计划并拒绝 | 生成和拒绝均成功，日志可追溯 | P0 | Passed after 8080 backend refresh |
| AI-005 | AI 沟通建议 | 基于联系人与商机生成沟通建议并拒绝 | 生成和拒绝均成功，日志可追溯 | P0 | Passed after 8080 backend refresh |
| SEC-001 | 认证鉴权 | 未登录、错误 token、错误密码、恶意 CORS | 401/403，错误信息不泄露敏感细节 | P0 | Passed |
| PERF-001 | 轻量并发 | 20 个核心端点，每端点 10 请求，并发 4 | 0 failure，P95 在本地 UAT 可接受范围内 | P1 | Passed |

## 4. Functional Test Results

### Automated Regression

| Command | Result |
|---|---|
| `npm test -- src/App.test.tsx --run` | Passed: 1 file, 59 tests |
| `npm run build` | Passed |
| `mvn -Dtest=IdentityAdminControllerTest,V1WorkflowIntegrationTest,V1DemoDataSeederTest test` | Passed: 11 tests |
| `mvn -Dtest=AuthControllerTest,IdentityAdminControllerTest,PasswordManagementControllerTest,AttachmentControllerTest,AuditLogControllerTest test` | Passed: 22 tests |
| `CRM_API_SMOKE_URL=http://127.0.0.1:8080 npm run smoke:v4:api` | Passed |
| `CRM_SMOKE_URL=http://127.0.0.1:5174 npm run smoke:v4:browser` | Passed: 24 route checks, 0 console failures, 0 failed responses |

### Evidence

| Evidence | Path |
|---|---|
| V4 API smoke report on actual 8080 backend | `docs/testing/evidence/artifacts/v4-api-smoke-20260709-qa-8080/report.json` |
| V4 API smoke report on temporary 8085 current-source backend | `docs/testing/evidence/artifacts/v4-api-smoke-20260709-qa/report.json` |
| V4 browser smoke report and screenshots | `docs/testing/evidence/artifacts/v4-browser-smoke-20260709-113312/report.json` |

### Defect Found and Closed

| Defect | Root Cause | Action | Status |
|---|---|---|---|
| V4 AI API and browser smoke returned 500 on `/api/ai-drafts/parse` and AI pages | Local 8080 backend container was built before V28-V34 AI migrations. Logs showed old startup had only 27 migrations. | Started current source backend on 8085 to verify V34, migrated DB, rebuilt current backend jar, copied jar into 8080 container, restarted backend. | Closed locally |

After refresh, 8080 backend logs show `Successfully validated 34 migrations` and schema version `34`.

## 5. Performance Test Results

Environment: actual local backend `http://127.0.0.1:8080`; 10 requests per endpoint; concurrency 4.

| Endpoint Group | Failures | Typical Avg | Max Observed |
|---|---:|---:|---:|
| Health/bootstrap | 0 | 3.21-17.83 ms | 38.45 ms |
| CRM lists: accounts/contacts/opportunities/activities/weekly progress | 0 | 3.32-7.73 ms | 11.24 ms |
| Dashboard: overview/funnel/contracts/invoices/receivables/risks | 0 | 6.48-16.57 ms | 22.65 ms |
| AI context and AI list/log endpoints | 0 | 3.07-8.26 ms | 10.10 ms |

Conclusion: local UAT lightweight performance passed. This is not a production load test; before public production use, run a larger Postgres-backed benchmark with realistic data volume and concurrent users.

## 6. Security Test Results

| Check | Result | Risk |
|---|---|---|
| Unauthenticated `/api/accounts` | 401 `UNAUTHORIZED` | Low |
| Invalid token `/api/accounts` | 401 `UNAUTHORIZED` | Low |
| Wrong password login | 401, no account existence leakage | Low |
| Malicious CORS preflight | 403 `Invalid CORS request` | Low |
| Security regression suite | 22 tests passed | Low |
| Frontend security headers | Missing CSP, X-Frame-Options, nosniff | Medium |
| Demo seed account | Fixed demo admin exists in test environment | Medium/High if exposed publicly |
| Password policy | Basic validation exists; lockout/rate-limit/complexity needs hardening | Medium |
| Attachment safety | Path/object authorization covered; size/MIME/AV/download audit need hardening | Medium |

## 7. Remaining Items

| Item | Type | Recommendation |
|---|---|---|
| V1 browser smoke expects old demo text | Test maintenance | Update smoke assertion to current V4 page/data contract. |
| Reconciliation concurrent over-allocation showed one flaky failure in a large combination run, class-level rerun passed | Test stability | Keep as watch item; add repeated concurrency test if it recurs. |
| Public deployment not upgraded in this run | Deployment | Upgrade server only after user confirms local V4 QA evidence is acceptable. |
| Security headers and demo seed policy | Hardening | Add nginx security headers, disable demo seed on public environments, use one-time initial password. |
| Password/attachment security | Hardening | Add rate limiting/lockout/password rules and attachment size/type/scan policies. |

## 8. Go/No-Go

Local V4 validation result: **GO for local UAT continuation**.

Condition before public upgrade: apply the refreshed backend build to the server and rerun at least health check, V4 API smoke, V4 browser smoke, and security header checks on the public URL.
