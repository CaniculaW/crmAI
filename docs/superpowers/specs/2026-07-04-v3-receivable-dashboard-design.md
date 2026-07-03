# V3 回款看板设计说明

日期：2026-07-04

分支：`codex/v3-management-dashboard`

关联 TODO：`docs/product/crm-v3-development-todolist.md`

## 1. 模块目标

回款看板是 V3 的第五个专题看板，入口为 `/dashboard/receivables`。它不替代现有 `/receivables` 回款管理页，也不替代 `/reconciliations` 核销工作台，而是面向管理层、销售负责人和财务负责人回答六个问题：

- 当前计划应收、已确认回款、未收金额和逾期金额分别是多少。
- 本季度现金回收是否跟上合同付款计划。
- 哪些回款计划已经逾期，哪些即将到期。
- 已到账流水中有多少尚未核销，会不会影响收入/回款闭环。
- 哪些到账存在异常、退款或未分配到回款计划。
- 管理者应该下钻到哪些回款计划、到账流水或核销记录继续处理。

本模块的核心不是录入回款，而是把 V2 已有回款计划、到账流水、核销状态转成可解释、可下钻、可追责的现金回收视图。

## 2. 推荐方案

采用 B：专题看板 + 回款/核销下钻。

| 方案 | 内容 | 优点 | 风险 |
|---|---|---|---|
| A | 在 `/receivables` 列表顶部增加统计区 | 改动小 | 管理层视角会被操作表格淹没，难以承接 V3 驾驶舱链路 |
| B | 新增 `/dashboard/receivables` 专题页，聚合后下钻到 `/receivables`、`/payments`、`/reconciliations` | 职责清晰，延续 V3 专题看板模式，便于后续风险预警复用 | 需要新增权限、聚合 API 和导航入口 |
| C | 一次做回款、到账、核销、风险全景页 | 链路完整 | 范围过大，会和后续风险预警模块重叠 |

采用 B 的原因：

- V2 已经有回款计划、到账流水、回款跟进、附件和核销工作台。
- V3 当前模块只需要判断“现金回收、逾期和核销质量”，后续跨域风险清单交给风险预警模块。
- 专题页可以保持高信息密度，并把异常项下钻回业务页面处理。

## 3. 页面定位

新增页面：

- 菜单名称：`回款看板`
- 路由：`/dashboard/receivables`
- 权限：`dashboard.receivables.read`
- 数据来源权限：`receivable.read`、`payment.read`、`reconciliation.read`

现有页面职责保持不变：

| 页面 | 主要用户 | 目的 |
|---|---|---|
| `/receivables` | 财务、销售、商务 | 维护回款计划、到账、跟进和附件 |
| `/reconciliations` | 财务 | 发票与到账核销 |
| `/dashboard` | 管理层 | 全局经营健康度 |
| `/dashboard/invoices` | 管理层、销售负责人、财务负责人 | 开票执行效率、缺口、异常、签收风险 |
| `/dashboard/receivables` | 管理层、销售负责人、财务负责人 | 现金回收、逾期、到账、核销质量和下钻 |

## 4. 页面布局

页面保持后台管理系统的信息密度，不做大屏动画和复杂报表设计器。

```text
回款看板
├─ 顶部筛选
│  ├─ 时间范围：计划回款日 planned_receivable_date
│  ├─ 组织
│  ├─ 负责人
│  ├─ 客户
│  ├─ 商机
│  ├─ 合同
│  ├─ 回款状态
│  └─ 逾期优先
├─ 关键指标
│  ├─ 计划应收金额
│  ├─ 已确认回款
│  ├─ 未收金额
│  ├─ 逾期金额
│  ├─ 待核销到账
│  └─ 未分配到账
├─ 回款状态分布
│  └─ planned / partial / received / overdue / terminated
├─ 回款缺口趋势
│  └─ 按月份展示计划应收、已确认回款、未收缺口
├─ 到账与核销概览
│  ├─ 到账登记
│  ├─ 已确认到账
│  ├─ 部分核销
│  ├─ 已核销
│  ├─ 异常到账
│  └─ 退款
└─ 重点关注回款
   ├─ 大额逾期未收
   ├─ 30 天内到期未收
   ├─ 已开票未回款
   ├─ 到账未核销
   └─ 未分配到账
```

