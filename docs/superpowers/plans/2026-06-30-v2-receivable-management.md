# V2 Receivable Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build V2 receivable management so contract execution can produce receivable plans, register customer payments, confirm received money, track overdue follow-up, handle payment exceptions, and provide confirmed payments for the later reconciliation module.

**Architecture:** Add focused backend `receivable` and `payment` capabilities with Flyway migration, permission-gated REST APIs, audit logging, and data-permission checks through the linked contract account/opportunity. Reuse the generic attachment service by adding `object_type=receivable_plan` and `object_type=payment`. The frontend adds a `回款管理` workflow with plan-oriented list filters, detail drawer, payment table, follow-up records, state actions, amount summary, and attachment add/delete/download controls.

**Tech Stack:** Spring Boot, JdbcTemplate, Flyway, JUnit/TestRestTemplate, React, TypeScript, Ant Design, Vitest, Vite, browser Smoke.

---

## Files

- Create: `backend/src/main/resources/db/migration/V18__create_receivables.sql`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivablePlanController.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivablePlanService.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivablePlanCreateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivablePlanUpdateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivablePlanTerminateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivableFollowUpRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivablePlanListFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivablePlanResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/ReceivableFollowUpResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentController.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentService.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentCreateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentUpdateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentConfirmRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentExceptionRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentRefundRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentListFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/PaymentResponse.java`
- Create: `backend/src/test/java/com/canicula/crmai/receivable/ReceivablePlanControllerTest.java`
- Create: `backend/src/test/java/com/canicula/crmai/payment/PaymentControllerTest.java`
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
- Optional Create: `/private/tmp/crm-v2-receivable-management-browser-smoke.mjs`

## Task List

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 后端数据模型与权限 | Pending | V18 migration creates receivable/payment/follow-up tables and permission points; migration tests pass |
| 2 | 回款计划 API | Pending | Create/list/detail/update/terminate/follow-up APIs pass with data permission and contract linkage |
| 3 | 到账流水 API 与金额口径 | Pending | Create/list/detail/update/confirm/exception/refund APIs pass; confirmed/refunded amounts calculate correctly |
| 4 | 附件对象扩展 | Pending | `receivable_plan` and `payment` attachments can be created, listed, deleted, and opened by `file_url` |
| 5 | 前端 API、菜单与回款页面 | Pending | Typed API client and `回款管理` list/detail/actions/attachments are covered by frontend tests |
| 6 | OpenAPI 与接口清单 | Pending | Receivable/payment endpoints are covered by OpenAPI coverage test and API list |
| 7 | 自动化验证、UAT、记录提交 | Pending | Backend targeted tests, OpenAPI coverage, `npm test`, `npm run build`, browser Smoke pass; module state recorded |

## Task 1: Backend Data Model And Permissions

**Files:**
- Create: `backend/src/main/resources/db/migration/V18__create_receivables.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [x] **Step 1: Write migration assertions first**

Add H2 assertions in `DatabaseMigrationTest`:

```java
Integer receivablePlanTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_name = 'crm_receivable_plans'
        """,
        Integer.class);
Integer paymentTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_name = 'crm_payments'
        """,
        Integer.class);
Integer followUpTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_name = 'crm_receivable_follow_ups'
        """,
        Integer.class);
Integer receivablePermissionCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from sys_permissions
        where permission_code in (
          'receivable.read', 'receivable.create', 'receivable.update',
          'receivable.terminate', 'receivable.follow_up',
          'payment.read', 'payment.create', 'payment.update',
          'payment.confirm', 'payment.exception', 'payment.refund'
        )
        """,
        Integer.class);

assertThat(migrationCount).isGreaterThanOrEqualTo(18);
assertThat(receivablePlanTableCount).isEqualTo(1);
assertThat(paymentTableCount).isEqualTo(1);
assertThat(followUpTableCount).isEqualTo(1);
assertThat(receivablePermissionCount).isEqualTo(11);
```

Add PostgreSQL assertions in `PostgresMigrationIT`:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("18");
Integer receivablePlanTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'crm_receivable_plans'
        """,
        Integer.class);
Integer paymentTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'crm_payments'
        """,
        Integer.class);

assertThat(receivablePlanTableCount).isEqualTo(1);
assertThat(paymentTableCount).isEqualTo(1);
```

- [x] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: FAIL because the V18 receivable migration does not exist.

- [x] **Step 3: Add migration**

Create `backend/src/main/resources/db/migration/V18__create_receivables.sql`:

```sql
create table crm_receivable_plans (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    account_id bigint not null references crm_accounts(id),
    opportunity_id bigint references crm_opportunities(id),
    contract_id bigint not null references crm_contracts(id),
    plan_name varchar(255) not null,
    plan_stage varchar(128),
    receivable_status varchar(64) not null,
    planned_receivable_date timestamp with time zone not null,
    planned_amount numeric(18, 2) not null,
    owner_user_id bigint not null references sys_users(id),
    payment_terms_snapshot varchar(512),
    overdue_reason varchar(128),
    termination_reason varchar(512),
    terminated_at timestamp with time zone,
    terminated_by bigint references sys_users(id),
    remark varchar(512),
    created_by bigint,
    created_at timestamp with time zone not null default current_timestamp,
    updated_by bigint,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone,
    version integer not null default 0
);

