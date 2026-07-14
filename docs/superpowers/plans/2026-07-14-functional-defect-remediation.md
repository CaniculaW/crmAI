# CRM AI Functional Defect Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 2026-07-14 公网功能测试发现的 3 个 P1、7 个 P2，并以同一 Git 提交升级公网环境后完成定点回归。

**Architecture:** 当前本地源码作为唯一修复基线。后端通过请求校验、服务层状态机、统一异常映射和数据库约束建立三层防线；前端在路由渲染前执行权限判断，并明确显示 AI 规则降级模式。全部改动先补失败测试，再做最小实现，最后构建同一提交并执行 Flyway V36 至最新迁移。

**Tech Stack:** Java 17, Spring Boot, JdbcTemplate, Flyway, JUnit 5, PostgreSQL/H2, React 18, TypeScript, Ant Design, Vitest, Chrome CDP, Docker Compose.

---

### Task 1: Contract Amount Integrity

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/contract/ContractControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/contract/ContractCreateRequest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/contract/ContractUpdateRequest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/contract/ContractService.java`
- Create: `backend/src/main/resources/db/migration/V39__enforce_positive_contract_amount.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`

- [x] **Step 1: Write failing create and update tests**

Add integration cases that submit `contract_amount: -1` on create and update, then assert HTTP 400, code `VALIDATION_ERROR`, and no negative row persisted.

```java
assertThat(response.status()).isEqualTo(HttpStatus.BAD_REQUEST.value());
assertThat(response.body().path("code").asText()).isEqualTo("VALIDATION_ERROR");
```

- [x] **Step 2: Verify the tests fail for the expected reason**

Run: `cd backend && mvn -Dtest=ContractControllerTest test`

Expected: the new negative amount tests fail because create/update currently accept the value.

- [x] **Step 3: Add application and database validation**

Apply `@Positive` to both request records, call a service-layer helper before create/update persistence, and add this migration:

```sql
alter table crm_contracts
    add constraint ck_crm_contracts_positive_amount
    check (contract_amount > 0);
```

- [x] **Step 4: Verify controller and migration tests pass**

Run: `cd backend && mvn -Dtest=ContractControllerTest,DatabaseMigrationTest test`

Expected: all selected tests pass and V39 is applied.

- [x] **Step 5: Commit the integrity fix**

```bash
git add backend/src/main/java/com/canicula/crmai/contract backend/src/main/resources/db/migration/V39__enforce_positive_contract_amount.sql backend/src/test/java/com/canicula/crmai/contract/ContractControllerTest.java backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java
git commit -m "fix: enforce positive contract amounts"
```

### Task 2: API Error Contract

**Files:**
- Create: `backend/src/main/java/com/canicula/crmai/api/ResourceNotFoundException.java`
- Modify: `backend/src/main/java/com/canicula/crmai/api/ApiExceptionHandler.java`
- Modify: `backend/src/test/java/com/canicula/crmai/api/ApiResponseContractTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/account/AccountService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/account/AccountControllerTest.java`

- [x] **Step 1: Write failing 404 and 400 contract tests**

Add tests for an unknown `/api/...` route, a missing readable account, and a probe controller throwing `IllegalArgumentException`.

```java
assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
assertThat(response.getBody()).containsEntry("code", "NOT_FOUND");
```

- [x] **Step 2: Verify the tests currently return 500**

Run: `cd backend && mvn -Dtest=ApiResponseContractTest,AccountControllerTest test`

Expected: new cases fail with HTTP 500.

- [x] **Step 3: Add explicit exception mappings**

Create `ResourceNotFoundException`; map it and `NoResourceFoundException` to 404 `NOT_FOUND`; map `IllegalArgumentException` and parameter conversion errors to 400 `VALIDATION_ERROR`. Change `AccountService.readableDetail` to throw the dedicated not-found exception.

```java
@ExceptionHandler({ResourceNotFoundException.class, NoResourceFoundException.class})
ResponseEntity<ApiResponse<Map<String, Object>>> handleNotFound(Exception exception, HttpServletRequest request) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error("NOT_FOUND", exception.getMessage(), Map.of(), TraceIdFilter.currentTraceId(request)));
}
```

- [x] **Step 4: Verify the error contract tests pass**

Run: `cd backend && mvn -Dtest=ApiResponseContractTest,AccountControllerTest test`

Expected: all selected tests pass with preserved trace IDs.

- [x] **Step 5: Commit the error contract fix**

```bash
git add backend/src/main/java/com/canicula/crmai/api backend/src/main/java/com/canicula/crmai/account/AccountService.java backend/src/test/java/com/canicula/crmai/api/ApiResponseContractTest.java backend/src/test/java/com/canicula/crmai/account/AccountControllerTest.java
git commit -m "fix: map client API errors to stable 4xx responses"
```

### Task 3: Activity Completion State Machine

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/activity/ActivityControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/activity/ActivityService.java`

