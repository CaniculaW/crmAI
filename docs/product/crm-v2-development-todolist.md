# CRM V2 销售到财务闭环研发 TODOList

日期：2026-06-28

目标：在 V1 销售基础闭环已验证通过的基础上，启动 V2「销售到财务闭环」研发。V2 重点打通商机成交后的方案/标书、合同、开票、回款与发票核销，让项目型大客户 CRM 从销售过程管理进入商务与财务执行管理。

## 0. V2 范围边界

V2 做：

- 方案与标书。
- 合同管理。
- 开票管理。
- 回款管理。
- 发票与回款多对多核销。
- V2 相关字典、权限、审计、测试数据和验收证据。
- V1 与 V2 的业务入口联动：商机成交后进入合同，客户/商机详情可看到方案、合同、开票、回款摘要。

V2 不做：

- 不做 V3 完整经营驾驶舱。
- 不做 V4 AI 销售助手。
- 不做 ERP、税控、电子签章、银行流水自动集成。
- 不做移动端原生 App。
- 不重构 V1 已验证通过的主链路，除非 V2 入口联动必须调整。

## 1. V2 推进规则

每个模块固定执行以下 10 步，切换模块时必须展示当前进度：

| 步骤 | 名称 | 说明 | 完成标准 |
|---:|---|---|---|
| 1 | 模块启动 | 明确模块目标、页面范围、业务链路、不做什么 | 输出模块 TODO、完成标准和预计验证方式 |
| 2 | 业务/UI 对齐 | 基于当前系统和成熟 CRM/ERP 后台习惯，给出页面逻辑与信息架构 | 用户确认推荐方案，必要时先看低保真页面逻辑 |
| 3 | 数据模型设计 | 设计表、字段、状态、金额口径、约束和审计点 | 形成可迁移的数据模型和规则说明 |
| 4 | API 契约设计 | 设计列表、详情、新建、编辑、状态流转和专项动作 API | OpenAPI/接口清单可覆盖页面操作 |
| 5 | 后端实现 | Migration、Repository/Service、Controller、权限、审计 | 后端定向测试通过 |
| 6 | 前端实现 | 菜单、列表、详情、表单、状态动作、空状态和错误提示 | 前端定向测试通过 |
| 7 | 联动回写 | 与客户、商机、行动、系统权限联动 | 业务对象间可相互跳转和汇总 |
| 8 | 自动化验证 | 前端测试、构建、后端测试、必要集成测试 | 命令通过或阻塞记录清楚 |
| 9 | 浏览器验收 | 本地 UAT 跑核心链路并留截图 | 无服务端异常，无控制台应用错误 |
| 10 | 提交切换 | commit/push，记录提交号、证据、遗留问题 | 当前模块 Done，下一个模块 Current |

每次推进展示模板：

```text
V2 当前进度：
- 总模块：
- 已完成：
- 当前模块：
- 当前步骤：
- 当前 TODO：
- 完成标准：
- 本轮预计产出：

上一模块：
- 状态：
- 验证结果：
- 提交号：
- 遗留问题：
```

## 2. V2 模块级 TODOList

