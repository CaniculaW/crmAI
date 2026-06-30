# V2 Reconciliation Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build V2 invoice-payment reconciliation so finance users can allocate confirmed payments to issued invoices, see remaining invoice/payment amounts, and void mistaken allocations with audit.

**Architecture:** Add a focused backend `reconciliation` module with a V19 Flyway migration, permission-gated REST APIs, contract-scoped data permission checks, and transactional amount updates on invoices and payments. The frontend adds a `核销工作台` page that loads workbench summary, pending invoices, pending payments, reconciliation details, create form, and void action. OpenAPI, API list, module TODO, and browser UAT evidence close the module.

**Tech Stack:** Spring Boot, JdbcTemplate, Flyway, JUnit/TestRestTemplate, React, TypeScript, Ant Design, Vitest, Vite, Chrome headless smoke.

---

## Files

- Create: `backend/src/main/resources/db/migration/V19__create_reconciliations.sql`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationController.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationService.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationCreateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationVoidRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationListFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationWorkbenchResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/ReconciliationWorkbenchFilter.java`
- Create: `backend/src/test/java/com/canicula/crmai/reconciliation/ReconciliationControllerTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
- Modify: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceResponse.java`
- Modify: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceService.java`
- Modify: `backend/src/main/java/com/canicula/crmai/payment/PaymentService.java`
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `docs/api/crm-v1-api-list.md`
- Modify: `docs/product/crm-v2-development-todolist.md`

## Task List

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 数据模型与权限 TDD | Done | V19 adds invoice reconciled amount, reconciliation table, permissions; H2/Postgres migration tests pass |
| 2 | 核销 API TDD | Done | Workbench/list/detail/create/void APIs pass amount, status, contract and permission rules |
| 3 | 金额口径联动 TDD | Done | Creating/voiding reconciliation updates invoice/payment amounts and payment status correctly |
| 4 | 前端 API 与核销工作台 | Done | `/reconciliations` menu/page/form/detail actions covered by Vitest |
| 5 | OpenAPI 与接口清单 | Done | OpenAPI coverage and API list include reconciliation endpoints |
| 6 | 自动化验证、UAT、记录提交 | Done | Backend targeted tests, Postgres migration, frontend tests/build, browser UAT pass; module record updated |

## Task 1: Data Model And Permissions

**Files:**
- Create: `backend/src/main/resources/db/migration/V19__create_reconciliations.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write migration assertions first**

Add assertions in `DatabaseMigrationTest`:

```java
Integer reconciliationTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_name = 'crm_reconciliations'
        """,
        Integer.class);
Integer invoiceReconciledColumnCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.columns
        where table_name = 'crm_invoices'
          and column_name = 'reconciled_amount'
        """,
        Integer.class);
Integer reconciliationPermissionCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from sys_permissions
        where permission_code in ('reconciliation.read', 'reconciliation.create', 'reconciliation.void')
        """,
        Integer.class);

assertThat(migrationCount).isGreaterThanOrEqualTo(19);
assertThat(reconciliationTableCount).isEqualTo(1);
assertThat(invoiceReconciledColumnCount).isEqualTo(1);
assertThat(reconciliationPermissionCount).isEqualTo(3);
```

Add PostgreSQL assertions in `PostgresMigrationIT`:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("19");
Integer reconciliationTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'crm_reconciliations'
        """,
        Integer.class);
assertThat(reconciliationTableCount).isEqualTo(1);
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: FAIL because V19 does not exist.

- [ ] **Step 3: Add migration**

Create `V19__create_reconciliations.sql`:

```sql
alter table crm_invoices
    add column reconciled_amount numeric(18, 2) not null default 0;

alter table crm_invoices
    add constraint chk_crm_invoices_reconciled_amount check (reconciled_amount >= 0);

alter table crm_invoices
    add constraint chk_crm_invoices_reconciled_lte_actual
    check (actual_invoice_amount is null or reconciled_amount <= actual_invoice_amount);

create table crm_reconciliations (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    account_id bigint not null references crm_accounts(id),
    opportunity_id bigint references crm_opportunities(id),
    contract_id bigint not null references crm_contracts(id),
    invoice_id bigint not null references crm_invoices(id),
    payment_id bigint not null references crm_payments(id),
    reconciliation_no varchar(128) not null,
    reconciliation_status varchar(64) not null,
    reconciled_amount numeric(18, 2) not null,
    reconciled_at timestamp with time zone not null,
    reconciled_by bigint not null references sys_users(id),
    reconcile_note varchar(512),
    void_reason varchar(512),
    voided_at timestamp with time zone,
    voided_by bigint references sys_users(id),
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone,
    version integer not null default 0,
    constraint chk_crm_reconciliations_amount check (reconciled_amount > 0)
);

create unique index uk_crm_reconciliations_no_active
    on crm_reconciliations (reconciliation_no)
    ${activeRecordFilter};
create index idx_crm_reconciliations_contract on crm_reconciliations (contract_id);
create index idx_crm_reconciliations_invoice on crm_reconciliations (invoice_id);
create index idx_crm_reconciliations_payment on crm_reconciliations (payment_id);
create index idx_crm_reconciliations_status on crm_reconciliations (reconciliation_status);

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'reconciliation.read', '查看核销', 'operation', 'reconciliation', 1110
where not exists (select 1 from sys_permissions where permission_code = 'reconciliation.read');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'reconciliation.create', '新增核销', 'operation', 'reconciliation', 1120
where not exists (select 1 from sys_permissions where permission_code = 'reconciliation.create');

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'reconciliation.void', '撤销核销', 'operation', 'reconciliation', 1130
where not exists (select 1 from sys_permissions where permission_code = 'reconciliation.void');
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: PASS and Flyway current version is `19`.

## Task 2: Reconciliation API

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/reconciliation/ReconciliationControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/reconciliation/*`
- Modify: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceResponse.java`
- Modify: `backend/src/main/java/com/canicula/crmai/invoice/InvoiceService.java`
- Modify: `backend/src/main/java/com/canicula/crmai/payment/PaymentService.java`

- [ ] **Step 1: Write failing controller tests**

Create `ReconciliationControllerTest` using helper style from `PaymentControllerTest`. Include:

```java
@Test
void createsListsDetailsAndVoidsReconciliationWithAmountUpdates() {
    // Arrange: create user with reconciliation/invoice/payment/contract permissions.
    // Arrange: create contract, issue invoice for 200000, confirm payment for 120000.
    // Act: POST /api/reconciliations with reconciled_amount 100000.
    // Assert: response status OK, status active, invoice_unreconciled_amount 100000, payment_unreconciled_amount 20000.
    // Assert: GET /api/reconciliations and GET /api/reconciliations/{id} return the record.
    // Act: POST /api/reconciliations/{id}/void with reason.
    // Assert: response status OK, status voided, invoice/payment amounts restored.
    // Assert audit counts reconciliation.create and reconciliation.void.
}

@Test
void workbenchReturnsPendingInvoicesPaymentsAndSummary() {
    // Arrange: one issued invoice and one confirmed payment under the same contract.
    // Act: GET /api/reconciliations/workbench?contract_id=...
    // Assert: pending_invoices contains invoice, pending_payments contains payment, summary amounts are correct.
}

@Test
void rejectsAmountGreaterThanInvoiceOrPaymentUnreconciledAmount() {
    // Arrange: invoice 100000 and payment 80000.
    // Act: reconcile 90000.
    // Assert: 409 and message contains "剩余".
}

@Test
void rejectsDifferentContractInvoiceAndPayment() {
    // Arrange: invoice under contract A and payment under contract B.
    // Act: reconcile them.
    // Assert: 409 and message contains "同一合同".
}

@Test
void unreadableReconciliationIsHiddenFromListAndForbiddenInDetail() {
    // Arrange: creator has global permission, viewer has own permission.
    // Assert: viewer list hides record and detail returns 404/403 mapped error.
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=ReconciliationControllerTest test
```

Expected: FAIL because `/api/reconciliations` does not exist.

- [ ] **Step 3: Add request/response records**

Create:

```java
public record ReconciliationCreateRequest(
        Long invoice_id,
        Long payment_id,
        BigDecimal reconciled_amount,
        OffsetDateTime reconciled_at,
        String reconcile_note) {}

public record ReconciliationVoidRequest(String void_reason) {}

public record ReconciliationListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long invoice_id,
        Long payment_id,
        String reconciliation_status,
        Boolean active_only) {}

