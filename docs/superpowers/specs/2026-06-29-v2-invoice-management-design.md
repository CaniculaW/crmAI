# V2 开票管理链路设计说明

日期：2026-06-29

## 1. 设计目标

模块 4「开票管理链路」承接合同履约后的财务执行，回答三件事：

1. 某份合同按条款应该在什么时候开票、开多少。
2. 当前已经申请开票、实际开票、签收和异常的金额是多少。
3. 后续回款和核销模块应该基于哪些已开票记录继续推进。

本模块不是税控系统、电子发票系统或 ERP 财务总账。V2 首轮目标是建立面向项目型大客户 CRM 的开票计划、开票申请、发票登记和异常追踪能力，让销售、商务、财务围绕同一份合同看到应开、已开、剩余可开、异常和作废。

## 2. 已确认方案

采用方案 B：开票计划 + 开票申请 + 发票登记一体化。

导航：

- 新增一级菜单：`财务`。
- `财务` 下新增二级页面：`开票管理`。
- 后续模块继续在 `财务` 下扩展 `回款管理`、`核销工作台`。

页面：

- `开票管理列表`
- `开票详情`
- `新建/编辑开票计划`
- `提交开票申请`
- `登记发票`
- `发票签收`
- `异常登记`
- `作废发票`
- `开票附件`

## 3. 页面逻辑

### 3.1 开票管理列表

开票管理列表回答“哪些合同计划开票、哪些已经申请、哪些已经开票、哪些异常或作废”。

核心信息：

- 开票计划名称。
- 客户。
- 合同。
- 来源商机。
- 计划开票日期。
- 发票类型。
- 税率。
- 计划开票金额。
- 申请开票金额。
- 实际开票金额。
- 开票状态。
- 发票号码。
- 发票代码。
- 开票日期。
- 签收日期。
- 负责人。
- 最近更新时间。

筛选：

- 关键词。
- 客户。
- 合同。
- 商机。
- 开票状态。
- 发票类型。
- 计划开票日期范围。
- 开票日期范围。
- 负责人。
- 异常标记。

主要操作：

- 新建计划。
- 查看详情。
- 编辑计划。
- 提交申请。
- 登记发票。
- 确认签收。
- 登记异常。
- 作废发票。

### 3.2 开票详情

开票详情回答六个问题：

1. 这笔开票来自哪个客户、合同和商机。
2. 合同金额、已计划、已申请、已开票和剩余可开金额是多少。
3. 当前计划是否已经申请、实际发票是否已经登记。
4. 发票是否已被客户签收。
5. 异常或作废原因是什么。
6. 后续回款和核销模块是否可以使用这张发票。

信息分区：

- 摘要区：客户、合同、商机、状态、计划金额、实际开票金额。
- 合同额度区：合同含税金额、已计划金额、已开票有效金额、剩余可开金额。
- 计划区：计划名称、计划日期、计划金额、付款/开票条件摘要。
- 申请区：申请金额、申请日期、申请人、申请说明。
- 发票区：发票类型、税率、不含税金额、税额、价税合计、发票代码、发票号码、开票日期。
- 签收区：签收日期、签收人、签收说明。
- 异常区：异常类型、异常原因、处理状态。
- 作废区：作废原因、作废人、作废时间。
- 附件区：发票扫描件、申请材料、客户签收单。
- 后续入口占位：回款记录、核销明细。

### 3.3 新建/编辑开票计划

开票计划必须关联合同；客户和商机从合同自动带入。合同是金额和数据权限来源。

必填字段：

- `contract_id`
- `account_id`
- `plan_name`
- `planned_invoice_date`
- `planned_amount`
- `invoice_type`
- `tax_rate`
- `owner_user_id`

建议填写：

- `opportunity_id`
- `invoice_terms_snapshot`
- `remark`

编辑计划允许修改计划名称、计划日期、计划金额、发票类型、税率、负责人和备注。已经进入 `invoiced`、`signed`、`voided` 状态的记录不允许再改计划金额；如确需调整，需要登记作废后新建计划。

### 3.4 状态流转

V2 首轮采用清晰状态，不做复杂审批流设计器。

状态：

- `planned`：已计划。
- `applied`：已申请。
- `invoiced`：已开票。
- `signed`：已签收。
- `exception`：异常。
- `voided`：已作废。