create index idx_crm_receivable_plans_account on crm_receivable_plans (account_id);
create index idx_crm_receivable_plans_opportunity on crm_receivable_plans (opportunity_id);
create index idx_crm_receivable_plans_contract on crm_receivable_plans (contract_id);
create index idx_crm_receivable_plans_status on crm_receivable_plans (receivable_status);
create index idx_crm_receivable_plans_owner on crm_receivable_plans (owner_user_id);
create index idx_crm_receivable_plans_date on crm_receivable_plans (planned_receivable_date);

create table crm_payments (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    account_id bigint not null references crm_accounts(id),
    opportunity_id bigint references crm_opportunities(id),
    contract_id bigint not null references crm_contracts(id),
    receivable_plan_id bigint references crm_receivable_plans(id),
    payment_name varchar(255) not null,
    payment_status varchar(64) not null,
    received_at timestamp with time zone not null,
    received_amount numeric(18, 2) not null,
    confirmed_amount numeric(18, 2) not null default 0,
    confirmed_at timestamp with time zone,
    confirmed_by bigint references sys_users(id),
    payment_method varchar(64) not null,
    payer_name varchar(255),
    receiving_account varchar(255),
    bank_flow_no varchar(128),
    reconciled_amount numeric(18, 2) not null default 0,
    exception_type varchar(64),
    exception_reason varchar(512),
    exception_resolution varchar(512),
    refund_reason varchar(512),
    refunded_at timestamp with time zone,
    refunded_by bigint references sys_users(id),
    owner_user_id bigint not null references sys_users(id),
    remark varchar(512),
    created_by bigint,
    created_at timestamp with time zone not null default current_timestamp,
    updated_by bigint,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone,
    version integer not null default 0,
    constraint chk_crm_payments_received_amount check (received_amount > 0),
    constraint chk_crm_payments_confirmed_amount check (confirmed_amount >= 0),
    constraint chk_crm_payments_reconciled_amount check (reconciled_amount >= 0),
    constraint chk_crm_payments_reconciled_lte_confirmed check (reconciled_amount <= confirmed_amount)
);

create index idx_crm_payments_account on crm_payments (account_id);
create index idx_crm_payments_opportunity on crm_payments (opportunity_id);
create index idx_crm_payments_contract on crm_payments (contract_id);
create index idx_crm_payments_plan on crm_payments (receivable_plan_id);
create index idx_crm_payments_status on crm_payments (payment_status);
create index idx_crm_payments_owner on crm_payments (owner_user_id);
create index idx_crm_payments_received_at on crm_payments (received_at);
create unique index uk_crm_payments_bank_flow_active
    on crm_payments (bank_flow_no)
    ${activeRecordFilter};

create table crm_receivable_follow_ups (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    account_id bigint not null references crm_accounts(id),
    opportunity_id bigint references crm_opportunities(id),
    contract_id bigint not null references crm_contracts(id),
    receivable_plan_id bigint not null references crm_receivable_plans(id),
    follow_up_at timestamp with time zone not null,
    follow_up_by bigint not null references sys_users(id),
    follow_up_content varchar(1024) not null,
    customer_feedback varchar(1024),
    next_action varchar(512),
    next_follow_up_at timestamp with time zone,
    remark varchar(512),
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone
);

create index idx_crm_receivable_follow_ups_plan on crm_receivable_follow_ups (receivable_plan_id);
create index idx_crm_receivable_follow_ups_contract on crm_receivable_follow_ups (contract_id);

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'receivable.read', '查看回款计划', 'operation', 'receivable', 1000
where not exists (select 1 from sys_permissions where permission_code = 'receivable.read');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'receivable.create', '新增回款计划', 'operation', 'receivable', 1010
where not exists (select 1 from sys_permissions where permission_code = 'receivable.create');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'receivable.update', '编辑回款计划', 'operation', 'receivable', 1020
where not exists (select 1 from sys_permissions where permission_code = 'receivable.update');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'receivable.terminate', '终止回款计划', 'operation', 'receivable', 1030
where not exists (select 1 from sys_permissions where permission_code = 'receivable.terminate');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'receivable.follow_up', '新增回款跟进', 'operation', 'receivable', 1040
where not exists (select 1 from sys_permissions where permission_code = 'receivable.follow_up');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'payment.read', '查看到账流水', 'operation', 'payment', 1050
where not exists (select 1 from sys_permissions where permission_code = 'payment.read');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'payment.create', '登记到账流水', 'operation', 'payment', 1060
where not exists (select 1 from sys_permissions where permission_code = 'payment.create');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'payment.update', '编辑到账流水', 'operation', 'payment', 1070
where not exists (select 1 from sys_permissions where permission_code = 'payment.update');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'payment.confirm', '确认到账', 'operation', 'payment', 1080
where not exists (select 1 from sys_permissions where permission_code = 'payment.confirm');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'payment.exception', '登记到账异常', 'operation', 'payment', 1090
where not exists (select 1 from sys_permissions where permission_code = 'payment.exception');
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'payment.refund', '标记退款', 'operation', 'payment', 1100
where not exists (select 1 from sys_permissions where permission_code = 'payment.refund');
```

- [x] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: PASS.

Run:

```bash
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: PASS and Flyway current version is `18`.

