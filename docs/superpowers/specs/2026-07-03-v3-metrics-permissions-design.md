# V3 指标口径与数据权限设计说明

日期：2026-07-03

分支：`codex/v3-management-dashboard`

关联 TODO：`docs/product/crm-v3-development-todolist.md`

## 1. 模块目标

本模块为 V3 经营驾驶舱建立统一指标字典和数据权限口径。后续经营总览、销售漏斗、合同看板、开票看板、回款看板和风险预警都必须基于这套口径实现，避免每个页面各算各的。

模块完成后，应能回答：

- 每个指标从哪张表、哪个字段计算。
- 金额、状态、时间、风险如何过滤。
- 不同角色能看到哪些统计范围。
- 指标异常时可以下钻到哪些业务对象。
- 自动化测试如何证明口径正确。

## 2. 数据源

V3 首版不新建业务主表，基于 V1/V2 已有表聚合。

| 业务域 | 表 | 核心字段 |
|---|---|---|
| 客户 | `crm_accounts` | `id`、`owner_user_id`、`owner_department_id` |
| 商机 | `crm_opportunities` | `stage`、`status`、`estimated_contract_amount`、`expected_close_date`、`risk_status`、`last_activity_at`、`owner_user_id`、`owner_department_id`、`close_type`、`closed_at` |
| 合同 | `crm_contracts` | `contract_status`、`contract_amount`、`signed_at`、`ended_at`、`risk_level`、`owner_user_id` |
| 合同节点 | `crm_contract_milestones` | `planned_at`、`actual_at`、`status` |
| 开票 | `crm_invoices` | `invoice_status`、`planned_invoice_date`、`planned_amount`、`actual_invoice_amount`、`invoice_date`、`exception_type`、`reconciled_amount`、`owner_user_id` |
| 回款计划 | `crm_receivable_plans` | `receivable_status`、`planned_receivable_date`、`planned_amount`、`owner_user_id` |
| 到账流水 | `crm_payments` | `payment_status`、`received_at`、`received_amount`、`confirmed_amount`、`reconciled_amount`、`owner_user_id` |
| 核销 | `crm_reconciliations` | `reconciliation_status`、`reconciled_amount`、`reconciled_at`、`reconciled_by` |

统一过滤：

- 所有表默认排除 `deleted_at is not null` 的记录。
- 业务指标默认按 `tenant_id = 1` 过滤，后续多租户再扩展。
- 所有金额以人民币元为单位，保留 2 位小数。

## 3. 通用筛选维度

所有 V3 Dashboard API 支持同一组筛选参数：

| 参数 | 含义 | 应用方式 |
|---|---|---|
| `date_from` | 统计开始日期 | 包含当天 00:00:00 |
| `date_to` | 统计结束日期 | 包含当天 23:59:59 |
| `department_id` | 组织范围 | 与数据权限取交集，不扩大权限 |
| `owner_id` | 负责人 | 与数据权限取交集，不扩大权限 |
| `account_id` | 客户 | 过滤客户、商机、合同、开票、回款、到账、核销 |
| `opportunity_id` | 商机 | 过滤商机关联的 V2 对象 |

默认时间：

- 未传 `date_from/date_to` 时，经营总览默认当前自然月。
- 漏斗和风险预警默认不强制限制创建时间，但预测类指标使用 `expected_close_date`。
- 趋势图默认当前自然年按月聚合。

## 4. 核心指标字典

### 4.1 经营总览指标