- [x] **Step 1: Write a failing duplicate completion test**

Complete one activity twice and assert the second request returns 409 while `completed_at`, account/opportunity summaries, and `activity.complete` audit count remain unchanged.

- [x] **Step 2: Verify duplicate completion currently succeeds**

Run: `cd backend && mvn -Dtest=ActivityControllerTest test`

Expected: the second completion returns 200, causing the new assertion to fail.

- [x] **Step 3: Enforce a single state transition**

Before updating, reject an already completed activity and add `activity_status <> 'completed'` to the update predicate. Check the update count before replacing risks or backfilling linked records.

```java
if ("completed".equalsIgnoreCase(current.activity_status())) {
    throw new BusinessRuleException("销售行动已完成，不能重复完成");
}
```

- [x] **Step 4: Verify the activity suite passes**

Run: `cd backend && mvn -Dtest=ActivityControllerTest test`

Expected: all activity tests pass.

- [x] **Step 5: Commit the state-machine fix**

```bash
git add backend/src/main/java/com/canicula/crmai/activity/ActivityService.java backend/src/test/java/com/canicula/crmai/activity/ActivityControllerTest.java
git commit -m "fix: prevent duplicate activity completion"
```

### Task 4: Weekly and Dashboard Date Validation

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/activity/ActivityControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/weekly/WeeklyProgressController.java`
- Modify: `backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java`

- [x] **Step 1: Write failing invalid-date tests**

Assert `month=2026-13` returns 400 and each dashboard endpoint rejects `date_from=2026-08-01&date_to=2026-07-01` with 400 `VALIDATION_ERROR`.

- [x] **Step 2: Verify current behavior is 500/200**

Run: `cd backend && mvn -Dtest=ActivityControllerTest,DashboardControllerTest test`

Expected: invalid month returns 500 and inverted dashboard range returns 200.

- [x] **Step 3: Validate before service invocation**

Catch invalid `YearMonth` through the common 400 mapping and add one controller helper called by all six dashboard endpoints:

```java
private static void validateDateRange(LocalDate dateFrom, LocalDate dateTo) {
    if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
        throw new IllegalArgumentException("开始日期不能晚于结束日期");
    }
}
```

- [x] **Step 4: Verify date validation suites pass**

Run: `cd backend && mvn -Dtest=ActivityControllerTest,DashboardControllerTest test`

Expected: all selected tests pass.

- [x] **Step 5: Commit the date validation fix**

```bash
git add backend/src/main/java/com/canicula/crmai/weekly/WeeklyProgressController.java backend/src/main/java/com/canicula/crmai/dashboard/DashboardController.java backend/src/test/java/com/canicula/crmai/activity/ActivityControllerTest.java backend/src/test/java/com/canicula/crmai/dashboard/DashboardControllerTest.java
git commit -m "fix: reject invalid reporting date filters"
```

### Task 5: System Route Authorization

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`

- [x] **Step 1: Write failing direct-route tests**

For a user with only `account.read`, navigate directly to every system child route and assert the page redirects to the workbench without requesting the protected API or rendering management controls.

- [x] **Step 2: Verify `/system/users` currently renders**

Run: `cd frontend && npm test -- --run src/App.test.tsx`

Expected: the new direct-route test fails because `SystemPage` renders before the API returns 403.

- [x] **Step 3: Guard all system routes before rendering**

Use the existing `Navigate` pattern with these permissions: departments/users `system.user.manage`, roles `system.role.manage`, audit logs `system.audit.read`, dictionaries `system.dict.manage`, AI config `system.ai-config.manage`; `/system` requires any system permission.

- [x] **Step 4: Verify frontend route tests pass**

Run: `cd frontend && npm test -- --run src/App.test.tsx`

Expected: all App tests pass and no protected API is called.

