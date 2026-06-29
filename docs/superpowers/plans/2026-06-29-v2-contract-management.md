# V2 Contract Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build V2 contract management so成交商机 can become contract assets with status, amount, tax, terms, risk, change records, milestones, and attachment add/delete/download capability.

**Architecture:** Add a focused backend `contract` module with Flyway migration, permission-gated REST APIs, audit logging, and data-permission checks through the linked account/opportunity. Reuse the generic `crm_attachments` table and `/api/attachments` APIs by adding support for `object_type=contract`. The frontend adds a `合同` menu and a contract ledger/detail workflow with change history, milestones, terminate action, and attachment UI that opens `file_url` for downloads.

**Tech Stack:** Spring Boot, JdbcTemplate, Flyway, JUnit/TestRestTemplate, React, TypeScript, Ant Design, Vitest, Vite, browser Smoke.

---

## Files

- Create: `backend/src/main/resources/db/migration/V16__create_contracts.sql`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractController.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractService.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractCreateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractUpdateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractTerminateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractListFilter.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractChangeResponse.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractMilestoneCreateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractMilestoneUpdateRequest.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/ContractMilestoneResponse.java`
- Create: `backend/src/test/java/com/canicula/crmai/contract/ContractControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `docs/product/api-list.md`
- Modify: `docs/product/crm-v2-development-todolist.md`
- Optional Create: `/private/tmp/crm-v2-contract-management-browser-smoke.mjs`

## TODOList

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 后端数据模型与权限 | Pending | V16 migration creates contract, change, milestone tables and permission points; migration tests pass |
| 2 | 后端合同 API | Pending | Create/list/detail/update/terminate API tests pass with audit, change log, and data permission |
| 3 | 后端合同节点 API | Pending | Milestone create/list/update tests pass with audit and contract readable checks |
| 4 | 附件对象扩展 | Pending | `contract` attachments can be created, listed, deleted, and opened by `file_url` |
| 5 | 前端 API 与菜单 | Pending | `合同` menu and typed contract API client are covered by frontend tests |
| 6 | 前端合同页面 | Pending | List/detail/create/edit/terminate/change/milestone/attachment UI tests pass |
| 7 | OpenAPI 与接口清单 | Pending | Contract endpoints are covered by OpenAPI coverage test and API list |
| 8 | 自动化验证与 UAT | Pending | `mvn test`, OpenAPI coverage, `npm test`, `npm run build`, browser Smoke pass |
| 9 | 记录、提交、切换 | Pending | Module 3 Done, module 4 Current, commit and push recorded |

## Task 1: Backend Data Model And Permissions

**Files:**
- Create: `backend/src/main/resources/db/migration/V16__create_contracts.sql`
- Modify: `backend/src/test/java/com/canicula/crmai/database/DatabaseMigrationTest.java`
- Modify: `backend/src/test/java/com/canicula/crmai/database/PostgresMigrationIT.java`

- [ ] **Step 1: Write migration assertions first**

Add H2 assertions:

```java
Integer contractTableCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from information_schema.tables
        where table_name in ('crm_contracts', 'crm_contract_changes', 'crm_contract_milestones')
        """,
        Integer.class);
Integer contractPermissionCount = jdbcTemplate.queryForObject(
        """
        select count(*)
        from sys_permissions
        where permission_code in (
          'contract.read', 'contract.create', 'contract.update',
          'contract.terminate', 'contract.milestone.manage'
        )
        """,
        Integer.class);

assertThat(migrationCount).isGreaterThanOrEqualTo(16);
assertThat(contractTableCount).isEqualTo(3);
assertThat(contractPermissionCount).isEqualTo(5);
```

Add PostgreSQL assertions with `table_schema = 'public'` and update the version assertion:

