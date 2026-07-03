# V3 Receivable Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V3 receivable dashboard at `/dashboard/receivables` with permissioned backend aggregation, OpenAPI coverage, frontend page, tests, and UAT evidence.

**Architecture:** Add one dashboard permission migration and one focused aggregation endpoint backed by existing `crm_receivable_plans`, `crm_payments`, `crm_reconciliations`, `crm_invoices`, and `crm_accounts`. Reuse the current `DashboardService` data-permission pattern and the React dashboard visual language already used by overview, funnel, contracts, and invoices. The detail workflows stay in `/receivables` and `/reconciliations`; the V3 page only aggregates and links back.

**Tech Stack:** Spring Boot 3, JdbcTemplate, Flyway, JUnit, PostgreSQL/H2, React, TypeScript, Ant Design, Vitest, Vite.

---

## File Map

- Create `backend/src/main/resources/db/migration/V25__create_dashboard_receivable_permissions.sql`
  - Seeds `dashboard.receivables.read`.
- Modify `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
  - Expected migration count and receivable dashboard permission assertion.
- Modify `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
  - Expected latest Flyway version and permission assertion.
- Modify `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
  - Add receivable dashboard behavior and permission tests.
- Create backend records under `backend/src/main/java/com/canicula/crmai/dashboard/`
  - `DashboardReceivableFilter`
  - `DashboardReceivableResponse`
  - `DashboardReceivableStatusItem`
  - `DashboardReceivableGapTrendPoint`
  - `DashboardReconciliationSummary`
  - `DashboardAttentionReceivable`
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
  - Add `GET /api/dashboard/receivables`.
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
  - Add receivable dashboard aggregation, status labels, payment/reconciliation summary, gap trend, and attention ranking.
- Modify `docs/openapi/crm-v1-openapi.yaml`
  - Add `/api/dashboard/receivables`.
- Modify `frontend/src/api/crm.ts`
  - Add receivable dashboard response types and API client.
- Modify `frontend/src/App.tsx`
  - Add dashboard submenu item, route, page component, and rendering helpers.
- Modify `frontend/src/styles.css`
  - Add compact receivable dashboard row styles.
- Modify `frontend/src/App.test.tsx`
  - Add mocked receivable dashboard data and page assertions.
- Modify `docs/product/crm-v3-development-todolist.md`
  - Track module 7 implementation and completion.
- Create `docs/testing/evidence/artifacts/v3-receivable-dashboard-uat-20260704.png`
  - Browser UAT screenshot evidence.

---

## Task 1: Permission Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V25__create_dashboard_receivable_permissions.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write the failing H2 migration assertion**

In `DatabaseMigrationTest`, update the existing migration count assertion from:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(24);
```

to:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(25);
```

Add this test near the existing dashboard permission tests:

```java
@Test
void createsDashboardReceivablesReadPermission() {
    Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_permissions
            where permission_code = 'dashboard.receivables.read'
              and permission_name = '查看回款看板'
              and module_code = 'dashboard'
            """,
            Integer.class);

    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 2: Write the failing PostgreSQL migration assertion**

In `PostgresMigrationIT`, update the expected version from:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("24");
```

to:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("25");
```

Add this test near the existing dashboard permission tests:

```java
@Test
void createsDashboardReceivablesReadPermission() {
    Flyway flyway = Flyway.configure()
            .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
            .locations("classpath:db/migration")
            .placeholders(Map.of(
                    "activeRecordFilter", "where deleted_at is null",
                    "jsonDataType", "jsonb"))
            .load();

    flyway.migrate();

    JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
            POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
    Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_permissions
            where permission_code = 'dashboard.receivables.read'
              and permission_name = '查看回款看板'
              and module_code = 'dashboard'
            """,
            Integer.class);

    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 3: Run RED migration test**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: fails because `dashboard.receivables.read` is absent.

- [ ] **Step 4: Add V25 migration**

Create `V25__create_dashboard_receivable_permissions.sql`:

```sql
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.receivables.read', '查看回款看板', 'operation', 'dashboard', 1240
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.receivables.read'
);
```

