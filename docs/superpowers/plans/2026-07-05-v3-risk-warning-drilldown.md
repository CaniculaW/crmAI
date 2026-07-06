# V3 Risk Warning Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V3 risk warning dashboard at `/dashboard/risks`, with unified risk aggregation, permission control, frontend workbench, and verified drilldowns into existing business pages.

**Architecture:** Add one permission migration and one focused dashboard endpoint that reuses existing V3 dashboard domain-access patterns. The backend returns normalized risk cards, summaries, trend, owner ranking, and item rows; the frontend renders a dense operational risk page under the existing dashboard menu. Risk handling remains in V1/V2 business pages via deep links.

**Tech Stack:** Spring Boot 3, JdbcTemplate, Flyway, JUnit, PostgreSQL/H2, React, TypeScript, Ant Design, Vitest, Vite, local Chrome/CDP UAT.

---

## File Map

- Create `backend/src/main/resources/db/migration/V26__create_dashboard_risk_permissions.sql`
  - Seeds `dashboard.risks.read`.
- Modify `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
  - Expected migration count and risk dashboard permission assertion.
- Modify `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
  - Expected latest Flyway version and permission assertion.
- Create backend records under `backend/src/main/java/com/canicula/crmai/dashboard/`
  - `DashboardRiskFilter`
  - `DashboardRiskResponse`
  - `DashboardRiskMetricCard`
  - `DashboardRiskTrendPoint`
  - `DashboardRiskOwnerSummary`
  - `DashboardRiskWorkItem`
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
  - Add `GET /api/dashboard/risks`.
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
  - Add risk aggregation, normalization, owner ranking, scoring, trend, and drilldown URLs.
- Modify `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
  - Add risk dashboard behavior and permission tests.
- Modify `docs/openapi/crm-v1-openapi.yaml`
  - Add `/api/dashboard/risks` with response shape.
- Modify `frontend/src/api/crm.ts`
  - Add risk dashboard response types and API client method.
- Modify `frontend/src/App.tsx`
  - Add dashboard menu item, route, page component, risk rows, and URL-driven detail opening for opportunities/contracts/invoices.
- Modify `frontend/src/styles.css`
  - Add compact risk dashboard layout styles.
- Modify `frontend/src/App.test.tsx`
  - Add risk dashboard mock data, page render test, permission/nav checks, and drilldown tests.
- Modify `docs/product/crm-v3-development-todolist.md`
  - Track module 8 implementation progress and completion.
- Create `docs/testing/evidence/artifacts/v3-risk-warning-uat-20260705.png`
  - Browser UAT screenshot evidence.

---

## Task 1: Permission Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V26__create_dashboard_risk_permissions.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write the failing H2 migration assertion**

In `DatabaseMigrationTest`, update the migration count assertion from:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(25);
```

to:

```java
assertThat(migrationCount).isGreaterThanOrEqualTo(26);
```

Add this test near the dashboard permission tests:

```java
@Test
void createsDashboardRisksReadPermission() {
    Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_permissions
            where permission_code = 'dashboard.risks.read'
              and permission_name = '查看风险预警'
              and module_code = 'dashboard'
            """,
            Integer.class);

    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 2: Write the failing PostgreSQL migration assertion**

In `PostgresMigrationIT`, update the expected latest version from:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("25");
```

to:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("26");
```

Add this test:

```java
@Test
void createsDashboardRisksReadPermission() {
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
            where permission_code = 'dashboard.risks.read'
              and permission_name = '查看风险预警'
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

Expected: fails because `dashboard.risks.read` is absent.

- [ ] **Step 4: Add V26 migration**

Create `V26__create_dashboard_risk_permissions.sql`:

```sql
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.risks.read', '查看风险预警', 'operation', 'dashboard', 1250
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.risks.read'
);
```

- [ ] **Step 5: Run GREEN migration tests**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected: both commands pass. If local sandbox blocks random ports, JVM attach, or Docker, rerun with escalation and record that the non-sandbox command passed.

---

## Task 2: Backend Risk Dashboard API

**Files:**
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskMetricCard.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskTrendPoint.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskOwnerSummary.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskWorkItem.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`

- [ ] **Step 1: Write failing successful response test**

In `DashboardControllerTest`, add `"dashboard.risks.read"` to `allDashboardPermissions()`.

Add a test named:

```java
@Test
void risksDashboardReturnsMetricsSummaryTrendOwnersAndItems()
```

Use `createCompleteFixture(...)` to create one linked customer, opportunity, contract, invoice, receivable, payment, and reconciliation fixture. Call:

```java
ResponseEntity<JsonNode> response = restTemplate.exchange(
        "/api/dashboard/risks?date_from=2026-07-01&date_to=2026-07-31&account_id=" + fixture.accountId(),
        HttpMethod.GET,
        new HttpEntity<>(authHeaders(user.token(), "dashboard-risk-trace-001")),
        JsonNode.class);
```

Assert:

```java
assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
JsonNode data = response.getBody().path("data");
assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
assertThat(data.path("metric_cards")).anySatisfy(card -> {
    assertThat(card.path("key").asText()).isEqualTo("risk_count");
    assertThat(card.path("label").asText()).isEqualTo("风险总数");
    assertThat(card.path("value").asLong()).isGreaterThanOrEqualTo(1);
    assertThat(card.path("drilldown_url").asText()).startsWith("/dashboard/risks");
});
assertThat(data.path("risk_summary")).anySatisfy(summary -> {
    assertThat(summary.path("risk_type").asText()).isEqualTo("receivable_overdue");
    assertThat(summary.path("label").asText()).isEqualTo("回款逾期");
    assertThat(summary.path("highest_level").asText()).isEqualTo("high");
});
assertThat(data.path("risk_trend")).isNotEmpty();
assertThat(data.path("owner_ranking")).anySatisfy(owner -> {
    assertThat(owner.path("owner_user_id").asLong()).isEqualTo(user.userId());
    assertThat(owner.path("owner_name").asText()).isNotBlank();
});
assertThat(data.path("risk_items")).anySatisfy(item -> {
    assertThat(item.path("risk_type").asText()).isEqualTo("receivable_overdue");
    assertThat(item.path("risk_level").asText()).isEqualTo("high");
    assertThat(item.path("priority_score").asInt()).isGreaterThanOrEqualTo(300);
    assertThat(item.path("suggested_action").asText()).contains("回款");
    assertThat(item.path("drilldown_url").asText()).isEqualTo("/receivables?receivable_plan_id=" + fixture.receivablePlanId());
});
```

- [ ] **Step 2: Write failing permission test**

Add:

```java
@Test
void risksDashboardRequiresDashboardRisksReadPermission()
```

Create a login-ready user with the normal business permissions but without `dashboard.risks.read`. Call `/api/dashboard/risks` and assert `HttpStatus.FORBIDDEN`.

- [ ] **Step 3: Run RED API tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest#risksDashboardReturnsMetricsSummaryTrendOwnersAndItems,DashboardControllerTest#risksDashboardRequiresDashboardRisksReadPermission test
```

Expected: fails because the endpoint and permission are not implemented.

- [ ] **Step 4: Add backend records**

Create these records:

```java
public record DashboardRiskFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        String risk_type,
        String risk_level,
        String object_type,
        Boolean high_priority_only) {
}
```

```java
public record DashboardRiskResponse(
        Map<String, Object> filters,
        List<DashboardRiskMetricCard> metric_cards,
        List<DashboardRiskSummary> risk_summary,
        List<DashboardRiskTrendPoint> risk_trend,
        List<DashboardRiskOwnerSummary> owner_ranking,
        List<DashboardRiskWorkItem> risk_items) {
}
```

```java
public record DashboardRiskMetricCard(String key, String label, BigDecimal value, String unit, String drilldown_url) {
}
```

```java
public record DashboardRiskTrendPoint(String period, long count, long high_count, BigDecimal amount, String drilldown_url) {
}
```

```java
public record DashboardRiskOwnerSummary(
        Long owner_user_id,
        String owner_name,
        long count,
        long high_count,
        BigDecimal amount,
        OffsetDateTime latest_occurred_at,
        String drilldown_url) {
}
```

```java
public record DashboardRiskWorkItem(
        String risk_type,
        String risk_level,
        int priority_score,
        String title,
        BigDecimal amount,
        String object_type,
        Long object_id,
        Long account_id,
        String account_name,
        Long opportunity_id,
        Long contract_id,
        Long owner_user_id,
        String owner_name,
        OffsetDateTime occurred_at,
        String suggested_action,
        String drilldown_url) {
}
```

- [ ] **Step 5: Add controller endpoint**

In `DashboardController`, add:

```java
@RequirePermission("dashboard.risks.read")
@GetMapping("/api/dashboard/risks")
DashboardRiskResponse risks(
        @RequestParam(name = "date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(name = "date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        @RequestParam(name = "department_id", required = false) Long departmentId,
        @RequestParam(name = "owner_id", required = false) Long ownerId,
        @RequestParam(name = "account_id", required = false) Long accountId,
        @RequestParam(name = "risk_type", required = false) String riskType,
        @RequestParam(name = "risk_level", required = false) String riskLevel,
        @RequestParam(name = "object_type", required = false) String objectType,
        @RequestParam(name = "high_priority_only", required = false) Boolean highPriorityOnly,
        HttpServletRequest request) {
    return dashboardService.risks(
            currentUserId(request),
            new DashboardRiskFilter(dateFrom, dateTo, departmentId, ownerId, accountId, riskType, riskLevel, objectType, highPriorityOnly));
}
```

- [ ] **Step 6: Implement service aggregation**

In `DashboardService`, add `risks(Long actorUserId, DashboardRiskFilter filter)` that:

1. Defaults `date_from/date_to` to current quarter.
2. Gets domain access for opportunity, contract, invoice, receivable, payment.
3. Builds a normalized `List<DashboardRiskWorkItem>` from five sources:
   - `opportunity_stalled`
   - `contract_milestone_overdue`
   - `invoice_exception`
   - `receivable_overdue`
   - `unreconciled_payment`
4. Applies `risk_type`, `risk_level`, `object_type`, and `high_priority_only` filters after normalization.
5. Sorts by `priority_score desc`, then `amount desc`, then `occurred_at desc`.
6. Returns metric cards, summaries, trend by `YYYY-MM`, owner ranking, and top 50 risk items.

Use these suggested actions:

```java
private static String riskSuggestedAction(String riskType) {
    return switch (riskType) {
        case "opportunity_stalled" -> "进入商机确认当前阶段、风险状态和下一步计划";
        case "contract_milestone_overdue" -> "进入合同执行台确认逾期节点和责任动作";
        case "invoice_exception" -> "进入开票详情处理异常原因和解决方案";
        case "receivable_overdue" -> "进入回款详情确认逾期原因和下一步跟进";
        case "unreconciled_payment" -> "进入核销工作台匹配发票和到账流水";
        default -> "进入业务页面处理风险";
    };
}
```

Use these drilldown URL patterns:

```java
opportunity_stalled -> "/opportunities?opportunity_id=" + opportunityId
contract_milestone_overdue -> "/contracts?contract_id=" + contractId
invoice_exception -> "/invoices?invoice_id=" + invoiceId
receivable_overdue -> "/receivables?receivable_plan_id=" + receivablePlanId
unreconciled_payment -> "/reconciliations?payment_id=" + paymentId
```

- [ ] **Step 7: Run GREEN backend tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest#risksDashboardReturnsMetricsSummaryTrendOwnersAndItems,DashboardControllerTest#risksDashboardRequiresDashboardRisksReadPermission test
```

Expected: 2 tests pass.

---

## Task 3: OpenAPI Contract

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `backend/src/test/java/com/canicula/crmai/api/OpenApiContractCoverageTest.java` only if the existing coverage test requires explicit operation metadata changes.

- [ ] **Step 1: Run RED OpenAPI coverage**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: fails because `/api/dashboard/risks` is absent from OpenAPI.

- [ ] **Step 2: Add OpenAPI path**

Add:

```yaml
  /api/dashboard/risks:
    get:
      tags: [Dashboard]
      summary: V3 risk warning dashboard
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
        - name: risk_type
          in: query
          schema:
            type: string
        - name: risk_level
          in: query
          schema:
            type: string
        - name: object_type
          in: query
          schema:
            type: string
        - name: high_priority_only
          in: query
          schema:
            type: boolean
      responses:
        '200':
          description: Risk metrics, summary, trend, owner ranking, and risk work items.
```

Include response properties for `metric_cards`, `risk_summary`, `risk_trend`, `owner_ranking`, and `risk_items`, following the same inline schema style used by `/api/dashboard/receivables`.

- [ ] **Step 3: Run GREEN OpenAPI coverage**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: passes.

---

## Task 4: Frontend API and Risk Page

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing frontend render test**

In `App.test.tsx`, add `"dashboard.risks.read"` to the mock user permissions and add `dashboardRisks` mock data with:

- `metric_cards`: risk_count, high_risk_count, risk_amount
- `risk_summary`: at least receivable_overdue and invoice_exception
- `risk_trend`: one period
- `owner_ranking`: one owner
- `risk_items`: one receivable risk and one invoice risk

Add:

```ts
it("renders the V3 risk warning dashboard page", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/dashboard/risks");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "风险预警" })).toBeInTheDocument();
  expect(screen.getByText("风险总数")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "风险分类分布" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "风险趋势" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "责任人风险排行" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "风险明细" })).toBeInTheDocument();
  expect(screen.getByText("回款逾期")).toBeInTheDocument();
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/risks"), expect.anything());
  });
});
```

- [ ] **Step 2: Run RED frontend test**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 risk warning dashboard page"
```