```java
assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("16");
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: FAIL because the V16 migration does not exist.

- [ ] **Step 3: Add migration**

Create `V16__create_contracts.sql`:

```sql
create table crm_contracts (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    account_id bigint not null references crm_accounts(id),
    opportunity_id bigint references crm_opportunities(id),
    contract_name varchar(255) not null,
    contract_no varchar(128),
    contract_type varchar(64) not null,
    contract_status varchar(64) not null,
    contract_amount numeric(18, 2) not null,
    tax_rate numeric(8, 4),
    net_amount numeric(18, 2),
    our_signing_entity varchar(255),
    customer_signing_entity varchar(255),
    owner_user_id bigint not null references sys_users(id),
    business_owner_id bigint references sys_users(id),
    signed_at timestamp with time zone,
    effective_at timestamp with time zone,
    ended_at timestamp with time zone,
    payment_terms text,
    invoice_terms text,
    delivery_scope text,
    acceptance_criteria text,
    risk_level varchar(64),
    risk_description text,
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

create unique index uk_crm_contracts_no_active
    on crm_contracts (contract_no)
    where contract_no is not null and deleted_at is null;

create index idx_crm_contracts_account on crm_contracts (account_id);
create index idx_crm_contracts_opportunity on crm_contracts (opportunity_id);
create index idx_crm_contracts_status on crm_contracts (contract_status);
create index idx_crm_contracts_owner on crm_contracts (owner_user_id);

create table crm_contract_changes (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    contract_id bigint not null references crm_contracts(id),
    change_type varchar(64) not null,
    before_value text,
    after_value text,
    change_reason varchar(512) not null,
    changed_by bigint references sys_users(id),
    changed_at timestamp with time zone not null default current_timestamp
);

create index idx_crm_contract_changes_contract on crm_contract_changes (contract_id);

create table crm_contract_milestones (
    id bigint generated by default as identity primary key,
    tenant_id bigint not null default 1,
    contract_id bigint not null references crm_contracts(id),
    milestone_name varchar(255) not null,
    milestone_type varchar(64) not null,
    planned_at timestamp with time zone,
    actual_at timestamp with time zone,
    status varchar(64) not null,
    remark varchar(512),
    created_by bigint,
    created_at timestamp with time zone not null default current_timestamp,
    updated_by bigint,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone,
    version integer not null default 0
);

create index idx_crm_contract_milestones_contract on crm_contract_milestones (contract_id);
create index idx_crm_contract_milestones_status on crm_contract_milestones (status);
```

Insert permission points with `where not exists`:

```sql
insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'contract.read', '查看合同', 'operation', 'contract', 800
where not exists (select 1 from sys_permissions where permission_code = 'contract.read');
```

Repeat for `contract.create`, `contract.update`, `contract.terminate`, and `contract.milestone.manage`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=DatabaseMigrationTest test
```

Expected: PASS.

## Task 2: Backend Contract APIs

**Files:**
- Create: `backend/src/test/java/com/canicula/crmai/contract/ContractControllerTest.java`
- Create: `backend/src/main/java/com/canicula/crmai/contract/*.java`

- [ ] **Step 1: Write API tests**

Create `ContractControllerTest` with:

```java
@Test
void createsListsUpdatesAndTerminatesContractWithAuditAndChangeLog() {
    // create user with account.create, opportunity.create, opportunity.read,
    // contract.create, contract.read, contract.update, contract.terminate
    // create account and opportunity
    // POST /api/contracts
    // GET /api/contracts?account_id={id}&contract_status=drafting
    // PATCH /api/contracts/{id} changing amount/payment/invoice/scope with change_reason
    // GET /api/contracts/{id}/changes
    // POST /api/contracts/{id}/terminate
    // assert audit counts for contract.create/update/terminate and change rows
}

@Test
void rejectsCriticalContractChangesWithoutReason() {
    // PATCH amount/payment terms without change_reason
    // expect business rule error
}

@Test
void listFiltersOutUnreadableContracts() {
    // viewer with contract.read and own data scope should not see another owner's linked opportunity contract
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend && mvn -Dtest=ContractControllerTest test
```

Expected: FAIL because contract APIs do not exist.

- [ ] **Step 3: Implement request and response records**

Use snake_case JSON fields to match existing API style:

```java
public record ContractCreateRequest(
        @NotNull Long account_id,
        Long opportunity_id,
        @NotBlank String contract_name,
        String contract_no,
        @NotBlank String contract_type,
        @NotBlank String contract_status,
        @NotNull BigDecimal contract_amount,
        BigDecimal tax_rate,
        String our_signing_entity,
        String customer_signing_entity,
        @NotNull Long owner_user_id,
        Long business_owner_id,
        OffsetDateTime signed_at,
        OffsetDateTime effective_at,
        OffsetDateTime ended_at,
        String payment_terms,
        String invoice_terms,
        String delivery_scope,
        String acceptance_criteria,
        String risk_level,
        String risk_description,
        String remark) {}
```

`ContractUpdateRequest` uses nullable fields plus `String change_reason`. `ContractTerminateRequest` contains `@NotBlank String termination_reason`. `ContractResponse` returns all fields required by the frontend, including `net_amount`, `terminated_at`, `terminated_by`, `created_at`, and `updated_at`.

- [ ] **Step 4: Implement service rules**

Create `ContractService`:

```java
private BigDecimal calculateNetAmount(BigDecimal contractAmount, BigDecimal taxRate) {
    if (contractAmount == null) {
        return null;
    }
    if (taxRate == null) {
        return contractAmount;
    }
    return contractAmount.divide(BigDecimal.ONE.add(taxRate), 2, RoundingMode.HALF_UP);
}
```

Data permission:

```java
public ContractResponse readableDetail(Long contractId, Long actorUserId) {
    ContractResponse response = findById(contractId);
    try {
        if (response.opportunity_id() != null) {
            opportunityService.readableDetail(response.opportunity_id(), actorUserId);
        } else {
            accountService.readableDetail(response.account_id(), actorUserId);
        }
        return response;
    } catch (IllegalArgumentException exception) {
        throw new IllegalArgumentException("合同不存在或无权访问");
    }
}
```

Critical field change logging:

```java
List<ContractChange> changes = detectChanges(current, request);
if (!changes.isEmpty() && !hasText(request.change_reason())) {
    throw new BusinessRuleException("修改合同金额、付款条件、开票条件、交付范围或风险必须填写变更原因");
}
```

Terminate rule:

```java
if (!hasText(request.termination_reason())) {
    throw new BusinessRuleException("终止合同必须填写原因");
}
```

- [ ] **Step 5: Implement controller with permissions and audit**

Endpoints:

```java
@PostMapping("/api/contracts")
@GetMapping("/api/contracts")
@GetMapping("/api/contracts/{contractId}")
@PatchMapping("/api/contracts/{contractId}")
@PostMapping("/api/contracts/{contractId}/terminate")
@GetMapping("/api/contracts/{contractId}/changes")
```

Permissions:

```java
@RequirePermission("contract.create")
@RequirePermission("contract.read")
@RequirePermission("contract.update")
@RequirePermission("contract.terminate")
```

Audit actions: `contract.create`, `contract.update`, `contract.terminate`.

- [ ] **Step 6: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=ContractControllerTest test
```

Expected: PASS.

## Task 3: Backend Contract Milestones

**Files:**
- Modify: `backend/src/test/java/com/canicula/crmai/contract/ContractControllerTest.java`
- Modify: `backend/src/main/java/com/canicula/crmai/contract/*.java`

- [ ] **Step 1: Add milestone tests**

```java
@Test
void createsListsAndUpdatesContractMilestonesWithAudit() {
    // create contract
    // POST /api/contracts/{id}/milestones
    // GET /api/contracts/{id}/milestones
    // PATCH /api/contracts/{id}/milestones/{milestoneId}
    // assert milestone fields and audit counts
}
```

- [ ] **Step 2: Implement milestone records**

```java
public record ContractMilestoneCreateRequest(
        @NotBlank String milestone_name,
        @NotBlank String milestone_type,
        OffsetDateTime planned_at,
        OffsetDateTime actual_at,
        @NotBlank String status,
        String remark) {}
```

`ContractMilestoneUpdateRequest` uses nullable fields. `ContractMilestoneResponse` returns all table fields.

- [ ] **Step 3: Add service methods and controller endpoints**

Endpoints:

```java
@GetMapping("/api/contracts/{contractId}/milestones")
@PostMapping("/api/contracts/{contractId}/milestones")
@PatchMapping("/api/contracts/{contractId}/milestones/{milestoneId}")
```

Permission: `contract.milestone.manage` for create/update and `contract.read` for list.

Audit actions: `contract.milestone.create`, `contract.milestone.update`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
cd backend && mvn -Dtest=ContractControllerTest test
```

Expected: PASS.

## Task 4: Attachment Support For Contracts

**Files:**
- Modify: `backend/src/main/java/com/canicula/crmai/attachment/AttachmentService.java`
- Modify: `backend/src/test/java/com/canicula/crmai/attachment/AttachmentControllerTest.java`

- [ ] **Step 1: Add attachment test**

Add test:

```java
@Test
void createsListsAndDeletesContractAttachmentMetadata() {
    // create account, opportunity, contract
    // POST /api/attachments with object_type=contract
    // GET /api/attachments?object_type=contract&object_id={contractId}
    // DELETE /api/attachments/{attachmentId}
}
```

- [ ] **Step 2: Extend `AttachmentService`**

Inject `ContractService` and update the readable switch:

```java
case "contract" -> contractService.readableDetail(objectId, actorUserId);
```

- [ ] **Step 3: Run attachment tests**

Run:

```bash
cd backend && mvn -Dtest=AttachmentControllerTest test
```

Expected: PASS.

## Task 5: Frontend API And Menu

**Files:**
- Modify: `frontend/src/api/crm.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add frontend types and API client**

In `crm.ts`, add:

```ts
export type Contract = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_name: string;
  contract_no?: string;
  contract_type: string;
  contract_status: string;
  contract_amount: number;
  tax_rate?: number;
  net_amount?: number;
  owner_user_id: number;
  business_owner_id?: number;
  payment_terms?: string;
  invoice_terms?: string;
  delivery_scope?: string;
  acceptance_criteria?: string;
  risk_level?: string;
  risk_description?: string;
};
```

Add `ContractChange`, `ContractMilestone`, and `crmApi.contracts` with `list`, `detail`, `create`, `update`, `terminate`, `changes`, `milestones`, `createMilestone`, and `updateMilestone`.

- [ ] **Step 2: Add navigation**

Add menu item:

```tsx
{ key: "/contracts", label: "合同", icon: <FileSignature size={18} />, permission: "contract.read" }
```

Add route:

```tsx
<Route path="/contracts" element={<ContractsPage currentUser={user} />} />
```

- [ ] **Step 3: Add frontend RED tests**

Add permissions to test bootstrap and assert:

```ts
it("renders the contract module and loads the V2 contract list", async () => {
  renderApp("/contracts");
  expect(await screen.findByText("合同")).toBeInTheDocument();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/contracts"), expect.anything()));
});
```

Expected: FAIL until `ContractsPage` exists.

## Task 6: Frontend Contract Page

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Implement `ContractsPage`**

Core state:

```tsx
const contracts = useResource(() => crmApi.contracts.list(filters), [filters]);
const [selected, setSelected] = useState<Contract | null>(null);
const [editing, setEditing] = useState<Contract | null>(null);
const [terminating, setTerminating] = useState<Contract | null>(null);
const [changes, setChanges] = useState<ContractChange[]>([]);
const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
const [attachments, setAttachments] = useState<Attachment[]>([]);
```

List columns:

- 合同名称/编号
- 客户
- 来源商机
- 类型
- 状态
- 金额
- 税率/不含税金额
- 负责人
- 风险
- 更新时间
- 操作

- [ ] **Step 2: Implement forms and detail drawer**

Create/edit form fields:

- 客户、来源商机
- 合同名称、合同编号
- 类型、状态
- 合同金额、税率
- 我方签约主体、客户签约主体
- 合同负责人、商务负责人
- 签署/生效/结束日期
- 付款条件、开票条件、交付范围、验收标准
- 风险等级、风险说明、备注
- 编辑关键字段时显示 `change_reason`

Detail drawer sections:

- 摘要
- 商务信息
- 条款
- 风险
- 变更记录
- 合同节点
- 附件
- 后续入口占位：开票计划、回款计划、核销明细

- [ ] **Step 3: Implement contract actions**

Actions:

```tsx
await crmApi.contracts.create(payload);
await crmApi.contracts.update(editing.id, withoutEmpty(payload, []));
await crmApi.contracts.terminate(terminating.id, values);
await crmApi.contracts.createMilestone(selected.id, payload);
await crmApi.contracts.updateMilestone(selected.id, milestoneId, payload);
await crmApi.attachments.create({ object_type: "contract", object_id: selected.id, ...values });
await crmApi.attachments.delete(attachmentId);
```

Download behavior:

```tsx
window.open(record.file_url, "_blank", "noopener,noreferrer");
```

- [ ] **Step 4: Add option helpers**

Add helpers:

```ts
function contractTypeText(type?: string) { /* project/framework/procurement/service/supplement */ }
function contractStatusTag(status?: string) { /* drafting/approving/pending_signature/performing/paused/completed/terminated */ }
function contractRiskTag(risk?: string) { /* low/medium/high */ }
function milestoneStatusTag(status?: string) { /* pending/completed/delayed/cancelled */ }
```

- [ ] **Step 5: Run frontend tests**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
```

