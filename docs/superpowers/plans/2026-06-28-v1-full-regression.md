# V1 Full Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that the refactored V1 CRM page logic still supports the complete login, dashboard, customer, contact, opportunity, sales activity, weekly progress, and system management workflow.

**Architecture:** Keep the current React, Spring Boot, and Docker UAT architecture unchanged. Run frontend and backend gates first, then sync the built frontend into the local UAT container and execute one browser Smoke script that checks the V1 business chain and system pages for required texts, server-error banners, and console failures.

**Tech Stack:** React, TypeScript, Vitest, Vite, Spring Boot, Maven, Docker, Chrome DevTools Protocol.

---

## Files

- Create: `/private/tmp/crm-v1-full-regression-browser-smoke.mjs`
  - Logs in through the browser UI.
  - Visits `/`, `/accounts`, `/contacts`, `/opportunities`, `/activities`, `/weekly-progress`, `/system`, and `/system/dictionaries`.
  - Fails on missing required page text, `服务端异常`, or browser console application errors.
  - Saves screenshot to `/private/tmp/v1-full-regression-smoke.png`.
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`
  - Mark module 9 as Done after verification.
  - Record commands, browser evidence, commit hash, and residual issues.
- Modify: `frontend/src/App.tsx`
  - Fix regression finding: add confirm-new-password validation to the change password modal.
  - Submit only `old_password` and `new_password` to `/api/auth/change-password`.
- Modify: `frontend/src/App.test.tsx`
  - Cover confirm-new-password behavior and the exact change-password request body.
- Modify: `docs/superpowers/plans/2026-06-28-v1-full-regression.md`
  - Check off each task as it is completed.

## TODOList

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 前端自动化门禁 | Done | `cd frontend && npm test` and `cd frontend && npm run build` exit 0 |
| 2 | 后端自动化门禁 | Done | `cd backend && mvn test` exits 0 |
| 3 | UAT 环境同步 | Done | Docker UAT frontend serves current `frontend/dist` build |
| 4 | 浏览器全链路 Smoke | Done | Login and all V1 pages pass required text, no `服务端异常`, no console failures |
| 5 | 记录与提交 | In Progress | Module 9 marked Done, plan checked, commit pushed |

## Task 1: Frontend Gates

**Files:**
- Read: `frontend/package.json`
- Verify: `frontend/src/App.test.tsx`

- [x] **Step 1: Run frontend tests**

Run:

```bash
cd frontend && npm test
```

Expected: Vitest exits 0 and reports all tests passed.

- [x] **Step 2: Run frontend production build**

Run:

```bash
cd frontend && npm run build
```

Expected: Vite exits 0 and writes `frontend/dist`.

## Task 2: Backend Gates

**Files:**
- Read: `backend/pom.xml`
- Verify: `backend/src/test`

- [x] **Step 1: Run backend tests**

Run:

```bash
cd backend && mvn test
```

Expected: Maven exits 0 with no test failures or errors.

## Task 3: Sync Current Build To UAT

**Files:**
- Read: `compose.v1-test.yml`
- Use: `frontend/dist`

- [x] **Step 1: Confirm UAT containers are running**

Run:

```bash
docker ps --format '{{.Names}}'
```

Expected: Output includes `crm-ai-v1-test-frontend-1` and `crm-ai-v1-test-backend-1`.

- [x] **Step 2: Replace the UAT frontend build**

Run:

```bash
docker exec crm-ai-v1-test-frontend-1 sh -c 'rm -rf /usr/share/nginx/html/*'
docker cp frontend/dist/. crm-ai-v1-test-frontend-1:/usr/share/nginx/html/
```

Expected: Both commands exit 0.

## Task 4: Browser Full-Chain Smoke

**Files:**
- Create: `/private/tmp/crm-v1-full-regression-browser-smoke.mjs`
- Produce: `/private/tmp/v1-full-regression-smoke.png`

- [x] **Step 1: Create the browser Smoke script**

Create a Node script with these checks:

```text
Login page: 用户名, password field, submit form
Dashboard: 工作台
Accounts: 客户池
Contacts: 联系人
Opportunities: 商机
Sales activities: 销售行动
Weekly progress: 周进展
System overview: 系统概览, 组织管理, 用户管理, 角色权限, 审计日志, 字典管理
Dictionary management: 字典管理, 客户类型, 新建字典
Global failure checks: no 服务端异常 text, no Runtime exceptions, no console error/warning log entries
```

- [x] **Step 2: Run the browser Smoke**

Run:

```bash
node /private/tmp/crm-v1-full-regression-browser-smoke.mjs
```

Expected: Script prints JSON with `"status": "passed"` and writes `/private/tmp/v1-full-regression-smoke.png`.

## Task 5: Record, Commit, Push

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`
- Modify: `docs/superpowers/plans/2026-06-28-v1-full-regression.md`

- [x] **Step 1: Update V1 TODOList**

Record this state in `docs/product/crm-v1-page-logic-refactor-todolist.md`:

```text
Module 9 status: Done
Current task: v1-page-logic-refactor-complete
Verification commands: npm test; npm run build; mvn test; browser Smoke
Browser evidence: /private/tmp/v1-full-regression-smoke.png
Residual issues: 无, unless a verification step records a concrete remaining issue
```

- [x] **Step 2: Check off this plan**

Change each completed `- [ ]` line in this plan to `- [x]` and update the TODOList table from `Pending` to `Done`.

- [ ] **Step 3: Commit and push**

Run:

```bash
git add docs/product/crm-v1-page-logic-refactor-todolist.md docs/superpowers/plans/2026-06-28-v1-full-regression.md
git commit -m "docs: record v1 full regression"
git push origin main
```

Expected: Commit and push exit 0.

## Regression Finding Fixed

- Finding: Full-chain browser Smoke passed login and then found the change-password modal missing a confirm-new-password field.
- Fix: `frontend/src/App.tsx` now requires `确认新密码`, validates it matches `新密码`, and sends only `old_password` plus `new_password` to the backend.
- Verification: `npm test -- App.test.tsx -t "changes the current user's password"` failed before the fix and passed after the fix; full `npm test`, `npm run build`, and browser Smoke also passed.

## Self-Review

- Spec coverage: The plan covers module 9 page scope, frontend tests, frontend build, backend tests, local UAT browser Smoke, evidence screenshot, completion record, and push.
- Placeholder scan: No `TBD`, `TODO`, `implement later`, or undefined follow-up work remains.
- Type consistency: No production code types are introduced; commands and file paths are consistent with the existing V1 repo structure.