Expected: fails because the route and API type are absent.

- [ ] **Step 3: Add frontend API types**

In `crm.ts`, add:

```ts
export type DashboardRiskMetricCard = {
  key: string;
  label: string;
  value: number;
  unit: string;
  drilldown_url: string;
};

export type DashboardRiskTrendPoint = {
  period: string;
  count: number;
  high_count: number;
  amount: number;
  drilldown_url: string;
};

export type DashboardRiskOwnerSummary = {
  owner_user_id: number;
  owner_name: string;
  count: number;
  high_count: number;
  amount: number;
  latest_occurred_at?: string;
  drilldown_url: string;
};

export type DashboardRiskWorkItem = {
  risk_type: string;
  risk_level: string;
  priority_score: number;
  title: string;
  amount: number;
  object_type: string;
  object_id: number;
  account_id: number;
  account_name?: string;
  opportunity_id?: number;
  contract_id?: number;
  owner_user_id: number;
  owner_name?: string;
  occurred_at?: string;
  suggested_action: string;
  drilldown_url: string;
};

export type DashboardRisks = {
  filters: Record<string, unknown>;
  metric_cards: DashboardRiskMetricCard[];
  risk_summary: DashboardRiskSummary[];
  risk_trend: DashboardRiskTrendPoint[];
  owner_ranking: DashboardRiskOwnerSummary[];
  risk_items: DashboardRiskWorkItem[];
};
```