- [ ] **Step 5: Run GREEN migration tests**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: both commands pass. If `PostgresMigrationIT` cannot access Docker in the sandbox, rerun it with approval outside the sandbox and record the result.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V25__create_dashboard_receivable_permissions.sql \
  backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java \
  backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java
git commit -m "feat: add dashboard receivable permission"
```

---

## Task 2: Backend Receivable Dashboard API

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardReceivableFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardReceivableResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardReceivableStatusItem.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardReceivableGapTrendPoint.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardReconciliationSummary.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardAttentionReceivable.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`

- [ ] **Step 1: Write failing API behavior test**

In `DashboardControllerTest`, add `"dashboard.receivables.read"` to `allDashboardPermissions()`.

Add this test near the existing dashboard tests:

```java
@Test
void receivablesDashboardReturnsMetricsStatusGapReconciliationAndAttentionReceivables() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("dashboard-receivable-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "dashboard_receivable_" + suffix,
            departmentId,
            allDashboardPermissions(),
            List.of("global"));
    DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

    try {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/receivables?date_from=2026-07-01&date_to=2026-07-31",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-receivable-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
        assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("planned_receivable_amount");
            assertThat(card.path("label").asText()).isEqualTo("计划应收金额");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(260000));
            assertThat(card.path("drilldown_url").asText()).startsWith("/receivables");
        });
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("confirmed_received_amount");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(180000));
        });
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("unreceived_amount");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(80000));
        });
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("pending_reconciliation_amount");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(60000));
        });
        assertThat(data.path("status_distribution")).anySatisfy(status -> {
            assertThat(status.path("status").asText()).isEqualTo("overdue");
            assertThat(status.path("label").asText()).isEqualTo("已逾期");
            assertThat(status.path("count").asLong()).isEqualTo(1);
            assertThat(status.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(260000));
            assertThat(status.path("received_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(180000));
            assertThat(status.path("unreceived_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(80000));
        });
        assertThat(data.path("gap_trend")).anySatisfy(point -> {
            assertThat(point.path("period").asText()).isEqualTo("2026-07");
            assertThat(point.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(260000));
            assertThat(point.path("received_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(180000));
            assertThat(point.path("gap_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(80000));
        });
        assertThat(data.path("reconciliation_summary")).anySatisfy(summary -> {
            assertThat(summary.path("key").asText()).isEqualTo("confirmed_unreconciled");
            assertThat(summary.path("label").asText()).isEqualTo("待核销到账");
            assertThat(summary.path("amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(60000));
        });
        assertThat(data.path("attention_receivables")).anySatisfy(item -> {
            assertThat(item.path("object_type").asText()).isEqualTo("receivable_plan");
            assertThat(item.path("object_id").asLong()).isEqualTo(fixture.receivablePlanId());
            assertThat(item.path("reason").asText()).contains("逾期");
            assertThat(item.path("drilldown_url").asText()).isEqualTo("/receivables?receivable_plan_id=" + fixture.receivablePlanId());
        });
    } finally {
        deleteFixture(fixture);
    }
}
```

- [ ] **Step 2: Write failing permission test**

Add this test:

```java
@Test
void receivablesDashboardRequiresDashboardReceivablesReadPermission() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("dashboard-receivable-forbidden-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "dashboard_receivable_forbidden_" + suffix,
            departmentId,
            List.of("dashboard.read", "dashboard.funnel.read", "dashboard.contracts.read",
                    "dashboard.invoices.read", "receivable.read", "payment.read", "reconciliation.read"),
            List.of("global"));

    ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/dashboard/receivables",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders(user.token(), "dashboard-receivable-forbidden-trace-001")),
            JsonNode.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
}
```

- [ ] **Step 3: Run RED API tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest#receivablesDashboardReturnsMetricsStatusGapReconciliationAndAttentionReceivables,DashboardControllerTest#receivablesDashboardRequiresDashboardReceivablesReadPermission test
```

Expected: fails because `/api/dashboard/receivables` is not implemented. If random port binding is blocked by sandbox, rerun with approval outside the sandbox.

- [ ] **Step 4: Add backend response records**

Create `DashboardReceivableFilter.java`:

```java
package com.canicula.crmai.dashboard;

import java.time.LocalDate;