## Task 2: Receivable Plan API

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/receivable/ReceivablePlanControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/receivable/*`

- [x] **Step 1: Write failing controller tests**

Create `ReceivablePlanControllerTest` using the helper style from `InvoiceControllerTest`. Include these test methods:

```java
@Test
void createsListsUpdatesTerminatesAndFollowsUpReceivablePlan() {
    Long departmentId = createDepartment("receivable-dept-" + suffix);
    Long userId = createUserWithPermissions("receivable_user_" + suffix, departmentId, receivablePermissions());
    String token = login("receivable_user_" + suffix);
    Long accountId = createAccount(token, "回款客户-" + suffix, departmentId, userId);
    Long opportunityId = createOpportunity(token, accountId, "回款商机-" + suffix, departmentId, userId);
    Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);

    ResponseEntity<JsonNode> createResponse = post(
            "/api/receivable-plans",
            Map.of(
                    "contract_id", contractId,
                    "plan_name", "V2 首付款回款-" + suffix,
                    "plan_stage", "首付款",
                    "planned_receivable_date", "2026-07-20T10:00:00+08:00",
                    "planned_amount", 360000,
                    "owner_user_id", userId,
                    "payment_terms_snapshot", "30%预付款",
                    "remark", "回款计划测试"),
            authHeaders(token, "receivable-create-trace-001"));

    assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    Long planId = createResponse.getBody().path("data").path("id").asLong();
    assertThat(createResponse.getBody().path("data").path("receivable_status").asText()).isEqualTo("planned");
    assertThat(createResponse.getBody().path("data").path("unreceived_amount").asDouble()).isEqualTo(360000.0);

    ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
            "/api/receivable-plans?contract_id=" + contractId,
            HttpMethod.GET,
            new HttpEntity<>(authHeaders(token, "receivable-list-trace-001")),
            JsonNode.class);
    assertThat(listResponse.getBody().path("data")).anySatisfy(plan ->
            assertThat(plan.path("id").asLong()).isEqualTo(planId));

    ResponseEntity<JsonNode> updateResponse = patch(
            "/api/receivable-plans/" + planId,
            Map.of("planned_amount", 380000, "overdue_reason", "customer_process"),
            authHeaders(token, "receivable-update-trace-001"));
    assertThat(updateResponse.getBody().path("data").path("planned_amount").asDouble()).isEqualTo(380000.0);

    ResponseEntity<JsonNode> followUpResponse = post(
            "/api/receivable-plans/" + planId + "/follow-ups",
            Map.of(
                    "follow_up_at", "2026-07-21T10:00:00+08:00",
                    "follow_up_content", "客户财务流程已提交",
                    "customer_feedback", "预计三日内付款",
                    "next_action", "跟进客户付款审批"),
            authHeaders(token, "receivable-follow-up-trace-001"));
    assertThat(followUpResponse.getBody().path("data").path("follow_up_content").asText())
            .isEqualTo("客户财务流程已提交");

    ResponseEntity<JsonNode> terminateResponse = post(
            "/api/receivable-plans/" + planId + "/terminate",
            Map.of("termination_reason", "客户付款条件重签"),
            authHeaders(token, "receivable-terminate-trace-001"));
    assertThat(terminateResponse.getBody().path("data").path("receivable_status").asText()).isEqualTo("terminated");
}
```

Also add a test `unreadablePlanIsHiddenFromListAndForbiddenInDetail()` mirroring `InvoiceControllerTest.unreadableInvoiceHiddenInListAndDetailForbidden`.

- [x] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=ReceivablePlanControllerTest test
```

Expected: FAIL with 404 or 500 because `/api/receivable-plans` does not exist.

- [x] **Step 3: Add request/response/filter records**

Create:

```java
public record ReceivablePlanCreateRequest(
        Long contract_id,
        String plan_name,
        String plan_stage,
        OffsetDateTime planned_receivable_date,
        BigDecimal planned_amount,
        Long owner_user_id,
        String payment_terms_snapshot,
        String overdue_reason,
        String remark) {
}

public record ReceivablePlanUpdateRequest(
        String plan_name,
        String plan_stage,
        OffsetDateTime planned_receivable_date,
        BigDecimal planned_amount,
        Long owner_user_id,
        String payment_terms_snapshot,
        String overdue_reason,
        String remark) {
}

public record ReceivablePlanTerminateRequest(String termination_reason) {
}

public record ReceivableFollowUpRequest(
        OffsetDateTime follow_up_at,
        String follow_up_content,
        String customer_feedback,
        String next_action,
        OffsetDateTime next_follow_up_at,
        String remark) {
}

public record ReceivablePlanListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String receivable_status,
        Long owner_user_id,
        OffsetDateTime planned_from,
        OffsetDateTime planned_to,
        Boolean overdue_only) {
}
```

Create `ReceivablePlanResponse`:

```java
public record ReceivablePlanResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String plan_name,
        String plan_stage,
        String receivable_status,
        OffsetDateTime planned_receivable_date,
        BigDecimal planned_amount,
        Long owner_user_id,
        String payment_terms_snapshot,
        String overdue_reason,
        String termination_reason,
        OffsetDateTime terminated_at,
        Long terminated_by,
        BigDecimal contract_amount,
        BigDecimal effective_invoiced_amount,
        BigDecimal confirmed_received_amount,
        BigDecimal unreceived_amount,
        BigDecimal unreconciled_payment_amount,
        Integer overdue_days,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
```

Create `ReceivableFollowUpResponse`:

```java
public record ReceivableFollowUpResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long receivable_plan_id,
        OffsetDateTime follow_up_at,
        Long follow_up_by,
        String follow_up_content,
        String customer_feedback,
        String next_action,
        OffsetDateTime next_follow_up_at,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
```

- [x] **Step 4: Implement `ReceivablePlanService`**

Follow the `InvoiceService` pattern:

- Inject `JdbcTemplate` and `ContractService`.
- Use `contractService.readableDetail(contractId, actorUserId)` to validate data scope.
- Create plans with `receivable_status = 'planned'`.
- Calculate `confirmed_received_amount` from `crm_payments` where `payment_status in ('confirmed', 'partially_reconciled', 'reconciled')`.
- Calculate `unreceived_amount = planned_amount - confirmed_received_amount`, floor at 0.
- Calculate `overdue_days` in Java using `LocalDate.now()` and `planned_receivable_date`, returning 0 for `received` and `terminated`.
- Hide unreadable rows in list by calling `readableDetail` per id and swallowing unauthorized rows.

Required service methods:

```java
@Transactional
public ReceivablePlanResponse create(ReceivablePlanCreateRequest request, Long actorUserId)
public List<ReceivablePlanResponse> readableList(Long actorUserId, ReceivablePlanListFilter filter)
public ReceivablePlanResponse readableDetail(Long planId, Long actorUserId)
@Transactional
public ReceivablePlanResponse update(Long planId, ReceivablePlanUpdateRequest request, Long actorUserId)
@Transactional
public ReceivablePlanResponse terminate(Long planId, ReceivablePlanTerminateRequest request, Long actorUserId)
@Transactional
public ReceivableFollowUpResponse addFollowUp(Long planId, ReceivableFollowUpRequest request, Long actorUserId)
public List<PaymentResponse> readablePayments(Long planId, Long actorUserId)
public List<ReceivableFollowUpResponse> readableFollowUps(Long planId, Long actorUserId)
```

Validation:

```java
requireText(request.plan_name(), "回款计划名称不能为空");
requirePositive(request.planned_amount(), "计划回款金额必须大于0");
if (request.planned_receivable_date() == null) throw new BusinessRuleException("计划回款日期不能为空");
if (request.owner_user_id() == null) throw new BusinessRuleException("负责人不能为空");
```

- [x] **Step 5: Implement `ReceivablePlanController`**

Add endpoints:

```java
@RequirePermission("receivable.create")
@PostMapping("/api/receivable-plans")
ReceivablePlanResponse create(@Valid @RequestBody ReceivablePlanCreateRequest request, HttpServletRequest httpRequest)

@RequirePermission("receivable.read")
@GetMapping("/api/receivable-plans")
List<ReceivablePlanResponse> list(...)

@RequirePermission("receivable.read")
@GetMapping("/api/receivable-plans/{planId}")
ReceivablePlanResponse detail(@PathVariable Long planId, HttpServletRequest httpRequest)

@RequirePermission("receivable.update")
@PatchMapping("/api/receivable-plans/{planId}")
ReceivablePlanResponse update(...)

@RequirePermission("receivable.terminate")
@PostMapping("/api/receivable-plans/{planId}/terminate")
ReceivablePlanResponse terminate(...)

@RequirePermission("receivable.read")
@GetMapping("/api/receivable-plans/{planId}/payments")
List<PaymentResponse> payments(...)

@RequirePermission("receivable.read")
@GetMapping("/api/receivable-plans/{planId}/follow-ups")
List<ReceivableFollowUpResponse> followUps(...)

@RequirePermission("receivable.follow_up")
@PostMapping("/api/receivable-plans/{planId}/follow-ups")
ReceivableFollowUpResponse addFollowUp(...)
```

Record audit actions for create/update/terminate/follow-up with module `receivable`.

- [x] **Step 6: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=ReceivablePlanControllerTest test
```

Expected: PASS.

## Task 3: Payment API And Amount Rules

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/payment/PaymentControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/payment/*`

- [x] **Step 1: Write failing payment tests**

Create `PaymentControllerTest` with these tests:

```java
@Test
void registersConfirmsExceptionsAndRefundsPayment() {
    Long departmentId = createDepartment("payment-dept-" + suffix);
    Long userId = createUserWithPermissions("payment_user_" + suffix, departmentId, receivablePermissions());
    String token = login("payment_user_" + suffix);
    Long accountId = createAccount(token, "到账客户-" + suffix, departmentId, userId);
    Long opportunityId = createOpportunity(token, accountId, "到账商机-" + suffix, departmentId, userId);
    Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);
    Long planId = createReceivablePlan(token, contractId, userId, suffix, 360000);

    ResponseEntity<JsonNode> createResponse = post(
            "/api/payments",
            Map.of(
                    "contract_id", contractId,
                    "receivable_plan_id", planId,
                    "payment_name", "首付款到账-" + suffix,
                    "received_at", "2026-07-22T10:00:00+08:00",
                    "received_amount", 360000,
                    "payment_method", "bank_transfer",
                    "payer_name", "测试客户付款主体",
                    "bank_flow_no", "FLOW-" + suffix,
                    "owner_user_id", userId),
            authHeaders(token, "payment-create-trace-001"));
    assertThat(createResponse.getBody().path("data").path("payment_status").asText()).isEqualTo("registered");

    Long paymentId = createResponse.getBody().path("data").path("id").asLong();
    ResponseEntity<JsonNode> confirmResponse = post(
            "/api/payments/" + paymentId + "/confirm",
            Map.of("confirmed_amount", 360000, "confirmed_at", "2026-07-22T11:00:00+08:00", "confirm_note", "银行回单一致"),
            authHeaders(token, "payment-confirm-trace-001"));
    assertThat(confirmResponse.getBody().path("data").path("payment_status").asText()).isEqualTo("confirmed");
    assertThat(confirmResponse.getBody().path("data").path("unreconciled_amount").asDouble()).isEqualTo(360000.0);

    ResponseEntity<JsonNode> planResponse = restTemplate.exchange(
            "/api/receivable-plans/" + planId,
            HttpMethod.GET,
            new HttpEntity<>(authHeaders(token, "payment-plan-detail-trace-001")),
            JsonNode.class);
    assertThat(planResponse.getBody().path("data").path("confirmed_received_amount").asDouble()).isEqualTo(360000.0);
    assertThat(planResponse.getBody().path("data").path("unreceived_amount").asDouble()).isEqualTo(0.0);
}
```

Add:

- `refundedPaymentDoesNotCountAsEffectiveReceivedAmount()`
- `unreadablePaymentIsHiddenFromListAndForbiddenInDetail()`
- `confirmRejectsAmountGreaterThanReceivedAmount()`

- [x] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=PaymentControllerTest test
```

Expected: FAIL because `/api/payments` does not exist.

- [x] **Step 3: Add payment request/response/filter records**

Create:

```java
public record PaymentCreateRequest(
        Long contract_id,
        Long receivable_plan_id,
        String payment_name,
        OffsetDateTime received_at,
        BigDecimal received_amount,
        String payment_method,
        String payer_name,
        String receiving_account,
        String bank_flow_no,
        Long owner_user_id,
        String remark) {
}

public record PaymentUpdateRequest(
        Long receivable_plan_id,
        String payment_name,
        OffsetDateTime received_at,
        BigDecimal received_amount,
        String payment_method,
        String payer_name,
        String receiving_account,
        String bank_flow_no,
        Long owner_user_id,
        String remark) {
}

public record PaymentConfirmRequest(
        BigDecimal confirmed_amount,
        OffsetDateTime confirmed_at,
        String confirm_note) {
}

public record PaymentExceptionRequest(
        String exception_type,
        String exception_reason,
        String exception_resolution) {
}

public record PaymentRefundRequest(String refund_reason) {
}

public record PaymentListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long receivable_plan_id,
        String payment_status,
        String payment_method,
        Long owner_user_id,
        OffsetDateTime received_from,
        OffsetDateTime received_to,
        Boolean exception_only) {
}
```

Create `PaymentResponse`:

```java
public record PaymentResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long receivable_plan_id,
        String payment_name,
        String payment_status,
        OffsetDateTime received_at,
        BigDecimal received_amount,
        BigDecimal confirmed_amount,
        OffsetDateTime confirmed_at,
        Long confirmed_by,
        String payment_method,
        String payer_name,
        String receiving_account,
        String bank_flow_no,
        BigDecimal reconciled_amount,
        BigDecimal unreconciled_amount,
        String exception_type,
        String exception_reason,
        String exception_resolution,
        String refund_reason,
        OffsetDateTime refunded_at,
        Long refunded_by,
        Long owner_user_id,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
```

- [x] **Step 4: Implement `PaymentService`**

Follow `InvoiceService` patterns:

- Use `ContractService.readableDetail` to validate contract scope.
- If `receivable_plan_id` is present, ensure the plan belongs to the same contract.
- Create payment with `payment_status = 'registered'`, `confirmed_amount = 0`, `reconciled_amount = 0`.
- Confirm only `registered` or `exception` payments.
- Reject `confirmed_amount <= 0`.
- Reject `confirmed_amount > received_amount`.
- Refund only `exception` or `confirmed` payments, and set `confirmed_amount = 0` when marking `refunded`.

Required methods:

```java
@Transactional
public PaymentResponse create(PaymentCreateRequest request, Long actorUserId)
public List<PaymentResponse> readableList(Long actorUserId, PaymentListFilter filter)
public PaymentResponse readableDetail(Long paymentId, Long actorUserId)
@Transactional
public PaymentResponse update(Long paymentId, PaymentUpdateRequest request, Long actorUserId)
@Transactional
public PaymentResponse confirm(Long paymentId, PaymentConfirmRequest request, Long actorUserId)
@Transactional
public PaymentResponse registerException(Long paymentId, PaymentExceptionRequest request, Long actorUserId)
@Transactional
public PaymentResponse refund(Long paymentId, PaymentRefundRequest request, Long actorUserId)
```

Effective confirmed statuses for amount calculations:

```java
List.of("confirmed", "partially_reconciled", "reconciled")
```

- [x] **Step 5: Implement `PaymentController`**

Add endpoints:

```java
@RequirePermission("payment.create")
@PostMapping("/api/payments")
PaymentResponse create(...)

@RequirePermission("payment.read")
@GetMapping("/api/payments")
List<PaymentResponse> list(...)

@RequirePermission("payment.read")
@GetMapping("/api/payments/{paymentId}")
PaymentResponse detail(...)

@RequirePermission("payment.update")
@PatchMapping("/api/payments/{paymentId}")
PaymentResponse update(...)

@RequirePermission("payment.confirm")
@PostMapping("/api/payments/{paymentId}/confirm")
PaymentResponse confirm(...)

@RequirePermission("payment.exception")
@PostMapping("/api/payments/{paymentId}/exception")
PaymentResponse registerException(...)

@RequirePermission("payment.refund")
@PostMapping("/api/payments/{paymentId}/refund")
PaymentResponse refund(...)
```

Record audit actions with module `payment`.

- [x] **Step 6: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=PaymentControllerTest test
```

Expected: PASS.

Run:

```bash
cd backend && mvn -Dtest=ReceivablePlanControllerTest,PaymentControllerTest test
```

Expected: PASS.

## Task 4: Attachment Object Expansion

**Files:**
- Modify: `backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java`

- [x] **Step 1: Write failing attachment tests**

Add tests:

```java
@Test
void createsListsAndDeletesReceivablePlanAttachmentMetadata() {
    Long planId = createReceivablePlan(token, contractId, userId, suffix, 360000);
    ResponseEntity<JsonNode> createResponse = post(
            "/api/attachments",
            Map.of(
                    "object_type", "receivable_plan",
                    "object_id", planId,
                    "file_name", "银行回单.pdf",
                    "file_url", "oss://crm/receivable/" + suffix + "/receipt.pdf",
                    "file_type", "bank_receipt",
                    "file_size", 16384),
            authHeaders(token, "attachment-receivable-create-trace-001"));
    assertThat(createResponse.getBody().path("data").path("object_type").asText()).isEqualTo("receivable_plan");
}

@Test
void createsListsAndDeletesPaymentAttachmentMetadata() {
    Long paymentId = createPayment(token, contractId, planId, userId, suffix, 360000);
    ResponseEntity<JsonNode> createResponse = post(
            "/api/attachments",
            Map.of(
                    "object_type", "payment",
                    "object_id", paymentId,
                    "file_name", "到账流水.png",
                    "file_url", "oss://crm/payment/" + suffix + "/flow.png",
                    "file_type", "bank_statement",
                    "file_size", 8192),
            authHeaders(token, "attachment-payment-create-trace-001"));
    assertThat(createResponse.getBody().path("data").path("object_type").asText()).isEqualTo("payment");
}
```

- [x] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=AttachmentControllerTest test
```

Expected: FAIL with unsupported `receivable_plan` or `payment`.

- [x] **Step 3: Extend attachment scope checks**

Inject `ReceivablePlanService` and `PaymentService` in `AttachmentService`.

Add:

```java
case "receivable_plan" -> receivablePlanService.readableDetail(objectId, actorUserId);
case "payment" -> paymentService.readableDetail(objectId, actorUserId);
```

- [x] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=AttachmentControllerTest test
```

Expected: PASS.

## Task 5: Frontend API, Menu, And Receivable Page

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [x] **Step 1: Write failing frontend tests**

In `frontend/src/App.test.tsx`, add permissions:

```ts
"receivable.read",
"receivable.create",
"receivable.update",
"receivable.terminate",
"receivable.follow_up",
"payment.read",
"payment.create",
"payment.update",
"payment.confirm",
"payment.exception",
"payment.refund",
```

Add mock data:

```ts
receivablePlans: [
  {
    id: 601,
    account_id: 1,
    opportunity_id: 10,
    contract_id: 301,
    plan_name: "V2 UAT 首付款回款",
    plan_stage: "首付款",
    receivable_status: "overdue",
    planned_receivable_date: "2026-07-20T10:00:00+08:00",
    planned_amount: 360000,
    confirmed_received_amount: 120000,
    unreceived_amount: 240000,
    overdue_days: 3,
    owner_user_id: 1001,
    contract_amount: 1200000,
    effective_invoiced_amount: 360000,
    unreconciled_payment_amount: 120000
  }
],
payments: [
  {
    id: 701,
    account_id: 1,
    opportunity_id: 10,
    contract_id: 301,
    receivable_plan_id: 601,
    payment_name: "首付款部分到账",
    payment_status: "confirmed",
    received_at: "2026-07-22T10:00:00+08:00",
    received_amount: 120000,
    confirmed_amount: 120000,
    payment_method: "bank_transfer",
    payer_name: "测试客户付款主体",
    bank_flow_no: "FLOW-UAT-001",
    reconciled_amount: 0,
    unreconciled_amount: 120000,
    owner_user_id: 1001
  }
],
receivableFollowUps: [
  {
    id: 901,
    receivable_plan_id: 601,
    follow_up_at: "2026-07-23T10:00:00+08:00",
    follow_up_by: 1001,
    follow_up_content: "客户财务流程推进中",
    next_action: "三日后确认付款排期"
  }
],
receivableAttachments: [
  {
    id: 902,
    object_type: "receivable_plan",
    object_id: 601,
    file_name: "银行回单.pdf",
    file_url: "oss://crm/receivable/601/receipt.pdf",
    file_type: "bank_receipt",
    file_size: 16384
  }
]
```

Add tests:

```ts
it("renders the receivable module and loads the V2 receivable list", async () => {
  const user = userEvent.setup();
  const fetchMock = mockCrmFetch();
  render(<App />);
  await loginAsDemo(user);
  await user.click(screen.getByRole("link", { name: "回款管理" }));
  expect(await screen.findByRole("heading", { name: "回款管理" })).toBeInTheDocument();
  expect(screen.getByText("V2 UAT 首付款回款")).toBeInTheDocument();
  expect(screen.getByText("240,000 元")).toBeInTheDocument();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/receivable-plans"), expect.anything()));
});

it("opens the receivable detail drawer with payments follow-ups and attachments", async () => {
  const user = userEvent.setup();
  mockCrmFetch();
  render(<App />);
  await loginAsDemo(user);
  await user.click(screen.getByRole("link", { name: "回款管理" }));
  await screen.findByRole("button", { name: "V2 UAT 首付款回款" });
  await user.click(screen.getByRole("button", { name: "V2 UAT 首付款回款" }));
  expect(await screen.findByText("回款详情")).toBeInTheDocument();
  expect(screen.getByText("合同口径")).toBeInTheDocument();
  expect(screen.getByText("首付款部分到账")).toBeInTheDocument();
  expect(screen.getByText("客户财务流程推进中")).toBeInTheDocument();
  expect(screen.getByText("银行回单.pdf")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "登记到账" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认到账" })).toBeInTheDocument();
});
```

Add mock routes for:

- `/api/receivable-plans`
- `/api/receivable-plans/601`
- `/api/receivable-plans/601/payments`
- `/api/receivable-plans/601/follow-ups`
- `/api/receivable-plans/601/terminate`
- `/api/payments`
- `/api/payments/701`
- `/api/payments/701/confirm`
- `/api/payments/701/exception`
- `/api/payments/701/refund`
- `/api/attachments?object_type=receivable_plan`
- `/api/attachments?object_type=payment`

- [x] **Step 2: Run RED**

Run:

```bash
cd frontend && npm test -- --run
```

Expected: FAIL because the `回款管理` page and client APIs do not exist.

- [x] **Step 3: Add frontend API types and client methods**

In `frontend/src/api/crm.ts`, add:

```ts
export type ReceivablePlan = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  plan_name: string;
  plan_stage?: string;
  receivable_status: string;
  planned_receivable_date?: string;
  planned_amount: number;
  owner_user_id: number;
  payment_terms_snapshot?: string;
  overdue_reason?: string;
  termination_reason?: string;
  contract_amount?: number;
  effective_invoiced_amount?: number;
  confirmed_received_amount?: number;
  unreceived_amount?: number;
  unreconciled_payment_amount?: number;
  overdue_days?: number;
  remark?: string;
};

export type Payment = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  receivable_plan_id?: number;
  payment_name: string;
  payment_status: string;
  received_at?: string;
  received_amount: number;
  confirmed_amount?: number;
  confirmed_at?: string;
  payment_method: string;
  payer_name?: string;
  receiving_account?: string;
  bank_flow_no?: string;
  reconciled_amount?: number;
  unreconciled_amount?: number;
  exception_type?: string;
  exception_reason?: string;
  refund_reason?: string;
  owner_user_id: number;
  remark?: string;
};
```

Add `ReceivableFollowUp` and `crmApi.receivables` / `crmApi.payments` methods matching backend endpoints.

- [x] **Step 4: Add menu, route, and `ReceivablesPage`**

In `frontend/src/App.tsx`:

- Import `WalletCards` from `lucide-react`.
- Add nav item `{ key: "/receivables", label: "回款管理", icon: <WalletCards size={18} />, permission: "receivable.read" }`.
- Add route `<Route path="/receivables" element={<ReceivablesPage currentUser={user} />} />`.
- Implement `ReceivablesPage` using `InvoicesPage` structure:
  - filters
  - `useResource(() => crmApi.receivables.list(filters), [filters])`
  - accounts/opportunities/contracts lookup maps
  - selected plan drawer
  - payments, follow-ups, attachments loaded on select
  - modals for edit plan, register payment, confirm payment, exception, refund, follow-up, terminate

Drawer sections:

- `回款详情`
- `合同口径`
- `到账流水`
- `回款跟进`
- `附件`
- `后续核销`

Buttons:

- `新建计划`
- `登记到账`
- `确认到账`
- `登记异常`
- `标记退款`
- `添加跟进`
- `终止计划`
- `添加附件`

- [x] **Step 5: Add helper functions**

Add helpers near existing status helpers:

```ts
function receivableStatusText(status?: string) { ... }
function receivableStatusTag(status?: string) { ... }
function paymentStatusText(status?: string) { ... }
function paymentStatusTag(status?: string) { ... }
function paymentMethodText(method?: string) { ... }
function paymentMethodOptions() { ... }
function receivableOverdueReasonOptions() { ... }
function paymentExceptionTypeOptions() { ... }
function receivableAttachmentFileTypeOptions() { ... }
```

Use labels from the design spec.

- [x] **Step 6: Run GREEN**

Run:

```bash
cd frontend && npm test -- --run
```

Expected: PASS.

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

## Task 6: OpenAPI And API List

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `docs/api/crm-v1-api-list.md`

- [x] **Step 1: Add failing OpenAPI coverage through runtime endpoints**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected after backend endpoints exist but before docs update: FAIL listing receivable/payment paths.

- [x] **Step 2: Add OpenAPI paths**

Add tag:

```yaml
  - name: Receivables
  - name: Payments
```

Add paths:

- `/api/receivable-plans` get/post
- `/api/receivable-plans/{planId}` get/patch
- `/api/receivable-plans/{planId}/terminate` post
- `/api/receivable-plans/{planId}/payments` get
- `/api/receivable-plans/{planId}/follow-ups` get/post
- `/api/payments` get/post
- `/api/payments/{paymentId}` get/patch
- `/api/payments/{paymentId}/confirm` post
- `/api/payments/{paymentId}/exception` post
- `/api/payments/{paymentId}/refund` post

Use the existing contract/invoice path style: object request bodies are acceptable for V2 first pass, but every runtime method/path must be represented.

- [x] **Step 3: Update API list**

In `docs/api/crm-v1-api-list.md`, add a new section after 开票管理:

```markdown
## 12. 回款管理API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/receivable-plans | 查询回款计划列表 | receivable.read + 关联合同数据权限 |
| GET | /api/receivable-plans/{id} | 查看回款计划详情 | receivable.read + 关联合同数据权限 |
| POST | /api/receivable-plans | 创建回款计划 | receivable.create + 关联合同数据权限 |
| PATCH | /api/receivable-plans/{id} | 编辑回款计划 | receivable.update + 关联合同数据权限 |
| POST | /api/receivable-plans/{id}/terminate | 终止回款计划 | receivable.terminate + 关联合同数据权限 |
| GET | /api/receivable-plans/{id}/payments | 查询计划到账流水 | receivable.read + 关联合同数据权限 |
| GET | /api/receivable-plans/{id}/follow-ups | 查询回款跟进 | receivable.read + 关联合同数据权限 |
| POST | /api/receivable-plans/{id}/follow-ups | 新增回款跟进 | receivable.follow_up + 关联合同数据权限 |
| GET | /api/payments | 查询到账流水列表 | payment.read + 关联合同数据权限 |
| GET | /api/payments/{id} | 查看到账流水详情 | payment.read + 关联合同数据权限 |
| POST | /api/payments | 登记到账流水 | payment.create + 关联合同数据权限 |
| PATCH | /api/payments/{id} | 编辑到账流水 | payment.update + 关联合同数据权限 |
| POST | /api/payments/{id}/confirm | 确认到账 | payment.confirm + 关联合同数据权限 |
| POST | /api/payments/{id}/exception | 登记到账异常 | payment.exception + 关联合同数据权限 |
| POST | /api/payments/{id}/refund | 标记退款 | payment.refund + 关联合同数据权限 |
```

Update the attachment section to include `receivable_plan` and `payment`.

- [x] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: PASS.

## Task 7: Verification, Browser UAT, And Module Record

**Files:**
- Modify: `docs/product/crm-v2-development-todolist.md`
- Modify: `docs/superpowers/plans/2026-06-30-v2-receivable-management.md`

- [x] **Step 1: Run backend targeted regression**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest,ReceivablePlanControllerTest,PaymentControllerTest,AttachmentControllerTest,OpenApiContractCoverageTest test
```

Expected: PASS.

Run:

```bash
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: PASS.

- [x] **Step 2: Run frontend verification**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```

Expected: PASS.

- [x] **Step 3: Browser UAT**

Start current backend and frontend if needed:

```bash
cd backend && CRM_DB_URL=jdbc:postgresql://localhost:55432/crm_ai CRM_DB_USERNAME=crm_ai CRM_DB_PASSWORD=crm_ai CRM_SEED_V1_DEMO_ENABLED=true mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
cd frontend && VITE_API_PROXY_TARGET=http://127.0.0.1:8081 npm run dev -- --host 127.0.0.1 --port 5175
```

Use `demo_admin` / `S3cure!123`.

Create one UAT receivable plan and payment through APIs if seed data does not include one.

Verify in browser:

- `/receivables` loads.
- `回款管理` heading appears.
- UAT receivable plan appears in the table.
- Detail drawer opens.
- Drawer shows `合同口径`, `到账流水`, `回款跟进`, `附件`, and `后续核销`.
- Buttons `登记到账`, `确认到账`, `登记异常`, `添加跟进`, `添加附件` are visible.
- Console has no application errors.

- [x] **Step 4: Update module record**

Update `docs/product/crm-v2-development-todolist.md`:

- Mark `回款管理链路` as Done.
- Set `发票回款核销链路` as Current.
- Add verification commands and browser UAT result.
- Update current progress snapshot.

Update this plan's task list:

- Mark tasks 1-7 Done after verification.

- [x] **Step 5: Commit and push**

Run:

```bash
git status --short
git add backend/src/main/resources/db/migration/V18__create_receivables.sql \
  backend/src/main/java/com/canicula/crmai/receivable \
  backend/src/main/java/com/canicula/crmai/payment \
  backend/src/test/java/com/canicula/crmai/receivable \
  backend/src/test/java/com/canicula/crmai/payment \
  backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java \
  backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java \
  backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java \
  backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java \
  frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/App.test.tsx \
  docs/openapi/crm-v1-openapi.yaml docs/api/crm-v1-api-list.md \
  docs/product/crm-v2-development-todolist.md \
  docs/superpowers/plans/2026-06-30-v2-receivable-management.md
git commit -m "feat: add v2 receivable management"
git push origin codex/v2-receivable-management
```

Expected: push succeeds.

