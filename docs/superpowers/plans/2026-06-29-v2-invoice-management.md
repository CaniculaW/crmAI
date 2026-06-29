# V2 Invoice Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build V2 invoice management so contract execution can produce invoice plans, applications, issued invoices, customer sign-off, exception handling, voiding, and invoice attachments with amount guardrails for later receivable and reconciliation modules.

**Architecture:** Add a focused backend `invoice` module with Flyway migration, permission-gated REST APIs, audit logging, and data-permission checks through the linked contract account/opportunity. Reuse the existing generic attachment service by adding `object_type=invoice`. The frontend adds an `开票管理` workflow under the V2 finance area with list filters, detail drawer, state actions, amount summary, and attachment add/delete/download controls.

**Tech Stack:** Spring Boot, JdbcTemplate, Flyway, JUnit/TestRestTemplate, React, TypeScript, Ant Design, Vitest, Vite, browser Smoke.

---

## Files

- Create: `backend/src/main/resources/db/migration/V17__create_invoices.sql`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceController.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceService.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceCreateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceUpdateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceApplyRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceIssueRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceSignRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceExceptionRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceVoidRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceListFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceResponse.java`
- Create: `backend/src/test/java/com/canicula/crmai/invoice/InvoiceControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `docs/api/crm-v1-api-list.md`
- Modify: `docs/product/crm-v2-development-todolist.md`
- Optional Create: `/private/tmp/crm-v2-invoice-management-browser-smoke.mjs`

## Task List

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 后端数据模型与权限 | Pending | V17 migration creates invoice table, dictionary rows, permission points; migration tests pass |
| 2 | 后端开票计划 API | Pending | Create/list/detail/update API tests pass with data permission and contract linkage |
| 3 | 状态动作与金额校验 | Pending | Apply/issue/sign/exception/void tests pass; cumulative effective issued amount never exceeds contract amount |
| 4 | 附件对象扩展 | Pending | `invoice` attachments can be created, listed, deleted, and opened by `file_url` |
| 5 | 前端 API 与菜单 | Pending | Typed invoice API client and `开票管理` entry are covered by frontend tests |
| 6 | 前端开票页面 | Pending | List/detail/create/edit/apply/issue/sign/exception/void/attachment UI tests pass |
| 7 | OpenAPI 与接口清单 | Pending | Invoice endpoints are covered by OpenAPI coverage test and API list |
| 8 | 自动化验证、UAT、记录提交 | Pending | `mvn test`, OpenAPI coverage, `npm test`, `npm run build`, browser Smoke pass; module state recorded |

## Task 1: Backend Data Model And Permissions

**Files:**
- Create: `backend/src/main/resources/db/migration/V17__create_invoices.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write migration assertions first**

Add H2 assertions in `DatabaseMigrationTest`:

```java
Integer invoiceTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_name = 'crm_invoices'
        """,
        Integer.class);
Integer invoicePermissionCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from sys_permissions
        where permission_code in (
          'invoice.read', 'invoice.create', 'invoice.update', 'invoice.apply',
          'invoice.issue', 'invoice.sign', 'invoice.exception', 'invoice.void'
        )
        """,
        Integer.class);

