# CRM AI Compact UI Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 CRM AI 全部登录后页面升级为统一的紧凑型专业业务系统界面，同时保持移动端可操作性和现有业务行为。

**Architecture:** 在 `styles.css` 中建立可测试的全局密度变量，并通过应用框架、Ant Design 共享组件和现有业务组件选择器统一应用。仅在固定侧栏宽度无法由 CSS 稳定覆盖时修改 `App.tsx` 的 Sider 宽度；不修改业务数据流、路由、权限或后端。

**Tech Stack:** React, TypeScript, Ant Design, CSS, Vitest, Chrome browser smoke.

---

### Task 1: Density Contract Tests

**Files:**
- Create: `frontend/src/styles.test.ts`
- Test: `frontend/src/styles.test.ts`

- [ ] **Step 1: Write failing global density token tests**

Create a Vitest test that reads the production stylesheet and requires the agreed density tokens:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("compact UI density contract", () => {
  it("defines the desktop density tokens", () => {
    expect(css).toContain("--crm-font-size: 13px");
    expect(css).toContain("--crm-page-title-size: 20px");
    expect(css).toContain("--crm-header-height: 52px");
    expect(css).toContain("--crm-sidebar-width: 216px");
    expect(css).toContain("--crm-control-height: 32px");
  });

  it("keeps mobile controls touchable", () => {
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*--crm-control-height:\s*36px/);
  });

  it("applies compact table and form spacing", () => {
    expect(css).toMatch(/\.ant-table-wrapper[\s\S]*\.ant-table-cell[\s\S]*padding:\s*9px 10px/);
    expect(css).toMatch(/\.ant-form-item\s*\{[\s\S]*margin-bottom:\s*12px/);
  });
});
```

- [ ] **Step 2: Run the density tests and confirm RED**

Run: `cd frontend && npm test -- --run src/styles.test.ts`

Expected: FAIL because the density variables and compact component rules do not exist.

- [ ] **Step 3: Commit the RED contract**

```bash
git add frontend/src/styles.test.ts
git commit -m "test: define compact UI density contract"
```

### Task 2: Global Frame and Typography

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/styles.test.ts`

- [ ] **Step 1: Add global density variables**

Add these variables to `:root`:

```css
--crm-font-size: 13px;
--crm-page-title-size: 20px;
--crm-section-title-size: 16px;
--crm-helper-size: 12px;
--crm-header-height: 52px;
--crm-sidebar-width: 216px;
--crm-content-padding: 18px;
--crm-section-gap: 12px;
--crm-card-padding: 14px;
--crm-control-height: 32px;
```

Set body font size and line height to `13px` and `1.45`. Change `Sider width={232}` to `Sider width={216}` so layout geometry matches CSS.

- [ ] **Step 2: Compact the desktop application frame**

Apply the density variables to `.brand-block`, `.app-header`, `.app-content`, `.workspace-header`, page title and helper text. Preserve the existing fixed sidebar and independently scrolling content layout.

- [ ] **Step 3: Add the mobile density override**

Inside `@media (max-width: 900px)`, set:

```css
:root {
  --crm-control-height: 36px;
  --crm-content-padding: 12px;
}
```

Keep the mobile drawer layout, restore button/input minimum height to 36px, and allow header actions to wrap.

- [ ] **Step 4: Run tests and build**

Run: `cd frontend && npm test -- --run src/styles.test.ts src/App.test.tsx`

Expected: density tests and App tests pass.

Run: `cd frontend && npm run build`

Expected: TypeScript and Vite production build succeed.

- [ ] **Step 5: Commit the frame update**

```bash
git add frontend/src/styles.css frontend/src/App.tsx frontend/src/styles.test.ts
git commit -m "style: compact the application frame"
```

### Task 3: Shared Ant Design Component Density