public record DashboardReceivableFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String receivable_status,
        Boolean overdue_only) {
}
```

Create `DashboardReceivableResponse.java`:

```java
package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardReceivableResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardReceivableStatusItem> status_distribution,
        List<DashboardReceivableGapTrendPoint> gap_trend,
        List<DashboardReconciliationSummary> reconciliation_summary,
        List<DashboardAttentionReceivable> attention_receivables) {
}
```

Create `DashboardReceivableStatusItem.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardReceivableStatusItem(
        String status,
        String label,
        long count,
        BigDecimal planned_amount,
        BigDecimal received_amount,
        BigDecimal unreceived_amount,
        String drilldown_url) {
}
```

Create `DashboardReceivableGapTrendPoint.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardReceivableGapTrendPoint(
        String period,
        BigDecimal planned_amount,
        BigDecimal received_amount,
        BigDecimal gap_amount,
        long receivable_count) {
}
```

Create `DashboardReconciliationSummary.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardReconciliationSummary(
        String key,
        String label,
        long count,
        BigDecimal amount,
        String level,
        String drilldown_url) {
}
```

Create `DashboardAttentionReceivable.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardAttentionReceivable(
        String object_type,
        Long object_id,
        String title,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long owner_user_id,
        String status,
        BigDecimal amount,
        OffsetDateTime planned_at,
        OffsetDateTime occurred_at,
        String reason,
        String drilldown_url) {
}
```

- [ ] **Step 5: Add controller endpoint**

In `DashboardController`, add:

```java
@RequirePermission("dashboard.receivables.read")
@GetMapping("/api/dashboard/receivables")
DashboardReceivableResponse receivables(
        @RequestParam(name = "date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                LocalDate dateFrom,
        @RequestParam(name = "date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                LocalDate dateTo,
        @RequestParam(name = "department_id", required = false) Long departmentId,
        @RequestParam(name = "owner_id", required = false) Long ownerId,
        @RequestParam(name = "account_id", required = false) Long accountId,
        @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
        @RequestParam(name = "contract_id", required = false) Long contractId,
        @RequestParam(name = "receivable_status", required = false) String receivableStatus,
        @RequestParam(name = "overdue_only", required = false) Boolean overdueOnly,
        HttpServletRequest httpRequest) {
    return dashboardService.receivables(
            currentUserId(httpRequest),
            new DashboardReceivableFilter(
                    dateFrom,
                    dateTo,
                    departmentId,
                    ownerId,
                    accountId,
                    opportunityId,
                    contractId,
                    receivableStatus,
                    overdueOnly));
}
```

- [ ] **Step 6: Add service public method and normalization**

In `DashboardService`, add status definitions:

```java
private static final List<ReceivableStatusDefinition> RECEIVABLE_STATUSES = List.of(
        new ReceivableStatusDefinition("planned", "计划中"),
        new ReceivableStatusDefinition("partial", "部分回款"),
        new ReceivableStatusDefinition("received", "已回款"),
        new ReceivableStatusDefinition("overdue", "已逾期"),
        new ReceivableStatusDefinition("terminated", "已终止"));

private static final List<PaymentStatusDefinition> PAYMENT_STATUSES = List.of(
        new PaymentStatusDefinition("registered", "已登记"),
        new PaymentStatusDefinition("confirmed", "已确认"),
        new PaymentStatusDefinition("partially_reconciled", "部分核销"),
        new PaymentStatusDefinition("reconciled", "已核销"),
        new PaymentStatusDefinition("exception", "异常"),
        new PaymentStatusDefinition("refunded", "已退款"));
```

Add:

```java
public DashboardReceivableResponse receivables(Long userId, DashboardReceivableFilter requestedFilter) {
    DashboardReceivableFilter filter = normalizeReceivableFilter(requestedFilter);
    DomainAccess receivable = access(userId, "receivable", "receivable.read", RECEIVABLE_COLUMNS);
    DomainAccess payment = access(userId, "payment", "payment.read", PAYMENT_COLUMNS);
    DomainAccess reconciliation = access(userId, "reconciliation", "reconciliation.read", RECONCILIATION_COLUMNS);
    List<ReceivableDashboardRow> receivables = receivableRows(filter, receivable);
    List<PaymentDashboardRow> payments = paymentRows(filter, payment);
    List<ReconciliationDashboardRow> reconciliations = reconciliationRows(filter, reconciliation);
    return new DashboardReceivableResponse(
            receivableFilterMap(filter),
            receivableMetricCards(filter, receivables, payments),
            receivableStatusDistribution(filter, receivables),
            receivableGapTrend(receivables),
            reconciliationSummary(filter, payments, reconciliations),
            attentionReceivables(receivables, payments));
}
```

Add `normalizeReceivableFilter(...)` using the same current-quarter default as invoices:

```java
private DashboardReceivableFilter normalizeReceivableFilter(DashboardReceivableFilter filter) {
    LocalDate today = LocalDate.now();
    int quarterStartMonth = ((today.getMonthValue() - 1) / 3) * 3 + 1;
    LocalDate defaultFrom = LocalDate.of(today.getYear(), quarterStartMonth, 1);
    LocalDate defaultTo = defaultFrom.plusMonths(3).minusDays(1);
    LocalDate dateFrom = filter.date_from() == null ? defaultFrom : filter.date_from();
    LocalDate dateTo = filter.date_to() == null ? defaultTo : filter.date_to();
    return new DashboardReceivableFilter(
            dateFrom,
            dateTo,
            filter.department_id(),
            filter.owner_id(),
            filter.account_id(),
            filter.opportunity_id(),
            filter.contract_id(),
            filter.receivable_status(),
            filter.overdue_only());
}
```

- [ ] **Step 7: Add dashboard row queries**

Add private row records:

```java
private record ReceivableDashboardRow(
        Long id,
        String name,
        Long accountId,
        Long opportunityId,
        Long contractId,
        Long ownerUserId,
        String status,
        BigDecimal plannedAmount,
        BigDecimal receivedAmount,
        BigDecimal unreceivedAmount,
        OffsetDateTime plannedAt) {
}

private record PaymentDashboardRow(
        Long id,
        String name,
        Long accountId,
        Long opportunityId,
        Long contractId,
        Long receivablePlanId,
        Long ownerUserId,
        String status,
        BigDecimal receivedAmount,
        BigDecimal confirmedAmount,
        BigDecimal reconciledAmount,
        OffsetDateTime receivedAt) {
}

private record ReconciliationDashboardRow(
        Long id,
        Long accountId,
        Long opportunityId,
        Long contractId,
        Long paymentId,
        Long reconciledBy,
        String status,
        BigDecimal amount,
        OffsetDateTime reconciledAt) {
}
```

Implement `receivableRows(...)` by querying `crm_receivable_plans rp join crm_accounts a`, applying `rp.planned_receivable_date` date filter, `access.clause()`, department/owner/account/opportunity/contract/status/overdue filters. Compute `receivedAmount` as:

```sql
coalesce((
  select sum(p.confirmed_amount)
  from crm_payments p
  where p.deleted_at is null
    and p.receivable_plan_id = rp.id
    and p.payment_status in ('confirmed', 'partially_reconciled', 'reconciled')
), 0)
```

Compute `unreceivedAmount` in Java as `max(plannedAmount - receivedAmount, 0)`.

Implement `paymentRows(...)` by querying `crm_payments p join crm_accounts a`, applying `p.received_at` date filter, data permissions, and filters. Effective payment statuses are `confirmed`, `partially_reconciled`, `reconciled`.

Implement `reconciliationRows(...)` by querying `crm_reconciliations r join crm_accounts a`, applying `r.reconciled_at` date filter, data permissions, and filters.

- [ ] **Step 8: Add aggregation helpers**

Add metric keys:

```java
"planned_receivable_amount"
"confirmed_received_amount"
"unreceived_amount"
"overdue_amount"
"pending_reconciliation_amount"
"unallocated_payment_amount"
```

Use these rules:

```java
private static boolean effectivePayment(PaymentDashboardRow row) {
    return Set.of("confirmed", "partially_reconciled", "reconciled").contains(row.status());
}

private static BigDecimal paymentUnreconciledAmount(PaymentDashboardRow row) {
    if (!effectivePayment(row)) {
        return ZERO;
    }
    return positiveGap(row.confirmedAmount(), row.reconciledAmount());
}

private static boolean openReceivable(ReceivableDashboardRow row) {
    return !Set.of("received", "terminated").contains(row.status());
}

private static boolean overdueReceivable(ReceivableDashboardRow row, OffsetDateTime now) {
    return "overdue".equals(row.status())
            || (row.plannedAt() != null && row.plannedAt().isBefore(now) && openReceivable(row));
}
```

For attention rows:

- Overdue receivable: reason `大额逾期未收`, drilldown `/receivables?receivable_plan_id=<id>`.
- Due soon receivable: reason `30天内到期未收`.
- Unreconciled payment: reason `到账未核销`, object type `payment`, drilldown `/reconciliations?payment_id=<id>`.
- Unallocated payment: reason `未分配到账`, object type `payment`, drilldown `/reconciliations?payment_id=<id>`.

- [ ] **Step 9: Run GREEN API tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest#receivablesDashboardReturnsMetricsStatusGapReconciliationAndAttentionReceivables,DashboardControllerTest#receivablesDashboardRequiresDashboardReceivablesReadPermission test
cd backend && mvn -Dtest=DashboardControllerTest test
```

Expected: both commands pass.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/canicula/crmai/dashboard \
  backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java
git commit -m "feat: add v3 receivable dashboard api"
```

---

## Task 3: OpenAPI Contract

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`

- [ ] **Step 1: Run RED OpenAPI coverage**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: fails with missing `get /api/dashboard/receivables`.

- [ ] **Step 2: Document `/api/dashboard/receivables`**

Add this path near the other dashboard paths:

```yaml
  /api/dashboard/receivables:
    get:
      tags: [Dashboard]
      summary: V3 receivable and reconciliation dashboard
      parameters:
        - name: date_from
          in: query
          schema:
            type: string
            format: date
        - name: date_to
          in: query
          schema:
            type: string
            format: date
        - name: department_id
          in: query
          schema:
            type: integer
            format: int64
        - name: owner_id
          in: query
          schema:
            type: integer
            format: int64
        - name: account_id
          in: query
          schema:
            type: integer
            format: int64
        - name: opportunity_id
          in: query
          schema:
            type: integer
            format: int64
        - name: contract_id
          in: query
          schema:
            type: integer
            format: int64
        - name: receivable_status
          in: query
          schema:
            type: string
        - name: overdue_only
          in: query
          schema:
            type: boolean
      responses:
        '200':
          description: Receivable metrics, status distribution, gap trend, reconciliation summary, and attention receivables.
```

- [ ] **Step 3: Run GREEN OpenAPI coverage**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add docs/openapi/crm-v1-openapi.yaml
git commit -m "docs: document receivable dashboard api"
```

---

## Task 4: Frontend Receivable Dashboard Page

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add failing frontend test**

In `frontend/src/App.test.tsx`, add `"dashboard.receivables.read"` to the mocked user permissions.

Add `dashboardReceivables` to `apiData`:

```ts
dashboardReceivables: {
  filters: {},
  metric_cards: [
    { key: "planned_receivable_amount", label: "计划应收金额", value: 360000, unit: "CNY", drilldown_url: "/receivables" },
    { key: "confirmed_received_amount", label: "已确认回款", value: 180000, unit: "CNY", drilldown_url: "/receivables?received=true" },
    { key: "unreceived_amount", label: "未收金额", value: 180000, unit: "CNY", drilldown_url: "/receivables?unreceived=true" },
    { key: "pending_reconciliation_amount", label: "待核销到账", value: 60000, unit: "CNY", drilldown_url: "/reconciliations?pending_only=true" }
  ],
  status_distribution: [
    { status: "overdue", label: "已逾期", count: 1, planned_amount: 260000, received_amount: 180000, unreceived_amount: 80000, drilldown_url: "/receivables?receivable_status=overdue" },
    { status: "planned", label: "计划中", count: 1, planned_amount: 100000, received_amount: 0, unreceived_amount: 100000, drilldown_url: "/receivables?receivable_status=planned" }
  ],
  gap_trend: [
    { period: "2026-07", planned_amount: 360000, received_amount: 180000, gap_amount: 180000, receivable_count: 2 }
  ],
  reconciliation_summary: [
    { key: "confirmed_unreconciled", label: "待核销到账", count: 1, amount: 60000, level: "medium", drilldown_url: "/reconciliations?pending_only=true" },
    { key: "payment_exception", label: "异常到账", count: 0, amount: 0, level: "none", drilldown_url: "/payments?exception_only=true" }
  ],
  attention_receivables: [
    {
      object_type: "receivable_plan",
      object_id: 601,
      title: "V2 UAT 首付款回款",
      account_id: 1,
      opportunity_id: 10,
      contract_id: 301,
      owner_user_id: 1001,
      status: "overdue",
      amount: 80000,
      planned_at: "2026-07-20T10:00:00+08:00",
      reason: "大额逾期未收",
      drilldown_url: "/receivables?receivable_plan_id=601"
    }
  ]
}
```

Add mock route before generic receivable routes:

```ts
if (path.endsWith("/api/dashboard/receivables")) {
  return jsonResponse({ code: "OK", data: data.dashboardReceivables });
}
```

Add the page test:

```ts
it("renders the V3 receivable dashboard page", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/dashboard/receivables");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "回款看板" })).toBeInTheDocument();
  expect(screen.getByText("计划应收金额")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "回款状态分布" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "回款缺口趋势" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "到账与核销概览" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "重点关注回款" })).toBeInTheDocument();
  expect(screen.getByText("V2 UAT 首付款回款")).toBeInTheDocument();
  expect(screen.getByText("大额逾期未收")).toBeInTheDocument();
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/receivables"), expect.anything());
  });
});
```

- [ ] **Step 2: Run RED frontend test**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 receivable dashboard page"
```

