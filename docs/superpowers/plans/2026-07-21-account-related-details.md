# Account Related Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在客户经营详情中展示关联联系人和商机，并通过带对象 ID 的 URL 深链自动打开对应详情。

**Architecture:** 沿用现有 `App.tsx` 单文件页面结构，新增隔离的 `AccountRelatedRecords` 组件，分别使用现有联系人和商机列表 API 按客户查询。联系人页面补充与商机页面一致的详情深链解析；所有请求受现有读取权限控制，不修改后端。

**Tech Stack:** React, TypeScript, React Router, Ant Design, Vitest, Testing Library, Chrome browser smoke.

---

### Task 1: Contact Detail Deep Link

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`

- [x] **Step 1: Add contact-detail mock support**

在 `mockCrmFetch` 的联系人列表分支之前增加详情响应，保证 `/api/contacts/21` 不会被列表分支吞掉：

```ts
if (path.endsWith("/api/contacts/21")) {
  return jsonResponse({ code: "OK", data: data.contacts[0] });
}
if (path.endsWith("/api/contacts")) {
  return jsonResponse({ code: "OK", data: data.contacts });
}
```

- [x] **Step 2: Write the failing deep-link test**

在 `CRM frontend V1 workflow` 中增加：

```tsx
it("opens a contact detail from the contact_id deep link", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();
  window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByRole("heading", { name: "联系人经营入口" })).toBeInTheDocument();
  expect(screen.getByText(/张决策/)).toBeInTheDocument();
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/contacts?account_id=1"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/contacts/21"),
      expect.anything()
    );
  });
});
```

- [x] **Step 3: Run the deep-link test and confirm RED**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "opens a contact detail from the contact_id deep link"
```

Expected: FAIL because `ContactsPage` does not parse `contact_id` or request contact detail.

- [x] **Step 4: Implement query filtering and detail loading**

在 `ContactsPage` 开头使用查询参数初始化列表筛选和详情 ID：

```tsx
const initialQueryFilters = useInitialQueryFilters(["account_id", "contact_id"]);
const initialContactId = numericFilterValue(initialQueryFilters.contact_id);
const [filters, setFilters] = useState<Record<string, unknown>>(
  () => toContactListFilters(initialQueryFilters)
);
const contacts = useResource(() => crmApi.contacts.list(filters), [filters]);
const [detailError, setDetailError] = useState("");

const loadContactDetail = useCallback(async (contactId: number) => {
  setDetailError("");
  try {
    setSelected(await crmApi.contacts.detail(contactId));
  } catch (loadError) {
    setDetailError(loadError instanceof Error ? loadError.message : "联系人详情加载失败");
  }
}, []);

useEffect(() => {
  if (initialContactId) {
    void loadContactDetail(initialContactId);
  }
}, [initialContactId, loadContactDetail]);
```

将 `DataWorkspace` 的 `error` 改为 `contacts.error || detailError`。在查询辅助函数区域新增：

```ts
function toContactListFilters(query: Record<string, unknown>) {
  const filters = { ...query };
  delete filters.contact_id;
  return filters;
}
```

- [x] **Step 5: Run the deep-link test and confirm GREEN**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "opens a contact detail from the contact_id deep link"
```

Expected: 1 test passes.

- [x] **Step 6: Commit the contact deep link**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: add contact detail deep links"
```

### Task 2: Account Related Contact and Opportunity Lists

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`

- [x] **Step 1: Write the failing customer-related-records test**

在客户经营用例附近增加：

```tsx
it("shows related contacts and opportunities with detail links", async () => {
  const fetchMock = mockCrmFetch();
  const user = userEvent.setup();

  render(<App />);
  await loginThroughUi(user);
  await user.click(screen.getByRole("link", { name: "客户池" }));
  await screen.findByText("测试客户A");
  await user.click(screen.getByRole("button", { name: /查看经营/ }));

  expect(await screen.findByRole("heading", { name: "关联联系人" })).toBeInTheDocument();
  expect(screen.getByText("2 人")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "查看联系人 张决策" })).toHaveAttribute(
    "href",
    "/contacts?account_id=1&contact_id=21"
  );
  expect(screen.getByRole("link", { name: "查看全部联系人" })).toHaveAttribute(
    "href",
    "/contacts?account_id=1"
  );
  expect(screen.getByRole("heading", { name: "关联商机" })).toBeInTheDocument();
  expect(screen.getByText("1 个")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "查看商机 测试商机A" })).toHaveAttribute(
    "href",
    "/opportunities?account_id=1&opportunity_id=10"
  );
  expect(screen.getByRole("link", { name: "查看全部商机" })).toHaveAttribute(
    "href",
    "/opportunities?account_id=1"
  );
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/contacts?account_id=1"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/opportunities?account_id=1"),
      expect.anything()
    );
  });
});
```

- [x] **Step 2: Run the related-records test and confirm RED**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "shows related contacts and opportunities with detail links"
```