Expected: PASS.

## Task 7: OpenAPI And API List

**Files:**
- Modify: `docs/openapi/crm-v1-openapi.yaml`
- Modify: `docs/product/api-list.md`
- Modify: `backend/src/test/java/com/canicula/crmai/openapi/OpenApiContractCoverageTest.java`

- [ ] **Step 1: Document endpoints**

Add tag `Contracts` and paths:

```yaml
/api/contracts:
  get:
    tags: [Contracts]
    summary: List contracts
  post:
    tags: [Contracts]
    summary: Create contract
/api/contracts/{contractId}:
  get:
    tags: [Contracts]
    summary: Get contract detail
  patch:
    tags: [Contracts]
    summary: Update contract
/api/contracts/{contractId}/terminate:
  post:
    tags: [Contracts]
    summary: Terminate contract
/api/contracts/{contractId}/changes:
  get:
    tags: [Contracts]
    summary: List contract changes
/api/contracts/{contractId}/milestones:
  get:
    tags: [Contracts]
    summary: List contract milestones
  post:
    tags: [Contracts]
    summary: Create contract milestone
/api/contracts/{contractId}/milestones/{milestoneId}:
  patch:
    tags: [Contracts]
    summary: Update contract milestone
```

- [ ] **Step 2: Run coverage**

