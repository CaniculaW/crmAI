# V3 风险预警与数据下钻设计说明

日期：2026-07-05

分支：`codex/v3-management-dashboard`

关联 TODO：`docs/product/crm-v3-development-todolist.md`

## 1. 模块目标

风险预警与数据下钻是 V3 的第六个专题模块，入口为 `/dashboard/risks`。它不替代商机、合同、开票、回款、核销等业务页面，也不新增审批流，而是把 V3 已经分散在总览、漏斗、合同、开票和回款看板里的风险信号统一成一个可排序、可筛选、可下钻、可追责的风险工作台。

本模块要回答五个问题：

- 当前经营风险总量、金额暴露和高优先级风险是多少。
- 风险主要分布在哪条业务链路：商机、合同、开票、回款、核销。
- 哪些风险最需要管理者今天处理。
- 每条风险由谁负责、关联哪个客户/商机/合同、金额和发生时间是什么。
- 点击风险后应该进入哪个业务页面继续处理。

## 2. 推荐方案

采用 B：独立风险预警专题页 + 统一风险 API + 下钻到已有业务页面。

| 方案 | 内容 | 优点 | 风险 |
|---|---|---|---|
| A | 只增强 `/dashboard` 总览的风险摘要 | 改动小 | 风险只能概览，无法形成可处理清单 |
| B | 新增 `/dashboard/risks`，统一展示风险总览、分类、趋势、责任人和风险明细 | 专业 CRM/ERP 常见做法，能承接所有专题看板的风险信号，范围可控 | 需要新增权限、API、前端页和下钻适配 |
| C | 新增完整风险工单系统，支持分派、关闭、评论和 SLA | 闭环最完整 | 超出 V3 首版，容易侵入 V1/V2 已验证流程 |

采用 B 的原因：

- V1/V2 明细页面已经承担处理动作，V3 不应重复做业务录入和状态流转。
- V3 总览已有 `risk_summary` 和 `top_risks`，模块 8 可以复用并增强，而不是重建风险来源。
- 管理者需要的是“风险雷达 + 处理入口”，首版用下钻闭环即可验证价值。

## 3. 页面定位

新增页面：

- 菜单名称：`风险预警`
- 路由：`/dashboard/risks`
- 权限：`dashboard.risks.read`
- 数据来源权限：复用已有 `opportunity.read`、`contract.read`、`invoice.read`、`receivable.read`、`payment.read`、`reconciliation.read`

导航位置：

```text
驾驶舱
├─ 经营总览
├─ 销售漏斗
├─ 合同看板
├─ 开票看板
├─ 回款看板
└─ 风险预警
```

## 4. 页面布局

页面保持后台管理系统风格，强调扫描、筛选和处理优先级。

```text
风险预警
├─ 顶部筛选
│  ├─ 时间范围
│  ├─ 风险类型
│  ├─ 风险等级
│  ├─ 业务对象
│  ├─ 客户
│  ├─ 负责人
│  └─ 只看高优先级
├─ 风险指标卡
│  ├─ 风险总数
│  ├─ 高优先级风险
│  ├─ 风险暴露金额
│  ├─ 逾期类风险
│  ├─ 异常类风险
│  └─ 待处理责任人数
├─ 风险分类分布
│  ├─ 商机停滞
│  ├─ 合同节点逾期
│  ├─ 开票异常
│  ├─ 回款逾期
│  └─ 未核销回款
├─ 风险趋势
│  └─ 按月统计新增风险数、金额、高优先级数
├─ 责任人风险排行
│  └─ 负责人、风险数、高优先级数、金额、最近风险时间
└─ 风险明细
   ├─ 优先级
   ├─ 类型
   ├─ 标题
   ├─ 客户/商机/合同
   ├─ 金额
   ├─ 负责人
   ├─ 发生时间
   ├─ 建议动作
   └─ 下钻
```

首屏优先级：

- 第一眼看风险总数、高优先级、金额暴露。
- 第二眼看风险分布在哪条链路。
- 第三眼看具体责任人和明细下钻。

