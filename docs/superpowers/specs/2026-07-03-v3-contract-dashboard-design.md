# V3 合同看板设计说明

日期：2026-07-03

分支：`codex/v3-management-dashboard`

关联 TODO：`docs/product/crm-v3-development-todolist.md`

## 1. 模块目标

合同看板是 V3 的第三个专题看板，入口为 `/dashboard/contracts`。它不替代现有 `/contracts` 合同管理页，而是面向管理层、销售负责人和交付负责人回答五个问题：

- 当前已签合同资产规模是多少。
- 合同状态是否健康，是否存在终止、风险和执行停滞。
- 哪些合同节点逾期或临近到期。
- 哪些合同发生了金额、付款条件、开票条件、交付范围或风险变更。
- 管理者应该下钻到哪些合同继续处理。

本模块的核心不是录入合同，而是把合同、合同节点和合同变更转成可解释、可下钻、可追责的管理视图。

## 2. 推荐方案

推荐采用 B：专题看板 + 合同明细下钻。

| 方案 | 内容 | 优点 | 风险 |
|---|---|---|---|
| A | 在 `/contracts` 列表顶部增加统计区 | 改动小 | 页面仍偏业务操作，管理视角容易被表格淹没 |
| B | 新增 `/dashboard/contracts` 专题页，聚合后下钻到 `/contracts` | 职责清晰，延续 V3 驾驶舱模式，后续可接开票/回款联动 | 需要新增聚合 API 和导航入口 |
| C | 一次做合同履约全景大屏 | 能展示更多交付、开票、回款联动 | 超出 V3 当前模块边界，会和后续开票/回款看板重叠 |

采用 B 的原因：

- V2 已经有合同、合同变更和合同节点明细能力。
- V3 需要让管理者先判断“合同资产和履约风险”，再下钻处理。
- 合同看板应为后续开票、回款和风险预警提供上游合同健康度入口。

## 3. 页面定位

新增页面：

- 菜单名称：`合同看板`
- 路由：`/dashboard/contracts`
- 权限：`dashboard.contracts.read`
- 数据来源权限：`contract.read`

现有页面职责保持不变：

| 页面 | 主要用户 | 目的 |
|---|---|---|
| `/contracts` | 销售、商务、交付负责人 | 合同创建、编辑、终止、节点和附件管理 |
| `/dashboard` | 管理层 | 全局经营健康度 |
| `/dashboard/contracts` | 管理层、销售负责人、交付负责人 | 合同资产、履约状态、节点风险、变更风险和下钻 |

## 4. 页面布局

页面保持后台管理系统的信息密度，不做大屏动画和复杂图表。

```text
合同看板
├─ 顶部筛选
│  ├─ 时间范围：签署日期 signed_at
│  ├─ 组织
│  ├─ 负责人
│  ├─ 客户
│  ├─ 商机
│  ├─ 合同状态
│  └─ 风险等级
├─ 关键指标
│  ├─ 合同总额
│  ├─ 执行中合同额
│  ├─ 已终止合同额
│  ├─ 高风险合同数
│  ├─ 逾期节点数
│  └─ 近30天到期节点数
├─ 合同状态分布
│  └─ 起草/执行中/已完成/已终止等状态金额与数量
├─ 履约节点看板
│  ├─ 逾期节点
│  ├─ 临近节点
│  └─ 已完成节点
├─ 合同变更趋势
│  └─ 按月份聚合变更次数，区分金额、付款、开票、范围、风险
└─ 重点关注合同
   ├─ 节点逾期合同
   ├─ 高风险合同
   ├─ 近期发生关键变更合同
   └─ 大金额临近节点合同
```

首屏优先级：

- 第一行先看合同总额、执行中合同额和风险数量。
- 第二行看状态分布与节点看板，判断合同资产是否正在健康履约。
- 第三行看重点关注合同，直接下钻到合同明细。

## 5. 指标口径

默认筛选：

