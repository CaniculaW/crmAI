# V3 Funnel Forecast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build V3 sales funnel and forecast dashboard at `/dashboard/funnel` with permissioned backend aggregation, frontend view, drilldowns, tests, and UAT evidence.

**Architecture:** Add one permission migration and one dashboard aggregation API backed by existing `crm_opportunities` fields. The frontend adds a lightweight dashboard page using existing Ant Design components and no new chart dependency. Data permissions follow existing `DataPermissionService` and `opportunity.read`.

**Tech Stack:** Spring Boot 3, JdbcTemplate, Flyway, JUnit, React, TypeScript, Ant Design, Vitest, Vite.

---

## File Map

- Create `backend/src/main/resources/db/migration/V22__create_dashboard_funnel_permissions.sql`
  - Seeds `dashboard.funnel.read`.
- Modify `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
  - Migration count and permission assertions.
- Modify `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
  - Expected latest migration version from `21` to `22`.
- Modify `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
  - Add funnel API tests near existing overview tests.
- Create backend records under `backend/src/main/java/com/canicula/crmai/dashboard/`
  - `DashboardFunnelResponse`
  - `DashboardFunnelMetricCard`
  - `DashboardFunnelStage`
  - `DashboardForecastTrendPoint`
  - `DashboardAttentionOpportunity`
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
  - Add `GET /api/dashboard/funnel`.
- Modify `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`
  - Add funnel aggregation and shared stage/win-rate helpers.
- Modify `docs/openapi/crm-v1-openapi.yaml`
  - Add `/api/dashboard/funnel`.
- Modify `frontend/src/api/crm.ts`
  - Add funnel response types and API client.
- Modify `frontend/src/App.tsx`
  - Add nav item, route, page component, rendering helpers.
- Modify `frontend/src/styles.css`
  - Add compact funnel dashboard styles.
- Modify `frontend/src/App.test.tsx`
  - Add mocked data and page assertions.
- Modify `docs/product/crm-v3-development-todolist.md`
  - Track module 4 implementation and completion.
- Create `docs/testing/evidence/v3-funnel-forecast-2026-07-03.md`
  - Record verification and UAT.

---

## Task 1: Permission Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V22__create_dashboard_funnel_permissions.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write the failing migration assertions**

In `DatabaseMigrationTest`, update the permission assertion test to include:

```java
Integer dashboardFunnelPermissionCount = jdbcTemplate.queryForObject(
        "select count(*) from sys_permissions where permission_code = 'dashboard.funnel.read'",
        Integer.class);
assertThat(dashboardFunnelPermissionCount).isEqualTo(1);
```

Also change the migration count lower bound:

```java
assertThat(count).isGreaterThanOrEqualTo(22);
```

In `PostgresMigrationIT`, change:

```java
assertThat(currentVersion).isEqualTo("22");
```

- [ ] **Step 2: Run RED test**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: fails because `dashboard.funnel.read` does not exist.

- [ ] **Step 3: Add migration**

Create `V22__create_dashboard_funnel_permissions.sql`:

```sql
insert into sys_permissions (permission_code, permission_name, module_code, action_code, description)
values
    ('dashboard.funnel.read', '销售漏斗查看', 'dashboard', 'read', '查看销售漏斗与商机预测看板')
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    module_code = excluded.module_code,
    action_code = excluded.action_code,
    description = excluded.description;

insert into sys_role_permissions (role_id, permission_id)
select r.id, p.id
from sys_roles r
join sys_permissions p on p.permission_code = 'dashboard.funnel.read'
where r.role_code = 'demo_admin'
on conflict do nothing;
```

- [ ] **Step 4: Run GREEN tests**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V22__create_dashboard_funnel_permissions.sql \
  backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java \
  backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java
git commit -m "feat: add dashboard funnel permission"
```

---

## Task 2: Backend Funnel API

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardFunnelResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardFunnelMetricCard.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardFunnelStage.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardForecastTrendPoint.java`
- Create: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardAttentionOpportunity.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardService.java`

- [ ] **Step 1: Write failing API tests**

Add tests to `DashboardControllerTest`:

```java
@Test
void funnelReturnsMetricsStagesTrendAndAttentionOpportunities() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("funnel-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "funnel_all_" + suffix,
            departmentId,
            allDashboardPermissionsWithFunnel(),
            List.of("global"));
    createCompleteFixture(suffix, departmentId, user.userId());

    ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/dashboard/funnel?date_from=2026-07-01&date_to=2026-09-30",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders(user.token(), "dashboard-funnel-trace-001")),
            JsonNode.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode data = response.getBody().path("data");
    assertThat(data.path("metric_cards")).anySatisfy(card -> {
        assertThat(card.path("key").asText()).isEqualTo("weighted_forecast_amount");
        assertThat(card.path("label").asText()).isEqualTo("加权预测金额");
        assertThat(card.path("unit").asText()).isEqualTo("CNY");
        assertThat(card.path("value").decimalValue()).isGreaterThan(BigDecimal.ZERO);
    });
    assertThat(data.path("stage_funnel")).anySatisfy(stage -> {
        assertThat(stage.path("stage").asText()).isEqualTo("proposal");
        assertThat(stage.path("label").asText()).isEqualTo("商业方案");
        assertThat(stage.path("win_rate").decimalValue()).isEqualByComparingTo("0.45");
        assertThat(stage.path("drilldown_url").asText()).startsWith("/opportunities?stage=proposal");
    });
    assertThat(data.path("forecast_trend")).isNotEmpty();
    assertThat(data.path("attention_opportunities")).anySatisfy(item -> {
        assertThat(item.path("attention_reason").asText()).contains("停滞");
        assertThat(item.path("drilldown_url").asText()).startsWith("/opportunities?opportunity_id=");
    });
}

@Test
void funnelRequiresDashboardFunnelReadPermission() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    Long departmentId = createDepartment("funnel-forbidden-dept-" + suffix);
    TestUser user = createLoginReadyUser(
            "funnel_forbidden_" + suffix,
            departmentId,
            List.of("opportunity.read"),
            List.of("global"));

    ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/dashboard/funnel",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders(user.token(), "dashboard-funnel-forbidden-trace-001")),
            JsonNode.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
}
```

Add helper:

```java
private List<String> allDashboardPermissionsWithFunnel() {
    List<String> permissions = new ArrayList<>(allDashboardPermissions());
    permissions.add("dashboard.funnel.read");
    return permissions;
}
```

- [ ] **Step 2: Run RED test**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest test
```

Expected: fails because `/api/dashboard/funnel` is not implemented.

- [ ] **Step 3: Add response records**

Create records:

```java
public record DashboardFunnelResponse(
        Map<String, Object> filters,
        List<DashboardFunnelMetricCard> metric_cards,
        List<DashboardFunnelStage> stage_funnel,
        List<DashboardForecastTrendPoint> forecast_trend,
        List<DashboardAttentionOpportunity> attention_opportunities) {
}
```

```java
public record DashboardFunnelMetricCard(
        String key,
        String label,
        BigDecimal value,
        String unit,
        String drilldown_url) {
}
```

```java
public record DashboardFunnelStage(
        String stage,
        String label,
        long opportunity_count,
        BigDecimal forecast_amount,
        BigDecimal weighted_forecast_amount,
        BigDecimal win_rate,
        long stalled_count,
        long high_risk_count,
        String drilldown_url) {
}
```

```java
public record DashboardForecastTrendPoint(
        String month,
        long opportunity_count,
        BigDecimal forecast_amount,
        BigDecimal weighted_forecast_amount,
        long high_risk_count) {
}
```

```java
public record DashboardAttentionOpportunity(
        Long id,
        String opportunity_name,
        Long account_id,
        String stage,
        String stage_label,
        String risk_status,
        BigDecimal estimated_contract_amount,
        BigDecimal weighted_forecast_amount,
        LocalDate expected_close_date,
        OffsetDateTime last_activity_at,
        Long owner_user_id,
        String attention_reason,
        String drilldown_url) {
}
```

- [ ] **Step 4: Add controller method**

In `DashboardController`:

```java
@RequirePermission("dashboard.funnel.read")
@GetMapping("/funnel")
public ApiResponse<DashboardFunnelResponse> funnel(
        @AuthenticationPrincipal AuthenticatedUser user,
        DashboardFilter filter) {
    return ApiResponse.ok(dashboardService.funnel(user.userId(), filter));
}
```

- [ ] **Step 5: Implement service aggregation**

In `DashboardService`, add:

```java
public DashboardFunnelResponse funnel(Long userId, DashboardFilter requestedFilter) {
    DashboardFilter filter = normalizeFunnelFilter(requestedFilter);
    DomainAccess opportunity = access(userId, "opportunity", "opportunity.read", OPPORTUNITY_COLUMNS);
    List<DashboardFunnelStage> stages = funnelStages(filter, opportunity);
    return new DashboardFunnelResponse(
            filterMap(filter),
            funnelMetricCards(filter, stages, opportunity),
            stages,
            forecastTrend(filter, opportunity),
            attentionOpportunities(filter, opportunity));
}
```

Use fixed stage metadata:

```java
private static final List<StageMeta> FUNNEL_STAGES = List.of(
        new StageMeta("lead", "商业线索", new BigDecimal("0.10")),
        new StageMeta("validation", "商业验证", new BigDecimal("0.25")),
        new StageMeta("proposal", "商业方案", new BigDecimal("0.45")),
        new StageMeta("solution", "商业方案", new BigDecimal("0.45")),
        new StageMeta("negotiation", "商业谈判", new BigDecimal("0.65")),
        new StageMeta("contract", "合同推进", new BigDecimal("0.85")),
        new StageMeta("won", "商业成交", BigDecimal.ONE));