Run:

```bash
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

Expected: PASS.

## Task 8: Verification And Browser UAT

**Files:**
- Modify as needed based on issues found during verification.

- [ ] **Step 1: Backend full verification**

Run:

```bash
cd backend && mvn test
cd backend && mvn -Dtest=OpenApiContractCoverageTest test
```

- [ ] **Step 2: Frontend verification**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
```

- [ ] **Step 3: Local browser Smoke**

Start backend/frontend on non-conflicting ports, then verify:

- `/contracts` loads with no console application errors.
- Contract list displays.
- Detail drawer displays summary, changes, milestones, and attachments.
- Attachment add/delete/download buttons are visible and wired.
- Terminate modal requires reason.

Record screenshot path in TODOList if a screenshot is captured.

## Task 9: Record, Commit, Push, And Switch

**Files:**
- Modify: `docs/product/crm-v2-development-todolist.md`

- [ ] **Step 1: Update module status**

When all checks pass, update:

- Module 3 status to `Done`.
- Module 4 `开票管理链路` to `Current`.
- Add commit id and verification commands.
- Record browser smoke URL and evidence.

- [ ] **Step 2: Commit and push**

Run:

```bash
git status --short
git add backend frontend docs
git commit -m "feat: implement v2 contract management"
git push
```

Expected: GitHub branch contains V2 contract management.

## Execution Notes

- Keep V1 verified flows stable; do not refactor unrelated V1 customer/contact/opportunity/activity pages during this module.
- Use existing local patterns from `SolutionDocumentService`, `SolutionDocumentControllerTest`, `AttachmentService`, and `App.tsx`.
- Keep API JSON fields snake_case, consistent with V1/V2 existing endpoints.
- Contract module must not start implementing invoice, payment, or reconciliation tables. It may only expose placeholder sections in the frontend detail drawer.
- Every task transition must update the user-facing TODO/progress snapshot.
