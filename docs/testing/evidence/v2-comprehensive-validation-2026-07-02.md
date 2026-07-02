# CRM V2 全面验证与整改证据包

日期：2026-07-02

分支：`codex/v2-receivable-management`

验证范围：当前 V2 销售到财务闭环版本，覆盖 V1 主业务入口、V2 方案/合同/开票/回款/核销、系统治理、权限审计和证据链完整性。

## 1. 验收团队

本轮从 `/Users/shensiwei/AIJob/agents` 组建以下验收角色：

| Agent | 来源 | 职责 | 结论摘要 |
|---|---|---|---|
| API 测试员 | `testing/testing-api-tester.md` | 后端 API、OpenAPI、权限、审计、数据权限 | 内部 UAT/演示 Conditional Go；生产发布 No-Go，需补并发、安全、错误码和端到端 API |
| 前端与可访问性验收 | `engineering/engineering-frontend-developer.md`、`testing/testing-accessibility-auditor.md` | 前端测试、构建、路由、页面、可访问性风险 | V2 functional acceptance 可 GO；完整 WCAG/移动端认证未完成 |
| 证据收集者 | `testing/testing-evidence-collector.md` | 截图、测试输出、证据链、可追溯性 | 当前证据可支撑研发自测/UAT 留痕，但不足以支撑审计级生产 GO |
| 现实检验者 | `testing/testing-reality-checker.md` | 发布就绪反向审计 | 现实评级 B-；内部演示与本地 UAT 候选可接受，生产/外部正式发布 No-Go |

## 2. 本轮验证 TODO

| 顺序 | 状态 | 事项 | 证据 |
|---:|---|---|---|
| 1 | Done | 环境检查：分支、提交、服务端口、工作区 | 分支 `codex/v2-receivable-management`；前端 5175；后端 8081；工作区初始干净 |
| 2 | Done | 后端/API 全量回归 | `mvn -Dtest=DatabaseMigrationTest,AccountControllerTest,ContactControllerTest,OpportunityControllerTest,ActivityControllerTest,ReminderControllerTest,SolutionDocumentControllerTest,ContractControllerTest,InvoiceControllerTest,ReceivablePlanControllerTest,PaymentControllerTest,ReconciliationControllerTest,AttachmentControllerTest,OpenApiContractCoverageTest,DictionaryControllerTest,DataPermissionServiceTest,V1DemoDataSeederTest,IdentityAdminControllerTest,AuditLogControllerTest test`；72 tests，0 failures，0 errors |
| 3 | Done | 前端测试与构建 | `npm test -- --run`；2 files / 40 tests passed；`npm run build` 通过，存在 `antd-vendor` chunk 797.50 kB 警告 |
| 4 | Done | API smoke | 登录成功；20 个核心接口全部 200/OK；旧红灯 `/api/contracts?account_id=1&opportunity_id=10` 为 200/OK |
| 5 | Done | V2 越权详情错误码整改 | RED：5 个测试失败，均为 expected 403 but was 500；GREEN：16 tests，0 failures；完整后端回归 72 tests，0 failures |
| 6 | Done | 后端重启到最新修复 | 8081 旧进程已停止，新进程启动，Flyway v20 up to date |
| 7 | Pending | 浏览器级 V2 专用 E2E 证据 | 当前插件全量页面巡检两次超时，未归档半成品；需后续建设稳定 Playwright/V2 smoke |

## 3. 已修复问题

### V2 越权详情返回 500

问题：

- 合同、方案标书、开票、回款计划、到账流水的“列表隐藏不可读数据”已生效，但详情接口对不可读数据返回 `500 INTERNAL_SERVER_ERROR`。
- API 语义不正确，客户端也无法区分服务端故障与权限拒绝。

根因：

- V2 Service 的 `readableDetail` 在下游业务对象不可读时抛 `IllegalArgumentException`。
- 全局异常处理未对该异常做业务映射，落入通用 `Exception` handler，返回 `500`。

整改：

