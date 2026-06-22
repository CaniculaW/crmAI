# V1 Global Page Framework Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make V1 pages read as business operation pages by adding consistent page guidance, action hierarchy, and Chinese empty states across the shared frontend workspace shell.

**Architecture:** Keep the current React + Ant Design single-page structure. Improve shared components (`DataWorkspace`, `PageTitle`, and table usage) so later customer/contact/opportunity/activity modules inherit the same page language without broad rewrites.

**Tech Stack:** React, TypeScript, Ant Design, Vitest, Testing Library, Vite.

---

### Task 1: Add Page Framework Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add a failing test for business page guidance and empty state**

Add a test that logs in, opens `/opportunities`, and expects:

- A page guide named `当前页面怎么用`.
- A primary next action text `先新建商机，或调整筛选条件查看在办商机。`.
- Chinese empty state text `暂无商机`.
- The existing `刷新` and `新建商机` actions remain available.

- [ ] **Step 2: Run the focused frontend test**

Run: `npm test -- App.test.tsx -t "shows business guidance and Chinese empty state"`

Expected: FAIL before implementation because the guide and Chinese empty state do not exist.

### Task 2: Implement Shared Page Guidance

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Extend `DataWorkspace`**

Add optional `guide` and `emptyText` props. Render a small guidance band below the page title when `guide` exists.

- [ ] **Step 2: Apply guidance to V1 representative pages**

Add concise guidance to customer, contact, opportunity, activity, weekly progress, and system pages.

- [ ] **Step 3: Add Chinese empty state to tables**

Pass `locale={{ emptyText }}` to each main table where a module-specific empty message is clearer than Ant Design's default English text.

### Task 3: Verify and Record

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: all frontend tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Browser smoke**

Use local UAT `http://127.0.0.1:5174/` after deploying the built frontend to the local frontend container. Verify `/accounts`, `/opportunities`, and `/system` show consistent page guidance, no service error banner, and no relevant console warning/error.

- [ ] **Step 4: Update TODOList**

Mark `全局框架与页面规则` as Done with command evidence, browser evidence, and commit hash.