| 指标 | 口径 | 时间字段 | 下钻目标 |
|---|---|---|---|
| 预测金额 | `sum(crm_opportunities.estimated_contract_amount)`，仅统计未删除、非关闭失败、非取消跟进商机 | `expected_close_date` | `/opportunities` |
| 赢单金额 | `sum(estimated_contract_amount)`，`close_type = 'won'` | `closed_at` | `/opportunities?close_type=won` |
| 合同金额 | `sum(crm_contracts.contract_amount)`，排除已终止合同 | `signed_at`，为空时用 `created_at` | `/contracts` |
| 已开票金额 | `sum(coalesce(actual_invoice_amount, 0))`，发票状态为已开具或已签收 | `invoice_date` | `/invoices` |
| 应收金额 | `sum(crm_receivable_plans.planned_amount)`，排除已终止计划 | `planned_receivable_date` | `/receivables` |
| 已回款金额 | `sum(crm_payments.confirmed_amount)`，仅统计已确认到账 | `confirmed_at`，为空时用 `received_at` | `/receivables` |
| 逾期金额 | 到期日早于当前日期且未完成回款计划的剩余金额，首版按 `planned_amount` 统计 | `planned_receivable_date` | `/receivables?overdue=true` |
| 已核销金额 | `sum(crm_reconciliations.reconciled_amount)`，仅统计有效核销 | `reconciled_at` | `/reconciliations` |
| 未核销回款 | `sum(confirmed_amount - reconciled_amount)`，仅统计已确认到账且差额大于 0 | `confirmed_at`，为空时用 `received_at` | `/reconciliations` |
| 风险数 | 商机停滞、合同节点逾期、开票异常、回款逾期、核销异常合计 | 各风险对象对应日期 | `/dashboard/risks` |

### 4.2 销售漏斗指标

| 指标 | 口径 | 下钻目标 |
|---|---|---|
| 阶段商机数 | 按 `crm_opportunities.stage` 分组统计未删除商机数量 | `/opportunities?stage=<stage>` |
| 阶段预测金额 | 按 `stage` 分组汇总 `estimated_contract_amount` | `/opportunities?stage=<stage>` |
| 加权预测金额 | `estimated_contract_amount * win_rate`，`win_rate` 为空时按阶段默认概率处理 | `/opportunities` |
| 停滞商机数 | `last_activity_at` 早于当前日期 14 天以上且状态仍在跟进中的商机 | `/opportunities?stalled=true` |
| 高风险商机数 | `risk_status` 为高风险或等价字典值 | `/opportunities?risk=high` |

阶段默认概率：

| 阶段类型 | 默认概率 |
|---|---:|
| 线索/初步接触 | 0.10 |
| 需求确认 | 0.25 |
| 方案/报价 | 0.45 |
| 商务谈判 | 0.65 |
| 合同准备 | 0.85 |
| 已赢单 | 1.00 |

如果实际字典值与以上名称不同，实现时按字典编码建立映射，不在前端硬编码中文名称。

### 4.3 合同指标

| 指标 | 口径 | 下钻目标 |
|---|---|---|
| 有效合同数 | 排除已终止、已删除合同 | `/contracts` |
| 有效合同金额 | `sum(contract_amount)`，排除已终止、已删除合同 | `/contracts` |
| 合同状态分布 | 按 `contract_status` 分组统计数量与金额 | `/contracts?status=<status>` |
| 节点逾期数 | `planned_at < now()` 且 `actual_at is null` 且状态未完成的节点 | `/contracts` |
| 高风险合同数 | `risk_level` 为高风险或等价字典值 | `/contracts?risk=high` |

### 4.4 开票指标

| 指标 | 口径 | 下钻目标 |
|---|---|---|
| 计划开票金额 | `sum(planned_amount)`，排除已作废、已删除发票计划 | `/invoices` |
| 已开票金额 | `sum(actual_invoice_amount)`，状态为已开具或已签收 | `/invoices` |
| 待开票金额 | 计划开票金额减已开票金额，最低为 0 | `/invoices?status=pending` |
| 开票异常数 | `exception_type is not null` 且未删除 | `/invoices?has_exception=true` |
| 作废金额 | 状态为作废或 `voided_at is not null` 的实际开票金额 | `/invoices?status=voided` |

### 4.5 回款与核销指标

| 指标 | 口径 | 下钻目标 |
|---|---|---|
| 应收金额 | `sum(crm_receivable_plans.planned_amount)`，排除终止与删除 | `/receivables` |
| 已确认回款 | `sum(crm_payments.confirmed_amount)`，状态为已确认或 `confirmed_at is not null` | `/receivables` |
| 回款率 | 已确认回款 / 应收金额，应收为 0 时返回 0 | `/receivables` |
| 逾期回款计划数 | `planned_receivable_date < now()` 且状态未完成、未终止 | `/receivables?overdue=true` |
| 未核销到账金额 | `sum(confirmed_amount - reconciled_amount)`，差额大于 0 | `/reconciliations` |
| 核销率 | 已核销金额 / 已确认回款，已确认回款为 0 时返回 0 | `/reconciliations` |

