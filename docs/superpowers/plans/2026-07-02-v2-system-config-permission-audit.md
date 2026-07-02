# V2 System Config Permission Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete V2 governance coverage for dictionaries, permissions, role authorization, audit logs, and data permission regression before full V2 UAT.

**Architecture:** Keep `系统` as a first-level menu with independent child pages. Add narrowly scoped backend governance coverage through migration and dictionary audit logging, then improve frontend role/audit/dictionary visibility without changing the existing permission model.

**Tech Stack:** Spring Boot, Java 17, JdbcTemplate, Flyway, JUnit, React, TypeScript, Ant Design, Vitest.

---

## File Structure

- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
  - Assert V2 dictionary types/items and governance migration coverage.
- Create: `backend/src/main/resources/db/migration/V20__complete_v2_system_governance.sql`
  - Seed missing V2 dictionary types/items and grant admin role coverage with idempotent inserts.
- Modify: `backend/src/test/java/com/canicula/crmai/system/DictionaryControllerTest.java`
  - Add failing tests for dictionary write audit logs.
- Modify: `backend/src/main/java/com/canicula/crmai/system/DictionaryController.java`
  - Record audit logs for dictionary type create, item create, and item update.
- Modify: `backend/src/test/java/com/canicula/crmai/identity/DataPermissionServiceTest.java`
  - Add V2 data permission regression cases using existing data scope service.
- Modify: `frontend/src/App.test.tsx`
  - Add tests for V2 permission grouping, audit filters, and system overview coverage summary.
- Modify: `frontend/src/App.tsx`
  - Add permission grouping in role authorization, audit filter UI, V2 quick filters, and overview governance summary.
- Modify: `docs/product/crm-v2-development-todolist.md`
  - Track module 8 progress and completion evidence.

## Task 1: V2 Dictionary And Permission Coverage Migration

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Create: `backend/src/main/resources/db/migration/V20__complete_v2_system_governance.sql`

- [ ] **Step 1: Write the failing migration coverage test**

Add this query block before assertions in `appliesInitialSystemDictionaryMigration()`:

```java
Integer v2DictionaryTypeCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from sys_dict_types
        where dict_code in (
          'solution_doc_type', 'solution_status', 'solution_self_check_result',
          'contract_type', 'contract_status', 'contract_change_type', 'contract_milestone_status',
          'invoice_status', 'invoice_type', 'invoice_exception_type',
          'receivable_plan_status', 'payment_status', 'payment_method', 'receivable_follow_up_result',
          'reconciliation_status', 'reconciliation_source'
        )
        """,
        Integer.class);
Integer v2DictionaryItemCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from sys_dict_items i
        join sys_dict_types t on t.id = i.dict_type_id
        where t.dict_code in (
          'solution_doc_type', 'solution_status', 'solution_self_check_result',
          'contract_type', 'contract_status', 'contract_change_type', 'contract_milestone_status',
          'invoice_status', 'invoice_type', 'invoice_exception_type',
          'receivable_plan_status', 'payment_status', 'payment_method', 'receivable_follow_up_result',
          'reconciliation_status', 'reconciliation_source'
        )
          and i.is_active = true
        """,
        Integer.class);
```

Add assertions:

```java
assertThat(v2DictionaryTypeCount).isEqualTo(16);
assertThat(v2DictionaryItemCount).isGreaterThanOrEqualTo(40);
```

- [ ] **Step 2: Run the backend test and verify it fails**

Run:

```bash
mvn -Dtest=DatabaseMigrationTest test
```

Expected: fail because at least one V2 dictionary type or item is missing.

- [ ] **Step 3: Add the idempotent Flyway migration**

Create `backend/src/main/resources/db/migration/V20__complete_v2_system_governance.sql` with idempotent inserts for the 16 V2 dictionary types and their core active items. Use `insert ... select ... where not exists` matching existing migration style. Include at least:

```sql
-- V2 governance dictionary coverage.
insert into sys_dict_types (dict_code, dict_name, description)
select 'solution_doc_type', '方案材料类型', 'V2 方案与标书材料分类'
where not exists (select 1 from sys_dict_types where dict_code = 'solution_doc_type');

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order, is_active)
select t.id, 'proposal', '商业方案', 10, true
from sys_dict_types t
where t.dict_code = 'solution_doc_type'
  and not exists (
    select 1 from sys_dict_items i where i.dict_type_id = t.id and i.item_code = 'proposal'
  );
```

