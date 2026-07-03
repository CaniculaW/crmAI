# V3 开票看板设计说明

日期：2026-07-04

分支：`codex/v3-management-dashboard`

关联 TODO：`docs/product/crm-v3-development-todolist.md`

## 1. 模块目标

开票看板是 V3 的第四个专题看板，入口为 `/dashboard/invoices`。它不替代现有 `/invoices` 开票管理页，而是面向管理层、销售负责人和财务负责人回答六个问题：

- 当前计划开票、申请开票、实际开票和已签收金额分别是多少。
- 合同到开票是否存在缺口，哪些计划已经逾期未开。
- 已开票发票是否及时签收，是否影响后续回款和核销。
- 哪些开票记录处于异常或作废状态。
- 哪些客户、商机或合同形成了开票风险。
- 管理者应该下钻到哪些开票计划继续处理。

本模块的核心不是录入发票，而是把 V2 已有开票状态流转转成可解释、可下钻、可追责的管理视图。

## 2. 推荐方案

推荐采用 B：专题看板 + 开票明细下钻。

| 方案 | 内容 | 优点 | 风险 |
|---|---|---|---|
| A | 在 `/invoices` 列表顶部增加统计区 | 改动小 | 管理视角会被操作表格淹没，难以承接 V3 驾驶舱链路 |
| B | 新增 `/dashboard/invoices` 专题页，聚合后下钻到 `/invoices` | 职责清晰，延续 V3 专题看板模式，便于后续回款看板引用开票缺口 | 需要新增权限、聚合 API 和导航入口 |
| C | 一次做开票-回款-核销财务全景页 | 能展示完整现金链路 | 范围过大，会和后续回款看板、风险预警模块重叠 |

采用 B 的原因：

- V2 已经有开票计划、申请、开票、签收、异常、作废和附件能力。
- V3 当前模块只需要判断“开票执行效率和异常”，后续现金回收交给回款看板。
- 专题页可以保持高信息密度，并把风险项下钻回 `/invoices` 处理。

## 3. 页面定位

新增页面：

- 菜单名称：`开票看板`
- 路由：`/dashboard/invoices`
- 权限：`dashboard.invoices.read`
- 数据来源权限：`invoice.read`

现有页面职责保持不变：

| 页面 | 主要用户 | 目的 |
|---|---|---|
| `/invoices` | 财务、销售、商务 | 开票计划创建、申请、发票登记、签收、异常、作废和附件管理 |
| `/dashboard` | 管理层 | 全局经营健康度 |
| `/dashboard/contracts` | 管理层、销售负责人、交付负责人 | 合同资产与履约风险 |
| `/dashboard/invoices` | 管理层、销售负责人、财务负责人 | 开票执行效率、缺口、异常、签收风险和下钻 |

## 4. 页面布局

页面保持后台管理系统的信息密度，不做大屏动画和复杂报表设计器。

```text
开票看板
├─ 顶部筛选
│  ├─ 时间范围：计划开票日 planned_invoice_date
│  ├─ 组织
│  ├─ 负责人
│  ├─ 客户
│  ├─ 商机
│  ├─ 合同
│  ├─ 开票状态
│  └─ 异常优先
├─ 关键指标
│  ├─ 计划开票金额
│  ├─ 申请开票金额
│  ├─ 实际开票金额
│  ├─ 已签收金额
│  ├─ 待开票缺口
│  └─ 异常开票数
├─ 开票状态分布
│  └─ planned / applied / invoiced / signed / exception / voided
├─ 开票缺口趋势
│  └─ 按月份展示计划金额、实际开票金额、待开票缺口
├─ 签收与异常概览
│  ├─ 逾期未开
│  ├─ 已开未签收
│  ├─ 异常开票
│  └─ 已作废
└─ 重点关注开票
   ├─ 计划逾期未开
   ├─ 开票异常
   ├─ 已开未签收超过 7 天
   └─ 大金额待开票缺口
```

首屏优先级：

- 第一行先看计划、实际、缺口和异常数。
- 第二行看状态分布与缺口趋势，判断开票执行是否跟上合同计划。
- 第三行看重点关注开票，直接下钻到开票明细。

## 5. 指标口径

默认筛选：

