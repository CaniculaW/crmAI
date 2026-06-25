# V1 商机推进链路重构实施计划

日期：2026-06-25

## 当前模块

模块：`5-opportunity-progress-chain`

方案：B，商机推进工作台。

## TODOList

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 补齐商机推进入口验收测试 | Done | 测试覆盖标题、推进判断、中文枚举、进展、下一步、最近行动、关联入口 |
| 2 | 确认测试红灯 | Done | 定向测试因页面未实现而失败 |
| 3 | 实现商机推进工作台 | Done | 列表中文化，详情抽屉展示推进判断和关联入口 |
| 4 | 自动化验证 | Done | 前端定向测试、全量测试、构建通过；后端商机默认在办筛选测试通过 |
| 5 | 本地 UAT | Done | `/opportunities` 无服务端异常，核心 DOM 验收通过 |
| 6 | 更新项目 TODOList 并提交 | Done | 模块 5 Done，模块 6 Current，提交号 f464e78 已记录 |

## 修改范围

- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/styles.css`
- `docs/product/crm-v1-page-logic-refactor-todolist.md`

## 风险控制

- 只改前端页面逻辑和展示，不改 API 契约。
- 商机真实数据中可能存在 `active`、`low`、`proposal` 等枚举，前端统一中文化兼容。
- 关闭/取消按钮需要兼容 `following` 和 `active` 两种在办状态。