Expected: FAIL because the customer drawer has no related-record sections.

- [x] **Step 3: Add the permission-aware relation component**

在 `AccountOperationDrawer` 后新增 `AccountRelatedRecords`。组件必须始终调用两个 `useResource` Hook，但无权限时返回空 Promise，避免条件 Hook：

```tsx
function AccountRelatedRecords({ accountId, permissions }: { accountId: number; permissions: string[] }) {
  const canReadContacts = permissions.includes("contact.read");
  const canReadOpportunities = permissions.includes("opportunity.read");
  const contacts = useResource(
    () => canReadContacts ? crmApi.contacts.list({ account_id: accountId }) : Promise.resolve([]),
    [accountId, canReadContacts]
  );
  const opportunities = useResource(
    () => canReadOpportunities ? crmApi.opportunities.list({ account_id: accountId }) : Promise.resolve([]),
    [accountId, canReadOpportunities]
  );

  if (!canReadContacts && !canReadOpportunities) {
    return null;
  }

  const contactColumns: ColumnsType<CrmContact> = [
    {
      title: "姓名",
      dataIndex: "name",
      render: (value, record) => (
        <Link
          aria-label={`查看联系人 ${record.name}`}
          to={`/contacts?account_id=${accountId}&contact_id=${record.id}`}
        >
          {value}
        </Link>
      )
    },
    { title: "职务", dataIndex: "title", render: textOrDash },
    { title: "类型", dataIndex: "contact_type", render: contactTypeText },
    { title: "态度", dataIndex: "attitude", render: contactAttitudeTag },
    { title: "关系热度", dataIndex: "relationship_heat", render: contactHeatTag }
  ];

  const opportunityColumns: ColumnsType<Opportunity> = [
    {
      title: "商机名称",
      dataIndex: "opportunity_name",
      render: (value, record) => (
        <Link
          aria-label={`查看商机 ${record.opportunity_name}`}
          to={`/opportunities?account_id=${accountId}&opportunity_id=${record.id}`}
        >
          {value}
        </Link>
      )
    },
    { title: "阶段", dataIndex: "stage", render: opportunityStageText },
    { title: "状态", dataIndex: "status", render: opportunityStatusTag },
    { title: "风险", dataIndex: "risk_status", render: opportunityRiskTag },
    { title: "预计合同金额", dataIndex: "estimated_contract_amount", render: moneyText }
  ];

  return (
    <section className="account-related-records" aria-label="客户关联记录">
      {canReadContacts ? (
        <div className="account-related-panel">
          <div className="section-title-row">
            <Typography.Title level={4}>关联联系人</Typography.Title>
            <Space size="small">
              <Tag>{contacts.data.length} 人</Tag>
              <Link aria-label="查看全部联系人" to={`/contacts?account_id=${accountId}`}>查看全部</Link>
            </Space>
          </div>
          {contacts.error ? <Alert type="error" showIcon title={contacts.error} /> : null}
          <Table
            rowKey="id"
            size="small"
            loading={contacts.loading}
            dataSource={contacts.data}
            columns={contactColumns}
            pagination={false}
            scroll={{ x: 620 }}
            locale={{ emptyText: "暂无关联联系人" }}
          />
        </div>
      ) : null}
      {canReadOpportunities ? (
        <div className="account-related-panel">
          <div className="section-title-row">
            <Typography.Title level={4}>关联商机</Typography.Title>
            <Space size="small">
              <Tag>{opportunities.data.length} 个</Tag>
              <Link aria-label="查看全部商机" to={`/opportunities?account_id=${accountId}`}>查看全部</Link>
            </Space>
          </div>
          {opportunities.error ? <Alert type="error" showIcon title={opportunities.error} /> : null}
          <Table
            rowKey="id"
            size="small"
            loading={opportunities.loading}
            dataSource={opportunities.data}
            columns={opportunityColumns}
            pagination={false}
            scroll={{ x: 680 }}
            locale={{ emptyText: "暂无关联商机" }}
          />
        </div>
      ) : null}
    </section>
  );
}
```