```

Aggregate with `estimated_contract_amount * coalesce(win_rate, stage_default_rate)`, count stalled using `coalesce(last_activity_at, updated_at) < current_timestamp - interval '14 days'`, and high risk using `risk_status in ('risk', 'high_risk')`.

- [ ] **Step 6: Run GREEN tests**

Run:

```bash
cd backend && mvn -Dtest=DashboardControllerTest test
```

Expected: tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/canicula/crmai/dashboard \
  backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java
git commit -m "feat: add dashboard funnel api"
```

---

## Task 3: OpenAPI Contract

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Test: `backend/src/test/java/com/canicula/crmai/api/OpenApiContractCoverageTest.java`

- [ ] **Step 1: Run RED contract test**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: fails because `GET /api/dashboard/funnel` is missing from OpenAPI.

- [ ] **Step 2: Add OpenAPI path**

Add under `paths`:

```yaml
  /api/dashboard/funnel:
    get:
      tags:
        - Dashboard
      summary: Sales funnel and opportunity forecast
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
        - name: risk_status
          in: query
          schema:
            type: string
      responses:
        "200":
          description: Sales funnel overview
```

- [ ] **Step 3: Run GREEN contract test**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add docs/openapi/crm-v1-openapi.yaml
git commit -m "docs: document dashboard funnel api"
```

---

## Task 4: Frontend Funnel Page

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add failing frontend tests**

In `App.test.tsx`, add `dashboardFunnel` mocked data:

```ts
dashboardFunnel: {
  filters: {},
  metric_cards: [
    { key: "active_count", label: "在办商机数", value: 3, unit: "count", drilldown_url: "/opportunities?status=following" },
    { key: "forecast_amount", label: "预测金额", value: 1280000, unit: "CNY", drilldown_url: "/opportunities" },
    { key: "weighted_forecast_amount", label: "加权预测金额", value: 620000, unit: "CNY", drilldown_url: "/opportunities" },
    { key: "stalled_count", label: "停滞商机数", value: 1, unit: "count", drilldown_url: "/opportunities?stalled=true" }
  ],
  stage_funnel: [
    { stage: "proposal", label: "商业方案", opportunity_count: 2, forecast_amount: 800000, weighted_forecast_amount: 360000, win_rate: 0.45, stalled_count: 1, high_risk_count: 1, drilldown_url: "/opportunities?stage=proposal" }
  ],
  forecast_trend: [
    { month: "2026-07", opportunity_count: 2, forecast_amount: 800000, weighted_forecast_amount: 360000, high_risk_count: 1 }
  ],
  attention_opportunities: [
    { id: 10, opportunity_name: "测试商机A", account_id: 1, stage: "proposal", stage_label: "商业方案", risk_status: "risk", estimated_contract_amount: 620000, weighted_forecast_amount: 279000, expected_close_date: "2026-07-31", last_activity_at: "2026-06-15T10:00:00+08:00", owner_user_id: 1001, attention_reason: "停滞超过14天", drilldown_url: "/opportunities?opportunity_id=10" }
  ]
}
```

Add test:

```ts
it("renders the V3 funnel forecast page with stage and attention drilldowns", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/dashboard/funnel");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "销售漏斗" })).toBeInTheDocument();
  expect(screen.getByText("加权预测金额")).toBeInTheDocument();
  expect(screen.getByText("商业方案")).toBeInTheDocument();
  expect(screen.getByText("预测分布")).toBeInTheDocument();
  expect(screen.getByText("测试商机A")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "测试商机A" })).toHaveAttribute("href", "/opportunities?opportunity_id=10");
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/funnel"), expect.anything());
  });
});
```

- [ ] **Step 2: Run RED frontend test**

Run:

```bash
cd frontend && npm test -- --run
```

Expected: fails because page/API types are missing.

- [ ] **Step 3: Add API types**

In `crm.ts`, add:

```ts
export type DashboardFunnel = {
  filters: Record<string, unknown>;
  metric_cards: DashboardFunnelMetricCard[];
  stage_funnel: DashboardFunnelStage[];
  forecast_trend: DashboardForecastTrendPoint[];
  attention_opportunities: DashboardAttentionOpportunity[];
};
```

and corresponding item types matching the backend response. Add:

```ts
funnel: (query?: QueryParams) => requestJson<DashboardFunnel>(withQuery("/api/dashboard/funnel", query))
```

- [ ] **Step 4: Add route and page**

In `App.tsx`:

```tsx
{ key: "/dashboard/funnel", label: "销售漏斗", icon: <GitBranch size={18} />, permission: "dashboard.funnel.read" }
```

Add route:

```tsx
<Route path="/dashboard/funnel" element={<DashboardFunnelPage />} />
```

Implement `DashboardFunnelPage` with:

- `PageTitle title="销售漏斗"`
- metric card grid
- stage funnel list
- forecast trend table
- attention opportunity table

- [ ] **Step 5: Add styles**

In `styles.css`, add classes:

```css
.dashboard-funnel__metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.dashboard-funnel__metric { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; background: #fff; }
.dashboard-funnel__stage-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.dashboard-funnel__stage { border: 1px solid #dbeafe; border-radius: 8px; padding: 12px; background: #f8fbff; }
.dashboard-funnel__columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 16px; }
```

- [ ] **Step 6: Run GREEN frontend tests and build**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```

Expected: tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/styles.css
git commit -m "feat: add dashboard funnel page"
```

---

## Task 5: Full Verification and UAT

**Files:**
- Create: `docs/testing/evidence/v3-funnel-forecast-2026-07-03.md`
- Create: `docs/testing/evidence/artifacts/v3-funnel-forecast-uat-20260703.png`
- Modify: `docs/product/crm-v3-development-todolist.md`

- [ ] **Step 1: Run full backend verification**

Run:

```bash
cd backend && mvn test
```

Expected: all backend tests pass.

- [ ] **Step 2: Run full frontend verification**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```

Expected: all frontend tests and build pass.

- [ ] **Step 3: Restart local UAT services**

Backend:

```bash
cd backend && CRM_DB_URL=jdbc:postgresql://localhost:55432/crm_ai CRM_DB_USERNAME=crm_ai CRM_DB_PASSWORD=crm_ai CRM_SEED_V1_DEMO_ENABLED=true mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

Frontend:

```bash
cd frontend && VITE_API_PROXY_TARGET=http://127.0.0.1:8081 npm run dev -- --host 127.0.0.1 --port 5175
```

- [ ] **Step 4: Browser UAT**

Open:

```text
http://127.0.0.1:5175/dashboard/funnel
```

Login with:

```text
demo_admin / S3cure!123
```

Verify visible text:

- `销售漏斗`
- `预测金额`
- `加权预测金额`
- `阶段漏斗`
- `预测分布`
- `待推进商机`

Verify:

- No `服务端异常`.
- No browser console application errors.
- Stage or opportunity drilldown enters `/opportunities`.

- [ ] **Step 5: Save evidence**

Create `docs/testing/evidence/v3-funnel-forecast-2026-07-03.md` with:

```markdown
# V3 销售漏斗与商机预测验收证据

日期：2026-07-03

## 自动化验证

| 命令 | 结果 |
|---|---|
| `mvn test` | 通过 |
| `npm test -- --run` | 通过 |
| `npm run build` | 通过 |

## 浏览器 UAT

- Frontend：`http://127.0.0.1:5175/dashboard/funnel`
- Backend：`http://127.0.0.1:8081`
- 登录账号：`demo_admin`
- 页面无服务端异常。
- 浏览器控制台无应用错误。
- 截图：`docs/testing/evidence/artifacts/v3-funnel-forecast-uat-20260703.png`
```

- [ ] **Step 6: Update TODOList**

In `docs/product/crm-v3-development-todolist.md`:

- Mark module 4 `Done`.
- Mark module 5 `Current`.
- Set current task to `v3-contract-dashboard-design`.
- Add verification commands and screenshot path.

- [ ] **Step 7: Commit and push**

```bash
git add docs/product/crm-v3-development-todolist.md docs/testing/evidence/v3-funnel-forecast-2026-07-03.md docs/testing/evidence/artifacts/v3-funnel-forecast-uat-20260703.png
git commit -m "test: add v3 funnel forecast evidence"
git push
```

---

## Final Verification Checklist

- [ ] `mvn -Dtest=DatabaseMigrationTest,DashboardControllerTest,OpenApiContractCoverageTest test` passes.
- [ ] `mvn test` passes.
- [ ] `npm test -- --run` passes.
- [ ] `npm run build` passes.
- [ ] `/dashboard/funnel` browser UAT passes.
- [ ] Evidence screenshot exists.
- [ ] TODOList shows module 4 Done and module 5 Current.
- [ ] Branch is pushed to `CaniculaW/crmAI.git`.