Expected: fails because route/page is missing.

- [ ] **Step 3: Add API types and client**

In `frontend/src/api/crm.ts`, add:

```ts
export type DashboardReceivableStatusItem = {
  status: string;
  label: string;
  count: number;
  planned_amount: number;
  received_amount: number;
  unreceived_amount: number;
  drilldown_url: string;
};

export type DashboardReceivableGapTrendPoint = {
  period: string;
  planned_amount: number;
  received_amount: number;
  gap_amount: number;
  receivable_count: number;
};

export type DashboardReconciliationSummary = {
  key: string;
  label: string;
  count: number;
  amount: number;
  level: string;
  drilldown_url: string;
};

export type DashboardAttentionReceivable = {
  object_type: string;
  object_id: number;
  title: string;
  account_id?: number;
  opportunity_id?: number;
  contract_id?: number;
  owner_user_id?: number;
  status: string;
  amount: number;
  planned_at?: string;
  occurred_at?: string;
  reason: string;
  drilldown_url: string;
};

export type DashboardReceivables = {
  filters: Record<string, unknown>;
  metric_cards: DashboardMetricCard[];
  status_distribution: DashboardReceivableStatusItem[];
  gap_trend: DashboardReceivableGapTrendPoint[];
  reconciliation_summary: DashboardReconciliationSummary[];
  attention_receivables: DashboardAttentionReceivable[];
};
```