- 未传 `date_from/date_to` 时，金额类指标默认当前自然季度。
- 时间字段使用 `planned_invoice_date`，因为本看板关注计划到实际的开票执行效率。
- 仅统计 `deleted_at is null` 的开票记录。
- 数据权限沿用开票相关业务对象权限，首版复用 `DataPermissionService` 的 `invoice.read` 和开票负责人/客户组织范围。

### 5.1 状态映射

沿用 V2 开票状态编码：

| 编码 | 展示名 | 管理含义 |
|---|---|---|
| `planned` | 计划中 | 已生成计划，尚未提交申请 |
| `applied` | 已申请 | 已提交开票申请，待财务登记发票 |
| `invoiced` | 已开票 | 已登记发票，待客户签收 |
| `signed` | 已签收 | 客户已签收，可进入回款/核销链路 |
| `exception` | 异常 | 开票受阻，需要处理原因和解决方案 |
| `voided` | 已作废 | 发票作废，不计入有效开票 |

### 5.2 关键指标

| 指标 | 口径 | 下钻 |
|---|---|---|
| 计划开票金额 | 筛选范围内 `sum(planned_amount)` | `/invoices?planned_from=<date_from>&planned_to=<date_to>` |
| 申请开票金额 | `sum(applied_amount)`，空值按 0 | `/invoices?invoice_status=applied` |
| 实际开票金额 | `invoice_status in ('invoiced','signed')` 的 `sum(actual_invoice_amount)` | `/invoices?invoice_status=invoiced` |
| 已签收金额 | `invoice_status = 'signed'` 的 `sum(actual_invoice_amount)` | `/invoices?invoice_status=signed` |
| 待开票缺口 | `计划开票金额 - 实际开票金额`，小于 0 时按 0 | `/invoices?invoice_gap=true` |
| 异常开票数 | `invoice_status = 'exception'` 的记录数 | `/invoices?exception_only=true` |

### 5.3 状态分布

每个状态返回：

- 状态编码。
- 状态名称。
- 开票记录数。
- 计划金额。
- 实际开票金额。
- 下钻 URL。

### 5.4 缺口趋势

按 `planned_invoice_date` 月份聚合：

- `period`：`YYYY-MM`
- `planned_amount`
- `invoiced_amount`
- `gap_amount`
- `invoice_count`

### 5.5 签收与异常概览

按照管理动作聚合：

- `overdue_unissued`：计划开票日早于当前时间，且状态不在 `invoiced/signed/voided`。
- `unsigned`：状态为 `invoiced`，尚未签收。
- `exception`：状态为 `exception`。
- `voided`：状态为 `voided`。

### 5.6 重点关注开票

排序规则：

1. 异常开票优先。
2. 逾期未开优先。
3. 已开未签收超过 7 天优先。
4. 金额大的记录优先。

返回不超过 8 条记录，每条包含计划名、客户、商机、合同、状态、金额、计划/实际/签收日期、原因和下钻 URL。

## 6. API 设计

新增 API：

`GET /api/dashboard/invoices`

查询参数：

- `date_from`
- `date_to`
- `department_id`
- `owner_id`
- `account_id`
- `opportunity_id`
- `contract_id`
- `invoice_status`
- `exception_only`

响应结构：

```json
{
  "filters": {
    "date_from": "2026-07-01",
    "date_to": "2026-09-30"
  },
  "metric_cards": [
    {
      "key": "planned_invoice_amount",
      "label": "计划开票金额",
      "value": 800000.00,
      "unit": "CNY",
      "drilldown_url": "/invoices?planned_from=2026-07-01&planned_to=2026-09-30"
    }
  ],
  "status_distribution": [
    {
      "status": "invoiced",
      "label": "已开票",
      "count": 5,
      "planned_amount": 420000.00,
      "actual_amount": 400000.00,
      "drilldown_url": "/invoices?invoice_status=invoiced"
    }
  ],
  "gap_trend": [
    {
      "period": "2026-07",
      "planned_amount": 300000.00,
      "invoiced_amount": 240000.00,
      "gap_amount": 60000.00,
      "invoice_count": 4
    }
  ],
  "risk_summary": [
    {
      "key": "overdue_unissued",
      "label": "逾期未开",
      "count": 2,
      "amount": 120000.00,
      "drilldown_url": "/invoices?invoice_overdue=true"
    }
  ],
  "attention_invoices": [
    {
      "invoice_id": 401,
      "plan_name": "首期开票",
      "account_id": 1,
      "opportunity_id": 10,
      "contract_id": 301,
      "invoice_status": "exception",
      "planned_amount": 300000.00,
      "actual_invoice_amount": 0,
      "planned_invoice_date": "2026-07-12T10:00:00+08:00",
      "reason": "开票异常",
      "drilldown_url": "/invoices?invoice_id=401"
    }
  ]
}
```

