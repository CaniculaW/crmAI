# V2 Solution Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build V2 solution document management so sales and presales users can manage方案标书 records linked to customers and opportunities, including attachment add/delete/download capability.

**Architecture:** Add a focused backend `solution` module with Flyway migration, permission-gated REST APIs, audit logging, and data-permission checks delegated through the linked opportunity/account context. Reuse the existing generic `crm_attachments` table and `/api/attachments` APIs by adding support for `object_type=solution_document`; the frontend adds a `方案标书` menu, solution list/detail workflows, opportunity entry link, and attachment UI that opens `file_url` for downloads.

**Tech Stack:** Spring Boot, JdbcTemplate, Flyway, JUnit/TestRestTemplate, React, TypeScript, Ant Design, Vitest, Vite, Chrome DevTools Protocol.

---

## Files

- Create: `backend/src/main/resources/db/migration/V15__create_solution_documents.sql`
- Create: `backend/src/main/java/com/canicula/crmai/solution/SolutionDocumentController.java`
- Create: `backend/src/main/java/com/canicula/crmai/solution/SolutionDocumentService.java`
- Create: `backend/src/main/java/com/canicula/crmai/solution/SolutionDocumentCreateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/solution/SolutionDocumentUpdateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/solution/SolutionDocumentVoidRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/solution/SolutionDocumentListFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/solution/SolutionDocumentResponse.java`
- Create: `backend/src/test/java/com/canicula/crmai/solution/SolutionDocumentControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `docs/product/crm-v2-development-todolist.md`
- Optional Create: `/private/tmp/crm-v2-solution-documents-browser-smoke.mjs`

## TODOList

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 后端数据模型与权限 | Pending | V15 migration creates solution table and permission points; migration tests pass |
| 2 | 后端方案标书 API | Pending | Create/list/detail/update/void API tests pass with audit and data permission |
| 3 | 附件对象扩展 | Pending | `solution_document` attachments can be created, listed, deleted, and opened by `file_url` |
| 4 | 前端 API 与菜单 | Pending | `方案标书` menu and API client typed; frontend tests cover nav and opportunity link |
| 5 | 前端页面与附件 UI | Pending | List/detail/create/edit/void and attachment add/delete/download tests pass |
| 6 | 自动化验证与 UAT | Pending | `mvn test`, `npm test`, `npm run build`, browser Smoke pass |
| 7 | 记录、提交、切换 | Pending | Module 2 Done, module 3 Current, commit and push recorded |

## Task 1: Backend Data Model And Permissions

**Files:**
- Create: `backend/src/main/resources/db/migration/V15__create_solution_documents.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write migration tests first**

Add assertions to `DatabaseMigrationTest` and `PostgresMigrationIT` that check:

```java
Integer solutionTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_schema = 'PUBLIC'
          and table_name = 'CRM_SOLUTION_DOCUMENTS'
        """,
        Integer.class);
Integer solutionPermissionCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from sys_permissions
        where permission_code in ('solution.read', 'solution.create', 'solution.update', 'solution.void')
        """,
        Integer.class);

assertThat(solutionTableCount).isEqualTo(1);
assertThat(solutionPermissionCount).isEqualTo(4);
```

For `PostgresMigrationIT`, use lowercase table/schema names consistent with the existing file:

```java
Integer solutionTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'crm_solution_documents'
        """,
        Integer.class);
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: FAIL because `crm_solution_documents` and `solution.*` permissions do not exist yet.

- [ ] **Step 3: Add migration**

Create `V15__create_solution_documents.sql` with:

```sql
create table crm_solution_documents (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    account_id bigint not null references crm_accounts(id),
    opportunity_id bigint not null references crm_opportunities(id),
    document_name varchar(255) not null,
    document_type varchar(64) not null,
    version_no varchar(64),
    status varchar(64) not null,
    owner_user_id bigint not null references sys_users(id),
    customer_requirement_summary text,
    technical_solution_summary text,
    stakeholder_strategy text,
    quotation_amount numeric(18, 2),
    cost_amount numeric(18, 2),
    estimated_gross_margin_rate numeric(8, 4),
    bid_self_check_result varchar(64),
    bid_risk_description text,
    submitted_to_customer_at timestamp with time zone,
    customer_feedback text,
    void_reason varchar(255),
    voided_at timestamp with time zone,
    voided_by bigint references sys_users(id),
    remark varchar(512),
    created_by bigint,
    created_at timestamp with time zone not null default current_timestamp,
    updated_by bigint,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone,
    version integer not null default 0
);

