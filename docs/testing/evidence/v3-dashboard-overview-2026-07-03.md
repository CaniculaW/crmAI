# V3 经营驾驶舱总览验收证据

日期：2026-07-03

模块：V3 模块 3，经营驾驶舱总览

## 验收范围

- `/dashboard` 经营总览页面。
- `GET /api/dashboard/overview` 总览 API。
- `dashboard.read` 权限点与演示管理员访问。
- 指标卡、销售到财务链路、风险摘要、待处理排行和下钻入口。
- 中文经营指标、金额单位和前端现有路由可达性。

## 本轮修复

- 修复 Dashboard API 指标标签从英文展示值改为中文经营语义。
- 修复金额指标单位从 `amount` 改为 `CNY`，前端显示为人民币金额格式。
- 修复回款、逾期、未核销等下钻入口，避免跳转到当前前端不存在的 `/payments`、`/receivable-plans` 详情路由。
- 增强 `DashboardControllerTest`，覆盖中文标签、CNY 单位和可用下钻路由。

## 自动化验证

| 命令 | 结果 | 说明 |
|---|---|---|
| `mvn -Dtest=DashboardControllerTest test` | 通过 | RED 阶段先确认英文 label/amount unit 契约失败；修复后 3 tests 0 failures |
| `mvn test` | 通过 | 后端全量 93 tests，0 failures，0 errors |
| `npm test -- --run` | 通过 | 前端 3 files，47 tests，0 failures |
| `npm run build` | 通过 | 构建成功；保留既有 `antd-vendor` chunk 体积提醒 |

## 浏览器 UAT

环境：

- Frontend：`http://127.0.0.1:5175`
- Backend：`http://127.0.0.1:8081`
- 登录账号：`demo_admin`

检查结果：

- `/dashboard` 可打开并展示经营总览。
- 页面包含：预测金额、合同金额、已开票金额、已回款金额、逾期金额、风险数。
- 页面包含：销售到财务链路、商机预测、合同、开票、回款、核销。
- 页面包含：风险摘要、商机停滞、合同节点逾期、开票异常、回款逾期、未核销回款、查看逾期回款。
- 页面无 `Forecast Amount`、`Contract Amount`、`0 amount` 等英文/单位异常展示。
- 页面无“服务端异常”、`Failed to fetch`、`Network Error`、`Internal Server Error`。
- 浏览器控制台 error/warn：0。

截图证据：

- `docs/testing/evidence/artifacts/v3-dashboard-overview-uat-20260703.png`

## 结论

V3 模块 3 经营驾驶舱总览已通过本地自动化验证与浏览器 UAT。下一模块进入 V3 模块 4：销售漏斗与商机预测。
