# V2 发票回款核销链路设计说明

日期：2026-06-30

## 1. 设计目标

模块 6「发票回款核销链路」承接开票管理和回款管理，回答三件事：

1. 哪些已开票/已签收发票还没有核销完。
2. 哪些已确认到账流水还没有分配完。
3. 财务如何把一笔或多笔回款分配到一张或多张发票，并在需要时撤销核销。

本模块不是银行自动对账、总账凭证、ERP 回写或复杂审批流。V2 首轮目标是建立可追溯的手工核销工作台，让财务能在 CRM 内完成发票与到账流水的多对多金额分配，并让开票、回款、合同金额口径同步。

## 2. 已确认方案

采用方案 B：独立核销工作台。

备选方案：

| 方案 | 形态 | 优点 | 风险 |
|---|---|---|---|
| A | 在开票详情或回款详情内放核销按钮 | 开发轻，入口少 | 多对多关系被拆散，财务难以批量处理 |
| B | 独立核销工作台 | 最符合专业财务后台；发票、回款、核销明细在一个视图内闭环 | 需要新增页面、数据模型和汇总口径 |
| C | 自动匹配优先，人工确认 | 体验高级 | V2 首轮需要银行流水规则、客户主体映射，范围过大 |

推荐并采用 B。V2 首轮先做手工核销、撤销核销、金额校验和审计；自动匹配放到 V3/V4。

导航：

- 当前前端先新增一级菜单：`核销工作台`。
- 后续财务分组落地时，`开票管理`、`回款管理`、`核销工作台` 统一归入 `财务` 一级菜单。

## 3. 页面逻辑

### 3.1 核销工作台

工作台以合同为主筛选维度，帮助财务把同一客户、同一合同下的发票和到账流水放在一起处理。

页面分区：

- 顶部筛选区：关键词、客户、合同、发票状态、到账状态、只看待核销。
- 摘要区：合同金额、有效开票金额、已核销金额、待核销发票金额、已确认回款金额、待分配回款金额。
- 待核销发票区：展示已开票/已签收且 `actual_invoice_amount > reconciled_amount` 的发票。
- 待分配回款区：展示已确认/部分核销且 `confirmed_amount > reconciled_amount` 的到账流水。
- 核销编辑区：选择发票、选择回款、输入核销金额、填写核销说明。
- 核销明细区：展示历史核销记录、来源发票、来源回款、核销金额、核销人、核销时间、撤销状态。

主操作：

- 新增核销。
- 查看核销明细。
- 撤销核销。
- 刷新金额口径。

### 3.2 新增核销

新增核销用于把一笔回款的一部分或全部分配到一张发票。

必填字段：

- `invoice_id`
- `payment_id`
- `reconciled_amount`
- `reconciled_at`

建议填写：

- `reconcile_note`

规则：

- 发票必须处于 `invoiced` 或 `signed` 状态。
- 到账流水必须处于 `confirmed` 或 `partially_reconciled` 状态。
- 发票和回款必须属于同一合同。
- 核销金额必须大于 0。
- 核销金额不能超过发票剩余未核销金额。
- 核销金额不能超过回款剩余未分配金额。
- 新增核销后，发票 `reconciled_amount` 增加，回款 `reconciled_amount` 增加。
- 回款状态按剩余金额自动更新：部分核销为 `partially_reconciled`，全额核销为 `reconciled`。

### 3.3 撤销核销

撤销核销用于处理误核销或客户/财务重新分配。

必填字段：

- `void_reason`

规则：

- 只能撤销未撤销的核销明细。
- 撤销后，核销明细标记为 `voided`，记录撤销人、撤销时间和撤销原因。
- 撤销后，发票 `reconciled_amount` 减少，回款 `reconciled_amount` 减少。
- 回款状态按撤销后的已核销金额自动更新。
- 撤销动作必须写审计。

## 4. 数据模型

新增迁移 `V19__create_reconciliations.sql`。

修改 `crm_invoices`：

- 新增 `reconciled_amount numeric(18,2) not null default 0`。
- 增加约束：`reconciled_amount >= 0`。
- 增加约束：`reconciled_amount <= actual_invoice_amount`，实际开票金额为空时允许为 0。

新增 `crm_reconciliations`：