- 未传 `date_from/date_to` 时，金额类指标默认当前自然季度。
- 时间字段使用 `signed_at`；没有签署日期的合同按 `created_at` 作为兜底。
- 仅统计 `deleted_at is null` 的合同。
- 数据权限沿用合同相关业务对象权限，首版复用 `DataPermissionService` 的 `contract.read` 和合同责任人/客户组织范围。

### 5.1 状态映射

沿用 V2 合同状态编码：

| 编码 | 展示名 | 管理含义 |
|---|---|---|
| `drafting` | 起草中 | 合同尚未正式履行 |
| `performing` | 执行中 | 合同已签署或正在履行 |
| `completed` | 已完成 | 合同履约完成 |
| `terminated` | 已终止 | 合同提前终止或作废 |

如果存在历史数据使用其他状态编码，前端展示为原编码，后端仍纳入 `other` 分布项。

### 5.2 关键指标

| 指标 | 口径 | 下钻 |
|---|---|---|
| 合同总额 | 筛选范围内 `sum(contract_amount)` | `/contracts?date_from=<date_from>&date_to=<date_to>` |
| 执行中合同额 | `contract_status = 'performing'` 的 `sum(contract_amount)` | `/contracts?contract_status=performing` |
| 已终止合同额 | `contract_status = 'terminated'` 的 `sum(contract_amount)` | `/contracts?contract_status=terminated` |
| 高风险合同数 | `risk_level in ('high', 'critical')` 或非空高风险描述 | `/contracts?risk_level=high` |
| 逾期节点数 | `planned_at < now()` 且 `status not in ('completed', 'cancelled')` 的节点数 | `/contracts?milestone_status=overdue` |
| 近30天到期节点数 | `planned_at >= now()` 且 `planned_at < now() + 30 days` 且未完成节点数 | `/contracts?milestone_due=30d` |

### 5.3 状态分布

每个状态返回：

- 状态编码。
- 状态名称。
- 合同数量。
- 合同金额。
- 风险合同数。
- 下钻 URL。

### 5.4 节点看板

节点按照 `crm_contract_milestones` 聚合：

- `overdue`：计划时间早于当前时间且未完成。
- `due_soon`：未来 30 天内到期且未完成。
- `completed`：节点状态为完成。
- `open`：未完成且未到期。

返回节点数量、关联合同数量、合同金额和下钻 URL。

### 5.5 变更趋势

按 `crm_contract_changes.changed_at` 月份聚合，默认返回筛选时间范围内月份：

- `period`：`YYYY-MM`
- `change_count`
- `amount_change_count`
- `terms_change_count`
- `scope_change_count`
- `risk_change_count`

变更类型映射：

- `amount`：金额变更。
- `payment_terms`、`invoice_terms`：条款变更。
- `scope`：范围变更。
- `risk`：风险变更。

## 6. API 设计

新增 API：

`GET /api/dashboard/contracts`

查询参数：

- `date_from`
- `date_to`
- `department_id`
- `owner_id`
- `account_id`
- `opportunity_id`
- `contract_status`
- `risk_level`

响应结构：

```json
{
  "filters": {
    "date_from": "2026-07-01",
    "date_to": "2026-09-30"
  },
  "metric_cards": [
    {
      "key": "contract_amount",
      "label": "合同总额",
      "value": 1200000.00,
      "unit": "CNY",
      "drilldown_url": "/contracts?date_from=2026-07-01&date_to=2026-09-30"
    }
  ],
  "status_distribution": [
    {
      "status": "performing",
      "label": "执行中",
      "count": 8,
      "amount": 960000.00,
      "risk_count": 1,
      "drilldown_url": "/contracts?contract_status=performing"
    }
  ],
  "milestone_summary": [
    {
      "key": "overdue",
      "label": "逾期节点",
      "count": 2,
      "contract_count": 2,
      "amount": 520000.00,
      "drilldown_url": "/contracts?milestone_status=overdue"
    }
  ],
  "change_trend": [
    {
      "period": "2026-07",
      "change_count": 3,
      "amount_change_count": 1,
      "terms_change_count": 1,
      "scope_change_count": 0,
      "risk_change_count": 1
    }
  ],
  "attention_contracts": [
    {
      "contract_id": 301,
      "contract_name": "CRM 项目合同",
      "account_id": 1,
      "opportunity_id": 10,
      "contract_status": "performing",
      "risk_level": "high",
      "contract_amount": 500000.00,
      "next_milestone_name": "上线验收",
      "next_milestone_planned_at": "2026-07-02T00:00:00+08:00",
      "attention_reason": "节点逾期",
      "drilldown_url": "/contracts?contract_id=301"
    }
  ]
}
```