Add:

```ts
receivables: (query?: QueryParams) =>
  requestJson<DashboardReceivables>(withQuery("/api/dashboard/receivables", query))
```

inside `crmApi.dashboard`.

- [ ] **Step 4: Add route, nav, and page**

In `App.tsx`, import the new types. Add dashboard submenu item:

```tsx
{ key: "/dashboard/receivables", label: "回款看板", permission: "dashboard.receivables.read" }
```

Add route:

```tsx
<Route path="/dashboard/receivables" element={<DashboardReceivablesPage />} />
```

Add empty state:

```tsx
function emptyDashboardReceivables(): DashboardReceivables {
  return {
    filters: {},
    metric_cards: [],
    status_distribution: [],
    gap_trend: [],
    reconciliation_summary: [],
    attention_receivables: []
  };
}
```

Add `DashboardReceivablesPage` with these section titles:

```tsx
<PageTitle
  title="回款看板"
  description="查看计划应收、已确认回款、未收缺口、逾期和到账核销质量。"
  action={<RefreshButton onClick={refresh} loading={loading} />}
/>
```

Cards:

- `回款状态分布`
- `回款缺口趋势`
- `到账与核销概览`
- `重点关注回款`

Reuse `DashboardMetricCardView`, `currencyText`, `dateText`, `receivableStatusText`, and `paymentStatusText`.