- [x] **Step 4: Mount the relation component in customer details**

在最近跟进区域后加入：

```tsx
<AccountRelatedRecords accountId={account.id} permissions={currentUser.permissions} />
```

- [x] **Step 5: Run the related-records test and confirm GREEN**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "shows related contacts and opportunities with detail links"
```

Expected: 1 test passes.

- [x] **Step 6: Commit the related records**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: show account contacts and opportunities"
```

### Task 3: Permissions, Error Isolation, and Layout

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/styles.test.ts`
- Modify: `frontend/src/styles.css`

- [x] **Step 1: Add controllable API failures to the test helper**

扩展测试助手，使单项接口可以稳定失败，而不影响其他 mock 响应。先按以下补丁替换函数签名：

```diff
@@
+type MockCrmFetchOptions = {
+  failPaths?: string[];
+};
+
-function mockCrmFetch(overrides: Partial<typeof apiData> = {}) {
+function mockCrmFetch(
+  overrides: Partial<typeof apiData> = {},
+  options: MockCrmFetchOptions = {}
+) {
```

然后在现有 `path` 与 `method` 计算之间插入失败判断：

```ts
const url = String(input);
const path = url.split("?")[0];
if (options.failPaths?.includes(path)) {
  throw new Error(`${path} 加载失败`);
}
const method = init?.method ?? "GET";
```

- [x] **Step 2: Write the permission and error-isolation tests**

增加只允许读取客户的测试，打开客户详情后清空此前请求记录，再确认不请求关联资源：

```tsx
it("does not load account relations without relation permissions", async () => {
  const fetchMock = mockCrmFetch({
    user: { ...apiData.user, permissions: ["account.read"] }
  });
  const user = userEvent.setup();

  render(<App />);
  await loginThroughUi(user);
  await user.click(screen.getByRole("link", { name: "客户池" }));
  await screen.findByText("测试客户A");
  fetchMock.mockClear();
  await user.click(screen.getByRole("button", { name: /查看经营/ }));

  expect(screen.queryByRole("region", { name: "客户关联记录" })).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/contacts"), expect.anything());
  expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/opportunities"), expect.anything());
});

it("keeps opportunities usable when related contacts fail", async () => {
  mockCrmFetch({}, { failPaths: ["/api/contacts"] });
  const user = userEvent.setup();

  render(<App />);
  await loginThroughUi(user);
  await user.click(screen.getByRole("link", { name: "客户池" }));
  await screen.findByText("测试客户A");
  await user.click(screen.getByRole("button", { name: /查看经营/ }));

  expect(await screen.findByText("/api/contacts 加载失败")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "查看商机 测试商机A" })).toBeInTheDocument();
});

it("shows independent empty states for account relations", async () => {
  mockCrmFetch({ contacts: [], opportunities: [] });
  const user = userEvent.setup();

  render(<App />);
  await loginThroughUi(user);
  await user.click(screen.getByRole("link", { name: "客户池" }));
  await screen.findByText("测试客户A");
  await user.click(screen.getByRole("button", { name: /查看经营/ }));

  expect(await screen.findByText("暂无关联联系人")).toBeInTheDocument();
  expect(screen.getByText("暂无关联商机")).toBeInTheDocument();
});

