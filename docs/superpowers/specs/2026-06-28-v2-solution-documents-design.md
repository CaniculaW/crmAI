# V2 方案与标书链路设计说明

日期：2026-06-28

## 1. 设计目标

模块 2「方案与标书链路」承接 V1 商机推进中的商业方案、商业谈判阶段，让销售、售前/方案和销售负责人能够围绕同一个商机维护方案材料、报价测算、利润测算、标书自评、客户反馈和附件归档。

本模块不是完整投标系统，也不做复杂审批流。它的目标是把项目材料从聊天、网盘和 Excel 中拉回 CRM，形成可检索、可追踪、可关联商机风险的材料台账。

## 2. 已确认方案

采用方案 B：方案标书作为独立一级菜单，并从商机推进入口联动。

导航：

- 新增一级菜单：`方案标书`。
- 保留商机详情中的 V1 入口，并新增 `准备方案标书`。
- 后续 V2 模块继续新增 `合同`、`财务` 一级菜单。

页面：

- `方案标书列表`
- `方案标书详情`
- `新建/编辑方案标书`

## 3. 页面逻辑

### 3.1 方案标书列表

列表面向“哪些商机正在准备材料、报价或标书”。

核心信息：

- 方案/标书名称。
- 所属客户。
- 关联商机。
- 类型：需求资料、技术方案、干系人方案、报价测算、利润测算、投标文件、标书自评、演示材料。
- 版本号。
- 状态：待启动、草稿中、内部评审、需修订、已提交客户、客户反馈中、已定稿、已作废。
- 报价金额。
- 预计毛利率。
- 标书自评结果。
- 负责人。
- 最近更新时间。

筛选：

- 客户。
- 商机。
- 类型。
- 状态。
- 标书自评结果。
- 负责人。
- 关键词。

主要操作：

- 新建方案标书。
- 查看详情。
- 编辑。
- 作废。

### 3.2 方案标书详情

详情页要回答四个问题：

1. 这份材料服务哪个客户和商机。
2. 当前版本和状态是什么。
3. 报价、毛利、自评和风险是否健康。
4. 相关附件是否完整可下载。

信息分区：

- 摘要区：名称、客户、商机、类型、版本、状态、负责人。
- 商务测算区：报价金额、成本测算、预计毛利率。
- 方案内容区：客户需求摘要、技术方案摘要、干系人策略。
- 标书自评区：自评结果、风险说明。
- 客户反馈区：提交客户时间、客户反馈。
- 附件区：附件列表、上传/新增附件、下载、删除。
- 关联入口：返回商机、记录销售行动。

### 3.3 商机联动

商机详情新增 `准备方案标书` 入口。

入口出现逻辑：

- 所有商机均可查看方案标书入口。
- 当商机阶段为商业方案、商业谈判或商业成交时，入口文案强调“补齐方案、报价和标书自评”。
- 商机预计合同金额可被方案报价金额参考，但本模块不自动覆盖商机金额，避免误写。

## 4. 附件模式

### 4.1 结论

V2 模块 2 必须支持附件增、删、下载能力。

采用两层实现：

1. 业务层：使用现有 `crm_attachments` 通用附件模型，新增支持 `object_type=solution_document`。
2. 文件层：V2 首轮支持“文件链接/对象地址登记 + 下载打开”；真实二进制上传可采用对象存储或企业文件服务，在同一接口模型下扩展。

### 4.2 为什么不单独建 `crm_solution_attachments`

现有 V1 已落地 `crm_attachments` 通用附件表和 `/api/attachments` API，具备：

- 按 `object_type + object_id` 查询附件。
- 创建附件元数据。
- 逻辑删除附件。
- 附件操作审计。
- 对 account、contact、opportunity、activity 做对象访问校验。

V2 应优先复用通用模型，只扩展可挂载对象类型，避免每个业务模块都建一套附件表和 UI。

### 4.3 本模块附件能力

附件区支持：

- 新增附件：录入文件名、文件地址/对象 Key、文件类型、大小、MIME、备注。
- 下载附件：点击下载按钮打开 `file_url`。如果后续接入对象存储，可替换为签名下载 URL。
- 删除附件：逻辑删除，列表中消失，并写入审计日志。
- 查看附件列表：按方案标书 ID 查询。

文件类型建议：

- `requirement_material`：需求资料。
- `technical_solution`：技术方案。
- `quotation`：报价单。
- `profit_calculation`：利润测算。
- `bid_document`：投标文件。
- `bid_self_check`：标书自评。
- `demo_material`：演示材料。
- `customer_feedback`：客户反馈材料。

### 4.4 V2 首轮不做

- 不做大文件分片上传。
- 不做在线预览。
- 不做版本 diff。
- 不做病毒扫描。
- 不做对象存储签名 URL 的真实集成，但保留 `file_url` 作为接入点。

## 5. 数据模型

新增 `crm_solution_documents`。

核心字段：

- `account_id`
- `opportunity_id`
- `document_name`
- `document_type`
- `version_no`
- `status`
- `owner_user_id`
- `customer_requirement_summary`
- `technical_solution_summary`
- `stakeholder_strategy`
- `quotation_amount`
- `cost_amount`
- `estimated_gross_margin_rate`
- `bid_self_check_result`
- `bid_risk_description`
- `submitted_to_customer_at`
- `customer_feedback`
- `remark`

复用 `crm_attachments`：

- `object_type = solution_document`
- `object_id = crm_solution_documents.id`

## 6. API 契约

方案标书：

- `GET /api/solutions`
- `GET /api/solutions/{solutionId}`
- `POST /api/solutions`
- `PATCH /api/solutions/{solutionId}`
- `POST /api/solutions/{solutionId}/void`

附件：

- `GET /api/attachments?object_type=solution_document&object_id={solutionId}`
- `POST /api/attachments`
- `DELETE /api/attachments/{attachmentId}`

下载：

- V2 首轮前端直接打开附件 `file_url`。
- 后续如接入对象存储，扩展 `GET /api/attachments/{attachmentId}/download-url` 返回短期有效签名 URL。

## 7. 权限与审计

新增权限点：

- `solution.read`
- `solution.create`
- `solution.update`
- `solution.void`

复用附件权限：

- `attachment.read`
- `attachment.create`
- `attachment.delete`

审计动作：

- `solution.create`
- `solution.update`
- `solution.void`
- `attachment.create`
- `attachment.delete`

## 8. 验收标准

- 用户可从一级菜单进入方案标书列表。
- 用户可从商机推进入口进入方案标书模块。
- 用户可新建、编辑、查看、作废方案标书。
- 方案标书可关联客户和商机。
- 方案详情展示报价、毛利、标书自评和风险说明。
- 用户可新增、删除、下载方案标书附件。
- 附件操作有审计记录。
- 自动化测试、构建和浏览器 Smoke 通过。

## 9. 自检

- 无占位项。
- 方案标书范围未包含合同、开票、回款实现。
- 附件模式与 V1 已有通用附件能力一致。
- 下载能力在 V2 首轮定义为打开 `file_url`，对象存储签名下载作为后续扩展点。
