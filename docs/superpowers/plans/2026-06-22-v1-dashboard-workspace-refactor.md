# V1 Dashboard Workspace Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the V1 dashboard into a "今日作战台" that tells users what to handle first and gives direct entry points to core CRM actions.

**Architecture:** Keep the current React dashboard data sources (`reminders`, `opportunities`, `activities`) and add presentation-level prioritization only. Do not add backend fields, new APIs, or V2/V3 dashboard analytics.

**Tech Stack:** React, TypeScript, Ant Design, React Router links, Vitest, Testing Library, Vite.

---

### Task 1: Add Dashboard Behavior Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add a failing dashboard test**

Add a test that logs in and expects the dashboard to render:

- `今日优先处理`
- `本周已有 1 条行动记录`
- `新建客户`
- `新建商机`
- `新建行动`
- `查看周进展`

- [ ] **Step 2: Run the focused test**

Run: `npm test -- App.test.tsx -t "shows a dashboard command center"`

Expected: FAIL before implementation because these dashboard command-center labels do not exist.

### Task 2: Implement Dashboard Command Center

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add priority text helpers**

Add a small helper that derives the first-priority message from pending reminders, planned activities, active opportunities, and weekly activity count.

- [ ] **Step 2: Add the command-center section**

Add a top dashboard section with:

- `今日优先处理`
- priority message
- four shortcut links to `/accounts`, `/opportunities`, `/activities`, and `/weekly-progress`

- [ ] **Step 3: Improve empty-state copy**

Change dashboard empty list text to explain the next action:

- reminders: `暂无待办，可从销售行动创建下次跟进`
- opportunities: `暂无活跃商机，可新建商机或查看客户池`

### Task 3: Verify, Deploy, and Record

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`

- [ ] **Step 1: Run frontend tests**

Run: `npm test`

Expected: all frontend tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Browser validation**

Deploy `frontend/dist` to the local UAT frontend container and verify `/` shows the dashboard command center, shortcut links, no service error banner, and no relevant console warning/error.

- [ ] **Step 4: Update TODOList**

Mark `工作台` as Done, set `客户链路` as Current, and record commands, browser evidence, and commit hash.