it("keeps the contact list visible when a contact deep link fails", async () => {
  mockCrmFetch({}, { failPaths: ["/api/contacts/21"] });
  const user = userEvent.setup();
  window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

  render(<App />);
  await loginThroughUi(user);

  expect(await screen.findByText("/api/contacts/21 加载失败")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "联系人" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "联系人经营入口" })).not.toBeInTheDocument();
});
```

- [x] **Step 3: Run the permission and error-isolation tests**

Run:

```bash
cd frontend && npm test -- --run src/App.test.tsx -t "relation permissions|related contacts fail|empty states for account relations|deep link fails"
```

Expected: four tests pass; permissions block requests, empty states are explicit, relation failures are isolated, and a failed deep link leaves the list usable.

- [x] **Step 4: Write and run the failing style contract**

在 `frontend/src/styles.test.ts` 增加：

```ts
it("keeps account relation tables contained in the detail drawer", () => {
  expect(css).toMatch(/\.account-related-records\s*\{[\s\S]*display:\s*grid/);
  expect(css).toMatch(/\.account-related-panel\s*\{[\s\S]*min-width:\s*0/);
});
```

Run:

```bash
cd frontend && npm test -- --run src/styles.test.ts -t "keeps account relation tables contained in the detail drawer"
```

Expected: FAIL because the account relation layout selectors do not exist.

- [x] **Step 5: Add compact relation layout styles**

在业务详情样式区域增加：

```css
.account-related-records {
  display: grid;
  gap: 14px;
}

.account-related-panel {
  min-width: 0;
}

.account-related-panel + .account-related-panel {
  padding-top: 14px;
  border-top: 1px solid #e6eaf2;
}

.account-related-panel .section-title-row {
  margin-bottom: 8px;
}
```

- [x] **Step 6: Run relation, permission, error-isolation, and style tests**

Run:

```bash
cd frontend && npm test -- --run src/styles.test.ts src/App.test.tsx -t "account relation|related contacts|contact_id deep link|relation permissions"
```

Expected: all selected tests pass.

- [x] **Step 7: Commit permission and layout coverage**

```bash
git add frontend/src/App.test.tsx frontend/src/styles.test.ts frontend/src/styles.css
git commit -m "test: cover account relation permissions and layout"
```

### Task 4: Full Regression and Browser Acceptance

**Files:**
- Create: `docs/testing/evidence/account-related-details-validation-2026-07-21.md`
- Create: `docs/testing/evidence/artifacts/account-related-details-20260721/`

- [x] **Step 1: Run the complete frontend suite**

Run:

```bash
cd frontend && npm test
```

Expected: all frontend tests pass with zero failures.

- [x] **Step 2: Run the production build**

Run:

```bash
cd frontend && npm run build
```

Expected: TypeScript and Vite build succeed.

- [x] **Step 3: Start or reuse the local frontend**

Run the current branch on port 5175 with the existing backend proxy:

```bash
cd frontend && VITE_API_PROXY_TARGET=http://127.0.0.1:8080 npm run dev -- --host 127.0.0.1 --port 5175
```

Expected: `http://127.0.0.1:5175/` returns HTTP 200.

- [x] **Step 4: Verify customer relations in Chrome**

At 1440x1000 and 390x844:

1. Login as `demo_admin`.
2. Open `/accounts` and click “查看经营”.
3. Confirm both relation tables, record counts, and scoped “查看全部” links.
4. Click “张决策” and confirm `/contacts?account_id=...&contact_id=...` automatically opens contact detail.
5. Return to customer detail, click a related opportunity, and confirm `/opportunities?account_id=...&opportunity_id=...` automatically opens opportunity detail.
6. Confirm no browser console errors, failed API responses, overlapping content, or page-level horizontal overflow.

- [x] **Step 5: Record validation evidence**

Write `docs/testing/evidence/account-related-details-validation-2026-07-21.md` with this structure:

```md
# 客户详情关联联系人与商机验收报告

- 分支：`codex/account-related-details`
- 本地地址：`http://127.0.0.1:5175/`
- 自动化测试：填写实际通过数
- 生产构建：通过
- 桌面端：客户详情、联系人深链、商机深链通过
- 移动端：客户详情、联系人深链、商机深链通过
- 控制台错误：0
- 失败 API：0
- 结论：通过
```

- [x] **Step 6: Commit validation evidence**

```bash
git add docs/testing/evidence/account-related-details-validation-2026-07-21.md docs/testing/evidence/artifacts/account-related-details-20260721
git commit -m "test: validate account related details"
```

### Task 5: Final Verification and Delivery

**Files:**
- Verify: all changed source, test, plan, and evidence files

- [ ] **Step 1: Run final checks**

Run:

```bash
npm --prefix frontend test
npm --prefix frontend run build
git diff --check
git status --short
```

Expected: tests and build exit successfully, `git diff --check` has no output, and only intentional files are present.

- [ ] **Step 2: Update this implementation checklist**

Mark each completed checkbox in this plan. Keep an item unchecked only if its verification evidence is missing.

- [ ] **Step 3: Commit the completed checklist**

```bash
git add docs/superpowers/plans/2026-07-21-account-related-details.md
git commit -m "docs: complete account relation rollout checklist"
```

- [ ] **Step 4: Push the feature branch**

```bash
git push -u origin codex/account-related-details
```

Expected: the local branch tracks `origin/codex/account-related-details` with zero commits ahead or behind.
