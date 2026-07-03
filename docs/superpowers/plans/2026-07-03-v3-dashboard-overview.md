# V3 Dashboard Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V3 `/dashboard` management overview page with a permission-gated backend API, frontend navigation, metric cards, business flow, risk summary, and drilldown links.

**Architecture:** Add a focused backend `dashboard` package that aggregates existing V1/V2 tables without creating new business tables. Add `dashboard.read` through Flyway, document `GET /api/dashboard/overview` in OpenAPI, expose `crmApi.dashboard.overview()` on the frontend, and render a compact Ant Design management overview page at `/dashboard` while keeping the existing `/` sales workbench intact.

**Tech Stack:** Java 17, Spring Boot, JdbcTemplate, Flyway, JUnit, TestRestTemplate, React, TypeScript, Ant Design, lucide-react, Vitest.

---

## File Structure

- Create `backend/src/main/resources/db/migration/V21__create_dashboard_permissions.sql`
  - Seeds `dashboard.read`.
- Modify `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
  - Verifies the new permission exists.
- Modify `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
  - Verifies the migration in PostgreSQL integration mode.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
  - Defines `GET /api/dashboard/overview`.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
  - Aggregates metric cards, business flow, risk summary, and top risks.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardFilter.java`
  - Holds query filters.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardOverviewResponse.java`
  - Root response record.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardMetricCard.java`
  - Metric card record.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardBusinessFlowItem.java`
  - Business flow record.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskSummary.java`
  - Risk summary record.
- Create `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskItem.java`
  - Top risk record.
- Create `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
  - API, permission, shape, filter, and drilldown tests.
- Modify `docs/openapi/crm-v1-openapi.yaml`
  - Documents `/api/dashboard/overview`.
- Modify `frontend/src/api/crm.ts`
  - Adds dashboard response types and API method.
- Modify `frontend/src/App.tsx`
  - Adds `/dashboard` navigation, route, page, and header wording adjustment.
- Modify `frontend/src/App.test.tsx`
  - Adds mocked dashboard data and dashboard page tests.
- Modify `frontend/src/styles.css`
  - Adds compact dashboard overview layout styles.
- Modify `docs/product/crm-v3-development-todolist.md`
  - Records module completion, verification, and next task.

---

### Task 1: Dashboard Permission Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V21__create_dashboard_permissions.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write failing migration tests**

Add this test method to both `DatabaseMigrationTest` and `PostgresMigrationIT`:

```java
@Test
void createsDashboardReadPermission() {
    Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_permissions
            where permission_code = 'dashboard.read'
              and permission_name = '查看驾驶舱'
              and module_code = 'dashboard'
            """,
            Integer.class);

    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
mvn -Dtest=DatabaseMigrationTest test
```

Expected: FAIL because `dashboard.read` does not exist.

- [ ] **Step 3: Add migration**

Create `backend/src/main/resources/db/migration/V21__create_dashboard_permissions.sql`:

```sql
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.read', '查看驾驶舱', 'operation', 'dashboard', 1200
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.read'
);
```

- [ ] **Step 4: Run tests to verify migration passes**

Run:

```bash
cd backend
mvn -Dtest=DatabaseMigrationTest test
```

Expected: PASS with `createsDashboardReadPermission`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V21__create_dashboard_permissions.sql backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java
git commit -m "feat: add dashboard permission"
```

---

### Task 2: Backend Overview API Contract

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardOverviewResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardMetricCard.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardBusinessFlowItem.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskSummary.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardRiskItem.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`

- [ ] **Step 1: Write failing API tests**