- 将 V2 不可读详情转换为 `ForbiddenException`，由 `ApiExceptionHandler` 返回 `403/FORBIDDEN`。
- 列表查询仍同时捕获 `IllegalArgumentException | ForbiddenException`，继续隐藏不可读记录。

覆盖对象：

- `ContractService`
- `SolutionDocumentService`
- `InvoiceService`
- `ReceivablePlanService`
- `PaymentService`

TDD 证据：

- RED：`mvn -Dtest=ContractControllerTest,SolutionDocumentControllerTest,InvoiceControllerTest,ReceivablePlanControllerTest,PaymentControllerTest test`
  - 16 tests run
  - 5 failures
  - 失败均为 `expected: 403 FORBIDDEN but was: 500 INTERNAL_SERVER_ERROR`
- GREEN：同一命令
  - 16 tests run
  - 0 failures
  - 0 errors
- 完整后端回归：
  - 72 tests run
  - 0 failures
  - 0 errors

## 4. API Smoke 结果

执行环境：

- Frontend：`http://127.0.0.1:5175`
- Backend：`http://127.0.0.1:8081`
- 账号：`demo_admin`

结果摘要：

| 指标 | 结果 |
|---|---:|
| 登录 | 200 / OK |
| 核心接口总数 | 20 |
| 失败接口 | 0 |
| 慢接口（> 1000ms） | 0 |

覆盖接口：

- `/api/bootstrap`
- `/api/accounts`
- `/api/contacts`
- `/api/opportunities`
- `/api/activities`
- `/api/weekly-progress/opportunities`
- `/api/solutions`
- `/api/contracts`
- `/api/contracts?account_id=1&opportunity_id=10`
- `/api/invoices`
- `/api/receivable-plans`
- `/api/payments`
- `/api/reconciliations/workbench`
- `/api/reconciliations`
- `/api/system/dicts`
- `/api/system/departments`
- `/api/system/users`
- `/api/system/roles`
- `/api/system/permissions`
- `/api/system/audit-logs`

旧证据冲突复核：

- 历史截图 `v2-scoped-contract-filter-uat-20260702.png` 曾显示“服务端异常”。
- 本轮 API smoke 复核 `/api/contracts?account_id=1&opportunity_id=10`：`200/OK`，`message=success`。
- 浏览器插件全量巡检未能稳定归档，后续需要 V2 专用 Playwright smoke 作为审计级证据。

## 5. 准出结论

当前结论：

- V2 内部 UAT / 功能验收：GO。
- V2 生产发布 / 外部正式发布：Conditional No-Go，需补证后复审。

原因：

- 主功能、核心 API、前端测试和构建已通过。
- 一个高风险 API 错误码问题已按 TDD 修复并回归通过。
- 但证据链仍缺少稳定的 V2 专用浏览器 E2E、移动端/平板截图、角色权限矩阵、真实文件上传下载、并发/性能/安全类验证。

## 6. 后续整改清单

| 优先级 | 事项 | 说明 |
|---|---|---|
| P1 | 建设 V2 专用 Playwright E2E | 登录后跑商机/方案/合同/开票/回款/核销/撤销，输出 test-results 和截图 |
| P1 | 角色权限矩阵验收 | 销售、商务/法务、财务、管理层、低权限用户分别验证菜单、按钮、API 403、数据范围 |
| P1 | 附件能力边界收口 | 当前为附件 URL 元数据管理；若验收口径包含上传下载，需实现 multipart upload/download |
| P2 | 移动端/平板响应式证据 | 补 375px、768px、1440px 关键页面截图 |
| P2 | OpenAPI 深度契约 | 校验 request/response schema、错误码、权限扩展字段，更新 V1 标题命名 |
| P2 | 并发与幂等验证 | 核销、开票额度、回款分配需并发竞争测试 |
| P2 | 前端质量门 | 增加 lint、axe/pa11y 或等价无障碍自动化 |
| P3 | 证据规范 | 建立 V2 evidence manifest，绑定 commit、命令、exit code、环境、截图、账号和执行人 |
