# V3 销售漏斗与商机预测设计说明

日期：2026-07-03

分支：`codex/v3-management-dashboard`

关联 TODO：`docs/product/crm-v3-development-todolist.md`

## 1. 模块目标

销售漏斗与商机预测是 V3 的第二个专题看板，入口为 `/dashboard/funnel`。它不替代现有 `/opportunities` 商机明细页，而是面向销售负责人和管理层回答四个问题：

- 当前商机集中在哪些阶段。
- 未来预计成交金额是否充足。
- 哪些阶段卡住、哪些商机停滞。
- 管理者应该下钻到哪些商机继续推进。

本模块的核心不是录入商机，而是把已有商机明细转成管理视角的漏斗、预测和风险清单。

## 2. 推荐方案

推荐采用 B：专题看板 + 明细下钻。

| 方案 | 内容 | 优点 | 风险 |
|---|---|---|---|
| A | 在现有商机列表上增加统计卡 | 改动小 | 管理视角弱，页面仍偏录入与列表 |
| B | 新增 `/dashboard/funnel` 专题页，聚合后下钻到 `/opportunities` | 职责清晰，符合 V3 驾驶舱定位，后续可扩展趋势和排行 | 需要新增一个聚合 API |
| C | 一次做完整销售预测 BI | 能力最强 | 超出 V3 首版边界，容易拖慢交付 |

采用 B 的原因：

- V1/V2 已经有商机明细、阶段、状态、预计金额、预计成交日期、风险和最近活动时间。
- V3 需要管理分析入口，不能把所有分析塞回明细页。
- 首版可以通过一个稳定 API 交付核心价值，后续再扩展趋势和预测模型。

## 3. 页面定位

新增页面：

- 菜单名称：`销售漏斗`
- 路由：`/dashboard/funnel`
- 权限：`dashboard.funnel.read`
- 数据来源权限：`opportunity.read`

说明：当前前端导航是扁平菜单，首版以一级菜单 `销售漏斗` 放出，但业务归属仍属于 V3 驾驶舱。等后续统一做驾驶舱二级菜单时，再收敛为 `驾驶舱 / 销售漏斗`。

现有页面职责保持不变：

| 页面 | 主要用户 | 目的 |
|---|---|---|
| `/opportunities` | 销售、销售负责人 | 商机录入、筛选、更新阶段、关闭/重启 |
| `/dashboard` | 管理层 | 全局经营健康度 |
| `/dashboard/funnel` | 销售负责人、管理层 | 漏斗健康度、预测金额、停滞商机、风险下钻 |

## 4. 页面布局

页面保持后台管理系统的信息密度，不做营销式大屏。

```text
销售漏斗
├─ 顶部筛选
│  ├─ 时间范围：预计成交日期
│  ├─ 组织
│  ├─ 负责人
│  ├─ 客户
│  └─ 风险状态
├─ 关键指标
│  ├─ 在办商机数
│  ├─ 预测金额
│  ├─ 加权预测金额
│  ├─ 赢单金额
│  ├─ 停滞商机数
│  └─ 高风险商机数
├─ 阶段漏斗
│  └─ 商业线索 -> 商业验证 -> 商业方案 -> 商业谈判 -> 合同推进 -> 商业成交
├─ 预测分布
│  ├─ 按预计成交月份聚合
│  └─ 金额、商机数、加权金额
└─ 待推进商机
   ├─ 停滞商机
   ├─ 高风险商机
   └─ 大金额临近成交商机
```

首屏优先级：

- 第一行先看预测总量和加权预测。
- 第二行看阶段漏斗，判断是否卡在前端或后端阶段。
- 第三行看待推进清单，直接进入商机明细。

## 5. 指标口径

默认筛选：

- 未传 `date_from/date_to` 时，预测类指标默认当前自然季度。
- 时间字段使用 `expected_close_date`。
- 漏斗阶段分布默认统计未删除商机。
- 预测金额默认排除 `status in ('lost', 'cancelled')` 的商机。

### 5.1 阶段映射

沿用现有前端商机阶段编码：

| 编码 | 展示名 | 默认赢率 |
|---|---|---:|
| `lead` | 商业线索 | 0.10 |
| `validation` | 商业验证 | 0.25 |
| `proposal` | 商业方案 | 0.45 |
| `solution` | 商业方案 | 0.45 |
| `negotiation` | 商业谈判 | 0.65 |
| `contract` | 合同推进 | 0.85 |
| `won` | 商业成交 | 1.00 |

如果商机自身存在 `win_rate`，优先使用商机 `win_rate`；否则使用阶段默认赢率。

### 5.2 关键指标

| 指标 | 口径 | 下钻 |
|---|---|---|
| 在办商机数 | `status in ('following', 'active', 'paused')` 且未删除 | `/opportunities?status=following` |
| 预测金额 | 筛选范围内未关闭失败、未取消商机的 `sum(estimated_contract_amount)` | `/opportunities?expected_close_from=<date_from>&expected_close_to=<date_to>` |
| 加权预测金额 | `sum(estimated_contract_amount * coalesce(win_rate, stage_default_rate))` | `/opportunities` |
| 赢单金额 | `status = 'won'` 或 `close_type = 'won'` 的预计合同金额 | `/opportunities?status=won` |
| 停滞商机数 | 在办商机且 `coalesce(last_activity_at, updated_at)` 距当前时间超过 14 天 | `/opportunities?stalled=true` |
| 高风险商机数 | `risk_status in ('risk', 'high_risk')` | `/opportunities?risk_status=high_risk` |

### 5.3 阶段漏斗

每个阶段返回：

