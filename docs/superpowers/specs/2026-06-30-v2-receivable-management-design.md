# V2 回款管理链路设计说明

日期：2026-06-30

## 1. 设计目标

模块 5「回款管理链路」承接合同和开票后的财务执行，回答四件事：

1. 某份合同按付款条件应该在什么时候收款、收多少。
2. 客户实际到账了多少、是否已经由财务确认。
3. 哪些应收计划已经逾期、由谁跟进、风险原因是什么。
4. 后续核销工作台应该基于哪些已确认回款继续分配到发票。

本模块不是银行流水自动导入、财务总账或发票核销系统。V2 首轮目标是建立面向项目型大客户 CRM 的回款计划、到账流水、财务确认、异常登记、逾期识别和跟进追踪能力，让销售、商务、财务围绕同一份合同看到应收、实收、未收、逾期和待核销。

## 2. 已确认方案

采用方案 B：回款计划 + 回款流水一体化。

导航：

- 新增一级菜单：`财务`。
- `财务` 下新增二级页面：`回款管理`。
- 当前前端若暂未做财务分组，可先以一级菜单 `回款管理` 交付，后续在 V2 财务导航统一时迁移到分组下。

页面：

- `回款管理列表`
- `回款详情`
- `新建/编辑回款计划`
- `登记到账流水`
- `确认到账`
- `登记回款异常`
- `逾期跟进`
- `回款附件`

模块边界：

- 本模块做回款计划、到账流水、财务确认、异常、逾期和跟进。
- 本模块不做发票与回款多对多核销明细，核销进入模块 6「发票回款核销链路」。
- 本模块不接银行、ERP、财务总账和复杂审批流。

## 3. 页面逻辑

### 3.1 回款管理列表

回款管理列表回答“哪些合同应该回款、哪些已经到账、哪些逾期、哪些异常”。

列表以回款计划为主视角，同时展示已关联到账流水摘要。这样用户优先看到应收责任和逾期风险，而不是只看到零散银行流水。

核心信息：

- 回款计划名称。
- 客户。
- 合同。
- 来源商机。
- 计划回款日期。
- 计划回款金额。
- 已确认到账金额。
- 未回款金额。
- 回款计划状态。
- 逾期天数。
- 回款责任人。
- 最近到账日期。
- 最近跟进记录。
- 最近更新时间。

筛选：

- 关键词。
- 客户。
- 合同。
- 商机。
- 回款计划状态。
- 回款责任人。
- 计划回款日期范围。
- 到账日期范围。
- 逾期标记。
- 异常标记。

主要操作：

- 新建回款计划。
- 查看详情。
- 编辑计划。
- 登记到账流水。
- 确认到账。
- 登记异常。
- 添加跟进。
- 新增附件。

### 3.2 回款详情

回款详情回答七个问题：

1. 这笔应收来自哪个客户、合同和商机。
2. 合同金额、计划回款金额、已确认到账金额和未回款金额是多少。
3. 当前是否逾期，逾期原因和责任人是谁。
4. 已经登记了哪些到账流水。
5. 哪些流水已由财务确认，哪些存在异常。
6. 销售或商务做了哪些催收跟进。
7. 后续核销模块可以使用哪些已确认回款。

信息分区：

- 摘要区：客户、合同、商机、状态、计划金额、已回款、未回款、逾期天数。
- 合同口径区：合同含税金额、已开票有效金额、已确认回款金额、待核销回款金额。
- 计划区：计划期次、计划日期、计划金额、付款条件快照。
- 到账流水区：流水名称、到账日期、到账金额、付款方、收款账户、银行流水号、状态。
- 财务确认区：确认人、确认时间、确认备注。
- 异常区：异常类型、异常原因、处理说明。
- 跟进区：跟进时间、跟进人、跟进内容、下一步计划。
- 附件区：银行回单、流水截图、客户确认单。
- 后续入口占位：核销工作台、核销明细。

### 3.3 新建/编辑回款计划