首屏优先级：

- 第一行先看计划应收、已收、未收、逾期和待核销。
- 第二行看回款状态分布与缺口趋势，判断现金回收是否跟上计划。
- 第三行看到账核销质量和重点关注回款，直接下钻到回款或核销明细。

## 5. 指标口径

默认筛选：

- 未传 `date_from/date_to` 时，金额类指标默认当前自然季度。
- 回款计划相关时间字段使用 `planned_receivable_date`，因为本看板关注计划回款到实际回收的执行效率。
- 到账流水相关时间字段使用 `received_at`，用于到账与核销概览。
- 仅统计 `deleted_at is null` 的回款计划、到账流水和核销记录。
- 数据权限沿用 V2 数据权限，首版复用 `DataPermissionService` 的回款、到账、核销负责人/客户组织范围。

### 5.1 回款计划状态映射

沿用 V2 回款状态编码：

| 编码 | 展示名 | 管理含义 |
|---|---|---|
| `planned` | 计划中 | 已有回款计划，尚未确认到账 |
| `partial` | 部分回款 | 已确认部分到账，仍有未收金额 |
| `received` | 已回款 | 计划金额已完成回收 |
| `overdue` | 已逾期 | 到期未完成回收 |
| `terminated` | 已终止 | 回款计划被终止，不计入有效待收 |

### 5.2 到账状态映射

沿用 V2 到账状态编码：

| 编码 | 展示名 | 管理含义 |
|---|---|---|
| `registered` | 已登记 | 已登记到账流水，待确认到账金额 |
| `confirmed` | 已确认 | 到账金额已确认，待核销 |
| `partially_reconciled` | 部分核销 | 已核销部分金额 |
| `reconciled` | 已核销 | 到账已完全核销 |
| `exception` | 异常 | 到账存在异常原因 |
| `refunded` | 已退款 | 到账已退款，不计入有效回收 |

### 5.3 关键指标

| 指标 | 口径 | 下钻 |
|---|---|---|
| 计划应收金额 | 筛选范围内 `crm_receivable_plans.sum(planned_amount)`，排除 `terminated` | `/receivables?date_from=<date_from>&date_to=<date_to>` |
| 已确认回款 | 有效到账状态 `confirmed/partially_reconciled/reconciled` 的 `sum(confirmed_amount)` | `/receivables?received=true` |
| 未收金额 | 回款计划维度 `sum(max(planned_amount - confirmed_received_amount, 0))`，排除 `terminated` | `/receivables?unreceived=true` |
| 逾期金额 | `receivable_status = 'overdue'` 或计划日早于当前时间且未完成回收的未收金额 | `/receivables?receivable_status=overdue` |
| 待核销到账 | 有效到账状态下 `sum(confirmed_amount - reconciled_amount)` | `/reconciliations?pending_only=true` |
| 未分配到账 | `receivable_plan_id is null` 且有效到账状态下的未核销金额 | `/payments?unallocated_only=true` |

说明：

- `confirmed_received_amount`、`unreceived_amount`、`unreconciled_payment_amount` 已在 `ReceivablePlanResponse` 中存在，但看板后端应直接从数据库聚合，避免依赖前端列表二次计算。
- 已确认回款以到账流水为现金口径；回款计划的“已收/未收”用于计划完成度口径。
- 退款状态 `refunded` 不计入已确认回款和待核销到账。

### 5.4 回款状态分布

每个状态返回：

- 状态编码。
- 状态名称。
- 回款计划数。
- 计划应收金额。
- 已确认回款金额。
- 未收金额。
- 下钻 URL。

### 5.5 回款缺口趋势

按 `planned_receivable_date` 月份聚合：