| 顺序 | 状态 | 模块 | 页面/API范围 | 本轮目标 | 完成标准 |
|---:|---|---|---|---|---|
| 1 | Done | V2 启动与 UI/范围对齐 | V2 总导航、模块边界、页面逻辑、验收口径 | 确认 V2 从商机成交到核销的业务链路、页面层级和 TODO 机制 | V2 设计说明、模块级 TODOList、模块 2 Current、无范围歧义 |
| 2 | Done | 方案与标书链路 | 方案/标书列表、详情、新建/编辑、版本、报价/测算、自评、附件增删下载 | 让商业方案和商业谈判阶段有材料、报价、评审、风险和附件归档入口 | 已完成实现、验证与提交 |
| 3 | Done | 合同管理链路 | 合同列表、详情、新建/编辑、状态流转、变更、节点、附件占位 | 把成交商机转成合同资产，并形成开票/回款计划来源 | 已完成实现、验证与提交 |
| 4 | Done | 开票管理链路 | 开票计划、开票申请、发票登记、异常、签收、作废 | 管理合同下应该开多少、何时开、实际开了多少、异常是什么 | 已完成实现、验证与浏览器 UAT |
| 5 | Done | 回款管理链路 | 回款计划、回款流水、到账确认、逾期、回款跟进 | 管理合同应收、实收、逾期和回款责任 | 已完成实现、验证与浏览器 UAT |
| 6 | Done | 发票回款核销链路 | 核销工作台、待核销发票、待分配回款、核销明细、撤销核销 | 支持一笔回款核销多张发票、一张发票被多笔回款分次核销 | 已完成实现、验证与浏览器 UAT |
| 7 | Done | 客户/商机 V2 入口联动 | 客户详情、商机详情、工作台快捷入口、菜单权限 | 把 V2 能力嵌回 V1 主业务对象，而不是孤立模块 | 已完成实现、验证与浏览器 UAT |
| 8 | Done | V2 系统配置与权限审计 | 字典、权限点、角色授权、审计日志、数据权限补齐 | 保证销售、商务、财务、管理层看到不同入口和动作 | 已完成实现、验证与浏览器 UAT |
| 9 | Done | V2 全链路回归与 UAT | 商机成交 -> 方案/标书 -> 合同 -> 开票 -> 回款 -> 核销 | 验证 V2 销售到财务闭环可跑通 | 已完成前后端回归、构建、浏览器 Smoke 与 UAT 证据归档 |

## 3. 当前任务

当前任务：`v2-production-evidence-gate`

状态：In Progress

责任侧：AI 研发主力推进；沈思维作为最终版本确认人，重点确认页面逻辑、模块范围和验收口径。

当前模块：V2 生产发布复审证据门禁

最终确认：

- 确认人：沈思维。
- 确认日期：2026-07-02。
- 确认结论：V2 版本确认通过，签署 GO。
- 后验收补充：2026-07-02 组建测试与验收团队复核后，V2 内部 UAT / 功能验收 GO；生产发布 / 外部正式发布需补齐 V2 专用 E2E、角色矩阵、移动端、附件真实上传下载、性能/安全证据后复审。证据包：`docs/testing/evidence/v2-comprehensive-validation-2026-07-02.md`。

当前步骤：