- `id`
- `tenant_id`
- `account_id`
- `opportunity_id`
- `contract_id`
- `invoice_id`
- `payment_id`
- `reconciliation_no`
- `reconciliation_status`
- `reconciled_amount`
- `reconciled_at`
- `reconciled_by`
- `reconcile_note`
- `void_reason`
- `voided_at`
- `voided_by`
- `created_at`
- `updated_at`
- `deleted_at`
- `version`

状态：

- `active`：有效核销。
- `voided`：已撤销。

权限点：

- `reconciliation.read`
- `reconciliation.create`
- `reconciliation.void`

附件：

- V2 首轮不新增核销附件对象。核销依据沿用发票附件和回款附件。

## 5. 金额口径

发票侧：

- `invoice_amount = actual_invoice_amount`。
- `invoice_reconciled_amount = crm_invoices.reconciled_amount`。
- `invoice_unreconciled_amount = actual_invoice_amount - reconciled_amount`。
- `voided` 发票不进入待核销列表。

回款侧：

- `payment_amount = confirmed_amount`。
- `payment_reconciled_amount = crm_payments.reconciled_amount`。
- `payment_unreconciled_amount = confirmed_amount - reconciled_amount`。
- `refunded`、`exception`、`registered` 回款不进入待分配列表。

合同侧：

- `effective_invoiced_amount = sum(actual_invoice_amount) where invoice_status in ('invoiced','signed')`。
- `confirmed_received_amount = sum(confirmed_amount) where payment_status in ('confirmed','partially_reconciled','reconciled')`。
- `reconciled_amount = sum(active crm_reconciliations.reconciled_amount)`。
- `unreconciled_invoice_amount = effective_invoiced_amount - reconciled_amount`。
- `unallocated_payment_amount = confirmed_received_amount - reconciled_amount`。

## 6. API 契约

新增后端包：`com.canicula.crmai.reconciliation`。

接口：

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/reconciliations/workbench` | 查询核销工作台汇总、待核销发票、待分配回款 | `reconciliation.read` |
| GET | `/api/reconciliations` | 查询核销明细 | `reconciliation.read` |
| GET | `/api/reconciliations/{id}` | 查看核销明细详情 | `reconciliation.read` |
| POST | `/api/reconciliations` | 新增核销 | `reconciliation.create` |
| POST | `/api/reconciliations/{id}/void` | 撤销核销 | `reconciliation.void` |

数据权限：

- 所有核销操作通过关联合同继承客户/商机数据权限。
- 列表隐藏无权合同下的数据。
- 详情和动作对无权数据返回不可访问。

## 7. 前端设计

新增页面：`ReconciliationWorkbenchPage`。

页面控件：

- 筛选栏：关键词、客户、合同、只看待核销。
- 概览指标：有效开票、已确认回款、已核销、待核销发票、待分配回款。
- 待核销发票表：发票号、客户、合同、实际开票金额、已核销、未核销、状态。
- 待分配回款表：流水名称、客户、合同、确认金额、已核销、未核销、到账时间、状态。
- 核销表单：发票、回款、核销金额、核销时间、说明。
- 核销明细表：核销编号、发票、回款、金额、状态、时间、操作。

前端行为：

- 选择发票和回款后，默认核销金额为两者未核销金额的较小值。
- 超过任一剩余金额时，前端提示，后端仍做最终校验。
- 撤销核销必须填写原因。
- 创建/撤销后刷新工作台和核销明细。

## 8. 验收标准

自动化：

- Flyway H2 和 PostgreSQL 迁移通过。
- `ReconciliationControllerTest` 覆盖新增、列表、详情、撤销、金额越界、合同不一致、数据权限。
- `OpenApiContractCoverageTest` 覆盖新增接口。
- `npm test -- --run` 覆盖核销工作台页面和创建/撤销入口。
- `npm run build` 通过。

浏览器 UAT：

- `/reconciliations` 可以打开。
- 页面显示 `核销工作台`。
- UAT 发票出现在待核销发票表。
- UAT 回款出现在待分配回款表。
- 创建核销后，发票和回款未核销金额减少。
- 撤销核销后，金额恢复。
- 控制台无应用错误。

## 9. 不做事项

- 不做自动匹配规则。
- 不做银行流水导入。
- 不做 ERP/总账凭证。
- 不做复杂审批流。
- 不新增核销附件对象。