**Files:**
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/styles.test.ts`

- [ ] **Step 1: Compact controls and forms**

Add global selectors for buttons, inputs, selects, date pickers, number inputs and form items. Desktop controls use 32px height; labels and field text use 13px; form items use 12px bottom margin. Do not reduce icon-only hit areas below the active control height.

- [ ] **Step 2: Compact tables and pagination**

Set table header/body font size to 13px, cells to `padding: 9px 10px`, compact table cells to `7px 8px`, and pagination controls to the density control height. Keep horizontal overflow on `.ant-table-wrapper`.

- [ ] **Step 3: Compact cards, drawers, modals and alerts**

Set card head/body, modal body, drawer body, alert, descriptions and empty state spacing from the shared variables. Card titles use 15-16px; cards retain the existing maximum 8px radius.

- [ ] **Step 4: Run density and App tests**

Run: `cd frontend && npm test -- --run src/styles.test.ts src/App.test.tsx`

Expected: all selected tests pass.

- [ ] **Step 5: Commit shared component density**

```bash
git add frontend/src/styles.css frontend/src/styles.test.ts
git commit -m "style: compact shared CRM components"
```

### Task 4: Business and Dashboard Surface Density

**Files:**
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/styles.test.ts`

- [ ] **Step 1: Compact workspace filters and guides**

Reduce `.filter-bar`, `.page-guide`, `.section-title-row`, `.summary-grid` and workspace gap values to the 10-12px range. Preserve wrapping for long filter rows.

- [ ] **Step 2: Compact dashboard and AI cards**

Reduce metric-card minimum heights, card padding, grid gaps and oversized metric typography. Keep key metric values visually stronger than labels and never scale type with viewport width.

- [ ] **Step 3: Compact detail sections and system management**

Reduce `.drawer-section`, `.record-details`, `.system-grid`, `.system-module-grid`, `.ai-draft-fields` and list-row spacing. Keep long Chinese names wrapping or truncating within their containers.

- [ ] **Step 4: Run the complete frontend suite**

Run: `cd frontend && npm test`

Expected: all frontend tests pass with zero failures.

Run: `cd frontend && npm run build`

Expected: production build succeeds.

- [ ] **Step 5: Commit business surface density**

```bash
git add frontend/src/styles.css
git commit -m "style: compact business workspaces"
```

### Task 5: Browser Visual Regression

**Files:**
- Create: `docs/testing/evidence/compact-ui-density-validation-2026-07-20.md`
- Create: `docs/testing/evidence/artifacts/compact-ui-density-20260720/`
- Modify: `docs/superpowers/plans/2026-07-20-compact-ui-density.md`

- [ ] **Step 1: Start or reuse the local application**

Use the current Docker/local backend and start the frontend on the first free local port with the API proxy configured. Record the final URL in the validation report.

- [ ] **Step 2: Capture representative desktop pages**

At 1440x1000, verify and capture `/accounts`, `/contracts`, `/approvals`, `/system/users`, and `/dashboard`. Confirm fixed sidebar, independent content scrolling, compact tables and controls, and no overlap.

- [ ] **Step 3: Capture representative mobile pages**

At 390x844, verify the same five routes. Confirm the navigation drawer, 36px controls, wrapped title actions, horizontally scrollable tables and no body overflow.

- [ ] **Step 4: Run automated browser smoke**

Run the existing V2 and V4 browser smoke scripts against the local URL. Expected: all route/viewport checks pass with zero console failures and zero failed responses.

- [ ] **Step 5: Record evidence**

Write the tested commit, URL, viewport list, route results, test counts, build result and any non-blocking residual risk to `docs/testing/evidence/compact-ui-density-validation-2026-07-20.md`.

- [ ] **Step 6: Commit validation evidence**

```bash
git add docs/superpowers/plans/2026-07-20-compact-ui-density.md docs/testing/evidence/compact-ui-density-validation-2026-07-20.md docs/testing/evidence/artifacts/compact-ui-density-20260720
git commit -m "test: validate compact UI density"
```

### Task 6: Final Verification and Delivery

**Files:**
- Verify: all changed frontend and evidence files

- [ ] **Step 1: Run final verification**

Run: `cd frontend && npm test`

Run: `cd frontend && npm run build`

Run: `git diff --check`

Expected: all commands exit successfully with no failures.

- [ ] **Step 2: Inspect final repository state**

Run: `git status --short` and `git log -5 --oneline`.

Expected: only intentional evidence files are present and all implementation commits are recorded.

- [ ] **Step 3: Push the feature branch**

```bash
git push -u origin codex/compact-ui-density
```

Expected: the remote branch tracks the local feature branch.
