# V1 Contact Relationship Chain Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the V1 contacts page into a customer relationship operation entry.

**Architecture:** Keep the current React page, Ant Design components, and backend contracts. Add display helpers for contact relationship labels, enhance the relationship grouping cards, and replace the raw contact detail drawer with a focused contact operation drawer.

**Tech Stack:** React, TypeScript, Ant Design, Vitest, Testing Library, Vite.

---

### Task 1: Lock The Contact Operation Entry Behavior

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Enrich mocked contact data**

Add `contact_type`, `department`, `mobile`, `email`, `last_communication_summary`, and `next_action` to the first mocked contact.

- [ ] **Step 2: Write the failing test**

Add a test that opens the contacts page, enters a contact operation drawer, and verifies the relationship summary, Chinese labels, recent communication, next action, and business entry links.

- [ ] **Step 3: Run the focused test to verify RED**

Run: `npm test -- App.test.tsx -t "shows the contact relationship operation entry"`

Expected: FAIL because `联系人经营入口` and related operation links are not implemented yet.

### Task 2: Implement Relationship Labels And Drawer

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add contact display helpers**

Map contact role, attitude, heat, and type values to Chinese labels. Keep unknown values visible as-is.

- [ ] **Step 2: Update contact table and relationship groups**

Render Chinese labels in table columns and relationship group cards. Add relationship heat grouping beside role and attitude grouping.

- [ ] **Step 3: Replace raw contact detail drawer**

Replace `RecordDetails` for selected contacts with `ContactOperationDrawer`, including relationship summary, recent communication, next action, and links to customer, opportunity, and activity pages.

- [ ] **Step 4: Add responsive styling**

Add styles for contact operation hero, relationship summary grid, operation entry cards, and next action panel.

### Task 3: Verify, Record, And Handoff

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`

- [ ] **Step 1: Run frontend verification**

Run: `npm test` and `npm run build`.

- [ ] **Step 2: Deploy and run browser UAT**

Copy `frontend/dist` into the local UAT frontend container, open `/contacts`, verify no service error banner, open a contact operation drawer, and check key content.

- [ ] **Step 3: Update the module TODO list**

Mark module 4 as Done, move module 5 to Current, and record commands, browser validation, and commit hash.

- [ ] **Step 4: Commit and push**

Commit implementation and progress docs, then push `main` to GitHub.
