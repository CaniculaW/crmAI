# 客户关联详情浏览器验收记录（2026-07-21）

## 验收信息

- 分支：`codex/account-related-details`
- 前端本地地址：`http://127.0.0.1:5175`
- 后端本地地址：`http://127.0.0.1:8080`
- 验收账号：`demo_admin`
- 最终验收数据：客户 `1`（V1演示客户-上海智造集团）、联系人 `1`（王敏）、商机 `1`（智能制造CRM一期试点）。

## 数据说明

- 初始任务给出的测试 fixture“测试客户A / 张决策 / 测试商机A”及 ID `21`、`10` 不存在于当前真实数据库；初次筛选“测试客户A”返回 HTTP `200`、`data: []`。
- 产品按当前数据库动态展示关系记录。本次最终验收改用当前 V1 演示种子中的真实关联数据，未修改生产代码、测试代码或数据库。
- 初始无数据截图保留为过程追溯，不作为最终失败结论。

## 自动化验证

- 前端全量测试：执行 `npm test`，`9` 个测试文件全部通过，`188/188` 个测试通过，退出码 `0`，耗时 `137.38s`。
- 前端生产构建：执行 `npm run build`，TypeScript 编译和 Vite 构建成功，转换 `3216` 个模块，Vite 构建耗时 `587ms`，退出码 `0`。
- 构建存在大于 500 kB chunk 的提示，不影响本次构建成功结论。

## 桌面端（1440x1000）

### 客户详情

- 从 `/accounts` 的“V1演示客户-上海智造集团”记录点击“查看经营”，客户经营抽屉正常打开。
- “关联联系人”显示 `1 人`，记录为“王敏”；“查看全部”链接为 `/contacts?account_id=1`。
- “关联商机”显示 `1 个`，记录为“智能制造CRM一期试点”；“查看全部”链接为 `/opportunities?account_id=1`。
- 两个关系表格及其操作链接清晰可见，无不连贯重叠。

### 联系人深链

- 点击“王敏”后 URL 为 `/contacts?account_id=1&contact_id=1`。
- “联系人经营入口”正常打开，显示“王敏 · 数字化负责人”及关系判断信息。

### 商机深链

- 重新打开客户经营详情并点击“智能制造CRM一期试点”后，URL 为 `/opportunities?account_id=1&opportunity_id=1`。
- “商机推进入口”正常打开，显示阶段、状态、风险、金额和推进信息。

### 质量检查

- 控制台错误：`0`。
- 页面级横向溢出：`0`。三个验收页面的 `body.scrollWidth`、`documentElement.scrollWidth` 与视口宽度均为 `1440`。
- 不连贯重叠：未发现，三张桌面截图已逐张目视复核。

## 移动端（390x844）

### 客户详情

- 在真实 `390x844` 视口从客户列表点击“查看经营”，移动端客户经营抽屉正常打开。
- 滚动到关系区后，“关联联系人 1 人”和“关联商机 1 个”同时可见；真实记录及两个 scoped“查看全部”链接与桌面端一致。
- 关系面板宽度 `358px`，左右位置为 `16px` 到 `374px`，未超出 `390px` 视口。

### 联系人深链

- 点击“王敏”后 URL 为 `/contacts?account_id=1&contact_id=1`。
- 移动端“联系人经营入口”正常打开，姓名、职务和关系判断信息清晰可见。

### 商机深链

- 重新打开客户经营详情并点击“智能制造CRM一期试点”后，URL 为 `/opportunities?account_id=1&opportunity_id=1`。
- 移动端“商机推进入口”正常打开，推进判断信息清晰可见。

### 质量检查

- 控制台错误：`0`。
- 页面级横向溢出：`0`。三个验收页面的 `body.scrollWidth`、`documentElement.scrollWidth` 均为 `390`；三个抽屉正文的 `scrollWidth` 与 `clientWidth` 均为 `390`。
- 不连贯重叠：未发现，三张移动截图已逐张目视复核。

## API 结果

- 定向复核登录、客户详情、联系人 scoped 列表、联系人详情、商机 scoped 列表和商机详情，共 `6` 个请求，全部返回 HTTP `200`，失败 API 数为 `0`。
- `GET /api/contacts?account_id=1` 返回 `1` 条记录；`GET /api/opportunities?account_id=1` 返回 `1` 条记录。
- 浏览器矩阵控制台错误合计：`0`；失败 API 合计：`0`。

## 截图证据

- 桌面客户关系区：`docs/testing/evidence/artifacts/account-related-details-20260721/desktop-customer-detail-relations.png`
- 桌面联系人深链：`docs/testing/evidence/artifacts/account-related-details-20260721/desktop-contact-deep-link-detail.png`
- 桌面商机深链：`docs/testing/evidence/artifacts/account-related-details-20260721/desktop-opportunity-deep-link-detail.png`
- 移动客户关系区：`docs/testing/evidence/artifacts/account-related-details-20260721/mobile-customer-detail-relations.png`
- 移动联系人深链：`docs/testing/evidence/artifacts/account-related-details-20260721/mobile-contact-deep-link-detail.png`
- 移动商机深链：`docs/testing/evidence/artifacts/account-related-details-20260721/mobile-opportunity-deep-link-detail.png`
- 初始 fixture 数据缺失追溯：`docs/testing/evidence/artifacts/account-related-details-20260721/desktop-blocker-test-account-a-not-found.png`

## 结论

通过