- `period`：`YYYY-MM`
- `planned_amount`
- `received_amount`
- `gap_amount`
- `receivable_count`

`received_amount` 只统计关联到对应回款计划的有效到账确认金额；未关联计划的到账进入“未分配到账”指标，不冲抵回款计划缺口。

### 5.6 到账与核销概览

按照到账/核销动作聚合：

- `registered`：已登记但未确认的到账。
- `confirmed_unreconciled`：已确认但未核销金额大于 0。
- `partially_reconciled`：部分核销。
- `reconciled`：完全核销。
- `payment_exception`：到账异常。
- `refunded`：已退款。

每个分组返回数量、金额、风险级别和下钻 URL。

### 5.7 重点关注回款

排序规则：

1. 大额逾期未收优先。
2. 30 天内到期且未收金额大于 0 优先。
3. 已开票但未确认回款优先。
4. 到账未核销金额大优先。
5. 未分配到账优先。

返回不超过 8 条记录，每条包含对象类型、对象 ID、名称、客户、商机、合同、负责人、金额、状态、日期、原因和下钻 URL。

对象类型：

- `receivable_plan`：下钻 `/receivables?receivable_plan_id=<id>`。
- `payment`：下钻 `/reconciliations?payment_id=<id>` 或 `/payments?payment_id=<id>`。

## 6. API 设计

新增 API：

`GET /api/dashboard/receivables`

查询参数：

- `date_from`
- `date_to`
- `department_id`
- `owner_id`
- `account_id`
- `opportunity_id`
- `contract_id`
- `receivable_status`
- `overdue_only`

响应结构：

```json
{
  "filters": {
    "date_from": "2026-07-01",
    "date_to": "2026-09-30"
  },
  "metric_cards": [
    {
      "key": "planned_receivable_amount",
      "label": "计划应收金额",
      "value": 800000.00,
      "unit": "CNY",
      "drilldown_url": "/receivables?date_from=2026-07-01&date_to=2026-09-30"
    }
  ],
  "status_distribution": [
    {
      "status": "overdue",
      "label": "已逾期",
      "count": 2,
      "planned_amount": 300000.00,
      "received_amount": 60000.00,
      "unreceived_amount": 240000.00,
      "drilldown_url": "/receivables?receivable_status=overdue"
    }
  ],
  "gap_trend": [
    {
      "period": "2026-07",
      "planned_amount": 300000.00,
      "received_amount": 180000.00,
      "gap_amount": 120000.00,
      "receivable_count": 4
    }
  ],
  "reconciliation_summary": [
    {
      "key": "confirmed_unreconciled",
      "label": "待核销到账",
      "count": 3,
      "amount": 120000.00,
      "level": "medium",
      "drilldown_url": "/reconciliations?pending_only=true"
    }
  ],
  "attention_receivables": [
    {
      "object_type": "receivable_plan",
      "object_id": 601,
      "title": "首付款回款",
      "account_id": 1,
      "opportunity_id": 10,
      "contract_id": 301,
      "owner_user_id": 1001,
      "status": "overdue",
      "amount": 240000.00,
      "planned_at": "2026-07-20T10:00:00+08:00",
      "reason": "大额逾期未收",
      "drilldown_url": "/receivables?receivable_plan_id=601"
    }
  ]
}
```

## 7. 后端实现边界

新增或扩展后端包：

- `com.canicula.crmai.dashboard`

建议新增记录类型：

- `DashboardReceivableFilter`
- `DashboardReceivableResponse`
- `DashboardReceivableStatusItem`
- `DashboardReceivableGapTrendPoint`
- `DashboardReconciliationSummary`
- `DashboardAttentionReceivable`

建议扩展：

- `DashboardController`
  - `GET /api/dashboard/receivables`
  - 权限：`@RequirePermission("dashboard.receivables.read")`
- `DashboardService`
  - `receivables(Long userId, DashboardReceivableFilter filter)`
  - 复用 `RECEIVABLE_COLUMNS`、`PAYMENT_COLUMNS`、`RECONCILIATION_COLUMNS`
  - 复用 `access(...)` 和 `DataPermissionService`