- [x] Step 1：完成模块 3 合同管理后端、前端、OpenAPI、自动化验证与浏览器 UAT。
- [x] Step 2：合同管理链路切换为 Done。
- [x] Step 3：启动模块 4 开票管理，输出模块 TODO、页面逻辑、业务边界和验收标准。
- [x] Step 4：确认采用方案 B：开票计划 + 开票申请 + 发票登记一体化。
- [x] Step 5：完成开票管理设计说明，明确数据模型、API 契约、权限、附件、金额校验和验收标准。
- [x] Step 6：创建模块 4 TDD 实施计划。
- [x] Step 7：按实施计划进入后端数据模型与 API 实现。
- [x] Step 8：按实施计划进入前端开票页面、OpenAPI 和附件扩展。
- [x] Step 9：自动化验证、浏览器 UAT、提交并切换到模块 5。
- [x] Step 10：启动模块 5 回款管理，输出页面逻辑、数据模型、API 和实施计划。
- [x] Step 11：完成模块 5 后端数据模型、回款计划 API、到账流水 API 和附件对象扩展。
- [x] Step 12：完成模块 5 前端回款页面、到账状态动作、跟进和附件增删下载入口。
- [x] Step 13：完成模块 5 OpenAPI 与接口清单。
- [x] Step 14：完成模块 5 自动化验证、浏览器 UAT 和提交准备。
- [x] Step 15：启动模块 6 发票回款核销链路，输出页面逻辑、数据模型、API 和实施计划。
- [x] Step 16：完成后端数据模型、核销工作台 API、金额联动和前端核销工作台。
- [x] Step 17：补齐 OpenAPI/API 清单、浏览器 UAT 证据和提交记录。
- [x] Step 18：启动模块 7 客户/商机 V2 入口联动设计与实施计划。
- [x] Step 19：按模块 7 实施计划进入前端 TDD，实现客户/商机抽屉 V2 摘要、上下文跳转和 URL 初始筛选。
- [x] Step 20：完成模块 7 浏览器 UAT、证据截图、提交记录并切换到模块 8。
- [x] Step 21：启动模块 8 V2 系统配置与权限审计，输出字典、权限点、角色授权、审计日志和数据权限补齐计划。
- [x] Step 22：按模块 8 实施计划进入 TDD：V2 字典覆盖、字典审计、角色权限分组、审计筛选和数据权限回归。
- [x] Step 23：启动模块 9 V2 全链路回归与 UAT，按业务链路执行端到端验证与证据归档。
- [x] Step 24：完成模块 9 后端 V2 全链路回归测试。
- [x] Step 25：完成模块 9 前端测试与构建。
- [x] Step 26：完成模块 9 浏览器 UAT 和证据截图。
- [x] Step 27：沈思维最终确认 V2 版本，签署 GO。
- [x] Step 28：组建测试与验收 Agent 团队完成全面复核，修复 V2 越权详情 `500` 错误码问题。
- [x] Step 29：建设 V2 专用浏览器 E2E、角色矩阵、移动端、附件真实上传下载、性能/安全/并发证据，作为生产发布复审门禁。
  - [x] Step 29.1：建设 V2 专用浏览器 smoke，覆盖桌面/移动 18 条路由，产出截图和 JSON 报告。
  - [x] Step 29.2：补齐角色权限矩阵验收，覆盖销售、商务/法务、财务、管理层、低权限用户。
  - [x] Step 29.3：补齐移动端/平板响应式证据，重点复核遮挡、换行、表格可读性和关键操作入口。
  - [x] Step 29.4：补齐真实附件上传/下载能力，明确 URL 元数据管理与本地文件存储边界。
  - [x] Step 29.5：补齐性能/安全/并发复审证据，形成生产发布复审结论。

当前模块不做：

- 不做复杂审批流设计器。
- 不做企业级单点登录、LDAP、OAuth 集成。
- 不做跨租户权限模型重构。
- 不做审计日志归档、冷热分层和外部 SIEM 对接。
- 不做字段级权限和行级规则可视化配置器。

完成标准：

- V2 研发 TODOList 已创建并提交。
- V2 总导航与模块边界清晰。
- 模块 2 设计说明已创建，明确附件新增、删除、下载模式。
- 合同管理页面逻辑、字段口径、状态流转和附件占位明确。
- 合同管理链路已完成实现、自动化验证和浏览器 UAT。
- 模块 4 开票管理设计说明已完成。
- 模块 5 回款管理链路已完成实现、自动化验证和浏览器 UAT。
- 模块 6 已完成 V19 数据模型、核销 API、金额联动、前端核销工作台、OpenAPI/API 清单和浏览器 UAT。
- 模块 7 已完成前端 TDD 实现、浏览器 UAT、证据截图和提交记录。
- 模块 8 已完成后端治理、前端系统治理 UI、自动化验证和浏览器 UAT。
- 模块 9 已完成后端全链路回归、前端测试与构建、浏览器 UAT 和证据截图；V2 进入最终版本确认。
- 后验收已修复 V2 详情越权返回 `500` 的 API 语义问题；V2 内部 UAT / 功能验收 GO，生产发布需补证复审。
- V2 专用浏览器 smoke 已建设并通过：`npm run smoke:v2:browser` 覆盖 18 条路由 × desktop/tablet/mobile 三种视口，console failure = 0，API failed response = 0，证据目录 `docs/testing/evidence/artifacts/v2-browser-smoke-20260702/`。
- V2 角色权限矩阵已补自动化验收：`mvn -Dtest=V2RoleMatrixValidationTest test` 覆盖销售、商务/法务、财务、管理层、低权限用户，验证权限集、V2 读 API、跨职责写操作 403 和财务核销写权限放行到业务校验。
- V2 附件真实上传/下载已补齐：后端新增 `POST /api/attachments/upload` multipart 上传和 `GET /api/attachments/{attachmentId}/download` 鉴权下载；前端方案、合同、开票、回款附件表单改为真实文件选择；验证命令 `mvn -Dtest=AttachmentControllerTest,OpenApiContractCoverageTest test`、`mvn test`、`npm test -- --run`、`npm run build` 均通过。
- V2 性能/安全/并发复审证据已补齐：附件新增文件名清洗与匿名下载 401 测试；核销并发从 RED `[200,500]` 修复为 `[200,409]` 业务冲突；本地 8081 核心 GET API 性能 smoke 10/10 通过，max 57ms，avg 31ms；后端全量 `mvn test` 89 tests，0 failures。

