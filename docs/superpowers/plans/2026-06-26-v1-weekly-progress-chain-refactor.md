# V1 Weekly Progress Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 weekly progress review entry so weekly progress explains customer and opportunity movement by natural week.

**Architecture:** Keep the existing React page pattern and add a focused `WeeklyProgressReviewDrawer` inside `frontend/src/App.tsx`. Reuse existing account and opportunity resource calls for name lookups, add small helper functions for week labels, risk state, and item result labels. No backend model changes are needed.

**Tech Stack:** React, Ant Design, Vitest, existing Spring Boot weekly progress API.

---

## Files

- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/styles.css`
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`

## TODOList

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 补齐周进展复盘入口验收测试 | Done | 测试覆盖标题、客户/商机名称、自然周、行动明细、风险、入口链接 |
| 2 | 确认测试红灯 | Done | 定向测试因页面未实现而失败 |
| 3 | 实现周进展复盘入口 | Done | 列表中文化，详情抽屉展示复盘摘要和行动明细卡片 |
| 4 | 自动化验证 | Done | 前端定向测试、全量测试、构建通过 |
| 5 | 本地 UAT | Done | `/weekly-progress` 无服务端异常，核心 DOM 验收通过 |
| 6 | 更新项目 TODOList 并提交 | In Progress | 模块 7 Done，模块 8 Current，提交号记录 |

## Task 1: Failing Frontend Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [x] **Step 1: Enrich weekly progress fixture**

Use a weekly progress row with `latest_activity_at` and item `activity_result`:

```ts
weeklyProgress: [
  {
    opportunity_id: 10,
    account_id: 1,
    owner_user_id: 1001,
    week_start_date: "2026-06-15",
    week_end_date: "2026-06-21",
    activity_count: 1,
    latest_activity_at: "2026-06-22T03:58:00+08:00",
    progress_items: [
      {
        activity_id: 88,
        subject: "完成CRM V1试点需求确认会",
        activity_time: "2026-06-22T03:58:00+08:00",
        conclusion: "双方确认进入试点方案细化阶段。",
        next_plan: "三日内提交试点方案和演示账号。",
        risk_description: "需在方案中明确历史数据导入范围。",
        activity_result: "aligned"
      }
    ]
  }
]
```

- [x] **Step 2: Add review entry test**

```ts
it("shows the weekly progress review entry from the weekly progress list", async () => {
  const user = userEvent.setup();
  mockCrmFetch();

  render(<App />);
  await loginThroughUi(user);

  await user.click(screen.getByRole("link", { name: "周进展" }));
  await screen.findByRole("button", { name: "测试商机A" });
  await user.click(screen.getByRole("button", { name: "测试商机A" }));

  expect(await screen.findByRole("heading", { name: "周进展复盘入口" })).toBeInTheDocument();
  expect(screen.getByText("复盘摘要")).toBeInTheDocument();
  expect(screen.getAllByText("测试客户A").length).toBeGreaterThan(0);
  expect(screen.getAllByText("测试商机A").length).toBeGreaterThan(0);
  expect(screen.getByText("2026-06-15 至 2026-06-21")).toBeInTheDocument();
  expect(screen.getAllByText("1 次行动").length).toBeGreaterThan(0);
  expect(screen.getByText("完成CRM V1试点需求确认会")).toBeInTheDocument();
  expect(screen.getByText("双方确认进入试点方案细化阶段。")).toBeInTheDocument();
  expect(screen.getByText("三日内提交试点方案和演示账号。")).toBeInTheDocument();
  expect(screen.getByText("需在方案中明确历史数据导入范围。")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "查看客户" })).toHaveAttribute("href", "/accounts");
  expect(screen.getByRole("link", { name: "推进商机" })).toHaveAttribute("href", "/opportunities");
  expect(screen.getByRole("link", { name: "查看销售行动" })).toHaveAttribute("href", "/activities");
});
```

- [x] **Step 3: Run RED**

Run:

```bash
cd frontend && npm test -- App.test.tsx -t "shows the weekly progress review entry"
```

Expected: FAIL because `周进展复盘入口` does not exist.

## Task 2: Implement Weekly Progress Review Entry

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [x] **Step 1: Extend weekly progress types**

Add:

```ts
latest_activity_at?: string;
activity_result?: string;
```

- [x] **Step 2: Add lookups and columns**

In `WeeklyProgressPage`, load accounts and opportunities, add lookup maps, render customer and opportunity names, and make opportunity name open the review drawer.

- [x] **Step 3: Add drawer component**

Add `WeeklyProgressReviewDrawer` with:

- title `周进展复盘入口`
- section `复盘摘要`
- action detail cards
- links to `/accounts`, `/opportunities`, `/activities`

- [x] **Step 4: Add helpers and CSS**

Add helpers for week range, action count, latest activity, risk state, and result labels. Add `.weekly-review-*` styles matching existing drawer patterns.

## Task 3: Verification And Documentation

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`

- [x] **Step 1: Run verification**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
```

Expected: both commands exit 0.

- [x] **Step 2: Deploy current frontend build to UAT**

Copy `frontend/dist` into the running frontend container and run browser smoke on `/weekly-progress`.

- [ ] **Step 3: Update TODOList**

Mark module 7 Done and module 8 Current. Record test commands, browser evidence, commit hash, and any residual risk.