## 7. 后端实现边界

新增或扩展后端包：

- `com.canicula.crmai.dashboard`

建议新增模型：

- `DashboardInvoiceFilter`
- `DashboardInvoiceResponse`
- `DashboardInvoiceStatusItem`
- `DashboardInvoiceGapTrendPoint`
- `DashboardInvoiceRiskSummary`
- `DashboardAttentionInvoice`

建议新增权限迁移：

- `dashboard.invoices.read`
- 权限名称：`查看开票看板`
- 模块：`dashboard`

`DashboardService` 增加 `invoices(Long userId, DashboardInvoiceFilter filter)`，复用现有 `INVOICE_COLUMNS` 和 `invoice.read` 数据权限。

## 8. 前端实现边界

修改前端：

- `frontend/src/api/crm.ts`
  - 增加开票看板类型。
  - 增加 `crmApi.dashboard.invoices()`。
- `frontend/src/App.tsx`
  - 驾驶舱二级菜单增加 `开票看板`。
  - 增加 `/dashboard/invoices` 路由。
  - 新增 `DashboardInvoicesPage`。
  - 复用现有 `DashboardMetricCardView`、`currencyText`、`invoiceStatusText`、`invoiceStatusTag`。
- `frontend/src/styles.css`
  - 复用 `dashboard-overview`、`dashboard-funnel` 的布局。
  - 增加少量 `dashboard-invoices__*` 样式。

页面不做：

- 不在看板页执行开票申请、登记发票、签收、异常、作废动作。
- 不在看板页新建附件。
- 不做税务或 ERP 集成。
- 不重写 `/invoices` 明细工作台。

## 9. 下钻规则

所有卡片和列表项都跳转到 `/invoices`：

- 状态分布：`/invoices?invoice_status=<status>`
- 异常：`/invoices?exception_only=true`
- 计划日期范围：`/invoices?planned_from=<date_from>&planned_to=<date_to>`
- 单条记录：`/invoices?invoice_id=<id>`
- 客户/商机/合同筛选保留：`account_id`、`opportunity_id`、`contract_id`

如果 `/invoices` 当前不支持某些下钻参数，V3 首版仍保留 URL 契约，后续在风险预警模块统一补充列表筛选体验。

## 10. 验收标准

自动化验证：

- H2 迁移测试验证 `dashboard.invoices.read`。
- PostgreSQL 迁移测试验证版本号和权限。
- DashboardControllerTest 验证：
  - `/api/dashboard/invoices` 返回指标、状态分布、缺口趋势、风险摘要、重点关注开票。
  - 缺少 `dashboard.invoices.read` 时返回 403。
- OpenAPI 覆盖测试验证新 API 被文档记录。
- 前端 Vitest 验证：
  - `/dashboard/invoices` 能渲染关键指标和重点关注开票。
  - mock fetch 调用 `/api/dashboard/invoices`。
- `npm run build` 通过。

浏览器 UAT：

- 打开 `http://127.0.0.1:5175/dashboard/invoices`。
- 登录后能看到开票看板标题、指标卡、状态分布、缺口趋势、签收与异常概览、重点关注开票。
- 页面无“服务端异常”。
- 控制台无应用 error。
- 截图保存到 `docs/testing/evidence/artifacts/v3-invoice-dashboard-uat-20260704.png`。

## 11. 与后续模块关系

- 回款看板会使用已开票、已签收和未核销金额，但不在本模块展开现金回收率。
- 风险预警模块会复用开票异常、逾期未开、已开未签收作为风险来源。
- V3 全链路回归会串起合同看板 -> 开票看板 -> 回款看板 -> 风险预警。