## 5. 风险类型与口径

### 5.1 风险类型

| 风险类型 | 编码 | 来源 | 判定口径 | 默认等级 | 下钻 |
|---|---|---|---|---|---|
| 商机停滞 | `opportunity_stalled` | `crm_opportunities` | 在办商机长期无推进或 `risk_status <> normal` | medium | `/opportunities?opportunity_id=<id>` |
| 合同节点逾期 | `contract_milestone_overdue` | `crm_contract_milestones` + `crm_contracts` | 节点 `status = overdue` | high | `/contracts?contract_id=<id>` |
| 开票异常 | `invoice_exception` | `crm_invoices` | `invoice_status = exception` | medium | `/invoices?invoice_id=<id>` |
| 回款逾期 | `receivable_overdue` | `crm_receivable_plans` | `receivable_status = overdue` 或计划日已过且未收金额大于 0 | high | `/receivables?receivable_plan_id=<id>` |
| 未核销回款 | `unreconciled_payment` | `crm_payments` | `confirmed_amount > reconciled_amount` 且到账有效 | medium | `/reconciliations?payment_id=<id>` |

### 5.2 风险等级

| 等级 | 编码 | 判定 |
|---|---|---|
| 高 | `high` | 合同节点逾期、回款逾期、大额风险、超过 30 天未处理 |
| 中 | `medium` | 商机风险、开票异常、未核销回款 |
| 低 | `low` | 低金额、短期内可自行消化的关注项 |

首版不新增复杂风险评分模型。排序用“等级权重 + 金额 + 发生时间”：

```text
high = 300
medium = 200
low = 100
priority_score = level_weight + amount_weight + age_weight
```

其中：

- `amount_weight`：金额大于等于 100 万加 30，50 万到 100 万加 20，10 万到 50 万加 10。
- `age_weight`：风险发生超过 30 天加 20，超过 14 天加 10。

### 5.3 时间口径

默认筛选：

- 未传 `date_from/date_to` 时，默认当前自然季度。
- 商机风险时间使用 `coalesce(last_activity_at, updated_at)`。
- 合同节点风险时间使用 `planned_at`。
- 开票风险时间使用 `coalesce(exception_at, invoice_date, planned_invoice_date)`。
- 回款风险时间使用 `planned_receivable_date`。
- 未核销回款风险时间使用 `received_at`。

### 5.4 金额口径

| 风险类型 | 金额字段 |
|---|---|
| 商机停滞 | `estimated_contract_amount` |
| 合同节点逾期 | `contract_amount` |
| 开票异常 | `coalesce(actual_invoice_amount, applied_amount, planned_amount)` |
| 回款逾期 | 未收金额，优先 `planned_amount - confirmed_received_amount` |
| 未核销回款 | `confirmed_amount - reconciled_amount` |

## 6. API 设计

新增 API：

`GET /api/dashboard/risks`

查询参数：

- `date_from`
- `date_to`
- `department_id`
- `owner_id`
- `account_id`
- `risk_type`
- `risk_level`
- `object_type`
- `high_priority_only`

响应结构：

