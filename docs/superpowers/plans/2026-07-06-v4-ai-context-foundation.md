# V4 AI Context Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V4 AI context foundation so the AI sales copilot can retrieve permission-safe, evidence-backed CRM context for accounts, contacts, opportunities, activities, solution documents, contracts, receivables, and risk signals.

**Architecture:** Add a read-only `ai` backend module that aggregates existing CRM objects through the current permission model and exposes context APIs for later V4 modules. Add frontend API types and an AI assistant context preview page as the first visible entry point, while keeping generation, draft writing, and recommendation persistence for later modules.

**Tech Stack:** Spring Boot, JdbcTemplate, Flyway, JUnit/TestRestTemplate, OpenAPI YAML, React, TypeScript, Ant Design, Vite.

---

## Module Progress

```text
V4 当前进度：
- 总模块：11
- 已完成：1
- 当前模块：AI 上下文底座
- 当前步骤：Step 1 模块启动 -> Step 4 API 契约设计
- 当前 TODO：实现只读 AI 上下文 API、证据模型、权限、OpenAPI、前端上下文预览
- 完成标准：上下文 API 能返回当前用户可见的销售作战信息和证据链接
- 本轮预计产出：后端上下文聚合 API、前端 AI 助手入口、定向测试、OpenAPI 覆盖、提交推送

上一模块：
- 状态：Done
- 验证结果：V4 重新定位文档已提交并通过 GitHub Actions 3/3
- 提交号：89adb61a9b47757e702852910479ce4094e24b05
- 遗留问题：无
```

## Scope

This module does:

- Add `GET /api/ai-context/summary` for the current user's AI sales context overview.
- Add `GET /api/ai-context/accounts/{accountId}` for account-centered evidence.
- Add `GET /api/ai-context/opportunities/{opportunityId}` for opportunity-centered evidence.
- Return evidence items with `object_type`, `object_id`, `title`, `summary`, `occurred_at`, and `drilldown_url`.
- Respect existing `ai.context.read` permission plus object-level readable data scope.
- Add AI menu entry and a context preview page at `/ai-assistant`.
- Document all new runtime endpoints in `docs/openapi/crm-v1-openapi.yaml`.

This module does not:

- Call an LLM provider.
- Generate weekly reports, opportunity analysis, visit plans, or communication advice.
- Create CRM drafts.
- Write CRM master data.
- Store AI recommendations.

## File Structure

- Create `backend/src/main/java/com/canicula/crmai/ai/AiContextController.java`
  - Owns `/api/ai-context/**` routes and permission annotation.
- Create `backend/src/main/java/com/canicula/crmai/ai/AiContextService.java`
  - Aggregates existing CRM data and evidence through readable services and targeted SQL.
- Create `backend/src/main/java/com/canicula/crmai/ai/AiContextSummaryResponse.java`
  - Summary API response.
- Create `backend/src/main/java/com/canicula/crmai/ai/AiAccountContextResponse.java`
  - Account context API response.
- Create `backend/src/main/java/com/canicula/crmai/ai/AiOpportunityContextResponse.java`
  - Opportunity context API response.
- Create `backend/src/main/java/com/canicula/crmai/ai/AiEvidenceItem.java`
  - Shared evidence item record.
- Create `backend/src/main/resources/db/migration/V27__create_ai_context_permissions.sql`
  - Seeds `ai.context.read`.
- Create `backend/src/test/java/com/canicula/crmai/ai/AiContextControllerTest.java`
  - TDD coverage for context payloads and permission denial.
- Modify `docs/openapi/crm-v1-openapi.yaml`
  - Add the three `/api/ai-context/**` paths and response schemas.
- Modify `frontend/src/api/crm.ts`
  - Add AI context TypeScript types and `crmApi.aiContext`.
- Modify `frontend/src/App.tsx`
  - Add `AI助手` menu item and `/ai-assistant` page showing context preview.
- Modify `frontend/src/App.test.tsx`
  - Add frontend smoke coverage for AI assistant navigation and context sections.
- Modify `docs/product/crm-v4-development-todolist.md`
  - Mark module 1 Done and module 2 Current with step-level status.

## Data Contract

Use these response shapes:

```java
public record AiEvidenceItem(
        String object_type,
        Long object_id,
        String title,
        String summary,
        OffsetDateTime occurred_at,
        String drilldown_url) {
}
```

```java
public record AiContextSummaryResponse(
        List<AccountResponse> accounts,
        List<OpportunityResponse> opportunities,
        List<ActivityResponse> recent_activities,
        List<DashboardRiskItem> risk_signals,
        List<AiEvidenceItem> evidence) {
}
```