动作：

- 新建计划后状态为 `planned`。
- 提交开票申请后状态为 `applied`。
- 登记发票后状态为 `invoiced`。
- 确认客户签收后状态为 `signed`。
- 登记异常后状态为 `exception`，保留原申请和发票信息。
- 作废发票后状态为 `voided`，必须填写作废原因。

约束：

- `voided` 为终态，不允许再次登记发票或签收。
- `signed` 不允许作废，除非后续系统配置模块引入特殊权限；V2 首轮不开放。
- 从 `exception` 可重新编辑后回到 `planned` 或重新提交申请。

### 3.5 金额口径与校验

金额口径全部以合同含税金额为总额度。

字段口径：

- 合同含税金额：`crm_contracts.contract_amount`。
- 计划开票金额：当前开票计划的预计价税合计。
- 申请开票金额：财务准备开票的价税合计。
- 实际开票金额：发票登记后的价税合计。
- 有效已开票金额：状态为 `invoiced` 或 `signed` 的实际开票金额合计。
- 作废金额：状态为 `voided` 的实际开票金额，不计入有效已开票金额。
- 剩余可开金额：合同含税金额 - 有效已开票金额。

校验规则：

- `planned_amount` 必须大于 0。
- `applied_amount` 必须大于 0，且不能超过当前合同剩余可开金额加当前记录原有效金额。
- `actual_invoice_amount` 必须大于 0，且不能超过当前合同剩余可开金额加当前记录原有效金额。
- 同一合同的有效已开票金额不得超过合同含税金额。
- 发票登记时必须填写发票号码、开票日期、实际开票金额、税率。
- 作废必须填写原因，并从有效已开票金额中扣回。

### 3.6 附件

开票附件复用 V1 通用附件模型：

- `object_type = invoice`
- `object_id = crm_invoices.id`

附件能力：

- 新增附件。
- 下载附件：V2 首轮打开 `file_url`。
- 删除附件。
- 查看附件列表。

附件类型：

- `invoice_scan`：发票扫描件。
- `invoice_application`：开票申请材料。
- `customer_receipt`：客户签收单。
- `void_material`：作废材料。
- `exception_material`：异常处理材料。

不单独创建 `crm_invoice_attachments`，保持与方案标书、合同模块一致。

### 3.7 异常与作废

异常用于记录发票流程中的问题，不等同于作废。

异常类型：

- `customer_info_error`：客户抬头或税号错误。
- `amount_mismatch`：金额不一致。
- `tax_rate_error`：税率错误。
- `invoice_rejected`：客户拒收。
- `delivery_condition_unmet`：开票条件未满足。
- `other`：其他。

异常字段：

- 异常类型。
- 异常原因。
- 处理说明。
- 登记人。
- 登记时间。

作废用于撤销一张已经登记的发票。作废后该发票金额不再计入有效已开票金额，必须保留审计记录。

### 3.8 与合同、回款和核销的关系

与合同：

- 开票计划必须关联合同。
- 客户、商机、合同金额、开票条件从合同带入。
- 开票列表的数据权限复用合同关联客户/商机的数据权限。
- 合同详情后续可展示开票摘要和跳转入口。

与回款：

- 回款模块不在本模块实现。
- 本模块只提供可供后续回款引用的有效发票记录。

与核销：

- 核销模块不在本模块实现。
- 本模块保留发票状态和实际开票金额，为后续一张发票被多笔回款核销提供来源。

## 4. 数据模型设计

### 4.1 `crm_invoices`

建议字段：

