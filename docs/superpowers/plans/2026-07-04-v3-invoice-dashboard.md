# V3 Invoice Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V3 invoice dashboard at `/dashboard/invoices` with permissioned backend aggregation, OpenAPI coverage, frontend page, tests, and UAT evidence.

**Architecture:** Add one dashboard permission migration and one focused dashboard aggregation endpoint backed by existing `crm_invoices`, `crm_contracts`, and `crm_accounts`. Reuse the existing `DashboardService` data-permission style and the current React dashboard visual language. The invoice detail workflow remains in `/invoices`; the V3 page only aggregates and links back to it.

**Tech Stack:** Spring Boot 3, JdbcTemplate, Flyway, JUnit, PostgreSQL/H2, React, TypeScript, Ant Design, Vitest, Vite.

---

## File Map

- Create `backend/src/main/resources/db/migration/V24__create_dashboard_invoice_permissions.sql`
  - Seeds `dashboard.invoices.read`.
- Modify `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
  - Expected migration count and dashboard invoice permission assertion.
- Modify `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
  - Expected latest Flyway version and permission assertion.
- Modify `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
  - Add invoice dashboard behavior and permission tests.
- Create backend records under `backend/src/main/java/com/canicula/crmai/dashboard/`
  - `DashboardInvoiceFilter`
  - `DashboardInvoiceResponse`
  - `DashboardInvoiceStatusItem`
  - `DashboardInvoiceGapTrendPoint`
  - `DashboardInvoiceRiskSummary`
  - `DashboardAttentionInvoice`
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
  - Add `GET /api/dashboard/invoices`.
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
  - Add invoice dashboard aggregation, status labels, gap trend, risk summary, and attention invoice ranking.
- Modify `docs/openapi/crm-v1-openapi.yaml`
  - Add `/api/dashboard/invoices`.
- Modify `frontend/src/api/crm.ts`
  - Add invoice dashboard response types and API client.
- Modify `frontend/src/App.tsx`
  - Add dashboard submenu item, route, page component, and rendering helpers.
- Modify `frontend/src/styles.css`
  - Add compact invoice dashboard layout styles.
- Modify `frontend/src/App.test.tsx`
  - Add mocked invoice dashboard data and page assertions.
- Modify `docs/product/crm-v3-development-todolist.md`
  - Track module 6 implementation and completion.
- Create `docs/testing/evidence/artifacts/v3-invoice-dashboard-uat-20260704.png`
  - Browser UAT screenshot evidence.

---

## Task 1: Permission Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V24__create_dashboard_invoice_permissions.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write the failing H2 migration assertion**

In `DatabaseMigrationTest`, update the existing migration count assertion from:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(23);
```

to:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(24);
```

Add this test near the existing dashboard permission tests:

```java
@Test
void createsDashboardInvoicesReadPermission() {
    Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_permissions
            where permission_code = 'dashboard.invoices.read'
              and permission_name = '查看开票看板'
              and module_code = 'dashboard'
            """,
            Integer.class);

    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 2: Write the failing PostgreSQL migration assertion**

In `PostgresMigrationIT`, update the expected version from:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("23");
```

to:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("24");
```

Add this test near the existing dashboard permission tests:

```java
@Test
void createsDashboardInvoicesReadPermission() {
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
            where permission_code = 'dashboard.invoices.read'
              and permission_name = '查看开票看板'
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

Expected: fails because `dashboard.invoices.read` is absent.

- [ ] **Step 4: Add V24 migration**

Create `V24__create_dashboard_invoice_permissions.sql`:

```sql
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.invoices.read', '查看开票看板', 'operation', 'dashboard', 1230
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.invoices.read'
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
git add backend/src/main/resources/db/migration/V24__create_dashboard_invoice_permissions.sql \
  backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java \
  backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java
git commit -m "feat: add dashboard invoice permission"
```

---

## Task 2: Backend Invoice Dashboard API

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceStatusItem.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceGapTrendPoint.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceRiskSummary.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardAttentionInvoice.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`

- [ ] **Step 1: Write failing API behavior test**

In `DashboardControllerTest`, add `"dashboard.invoices.read"` to `allDashboardPermissions()`.

Add this test near the existing dashboard tests:

```java
@Test
void invoicesDashboardReturnsMetricsStatusGapRisksAndAttentionInvoices() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("dashboard-invoice-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "dashboard_invoice_" + suffix,
            departmentId,
            allDashboardPermissions(),
            List.of("global"));
    DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

    try {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/invoices?date_from=2026-07-01&date_to=2026-07-31",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-invoice-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
        assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("planned_invoice_amount");
            assertThat(card.path("label").asText()).isEqualTo("计划开票金额");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
        });
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("invoiced_amount");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
        });
        assertThat(data.path("status_distribution")).anySatisfy(status -> {
            assertThat(status.path("status").asText()).isEqualTo("exception");
            assertThat(status.path("label").asText()).isEqualTo("异常");
            assertThat(status.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
        });
        assertThat(data.path("gap_trend")).anySatisfy(point -> {
            assertThat(point.path("period").asText()).isEqualTo("2026-07");
            assertThat(point.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
            assertThat(point.path("invoiced_amount").decimalValue()).isEqualByComparingTo(BigDecimal.ZERO);
        });
        assertThat(data.path("risk_summary")).anySatisfy(summary -> {
            assertThat(summary.path("key").asText()).isEqualTo("exception");
            assertThat(summary.path("count").asLong()).isEqualTo(1);
            assertThat(summary.path("drilldown_url").asText()).startsWith("/invoices");
        });
        assertThat(data.path("attention_invoices")).anySatisfy(item -> {
            assertThat(item.path("invoice_id").asLong()).isEqualTo(fixture.invoiceId());
            assertThat(item.path("reason").asText()).contains("开票异常");
            assertThat(item.path("drilldown_url").asText()).isEqualTo("/invoices?invoice_id=" + fixture.invoiceId());
        });
    } finally {
        deleteFixture(fixture);
    }
}
```

- [ ] **Step 2: Write failing permission test**

Add this test to `DashboardControllerTest`:

```java
@Test
void invoicesDashboardRequiresDashboardInvoicesReadPermission() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("dashboard-invoice-forbidden-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "dashboard_invoice_forbidden_" + suffix,
            departmentId,
            List.of("dashboard.read", "invoice.read"),
            List.of("global"));

    ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/dashboard/invoices",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders(user.token(), "dashboard-invoice-forbidden-trace-001")),
            JsonNode.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
}
```

- [ ] **Step 3: Run RED API tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest#invoicesDashboardReturnsMetricsStatusGapRisksAndAttentionInvoices,DashboardControllerTest#invoicesDashboardRequiresDashboardInvoicesReadPermission test
```

Expected: fails because `/api/dashboard/invoices` is not implemented. If the sandbox blocks random port binding, rerun with approval outside the sandbox.

- [ ] **Step 4: Add backend records**

Create `DashboardInvoiceFilter.java`:

```java
package com.canicula.crmai.dashboard;

import java.time.LocalDate;

public record DashboardInvoiceFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String invoice_status,
        Boolean exception_only) {
}
```

Create `DashboardInvoiceResponse.java`:

```java
package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardInvoiceResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardInvoiceStatusItem> status_distribution,
        List<DashboardInvoiceGapTrendPoint> gap_trend,
        List<DashboardInvoiceRiskSummary> risk_summary,
        List<DashboardAttentionInvoice> attention_invoices) {
}
```

Create `DashboardInvoiceStatusItem.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardInvoiceStatusItem(
        String status,
        String label,
        long count,
        BigDecimal planned_amount,
        BigDecimal actual_amount,
        String drilldown_url) {
}
```

Create `DashboardInvoiceGapTrendPoint.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardInvoiceGapTrendPoint(
        String period,
        BigDecimal planned_amount,
        BigDecimal invoiced_amount,
        BigDecimal gap_amount,
        long invoice_count) {
}
```

Create `DashboardInvoiceRiskSummary.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardInvoiceRiskSummary(
        String key,
        String label,
        long count,
        BigDecimal amount,
        String drilldown_url) {
}
```

Create `DashboardAttentionInvoice.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardAttentionInvoice(
        Long invoice_id,
        String plan_name,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long owner_user_id,
        String invoice_status,
        BigDecimal planned_amount,
        BigDecimal actual_invoice_amount,
        OffsetDateTime planned_invoice_date,
        OffsetDateTime invoice_date,
        OffsetDateTime signed_at,
        String reason,
        String drilldown_url) {
}
```

- [ ] **Step 5: Add controller endpoint**

In `DashboardController`, add:

```java
@RequirePermission("dashboard.invoices.read")
@GetMapping("/api/dashboard/invoices")
DashboardInvoiceResponse invoices(
        @RequestParam(name = "date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                LocalDate dateFrom,
        @RequestParam(name = "date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                LocalDate dateTo,
        @RequestParam(name = "department_id", required = false) Long departmentId,
        @RequestParam(name = "owner_id", required = false) Long ownerId,
        @RequestParam(name = "account_id", required = false) Long accountId,
        @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
        @RequestParam(name = "contract_id", required = false) Long contractId,
        @RequestParam(name = "invoice_status", required = false) String invoiceStatus,
        @RequestParam(name = "exception_only", required = false) Boolean exceptionOnly,
        HttpServletRequest httpRequest) {
    return dashboardService.invoices(
            currentUserId(httpRequest),
            new DashboardInvoiceFilter(
                    dateFrom,
                    dateTo,
                    departmentId,
                    ownerId,
                    accountId,
                    opportunityId,
                    contractId,
                    invoiceStatus,
                    exceptionOnly));
}
```

- [ ] **Step 6: Add service aggregation**

In `DashboardService`, add `invoices(Long userId, DashboardInvoiceFilter requestedFilter)` using:

```java
DashboardInvoiceFilter filter = normalizeInvoiceFilter(requestedFilter);
DomainAccess invoice = access(userId, "invoice", "invoice.read", INVOICE_COLUMNS);
List<InvoiceDashboardRow> invoices = invoiceRows(filter, invoice);
return new DashboardInvoiceResponse(
        invoiceFilterMap(filter),
        invoiceMetricCards(filter, invoices),
        invoiceStatusDistribution(filter, invoices),
        invoiceGapTrend(invoices),
        invoiceRiskSummary(filter, invoices),
        attentionInvoices(invoices));
```

Implementation rules:

- Use current-quarter defaults, matching funnel and contract dashboards.
- Query `crm_invoices i join crm_accounts a on a.id = i.account_id and a.deleted_at is null`.
- Filter by `i.planned_invoice_date` using `appendTimestampFilter`.
- Apply data permission with existing `INVOICE_COLUMNS`.
- Amount helpers:
  - `effectiveActualAmount = actual_invoice_amount` only for statuses `invoiced` and `signed`; otherwise `0`.
  - `gap = max(planned_amount - effectiveActualAmount, 0)`.
  - `exception` amount uses `planned_amount`.
- Attention reason order:
  - `invoice_status = 'exception'` -> `开票异常`
  - planned date before now and status not in `invoiced/signed/voided` -> `逾期未开`
  - status `invoiced` and `signed_at is null` and invoice date earlier than now minus 7 days -> `已开未签收`
  - remaining high amount -> `大金额待开票`

- [ ] **Step 7: Run GREEN API tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest#invoicesDashboardReturnsMetricsStatusGapRisksAndAttentionInvoices,DashboardControllerTest#invoicesDashboardRequiresDashboardInvoicesReadPermission test
cd backend && mvn -Dtest=DashboardControllerTest test
```

Expected: both commands pass. If random port binding is blocked, rerun with approval outside the sandbox.

- [ ] **Step 8: Commit**

```bash
git add backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceFilter.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceResponse.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceStatusItem.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceGapTrendPoint.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardInvoiceRiskSummary.java \
  backend/src/main/java/com/canicula/crmai/dashboard/DashboardAttentionInvoice.java
git commit -m "feat: add v3 invoice dashboard api"
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

Expected: fails because `get /api/dashboard/invoices` is missing.

- [ ] **Step 2: Add `/api/dashboard/invoices` path**

Add this path next to existing dashboard paths:

```yaml
  /api/dashboard/invoices:
    get:
      tags: [Dashboard]
      summary: V3 invoice execution dashboard
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
        - name: invoice_status
          in: query
          schema:
            type: string
        - name: exception_only
          in: query
          schema:
            type: boolean
      responses:
        '200':
          description: Invoice metrics, status distribution, gap trend, risks, and attention invoices.
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
git commit -m "docs: document v3 invoice dashboard api"
```

---

## Task 4: Frontend Invoice Dashboard Page

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add frontend API types and client**

In `frontend/src/api/crm.ts`, add:

```ts
export type DashboardInvoiceStatusItem = {
  status: string;
  label: string;
  count: number;
  planned_amount: number;
  actual_amount: number;
  drilldown_url: string;
};

export type DashboardInvoiceGapTrendPoint = {
  period: string;
  planned_amount: number;
  invoiced_amount: number;
  gap_amount: number;
  invoice_count: number;
};

export type DashboardInvoiceRiskSummary = {
  key: string;
  label: string;
  count: number;
  amount: number;
  drilldown_url: string;
};

export type DashboardAttentionInvoice = {
  invoice_id: number;
  plan_name: string;
  account_id?: number;
  opportunity_id?: number;
  contract_id?: number;
  owner_user_id?: number;
  invoice_status: string;
  planned_amount: number;
  actual_invoice_amount?: number;
  planned_invoice_date?: string;
  invoice_date?: string;
  signed_at?: string;
  reason: string;
  drilldown_url: string;
};

export type DashboardInvoices = {
  filters: Record<string, unknown>;
  metric_cards: DashboardMetricCard[];
  status_distribution: DashboardInvoiceStatusItem[];
  gap_trend: DashboardInvoiceGapTrendPoint[];
  risk_summary: DashboardInvoiceRiskSummary[];
  attention_invoices: DashboardAttentionInvoice[];
};
```

Add:

```ts
invoices: (query?: QueryParams) => requestJson<DashboardInvoices>(withQuery("/api/dashboard/invoices", query))
```

under `crmApi.dashboard`.

- [ ] **Step 2: Add failing frontend page test**

In `frontend/src/App.test.tsx`:

Add `"dashboard.invoices.read"` to the mock user permissions.

Add `dashboardInvoices` fixture:

```ts
dashboardInvoices: {
  filters: {},
  metric_cards: [
    { key: "planned_invoice_amount", label: "计划开票金额", value: 800000, unit: "CNY", drilldown_url: "/invoices" },
    { key: "invoiced_amount", label: "实际开票金额", value: 360000, unit: "CNY", drilldown_url: "/invoices?invoice_status=invoiced" },
    { key: "invoice_gap_amount", label: "待开票缺口", value: 440000, unit: "CNY", drilldown_url: "/invoices?invoice_gap=true" },
    { key: "exception_count", label: "异常开票数", value: 1, unit: "count", drilldown_url: "/invoices?exception_only=true" }
  ],
  status_distribution: [
    { status: "invoiced", label: "已开票", count: 1, planned_amount: 360000, actual_amount: 360000, drilldown_url: "/invoices?invoice_status=invoiced" },
    { status: "exception", label: "异常", count: 1, planned_amount: 120000, actual_amount: 0, drilldown_url: "/invoices?exception_only=true" }
  ],
  gap_trend: [
    { period: "2026-07", planned_amount: 800000, invoiced_amount: 360000, gap_amount: 440000, invoice_count: 2 }
  ],
  risk_summary: [
    { key: "exception", label: "异常开票", count: 1, amount: 120000, drilldown_url: "/invoices?exception_only=true" }
  ],
  attention_invoices: [
    {
      invoice_id: 401,
      plan_name: "V3 首期开票",
      account_id: 1,
      opportunity_id: 10,
      contract_id: 301,
      owner_user_id: 1001,
      invoice_status: "exception",
      planned_amount: 120000,
      actual_invoice_amount: 0,
      planned_invoice_date: "2026-07-12T10:00:00+08:00",
      reason: "开票异常",
      drilldown_url: "/invoices?invoice_id=401"
    }
  ]
}
```

Add mock route:

```ts
if (path.endsWith("/api/dashboard/invoices")) {
  return jsonResponse({ code: "OK", data: data.dashboardInvoices });
}
```

Add test:

```ts
it("renders the V3 invoice dashboard page", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/dashboard/invoices");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "开票看板" })).toBeInTheDocument();
  expect(screen.getByText("计划开票金额")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "开票状态分布" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "开票缺口趋势" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "签收与异常概览" })).toBeInTheDocument();
  expect(screen.getByText("V3 首期开票")).toBeInTheDocument();
  expect(screen.getByText("开票异常")).toBeInTheDocument();
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/invoices"), expect.anything());
  });
});
```

- [ ] **Step 3: Run RED frontend test**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 invoice dashboard page"
```

Expected: fails because the page route is not implemented.

- [ ] **Step 4: Add menu, route, page, and helpers**

In `App.tsx`:

- Import new dashboard invoice types.
- Add submenu:

```ts
{ key: "/dashboard/invoices", label: "开票看板", permission: "dashboard.invoices.read" }
```

- Add route:

```tsx
<Route path="/dashboard/invoices" element={<DashboardInvoicesPage />} />
```

- Add `DashboardInvoicesPage`, `DashboardInvoiceStatusRow`, `DashboardInvoiceGapTrendRow`, `DashboardInvoiceRiskRow`, `DashboardAttentionInvoiceRow`, and `emptyDashboardInvoices()`.

The page structure should match:

```tsx
<section className="workspace dashboard-overview dashboard-invoices">
  <PageTitle title="开票看板" description="查看计划开票、实际开票、缺口、签收与异常风险。" />
  <div className="dashboard-overview__metrics">...</div>
  <div className="dashboard-funnel__layout">
    <Card title="开票状态分布">...</Card>
    <Card title="开票缺口趋势">...</Card>
  </div>
  <div className="dashboard-funnel__layout">
    <Card title="签收与异常概览">...</Card>
    <Card title="重点关注开票">...</Card>
  </div>
</section>
```

- [ ] **Step 5: Add CSS**

In `styles.css`, add `dashboard-invoices__*` selectors by reusing the contract dashboard layout:

```css
.dashboard-invoices__status-list,
.dashboard-invoices__gap-trend,
.dashboard-invoices__risk-list {
  display: grid;
  gap: 10px;
}

.dashboard-invoices__status-row,
.dashboard-invoices__risk-row {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e6eaf2;
  border-radius: 8px;
  color: #172033;
  background: #f8fafd;
}
```

- [ ] **Step 6: Run GREEN frontend tests and build**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 invoice dashboard page"
cd frontend && npm test -- --run src/App.test.tsx
cd frontend && npm run build
```

Expected: all pass. Existing jsdom `getComputedStyle` warnings may appear; they are not failures if Vitest exits 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/styles.css frontend/src/App.test.tsx
git commit -m "feat: add v3 invoice dashboard page"
```

---

## Task 5: Verification, UAT, TODO, Push

**Files:**
- Modify: `docs/product/crm-v3-development-todolist.md`
- Create: `docs/testing/evidence/artifacts/v3-invoice-dashboard-uat-20260704.png`

- [ ] **Step 1: Run backend verification**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest,DashboardControllerTest,OpenApiContractCoverageTest test
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: all pass. If Docker or random port binding is blocked by sandboxing, rerun with approval outside the sandbox.

- [ ] **Step 2: Ensure local backend/frontend are current**

Check:

```bash
lsof -nP -iTCP:5175 -sTCP:LISTEN
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

If backend is running old code, stop the old PID and start:

```bash
cd backend && SERVER_PORT=8081 CRM_DB_URL=jdbc:postgresql://localhost:55432/crm_ai CRM_DB_USERNAME=crm_ai CRM_DB_PASSWORD=crm_ai CRM_SEED_V1_DEMO_ENABLED=true mvn spring-boot:run
```

Keep frontend at `http://127.0.0.1:5175/`.

- [ ] **Step 3: API smoke**

Run a login plus invoice dashboard request:

```bash
node -e "fetch('http://127.0.0.1:8081/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Trace-Id':'v3-invoice-uat-login'},body:JSON.stringify({username:'demo_admin',password:'S3cure!123'})}).then(r=>r.json()).then(async login=>{const token=login.data.access_token; const res=await fetch('http://127.0.0.1:8081/api/dashboard/invoices?date_from=2026-07-01&date_to=2026-09-30',{headers:{Authorization:'Bearer '+token,'X-Trace-Id':'v3-invoice-uat-invoices'}}); const body=await res.json(); console.log(JSON.stringify({loginCode:login.code,status:res.status,apiCode:body.code,metrics:body.data?.metric_cards?.map(m=>m.key),statuses:body.data?.status_distribution?.length,risks:body.data?.risk_summary?.length,attention:body.data?.attention_invoices?.length}, null, 2));})"
```

Expected:

```json
{
  "loginCode": "OK",
  "status": 200,
  "apiCode": "OK"
}
```

- [ ] **Step 4: Browser UAT**

Open:

```text
http://127.0.0.1:5175/dashboard/invoices
```

Validate:

- Page title `开票看板` appears.
- `计划开票金额` appears.
- `开票状态分布` appears.
- `开票缺口趋势` appears.
- `签收与异常概览` appears.
- `重点关注开票` appears.
- No `服务端异常` or app error banner.
- Browser console error count is 0.

Save screenshot:

```text
docs/testing/evidence/artifacts/v3-invoice-dashboard-uat-20260704.png
```

- [ ] **Step 5: Update TODO**

In `docs/product/crm-v3-development-todolist.md`:

- Mark module 6 `开票看板` as `Done`.
- Mark module 7 `回款看板` as `Current`.
- Mark Step 22 `按实现计划实施开票看板` as complete.
- Add Step 23 `进入回款看板模块设计与实现计划`.
- Record validation commands and UAT evidence.

- [ ] **Step 6: Commit TODO and evidence**

```bash
git add docs/product/crm-v3-development-todolist.md docs/testing/evidence/artifacts/v3-invoice-dashboard-uat-20260704.png
git commit -m "docs: complete v3 invoice dashboard todo"
```

- [ ] **Step 7: Push**

Run:

```bash
git push
```

Expected: `codex/v3-management-dashboard` pushed to `CaniculaW/crmAI.git`.