Repeat for the remaining V2 types and items from the design spec.

- [ ] **Step 4: Run the backend test and verify it passes**

Run:

```bash
mvn -Dtest=DatabaseMigrationTest test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java backend/src/main/resources/db/migration/V20__complete_v2_system_governance.sql
git commit -m "feat: seed v2 system governance dictionaries"
```

## Task 2: Dictionary Write Audit Logging

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/system/DictionaryControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/system/DictionaryController.java`

- [ ] **Step 1: Write the failing audit test**

In `createsAndDisablesDictionaryItems()`, after the existing response assertions, add:

```java
Integer typeAuditCount = auditCount("system.dict.type.create", "dict_type", dictTypeId);
Integer itemCreateAuditCount = auditCount("system.dict.item.create", "dict_item", itemId);
Integer itemUpdateAuditCount = auditCount("system.dict.item.update", "dict_item", itemId);

assertThat(typeAuditCount).isEqualTo(1);
assertThat(itemCreateAuditCount).isEqualTo(1);
assertThat(itemUpdateAuditCount).isEqualTo(1);
```

Add helper:

```java
private Integer auditCount(String actionCode, String objectType, Long objectId) {
    return jdbcTemplate.queryForObject(
            """
            select count(*)
            from sys_audit_logs
            where action_code = ?
              and object_type = ?
              and object_id = ?
            """,
            Integer.class,
            actionCode,
            objectType,
            objectId);
}
```

Inject `JdbcTemplate` into the test.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
mvn -Dtest=DictionaryControllerTest test
```

Expected: fail because dictionary write actions do not yet create audit records.

- [ ] **Step 3: Implement dictionary audit logging**

Modify `DictionaryController` constructor to accept `AuditLogService`. Add `HttpServletRequest` and `@AuthenticationPrincipal Long actorUserId` parameters to dictionary write endpoints. After service calls, record:

```java
auditLogService.record(new AuditLogEntry(
        actorUserId,
        "system",
        "system.dict.type.create",
        "dict_type",
        response.id(),
        "success",
        request.getHeader("X-Trace-Id"),
        request.getRemoteAddr(),
        "dictionary type created"));
```

Use action/object pairs:

- `system.dict.type.create` / `dict_type`
- `system.dict.item.create` / `dict_item`
- `system.dict.item.update` / `dict_item`

- [ ] **Step 4: Run the dictionary test and verify it passes**

Run:

```bash
mvn -Dtest=DictionaryControllerTest test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/canicula/crmai/system/DictionaryControllerTest.java backend/src/main/java/com/canicula/crmai/system/DictionaryController.java
git commit -m "feat: audit dictionary management changes"
```