```java
public record AiAccountContextResponse(
        AccountResponse account,
        List<ContactResponse> contacts,
        List<OpportunityResponse> opportunities,
        List<ActivityResponse> recent_activities,
        List<SolutionDocumentResponse> solutions,
        List<ContractResponse> contracts,
        List<ReceivablePlanResponse> receivables,
        List<AiEvidenceItem> evidence) {
}
```

```java
public record AiOpportunityContextResponse(
        OpportunityResponse opportunity,
        AccountResponse account,
        List<ContactResponse> contacts,
        List<ActivityResponse> recent_activities,
        List<SolutionDocumentResponse> solutions,
        List<ContractResponse> contracts,
        List<ReceivablePlanResponse> receivables,
        List<AiEvidenceItem> evidence) {
}
```

## Task 1: Backend Permission And Summary Context

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/ai/AiContextControllerTest.java`
- Create: `backend/src/main/resources/db/migration/V27__create_ai_context_permissions.sql`
- Create: `backend/src/main/java/com/canicula/crmai/ai/AiContextController.java`
- Create: `backend/src/main/java/com/canicula/crmai/ai/AiContextService.java`
- Create: `backend/src/main/java/com/canicula/crmai/ai/AiContextSummaryResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/ai/AiEvidenceItem.java`

- [ ] **Step 1: Write the failing summary context test**

Add `summaryReturnsOnlyReadableSalesContextWithEvidence()` to `AiContextControllerTest`.

```java
ResponseEntity<JsonNode> response = restTemplate.exchange(
        "/api/ai-context/summary",
        HttpMethod.GET,
        new HttpEntity<>(authHeaders(user.token(), "ai-context-summary-trace-001")),
        JsonNode.class);

assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
JsonNode data = response.getBody().path("data");
assertThat(data.path("accounts")).anySatisfy(account ->
        assertThat(account.path("account_name").asText()).isEqualTo("AI上下文客户-" + suffix));
assertThat(data.path("opportunities")).anySatisfy(opportunity ->
        assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("AI上下文商机-" + suffix));
assertThat(data.path("recent_activities")).anySatisfy(activity ->
        assertThat(activity.path("subject").asText()).isEqualTo("AI上下文拜访-" + suffix));
assertThat(data.path("evidence")).anySatisfy(evidence -> {
    assertThat(evidence.path("object_type").asText()).isEqualTo("activity");
    assertThat(evidence.path("drilldown_url").asText()).startsWith("/activities");
});
```

- [ ] **Step 2: Run the summary test to verify RED**

Run: `mvn -Dtest=AiContextControllerTest test`

Expected: FAIL because `GET /api/ai-context/summary` is not mapped.

- [ ] **Step 3: Seed AI context permission**

Create `V27__create_ai_context_permissions.sql`.

```sql
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'ai.context.read', '查看AI上下文', 'operation', 'ai', 1300
where not exists (
    select 1 from sys_permissions where permission_code = 'ai.context.read'
);
```

- [ ] **Step 4: Implement minimal summary endpoint**

Create `AiContextController` with:

```java
@RestController
class AiContextController {
    private final AiContextService aiContextService;

    AiContextController(AiContextService aiContextService) {
        this.aiContextService = aiContextService;
    }