回款计划必须关联合同；客户和商机从合同自动带入。合同是金额和数据权限来源。

必填字段：

- `contract_id`
- `plan_name`
- `planned_receivable_date`
- `planned_amount`
- `owner_user_id`

建议填写：

- `plan_stage`
- `payment_terms_snapshot`
- `overdue_reason`
- `remark`

编辑计划允许修改计划名称、计划期次、计划日期、计划金额、负责人、逾期原因和备注。已终止计划不允许继续登记到账流水；如客户付款条件发生变更，应通过编辑计划记录原因，合同变更仍保留在合同模块。

### 3.4 登记到账流水

到账流水用于记录客户实际付款。V2 首轮允许一条到账流水关联一个回款计划；若一笔银行到账覆盖多个计划，财务可拆分登记为多条流水。多对多分配和核销进入模块 6。

必填字段：

- `receivable_plan_id`
- `contract_id`
- `payment_name`
- `received_at`
- `received_amount`
- `payment_method`
- `owner_user_id`

建议填写：

- `payer_name`
- `receiving_account`
- `bank_flow_no`
- `remark`

流水状态：

- `registered`：已登记，等待财务确认。
- `confirmed`：已确认到账。
- `partially_reconciled`：部分核销，模块 6 使用。
- `reconciled`：已核销，模块 6 使用。
- `exception`：异常。
- `refunded`：已退款。

### 3.5 财务确认、异常和退款

财务确认用于把登记流水纳入有效回款金额。

确认规则：

- 只有 `registered` 或 `exception` 状态的流水可以确认到账。
- 确认到账必须填写确认时间，确认人由当前用户带入。
- 确认后状态为 `confirmed`，金额计入合同已确认回款和回款计划已回款金额。

异常类型：

- `underpaid`：少付。
- `overpaid`：多付。
- `wrong_payer`：付款方不一致。
- `duplicate_payment`：重复付款。
- `unclaimed`：未认领。
- `customer_dispute`：客户争议。
- `refund_required`：需退款。
- `other`：其他。

退款规则：

- V2 首轮不做完整退款审批，只支持将异常流水标记为 `refunded` 并填写退款说明。
- `refunded` 流水不计入有效回款金额。
- 退款动作必须写审计。

### 3.6 回款计划状态与逾期

计划状态：

- `planned`：计划中。
- `due`：待回款。
- `partial_received`：部分回款。
- `received`：已回款。
- `overdue`：逾期。
- `terminated`：已终止。

状态计算：

- 新建计划默认 `planned`。
- 当前日期达到计划回款日且未全额回款时，列表和详情展示为 `due`。
- 当前日期超过计划回款日且未全额回款时，展示为 `overdue`。
- 已确认到账金额大于 0 且小于计划金额，展示为 `partial_received`。
- 已确认到账金额大于等于计划金额，展示为 `received`。
- 用户手动终止后展示为 `terminated`，不再计算逾期。

逾期天数：

- `overdue_days = current_date - planned_receivable_date`。
- 未逾期、已回款或已终止时显示 0。

逾期原因：

- `customer_process`：客户流程。
- `acceptance_pending`：验收未完成。
- `invoice_issue`：发票问题。
- `contract_dispute`：合同争议。
- `budget_delay`：资金计划延迟。
- `other`：其他。

### 3.7 回款跟进

回款跟进用于记录销售或商务对逾期/临期应收的推进动作。V2 首轮不强制复用销售行动表，先在回款模块内记录轻量跟进，后续模块 7 可把客户/商机入口统一联动。

字段：

- `receivable_plan_id`
- `follow_up_at`
- `follow_up_by`
- `follow_up_content`
- `customer_feedback`
- `next_action`
- `next_follow_up_at`
- `remark`

规则：

- 逾期计划至少应允许添加一条跟进记录。
- 跟进记录不改变到账金额。
- 跟进写入审计，便于销售负责人追责。

### 3.8 附件

回款附件复用 V1 通用附件模型：