- [ ] **Step 5: Add row components**

Add these focused components:

```tsx
function DashboardReceivableStatusRow({ status, maxAmount }: { status: DashboardReceivableStatusItem; maxAmount: number }) {
  const width = Math.max(4, Math.round((status.planned_amount / maxAmount) * 100));
  return (
    <Link className="dashboard-receivables__status-row" to={status.drilldown_url}>
      <span>
        <strong>{status.label}</strong>
        <small>{status.count} 项</small>
      </span>
      <div className="dashboard-funnel__bar" aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </div>
      <small>
        应收 {currencyText(status.planned_amount)} · 已收 {currencyText(status.received_amount)} · 未收 {currencyText(status.unreceived_amount)}
      </small>
    </Link>
  );
}
```

```tsx
function DashboardReceivableGapTrendRow({ point }: { point: DashboardReceivableGapTrendPoint }) {
  return (
    <div className="dashboard-funnel__trend-row">
      <strong>{point.period}</strong>
      <span>{currencyText(point.gap_amount)}</span>
      <small>
        应收 {currencyText(point.planned_amount)} · 已收 {currencyText(point.received_amount)} · {point.receivable_count} 项
      </small>
    </div>
  );
}
```

```tsx
function DashboardReconciliationSummaryRow({ summary }: { summary: DashboardReconciliationSummary }) {
  const color = summary.level === "high" ? "red" : summary.level === "medium" ? "orange" : "blue";
  return (
    <Link className="dashboard-receivables__summary-row" to={summary.drilldown_url}>
      <span>
        <strong>{summary.label}</strong>
        <Tag color={color}>{summary.count} 项</Tag>
      </span>
      <small>{currencyText(summary.amount)}</small>
    </Link>
  );
}
```

