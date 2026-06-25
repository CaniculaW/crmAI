# V1 Sales Activity Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 sales activity execution entry so activities become traceable customer and opportunity progress records.

**Architecture:** Keep the existing React single-file page pattern and add a focused `ActivityExecutionDrawer` inside `frontend/src/App.tsx`. Add frontend enum helpers and lightweight CSS matching the account/contact/opportunity operation drawers. No backend model changes are needed.

**Tech Stack:** React, Ant Design, Vitest, Spring Boot controller tests where API behavior is touched.

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
| 1 | 补齐行动执行入口验收测试 | Done | 测试覆盖标题、客户/商机名称、中文状态、过程记录、风险、入口链接 |
| 2 | 确认测试红灯 | Done | 定向测试因页面未实现而失败 |
| 3 | 实现销售行动执行入口 | Done | 列表中文化，详情抽屉展示执行判断、过程记录和关联入口 |
| 4 | 强化完成行动弹窗 | Done | 完成行动可填写风险说明和风险类型 |
| 5 | 自动化验证 | Done | 前端定向测试、全量测试、构建通过 |
| 6 | 本地 UAT | Done | `/activities` 无服务端异常，核心 DOM 验收通过 |
| 7 | 更新项目 TODOList 并提交 | In Progress | 模块 6 Done，模块 7 Current，提交号记录 |

## Task 1: Failing Frontend Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add activity fixture**

Add one activity to the test fixture:

```ts
activities: [
  {
    id: 88,
    account_id: 1,
    opportunity_id: 10,
    subject: "完成CRM V1试点需求确认会",
    activity_type: "meeting",
    activity_status: "completed",
    activity_result: "aligned",
    activity_time: "2026-06-22T03:58:00+08:00",
    next_follow_up_at: "2026-06-25T10:00:00+08:00",
    owner_department_id: 1,
    owner_user_id: 1001,
    communication_content: "围绕CRM V1试点目标、角色权限、客户档案和商机推进节奏完成确认。",
    customer_feedback: "客户希望先以重点客户团队试点，验证周进展和提醒机制。",
    conclusion: "双方确认进入试点方案细化阶段。",
    next_plan: "三日内提交试点方案和演示账号。",
    risk_description: "需在方案中明确历史数据导入范围。",
    include_in_weekly_progress: true,
    weekly_period: "current_week",
    contact_ids: [21],
    risk_types: ["data_migration"]
  }
]
```

- [ ] **Step 2: Add execution entry test**

```ts
it("shows the sales activity execution entry from the activity list", async () => {
  const user = userEvent.setup();
  mockCrmFetch();

  render(<App />);
  await loginThroughUi(user);

  await user.click(screen.getByRole("link", { name: "销售行动" }));
  await screen.findByRole("button", { name: "完成CRM V1试点需求确认会" });
  await user.click(screen.getByRole("button", { name: "完成CRM V1试点需求确认会" }));

  expect(await screen.findByRole("heading", { name: "行动执行入口" })).toBeInTheDocument();
  expect(screen.getByText("执行判断")).toBeInTheDocument();
  expect(screen.getAllByText("测试客户A").length).toBeGreaterThan(0);
  expect(screen.getAllByText("测试商机A").length).toBeGreaterThan(0);
  expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
  expect(screen.getAllByText("会议沟通").length).toBeGreaterThan(0);
  expect(screen.getByText("围绕CRM V1试点目标、角色权限、客户档案和商机推进节奏完成确认。")).toBeInTheDocument();
  expect(screen.getByText("客户希望先以重点客户团队试点，验证周进展和提醒机制。")).toBeInTheDocument();
  expect(screen.getByText("双方确认进入试点方案细化阶段。")).toBeInTheDocument();
  expect(screen.getByText("三日内提交试点方案和演示账号。")).toBeInTheDocument();
  expect(screen.getByText("需在方案中明确历史数据导入范围。")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "查看客户" })).toHaveAttribute("href", "/accounts");
  expect(screen.getByRole("link", { name: "推进商机" })).toHaveAttribute("href", "/opportunities");
  expect(screen.getByRole("link", { name: "查看周进展" })).toHaveAttribute("href", "/weekly-progress");
});
```

- [ ] **Step 3: Run RED**

Run:

```bash
cd frontend && npm test -- App.test.tsx -t "shows the sales activity execution entry"
```

Expected: FAIL because `行动执行入口` does not exist.

## Task 2: Implement Activity Execution Entry

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Extend Activity type**

Add optional fields from backend `ActivityResponse`:

```ts
completed_at?: string;
completed_by?: number;
contact_ids?: number[];
participants?: Array<{ user_id: number; participant_role?: string }>;
risk_types?: string[];
```

- [ ] **Step 2: Add lookup maps and list columns**

In `ActivitiesPage`, add `accountOptions`, `opportunityOptions`, `accountById`, and `opportunityById`. Change columns to customer/opportunity names and render status/type/risk using helpers.

- [ ] **Step 3: Replace detail drawer**

Replace `RecordDetails` with `ActivityExecutionDrawer` that renders:

- hero title `行动执行入口`
- section `执行判断`
- process panel with communication, feedback, conclusion, next plan, risk
- links to `/accounts`, `/opportunities`, `/weekly-progress`

- [ ] **Step 4: Add helpers**

Add helpers near existing text helpers:

```ts
function activityTypeText(type?: string) { /* meeting -> 会议沟通 */ }
function activityStatusText(status?: string) { /* planned/completed/cancelled */ }
function activityResultText(result?: string) { /* aligned/milestone_completed/risk_found */ }
function weeklyProgressText(value?: boolean) { /* 是/否 */ }
function riskTypesText(types?: string[]) { /* data_migration -> 数据迁移 */ }
```

- [ ] **Step 5: Add CSS**

Add `.activity-execution`, `.activity-execution-hero`, `.activity-summary-grid`, `.activity-process-panel`, `.activity-entry-grid` using the same structure as opportunity styles.

## Task 3: Complete Action Form Enhancement

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add completion form fields**

In the complete modal, add:

```tsx
<Form.Item name="risk_description" label="风险说明">
  <Input.TextArea rows={3} />
</Form.Item>
<Form.Item name="risk_types" label="风险类型">
  <Input placeholder="多个风险类型用英文逗号分隔" />
</Form.Item>
```

- [ ] **Step 2: Normalize submit**

Update `completeActivity`:

```ts
await crmApi.activities.complete(completing.id, {
  activity_result: values.risk_description ? "risk_found" : "milestone_completed",
  ...withoutEmpty(values, ["risk_types"]),
  risk_types: splitCsv(values.risk_types)
});
```

## Task 4: Verification And Documentation

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`

- [ ] **Step 1: Run verification**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
```

Expected: both commands exit 0.

- [ ] **Step 2: Deploy current frontend build to UAT**

Copy `frontend/dist` into the running frontend container and run browser smoke on `/activities`.

- [ ] **Step 3: Update TODOList**

Mark module 6 Done and module 7 Current. Record test commands, browser evidence, commit hash, and any residual risk.