assertThat(migrationCount).isGreaterThanOrEqualTo(17);
assertThat(invoiceTableCount).isEqualTo(1);
assertThat(invoicePermissionCount).isEqualTo(8);
```

Add PostgreSQL assertions in `PostgresMigrationIT`:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("17");
Integer invoiceTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'crm_invoices'
        """,
        Integer.class);
assertThat(invoiceTableCount).isEqualTo(1);
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: FAIL because the V17 invoice migration does not exist.

- [ ] **Step 3: Add migration**

Create `backend/src/main/resources/db/migration/V17__create_invoices.sql`:

```sql
create table crm_invoices (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    account_id bigint not null references crm_accounts(id),
    opportunity_id bigint references crm_opportunities(id),
    contract_id bigint not null references crm_contracts(id),
    plan_name varchar(255) not null,
    invoice_status varchar(64) not null,
    invoice_type varchar(64) not null,
    planned_invoice_date timestamp with time zone not null,
    planned_amount numeric(18, 2) not null,
    applied_amount numeric(18, 2),
    applied_at timestamp with time zone,
    applied_by bigint references sys_users(id),
    application_note varchar(512),
    invoice_code varchar(128),
    invoice_no varchar(128),
    invoice_date timestamp with time zone,
    tax_rate numeric(8, 4) not null,
    net_amount numeric(18, 2),
    tax_amount numeric(18, 2),
    actual_invoice_amount numeric(18, 2),
    signed_at timestamp with time zone,
    signed_by_name varchar(128),
    sign_note varchar(512),
    exception_type varchar(64),
    exception_reason varchar(512),
    exception_resolution varchar(512),
    void_reason varchar(512),
    voided_at timestamp with time zone,
    voided_by bigint references sys_users(id),
    owner_user_id bigint not null references sys_users(id),
    remark varchar(512),
    created_by bigint,
    created_at timestamp with time zone not null default current_timestamp,
    updated_by bigint,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone,
    version integer not null default 0
);

create index idx_crm_invoices_account
    on crm_invoices (account_id);

create index idx_crm_invoices_opportunity
    on crm_invoices (opportunity_id);

create index idx_crm_invoices_contract
    on crm_invoices (contract_id);

create index idx_crm_invoices_status
    on crm_invoices (invoice_status);

create unique index uk_crm_invoices_no_active
    on crm_invoices (invoice_no)
    ${activeRecordFilter};

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.read', '查看开票', 'operation', 'invoice', 900
where not exists (select 1 from sys_permissions where permission_code = 'invoice.read');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.create', '新增开票计划', 'operation', 'invoice', 910
where not exists (select 1 from sys_permissions where permission_code = 'invoice.create');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.update', '编辑开票计划', 'operation', 'invoice', 920
where not exists (select 1 from sys_permissions where permission_code = 'invoice.update');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.apply', '提交开票申请', 'operation', 'invoice', 930
where not exists (select 1 from sys_permissions where permission_code = 'invoice.apply');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.issue', '登记发票', 'operation', 'invoice', 940
where not exists (select 1 from sys_permissions where permission_code = 'invoice.issue');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.sign', '确认发票签收', 'operation', 'invoice', 950
where not exists (select 1 from sys_permissions where permission_code = 'invoice.sign');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.exception', '登记开票异常', 'operation', 'invoice', 960
where not exists (select 1 from sys_permissions where permission_code = 'invoice.exception');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'invoice.void', '作废发票', 'operation', 'invoice', 970
where not exists (select 1 from sys_permissions where permission_code = 'invoice.void');
```

The `invoice_no` unique index intentionally only applies to active rows with a non-null invoice number through `${activeRecordFilter}`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: PASS.

Run:

```bash
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: PASS if local PostgreSQL integration profile is available.

## Task 2: Backend Invoice Plan APIs

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/invoice/InvoiceControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceController.java`
- Create: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceService.java`
- Create: request/response/filter records under `backend/src/main/java/com/canicula/crmai/invoice/`

- [ ] **Step 1: Write API tests**

Create `InvoiceControllerTest` with these test methods:

```java
@Test
void createsListsDetailsAndUpdatesInvoicePlanWithContractScope() {
    // login as user with invoice.create/read/update plus account/opportunity/contract permissions
    // create account, opportunity, and contract
    // POST /api/invoices with planned status data
    // GET /api/invoices?contract_id={id}
    // GET /api/invoices/{id}
    // PATCH /api/invoices/{id}
    // assert account_id and opportunity_id are copied from the linked contract
    // assert audit rows for invoice.create and invoice.update
}

@Test
void listFiltersOutUnreadableInvoices() {
    // create invoice linked to another user's scoped account/opportunity
    // login as viewer with invoice.read but without linked data scope
    // GET /api/invoices
    // assert the unreadable invoice is absent
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=InvoiceControllerTest test
```

Expected: FAIL because invoice APIs do not exist.

- [ ] **Step 3: Add request and response records**

Create records using snake_case JSON names:

