# V3 Contract Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V3 contract dashboard at `/dashboard/contracts` with permissioned backend aggregation, OpenAPI coverage, frontend page, tests, and UAT evidence.

**Architecture:** Add one dashboard permission migration and one focused dashboard aggregation endpoint backed by existing `crm_contracts`, `crm_contract_milestones`, and `crm_contract_changes`. Reuse the existing `DashboardService` data-permission style and the current React dashboard visual language. The contract detail workflow remains in `/contracts`; the V3 page only aggregates and links back to it.

**Tech Stack:** Spring Boot 3, JdbcTemplate, Flyway, JUnit, PostgreSQL/H2, React, TypeScript, Ant Design, Vitest, Vite.

---

## File Map

- Create `backend/src/main/resources/db/migration/V23__create_dashboard_contract_permissions.sql`
  - Seeds `dashboard.contracts.read`.
- Modify `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
  - Expected migration count and dashboard contract permission assertion.
- Modify `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
  - Expected latest Flyway version and permission assertion.
- Modify `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
  - Add contract dashboard behavior and permission tests.
- Create backend records under `backend/src/main/java/com/canicula/crmai/dashboard/`
  - `DashboardContractFilter`
  - `DashboardContractResponse`
  - `DashboardContractStatusItem`
  - `DashboardContractMilestoneSummary`
  - `DashboardContractChangeTrendPoint`
  - `DashboardAttentionContract`
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
  - Add `GET /api/dashboard/contracts`.
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
  - Add contract dashboard aggregation, status labels, milestone buckets, change-trend helpers, and attention-contract ranking.
- Modify `docs/openapi/crm-v1-openapi.yaml`
  - Add `/api/dashboard/contracts`.
- Modify `frontend/src/api/crm.ts`
  - Add contract dashboard response types and API client.
- Modify `frontend/src/App.tsx`
  - Add dashboard submenu item, route, page component, and rendering helpers.
- Modify `frontend/src/styles.css`
  - Add compact contract dashboard layout styles.
- Modify `frontend/src/App.test.tsx`
  - Add mocked contract dashboard data and page assertions.
- Modify `docs/product/crm-v3-development-todolist.md`
  - Track module 5 implementation and completion.
- Create `docs/testing/evidence/artifacts/v3-contract-dashboard-uat-20260703.png`
  - Browser UAT screenshot evidence.

---

## Task 1: Permission Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V23__create_dashboard_contract_permissions.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write the failing H2 migration assertion**

In `DatabaseMigrationTest`, update the existing migration count assertion from:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(22);
```

to:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(23);
```

Add this test near the existing dashboard permission tests:

```java
@Test
void createsDashboardContractsReadPermission() {
    Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_permissions
            where permission_code = 'dashboard.contracts.read'
              and permission_name = '查看合同看板'
              and module_code = 'dashboard'
            """,
            Integer.class);

    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 2: Write the failing PostgreSQL migration assertion**

In `PostgresMigrationIT`, update the expected version from:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("22");
```

to:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("23");
```

Add this test near the existing dashboard permission tests:

```java
@Test
void createsDashboardContractsReadPermission() {
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
            where permission_code = 'dashboard.contracts.read'
              and permission_name = '查看合同看板'
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

Expected: fails because `dashboard.contracts.read` is absent.

- [ ] **Step 4: Add V23 migration**

Create `V23__create_dashboard_contract_permissions.sql`:

```sql
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.contracts.read', '查看合同看板', 'operation', 'dashboard', 1220
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.contracts.read'
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
git add backend/src/main/resources/db/migration/V23__create_dashboard_contract_permissions.sql \
  backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java \
  backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java
git commit -m "feat: add dashboard contract permission"
```

---

## Task 2: Backend Contract Dashboard API

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardContractFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardContractResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardContractStatusItem.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardContractMilestoneSummary.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardContractChangeTrendPoint.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardAttentionContract.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`

- [ ] **Step 1: Write failing API behavior test**

Add this test to `DashboardControllerTest` near the existing dashboard tests:

```java
@Test
void contractsDashboardReturnsMetricsStatusMilestonesChangesAndAttentionContracts() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("dashboard-contract-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "dashboard_contract_" + suffix,
            departmentId,
            allDashboardPermissions(),
            List.of("global"));
    DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

    try {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/contracts?date_from=2026-07-01&date_to=2026-07-31",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-contract-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
        assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("contract_amount");
            assertThat(card.path("label").asText()).isEqualTo("合同总额");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(500000));
        });
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("overdue_milestone_count");
            assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.ONE);
        });
        assertThat(data.path("status_distribution")).anySatisfy(status -> {
            assertThat(status.path("status").asText()).isEqualTo("performing");
            assertThat(status.path("label").asText()).isEqualTo("执行中");
            assertThat(status.path("amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(500000));
        });
        assertThat(data.path("milestone_summary")).anySatisfy(summary -> {
            assertThat(summary.path("key").asText()).isEqualTo("overdue");
            assertThat(summary.path("count").asLong()).isEqualTo(1);
            assertThat(summary.path("drilldown_url").asText()).startsWith("/contracts");
        });
        assertThat(data.path("change_trend")).isArray();
        assertThat(data.path("attention_contracts")).anySatisfy(item -> {
            assertThat(item.path("contract_id").asLong()).isEqualTo(fixture.contractId());
            assertThat(item.path("attention_reason").asText()).contains("节点逾期");
            assertThat(item.path("drilldown_url").asText()).isEqualTo("/contracts?contract_id=" + fixture.contractId());
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
void contractsDashboardRequiresDashboardContractsReadPermission() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("dashboard-contract-forbidden-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "dashboard_contract_forbidden_" + suffix,
            departmentId,
            List.of("dashboard.read", "contract.read"),
            List.of("global"));

    ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/dashboard/contracts",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders(user.token(), "dashboard-contract-forbidden-trace-001")),
            JsonNode.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
}
```

Add `dashboard.contracts.read` to `allDashboardPermissions()`:

```java
private List<String> allDashboardPermissions() {
    return List.of(
            "dashboard.read",
            "dashboard.funnel.read",
            "dashboard.contracts.read",
            "opportunity.read",
            "contract.read",
            "invoice.read",
            "receivable.read",
            "payment.read",
            "reconciliation.read");
}
```

- [ ] **Step 3: Run RED API tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest#contractsDashboardReturnsMetricsStatusMilestonesChangesAndAttentionContracts,DashboardControllerTest#contractsDashboardRequiresDashboardContractsReadPermission test
```

Expected: fails because `/api/dashboard/contracts` is not implemented.

- [ ] **Step 4: Add response records**

Create `DashboardContractFilter.java`:

```java
package com.canicula.crmai.dashboard;

import java.time.LocalDate;

public record DashboardContractFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        Long opportunity_id,
        String contract_status,
        String risk_level) {
}
```

Create `DashboardContractResponse.java`:

```java
package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardContractResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardContractStatusItem> status_distribution,
        List<DashboardContractMilestoneSummary> milestone_summary,
        List<DashboardContractChangeTrendPoint> change_trend,
        List<DashboardAttentionContract> attention_contracts) {
}
```

Create `DashboardContractStatusItem.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardContractStatusItem(
        String status,
        String label,
        long count,
        BigDecimal amount,
        long risk_count,
        String drilldown_url) {
}
```

Create `DashboardContractMilestoneSummary.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardContractMilestoneSummary(
        String key,
        String label,
        long count,
        long contract_count,
        BigDecimal amount,
        String drilldown_url) {
}
```

Create `DashboardContractChangeTrendPoint.java`:

```java
package com.canicula.crmai.dashboard;

public record DashboardContractChangeTrendPoint(
        String period,
        long change_count,
        long amount_change_count,
        long terms_change_count,
        long scope_change_count,
        long risk_change_count) {
}
```

Create `DashboardAttentionContract.java`:

```java
package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardAttentionContract(
        Long contract_id,
        String contract_name,
        Long account_id,
        Long opportunity_id,
        String contract_status,
        String risk_level,
        BigDecimal contract_amount,
        String next_milestone_name,
        OffsetDateTime next_milestone_planned_at,
        String attention_reason,
        String drilldown_url) {
}
```

- [ ] **Step 5: Add controller endpoint**

In `DashboardController`, add:

```java
@RequirePermission("dashboard.contracts.read")
@GetMapping("/api/dashboard/contracts")
DashboardContractResponse contracts(
        @RequestParam(name = "date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                LocalDate dateFrom,
        @RequestParam(name = "date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                LocalDate dateTo,
        @RequestParam(name = "department_id", required = false) Long departmentId,
        @RequestParam(name = "owner_id", required = false) Long ownerId,
        @RequestParam(name = "account_id", required = false) Long accountId,
        @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
        @RequestParam(name = "contract_status", required = false) String contractStatus,
        @RequestParam(name = "risk_level", required = false) String riskLevel,
        HttpServletRequest httpRequest) {
    return dashboardService.contracts(
            currentUserId(httpRequest),
            new DashboardContractFilter(
                    dateFrom,
                    dateTo,
                    departmentId,
                    ownerId,
                    accountId,
                    opportunityId,
                    contractStatus,
                    riskLevel));
}
```

- [ ] **Step 6: Add minimal service implementation**

In `DashboardService`, implement:

```java
public DashboardContractResponse contracts(Long userId, DashboardContractFilter requestedFilter) {
    DashboardContractFilter filter = normalizeContractFilter(requestedFilter);
    DomainAccess contract = access(userId, "contract", "contract.read", CONTRACT_COLUMNS);
    List<ContractDashboardRow> contracts = contractDashboardRows(filter, contract);
    List<MilestoneDashboardRow> milestones = milestoneDashboardRows(filter, contract);
    List<ChangeDashboardRow> changes = changeDashboardRows(filter, contract);
    return new DashboardContractResponse(
            contractFilterMap(filter),
            contractMetricCards(filter, contracts, milestones),
            contractStatusDistribution(filter, contracts),
            contractMilestoneSummary(filter, milestones),
            contractChangeTrend(changes),
            attentionContracts(contracts, milestones));
}
```

Add helpers with these exact responsibilities:

```java
private DashboardContractFilter normalizeContractFilter(DashboardContractFilter filter) {
    LocalDate today = LocalDate.now();
    int quarterStartMonth = ((today.getMonthValue() - 1) / 3) * 3 + 1;
    LocalDate defaultFrom = LocalDate.of(today.getYear(), quarterStartMonth, 1);
    LocalDate defaultTo = defaultFrom.plusMonths(3).minusDays(1);
    return new DashboardContractFilter(
            filter.date_from() == null ? defaultFrom : filter.date_from(),
            filter.date_to() == null ? defaultTo : filter.date_to(),
            filter.department_id(),
            filter.owner_id(),
            filter.account_id(),
            filter.opportunity_id(),
            filter.contract_status(),
            filter.risk_level());
}
```

Use `coalesce(c.signed_at, c.created_at)` for the date filter. For H2/PostgreSQL compatibility, aggregate rows in Java after querying visible rows. The row query must join `crm_accounts a` because `CONTRACT_COLUMNS` uses `a.owner_department_id`:

```sql
select c.id, c.contract_name, c.account_id, c.opportunity_id, c.contract_status,
       c.contract_amount, c.owner_user_id, c.risk_level,
       coalesce(c.signed_at, c.created_at) as signed_at
from crm_contracts c
join crm_accounts a on a.id = c.account_id and a.deleted_at is null
where c.deleted_at is null
  and %s
  and coalesce(c.signed_at, c.created_at) >= ?
  and coalesce(c.signed_at, c.created_at) < ?
```

Milestone query:

```sql
select m.id, m.contract_id, m.milestone_name, m.status, m.planned_at,
       c.contract_name, c.account_id, c.opportunity_id, c.contract_status,
       c.contract_amount, c.owner_user_id, c.risk_level
from crm_contract_milestones m
join crm_contracts c on c.id = m.contract_id and c.deleted_at is null
join crm_accounts a on a.id = c.account_id and a.deleted_at is null
where m.deleted_at is null
  and %s
```

Change query:

```sql
select ch.id, ch.contract_id, ch.change_type, ch.changed_at
from crm_contract_changes ch
join crm_contracts c on c.id = ch.contract_id and c.deleted_at is null
join crm_accounts a on a.id = c.account_id and a.deleted_at is null
where %s
  and ch.changed_at >= ?
  and ch.changed_at < ?
```

Metric keys and labels:

```java
"contract_amount", "合同总额"
"performing_amount", "执行中合同额"
"terminated_amount", "已终止合同额"
"high_risk_count", "高风险合同"
"overdue_milestone_count", "逾期节点"
"due_soon_milestone_count", "30天到期节点"
```

Attention reason priority:

```java
if (hasOverdueMilestone(contractId)) return "节点逾期";
if (isHighRisk(riskLevel)) return "高风险合同";
if (hasRecentCriticalChange(contractId)) return "近期关键变更";
return "临近履约节点";
```

- [ ] **Step 7: Run GREEN API tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest test
```

Expected: all dashboard controller tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/canicula/crmai/dashboard \
  backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java
git commit -m "feat: add dashboard contract api"
```

---

## Task 3: OpenAPI Contract

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Test: `backend/src/test/java/com/canicula/crmai/api/OpenApiContractCoverageTest.java`

- [ ] **Step 1: Run RED OpenAPI test**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: fails with missing `get /api/dashboard/contracts`.

- [ ] **Step 2: Add OpenAPI path**

Add under `paths` near other dashboard paths:

```yaml
  /api/dashboard/contracts:
    get:
      tags: [Dashboard]
      summary: V3 contract dashboard
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
        - name: contract_status
          in: query
          schema:
            type: string
        - name: risk_level
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Contract metrics, status distribution, milestones, change trend, and attention contracts.
```

- [ ] **Step 3: Run GREEN OpenAPI test**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: test passes.

- [ ] **Step 4: Commit**

```bash
git add docs/openapi/crm-v1-openapi.yaml
git commit -m "docs: document dashboard contract api"
```

---

## Task 4: Frontend Contract Dashboard

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing frontend test**

In `App.test.tsx`, add `dashboard.contracts.read` to the mocked user permission list.

Add mocked API data:

```ts
dashboardContracts: {
  filters: {},
  metric_cards: [
    { key: "contract_amount", label: "合同总额", value: 500000, unit: "CNY", drilldown_url: "/contracts" },
    { key: "performing_amount", label: "执行中合同额", value: 500000, unit: "CNY", drilldown_url: "/contracts?contract_status=performing" },
    { key: "overdue_milestone_count", label: "逾期节点", value: 1, unit: "count", drilldown_url: "/contracts?milestone_status=overdue" }
  ],
  status_distribution: [
    { status: "performing", label: "执行中", count: 1, amount: 500000, risk_count: 1, drilldown_url: "/contracts?contract_status=performing" }
  ],
  milestone_summary: [
    { key: "overdue", label: "逾期节点", count: 1, contract_count: 1, amount: 500000, drilldown_url: "/contracts?milestone_status=overdue" }
  ],
  change_trend: [
    { period: "2026-07", change_count: 2, amount_change_count: 1, terms_change_count: 0, scope_change_count: 0, risk_change_count: 1 }
  ],
  attention_contracts: [
    {
      contract_id: 301,
      contract_name: "V3 合同看板测试合同",
      account_id: 1,
      opportunity_id: 10,
      contract_status: "performing",
      risk_level: "high",
      contract_amount: 500000,
      next_milestone_name: "上线验收",
      next_milestone_planned_at: "2026-07-02T00:00:00+08:00",
      attention_reason: "节点逾期",
      drilldown_url: "/contracts?contract_id=301"
    }
  ]
}
```

Add route handler in `mockCrmFetch`:

```ts
if (path.endsWith("/api/dashboard/contracts")) {
  return jsonResponse({ code: "OK", data: data.dashboardContracts });
}
```

Add test:

```ts
it("renders the V3 contract dashboard page", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/dashboard/contracts");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "合同看板" })).toBeInTheDocument();
  expect(screen.getByText("合同总额")).toBeInTheDocument();
  expect(screen.getByText("执行中")).toBeInTheDocument();
  expect(screen.getByText("逾期节点")).toBeInTheDocument();
  expect(screen.getByText("2026-07")).toBeInTheDocument();
  expect(screen.getByText("V3 合同看板测试合同")).toBeInTheDocument();
  expect(screen.getByText("节点逾期")).toBeInTheDocument();
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/contracts"), expect.anything());
  });
});
```

- [ ] **Step 2: Run RED frontend test**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 contract dashboard page"
```

Expected: fails because `/dashboard/contracts` route does not exist.

- [ ] **Step 3: Add API types and client**

In `frontend/src/api/crm.ts`, add:

```ts
export type DashboardContractStatusItem = {
  status: string;
  label: string;
  count: number;
  amount: number;
  risk_count: number;
  drilldown_url: string;
};

export type DashboardContractMilestoneSummary = {
  key: string;
  label: string;
  count: number;
  contract_count: number;
  amount: number;
  drilldown_url: string;
};

export type DashboardContractChangeTrendPoint = {
  period: string;
  change_count: number;
  amount_change_count: number;
  terms_change_count: number;
  scope_change_count: number;
  risk_change_count: number;
};

export type DashboardAttentionContract = {
  contract_id: number;
  contract_name: string;
  account_id?: number;
  opportunity_id?: number;
  contract_status: string;
  risk_level?: string;
  contract_amount: number;
  next_milestone_name?: string;
  next_milestone_planned_at?: string;
  attention_reason: string;
  drilldown_url: string;
};

export type DashboardContracts = {
  filters: Record<string, unknown>;
  metric_cards: DashboardMetricCard[];
  status_distribution: DashboardContractStatusItem[];
  milestone_summary: DashboardContractMilestoneSummary[];
  change_trend: DashboardContractChangeTrendPoint[];
  attention_contracts: DashboardAttentionContract[];
};
```

Extend `crmApi.dashboard`:

```ts
contracts: (query?: QueryParams) => requestJson<DashboardContracts>(withQuery("/api/dashboard/contracts", query))
```

- [ ] **Step 4: Add route and page**

In `App.tsx`, import the new types and add a dashboard child menu item:

```ts
{ key: "/dashboard/contracts", label: "合同看板", permission: "dashboard.contracts.read" }
```

Add route:

```tsx
<Route path="/dashboard/contracts" element={<DashboardContractsPage />} />
```

Add page component:

```tsx
function DashboardContractsPage() {
  const { data, loading, error, refresh } = useObjectResource<DashboardContracts>(
    crmApi.dashboard.contracts,
    emptyDashboardContracts,
    []
  );

  return (
    <section className="workspace dashboard-overview dashboard-contracts">
      <PageTitle
        title="合同看板"
        description="查看合同资产、状态分布、履约节点、变更趋势与重点合同。"
        action={<RefreshButton onClick={refresh} loading={loading} />}
      />
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="dashboard-overview__metrics">
        {data.metric_cards.map((metric) => (
          <DashboardMetricCardView key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="dashboard-contracts__layout">
        <Card title={<Typography.Title level={3}>状态分布</Typography.Title>} className="dashboard-overview__card">
          <div className="dashboard-contracts__list">
            {data.status_distribution.map((item) => (
              <DashboardContractStatusRow key={item.status} item={item} />
            ))}
            {data.status_distribution.length === 0 ? <span className="muted">暂无合同状态数据</span> : null}
          </div>
        </Card>

        <Card title={<Typography.Title level={3}>履约节点</Typography.Title>} className="dashboard-overview__card">
          <div className="dashboard-contracts__list">
            {data.milestone_summary.map((item) => (
              <DashboardContractMilestoneRow key={item.key} item={item} />
            ))}
            {data.milestone_summary.length === 0 ? <span className="muted">暂无合同节点数据</span> : null}
          </div>
        </Card>
      </div>

      <div className="dashboard-contracts__layout">
        <Card title={<Typography.Title level={3}>变更趋势</Typography.Title>} className="dashboard-overview__card">
          <div className="dashboard-contracts__list">
            {data.change_trend.map((point) => (
              <DashboardContractChangeTrendRow key={point.period} point={point} />
            ))}
            {data.change_trend.length === 0 ? <span className="muted">暂无合同变更</span> : null}
          </div>
        </Card>

        <Card title={<Typography.Title level={3}>重点关注合同</Typography.Title>} className="dashboard-overview__card">
          <div className="dashboard-contracts__list">
            {data.attention_contracts.map((contract) => (
              <DashboardAttentionContractRow key={contract.contract_id} contract={contract} />
            ))}
            {data.attention_contracts.length === 0 ? <span className="muted">暂无需要重点关注的合同</span> : null}
          </div>
        </Card>
      </div>
    </section>
  );
}
```

Add helper rows using the same card-row style as funnel:

```tsx
function DashboardContractStatusRow({ item }: { item: DashboardContractStatusItem }) {
  return (
    <Link className="dashboard-contracts__row" to={item.drilldown_url}>
      <span>
        <strong>{item.label}</strong>
        <small>{item.count} 份</small>
      </span>
      <small>{currencyText(item.amount)}{item.risk_count > 0 ? ` · ${item.risk_count} 个风险` : ""}</small>
    </Link>
  );
}
```

Use the same pattern for milestone, change trend, and attention contract rows.

Add empty factory:

```ts
function emptyDashboardContracts(): DashboardContracts {
  return {
    filters: {},
    metric_cards: [],
    status_distribution: [],
    milestone_summary: [],
    change_trend: [],
    attention_contracts: []
  };
}
```

- [ ] **Step 5: Add CSS**

In `frontend/src/styles.css`, add:

```css
.dashboard-contracts__layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-contracts__list {
  display: grid;
  gap: 10px;
}

.dashboard-contracts__row {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e6eaf2;
  border-radius: 8px;
  color: #172033;
  background: #f8fafd;
}

.dashboard-contracts__row:hover {
  border-color: #1f5eff;
  color: #1f5eff;
}

.dashboard-contracts__row span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dashboard-contracts__row strong {
  min-width: 0;
  word-break: break-word;
}

.dashboard-contracts__row small {
  color: #667085;
}
```

In the mobile media query, add `.dashboard-contracts__layout` to the one-column grid list.

- [ ] **Step 6: Run GREEN frontend tests and build**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 contract dashboard page"
cd frontend && npm test -- --run
cd frontend && npm run build
```

Expected: all pass. The build may retain the existing Ant Design chunk-size warning.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/styles.css frontend/src/App.test.tsx
git commit -m "feat: add v3 contract dashboard page"
```

---

## Task 5: Validation, UAT, TODO Update, Push

**Files:**
- Modify: `docs/product/crm-v3-development-todolist.md`
- Create: `docs/testing/evidence/artifacts/v3-contract-dashboard-uat-20260703.png`

- [ ] **Step 1: Run backend regression**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest,DashboardControllerTest,OpenApiContractCoverageTest test
```

Expected: all tests pass.

- [ ] **Step 2: Run PostgreSQL migration integration**

Run:

```bash
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: tests pass and Flyway latest version is `23`.

- [ ] **Step 3: Run frontend regression**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```

Expected: all tests pass and build succeeds.

- [ ] **Step 4: Restart local backend if needed**

If port `8081` is running stale backend code:

```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
kill <pid>
cd backend && SERVER_PORT=8081 CRM_DB_URL=jdbc:postgresql://localhost:55432/crm_ai CRM_DB_USERNAME=crm_ai CRM_DB_PASSWORD=crm_ai CRM_SEED_V1_DEMO_ENABLED=true mvn spring-boot:run
```

Expected: backend starts with Flyway version `23`.

- [ ] **Step 5: Run API smoke**

Run:

```bash
node -e "fetch('http://127.0.0.1:8081/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Trace-Id':'v3-contract-uat-login'},body:JSON.stringify({username:'demo_admin',password:'S3cure!123'})}).then(r=>r.json()).then(async login=>{const token=login.data?.access_token; const res=await fetch('http://127.0.0.1:8081/api/dashboard/contracts',{headers:{Authorization:'Bearer '+token,'X-Trace-Id':'v3-contract-uat-api'}}); const body=await res.json(); console.log(JSON.stringify({loginCode:login.code,status:res.status,code:body.code,metrics:body.data?.metric_cards?.map(m=>m.key),statusDistribution:body.data?.status_distribution?.length,milestones:body.data?.milestone_summary?.length,attention:body.data?.attention_contracts?.length},null,2));})"
```

Expected: login code `OK`, HTTP status `200`, response code `OK`, and non-null arrays.

- [ ] **Step 6: Browser UAT**

Open:

```text
http://127.0.0.1:5175/dashboard/contracts
```

Verify:

- Page title is `合同看板`.
- Metric cards render.
- Status distribution renders.
- Milestone summary renders.
- Change trend renders or shows empty state.
- Attention contracts render or shows empty state.
- Browser console application error count is `0`.

Save screenshot:

```text
docs/testing/evidence/artifacts/v3-contract-dashboard-uat-20260703.png
```

- [ ] **Step 7: Update V3 TODO**

In `docs/product/crm-v3-development-todolist.md`:

- Change module 5 status from `Current` to `Done`.
- Change module 6 status from `Pending` to `Current`.
- Mark Step 19 and the implementation step complete.
- Add validation commands and evidence path to the progress snapshot.

- [ ] **Step 8: Commit and push**

```bash
git add docs/product/crm-v3-development-todolist.md docs/testing/evidence/artifacts/v3-contract-dashboard-uat-20260703.png
git commit -m "docs: complete v3 contract dashboard validation"
git push
```

Expected: branch `codex/v3-management-dashboard` is pushed to `CaniculaW/crmAI.git`.

---

## Self-Review

- Spec coverage: permission, backend API, OpenAPI, frontend page, tests, browser UAT, TODO update, and push are covered.
- Placeholder scan: no placeholder sections remain.
- Type consistency: API path is consistently `/api/dashboard/contracts`; route is consistently `/dashboard/contracts`; permission is consistently `dashboard.contracts.read`.
- Scope control: plan does not implement invoice, receivable, reconciliation, electronic signature, or BI designer behavior.