- [x] **Step 5: Commit the frontend permission fix**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "fix: guard system management routes by permission"
```

### Task 6: AI Fallback Transparency

**Files:**
- Modify: `backend/src/main/java/com/canicula/crmai/ai/AiContextSummaryResponse.java`
- Modify: `backend/src/main/java/com/canicula/crmai/ai/AiContextService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/ai/AiContextControllerTest.java`
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing backend and UI tests**

Assert the context summary contains `generation_mode: rules_fallback` and a Chinese notice when no enabled model exists; assert the AI workbench renders that notice.

- [ ] **Step 2: Verify the fields and notice are absent**

Run: `cd backend && mvn -Dtest=AiContextControllerTest test`

Run: `cd frontend && npm test -- --run src/App.test.tsx`

Expected: both new assertions fail.

- [ ] **Step 3: Return and display generation provenance**

Extend the summary contract with `generation_mode` and `generation_notice`. Determine `openai` only when an enabled OpenAI configuration exists; otherwise return `rules_fallback` and `当前未启用 OpenAI 模型，以下内容由业务规则辅助生成，未调用远程模型。`. Render the notice as an Ant Design info `Alert` under the page title.

- [ ] **Step 4: Verify backend and frontend AI tests pass**

Run: `cd backend && mvn -Dtest=AiContextControllerTest test`

Run: `cd frontend && npm test -- --run src/App.test.tsx`

Expected: all selected tests pass.

- [ ] **Step 5: Commit the AI transparency fix**

```bash
git add backend/src/main/java/com/canicula/crmai/ai backend/src/test/java/com/canicula/crmai/ai/AiContextControllerTest.java frontend/src/api/crm.ts frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "fix: disclose AI rules fallback mode"
```

### Task 7: Browser Smoke Cleanup Reliability

**Files:**
- Modify: `frontend/scripts/v1-browser-smoke.mjs`
- Modify: `frontend/src/browser-smoke.test.ts`

- [ ] **Step 1: Add a failing cleanup retry unit test**

Export a cleanup helper and inject a remover that fails once with `EBUSY`; assert it retries and completes on the second attempt.

- [ ] **Step 2: Verify the helper does not exist**

Run: `cd frontend && npm test -- --run src/browser-smoke.test.ts`

Expected: the new test fails because the cleanup helper is not exported.

- [ ] **Step 3: Add bounded cleanup retries**

Implement three attempts with a short delay for `EBUSY`, `EPERM`, and `ENOTEMPTY`; rethrow all other errors and the final transient error.

- [ ] **Step 4: Verify browser smoke tests pass**

Run: `cd frontend && npm test -- --run src/browser-smoke.test.ts`

Expected: all selected tests pass.

- [ ] **Step 5: Commit the test-tool fix**

```bash
git add frontend/scripts/v1-browser-smoke.mjs frontend/src/browser-smoke.test.ts
git commit -m "test: retry Chrome smoke profile cleanup"
```

### Task 8: Full Regression, Deployment, and Public Acceptance

**Files:**
- Modify: `docs/testing/deployed-functional-test-todolist-2026-07-14.md`
- Create: `docs/testing/evidence/functional-defect-remediation-regression-2026-07-14.md`

- [ ] **Step 1: Run full local verification**

Run: `cd backend && mvn test`

Run: `cd frontend && npm test -- --run`

Run: `cd frontend && npm run build`

Expected: all backend and frontend tests pass and the production build succeeds.

- [ ] **Step 2: Verify PostgreSQL migrations and local browser flows**

Run: `cd backend && mvn verify -Ppostgres-it`

Run the local API and Chrome smoke commands documented in the functional test checklist. Expected: V39 is current, system pages respect permissions, and Chrome exits successfully after cleanup.

- [ ] **Step 3: Prepare the public database safely**

Back up the public database. Query only the test contract identified by `FT-FIN-0714-负金额异常`; delete that explicit test row after confirming its ID and no dependent business rows. Do not mutate any other contract.

- [ ] **Step 4: Deploy one Git commit**

Build and deploy frontend/backend from the same checked-out commit. Confirm `/actuator/health`, Flyway V39, current frontend asset hash, approval routes, and administrator approval permissions before functional requests.

- [ ] **Step 5: Execute public defect regression**

Re-run all ten defect reproductions: negative contract amount, disabled-session invalidation, approval availability, unknown route 404, missing account 404, duplicate activity completion 409, invalid month 400, inverted dashboard dates 400, direct system route redirect, and AI fallback notice. Re-run V4 API smoke, approval end-to-end, RBAC new-account login, mobile navigation, and system browser smoke.

- [ ] **Step 6: Update acceptance evidence**

Record request IDs, response status, screenshots, deployed commit, Flyway version, and pass/fail result in the evidence report. Mark each checklist item complete only after its evidence exists.

- [ ] **Step 7: Commit the acceptance record**

```bash
git add docs/testing/deployed-functional-test-todolist-2026-07-14.md docs/testing/evidence/functional-defect-remediation-regression-2026-07-14.md
git commit -m "test: record functional defect remediation acceptance"
```