```tsx
function DashboardAttentionReceivableRow({ item }: { item: DashboardAttentionReceivable }) {
  return (
    <Link className="dashboard-funnel__attention-row" to={item.drilldown_url}>
      <span>
        <strong>{item.title}</strong>
        <Tag color={item.reason.includes("逾期") ? "red" : item.reason.includes("核销") ? "orange" : "blue"}>
          {item.reason}
        </Tag>
      </span>
      <small>
        {currencyText(item.amount)} · {item.status}
        {item.planned_at ? ` · ${dateText(item.planned_at)}` : ""}
      </small>
    </Link>
  );
}
```

- [ ] **Step 6: Add CSS**

In `styles.css`, extend the same selector groups used by invoices:

```css
.dashboard-receivables__status-list,
.dashboard-receivables__gap-trend,
.dashboard-receivables__summary-list {
  display: grid;
  gap: 10px;
}

.dashboard-receivables__status-row,
.dashboard-receivables__summary-row {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e6eaf2;
  border-radius: 8px;
  color: #172033;
  background: #f8fafd;
}

.dashboard-receivables__status-row:hover,
.dashboard-receivables__summary-row:hover {
  border-color: #1f5eff;
  color: #1f5eff;
}

.dashboard-receivables__status-row span,
.dashboard-receivables__summary-row span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dashboard-receivables__status-row strong,
.dashboard-receivables__summary-row strong {
  min-width: 0;
  word-break: break-word;
}

.dashboard-receivables__status-row small,
.dashboard-receivables__summary-row small {
  color: #667085;
}
```

- [ ] **Step 7: Run GREEN frontend tests and build**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 receivable dashboard page"
cd frontend && npm test -- --run src/App.test.tsx
cd frontend && npm run build
```

Expected: all pass. Existing Vite large chunk warning is acceptable if build exits `0`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/styles.css frontend/src/App.test.tsx
git commit -m "feat: add v3 receivable dashboard page"
```

---

## Task 5: Verification, UAT, TODO, and Push

**Files:**
- Modify: `docs/product/crm-v3-development-todolist.md`
- Create: `docs/testing/evidence/artifacts/v3-receivable-dashboard-uat-20260704.png`