```json
{
  "filters": {
    "date_from": "2026-07-01",
    "date_to": "2026-09-30"
  },
  "metric_cards": [
    {
      "key": "risk_count",
      "label": "风险总数",
      "value": 12,
      "unit": "count",
      "drilldown_url": "/dashboard/risks?date_from=2026-07-01&date_to=2026-09-30"
    }
  ],
  "risk_summary": [
    {
      "risk_type": "receivable_overdue",
      "label": "回款逾期",
      "count": 3,
      "amount": 680000.00,
      "highest_level": "high",
      "drilldown_url": "/dashboard/risks?risk_type=receivable_overdue"
    }
  ],
  "risk_trend": [
    {
      "period": "2026-07",
      "count": 5,
      "high_count": 2,
      "amount": 520000.00,
      "drilldown_url": "/dashboard/risks?date_from=2026-07-01&date_to=2026-07-31"
    }
  ],
  "owner_ranking": [
    {
      "owner_user_id": 1001,
      "owner_name": "销售一号",
      "count": 4,
      "high_count": 2,
      "amount": 380000.00,
      "latest_occurred_at": "2026-07-04T10:00:00+08:00",
      "drilldown_url": "/dashboard/risks?owner_id=1001"
    }
  ],
  "risk_items": [
    {
      "risk_type": "receivable_overdue",
      "risk_level": "high",
      "priority_score": 350,
      "title": "首付款回款逾期",
      "amount": 260000.00,
      "object_type": "receivable_plan",
      "object_id": 601,
      "account_id": 1,
      "account_name": "测试客户A",
      "opportunity_id": 10,
      "contract_id": 301,
      "owner_user_id": 1001,
      "owner_name": "销售一号",
      "occurred_at": "2026-07-20T10:00:00+08:00",
      "suggested_action": "进入回款详情确认逾期原因和下一步跟进",
      "drilldown_url": "/receivables?receivable_plan_id=601"
    }
  ]
}
```

## 7. 下钻规则

下钻必须到“能处理该风险”的页面，而不只是到列表。

| 风险类型 | 下钻目标 | 目标页要求 |
|---|---|---|
| 商机停滞 | `/opportunities?opportunity_id=<id>` | 商机页自动打开或突出该商机 |
| 合同节点逾期 | `/contracts?contract_id=<id>` | 合同页自动打开合同执行台 |
| 开票异常 | `/invoices?invoice_id=<id>` | 开票页自动打开开票详情 |
| 回款逾期 | `/receivables?receivable_plan_id=<id>` | 回款页自动打开回款详情 |
| 未核销回款 | `/reconciliations?payment_id=<id>` | 核销工作台自动选择到账流水 |

已有能力：

- `/receivables?receivable_plan_id=<id>` 已在模块 7 中支持。
- `/reconciliations?payment_id=<id>` 已在模块 7 中支持。

模块 8 需要补齐：

- `/opportunities?opportunity_id=<id>` 自动打开商机详情或经营入口。
- `/contracts?contract_id=<id>` 自动打开合同执行台。
- `/invoices?invoice_id=<id>` 自动打开开票详情。

## 8. 验收标准

功能验收：

- 侧边栏驾驶舱下出现 `风险预警`。
- 无权限用户看不到入口，访问 API 返回 403。
- `/dashboard/risks` 展示指标卡、风险分类、趋势、责任人排行和风险明细。
- 风险明细每条都有负责人、客户、金额、时间、建议动作和下钻。
- 五类风险均能下钻到可处理页面。

自动化验证：

- 后端新增权限迁移测试。
- 后端新增 `/api/dashboard/risks` 成功和权限测试。
- OpenAPI 覆盖 `/api/dashboard/risks`。
- 前端新增风险预警页面渲染测试。
- 前端新增至少三类下钻联动测试：商机、合同、开票。
- `npm test -- --run src/App.test.tsx` 通过。
- `npm run build` 通过。
- `mvn -Dtest=DatabaseMigrationTest,DashboardControllerTest,OpenApiContractCoverageTest test` 通过。
- `mvn -Dtest=PostgresMigrationIT test` 通过。

浏览器 UAT：

- 登录 `demo_admin`。
- 打开 `/dashboard/risks`。
- 验证风险指标、分类、责任人排行、明细列表可见。
- 依次验证商机、合同、开票、回款、核销风险下钻。
- 留存截图：`docs/testing/evidence/artifacts/v3-risk-warning-uat-20260705.png`。

## 9. 不做范围

- 不做风险关闭、转派、评论和 SLA。
- 不做外部消息通知。
- 不做自定义风险规则配置。
- 不做 BI 报表设计器。
- 不替代明细页面的状态流转。

## 10. 自检

- 无未定义范围：五类风险、页面、API、下钻和验收口径均已明确。
- 与现有架构一致：沿用 `DashboardService` 聚合、Flyway 权限、React V3 看板模式。
- 与 V3 范围一致：只做经营管理分析和下钻，不扩展成风险工单系统。
