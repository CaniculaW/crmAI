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
| 7 | Done | 浏览器级 V2 专用 smoke 证据 | `npm run smoke:v2:browser` 通过；18 条路由 × desktop/tablet/mobile 三种视口，共 54 个页面检查；console failure = 0；API failed response = 0；证据目录 `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/` |
| 8 | Done | V2 角色权限矩阵验收 | RED：全量回归暴露核销列表在存在不可读记录时返回 403；GREEN：`mvn -Dtest=V2RoleMatrixValidationTest test` 通过；完整后端 `mvn test` 86 tests，0 failures，0 errors |
| 9 | Done | 移动端/平板响应式证据 | V2 browser smoke 已补 `tablet 768×1024`；同目录新增 18 张 tablet 截图；三档视口共 54 个页面检查 |
| 10 | Done | 附件真实上传/下载验收 | RED：`AttachmentControllerTest#uploadsAndDownloadsAttachmentFile` 期望 200 但上传返回 500；GREEN：`mvn -Dtest=AttachmentControllerTest test` 9 tests，0 failures；`mvn -Dtest=AttachmentControllerTest,OpenApiContractCoverageTest test` 10 tests，0 failures；完整后端 `mvn test` 87 tests，0 failures；前端 `npm test -- --run` 45 tests，0 failures；`npm run build` 通过；本地 8081 真实 smoke 登录/上传/下载/删除均 200 |
| 11 | Done | 性能/安全/并发复审 | 附件安全测试覆盖路径穿越文件名清洗与匿名下载 401；前端危险 DOM sink 扫描 0 命中；并发核销 RED `[200,500]`，GREEN `[200,409]`；本地 8081 性能 smoke 10 个核心 GET 全 200，max 57ms，avg 31ms；完整后端 `mvn test` 89 tests，0 failures |

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
- 浏览器插件全量巡检曾未能稳定归档，现已补充项目内 V2 专用 browser smoke 作为可复跑证据。

## 5. V2 浏览器 Smoke 结果

执行环境：

- Frontend：`http://127.0.0.1:5175`
- Backend：`http://127.0.0.1:8081`
- 账号：`demo_admin`
- 命令：`CRM_SMOKE_URL=http://127.0.0.1:5175 CRM_SMOKE_EVIDENCE_DIR=docs/testing/evidence/artifacts/v2-browser-smoke-20260702 npm run smoke:v2:browser`

结果摘要：

| 指标 | 结果 |
|---|---:|
| 页面检查 | 54 |
| 路由 | 18 |
| 视口 | desktop 1440×1000；tablet 768×1024；mobile 390×844 |
| Console failure | 0 |
| API failed response | 0 |
| 证据文件 | 54 张截图 + `report.json` |

覆盖路由：

- `/`
- `/accounts`
- `/contacts`
- `/opportunities`
- `/activities`
- `/weekly-progress`
- `/solutions`
- `/contracts`
- `/contracts?account_id=1&opportunity_id=10`
- `/invoices`
- `/receivables`
- `/reconciliations`
- `/system`
- `/system/departments`
- `/system/users`
- `/system/roles`
- `/system/audit-logs`
- `/system/dictionaries`

证据目录：

- `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/report.json`
- `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/desktop-dashboard.png`
- `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/desktop-reconciliations.png`
- `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/tablet-dashboard.png`
- `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/tablet-reconciliations.png`
- `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/mobile-dashboard.png`
- `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/mobile-reconciliations.png`
- 其余页面截图同目录按 `{viewport}-{route}.png` 命名。

## 6. 准出结论

当前结论：

- V2 内部 UAT / 功能验收：GO。
- V2 生产发布 / 外部正式发布：Conditional No-Go，需补证后复审。

原因：

- 主功能、核心 API、前端测试和构建已通过。
- 一个高风险 API 错误码问题已按 TDD 修复并回归通过。
- 稳定的 V2 专用浏览器 smoke 已补齐。
- V2 角色权限矩阵自动化验收已补齐。
- 移动端/平板响应式截图证据已补齐。
- 真实文件上传下载能力与证据已补齐。
- 并发/性能/安全类轻量复审证据已补齐。

## 7. V2 角色权限矩阵结果

命令：

- `mvn -Dtest=V2RoleMatrixValidationTest test`
- `mvn test`

结果：

- 定向 Tests run：1
- 后端全量 Tests run：86
- Failures：0
- Errors：0
- Skipped：0

本轮整改：

- `ReconciliationService.readableList` 在列表读取时同步隐藏 `ForbiddenException`，避免用户有 `reconciliation.read` 但列表中存在不可读关联合同记录时，整页返回 403。

覆盖角色：