Create `DashboardControllerTest` with these test methods:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DashboardControllerTest {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private IdentityService identityService;
    @Autowired private PasswordCredentialService passwordCredentialService;

    @Test
    void overviewReturnsMetricCardsBusinessFlowRisksAndDrilldowns() {
        DashboardFixture fixture = createDashboardFixture("overview");
        String token = login(fixture.username());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/overview?date_from=2026-07-01&date_to=2026-07-31",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v3-dashboard-overview-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("metric_cards")).anySatisfy(card -> {
            assertThat(card.path("key").asText()).isEqualTo("forecast_amount");
            assertThat(card.path("drilldown_url").asText()).isEqualTo("/opportunities");
        });
        assertThat(data.path("business_flow")).anySatisfy(item ->
                assertThat(item.path("key").asText()).isEqualTo("opportunity"));
        assertThat(data.path("risk_summary")).anySatisfy(item ->
                assertThat(item.path("risk_type").asText()).isEqualTo("receivable_overdue"));
        assertThat(data.path("top_risks")).allSatisfy(risk ->
                assertThat(risk.path("drilldown_url").asText()).startsWith("/"));
    }

    @Test
    void overviewRequiresDashboardReadPermission() {
        DashboardFixture fixture = createDashboardFixtureWithoutDashboardPermission("forbidden");
        String token = login(fixture.username());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/overview",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v3-dashboard-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void overviewDateFilterNarrowsMetrics() {
        DashboardFixture fixture = createDashboardFixture("date-filter");
        String token = login(fixture.username());

        ResponseEntity<JsonNode> july = restTemplate.exchange(
                "/api/dashboard/overview?date_from=2026-07-01&date_to=2026-07-31",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v3-dashboard-july-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> august = restTemplate.exchange(
                "/api/dashboard/overview?date_from=2026-08-01&date_to=2026-08-31",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v3-dashboard-august-trace-001")),
                JsonNode.class);

        double julyForecast = metricValue(july.getBody(), "forecast_amount");
        double augustForecast = metricValue(august.getBody(), "forecast_amount");
        assertThat(julyForecast).isGreaterThan(0);
        assertThat(augustForecast).isEqualTo(0);
    }
}
```

The helper methods in the same test should create:

- One department and one login-ready user.
- A role with `dashboard.read`, `opportunity.read`, `contract.read`, `invoice.read`, `receivable.read`, `payment.read`, and `reconciliation.read`.
- Global data scopes for the same modules.
- One account, opportunity, contract, invoice, receivable plan, payment, and reconciliation using direct `JdbcTemplate` inserts with unique suffixes.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
mvn -Dtest=DashboardControllerTest test
```

Expected: FAIL because the dashboard package and endpoint do not exist.

- [ ] **Step 3: Add response records and filter**

Create these records:

```java
public record DashboardFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        Long opportunity_id) {
}
```

```java
public record DashboardOverviewResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardBusinessFlowItem> business_flow,
        List<DashboardRiskSummary> risk_summary,
        List<DashboardRiskItem> top_risks) {
}
```

```java
public record DashboardMetricCard(
        String key,
        String label,
        BigDecimal value,
        String unit,
        String drilldown_url) {
}
```

```java
public record DashboardBusinessFlowItem(
        String key,
        String label,
        BigDecimal amount,
        long count,
        long risk_count,
        String drilldown_url) {
}
```

```java
public record DashboardRiskSummary(
        String risk_type,
        String label,
        long count,
        BigDecimal amount,
        String highest_level,
        String drilldown_url) {
}
```

```java
public record DashboardRiskItem(
        String risk_type,
        String risk_level,
        String title,
        BigDecimal amount,
        String object_type,
        Long object_id,
        Long owner_user_id,
        Long account_id,
        Long opportunity_id,
        OffsetDateTime occurred_at,
        String drilldown_url) {
}
```

- [ ] **Step 4: Add controller skeleton**

Create `DashboardController`:

```java
@RestController
class DashboardController {

    private final DashboardService dashboardService;

    DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @RequirePermission("dashboard.read")
    @GetMapping("/api/dashboard/overview")
    DashboardOverviewResponse overview(
            @RequestParam(name = "date_from", required = false) LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false) LocalDate dateTo,
            @RequestParam(name = "department_id", required = false) Long departmentId,
            @RequestParam(name = "owner_id", required = false) Long ownerId,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            HttpServletRequest request) {
        return dashboardService.overview(
                currentUserId(request),
                new DashboardFilter(dateFrom, dateTo, departmentId, ownerId, accountId, opportunityId));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
```

- [ ] **Step 5: Run test to verify skeleton compiles but values fail**