## 7. 后端实现边界

新增或扩展后端包：

- `com.canicula.crmai.dashboard`

建议新增模型：

- `DashboardContractFilter`
- `DashboardContractResponse`
- `DashboardContractStatusItem`
- `DashboardContractMilestoneSummary`
- `DashboardContractChangeTrendPoint`
- `DashboardAttentionContract`

权限：

- Controller 使用 `@RequirePermission("dashboard.contracts.read")`。
- Service 查询前通过 `contract.read` 判断合同数据可见性。
- 数据范围复用现有 `DashboardService` 的 `CONTRACT_COLUMNS` 思路：合同负责人、客户归属组织。

## 8. 前端实现边界

新增：

- `crmApi.dashboard.contracts(query)`
- `DashboardContracts` 类型。
- `/dashboard/contracts` 路由。
- 驾驶舱二级菜单增加 `合同看板`。

页面组件建议放在现有 `App.tsx` 中，保持当前项目结构；如果后续 V3 页面继续增多，再单独拆分 dashboard 目录。

页面交互：

- 顶部使用刷新按钮。
- 指标卡点击下钻到 `/contracts`。
- 状态分布点击下钻到 `/contracts?contract_status=...`。
- 节点摘要点击下钻到 `/contracts?milestone_status=...`。
- 重点关注合同点击下钻到 `/contracts?contract_id=...`。

## 9. 测试与验收

后端测试：

- `DatabaseMigrationTest`
  - 校验 `dashboard.contracts.read` 权限存在。
- `PostgresMigrationIT`
  - 校验最新 Flyway 版本。
- `DashboardControllerTest`
  - 管理员访问 `/api/dashboard/contracts` 返回合同金额、状态分布、节点摘要、变更趋势和重点合同。
  - 缺少 `dashboard.contracts.read` 返回 403。
  - 缺少 `contract.read` 时返回空聚合或隐藏合同数据。
- `OpenApiContractCoverageTest`
  - 覆盖 `GET /api/dashboard/contracts`。

前端测试：

- `App.test.tsx`
  - 访问 `/dashboard/contracts` 请求 `/api/dashboard/contracts`。
  - 展示合同总额、执行中合同额、状态分布、逾期节点和重点关注合同。
  - 驾驶舱菜单中展示合同看板。

验收命令：

- `mvn -Dtest=DatabaseMigrationTest,DashboardControllerTest,OpenApiContractCoverageTest test`
- `mvn -Dtest=PostgresMigrationIT test`
- `npm test -- --run`
- `npm run build`

浏览器 UAT：

- 本地访问 `/dashboard/contracts`。
- 使用 `demo_admin / S3cure!123` 登录。
- 检查合同指标卡、状态分布、节点摘要、变更趋势和重点合同展示。
- 控制台 error 为 0。
- 截图保存到 `docs/testing/evidence/artifacts/v3-contract-dashboard-uat-20260703.png`。

## 10. 不做范围

本模块不做：

- 不新增合同录入、审批或电子签能力。
- 不修改 `/contracts` 的状态流转规则。
- 不做开票、回款和核销金额穿透统计，这些留给后续专题看板。
- 不做复杂甘特图和项目计划管理。
- 不做跨年度合同收入确认。

## 11. 自检结果

- 无 `TBD`、`TODO` 占位。
- 页面范围聚焦合同资产与履约风险，没有与开票/回款看板重复。
- API、权限、前端路由和验收命令均可被实现计划覆盖。
- 下钻目标均指向现有 `/contracts` 页面，后续实现可按需补筛选参数识别。