新增迁移：

- `V25__create_dashboard_receivable_permissions.sql`
  - `dashboard.receivables.read`
  - 权限名称：`查看回款看板`
  - 模块：`dashboard`

## 8. 前端实现边界

新增或扩展：

- `frontend/src/api/crm.ts`
  - `DashboardReceivables` 类型。
  - `crmApi.dashboard.receivables(...)`。
- `frontend/src/App.tsx`
  - 驾驶舱子菜单新增 `回款看板`。
  - 新增路由 `/dashboard/receivables`。
  - 新增页面 `DashboardReceivablesPage`。
  - 复用 `DashboardMetricCardView`、`currencyText`、`dateText`、`receivableStatusText`、`paymentStatusText`。
- `frontend/src/styles.css`
  - 复用 `dashboard-funnel__layout` 和专题看板行样式。
  - 仅补少量 `dashboard-receivables__*` 类。

页面不新增复杂图表库，首版使用列表、条形进度、趋势行和可点击风险行，保持和漏斗、合同、开票看板一致。

## 9. 下钻规则

| 来源 | 下钻 |
|---|---|
| 计划应收金额 | `/receivables?date_from=<date_from>&date_to=<date_to>` |
| 已确认回款 | `/receivables?received=true` |
| 未收金额 | `/receivables?unreceived=true` |
| 逾期金额 | `/receivables?receivable_status=overdue` |
| 待核销到账 | `/reconciliations?pending_only=true` |
| 未分配到账 | `/payments?unallocated_only=true` |
| 回款状态分布 | `/receivables?receivable_status=<status>` |
| 到账异常 | `/payments?exception_only=true` |
| 重点关注回款计划 | `/receivables?receivable_plan_id=<id>` |
| 重点关注到账 | `/reconciliations?payment_id=<id>` |

如果现有页面暂未消费某些查询参数，首版仍保留下钻 URL 契约；后续风险预警模块可补齐筛选消费。

## 10. 验收标准

自动化验证：

- 后端：
  - 权限迁移测试覆盖 `dashboard.receivables.read`。
  - `DashboardControllerTest` 覆盖回款看板响应结构、指标口径和 403 权限。
  - `OpenApiContractCoverageTest` 覆盖 `/api/dashboard/receivables`。
  - `PostgresMigrationIT` 验证最新 Flyway 版本。
- 前端：
  - `App.test.tsx` 覆盖 `/dashboard/receivables` 页面标题、指标卡、状态分布、趋势、核销概览、重点关注回款和 API 调用。
  - `npm run build` 通过。

浏览器 UAT：

- 打开 `http://127.0.0.1:5175/dashboard/receivables`。
- 页面显示：
  - `回款看板`
  - `计划应收金额`
  - `回款状态分布`
  - `回款缺口趋势`
  - `到账与核销概览`
  - `重点关注回款`
- 后端无服务端异常。
- 浏览器控制台无应用错误。
- 截图保存到 `docs/testing/evidence/artifacts/v3-receivable-dashboard-uat-20260704.png`。

## 11. 不做范围

本模块不做：

- 不做银行流水自动导入。
- 不做 ERP/银行/税控外部集成。
- 不做核销规则引擎。
- 不做复杂 BI 自定义报表。
- 不改动 V2 回款、到账和核销的录入流程。
- 不把风险预警模块提前做成全局风险中心。

## 12. 实施顺序

推荐实施顺序：

1. 新增 `dashboard.receivables.read` 权限迁移和迁移测试。
2. 后端新增 `/api/dashboard/receivables` 聚合 API。
3. 补 OpenAPI 契约。
4. 前端新增 `/dashboard/receivables` 页面和导航。
5. 跑后端、前端、构建和 Postgres 验证。
6. 浏览器 UAT 留证。
7. 更新 V3 TODOList，模块 7 Done，模块 8 风险预警 Current。