create index idx_crm_solution_documents_account
    on crm_solution_documents (account_id);

create index idx_crm_solution_documents_opportunity
    on crm_solution_documents (opportunity_id);

create index idx_crm_solution_documents_status
    on crm_solution_documents (status);

create index idx_crm_solution_documents_owner
    on crm_solution_documents (owner_user_id);

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'solution.read', '查看方案标书', 'operation', 'solution', 700
where not exists (select 1 from sys_permissions where permission_code = 'solution.read');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'solution.create', '新增方案标书', 'operation', 'solution', 710
where not exists (select 1 from sys_permissions where permission_code = 'solution.create');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'solution.update', '编辑方案标书', 'operation', 'solution', 720
where not exists (select 1 from sys_permissions where permission_code = 'solution.update');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'solution.void', '作废方案标书', 'operation', 'solution', 730
where not exists (select 1 from sys_permissions where permission_code = 'solution.void');
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: PASS with the new migration assertions.

## Task 2: Backend Solution Document API

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/solution/SolutionDocumentControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/solution/*.java`

- [ ] **Step 1: Write API tests**

Create `SolutionDocumentControllerTest` with tests for:

```java
@Test
void createsListsUpdatesAndVoidsSolutionDocumentWithAudit() {
    // create department, user with account.create, opportunity.create, solution.create,
    // solution.read, solution.update, solution.void, attachment.* permissions
    // create account and opportunity through existing helper methods
    // POST /api/solutions with document_name, document_type, version_no, status,
    // quotation_amount, cost_amount, bid_self_check_result
    // GET /api/solutions?opportunity_id={id}
    // PATCH /api/solutions/{id}
    // POST /api/solutions/{id}/void
    // assert response fields and audit count for solution.create/update/void
}

@Test
void deniesSolutionDocumentWhenLinkedOpportunityIsNotReadable() {
    // create hidden opportunity under another owner
    // viewer has solution.read but no data scope to opportunity
    // GET /api/solutions?opportunity_id={hiddenId}
    // expect 403 or empty data according to existing data-permission behavior
}
```

Use the existing test helper style from `OpportunityControllerTest`: `createDepartment`, `createLoginReadyUser`, `login`, `createAccount`, `createOpportunity`, and `authHeaders`.

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=SolutionDocumentControllerTest test
```

Expected: FAIL because the controller and service do not exist.

- [ ] **Step 3: Implement request/response records**

Create:

```java
public record SolutionDocumentCreateRequest(
        @NotNull Long account_id,
        @NotNull Long opportunity_id,
        @NotBlank String document_name,
        @NotBlank String document_type,
        String version_no,
        @NotBlank String status,
        @NotNull Long owner_user_id,
        String customer_requirement_summary,
        String technical_solution_summary,
        String stakeholder_strategy,
        BigDecimal quotation_amount,
        BigDecimal cost_amount,
        BigDecimal estimated_gross_margin_rate,
        String bid_self_check_result,
        String bid_risk_description,
        OffsetDateTime submitted_to_customer_at,
        String customer_feedback,
        String remark) {}
```

`SolutionDocumentUpdateRequest` uses nullable fields with the same names except `account_id` and `opportunity_id` stay immutable in V2. `SolutionDocumentVoidRequest` contains `@NotBlank String void_reason`.

`SolutionDocumentResponse` returns all table fields needed by the frontend:

```java
public record SolutionDocumentResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        String document_name,
        String document_type,
        String version_no,
        String status,
        Long owner_user_id,
        String customer_requirement_summary,
        String technical_solution_summary,
        String stakeholder_strategy,
        BigDecimal quotation_amount,
        BigDecimal cost_amount,
        BigDecimal estimated_gross_margin_rate,
        String bid_self_check_result,
        String bid_risk_description,
        OffsetDateTime submitted_to_customer_at,
        String customer_feedback,
        String void_reason,
        OffsetDateTime voided_at,
        Long voided_by,
        String remark,
        OffsetDateTime updated_at) {}
```

- [ ] **Step 4: Implement service and controller**

`SolutionDocumentService` must:

- Validate linked account is readable with `AccountService.readableDetail`.
- Validate linked opportunity is readable with `OpportunityService.readableDetail`.
- Ensure `opportunity.account_id()` equals request `account_id`.
- Support list filters: keyword, account_id, opportunity_id, document_type, status, bid_self_check_result, owner_user_id.
- Insert, update, detail, void records.
- Expose `readableDetail(Long solutionId, Long userId)` for attachment object validation.

`SolutionDocumentController` routes:

- `POST /api/solutions` with `@RequirePermission("solution.create")`
- `GET /api/solutions` with `@RequirePermission("solution.read")`
- `GET /api/solutions/{solutionId}` with `@RequirePermission("solution.read")`
- `PATCH /api/solutions/{solutionId}` with `@RequirePermission("solution.update")`
- `POST /api/solutions/{solutionId}/void` with `@RequirePermission("solution.void")`

Audit actions:

- `solution.create`
- `solution.update`
- `solution.void`

- [ ] **Step 5: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=SolutionDocumentControllerTest test
```

Expected: PASS.

## Task 3: Attachment Support For Solution Documents

**Files:**
- Modify: `backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java`

- [ ] **Step 1: Write attachment regression tests**

Add one test to `AttachmentControllerTest`:

```java
@Test
void managesAttachmentsForSolutionDocuments() {
    // user has account.create, opportunity.create, solution.create, solution.read,
    // attachment.create, attachment.read, attachment.delete
    // create account, opportunity, solution document
    // POST /api/attachments with object_type=solution_document and object_id=solutionId
    // GET /api/attachments?object_type=solution_document&object_id={solutionId}
    // DELETE /api/attachments/{id}
    // assert created/list/deleted and attachment audit rows
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=AttachmentControllerTest test
```

Expected: FAIL with `不支持的附件对象类型`.

- [ ] **Step 3: Extend AttachmentService**

Inject `SolutionDocumentService` and add:

```java
case "solution_document" -> solutionDocumentService.readableDetail(objectId, actorUserId);
```

Keep existing account/contact/opportunity/activity behavior unchanged.

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=AttachmentControllerTest test
```

Expected: PASS.

## Task 4: Frontend API, Navigation, And Tests

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add failing frontend tests**

Add tests that assert:

```tsx
it("renders solution documents as a V2 business menu and opportunity entry", async () => {
  const user = userEvent.setup();
  mockCrmFetch();
  render(<App />);
  await loginThroughUi(user);

  expect(screen.getByRole("link", { name: "方案标书" })).toBeInTheDocument();

  await user.click(screen.getByRole("link", { name: "商机" }));
  await screen.findByRole("button", { name: "测试商机A" });
  await user.click(screen.getByRole("button", { name: "测试商机A" }));

  expect(await screen.findByRole("link", { name: "准备方案标书" })).toHaveAttribute("href", "/solutions");
});

it("creates and manages a solution document with attachments", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.open = vi.fn();

  render(<App />);
  await loginThroughUi(user);

  await user.click(screen.getByRole("link", { name: "方案标书" }));
  expect(await screen.findByRole("heading", { name: "方案标书" })).toBeInTheDocument();
  expect(screen.getByText("测试方案A")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "新建方案标书" }));
  await user.type(screen.getByLabelText("方案/标书名称"), "新增技术方案");
  await user.click(screen.getByRole("button", { name: "保存方案标书" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/solutions",
    expect.objectContaining({ method: "POST", body: expect.stringContaining("新增技术方案") })
  ));

  await user.click(screen.getByRole("button", { name: "测试方案A" }));
  await user.click(screen.getByRole("button", { name: "新增附件" }));
  await user.type(screen.getByLabelText("文件名称"), "方案报价.pdf");
  await user.type(screen.getByLabelText("文件地址"), "https://example.com/方案报价.pdf");
  await user.click(screen.getByRole("button", { name: "保存附件" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/attachments",
    expect.objectContaining({ method: "POST", body: expect.stringContaining("solution_document") })
  ));

  await user.click(screen.getByRole("button", { name: "下载附件" }));
  expect(window.open).toHaveBeenCalledWith("https://example.com/solution-a.pdf", "_blank", "noopener,noreferrer");
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd frontend && npm test -- App.test.tsx -t "solution|方案标书"
```

Expected: FAIL because `方案标书` navigation and pages do not exist.

- [ ] **Step 3: Add frontend types and API client**

In `crm.ts`, add `SolutionDocument` and `Attachment` types plus:

```ts
solutions: {
  list: (query?: QueryParams) => requestJson<SolutionDocument[]>(withQuery("/api/solutions", query)),
  detail: (id: number) => requestJson<SolutionDocument>(`/api/solutions/${id}`),
  create: (body: Record<string, unknown>) =>
    requestJson<SolutionDocument>("/api/solutions", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Record<string, unknown>) =>
    requestJson<SolutionDocument>(`/api/solutions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  void: (id: number, body: Record<string, unknown>) =>
    requestJson<SolutionDocument>(`/api/solutions/${id}/void`, { method: "POST", body: JSON.stringify(body) })
},
attachments: {
  list: (query?: QueryParams) => requestJson<Attachment[]>(withQuery("/api/attachments", query)),
  create: (body: Record<string, unknown>) =>
    requestJson<Attachment>("/api/attachments", { method: "POST", body: JSON.stringify(body) }),
  delete: (id: number) => requestJson<{ deleted: boolean }>(`/api/attachments/${id}`, { method: "DELETE" })
}
```

- [ ] **Step 4: Implement navigation and page**

In `App.tsx`:

- Add `FileText` or existing lucide icon import.
- Add nav item `{ key: "/solutions", label: "方案标书", icon: <FileText size={18} />, permission: "solution.read" }` after 商机.
- Add route `<Route path="/solutions" element={<SolutionsPage currentUser={user} />} />`.
- Add `准备方案标书` entry to `OpportunityProgressDrawer`.
- Implement `SolutionsPage` with list/filter/create drawer/detail drawer/edit modal/void modal.
- Implement `SolutionDetailDrawer` with attachment list and add/delete/download actions.

Frontend labels must use:

- Page heading: `方案标书`
- Guide: `先按商机确认方案、报价、标书自评和附件是否齐备；有风险的标书自评要回到商机风险处理。`
- Detail heading: `方案标书归档入口`
- Buttons: `新建方案标书`, `保存方案标书`, `新增附件`, `保存附件`, `下载附件`, `删除附件`

- [ ] **Step 5: Run GREEN**

Run:

```bash
cd frontend && npm test -- App.test.tsx -t "solution|方案标书"
```

Expected: PASS.

## Task 5: Full Verification And UAT

**Files:**
- Optional Create: `/private/tmp/crm-v2-solution-documents-browser-smoke.mjs`
- Modify: `docs/product/crm-v2-development-todolist.md`

- [ ] **Step 1: Run backend verification**

Run:

```bash
cd backend && mvn test
```

Expected: PASS with all backend tests.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
```

Expected: PASS. Vite chunk-size warnings are acceptable if exit code is 0.

- [ ] **Step 3: Sync UAT frontend build**

Run:

```bash
docker exec crm-ai-v1-test-frontend-1 sh -c 'rm -rf /usr/share/nginx/html/*'
docker cp frontend/dist/. crm-ai-v1-test-frontend-1:/usr/share/nginx/html/
```

Expected: Both commands exit 0.

- [ ] **Step 4: Run browser Smoke**

Create and run a CDP script that:

- Logs in through `http://127.0.0.1:5174/`.
- Visits `/solutions`.
- Confirms `方案标书`, `新建方案标书`, `测试方案A`.
- Opens solution detail and confirms attachment section.
- Clicks `下载附件` and verifies `window.open` is called or an anchor target exists.
- Confirms no `服务端异常` and no console application errors.
- Saves screenshot to `/private/tmp/v2-solution-documents-smoke.png`.

Run:

```bash
node /private/tmp/crm-v2-solution-documents-browser-smoke.mjs
```

Expected: JSON output with `"status": "passed"`.

## Task 6: Documentation, Commit, And Module Switch

**Files:**
- Modify: `docs/product/crm-v2-development-todolist.md`
- Modify: `docs/superpowers/plans/2026-06-28-v2-solution-documents.md`

- [ ] **Step 1: Update TODOList**

Update `docs/product/crm-v2-development-todolist.md`:

- Module 2 `方案与标书链路` status: `Done`
- Module 3 `合同管理链路` status: `Current`
- Current task: `v2-contract-management-design`
- Record verification commands and screenshot path.
- Record commit hash after commit.
- Residual issues: `无` unless verification exposes a concrete issue.

- [ ] **Step 2: Check off this implementation plan**

Update this plan’s TODO table and task checkboxes from `Pending`/`[ ]` to `Done`/`[x]` as evidence is produced.

- [ ] **Step 3: Commit and push**

Run:

```bash
git add backend frontend docs
git commit -m "feat: add v2 solution documents"
git push origin main
```

Expected: Commit and push exit 0.

## Self-Review

- Spec coverage: Covers solution document list/detail/create/edit/void, opportunity entry link, attachment add/delete/download, backend API, permissions, audit, tests, build, UAT, and module switch.
- Placeholder scan: No TBD or unspecified implementation steps remain.
- Type consistency: Uses `SolutionDocument*` names consistently and `object_type=solution_document` consistently for attachments.
- Scope check: Does not implement contracts, invoices, payments, dashboards, AI, object storage integration, or online file preview.
