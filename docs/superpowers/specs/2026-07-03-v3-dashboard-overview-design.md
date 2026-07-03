# V3 经营驾驶舱总览设计说明

日期：2026-07-03

分支：`codex/v3-management-dashboard`

关联 TODO：`docs/product/crm-v3-development-todolist.md`

## 1. 模块目标

经营驾驶舱总览是 V3 的第一个可用页面。它不替代当前 `/` 销售工作台，而是新增独立一级菜单 `驾驶舱`，默认路由为 `/dashboard`。

目标是让管理层进入系统后先回答四个问题：

- 现在经营盘子有多大：预测、合同、开票、回款。
- 哪个环节卡住了：商机、合同、开票、回款、核销。
- 主要风险在哪里：停滞商机、合同节点、开票异常、回款逾期、未核销回款。
- 需要点到哪里处理：能下钻到 V1/V2 明细页面。

## 2. 页面定位

现有 `/` 工作台保持不变，继续服务一线销售日常：

- 今日待办。
- 在办商机。
- 待完成行动。
- 周进展入口。

新增 `/dashboard` 服务经营管理：

- 经营核心指标。
- 销售到财务链路健康度。
- 风险摘要。
- 待处理排行。
- 下钻入口。

这样 V1/V2/V3 的入口职责清晰：

| 入口 | 用户 | 目的 |
|---|---|---|
| `/` 工作台 | 销售个人 | 今天先处理什么 |
| V1/V2 业务菜单 | 销售、商务、财务 | 录入、流转、查看业务明细 |
| `/dashboard` 驾驶舱 | 管理层、负责人 | 看经营状态、找风险、下钻追责 |

## 3. 导航方案

新增一级菜单：

- 菜单名：`驾驶舱`
- 路由：`/dashboard`
- 图标：`BarChart3` 或 `LayoutDashboard`
- 权限：`dashboard.read`

V3 后续专题看板可以作为驾驶舱子菜单：

- 经营总览：`/dashboard`
- 销售漏斗：`/dashboard/funnel`
- 合同看板：`/dashboard/contracts`
- 开票看板：`/dashboard/invoices`
- 回款看板：`/dashboard/receivables`
- 风险预警：`/dashboard/risks`

首版只实现经营总览页面，其他子菜单先不放出，避免空页面。

## 4. 页面布局

页面采用后台管理系统布局，信息密度适中，不做大幅营销式视觉。

```text
驾驶舱 / 经营总览
├─ 顶部筛选
│  ├─ 时间范围：本月、本季度、本年、自定义
│  ├─ 组织
│  ├─ 负责人
│  ├─ 客户
│  └─ 商机
├─ 核心指标卡
│  ├─ 预测金额
│  ├─ 合同金额
│  ├─ 已开票金额
│  ├─ 已回款金额
│  ├─ 逾期金额
│  └─ 风险数
├─ 经营链路健康度
│  └─ 商机预测 -> 合同 -> 开票 -> 回款 -> 核销
├─ 风险摘要
│  ├─ 商机停滞
│  ├─ 合同节点逾期
│  ├─ 开票异常
│  ├─ 回款逾期
│  └─ 未核销回款
└─ 待处理排行
   ├─ 高金额风险
   ├─ 逾期回款
   └─ 未核销到账
```

首屏重点：

- 第一行必须看到核心经营数字。
- 第二行必须看到链路转化和风险摘要。
- 风险列表不超过 8 条，优先展示高风险和金额大的对象。
- 每个指标卡和风险项都提供下钻链接。

## 5. API 设计

首版实现一个总览 API：

`GET /api/dashboard/overview`

查询参数：

- `date_from`
- `date_to`
- `department_id`
- `owner_id`
- `account_id`
- `opportunity_id`

响应结构：

```json
{
  "filters": {
    "date_from": "2026-07-01",
    "date_to": "2026-07-31"
  },
  "metric_cards": [
    {
      "key": "forecast_amount",
      "label": "预测金额",
      "value": 1280000.00,
      "unit": "CNY",
      "drilldown_url": "/opportunities"
    }
  ],
  "business_flow": [
    {
      "key": "opportunity",
      "label": "商机预测",
      "amount": 1280000.00,
      "count": 12,
      "risk_count": 2,
      "drilldown_url": "/opportunities"
    }
  ],
  "risk_summary": [
    {
      "risk_type": "receivable_overdue",
      "label": "回款逾期",
      "count": 3,
      "amount": 180000.00,
      "highest_level": "High",
      "drilldown_url": "/receivables?overdue=true"
    }
  ],
  "top_risks": [
    {
      "risk_type": "receivable_overdue",
      "risk_level": "High",
      "title": "CRM一期尾款逾期",
      "amount": 100000.00,
      "object_type": "receivable_plan",
      "object_id": 1,
      "owner_user_id": 1,
      "occurred_at": "2026-07-01T00:00:00Z",
      "drilldown_url": "/receivables?overdue=true"
    }
  ]
}
```

