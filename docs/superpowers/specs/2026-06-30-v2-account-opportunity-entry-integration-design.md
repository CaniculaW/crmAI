# V2 客户/商机入口联动设计说明

日期：2026-06-30

状态：Draft

责任侧：AI 研发主力推进；沈思维作为最终版本确认人。

## 1. 模块目标

V2 前 6 个模块已经具备方案标书、合同、开票、回款和核销能力。本模块要解决的问题是：销售人员从客户或商机进入系统时，可以直接看到 V2 商务与财务执行摘要，并带着客户或商机上下文跳转到对应模块，而不是把 V2 作为一组孤立页面使用。

## 2. 业务链路

```text
客户经营
-> 查看客户基础状态、最近跟进、联系人/商机入口
-> 查看该客户下方案、合同、开票、回款、核销摘要
-> 带客户筛选进入 V2 模块继续处理

商机推进
-> 查看商机阶段、状态、风险、预计金额
-> 查看该商机下方案、合同、开票、回款、核销摘要
-> 带客户与商机筛选进入 V2 模块继续处理
```

## 3. 推荐方案

采用方案 B：在现有客户经营抽屉和商机推进抽屉内增加 V2 业务摘要与上下文跳转。

不新增完整客户详情页和商机详情页，先复用当前已验证的抽屉体验，降低重构范围。等 V2 全链路回归通过后，再判断是否进入 V3 驾驶舱或详情页重构。

## 4. 页面调整范围

### 4.1 客户经营抽屉

新增 `V2 业务闭环` 区块：

- 方案标书：显示数量、最新状态，并跳转 `/solutions?account_id={accountId}`。
- 合同：显示数量、合同总额，并跳转 `/contracts?account_id={accountId}`。
- 开票：显示计划数、实际开票金额、未核销金额，并跳转 `/invoices?account_id={accountId}`。
- 回款：显示计划数、已确认回款、未收金额，并跳转 `/receivables?account_id={accountId}`。
- 核销：显示待核销发票金额、待分配回款金额，并跳转 `/reconciliations?account_id={accountId}`。

保留现有联系人、商机、销售行动入口。

### 4.2 商机推进抽屉

新增 `成交执行闭环` 区块：

- 方案标书：显示该商机方案数量和报价合计。
- 合同：显示合同数量、合同金额、合同状态。
- 开票：显示已开票、未核销、异常数量。
- 回款：显示已确认回款、未收、逾期数量。
- 核销：显示最近核销记录和待处理金额。

跳转时同时携带 `account_id` 与 `opportunity_id`：

```text
/solutions?account_id={accountId}&opportunity_id={opportunityId}
/contracts?account_id={accountId}&opportunity_id={opportunityId}
/invoices?account_id={accountId}&opportunity_id={opportunityId}
/receivables?account_id={accountId}&opportunity_id={opportunityId}
/reconciliations?account_id={accountId}&opportunity_id={opportunityId}
```

### 4.3 V2 模块列表页

V2 列表页需要读取 URL 查询参数作为初始筛选条件：

- `方案标书`：支持 `account_id`、`opportunity_id` 初始筛选。
- `合同`：支持 `account_id`、`opportunity_id` 初始筛选。
- `开票管理`：支持 `account_id`、`opportunity_id`、`contract_id` 初始筛选。
- `回款管理`：支持 `account_id`、`opportunity_id`、`contract_id` 初始筛选。
- `核销工作台`：支持 `account_id`、`opportunity_id`、`contract_id` 初始筛选。

## 5. 数据与 API 边界

本模块优先复用现有 API，不新增后端聚合接口。

现有 API 已覆盖：

- `GET /api/solutions?account_id=&opportunity_id=`
- `GET /api/contracts?account_id=&opportunity_id=`
- `GET /api/invoices?account_id=&opportunity_id=&contract_id=`
- `GET /api/receivable-plans?account_id=&opportunity_id=&contract_id=`
- `GET /api/reconciliations/workbench?account_id=&opportunity_id=&contract_id=`
- `GET /api/reconciliations?account_id=&opportunity_id=&contract_id=`

前端在抽屉打开后并发拉取摘要数据，在页面内聚合展示。若后续客户/商机下数据量明显变大，再在 V3 增加后端聚合接口。

## 6. 权限口径

入口展示应服从当前登录用户权限：

- 无 `solution.read` 时不展示方案标书入口。
- 无 `contract.read` 时不展示合同入口。
- 无 `invoice.read` 时不展示开票入口。
- 无 `receivable.read` 时不展示回款入口。
- 无 `reconciliation.read` 时不展示核销入口。

V2 摘要加载失败时，不影响客户/商机基础抽屉展示；摘要区显示错误提示与刷新能力。

## 7. 不做范围

- 不做客户经营驾驶舱。
- 不做商机完整详情页重构。
- 不新增后端统计聚合接口。
- 不做跨客户、跨部门的数据权限重构。
- 不做 AI 推荐下一步动作。
- 不做 V2 财务 BI 图表。

## 8. 验收标准

- 客户抽屉可看到 V2 摘要和 5 个上下文跳转入口。
- 商机抽屉可看到 V2 摘要和 5 个上下文跳转入口。
- 从客户抽屉跳转到 V2 页面后，列表自动按 `account_id` 筛选。
- 从商机抽屉跳转到 V2 页面后，列表自动按 `account_id` 与 `opportunity_id` 筛选。
- 前端测试覆盖摘要加载、权限入口和 URL 初始筛选。
- 浏览器 UAT 覆盖客户抽屉、商机抽屉、跳转后的 V2 页面过滤结果。