Add API client:

```ts
risks: (query?: QueryParams) => requestJson<DashboardRisks>(withQuery("/api/dashboard/risks", query))
```

- [ ] **Step 4: Add route and page**

In `App.tsx`:

1. Add dashboard child `{ key: "/dashboard/risks", label: "风险预警", permission: "dashboard.risks.read" }`.
2. Add route `<Route path="/dashboard/risks" element={<DashboardRisksPage />} />`.
3. Add `DashboardRisksPage` using `DataWorkspace`, `FilterBar`, metric cards, summary rows, trend rows, owner rows, and risk item rows.
4. Add `emptyDashboardRisks()`.

The risk item row should link to `item.drilldown_url` and display:

```text
风险等级 Tag
风险类型
标题
客户 / 负责人
金额 / 发生时间
建议动作
```

- [ ] **Step 5: Add compact CSS**

In `styles.css`, add classes:

```css
.dashboard-risks__summary-list
.dashboard-risks__trend-list
.dashboard-risks__owner-list
.dashboard-risks__item-list
.dashboard-risks__item
.dashboard-risks__item-meta
```

Keep card radius at 8px or less and use the existing dashboard row visual language.

- [ ] **Step 6: Run GREEN frontend page test**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "renders the V3 risk warning dashboard page"
```

Expected: passes.

---

## Task 5: Deep Link Support for Existing Pages

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing deep-link tests**

Add three tests:

```ts
it("opens opportunity drilldown from risk warning links", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/opportunities?opportunity_id=10");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "商机" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "商机推进入口" })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/opportunities?opportunity_id=10"), expect.anything());
});
```

```ts
it("opens contract drilldown from risk warning links", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/contracts?contract_id=301");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "合同" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "合同执行台" })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/contracts?contract_id=301"), expect.anything());
});
```

```ts
it("opens invoice drilldown from risk warning links", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/invoices?invoice_id=401");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "开票管理" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "开票详情" })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/invoices?invoice_id=401"), expect.anything());
});
```

- [ ] **Step 2: Run RED deep-link tests**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "risk warning links"
```

Expected: fails because these pages currently read list filters but do not auto-open the target detail.

- [ ] **Step 3: Implement opportunity deep link**

In `OpportunitiesPage`, read `opportunity_id` from `useInitialQueryFilters`. Remove it from the list filters and call the existing detail/opening function for that ID after component mount.

If the page currently has no reusable detail loader, create:

```ts
const initialOpportunityId = numericFilterValue(initialQueryFilters.opportunity_id);
useEffect(() => {
  if (initialOpportunityId) {
    const opportunity = opportunities.data.find((item) => item.id === initialOpportunityId);
    if (opportunity) {
      setSelected(opportunity);
    } else {
      void crmApi.opportunities.detail(initialOpportunityId).then(setSelected);
    }
  }
}, [initialOpportunityId, opportunities.data]);
```

- [ ] **Step 4: Implement contract deep link**

In `ContractsPage`, read `contract_id`, remove it from list filters, and auto-open the contract execution drawer. Prefer `crmApi.contracts.detail(contractId)` when the list has not loaded yet.

- [ ] **Step 5: Implement invoice deep link**