## 6. 后端实现边界

新增后端包：

- `com.canicula.crmai.dashboard`

建议文件：

- `DashboardController`
- `DashboardService`
- `DashboardFilter`
- `DashboardOverviewResponse`
- `DashboardMetricCard`
- `DashboardBusinessFlowItem`
- `DashboardRiskSummary`
- `DashboardRiskItem`

首版不新增业务表。权限点通过 Flyway migration 增加：

- `dashboard.read`

数据权限：

- Controller 使用 `@RequirePermission("dashboard.read")`。
- Service 内部按业务域分别判断 read 权限与数据范围。
- 没有某业务域 read 权限时，该业务域指标不展示或返回 0，不泄露聚合结果。

审计：

- 首版读取型 Dashboard 不记录每次查询审计，避免高频读审计噪音。
- 若后续增加导出功能，再记录导出审计。

## 7. 前端实现边界

新增前端类型：

- `DashboardOverview`
- `DashboardMetricCard`
- `DashboardBusinessFlowItem`
- `DashboardRiskSummary`
- `DashboardRiskItem`

新增 API：

- `crmApi.dashboard.overview(query)`

新增页面：

- `DashboardOverviewPage`

导航：

- 在 `navItems` 新增 `/dashboard`，权限 `dashboard.read`。
- 保留 `/` 工作台。
- Header 文案可以从 `V1 销售基础闭环` 调整为更中性的 `项目型大客户 CRM`，避免 V3 页面仍显示 V1。

UI 组件：

- 顶部筛选区使用现有 `Form`、`Select`、`InputNumber` 或日期输入模式。
- 指标卡复用现有 summary/card 风格。
- 链路健康度用紧凑横向步骤条或轻量条形块，不引入重型图表库。
- 风险摘要使用小表格或紧凑列表，点击进入业务页面。

## 8. 空状态与错误处理

空数据：

- 指标金额显示 0。
- 风险摘要显示“当前筛选范围暂无经营风险”。
- 经营链路保留各节点，但数值为 0。

权限不足：

- 无 `dashboard.read` 时菜单不可见，直接访问 `/dashboard` 返回 403 友好提示或由后端返回 403。
- 某业务域无 read 权限时，不展示该域的明细风险。

接口异常：

- 页面顶部显示服务端异常提示。
- 已加载区域不展示过期数据。

## 9. 自动化验证

后端测试：

- `DashboardControllerTest`
  - 管理员访问 `/api/dashboard/overview` 返回 200。
  - 无 `dashboard.read` 权限返回 403。
  - 返回包含 `metric_cards`、`business_flow`、`risk_summary`、`top_risks`。
  - 风险项都有 `drilldown_url`。
  - `date_from/date_to` 能收窄统计范围。

- `OpenApiContractCoverageTest`
  - 覆盖 `/api/dashboard/overview`。

前端测试：

- `App.test.tsx`
  - 有 `dashboard.read` 权限时显示驾驶舱菜单。
  - 进入 `/dashboard` 展示经营总览标题、核心指标、风险摘要。
  - API 异常时显示错误提示。

构建：

- `npm test -- --run`
- `npm run build`
- `mvn -Dtest=DashboardControllerTest,OpenApiContractCoverageTest test`

浏览器验收：

- 登录 `demo_admin`。
- 打开 `http://127.0.0.1:5175/dashboard`。
- 确认页面出现核心指标卡、经营链路、风险摘要和待处理风险。
- 点击至少一个下钻入口，能进入 V1/V2 明细页面。
- 浏览器控制台无应用错误。

## 10. 模块完成标准

本模块设计完成条件：

- `/dashboard` 与现有 `/` 工作台的职责边界明确。
- 总览页布局、API 响应、权限和验收口径明确。
- 沈思维确认后，进入 V3 经营驾驶舱总览实现计划。
