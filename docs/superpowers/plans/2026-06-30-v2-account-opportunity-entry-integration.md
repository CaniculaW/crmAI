# V2 客户/商机入口联动实施计划

日期：2026-06-30

关联设计：`docs/superpowers/specs/2026-06-30-v2-account-opportunity-entry-integration-design.md`

## 当前 TODO

- [x] Task 1：确认现有 V2 API 已支持客户/商机维度过滤。
- [x] Task 2：确认客户经营抽屉与商机推进抽屉当前页面结构。
- [ ] Task 3：先写前端失败测试，覆盖客户抽屉 V2 摘要与跳转入口。
- [ ] Task 4：先写前端失败测试，覆盖商机抽屉 V2 摘要与跳转入口。
- [ ] Task 5：先写前端失败测试，覆盖 V2 页面读取 URL 查询参数作为初始筛选。
- [ ] Task 6：实现查询参数初始化工具，接入方案、合同、开票、回款、核销页面。
- [ ] Task 7：实现 V2 业务摘要加载与展示组件，接入客户抽屉。
- [ ] Task 8：复用 V2 业务摘要组件，接入商机抽屉。
- [ ] Task 9：按权限控制 V2 摘要入口可见性。
- [ ] Task 10：运行前端测试与构建。
- [ ] Task 11：启动本地环境，完成浏览器 UAT 并留证据截图。
- [ ] Task 12：更新 TODOList、提交并推送。

## TDD 顺序

1. 在 `frontend/src/App.test.tsx` 增加客户抽屉用例：
   - 打开客户经营抽屉。
   - 断言展示 `V2 业务闭环`。
   - 断言触发 `/api/solutions?account_id=...`、`/api/contracts?account_id=...`、`/api/invoices?account_id=...`、`/api/receivable-plans?account_id=...`、`/api/reconciliations/workbench?account_id=...`。
   - 断言入口链接包含 `account_id`。

2. 在 `frontend/src/App.test.tsx` 增加商机抽屉用例：
   - 打开商机推进抽屉。
   - 断言展示 `成交执行闭环`。
   - 断言触发带 `account_id` 与 `opportunity_id` 的 V2 API。
   - 断言入口链接包含 `account_id` 与 `opportunity_id`。

3. 在 `frontend/src/App.test.tsx` 增加 URL 初始筛选用例：
   - 访问 `/contracts?account_id=1&opportunity_id=10`。
   - 断言请求 URL 包含查询参数。
   - 至少覆盖 `contracts`、`invoices`、`receivables`、`reconciliations`，方案页面可与客户/商机入口测试合并覆盖。

4. 实现代码后运行：

```bash
npm test -- --run
npm run build
```

## 实现要点

- 新增 `useInitialQueryFilters(keys, defaults?)`，只在页面初始化时读取 URL 查询参数，避免用户在页面内筛选后被 URL 反复覆盖。
- 新增 `buildScopedPath(path, scope)`，统一生成带客户/商机上下文的跳转地址。
- 新增 `V2BusinessSnapshot` 组件，支持 `account` 和 `opportunity` 两种 scope。
- 摘要聚合只在前端完成：
  - 方案数量、报价合计。
  - 合同数量、合同金额。
  - 开票计划数、实际开票金额、未核销金额。
  - 回款计划数、已确认回款、未收金额。
  - 核销待处理金额。
- 摘要加载失败时展示轻量错误，不阻断抽屉主体。

## 浏览器 UAT

本模块 UAT 访问路径：

- `/accounts`：打开客户经营抽屉，检查 V2 摘要、入口和跳转筛选。
- `/opportunities`：打开商机推进抽屉，检查 V2 摘要、入口和跳转筛选。
- `/solutions`、`/contracts`、`/invoices`、`/receivables`、`/reconciliations`：检查从抽屉跳转后的筛选结果。

证据文件命名：

```text
docs/testing/evidence/artifacts/v2-account-entry-integration-uat-20260630.png
docs/testing/evidence/artifacts/v2-opportunity-entry-integration-uat-20260630.png
```