- `object_type = receivable_plan`
- `object_id = crm_receivable_plans.id`
- `object_type = payment`
- `object_id = crm_payments.id`

附件能力：

- 新增附件。
- 下载附件：V2 首轮打开 `file_url`。
- 删除附件。
- 查看附件列表。

附件类型：

- `bank_receipt`：银行回单。
- `bank_statement`：银行流水。
- `customer_confirmation`：客户确认单。
- `collection_evidence`：催收证据。
- `refund_material`：退款材料。
- `other`：其他。

## 4. 数据模型设计

### 4.1 `crm_receivable_plans`

建议字段：

- `id`
- `tenant_id`
- `account_id`
- `opportunity_id`
- `contract_id`
- `plan_name`
- `plan_stage`
- `receivable_status`
- `planned_receivable_date`
- `planned_amount`
- `owner_user_id`
- `payment_terms_snapshot`
- `overdue_reason`
- `termination_reason`
- `terminated_at`
- `terminated_by`
- `remark`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`
- `deleted_at`
- `version`

派生字段不落库，查询响应中计算：

- `confirmed_received_amount`
- `unreceived_amount`
- `overdue_days`
- `contract_amount`
- `effective_invoiced_amount`
- `confirmed_contract_received_amount`
- `unreconciled_payment_amount`

索引：

- `account_id`
- `opportunity_id`
- `contract_id`
- `receivable_status`
- `owner_user_id`
- `planned_receivable_date`

### 4.2 `crm_payments`

建议字段：

- `id`
- `tenant_id`
- `account_id`
- `opportunity_id`
- `contract_id`
- `receivable_plan_id`
- `payment_name`
- `payment_status`
- `received_at`
- `received_amount`
- `confirmed_amount`
- `confirmed_at`
- `confirmed_by`
- `payment_method`
- `payer_name`
- `receiving_account`
- `bank_flow_no`
- `reconciled_amount`
- `exception_type`
- `exception_reason`
- `exception_resolution`
- `refund_reason`
- `refunded_at`
- `refunded_by`
- `owner_user_id`
- `remark`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`
- `deleted_at`
- `version`

约束：

- `received_amount > 0`。
- `confirmed_amount >= 0`。
- `reconciled_amount >= 0`。
- `reconciled_amount <= confirmed_amount`。
- 同一租户下非删除记录的 `bank_flow_no` 建议唯一；为空时不参与唯一校验。

### 4.3 `crm_receivable_follow_ups`

建议字段：

- `id`
- `tenant_id`
- `account_id`
- `opportunity_id`
- `contract_id`
- `receivable_plan_id`
- `follow_up_at`
- `follow_up_by`
- `follow_up_content`
- `customer_feedback`
- `next_action`
- `next_follow_up_at`
- `remark`
- `created_at`
- `updated_at`
- `deleted_at`

## 5. API 契约设计

### 5.1 回款计划 API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/receivable-plans` | 查询回款计划列表 | receivable.read |
| GET | `/api/receivable-plans/{planId}` | 查看回款计划详情 | receivable.read |
| POST | `/api/receivable-plans` | 创建回款计划 | receivable.create |
| PATCH | `/api/receivable-plans/{planId}` | 编辑回款计划 | receivable.update |
| POST | `/api/receivable-plans/{planId}/terminate` | 终止回款计划 | receivable.terminate |
| GET | `/api/receivable-plans/{planId}/payments` | 查询计划下到账流水 | receivable.read |
| GET | `/api/receivable-plans/{planId}/follow-ups` | 查询计划跟进记录 | receivable.read |
| POST | `/api/receivable-plans/{planId}/follow-ups` | 新增回款跟进 | receivable.follow_up |