## 4. 模块完成记录

| 模块 | 状态 | 完成日期 | 提交号 | 验证命令 | 浏览器验收 | 遗留问题 |
|---|---|---|---|---|---|---|
| V2 启动与 UI/范围对齐 | Done | 2026-06-28 | 0d48a79 | 文档评审 | 不适用 | 无 |
| 方案与标书链路 | Done | 2026-06-29 | eaf7515 | `mvn test`；`mvn -Dtest=OpenApiContractCoverageTest test`；`npm test`；`npm run build` | 127.0.0.1:5175 `/solutions` 已通过页面、详情、附件下载/删除入口验证 | 风险回写商机未做，保留到 V2 入口联动模块 |
| 合同管理链路 | Done | 2026-06-29 | 本次提交 | `mvn test`；`mvn -Dtest=OpenApiContractCoverageTest test`；`npm test`；`npm run build` | 127.0.0.1:5175 `/contracts` 已通过列表、详情、变更记录、节点、附件下载/删除入口验证；浏览器控制台无 error | 开票/回款/核销入口占位保留到后续模块 |
| 开票管理链路 | Done | 2026-06-30 | 本次提交 | `mvn -Dtest=DatabaseMigrationTest,InvoiceControllerTest,AttachmentControllerTest,OpenApiContractCoverageTest test`；`mvn -Dtest=PostgresMigrationIT test`；`npm test -- --run`；`npm run build` | 127.0.0.1:5175 `/invoices` 已通过登录、列表、详情、合同额度、附件、状态动作入口验证；浏览器控制台无 error | 回款/核销联动保留到模块 5/6 |
| 回款管理链路 | Done | 2026-06-30 | 本次提交 | `mvn -Dtest=DatabaseMigrationTest,ReceivablePlanControllerTest,PaymentControllerTest,AttachmentControllerTest,OpenApiContractCoverageTest test`；`mvn -Dtest=PostgresMigrationIT test`；`npm test -- --run`；`npm run build` | 127.0.0.1:5175 `/receivables` 已通过登录、列表、详情、到账流水、状态动作、跟进、附件下载/删除入口验证；浏览器控制台无 error | 发票与回款多对多核销保留到模块 6 |
| 发票回款核销链路 | Done | 2026-06-30 | 1216f5a | `mvn -Dtest=DatabaseMigrationTest,ReconciliationControllerTest test`；`mvn -Dtest=OpenApiContractCoverageTest test`；`npm test`；`npm run build` | 127.0.0.1:5175 `/reconciliations` 已通过登录态、待核销发票、待分配回款、新增核销、最近核销记录验证；浏览器控制台无 error；证据截图：`docs/testing/evidence/artifacts/v2-reconciliation-workbench-visible-uat-20260630.png` | 自动匹配、银行流水导入、ERP/总账回写保留到后续版本 |
| 客户/商机 V2 入口联动 | Done | 2026-07-02 | 本次提交 | `npm test -- --run`；`npm run build` | 127.0.0.1:5175 已通过客户抽屉 V2 业务闭环、商机抽屉成交执行闭环、合同页 scoped URL 筛选验证；浏览器控制台 app error = 0；证据截图：`docs/testing/evidence/artifacts/v2-account-entry-integration-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-opportunity-entry-integration-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-scoped-contract-filter-uat-20260702.png` | 无 |
| V2 系统配置与权限审计 | Done | 2026-07-02 | 本次提交 | `mvn -Dtest=DatabaseMigrationTest,DictionaryControllerTest,DataPermissionServiceTest,V1DemoDataSeederTest,IdentityAdminControllerTest,AuditLogControllerTest test`；`npm test -- --run`；`npm run build` | 127.0.0.1:5175 已通过系统概览 V2 治理覆盖、角色权限分组、审计日志核销筛选、V2 字典管理验证；浏览器控制台 app error = 0；证据截图：`docs/testing/evidence/artifacts/v2-system-overview-governance-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-role-permission-groups-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-audit-quick-filter-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-dictionary-governance-uat-20260702.png` | 无 |
| V2 全链路回归与 UAT | Done | 2026-07-02 | b30652d | `mvn -Dtest=DatabaseMigrationTest,SolutionDocumentControllerTest,ContractControllerTest,InvoiceControllerTest,ReceivablePlanControllerTest,PaymentControllerTest,ReconciliationControllerTest,AttachmentControllerTest,OpenApiContractCoverageTest,DictionaryControllerTest,DataPermissionServiceTest,V1DemoDataSeederTest,IdentityAdminControllerTest,AuditLogControllerTest test`；`npm test -- --run`；`npm run build` | 127.0.0.1:5175 已通过工作台、方案标书、合同、开票管理、回款管理、核销工作台页面级 UAT；浏览器控制台 app error = 0；证据截图：`docs/testing/evidence/artifacts/v2-full-chain-dashboard-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-full-chain-solutions-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-full-chain-contracts-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-full-chain-invoices-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-full-chain-receivables-uat-20260702.png`、`docs/testing/evidence/artifacts/v2-full-chain-reconciliations-uat-20260702.png` | 自动匹配、银行流水导入、ERP/总账回写保留到后续版本；V2 已由沈思维确认 GO |