- [ ] **Step 1: Run backend verification**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest,DashboardControllerTest,OpenApiContractCoverageTest test
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: all pass. If Docker or random port access is blocked by sandbox, rerun with approval outside the sandbox and record the result.

- [ ] **Step 2: Restart local backend on latest code**

Find the current 8081 process:

```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

Stop the old PID:

```bash
kill <PID>
```

Start backend:

```bash
cd backend
SERVER_PORT=8081 CRM_DB_URL=jdbc:postgresql://localhost:55432/crm_ai CRM_DB_USERNAME=crm_ai CRM_DB_PASSWORD=crm_ai CRM_SEED_V1_DEMO_ENABLED=true mvn spring-boot:run
```

Expected: startup applies V25 and logs `now at version v25`.

- [ ] **Step 3: API smoke**

Run:

```bash
node -e "fetch('http://127.0.0.1:8081/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Trace-Id':'v3-receivable-dashboard-smoke-login'},body:JSON.stringify({username:'demo_admin',password:'S3cure!123'})}).then(r=>r.json()).then(async login=>{const token=login.data.access_token; const res=await fetch('http://127.0.0.1:8081/api/dashboard/receivables?date_from=2026-07-01&date_to=2026-09-30',{headers:{Authorization:'Bearer '+token,'X-Trace-Id':'v3-receivable-dashboard-smoke'}}); const body=await res.json(); console.log(JSON.stringify({loginCode:login.code,status:res.status,code:body.code,metricCards:body.data?.metric_cards?.length,statuses:body.data?.status_distribution?.length,gapTrend:body.data?.gap_trend?.length,reconciliation:body.data?.reconciliation_summary?.length,attention:body.data?.attention_receivables?.length}, null, 2));})"
```

Expected:

```json
{
  "loginCode": "OK",
  "status": 200,
  "code": "OK",
  "metricCards": 6,
  "statuses": 5,
  "gapTrend": 1,
  "reconciliation": 6,
  "attention": 1
}
```

Counts may be higher depending on local seeded data, but `status` and `code` must be OK and arrays must be present.

- [ ] **Step 4: Browser UAT**

Open:

```text
http://127.0.0.1:5175/dashboard/receivables
```

Login if needed:

```text
账号：demo_admin
密码：S3cure!123
```

Verify visible text:

- `回款看板`
- `计划应收金额`
- `回款状态分布`
- `回款缺口趋势`
- `到账与核销概览`
- `重点关注回款`

Check console error count is `0`.

Save screenshot:

```text
docs/testing/evidence/artifacts/v3-receivable-dashboard-uat-20260704.png
```

- [ ] **Step 5: Update V3 TODO**

In `docs/product/crm-v3-development-todolist.md`:

- Mark module 7 `Done`.
- Mark module 8 `Current`.
- Check Step 23.
- Add Step 24 as completed: `按实现计划实施回款看板`.
- Add Step 25 as pending: `进入风险预警与数据下钻模块设计`.
- Update current task to `v3-risk-warning-design`.
- Add verification commands and screenshot path to previous module snapshot.

- [ ] **Step 6: Commit TODO and evidence**

```bash
git add docs/product/crm-v3-development-todolist.md docs/testing/evidence/artifacts/v3-receivable-dashboard-uat-20260704.png
git commit -m "docs: complete v3 receivable dashboard todo"
```

- [ ] **Step 7: Push**

```bash
git push
```

Expected: branch `codex/v3-management-dashboard` pushed to `github.com:CaniculaW/crmAI.git`.

---

## Self-Review Checklist

- Design coverage:
  - Permission, backend API, OpenAPI, frontend page, tests, UAT, TODO update are covered.
  - Metrics cover planned receivable, confirmed received, unreceived, overdue, pending reconciliation, and unallocated payment.
  - Page sections match design: metrics, status distribution, gap trend, reconciliation summary, attention receivables.
- Placeholder scan:
  - No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency:
  - Backend response property names match frontend types.
  - Endpoint name is consistently `/api/dashboard/receivables`.
  - Permission name is consistently `dashboard.receivables.read`.
  - Migration version is consistently V25.