Run:

```bash
cd backend
mvn -Dtest=DashboardControllerTest test
```

Expected: FAIL until `DashboardService` returns real metrics.

---

### Task 3: Backend Overview Aggregation

**Files:**
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`

- [ ] **Step 1: Implement service with explicit query helpers**

`DashboardService` should:

- Default `date_from/date_to` to the current month when both are absent.
- Build business filters for `account_id`, `opportunity_id`, and `owner_id`.
- Return six metric cards:
  - `forecast_amount`
  - `contract_amount`
  - `invoiced_amount`
  - `received_amount`
  - `overdue_amount`
  - `risk_count`
- Return five business flow items:
  - `opportunity`
  - `contract`
  - `invoice`
  - `receivable`
  - `reconciliation`
- Return risk summaries for:
  - `opportunity_stalled`
  - `contract_milestone_overdue`
  - `invoice_exception`
  - `receivable_overdue`
  - `unreconciled_payment`
- Return at most eight top risks ordered by risk level, amount descending, and occurred date ascending.

Use `JdbcTemplate` and parameterized queries only. Do not concatenate user values into SQL. Query helper signatures:

```java
private BigDecimal sum(String sql, List<Object> parameters)
private long count(String sql, List<Object> parameters)
private List<DashboardRiskItem> topRisks(DashboardFilter filter)
private BigDecimal zeroIfNull(BigDecimal value)
```

- [ ] **Step 2: Implement permission-aware domain visibility**

Add helper:

```java
private boolean hasPermission(Long userId, String permissionCode) {
    Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_user_roles ur
            join sys_role_permissions rp on rp.role_id = ur.role_id
            join sys_permissions p on p.id = rp.permission_id
            where ur.user_id = ?
              and p.permission_code = ?
            """,
            Integer.class,
            userId,
            permissionCode);
    return count != null && count > 0;
}
```

If the current user lacks a domain read permission, return zero for that domain and exclude that domain risks:

- Opportunities require `opportunity.read`.
- Contracts require `contract.read`.
- Invoices require `invoice.read`.
- Receivables require `receivable.read`.
- Payments require `payment.read`.
- Reconciliations require `reconciliation.read`.

- [ ] **Step 3: Run backend test**

Run:

```bash
cd backend
mvn -Dtest=DashboardControllerTest test
```

Expected: PASS.

- [ ] **Step 4: Run targeted backend regression**

Run:

```bash
cd backend
mvn -Dtest=DashboardControllerTest,DatabaseMigrationTest test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/canicula/crmai/dashboard backend/src/test/java/com/canicula/crmai/dashboard backend/src/test/java/com/canicula/crmai/database
git commit -m "feat: add dashboard overview api"
```

---

### Task 4: OpenAPI Coverage

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Test: `backend/src/test/java/com/canicula/crmai/api/OpenApiContractCoverageTest.java`

- [ ] **Step 1: Run coverage test to verify missing API**

Run:

```bash
cd backend
mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: FAIL with missing `get /api/dashboard/overview`.

- [ ] **Step 2: Document endpoint**

Add tag:

```yaml
  - name: Dashboard
```

Add path:

```yaml
  /api/dashboard/overview:
    get:
      tags: [Dashboard]
      summary: V3 management dashboard overview
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
      responses:
        '200':
          description: Dashboard overview metrics, flow, and risks.
```

- [ ] **Step 3: Run coverage test**

Run:

```bash
cd backend
mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/openapi/crm-v1-openapi.yaml
git commit -m "docs: document dashboard overview api"
```

---

### Task 5: Frontend API Types And Mock Data

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add failing frontend test for dashboard API call**

In `App.test.tsx`, add `dashboardOverview` to `apiData`:

```ts
dashboardOverview: {
  filters: { date_from: "2026-07-01", date_to: "2026-07-31" },
  metric_cards: [
    { key: "forecast_amount", label: "预测金额", value: 620000, unit: "CNY", drilldown_url: "/opportunities" },
    { key: "contract_amount", label: "合同金额", value: 1200000, unit: "CNY", drilldown_url: "/contracts" },
    { key: "invoiced_amount", label: "已开票金额", value: 360000, unit: "CNY", drilldown_url: "/invoices" },
    { key: "received_amount", label: "已回款金额", value: 120000, unit: "CNY", drilldown_url: "/receivables" },
    { key: "overdue_amount", label: "逾期金额", value: 0, unit: "CNY", drilldown_url: "/receivables?overdue=true" },
    { key: "risk_count", label: "风险数", value: 2, unit: "count", drilldown_url: "/dashboard/risks" }
  ],
  business_flow: [
    { key: "opportunity", label: "商机预测", amount: 620000, count: 1, risk_count: 0, drilldown_url: "/opportunities" },
    { key: "contract", label: "合同", amount: 1200000, count: 1, risk_count: 0, drilldown_url: "/contracts" },
    { key: "invoice", label: "开票", amount: 360000, count: 1, risk_count: 0, drilldown_url: "/invoices" },
    { key: "receivable", label: "回款", amount: 120000, count: 1, risk_count: 1, drilldown_url: "/receivables" },
    { key: "reconciliation", label: "核销", amount: 120000, count: 1, risk_count: 1, drilldown_url: "/reconciliations" }
  ],
  risk_summary: [
    { risk_type: "receivable_overdue", label: "回款逾期", count: 1, amount: 100000, highest_level: "High", drilldown_url: "/receivables?overdue=true" },
    { risk_type: "unreconciled_payment", label: "未核销回款", count: 1, amount: 120000, highest_level: "Medium", drilldown_url: "/reconciliations" }
  ],
  top_risks: [
    {
      risk_type: "receivable_overdue",
      risk_level: "High",
      title: "V2 UAT 首付款回款逾期",
      amount: 100000,
      object_type: "receivable_plan",
      object_id: 601,
      owner_user_id: 1001,
      account_id: 1,
      opportunity_id: 10,
      occurred_at: "2026-07-20T10:00:00+08:00",
      drilldown_url: "/receivables?overdue=true"
    }
  ]
}
```

Add `"dashboard.read"` to `apiData.user.permissions`.

Extend `mockCrmFetch()` so `/api/dashboard/overview` returns `apiData.dashboardOverview`.

- [ ] **Step 2: Run frontend test to verify it fails**

Run:

```bash
cd frontend
npm test -- --run
```

Expected: FAIL because `crmApi.dashboard` and `/dashboard` page do not exist.

- [ ] **Step 3: Add frontend API types**

Add these types in `frontend/src/api/crm.ts`:

```ts
export type DashboardMetricCard = {
  key: string;
  label: string;
  value: number;
  unit: "CNY" | "count" | string;
  drilldown_url: string;
};

export type DashboardBusinessFlowItem = {
  key: string;
  label: string;
  amount: number;
  count: number;
  risk_count: number;
  drilldown_url: string;
};

export type DashboardRiskSummary = {
  risk_type: string;
  label: string;
  count: number;
  amount: number;
  highest_level: string;
  drilldown_url: string;
};

export type DashboardRiskItem = {
  risk_type: string;
  risk_level: string;
  title: string;
  amount: number;
  object_type: string;
  object_id: number;
  owner_user_id?: number;
  account_id?: number;
  opportunity_id?: number;
  occurred_at?: string;
  drilldown_url: string;
};

export type DashboardOverview = {
  filters: Record<string, unknown>;
  metric_cards: DashboardMetricCard[];
  business_flow: DashboardBusinessFlowItem[];
  risk_summary: DashboardRiskSummary[];
  top_risks: DashboardRiskItem[];
};
```

Add API method:

```ts
dashboard: {
  overview: (query?: QueryParams) => requestJson<DashboardOverview>(withQuery("/api/dashboard/overview", query))
},
```

- [ ] **Step 4: Run TypeScript-facing frontend test**

Run:

```bash
cd frontend
npm test -- --run
```

Expected: still FAIL until route/page exists.

---

### Task 6: Frontend Dashboard Page

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add failing UI test**

Add test:

```ts
it("renders the V3 dashboard overview with metrics risks and drilldowns", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/dashboard");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "经营总览" })).toBeInTheDocument();
  expect(screen.getByText("预测金额")).toBeInTheDocument();
  expect(screen.getByText("合同金额")).toBeInTheDocument();
  expect(screen.getByText("销售到财务链路")).toBeInTheDocument();
  expect(screen.getByText("风险摘要")).toBeInTheDocument();
  expect(screen.getByText("V2 UAT 首付款回款逾期")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "查看逾期回款" })).toHaveAttribute("href", "/receivables?overdue=true");

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/overview"), expect.anything());
  });
});
```

Add nav permission test:

```ts
it("shows dashboard navigation only with dashboard read permission", async () => {
  const user = userEvent.setup();
  mockCrmFetch();

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("link", { name: "驾驶舱" })).toHaveAttribute("href", "/dashboard");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend
npm test -- --run
```

Expected: FAIL because no DashboardOverviewPage route exists.

- [ ] **Step 3: Add navigation and route**

In `navItems`, add:

```tsx
{ key: "/dashboard", label: "驾驶舱", icon: <BarChart3 size={18} />, permission: "dashboard.read" },
```

In routes, add before business module routes:

```tsx
<Route path="/dashboard" element={<DashboardOverviewPage />} />
```

Update header text:

```tsx
<strong>项目型大客户 CRM</strong>
<span>销售、商务、财务与经营驾驶舱</span>
```

- [ ] **Step 4: Implement page**

Add `DashboardOverviewPage` in `App.tsx` near the existing `Dashboard` component:

```tsx
function DashboardOverviewPage() {
  const { data, loading, error, refresh } = useObjectResource(() => crmApi.dashboard.overview(), []);

  return (
    <section className="workspace dashboard-overview">
      <PageTitle
        title="经营总览"
        description="查看销售到财务闭环的经营健康度、风险摘要和下钻入口。"
        action={<RefreshButton onClick={refresh} loading={loading} />}
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="summary-grid">
        {(data?.metric_cards ?? []).map((card) => (
          <Link key={card.key} to={card.drilldown_url} className="dashboard-metric-card">
            <span>{card.label}</span>
            <strong>{formatDashboardMetric(card)}</strong>
          </Link>
        ))}
      </div>
      <Card title="销售到财务链路" size="small">
        <div className="dashboard-flow">
          {(data?.business_flow ?? []).map((item) => (
            <Link key={item.key} to={item.drilldown_url} className="dashboard-flow-item">
              <span>{item.label}</span>
              <strong>{formatCurrency(item.amount)}</strong>
              <small>{item.count} 项 · {item.risk_count} 个风险</small>
            </Link>
          ))}
        </div>
      </Card>
      <div className="dashboard-grid">
        <Card title="风险摘要" size="small">
          <SimpleList
            items={data?.risk_summary ?? []}
            render={(risk) => `${risk.label} · ${risk.count} 项 · ${formatCurrency(risk.amount)}`}
            empty="当前筛选范围暂无经营风险"
          />
        </Card>
        <Card title="待处理排行" size="small">
          <SimpleList
            items={data?.top_risks ?? []}
            render={(risk) => `${risk.title} · ${risk.risk_level} · ${formatCurrency(risk.amount)}`}
            empty="暂无待处理风险"
          />
          {(data?.top_risks ?? []).some((risk) => risk.risk_type === "receivable_overdue") ? (
            <Link to="/receivables?overdue=true">查看逾期回款</Link>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
```

Add object loader helper:

```tsx
function useObjectResource<T>(loader: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
```

Add formatting helpers:

```tsx
function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value ?? 0);
}

function formatDashboardMetric(card: DashboardMetricCard) {
  if (card.unit === "CNY") {
    return formatCurrency(card.value);
  }
  return String(card.value ?? 0);
}
```

- [ ] **Step 5: Add CSS**

In `frontend/src/styles.css`, add:

```css
.dashboard-overview .dashboard-metric-card {
  display: flex;
  min-height: 96px;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
}

.dashboard-overview .dashboard-metric-card strong {
  font-size: 24px;
  line-height: 1.2;
}

.dashboard-flow {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.dashboard-flow-item {
  display: flex;
  min-height: 92px;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: inherit;
}

.dashboard-flow-item strong {
  font-size: 18px;
}
```

- [ ] **Step 6: Run frontend tests**

Run:

```bash
cd frontend
npm test -- --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/styles.css
git commit -m "feat: add v3 dashboard overview page"
```

---

### Task 7: Full Verification And Browser Evidence

**Files:**
- Modify: `docs/product/crm-v3-development-todolist.md`
- Create: `docs/testing/evidence/v3-dashboard-overview-2026-07-03.md`
- Optional artifact: `docs/testing/evidence/artifacts/v3-dashboard-overview-uat-20260703.png`

- [ ] **Step 1: Run backend targeted tests**

Run:

```bash
cd backend
mvn -Dtest=DashboardControllerTest,DatabaseMigrationTest,OpenApiContractCoverageTest test
```

Expected: PASS.

- [ ] **Step 2: Run backend full tests**

Run:

```bash
cd backend
mvn test
```

Expected: PASS.

- [ ] **Step 3: Run frontend tests and build**

Run:

```bash
cd frontend
npm test -- --run
npm run build
```

Expected: both commands PASS.

- [ ] **Step 4: Browser UAT**

Use the existing local services:

- Frontend: `http://127.0.0.1:5175/`
- Backend: `http://127.0.0.1:8081/` or current local backend port
- Account: `demo_admin`

Validate:

- Open `http://127.0.0.1:5175/dashboard`.
- Confirm `经营总览` is visible.
- Confirm metric cards show `预测金额`、`合同金额`、`已开票金额`、`已回款金额`、`逾期金额`、`风险数`.
- Confirm `销售到财务链路` is visible.
- Confirm `风险摘要` and `待处理排行` are visible.
- Click `查看逾期回款` and confirm it navigates to `/receivables?overdue=true`.
- Confirm browser console has no application error.

- [ ] **Step 5: Record evidence**

Create `docs/testing/evidence/v3-dashboard-overview-2026-07-03.md`:

```markdown
# V3 经营驾驶舱总览验证证据

日期：2026-07-03

分支：`codex/v3-management-dashboard`

## 验证范围

- `GET /api/dashboard/overview`
- `/dashboard` 经营总览页面
- `dashboard.read` 权限
- 指标卡、经营链路、风险摘要、下钻入口

## 自动化验证

| 命令 | 结果 |
|---|---|
| `mvn -Dtest=DashboardControllerTest,DatabaseMigrationTest,OpenApiContractCoverageTest test` | PASS |
| `mvn test` | PASS |
| `npm test -- --run` | PASS |
| `npm run build` | PASS |

## 浏览器验收

| 检查项 | 结果 |
|---|---|
| 登录后可访问 `/dashboard` | PASS |
| 核心指标卡可见 | PASS |
| 经营链路可见 | PASS |
| 风险摘要可见 | PASS |
| 逾期回款下钻可用 | PASS |
| 控制台无应用错误 | PASS |
```

- [ ] **Step 6: Update V3 TODOList**

Update `docs/product/crm-v3-development-todolist.md`:

- Keep module 3 `Current` until browser evidence is recorded.
- Mark Step 13 complete after implementation.
- Add validation commands and evidence path to the current progress snapshot.

- [ ] **Step 7: Commit**

```bash
git add docs/product/crm-v3-development-todolist.md docs/testing/evidence/v3-dashboard-overview-2026-07-03.md
git commit -m "test: add v3 dashboard overview evidence"
```

---

## Final Verification Gate

Before claiming module 3 complete, run:

```bash
cd backend
mvn test
```

```bash
cd frontend
npm test -- --run
npm run build
```

Then verify:

```bash
git status --short
git log --oneline -5
```

Module 3 can be marked Done only when:

- `dashboard.read` exists.
- `GET /api/dashboard/overview` is documented and covered.
- Backend tests pass.
- Frontend tests and build pass.
- Browser UAT evidence exists.
- `/dashboard` and `/` have distinct roles.
- The final commit is pushed to `origin/codex/v3-management-dashboard`.