## 5. 当前进度快照

```text
V2 当前进度：
- 总模块：9
- 已完成：9
- 当前模块：V2 最终确认
- 当前步骤：Step 30 最终人工确认完成
- 当前 TODO：无，沈思维已确认 V2 GO
- 完成标准：生产发布复审通过，最终人工确认 GO
```

最终确认记录：

- 2026-07-02，沈思维作为版本最终确认人确认 V2 GO。

## 6. V2 总体页面逻辑与导航方案

### 6.1 V2 用户进入系统后应该理解的主链路

V2 不是新增一批孤立表单，而是把 V1 的销售推进延伸为一条商务财务链路：

```text
商机商业方案/商业谈判
-> 方案与标书：方案版本、报价测算、利润测算、标书自评、客户反馈
-> 商机商业成交
-> 合同管理：合同台账、状态、金额、税率、付款条件、开票条件、变更
-> 开票管理：开票计划、开票申请、发票登记、签收、异常、作废
-> 回款管理：回款计划、到账流水、逾期、回款跟进
-> 核销工作台：发票与回款流水多对多核销、撤销、审计
```

### 6.2 导航方案备选

| 方案 | 导航形态 | 优点 | 风险 |
|---|---|---|---|
| A | V2 四个独立一级菜单：方案与标书、合同管理、开票管理、回款管理 | 简单直接，开发成本低 | 核销能力容易被塞进回款页，后期财务操作会拥挤 |
| B | 推荐：业务一级菜单保持清晰，财务动作分组。新增 `方案标书`、`合同`、`财务`，财务下含开票、回款、核销 | 更像专业 CRM/ERP 后台；销售、商务、财务职责清晰；核销有独立工作台 | 菜单层级比 A 多，需要前端导航稍作调整 |
| C | 按角色建工作台：销售工作台、商务工作台、财务工作台 | 面向角色体验强 | V2 首版成本较高，容易提前进入 V3 驾驶舱 |

推荐采用方案 B：

