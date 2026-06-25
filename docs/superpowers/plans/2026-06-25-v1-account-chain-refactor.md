# V1 Account Chain Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the V1 customer page from a data table into the customer operation entry approved as option B.

**Architecture:** Keep the existing React and Ant Design page structure. Add an account operation drawer inside `AccountsPage`, reuse existing list/filter/create/edit APIs, and avoid backend or data model changes.

**Tech Stack:** React, TypeScript, Ant Design, Vitest, Testing Library, Vite.

---

### Task 1: Lock The Customer Operation Entry Behavior

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add test data for customer operation context**

Add `industry`, region, and recent activity fields to the first mocked account so the detail drawer can render a useful customer summary and follow-up.

- [ ] **Step 2: Write the failing test**

Add a test that opens the customer page, enters the customer operation drawer, and verifies customer summary, recent follow-up, related object actions, and next-step guidance.

- [ ] **Step 3: Run the focused test to verify RED**

Run: `npm test -- App.test.tsx -t "shows the customer operation entry"`

Expected: FAIL because `客户经营入口` and related entry links are not implemented yet.

### Task 2: Implement Account Operation Drawer

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add account display helpers**

Map V1 enum values to business-facing Chinese labels, including account type and customer status.

- [ ] **Step 2: Replace the raw detail drawer**

Replace the current `RecordDetails` usage for account detail with an `AccountOperationDrawer` component that shows customer summary, recent follow-up, business entries for contacts/opportunities/activities, and next-step guidance.

- [ ] **Step 3: Tighten the list operation language**

Keep create/edit behavior unchanged, but make the customer detail action read as a business action instead of a raw detail action.

- [ ] **Step 4: Add responsive styling**

Add drawer-local styles for summary grid, operation entry cards, and next-step panel without changing global navigation or other modules.

### Task 3: Verify, Record, And Handoff

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`

- [ ] **Step 1: Run frontend verification**

Run: `npm test` and `npm run build`.

- [ ] **Step 2: Run browser UAT**

Open local UAT, verify `/accounts` has no service error banner, open a customer operation drawer, and capture screenshot evidence.

- [ ] **Step 3: Update the module TODO list**

Mark module 3 as Done, move module 4 to Current, and record commands, screenshot, and commit hash.

- [ ] **Step 4: Commit and push**

Commit implementation and progress docs, then push `main` to GitHub.