- 阶段编码。
- 阶段名称。
- 商机数。
- 预测金额。
- 加权预测金额。
- 阶段默认赢率。
- 停滞商机数。
- 高风险商机数。
- 下钻 URL。

### 5.4 预测分布

按 `expected_close_date` 的月份聚合，默认返回当前季度或筛选范围内月份：

- `month`：`YYYY-MM`
- `opportunity_count`
- `forecast_amount`
- `weighted_forecast_amount`
- `high_risk_count`

## 6. API 设计

新增 API：

`GET /api/dashboard/funnel`

查询参数：

- `date_from`
- `date_to`
- `department_id`
- `owner_id`
- `account_id`
- `risk_status`

响应结构：

```json
{
  "filters": {
    "date_from": "2026-07-01",
    "date_to": "2026-09-30"
  },
  "metric_cards": [
    {
      "key": "forecast_amount",
      "label": "预测金额",
      "value": 1280000.00,
      "unit": "CNY",
      "drilldown_url": "/opportunities?expected_close_from=2026-07-01&expected_close_to=2026-09-30"
    }
  ],
  "stage_funnel": [
    {
      "stage": "proposal",
      "label": "商业方案",
      "opportunity_count": 5,
      "forecast_amount": 500000.00,
      "weighted_forecast_amount": 225000.00,
      "win_rate": 0.45,
      "stalled_count": 1,
      "high_risk_count": 1,
      "drilldown_url": "/opportunities?stage=proposal"
    }
  ],
  "forecast_trend": [
    {
      "month": "2026-07",
      "opportunity_count": 3,
      "forecast_amount": 800000.00,
      "weighted_forecast_amount": 420000.00,
      "high_risk_count": 1
    }
  ],
  "attention_opportunities": [
    {
      "id": 10,
      "opportunity_name": "测试商机A",
      "account_id": 1,
      "stage": "proposal",
      "stage_label": "商业方案",
      "risk_status": "risk",
      "estimated_contract_amount": 620000.00,
      "weighted_forecast_amount": 279000.00,
      "expected_close_date": "2026-07-31",
      "last_activity_at": "2026-06-15T10:00:00+08:00",
      "owner_user_id": 1001,
      "attention_reason": "停滞超过14天",
      "drilldown_url": "/opportunities?opportunity_id=10"
    }
  ]
}
```

## 7. 后端实现边界

新增或扩展后端包：

- `com.canicula.crmai.dashboard`

建议新增模型：

- `DashboardFunnelResponse`
- `DashboardFunnelStage`
- `DashboardForecastTrendPoint`
- `DashboardAttentionOpportunity`

权限：

- Controller 使用 `@RequirePermission("dashboard.funnel.read")`。
- Service 聚合前必须校验用户是否拥有 `opportunity.read` 的数据可见范围。
- 无 `opportunity.read` 时返回空指标，不泄露聚合数据；无 `dashboard.funnel.read` 时返回 403。

迁移：

- 新增 Flyway migration 补权限点 `dashboard.funnel.read`。
- 将权限归入驾驶舱/经营分析模块。

不新增：

- 不新增预测模型表。
- 不新增自定义赢率配置表。
- 不新增复杂销售目标表。

## 8. 前端实现边界

新增路由：

- `/dashboard/funnel`

导航：

- 当前菜单结构是扁平一级菜单，首版新增一级入口 `销售漏斗`，权限为 `dashboard.funnel.read`。
- `经营总览` 页面可增加一个专题入口链接到 `/dashboard/funnel`，但不要求先实现二级驾驶舱菜单。

页面组件：

- 复用现有 `PageTitle`、`RefreshButton`、`Card`、`Table`、`Tag`。
- 阶段漏斗用横向阶段块实现，不引入新图表库。
- 预测趋势首版用简洁表格或条形布局，不引入重型图表依赖。
- 待推进商机列表支持点击进入 `/opportunities?opportunity_id=<id>`。

空状态：

- 指标显示 0。
- 阶段漏斗保留所有阶段，金额和数量为 0。
- 待推进清单显示“暂无需要重点推进的商机”。

错误状态：

- 页面顶部展示服务端异常。
- 不展示过期数据。

## 9. 自动化验证

后端测试：

- `DashboardFunnelControllerTest`
  - 有 `dashboard.funnel.read` 权限可访问。
  - 无权限返回 403。
  - 阶段漏斗按 `stage` 返回数量、金额和加权金额。
  - `win_rate` 为空时使用阶段默认赢率。
  - `date_from/date_to` 按 `expected_close_date` 收窄预测范围。
  - 停滞商机和高风险商机能进入 `attention_opportunities`。

OpenAPI：

- `OpenApiContractCoverageTest` 覆盖 `GET /api/dashboard/funnel`。

前端测试：

- 有 `dashboard.funnel.read` 权限时显示销售漏斗入口。
- 打开 `/dashboard/funnel` 展示关键指标、阶段漏斗、预测分布和待推进商机。
- API 异常时显示错误提示。
- 点击待推进商机下钻链接，href 指向 `/opportunities?...`。

浏览器验收：

- 登录 `demo_admin`。
- 打开 `http://127.0.0.1:5175/dashboard/funnel`。
- 确认页面展示预测金额、加权预测金额、阶段漏斗、预测分布和待推进商机。
- 点击一个阶段或商机下钻，能进入商机列表页。
- 浏览器控制台无应用错误。

## 10. 模块完成标准

本模块设计完成条件：

- 页面职责、路由、权限和现有商机页边界明确。
- 阶段漏斗、预测金额、加权预测、停滞/高风险口径明确。
- API 响应结构和下钻 URL 明确。
- 后端、前端、OpenAPI、浏览器 UAT 验收口径明确。
- 进入下一步：输出 V3 销售漏斗与商机预测实现计划。