| 角色 | 权限口径 | 验证点 |
|---|---|---|
| 销售 | 方案维护、合同/开票/回款/到账/核销读取、回款跟进 | V2 读 API 可访问；不能创建核销 |
| 商务/法务 | 方案维护、合同创建/编辑/终止/节点、开票申请、回款读取 | 合同/开票读 API 可访问；不能登记到账或创建核销 |
| 财务 | 开票、回款、到账、核销全流程操作 | 开票/到账/核销读 API 可访问；核销创建权限放行到业务校验 |
| 管理层 | V2 全链路读取、审计日志读取 | V2 读 API 和审计日志可访问；不能创建核销 |
| 低权限用户 | 仅 V1 客户读取 | V2 关键读 API 全部返回 403 |

## 8. 附件真实上传/下载结果

命令：

- `mvn -Dtest=AttachmentControllerTest#uploadsAndDownloadsAttachmentFile test`
- `mvn -Dtest=AttachmentControllerTest test`
- `mvn -Dtest=AttachmentControllerTest,OpenApiContractCoverageTest test`
- `mvn test`
- `npm test -- --run`
- `npm run build`
- 本地 8081 真实 API smoke：`demo_admin` 登录后上传 `v2-local-attachment-smoke.txt` 到 `account:1`，再下载校验内容并删除

结果：

- 定向上传/下载用例：1 test，0 failures，0 errors
- 附件控制器：9 tests，0 failures，0 errors
- 附件 + OpenAPI：10 tests，0 failures，0 errors
- 后端全量：87 tests，0 failures，0 errors
- 前端全量：3 files / 45 tests passed
- 前端构建：通过，保留既有 `antd-vendor` chunk 体积提示
- 本地 8081 smoke：login 200，upload 200，download 200，delete 200，`file_url=/api/attachments/5/download`

本轮整改：

- 保留原 `POST /api/attachments` URL 元数据模式，兼容历史附件记录。
- 新增 `POST /api/attachments/upload`，支持 multipart 文件上传，按对象权限校验可读性后落本地存储目录。
- 新增 `GET /api/attachments/{attachmentId}/download`，通过 `attachment.read` 鉴权后返回二进制文件流。
- 统一响应包装跳过 `Resource` 文件流，避免下载被包装成 JSON。
- 前端方案、合同、开票、回款附件区由“填写附件地址”调整为“选择文件 + 附件类型 + 备注”，下载按钮改为带 Bearer token 的 blob 下载。
- OpenAPI 已补充上传/下载两个运行时 API。

## 9. 性能/安全/并发复审结果

命令：

- `mvn -Dtest=AttachmentControllerTest#sanitizesUploadedFilenameAndRequiresReadPermissionForDownload,ReconciliationControllerTest#preventsConcurrentReconciliationOverAllocation test`
- `mvn -Dtest=AttachmentControllerTest,ReconciliationControllerTest test`
- `rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\\.write|eval\\(|new Function|setTimeout\\(\\s*['\\\"]|setInterval\\(\\s*['\\\"]|target=\\\"_blank\\\"|window\\.location" frontend/src frontend/index.html`
- 本地 8081 性能 smoke：登录后访问 10 个核心 GET API
- `mvn test`

结果：

- 新增安全/并发定向用例：2 tests，0 failures，0 errors
- 附件 + 核销控制器：15 tests，0 failures，0 errors
- 前端危险 DOM sink 扫描：0 命中
- 本地 8081 性能 smoke：10/10 API 200，max 57ms，avg 31ms，login 896ms
- 后端全量：89 tests，0 failures，0 errors

本轮整改：

- 附件上传对 `../secret.txt` 类文件名进行 basename 清洗，匿名下载返回 401。
- 核销并发从 RED `[200,500]` 修复为 GREEN `[200,409]`：第二个竞争请求返回业务冲突，不再暴露服务端异常。
- 核销金额更新改为原子条件更新，发票与回款剩余额不足时返回业务冲突，避免并发超额核销。

生产发布复审结论：

- V2 本地 UAT/研发复审证据门禁已通过，可进入用户最终人工确认。
- 后续如进入真实生产，还建议补对象存储、病毒扫描、限流、审计级 evidence manifest、正式压测和安全扫描。

## 10. 后续整改清单

| 优先级 | 事项 | 说明 |
|---|---|---|
| P1 | 深化 V2 专用 E2E | 当前 browser smoke 已覆盖页面可用性；后续可增加新建、状态流转、核销撤销等写操作链路 |
| P1 | 附件能力边界收口 | 已支持 URL 元数据与本地 multipart 上传/下载；后续生产化可接对象存储、病毒扫描、大小/类型策略和签名 URL |
| P2 | OpenAPI 深度契约 | 校验 request/response schema、错误码、权限扩展字段，更新 V1 标题命名 |
| P2 | 并发与幂等验证 | 核销并发已补基础竞争测试；后续可扩展开票额度、回款分配、撤销幂等等更多竞争测试 |
| P2 | 前端质量门 | 增加 lint、axe/pa11y 或等价无障碍自动化 |
| P3 | 证据规范 | 建立 V2 evidence manifest，绑定 commit、命令、exit code、环境、截图、账号和执行人 |