- 一级菜单保留 V1 主链路：工作台、客户池、联系人、商机、销售行动、周进展。
- 新增 `方案标书`：销售/售前围绕商机维护材料和报价。
- 新增 `合同`：商务/法务围绕成交商机维护合同资产。
- 新增 `财务`：作为一级菜单，下设 `开票管理`、`回款管理`、`核销工作台`。
- `系统` 继续作为一级菜单，补充 V2 字典、权限和审计。

### 6.3 V2 页面层级

| 一级菜单 | 二级页面 | 主要使用角色 | 页面重点 |
|---|---|---|---|
| 方案标书 | 方案标书列表 | 销售、售前/方案、销售负责人 | 看哪些商机缺方案、报价、标书自评和客户反馈 |
| 方案标书 | 方案标书详情 | 销售、售前/方案 | 版本、类型、报价、毛利、评审、自评、风险、客户反馈 |
| 合同 | 合同列表 | 销售、商务/法务、销售负责人 | 合同状态、金额、税率、客户、商机、负责人、风险 |
| 合同 | 合同详情 | 销售、商务/法务、财务 | 基础信息、变更、节点、开票计划、回款计划、附件占位 |
| 财务 | 开票管理 | 财务、商务、销售 | 开票计划、申请、发票登记、签收、异常、作废 |
| 财务 | 回款管理 | 财务、销售负责人、销售 | 回款计划、到账流水、逾期、回款责任、跟进行动 |
| 财务 | 核销工作台 | 财务 | 待核销发票、待分配回款、核销明细、撤销核销 |
| 系统 | 字典/权限/审计 | 管理员 | V2 字典、角色权限、关键操作审计 |

### 6.4 V2 首轮不做的 UI

- 不做复杂 BI 风格财务驾驶舱。
- 不做电子签章、税控开票、银行流水导入页面。
- 不做复杂审批流设计器，只保留状态流转、责任人、审计记录。
- 不做完整附件存储能力，V2 首轮保留附件占位和字段，实际上传能力可复用或后续增强。

## 7. 模块 2 启动展示：方案与标书链路

当前模块：方案与标书链路

页面范围：

- 方案标书列表。
- 方案标书详情。
- 新建/编辑方案标书。
- 方案版本、材料类型、报价金额、预计毛利率、标书自评、风险说明。
- 与客户、商机、销售行动的入口联动。

本模块不做：

- 不做完整文件在线预览和版本 diff。
- 不做复杂审批流设计器。
- 不做合同、开票、回款代码。
- 不做 AI 自动生成方案。

当前 TODO：

| 顺序 | 状态 | 事项 | 完成标准 |
|---:|---|---|---|
| 1 | Pending | 当前页面诊断 | 确认 V1 商机页哪些位置需要进入方案标书 |
| 2 | Pending | 业务/UI 方案 | 给出方案标书列表、详情、表单和商机关联方式 |
| 3 | Pending | 数据模型设计 | 明确 `crm_solution_documents` 字段、状态、字典、附件对象类型和约束 |
| 4 | Pending | API 契约设计 | 明确列表、详情、新建、编辑、状态动作 API |
| 5 | Done | 后端实现与测试 | Migration、Service、Controller、权限测试通过 |
| 6 | Done | 前端实现与测试 | 菜单、页面、表单、详情、状态文案测试通过 |
| 7 | Done | UAT 验收 | `/solutions` 关键链路与附件新增、删除、下载无服务端异常、无控制台应用错误 |
| 8 | Current | 提交切换 | 模块 2 Done，模块 3 合同管理 Current |

完成标准：

- 商机可跳转到方案标书。
- 方案标书可关联客户和商机。
- 可维护类型、版本、状态、报价、毛利、标书自评和风险说明。
- 附件支持新增、删除、下载；本期下载为打开 `file_url`，后续可扩展签名下载 URL。
- 标书自评为有风险或不通过时，能在方案详情清晰提示，并为后续商机风险回写预留。
- 自动化测试、构建和浏览器 Smoke 通过。