## Task 3: V2 Data Permission Regression

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/identity/DataPermissionServiceTest.java`

- [ ] **Step 1: Write failing regression tests**

Add tests that create a user role with `global`, another with no scope, and assert `DataPermissionService.buildCondition()` returns:

```java
assertThat(globalCondition.sql()).isEqualTo("1 = 1");
assertThat(noScopeCondition.sql()).isEqualTo("1 = 0");
```

Add V2 module coverage loop:

```java
for (String moduleCode : List.of("solution", "contract", "invoice", "receivable", "payment", "reconciliation")) {
    DataPermissionCondition condition = dataPermissionService.buildCondition(
            scopedUserId,
            moduleCode,
            new DataPermissionColumns("owner_user_id", "owner_department_id", null));
    assertThat(condition.sql()).contains("owner_user_id = ?");
    assertThat(condition.parameters()).contains(scopedUserId);
}
```

- [ ] **Step 2: Run the test and verify it fails if V2 modules are not scoped**

Run:

```bash
mvn -Dtest=DataPermissionServiceTest test
```

Expected: fail if V2 module data scopes are not seeded for the tested role; pass only after Task 1 migration includes the required V2 module scopes.

- [ ] **Step 3: Adjust V20 migration data scopes if needed**

If the test fails because `sys_role_data_scopes` lacks V2 module entries, extend `V20__complete_v2_system_governance.sql` with idempotent role scope grants for the default administrator role and the expected V2 modules.

- [ ] **Step 4: Run the test and verify it passes**

Run:

```bash
mvn -Dtest=DataPermissionServiceTest test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/canicula/crmai/identity/DataPermissionServiceTest.java backend/src/main/resources/db/migration/V20__complete_v2_system_governance.sql
git commit -m "test: cover v2 data permission scopes"
```

## Task 4: Frontend System Governance Enhancements

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing frontend tests**

Add tests:

```typescript
it("groups role permissions by V2 governance modules", async () => {
  const user = userEvent.setup();
  mockCrmFetch();
  render(<App />);
  await loginThroughUi(user);

  await user.click(screen.getByRole("link", { name: "系统概览" }));
  await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
  await user.click(screen.getByRole("button", { name: "授权" }));

  expect(await screen.findByText("V2 合同")).toBeInTheDocument();
  expect(screen.getByLabelText("终止合同")).toBeInTheDocument();
  expect(screen.getByText("V2 开票")).toBeInTheDocument();
  expect(screen.getByLabelText("登记发票")).toBeInTheDocument();
});
```

```typescript
it("filters audit logs by V2 module quick actions", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  render(<App />);
  await loginThroughUi(user);

  await user.click(screen.getByRole("link", { name: "系统概览" }));
  await user.click(screen.getAllByRole("link", { name: "审计日志" })[0]);
  await user.click(await screen.findByRole("button", { name: "核销审计" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/system/audit-logs?module_code=reconciliation"),
      expect.anything()
    );
  });
});
```

- [ ] **Step 2: Run frontend tests and verify they fail**

Run:

```bash
npm test -- --run
```

Expected: fail because permission grouping and audit quick filters are not implemented.

- [ ] **Step 3: Implement permission grouping and audit filters**

In `SystemPage`, add:

- `permissionGroups` computed from `permissions.data`.
- Group labels based on permission code prefixes.
- `auditQuery` state and `fetchAuditLogs(query)` helper using `crmApi.auditLogs.list(query)`.
- Quick filter buttons for `solution`, `contract`, `invoice`, `receivable`, `payment`, `reconciliation`, `system`.

Keep existing role save behavior unchanged.

- [ ] **Step 4: Run frontend tests and build**

Run:

```bash
npm test -- --run
npm run build
```

Expected: tests and build pass. Existing Vite chunk size warning is acceptable if unchanged.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.test.tsx frontend/src/App.tsx
git commit -m "feat: improve v2 system governance UI"
```

## Task 5: Module 8 Verification And UAT Evidence

**Files:**
- Modify: `docs/product/crm-v2-development-todolist.md`
- Create screenshots under: `docs/testing/evidence/artifacts/`

- [ ] **Step 1: Run backend verification**

Run:

```bash
mvn -Dtest=DatabaseMigrationTest,DictionaryControllerTest,DataPermissionServiceTest,IdentityAdminControllerTest,AuditLogControllerTest test
```

Expected: pass.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
npm test -- --run
npm run build
```

Expected: pass.

- [ ] **Step 3: Browser UAT**

Open local frontend and verify:

- `/system` shows V2 governance coverage summary.
- `/system/roles` authorization dialog shows V2 permission groups.
- `/system/audit-logs` quick filters reload audit logs with V2 module query.
- `/system/dictionaries` shows V2 dictionary types and allows item maintenance.

Save screenshots:

- `docs/testing/evidence/artifacts/v2-system-overview-governance-uat-20260702.png`
- `docs/testing/evidence/artifacts/v2-role-permission-groups-uat-20260702.png`
- `docs/testing/evidence/artifacts/v2-audit-quick-filter-uat-20260702.png`
- `docs/testing/evidence/artifacts/v2-dictionary-governance-uat-20260702.png`

- [ ] **Step 4: Update TODOList**

Set module 8 to Done, module 9 to Current, and record commands, screenshots, commit hashes, and any residual risks.

- [ ] **Step 5: Commit and push**

```bash
git add docs/product/crm-v2-development-todolist.md docs/testing/evidence/artifacts/
git commit -m "docs: complete v2 system governance uat"
git push origin codex/v2-receivable-management
```

## Self-Review

- Spec coverage: the plan covers V2 dictionaries, permissions, role authorization, audit logs, data permission regression, verification, and UAT evidence.
- Scope check: the plan avoids SSO, field-level permission, visual row-level rule builders, audit archival, and external integrations.
- Type consistency: the plan uses existing backend endpoint names, permission code patterns, and existing frontend `SystemPage` ownership.