```java
public record InvoiceCreateRequest(
        Long contract_id,
        String plan_name,
        OffsetDateTime planned_invoice_date,
        BigDecimal planned_amount,
        String invoice_type,
        BigDecimal tax_rate,
        Long owner_user_id,
        String invoice_terms_snapshot,
        String remark) {
}
```

```java
public record InvoiceUpdateRequest(
        String plan_name,
        OffsetDateTime planned_invoice_date,
        BigDecimal planned_amount,
        String invoice_type,
        BigDecimal tax_rate,
        Long owner_user_id,
        String remark) {
}
```

```java
public record InvoiceListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String invoice_status,
        String invoice_type,
        Long owner_user_id,
        OffsetDateTime planned_from,
        OffsetDateTime planned_to,
        OffsetDateTime invoice_date_from,
        OffsetDateTime invoice_date_to,
        Boolean exception_only) {
}
```

```java
public record InvoiceResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String plan_name,
        String invoice_status,
        String invoice_type,
        OffsetDateTime planned_invoice_date,
        BigDecimal planned_amount,
        BigDecimal applied_amount,
        OffsetDateTime applied_at,
        Long applied_by,
        String application_note,
        String invoice_code,
        String invoice_no,
        OffsetDateTime invoice_date,
        BigDecimal tax_rate,
        BigDecimal net_amount,
        BigDecimal tax_amount,
        BigDecimal actual_invoice_amount,
        OffsetDateTime signed_at,
        String signed_by_name,
        String sign_note,
        String exception_type,
        String exception_reason,
        String exception_resolution,
        String void_reason,
        OffsetDateTime voided_at,
        Long voided_by,
        Long owner_user_id,
        BigDecimal contract_amount,
        BigDecimal effective_invoiced_amount,
        BigDecimal remaining_invoice_amount,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
```

- [ ] **Step 4: Implement controller routes**

Create `InvoiceController` with:

```java
@RestController
@RequestMapping("/api/invoices")
class InvoiceController {
    private final InvoiceService invoiceService;
    private final AuditLogService auditLogService;

    InvoiceController(InvoiceService invoiceService, AuditLogService auditLogService) {
        this.invoiceService = invoiceService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @RequirePermission("invoice.read")
    ApiResponse<List<InvoiceResponse>> list(@AuthenticationPrincipal AuthenticatedUser user, InvoiceListFilter filter) {
        return ApiResponse.ok(invoiceService.readableList(user.id(), filter));
    }

    @GetMapping("/{invoiceId}")
    @RequirePermission("invoice.read")
    ApiResponse<InvoiceResponse> detail(@PathVariable Long invoiceId, @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(invoiceService.readableDetail(invoiceId, user.id()));
    }

    @PostMapping
    @RequirePermission("invoice.create")
    ApiResponse<InvoiceResponse> create(@RequestBody InvoiceCreateRequest request, @AuthenticationPrincipal AuthenticatedUser user) {
        InvoiceResponse response = invoiceService.create(request, user.id());
        auditLogService.log(user.id(), "invoice.create", "invoice", response.id(), "新增开票计划");
        return ApiResponse.ok(response);
    }

    @PatchMapping("/{invoiceId}")
    @RequirePermission("invoice.update")
    ApiResponse<InvoiceResponse> update(@PathVariable Long invoiceId, @RequestBody InvoiceUpdateRequest request, @AuthenticationPrincipal AuthenticatedUser user) {
        InvoiceResponse response = invoiceService.update(invoiceId, request, user.id());
        auditLogService.log(user.id(), "invoice.update", "invoice", invoiceId, "编辑开票计划");
        return ApiResponse.ok(response);
    }
}
```

Adjust imports to match the project's existing security principal and API response classes.

- [ ] **Step 5: Implement service create/list/detail/update**

`InvoiceService` should:

- Inject `JdbcTemplate` and `ContractService`.
- Use `contractService.readableDetail(contractId, actorUserId)` before create or read actions.
- Copy `account_id` and `opportunity_id` from the linked contract.
- Validate `planned_amount > 0`.
- Calculate `net_amount = amount / (1 + taxRate)`, `tax_amount = amount - net_amount`, scale 2 with `HALF_UP`.
- Hide unreadable rows in list queries by catching access errors, matching `ContractService.readableList`.
- Reject editing `planned_amount` when current status is `invoiced`, `signed`, or `voided`.