- `id`
- `account_id`
- `opportunity_id`
- `contract_id`
- `plan_name`
- `invoice_status`
- `invoice_type`
- `planned_invoice_date`
- `planned_amount`
- `applied_amount`
- `applied_at`
- `applied_by`
- `application_note`
- `invoice_code`
- `invoice_no`
- `invoice_date`
- `tax_rate`
- `net_amount`
- `tax_amount`
- `actual_invoice_amount`
- `signed_at`
- `signed_by_name`
- `sign_note`
- `exception_type`
- `exception_reason`
- `exception_resolution`
- `void_reason`
- `voided_at`
- `voided_by`
- `owner_user_id`
- `remark`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`
- `deleted_at`

### 4.2 字典项

- `invoice_status`
- `invoice_type`
- `invoice_exception_type`
- `invoice_attachment_type`

### 4.3 权限点

- `invoice.read`
- `invoice.create`
- `invoice.update`
- `invoice.apply`
- `invoice.issue`
- `invoice.sign`
- `invoice.exception`
- `invoice.void`

## 5. API 契约设计

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/invoices | 查询开票列表 | invoice.read + 关联合同数据权限 |
| GET | /api/invoices/{id} | 查看开票详情 | invoice.read + 关联合同数据权限 |
| POST | /api/invoices | 新建开票计划 | invoice.create + 关联合同数据权限 |
| PATCH | /api/invoices/{id} | 编辑开票计划 | invoice.update + 关联合同数据权限 |
| POST | /api/invoices/{id}/apply | 提交开票申请 | invoice.apply + 关联合同数据权限 |
| POST | /api/invoices/{id}/issue | 登记发票 | invoice.issue + 关联合同数据权限 |
| POST | /api/invoices/{id}/sign | 确认签收 | invoice.sign + 关联合同数据权限 |
| POST | /api/invoices/{id}/exception | 登记异常 | invoice.exception + 关联合同数据权限 |
| POST | /api/invoices/{id}/void | 作废发票 | invoice.void + 关联合同数据权限 |

过滤参数：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_id`
- `invoice_status`
- `invoice_type`
- `owner_user_id`
- `planned_from`
- `planned_to`
- `invoice_date_from`
- `invoice_date_to`
- `exception_only`

## 6. 前端页面方案

### 6.1 菜单

在现有一级菜单后新增 `财务` 分组，V2 首轮先放 `开票管理`。

考虑当前前端导航还没有二级菜单基础，本模块先采用一个一级入口 `开票` 或 `开票管理`；若本轮顺手支持二级菜单，则将 `开票管理` 放在 `财务` 下。实现时优先不大改导航框架，避免影响 V1 已验收页面。

### 6.2 列表布局

顶部说明：

- 标题：`开票管理`
- 描述：`管理合同下的开票计划、申请、发票登记、签收、异常和作废。`

筛选区：

- 关键词。
- 客户。
- 合同。
- 状态。
- 发票类型。
- 异常标记。

表格列：

- 计划名称。
- 客户。
- 合同。
- 状态。
- 计划日期。
- 计划金额。
- 实际开票金额。
- 发票号码。
- 开票日期。
- 操作。

### 6.3 详情抽屉

详情抽屉标题：`开票详情`

分区：

- 开票摘要。
- 合同额度。
- 申请与发票。
- 签收/异常/作废。
- 附件。
- 后续回款/核销占位。

动作按钮：

- 编辑计划。
- 提交申请。
- 登记发票。
- 确认签收。
- 登记异常。
- 作废发票。
- 添加附件。

## 7. 测试策略

后端：

- Migration 测试：`crm_invoices` 表、字典、权限存在。
- Controller 测试：创建、列表、详情、编辑、申请、开票、签收、异常、作废。
- 金额校验测试：累计有效开票不能超过合同金额，作废后释放额度。
- 数据权限测试：只能访问有合同客户/商机权限的数据。
- 附件测试：`object_type=invoice` 可新增、查询、删除。

前端：

- 列表渲染测试。
- 详情抽屉测试。
- 状态动作入口测试。
- 附件区测试。

文档：

- OpenAPI 覆盖 `/api/invoices` 全部接口。
- 接口清单补充开票管理 API。
- V2 TODO 更新模块状态和验收证据。

## 8. 不做范围

- 不接入真实税控或电子发票平台。
- 不做发票 PDF/OFD 在线预览。
- 不做复杂审批流设计器。
- 不做回款登记。
- 不做发票与回款核销。
- 不做财务总账、凭证和科目。
- 不做自动提醒和通知。

## 9. 验收标准

- 可从开票管理列表新建合同开票计划。
- 可提交申请、登记发票、确认签收、登记异常、作废发票。
- 同一合同累计有效已开票金额不得超过合同金额。
- 作废发票后释放合同剩余可开金额。
- 发票附件支持新增、下载入口、删除。
- 关键动作写入审计。
- 前后端自动化测试、OpenAPI 覆盖测试和生产构建通过。
- 浏览器 UAT 访问 `/invoices` 无服务端异常，无控制台应用错误。