In `InvoicesPage`, read `invoice_id`, remove it from list filters, and auto-open the invoice detail drawer. Prefer `crmApi.invoices.detail(invoiceId)` when the list has not loaded yet.

- [ ] **Step 6: Run GREEN deep-link tests**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "risk warning links"
```

Expected: all three deep-link tests pass.

---

## Task 6: Documentation, Regression, UAT, and Handoff

**Files:**
- Modify: `docs/product/crm-v3-development-todolist.md`
- Create: `docs/testing/evidence/artifacts/v3-risk-warning-uat-20260705.png`

- [ ] **Step 1: Update TODOList before final verification**

In `docs/product/crm-v3-development-todolist.md`:

- Mark Step 25 as complete.
- Add and mark Step 26 as in progress: `按实现计划实施风险预警与数据下钻`.
- Keep module 8 as `Current` until browser UAT passes.

- [ ] **Step 2: Run full frontend verification**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx
cd frontend && npm run build
```

Expected:

- All App tests pass.
- Build exits 0. The existing Ant Design/Vite large-chunk warning is acceptable if the command exits 0.

- [ ] **Step 3: Run backend verification**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest,DashboardControllerTest,OpenApiContractCoverageTest test
cd backend && mvn -Dtest=PostgresMigrationIT test
```

Expected:

- H2 migration/API/OpenAPI suite passes.
- PostgreSQL migration suite passes.
- If sandbox blocks random ports, ByteBuddy attach, or Docker, rerun with escalation and record the non-sandbox passing output.

- [ ] **Step 4: Run API smoke**

With local backend running, run:

```bash
node -e "fetch('http://127.0.0.1:8081/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Trace-Id':'v3-risk-smoke-login'},body:JSON.stringify({username:'demo_admin',password:'S3cure!123'})}).then(r=>r.json()).then(async login=>{const token=login.data.access_token; const res=await fetch('http://127.0.0.1:8081/api/dashboard/risks',{headers:{Authorization:'Bearer '+token,'X-Trace-Id':'v3-risk-smoke'}}); const body=await res.json(); console.log(JSON.stringify({loginCode:login.code,status:res.status,code:body.code,metricCards:body.data?.metric_cards?.length,summary:body.data?.risk_summary?.length,trend:body.data?.risk_trend?.length,owners:body.data?.owner_ranking?.length,items:body.data?.risk_items?.length},null,2));})"
```

Expected: `status` is `200`, `code` is `OK`, and arrays are present.

- [ ] **Step 5: Run browser UAT**

Use local frontend `http://127.0.0.1:5175/` and backend `http://127.0.0.1:8081/`.

Browser flow:

1. Login as `demo_admin` / `S3cure!123`.
2. Open `/dashboard/risks`.
3. Confirm `风险预警`, `风险分类分布`, `责任人风险排行`, `风险明细` are visible.
4. Open one risk drilldown for each available object type:
   - opportunity
   - contract
   - invoice
   - receivable
   - payment/reconciliation
5. Capture screenshot to `docs/testing/evidence/artifacts/v3-risk-warning-uat-20260705.png`.
6. Confirm browser console application errors count is 0.

- [ ] **Step 6: Update TODOList after verification**

If all verification passes:

- Mark module 8 `Done`.
- Mark module 9 `Current`.
- Add verification command outputs and evidence path to the current progress snapshot.
- Set current task to `v3-full-regression-uat`.

- [ ] **Step 7: Final checks and commit**

Run:

```bash
git diff --check
git status --short
```

Expected:

- `git diff --check` exits 0.
- `git status --short` only shows files for module 8.

Commit:

```bash
git add backend/src/main/resources/db/migration/V26__create_dashboard_risk_permissions.sql \
  backend/src/main/java/com/canicula/crmai/dashboard \
  backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java \
  backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java \
  backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java \
  docs/openapi/crm-v1-openapi.yaml \
  docs/product/crm-v3-development-todolist.md \
  docs/testing/evidence/artifacts/v3-risk-warning-uat-20260705.png \
  frontend/src/api/crm.ts \
  frontend/src/App.tsx \
  frontend/src/App.test.tsx \
  frontend/src/styles.css
git commit -m "feat: add v3 risk warning dashboard"
git push
```

Expected: commit and push succeed on `codex/v3-management-dashboard`.

---

## Self-Review

- Spec coverage: permission, API, frontend, deep links, tests, UAT, TODO update, commit are covered.
- No placeholders: all steps include concrete files, commands, expected results, and key code snippets.
- Type consistency: response fields match the design spec and frontend API types.
- Scope control: this plan does not add risk workflow state, assignment, comments, notifications, or configurable rules.