列表筛选：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_id`
- `receivable_status`
- `owner_user_id`
- `planned_from`
- `planned_to`
- `overdue_only`

### 5.2 到账流水 API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/payments` | 查询到账流水列表 | payment.read |
| GET | `/api/payments/{paymentId}` | 查看到账流水详情 | payment.read |
| POST | `/api/payments` | 登记到账流水 | payment.create |
| PATCH | `/api/payments/{paymentId}` | 编辑到账流水 | payment.update |
| POST | `/api/payments/{paymentId}/confirm` | 确认到账 | payment.confirm |
| POST | `/api/payments/{paymentId}/exception` | 登记到账异常 | payment.exception |
| POST | `/api/payments/{paymentId}/refund` | 标记退款 | payment.refund |

列表筛选：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_id`
- `receivable_plan_id`
- `payment_status`
- `payment_method`
- `owner_user_id`
- `received_from`
- `received_to`
- `exception_only`

## 6. 权限与审计

权限点：

- `receivable.read`
- `receivable.create`
- `receivable.update`
- `receivable.terminate`
- `receivable.follow_up`
- `payment.read`
- `payment.create`
- `payment.update`
- `payment.confirm`
- `payment.exception`
- `payment.refund`

审计动作：

- `receivable.create`
- `receivable.update`
- `receivable.terminate`
- `receivable.follow_up`
- `payment.create`
- `payment.update`
- `payment.confirm`
- `payment.exception`
- `payment.refund`

数据权限：

- 回款计划必须关联合同。
- 到账流水必须关联合同，可选关联回款计划。
- 客户和商机从合同带入。
- 列表和详情的数据权限复用合同关联客户/商机的数据权限。

## 7. 与已有模块关系

与合同：

- 回款计划必须关联合同。
- 付款条件、合同金额、客户和商机从合同带入。
- 合同详情后续可展示回款摘要和跳转入口。

与开票：

- 回款列表可展示合同有效已开票金额，用于判断“已开票未回款”风险。
- 本模块不要求回款必须先有发票；是否按发票核销由模块 6 处理。

与核销：

- 已确认到账流水是模块 6 核销工作台的来源。
- `crm_payments.reconciled_amount` 由模块 6 更新，本模块只展示，不主动修改。

与销售行动：

- V2 首轮回款跟进保存在回款模块内。
- 模块 7 做客户/商机 V2 入口联动时，可再决定是否把回款跟进同步为销售行动或提醒。

## 8. 验收标准

后端验收：

- Flyway migration 创建 `crm_receivable_plans`、`crm_payments`、`crm_receivable_follow_ups` 和权限点。
- 可以创建、查询、编辑、终止回款计划。
- 可以登记、编辑、确认、异常、退款到账流水。
- 回款计划详情能计算已确认到账金额、未回款金额和逾期天数。
- 已退款和异常未确认流水不计入有效回款金额。
- 数据权限复用关联合同，越权用户看不到回款计划和流水。
- 关键动作写入审计日志。

前端验收：

- `回款管理` 菜单可进入。
- 列表展示计划金额、已回款、未回款、状态、逾期天数。
- 详情抽屉展示合同口径、到账流水、跟进记录、附件和后续核销入口。
- 支持新建/编辑计划、登记到账、确认到账、登记异常、退款、添加跟进。
- 支持回款计划和到账流水附件增删下载。
- 服务端异常有明确错误提示，不出现页面崩溃。

自动化验收：

- Migration 测试覆盖表和权限点。
- Controller 测试覆盖计划、流水、确认、异常、退款、跟进、数据权限。
- Attachment 测试覆盖 `receivable_plan` 和 `payment` 对象类型。
- OpenAPI 覆盖所有新增 `/api` 端点。
- 前端测试覆盖菜单、列表、详情和核心动作入口。
- `npm run build` 通过。
- 浏览器 UAT 验证 `/receivables` 页面核心链路，控制台无应用错误。

## 9. 不做范围

- 不做银行流水自动导入。
- 不做发票与回款多对多核销明细。
- 不做复杂退款审批。
- 不做财务总账、ERP 或银行接口。
- 不做经营驾驶舱 BI。
- 不做 AI 回款预测。