- [ ] **Step 6: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=InvoiceControllerTest test
```

Expected: PASS.

## Task 3: Status Actions And Amount Guardrails

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/invoice/InvoiceControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceController.java`
- Modify: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceService.java`
- Create: action request records under `backend/src/main/java/com/canicula/crmai/invoice/`

- [ ] **Step 1: Add state transition tests**

Add tests:

```java
@Test
void appliesIssuesSignsRegistersExceptionAndVoidsInvoiceWithAudit() {
    // create invoice plan
    // POST /api/invoices/{id}/apply with applied_amount
    // POST /api/invoices/{id}/issue with invoice_no, invoice_date, actual_invoice_amount, tax_rate
    // POST /api/invoices/{id}/sign with signed_by_name
    // create another invoice, apply, issue, then POST /exception
    // create another invoice, apply, issue, then POST /void
    // assert statuses and audit rows for invoice.apply/issue/sign/exception/void
}

@Test
void rejectsEffectiveInvoiceAmountAboveContractAmountAndReleasesAmountAfterVoid() {
    // create contract amount 100000
    // issue invoice amount 80000
    // issue second invoice amount 30000 and expect business rule error
    // void first invoice
    // issue second invoice amount 30000 and expect success
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=InvoiceControllerTest test
```

Expected: FAIL because state action endpoints do not exist.

- [ ] **Step 3: Add action request records**

Create:

```java
public record InvoiceApplyRequest(
        BigDecimal applied_amount,
        OffsetDateTime applied_at,
        String application_note) {
}
```

```java
public record InvoiceIssueRequest(
        String invoice_code,
        String invoice_no,
        OffsetDateTime invoice_date,
        BigDecimal tax_rate,
        BigDecimal actual_invoice_amount) {
}
```

```java
public record InvoiceSignRequest(
        OffsetDateTime signed_at,
        String signed_by_name,
        String sign_note) {
}
```

```java
public record InvoiceExceptionRequest(
        String exception_type,
        String exception_reason,
        String exception_resolution) {
}
```

```java
public record InvoiceVoidRequest(String void_reason) {
}
```

- [ ] **Step 4: Add controller action routes**

Add:

```java
@PostMapping("/{invoiceId}/apply")
@RequirePermission("invoice.apply")
ApiResponse<InvoiceResponse> apply(@PathVariable Long invoiceId, @RequestBody InvoiceApplyRequest request, @AuthenticationPrincipal AuthenticatedUser user) {
    InvoiceResponse response = invoiceService.apply(invoiceId, request, user.id());
    auditLogService.log(user.id(), "invoice.apply", "invoice", invoiceId, "提交开票申请");
    return ApiResponse.ok(response);
}
```

Repeat the same pattern for:

- `POST /api/invoices/{invoiceId}/issue` with `invoice.issue`
- `POST /api/invoices/{invoiceId}/sign` with `invoice.sign`
- `POST /api/invoices/{invoiceId}/exception` with `invoice.exception`
- `POST /api/invoices/{invoiceId}/void` with `invoice.void`

- [ ] **Step 5: Implement service transitions**

Rules:

- `apply`: current status must be `planned` or `exception`; `applied_amount > 0`; update status to `applied`.
- `issue`: current status must be `applied`; require invoice number, invoice date, tax rate, actual amount; check remaining contract amount; update status to `invoiced`.
- `sign`: current status must be `invoiced`; require signed person or note; update status to `signed`.
- `exception`: current status must not be `voided`; require exception type and reason; update status to `exception`.
- `void`: current status must be `invoiced` or `exception`; require reason; update status to `voided`.

Amount helper:

```java
private BigDecimal effectiveInvoicedAmount(Long contractId, Long currentInvoiceId) {
    BigDecimal total = jdbcTemplate.queryForObject(
            """
            select coalesce(sum(actual_invoice_amount), 0)
            from crm_invoices
            where contract_id = ?
              and id <> ?
              and deleted_at is null
              and invoice_status in ('invoiced', 'signed')
            """,
            BigDecimal.class,
            contractId,
            currentInvoiceId == null ? -1L : currentInvoiceId);
    return total == null ? BigDecimal.ZERO : total;
}
```

Remaining amount check:

```java
BigDecimal effectiveTotal = effectiveInvoicedAmount(contractId, invoiceId).add(actualInvoiceAmount);
if (effectiveTotal.compareTo(contract.contract_amount()) > 0) {
    throw new BusinessRuleException("累计有效开票金额不能超过合同金额");
}
```

- [ ] **Step 6: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=InvoiceControllerTest test
```

Expected: PASS.

## Task 4: Invoice Attachment Support

**Files:**
- Modify: `backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java`

- [ ] **Step 1: Add attachment test**

Add a test:

```java
@Test
void createsListsAndDeletesInvoiceAttachment() {
    // create account, opportunity, contract, and invoice
    // POST /api/attachments with object_type=invoice and object_id={invoiceId}
    // GET /api/attachments?object_type=invoice&object_id={invoiceId}
    // DELETE /api/attachments/{attachmentId}
    // GET again and assert empty
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=AttachmentControllerTest test
```

Expected: FAIL because `invoice` object type is not accepted.

- [ ] **Step 3: Extend attachment service**

Inject `InvoiceService`:

```java
private final InvoiceService invoiceService;
```

Allow:

```java
case "invoice" -> invoiceService.readableDetail(objectId, actorUserId);
```

Keep the same access behavior as `solution_document` and `contract`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=AttachmentControllerTest test
```

Expected: PASS.

## Task 5: Frontend API And Navigation

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add frontend failing tests**

In `App.test.tsx`, add permissions to the mock user:

```ts
"invoice.read",
"invoice.create",
"invoice.update",
"invoice.apply",
"invoice.issue",
"invoice.sign",
"invoice.exception",
"invoice.void"
```

Add a test:

```ts
it("renders invoice module and loads list", async () => {
  render(<App />);
  await login();
  await userEvent.click(await screen.findByText("开票管理"));
  expect(await screen.findByRole("heading", { name: "开票管理" })).toBeInTheDocument();
  expect(await screen.findByText("V2 UAT 首期开票")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd frontend && npm test
```

Expected: FAIL because invoice API and page do not exist.

- [ ] **Step 3: Add TypeScript types and API client**

Add:

```ts
export type Invoice = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  plan_name: string;
  invoice_status: string;
  invoice_type: string;
  planned_invoice_date: string;
  planned_amount: number;
  applied_amount?: number;
  applied_at?: string;
  applied_by?: number;
  application_note?: string;
  invoice_code?: string;
  invoice_no?: string;
  invoice_date?: string;
  tax_rate: number;
  net_amount?: number;
  tax_amount?: number;
  actual_invoice_amount?: number;
  signed_at?: string;
  signed_by_name?: string;
  sign_note?: string;
  exception_type?: string;
  exception_reason?: string;
  exception_resolution?: string;
  void_reason?: string;
  voided_at?: string;
  voided_by?: number;
  owner_user_id: number;
  contract_amount?: number;
  effective_invoiced_amount?: number;
  remaining_invoice_amount?: number;
  remark?: string;
  created_at?: string;
  updated_at?: string;
};
```

Add `crmApi.invoices`:

```ts
invoices: {
  list: (query?: QueryParams) => requestJson<Invoice[]>(withQuery("/api/invoices", query)),
  detail: (id: number) => requestJson<Invoice>(`/api/invoices/${id}`),
  create: (body: Partial<Invoice>) => requestJson<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<Invoice>) => requestJson<Invoice>(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apply: (id: number, body: Record<string, unknown>) => requestJson<Invoice>(`/api/invoices/${id}/apply`, { method: "POST", body: JSON.stringify(body) }),
  issue: (id: number, body: Record<string, unknown>) => requestJson<Invoice>(`/api/invoices/${id}/issue`, { method: "POST", body: JSON.stringify(body) }),
  sign: (id: number, body: Record<string, unknown>) => requestJson<Invoice>(`/api/invoices/${id}/sign`, { method: "POST", body: JSON.stringify(body) }),
  exception: (id: number, body: Record<string, unknown>) => requestJson<Invoice>(`/api/invoices/${id}/exception`, { method: "POST", body: JSON.stringify(body) }),
  void: (id: number, body: Record<string, unknown>) => requestJson<Invoice>(`/api/invoices/${id}/void`, { method: "POST", body: JSON.stringify(body) })
}
```

- [ ] **Step 4: Add navigation entry**

Add menu entry:

```tsx
{ key: "/invoices", label: "开票管理", icon: <ReceiptText size={18} />, permission: "invoice.read" }
```

Add route:

```tsx
<Route path="/invoices" element={<InvoicesPage currentUser={user} />} />
```

- [ ] **Step 5: Run frontend tests**

Run:

```bash
cd frontend && npm test
```

Expected: PASS after `InvoicesPage` exists in Task 6.

## Task 6: Frontend Invoice Page

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add page interaction tests**

Add test:

```ts
it("opens invoice detail drawer with amount summary and attachments", async () => {
  render(<App />);
  await login();
  await userEvent.click(await screen.findByText("开票管理"));
  await userEvent.click(await screen.findByText("V2 UAT 首期开票"));
  expect(await screen.findByText("开票详情")).toBeInTheDocument();
  expect(await screen.findByText("合同额度")).toBeInTheDocument();
  expect(await screen.findByText("提交申请")).toBeInTheDocument();
  expect(await screen.findByText("登记发票")).toBeInTheDocument();
  expect(await screen.findByText("发票扫描件.pdf")).toBeInTheDocument();
});
```

- [ ] **Step 2: Add MSW/mock handlers**

Mock:

- `GET /api/invoices`
- `GET /api/invoices/401`
- `POST /api/invoices`
- `PATCH /api/invoices/401`
- `POST /api/invoices/401/apply`
- `POST /api/invoices/401/issue`
- `POST /api/invoices/401/sign`
- `POST /api/invoices/401/exception`
- `POST /api/invoices/401/void`
- `GET /api/attachments?object_type=invoice&object_id=401`

- [ ] **Step 3: Implement `InvoicesPage`**

Use existing `ModulePage`, `useResource`, `FilterBar`, `RecordDetails`, and attachment patterns from `ContractsPage`.

Required UI:

- Title: `开票管理`
- Description: `管理合同下的开票计划、申请、发票登记、签收、异常和作废。`
- Guide text: `先从合同创建开票计划，再推进申请、登记、签收；异常和作废会保留审计并影响合同剩余可开金额。`
- Filters: keyword, account_id, contract_id, invoice_status, invoice_type, exception_only.
- Columns: plan_name, customer/account_id, contract_id, invoice_status, planned_invoice_date, planned_amount, actual_invoice_amount, invoice_no, invoice_date, operations.
- Drawer sections: 开票摘要, 合同额度, 申请与发票, 签收/异常/作废, 附件, 后续回款/核销占位.
- Forms: create/edit plan, apply, issue, sign, exception, void, attachment.

- [ ] **Step 4: Add option/text helpers**

Add helpers:

- `invoiceStatusOptions`
- `invoiceStatusText`
- `invoiceStatusTag`
- `invoiceTypeOptions`
- `invoiceTypeText`
- `invoiceExceptionTypeOptions`
- `invoiceExceptionTypeText`
- `invoiceAttachmentFileTypeOptions`
- `invoiceAttachmentFileTypeText`

Values:

- Status: `planned`, `applied`, `invoiced`, `signed`, `exception`, `voided`
- Type: `vat_special`, `vat_normal`, `service`, `other`
- Exception: `customer_info_error`, `amount_mismatch`, `tax_rate_error`, `invoice_rejected`, `delivery_condition_unmet`, `other`
- Attachment: `invoice_scan`, `invoice_application`, `customer_receipt`, `void_material`, `exception_material`

- [ ] **Step 5: Run frontend tests**

Run:

```bash
cd frontend && npm test
```

Expected: PASS.

## Task 7: OpenAPI And API List

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `docs/api/crm-v1-api-list.md`
- Modify: `backend/src/test/java/com/canicula/crmai/api/OpenApiContractCoverageTest.java` only if the coverage list is explicit.

- [ ] **Step 1: Add OpenAPI paths**

Add:

- `/api/invoices`
- `/api/invoices/{invoiceId}`
- `/api/invoices/{invoiceId}/apply`
- `/api/invoices/{invoiceId}/issue`
- `/api/invoices/{invoiceId}/sign`
- `/api/invoices/{invoiceId}/exception`
- `/api/invoices/{invoiceId}/void`

- [ ] **Step 2: Add API list section**

Add `## 11. 开票管理API` before attachment/reminder APIs and renumber following section.

Include permissions:

- `invoice.read`
- `invoice.create`
- `invoice.update`
- `invoice.apply`
- `invoice.issue`
- `invoice.sign`
- `invoice.exception`
- `invoice.void`

Add note:

```markdown
当前 V2 开票管理基线已落地：`crm_invoices` 关联合同、客户和可选来源商机，支持开票计划、开票申请、发票登记、签收、异常和作废；有效已开票金额不允许超过合同含税金额。附件沿用通用附件 API，使用 `object_type=invoice`。
```

- [ ] **Step 3: Run OpenAPI coverage**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: PASS.

## Task 8: Verification, Browser UAT, Record, Commit

**Files:**
- Modify: `docs/product/crm-v2-development-todolist.md`
- Optional Create: `/private/tmp/crm-v2-invoice-management-browser-smoke.mjs`

- [ ] **Step 1: Run backend verification**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
cd backend && mvn -Dtest=InvoiceControllerTest test
cd backend && mvn -Dtest=AttachmentControllerTest test
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
cd backend && mvn test
```

Expected: all commands exit 0.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
```

Expected: all commands exit 0. The existing Vite large chunk warning can remain if build exits 0.

- [ ] **Step 3: Run browser UAT**

Start backend and frontend against the local PostgreSQL test database, then verify `/invoices`:

```bash
cd backend && CRM_DB_URL=jdbc:postgresql://localhost:55432/crm_ai CRM_DB_USERNAME=crm_ai CRM_DB_PASSWORD=crm_ai CRM_SEED_V1_DEMO_ENABLED=true mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
cd frontend && VITE_API_PROXY_TARGET=http://127.0.0.1:8081 npm run dev -- --host 127.0.0.1 --port 5175
```

Browser checklist:

- Login with `demo_admin` / `S3cure!123`.
- Open `http://127.0.0.1:5175/invoices`.
- Confirm list heading `开票管理` is visible.
- Confirm invoice row appears with customer, contract, status, planned amount, actual amount.
- Open detail drawer.
- Confirm sections `合同额度`, `申请与发票`, `签收/异常/作废`, `附件` are visible.
- Confirm buttons for apply, issue, sign, exception, void are available according to current status.
- Confirm browser console has no application error.

- [ ] **Step 4: Update V2 status**

Update `docs/product/crm-v2-development-todolist.md`:

- Mark `开票管理链路` as Done after implementation and verification.
- Set `回款管理链路` as Current.
- Record verification commands and browser UAT result.

- [ ] **Step 5: Commit and push**

Run:

```bash
git add backend frontend docs
git commit -m "feat: implement v2 invoice management"
git push -u origin codex/v2-invoice-management
```

Expected: branch pushed to GitHub.

## Self-Review Checklist

- Spec coverage: the plan covers the confirmed B scheme, data model, API contract, permissions, attachment support, frontend page, OpenAPI, tests, browser UAT, and V2 status tracking.
- Scope boundary: the plan excludes tax-control integration, real electronic invoice platform, receivable entry, reconciliation, and general ledger.
- Type consistency: backend records and frontend `Invoice` type use the same snake_case field names.
- Verification path: each implementation task has a targeted command; the final task includes full backend, frontend, OpenAPI, build, and browser checks.