    @RequirePermission("ai.context.read")
    @GetMapping("/api/ai-context/summary")
    AiContextSummaryResponse summary(HttpServletRequest request) {
        return aiContextService.summary(currentUserId(request));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
```

Create `AiContextService.summary()` by calling existing readable services:

```java
List<AccountResponse> accounts = accountService.readableList(userId, emptyAccountFilter()).stream().limit(8).toList();
List<OpportunityResponse> opportunities = opportunityService.readableList(userId, followingOpportunityFilter()).stream().limit(8).toList();
List<ActivityResponse> activities = activityService.readableList(userId, recentActivityFilter()).stream().limit(10).toList();
List<AiEvidenceItem> evidence = activities.stream().map(this::activityEvidence).toList();
return new AiContextSummaryResponse(accounts, opportunities, activities, List.of(), evidence);
```

- [ ] **Step 5: Run the summary test to verify GREEN**

Run: `mvn -Dtest=AiContextControllerTest test`

Expected: PASS for the summary test.

- [ ] **Step 6: Add permission denial test**

Add `summaryRequiresAiContextReadPermission()`.

```java
ResponseEntity<JsonNode> response = restTemplate.exchange(
        "/api/ai-context/summary",
        HttpMethod.GET,
        new HttpEntity<>(authHeaders(userWithoutAiPermission.token(), "ai-context-forbidden-trace-001")),
        JsonNode.class);

assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
```

- [ ] **Step 7: Run permission test to verify GREEN**

Run: `mvn -Dtest=AiContextControllerTest test`

Expected: PASS.

## Task 2: Account And Opportunity Context APIs

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/ai/AiContextControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/ai/AiContextController.java`
- Modify: `backend/src/main/java/com/canicula/crmai/ai/AiContextService.java`
- Create: `backend/src/main/java/com/canicula/crmai/ai/AiAccountContextResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/ai/AiOpportunityContextResponse.java`

- [ ] **Step 1: Write failing account context test**

Assert `GET /api/ai-context/accounts/{accountId}` returns the account, contacts, opportunities, recent activities, business execution records, and evidence.

```java
ResponseEntity<JsonNode> response = restTemplate.exchange(
        "/api/ai-context/accounts/" + fixture.accountId(),
        HttpMethod.GET,
        new HttpEntity<>(authHeaders(user.token(), "ai-account-context-trace-001")),
        JsonNode.class);

JsonNode data = response.getBody().path("data");
assertThat(data.path("account").path("id").asLong()).isEqualTo(fixture.accountId());
assertThat(data.path("contacts")).isNotEmpty();
assertThat(data.path("opportunities")).isNotEmpty();
assertThat(data.path("recent_activities")).isNotEmpty();
assertThat(data.path("evidence")).anySatisfy(evidence ->
        assertThat(evidence.path("drilldown_url").asText()).startsWith("/accounts"));
```

- [ ] **Step 2: Run account context test to verify RED**

Run: `mvn -Dtest=AiContextControllerTest test`

Expected: FAIL because the account context route is not mapped.

- [ ] **Step 3: Implement account context route and service**

Add:

```java
@RequirePermission("ai.context.read")
@GetMapping("/api/ai-context/accounts/{accountId}")
AiAccountContextResponse accountContext(@PathVariable Long accountId, HttpServletRequest request) {
    return aiContextService.accountContext(accountId, currentUserId(request));
}
```

Service behavior:

- `accountService.readableDetail(accountId, userId)` guards account access.
- `contactService.readableList(userId, new ContactListFilter(null, accountId, null, null, null, null, null, null, null))`
- `opportunityService.readableList(userId, new OpportunityListFilter(null, accountId, null, null, null, null, null, null, null, null, null, null, null, false))`
- `activityService.readableList(userId, new ActivityListFilter(null, accountId, null, null, null, null, null, null, null, null, null, null, null))`
- Read solutions/contracts/receivables through existing readable list services or direct SQL guarded by account access.

- [ ] **Step 4: Run account context test to verify GREEN**

Run: `mvn -Dtest=AiContextControllerTest test`

Expected: PASS.

- [ ] **Step 5: Write failing opportunity context test**

Assert `GET /api/ai-context/opportunities/{opportunityId}` returns opportunity, account, contacts, activities, business execution records, and evidence.

```java
ResponseEntity<JsonNode> response = restTemplate.exchange(
        "/api/ai-context/opportunities/" + fixture.opportunityId(),
        HttpMethod.GET,
        new HttpEntity<>(authHeaders(user.token(), "ai-opportunity-context-trace-001")),
        JsonNode.class);

JsonNode data = response.getBody().path("data");
assertThat(data.path("opportunity").path("id").asLong()).isEqualTo(fixture.opportunityId());
assertThat(data.path("account").path("id").asLong()).isEqualTo(fixture.accountId());
assertThat(data.path("recent_activities")).isNotEmpty();
assertThat(data.path("evidence")).anySatisfy(evidence ->
        assertThat(evidence.path("drilldown_url").asText()).startsWith("/opportunities"));
```

- [ ] **Step 6: Run opportunity context test to verify RED**

Run: `mvn -Dtest=AiContextControllerTest test`

Expected: FAIL because the opportunity context route is not mapped.

- [ ] **Step 7: Implement opportunity context route and service**

Add:

```java
@RequirePermission("ai.context.read")
@GetMapping("/api/ai-context/opportunities/{opportunityId}")
AiOpportunityContextResponse opportunityContext(@PathVariable Long opportunityId, HttpServletRequest request) {
    return aiContextService.opportunityContext(opportunityId, currentUserId(request));
}
```

Service behavior:

- `opportunityService.readableDetail(opportunityId, userId)` guards opportunity access.
- Load the linked account with `accountService.readableDetail(opportunity.account_id(), userId)`.
- Load contacts by account and contact roles.
- Load activities by opportunity.
- Load solution, contract, and receivable records by opportunity where available.
- Build evidence from opportunity, account, latest activities, risk fields, solution status, contract status, and receivable overdue fields.

- [ ] **Step 8: Run opportunity context test to verify GREEN**

Run: `mvn -Dtest=AiContextControllerTest test`

Expected: PASS.

## Task 3: OpenAPI Contract Coverage

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Test: `backend/src/test/java/com/canicula/crmai/api/OpenApiContractCoverageTest.java`

- [ ] **Step 1: Run OpenAPI coverage to verify RED**

Run: `mvn -Dtest=OpenApiContractCoverageTest test`

Expected: FAIL because the new `/api/ai-context/**` endpoints are not documented.

- [ ] **Step 2: Add OpenAPI paths**

Document:

```yaml
  /api/ai-context/summary:
    get:
      summary: AI context summary
      tags: [AI Context]
  /api/ai-context/accounts/{accountId}:
    get:
      summary: AI account context
      tags: [AI Context]
  /api/ai-context/opportunities/{opportunityId}:
    get:
      summary: AI opportunity context
      tags: [AI Context]
```

Add schemas for `AiEvidenceItem`, `AiContextSummaryResponse`, `AiAccountContextResponse`, and `AiOpportunityContextResponse` using existing CRM object schemas by reference when possible.

- [ ] **Step 3: Run OpenAPI coverage to verify GREEN**

Run: `mvn -Dtest=OpenApiContractCoverageTest test`

Expected: PASS.

## Task 4: Frontend AI Assistant Context Preview

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing frontend navigation test**

Add an app test that renders a user with `ai.context.read`, expects `AI助手` in navigation, and verifies the page displays context sections.

```tsx
expect(await screen.findByText("AI助手")).toBeInTheDocument();
await userEvent.click(screen.getByText("AI助手"));
expect(await screen.findByText("AI上下文")).toBeInTheDocument();
expect(screen.getByText("客户上下文")).toBeInTheDocument();
expect(screen.getByText("商机上下文")).toBeInTheDocument();
expect(screen.getByText("近期销售行动")).toBeInTheDocument();
expect(screen.getByText("证据链")).toBeInTheDocument();
```

- [ ] **Step 2: Run frontend test to verify RED**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because the AI assistant nav/page is not implemented.

- [ ] **Step 3: Add frontend API types**

Add:

```ts
export type AiEvidenceItem = {
  object_type: string;
  object_id: number;
  title: string;
  summary?: string;
  occurred_at?: string;
  drilldown_url: string;
};

export type AiContextSummary = {
  accounts: Account[];
  opportunities: Opportunity[];
  recent_activities: Activity[];
  risk_signals: DashboardRiskItem[];
  evidence: AiEvidenceItem[];
};
```

Add:

```ts
aiContext: {
  summary: () => requestJson<AiContextSummary>("/api/ai-context/summary"),
  account: (id: number) => requestJson<AiAccountContext>(`/api/ai-context/accounts/${id}`),
  opportunity: (id: number) => requestJson<AiOpportunityContext>(`/api/ai-context/opportunities/${id}`)
}
```

- [ ] **Step 4: Add AI menu and page**

Add nav item:

```tsx
{ key: "/ai-assistant", label: "AI助手", icon: <Sparkles size={18} />, permission: "ai.context.read" }
```

Add route:

```tsx
<Route path="/ai-assistant" element={<AiAssistantPage />} />
```

Add `AiAssistantPage` using `useObjectResource(crmApi.aiContext.summary, emptyAiContextSummary)` and render four compact sections: 客户上下文、商机上下文、近期销售行动、证据链.

- [ ] **Step 5: Run frontend test to verify GREEN**

Run: `npm test -- --run src/App.test.tsx`

Expected: PASS.

## Task 5: Module Verification And TODO Update

**Files:**
- Modify: `docs/product/crm-v4-development-todolist.md`

- [ ] **Step 1: Run backend focused tests**

Run: `mvn -Dtest=AiContextControllerTest,OpenApiContractCoverageTest test`

Expected: PASS.

- [ ] **Step 2: Run frontend focused tests**

Run: `npm test -- --run src/App.test.tsx`

Expected: PASS.

- [ ] **Step 3: Run build verification**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Update V4 TODOList**

Set module 2 current task to Done only after all verification commands pass. Set module 3 `AI 文本录入与草稿确认` to Current.

- [ ] **Step 5: Commit and push**

```bash
git add backend/src/main/java/com/canicula/crmai/ai backend/src/test/java/com/canicula/crmai/ai backend/src/main/resources/db/migration/V27__create_ai_context_permissions.sql frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/App.test.tsx docs/openapi/crm-v1-openapi.yaml docs/product/crm-v4-development-todolist.md docs/superpowers/plans/2026-07-06-v4-ai-context-foundation.md
git commit -m "feat: add v4 ai context foundation"
git push origin main
```

## Self-Review

- Spec coverage: covers V4 module 2 context foundation, permissions, evidence links, OpenAPI, frontend entry, and verification.
- Placeholder scan: passed; no incomplete implementation markers remain.
- Type consistency: Java and TypeScript response names align with the API paths and V4 design document.
- Scope check: AI generation, draft confirmation, recommendation records, logs, and UAT are intentionally deferred to later V4 modules.