public record ReconciliationResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long invoice_id,
        Long payment_id,
        String invoice_no,
        String payment_name,
        String reconciliation_no,
        String reconciliation_status,
        BigDecimal reconciled_amount,
        OffsetDateTime reconciled_at,
        Long reconciled_by,
        String reconcile_note,
        String void_reason,
        OffsetDateTime voided_at,
        Long voided_by,
        BigDecimal invoice_amount,
        BigDecimal invoice_reconciled_amount,
        BigDecimal invoice_unreconciled_amount,
        BigDecimal payment_amount,
        BigDecimal payment_reconciled_amount,
        BigDecimal payment_unreconciled_amount,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {}
```

Create `ReconciliationWorkbenchResponse` with `summary`, `pending_invoices`, `pending_payments`, and `recent_reconciliations` nested records.

- [ ] **Step 4: Implement service**

Implement `ReconciliationService`:

- `workbench(filter, actorUserId)` queries candidate invoice/payment ids, then filters through contract data scope.
- `readableList(actorUserId, filter)` hides rows outside linked contract scope.
- `readableDetail(id, actorUserId)` checks linked contract scope.
- `create(request, actorUserId)` validates invoice, payment, same contract, statuses, positive amount, remaining amounts, then inserts reconciliation and updates amounts in one transaction.
- `voidReconciliation(id, request, actorUserId)` validates active record, reason, reverses amount updates, marks record voided, updates payment status.

Payment status rules:

```java
if (paymentReconciledAmount.compareTo(BigDecimal.ZERO) == 0) {
    status = "confirmed";
} else if (paymentReconciledAmount.compareTo(confirmedAmount) < 0) {
    status = "partially_reconciled";
} else {
    status = "reconciled";
}
```

- [ ] **Step 5: Implement controller**

Add endpoints:

```java
@GetMapping("/api/reconciliations/workbench")
ReconciliationWorkbenchResponse workbench(...)

@GetMapping("/api/reconciliations")
List<ReconciliationResponse> list(...)

@GetMapping("/api/reconciliations/{reconciliationId}")
ReconciliationResponse detail(...)

@PostMapping("/api/reconciliations")
ReconciliationResponse create(...)

@PostMapping("/api/reconciliations/{reconciliationId}/void")
ReconciliationResponse voidReconciliation(...)
```

Use permissions `reconciliation.read`, `reconciliation.create`, and `reconciliation.void`. Record audit actions with module `reconciliation`.

- [ ] **Step 6: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=ReconciliationControllerTest test
```

Expected: PASS.

## Task 3: Frontend API And Workbench Page

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing frontend tests**

In `App.test.tsx`, add permissions:

```ts
"reconciliation.read",
"reconciliation.create",
"reconciliation.void"
```

Add mock workbench data:

```ts
reconciliationWorkbench: {
  summary: {
    effective_invoice_amount: 200000,
    confirmed_payment_amount: 120000,
    reconciled_amount: 0,
    unreconciled_invoice_amount: 200000,
    unallocated_payment_amount: 120000
  },
  pending_invoices: [{ id: 801, invoice_no: "INV-V2-UAT-001", actual_invoice_amount: 200000, reconciled_amount: 0, unreconciled_amount: 200000 }],
  pending_payments: [{ id: 901, payment_name: "V2 UAT 首付款到账", confirmed_amount: 120000, reconciled_amount: 0, unreconciled_amount: 120000 }],
  recent_reconciliations: []
}
```

Add tests:

```ts
it("renders the reconciliation workbench and loads pending invoice payment data", async () => {
  // login, click 核销工作台, assert heading, pending invoice, pending payment, summary.
});

it("submits and voids reconciliation from the workbench", async () => {
  // open page, fill amount, click 新增核销, assert POST /api/reconciliations.
  // mock created record, click 撤销, fill reason, assert POST /api/reconciliations/1001/void.
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd frontend && npm test -- --run
```

Expected: FAIL because menu/page/client APIs do not exist.

- [ ] **Step 3: Add frontend API types and methods**

Add `Reconciliation`, `ReconciliationWorkbench`, and `crmApi.reconciliations` with:

- `workbench(query?)`
- `list(query?)`
- `detail(id)`
- `create(body)`
- `void(id, body)`

- [ ] **Step 4: Add menu, route, and page**

Add nav item:

```tsx
{ key: "/reconciliations", label: "核销工作台", icon: <GitCompareArrows size={18} />, permission: "reconciliation.read" }
```

Add route:

```tsx
<Route path="/reconciliations" element={<ReconciliationWorkbenchPage currentUser={user} />} />
```

Build `ReconciliationWorkbenchPage` with:

- `DataWorkspace` title `核销工作台`
- `FilterBar`
- summary cards
- pending invoice table
- pending payment table
- create reconciliation form
- recent reconciliation table
- void modal

- [ ] **Step 5: Run GREEN**

Run:

```bash
cd frontend && npm test -- --run
```

Expected: PASS.

## Task 4: OpenAPI And API List

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `docs/api/crm-v1-api-list.md`

- [ ] **Step 1: Run OpenAPI RED**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected after backend endpoints exist but before docs update: FAIL listing reconciliation paths.

- [ ] **Step 2: Add OpenAPI paths**

Add paths:

- `GET /api/reconciliations/workbench`
- `GET /api/reconciliations`
- `POST /api/reconciliations`
- `GET /api/reconciliations/{reconciliationId}`
- `POST /api/reconciliations/{reconciliationId}/void`

- [ ] **Step 3: Update API list**

Add section:

```markdown
## 13. 发票回款核销API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/reconciliations/workbench | 查询核销工作台 | reconciliation.read + 关联合同数据权限 |
| GET | /api/reconciliations | 查询核销明细 | reconciliation.read + 关联合同数据权限 |
| GET | /api/reconciliations/{id} | 查看核销详情 | reconciliation.read + 关联合同数据权限 |
| POST | /api/reconciliations | 新增核销 | reconciliation.create + 关联合同数据权限 |
| POST | /api/reconciliations/{id}/void | 撤销核销 | reconciliation.void + 关联合同数据权限 |
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: PASS.

## Task 5: Verification, Browser UAT, And Module Record

**Files:**
- Modify: `docs/product/crm-v2-development-todolist.md`
- Modify: `docs/superpowers/plans/2026-06-30-v2-reconciliation-workbench.md`

- [ ] **Step 1: Run backend targeted regression**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest,PostgresMigrationIT,ReconciliationControllerTest,InvoiceControllerTest,PaymentControllerTest,OpenApiContractCoverageTest test
```

Expected: PASS.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```

Expected: PASS.

- [ ] **Step 3: Browser UAT**

Start current backend/frontend and verify:

- `/reconciliations` loads.
- `核销工作台` heading appears.
- UAT invoice appears in pending invoices.
- UAT payment appears in pending payments.
- Create reconciliation works.
- Void reconciliation works.
- Console has no application errors.

- [ ] **Step 4: Update module record**

Update `docs/product/crm-v2-development-todolist.md`:

- Mark `发票回款核销链路` as Done.
- Set `客户/商机 V2 入口联动` as Current.
- Add verification commands and UAT result.

- [ ] **Step 5: Commit and push**

Run:

```bash
git status --short
git add backend/src/main/resources/db/migration/V19__create_reconciliations.sql \
  backend/src/main/java/com/canicula/crmai/reconciliation \
  backend/src/test/java/com/canicula/crmai/reconciliation \
  backend/src/main/java/com/canicula/crmai/invoice/InvoiceResponse.java \
  backend/src/main/java/com/canicula/crmai/invoice/InvoiceService.java \
  backend/src/main/java/com/canicula/crmai/payment/PaymentService.java \
  backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java \
  backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java \
  frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/App.test.tsx \
  docs/openapi/crm-v1-openapi.yaml docs/api/crm-v1-api-list.md \
  docs/product/crm-v2-development-todolist.md \
  docs/superpowers/plans/2026-06-30-v2-reconciliation-workbench.md \
  docs/superpowers/specs/2026-06-30-v2-reconciliation-workbench-design.md
git commit -m "feat: add v2 reconciliation workbench"
git push origin codex/v2-receivable-management
```

Expected: push succeeds.