## 5. 风险口径

V3 首版统一输出风险列表，每条风险都包含：

- `risk_type`
- `risk_level`
- `title`
- `amount`
- `owner_user_id`
- `account_id`
- `opportunity_id`
- `object_type`
- `object_id`
- `occurred_at`
- `drilldown_url`

风险类型：

| 风险类型 | 触发条件 | 默认等级 | 下钻目标 |
|---|---|---|---|
| 商机停滞 | 跟进中商机 `last_activity_at` 超过 14 天无更新 | Medium | `/opportunities` |
| 高风险商机 | `risk_status` 为高风险 | High | `/opportunities` |
| 合同节点逾期 | 合同节点计划时间已过且未完成 | High | `/contracts` |
| 高风险合同 | `risk_level` 为高风险 | High | `/contracts` |
| 开票异常 | `exception_type is not null` | Medium | `/invoices` |
| 回款逾期 | 回款计划到期且未完成 | High | `/receivables` |
| 未核销回款 | 已确认到账金额存在未核销余额 | Medium | `/reconciliations` |

## 6. 数据权限口径

V3 不单独发明权限模型，沿用现有 `DataPermissionService`：

- `global`：可看授权模块全量数据。
- `own`：仅看本人负责数据。
- `department`：看本人所属部门数据。
- `department_tree`：看本人部门及下级部门数据。
- `collaborated`：看本人协作数据，适用于商机等有协作表的对象。

Dashboard 聚合权限原则：

- 总览指标不能绕过明细权限。
- 聚合范围是各业务域明细权限过滤后的结果。
- 页面筛选条件只能缩小权限范围，不能扩大权限范围。
- 如果一个用户没有某业务域的 read 权限，该业务域指标返回空值或不展示，不返回未授权聚合数。

模块权限建议：

| V3 页面 | 需要权限 | 数据来源权限 |
|---|---|---|
| 经营总览 | `dashboard.read` | 按各业务域 read 权限分别聚合 |
| 销售漏斗 | `dashboard.funnel.read` | `opportunity.read` |
| 合同看板 | `dashboard.contract.read` | `contract.read` |
| 开票看板 | `dashboard.invoice.read` | `invoice.read` |
| 回款看板 | `dashboard.receivable.read` | `receivable.read`、`payment.read`、`reconciliation.read` |
| 风险预警 | `dashboard.risk.read` | 按风险对象对应 read 权限过滤 |

首版角色建议：

- 管理层：授予全部 V3 read 权限，数据范围使用 `department_tree` 或 `global`。
- 销售负责人：授予经营总览、销售漏斗、风险预警，数据范围使用 `department_tree`。
- 销售：授予经营总览、销售漏斗、风险预警，数据范围使用 `own` 与 `collaborated`。
- 商务/法务：授予经营总览、合同看板、风险预警，数据范围按合同授权。
- 财务：授予经营总览、开票看板、回款看板、风险预警，数据范围按财务授权。

## 7. API 验收口径

后续实现时，建议先新增以下响应模型和测试：

- `DashboardOverviewResponse`
- `DashboardMetricCard`
- `DashboardBusinessFlow`
- `DashboardRiskItem`
- `DashboardTrendPoint`
- `DashboardFilter`

基础 API：

- `GET /api/dashboard/overview`
- `GET /api/dashboard/funnel`
- `GET /api/dashboard/contracts`
- `GET /api/dashboard/invoices`
- `GET /api/dashboard/receivables`
- `GET /api/dashboard/risks`

测试必须覆盖：

- 管理员可看到全量演示指标。
- 销售只能看到本人或协作商机相关指标。
- 财务能看开票、回款、核销指标，但不能看到未授权销售对象。
- 无 `dashboard.read` 权限返回 403。
- 筛选 `date_from/date_to` 后指标收窄。
- 风险列表每条记录都有合法 `drilldown_url`。

## 8. 模块完成标准

本模块完成条件：

- 指标字典已明确到表、字段、状态和时间口径。
- 数据权限口径已明确到页面权限和业务域权限。
- V3 后续 API 的响应模型方向清楚。
- 自动化测试验收点清楚。
- 沈思维确认后，进入模块 3「经营驾驶舱总览」。
