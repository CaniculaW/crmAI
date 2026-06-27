# V1 System Management Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor V1 system management into one top-level System menu with independent system overview, department, user, role permission, audit log, and dictionary management pages.

**Architecture:** Keep the existing React and Ant Design single-page structure. Replace the current flat system menu entries with a grouped System menu and add `dictionaries` to `SystemSection`. Keep existing backend APIs and reuse the current dictionary modal logic, moving dictionary cards from the overview section to `/system/dictionaries`.

**Tech Stack:** React, TypeScript, Ant Design, React Router, Vitest, existing Spring Boot APIs.

---

## Files

- Modify: `frontend/src/App.tsx`
  - Convert system navigation from flat items to one parent `系统` menu with children.
  - Add route `/system/dictionaries`.
  - Add `SystemSection` value `dictionaries`.
  - Rename overview title to `系统概览`.
  - Move dictionary management UI from overview section to dictionary section.
- Modify: `frontend/src/App.test.tsx`
  - Add failing tests for system menu hierarchy and dictionary independent page.
  - Update existing system tests from `系统管理` link to new `系统` / `系统概览` flow.
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`
  - After verification, record module 8 implementation result, commands, UAT evidence, and commit hash.
- Optional Modify: `frontend/src/styles.css`
  - Only if the grouped menu or dictionary page needs minor spacing fixes after browser UAT.

## TODOList

| 顺序 | 事项 | 状态 | 完成标准 |
|---:|---|---|---|
| 1 | 补齐系统一级菜单和字典独立页测试 | Pending | 测试覆盖系统父菜单、六个子入口、字典独立页和概览不直接铺开字典项 |
| 2 | 确认测试红灯 | Pending | 定向测试因当前仍是扁平系统菜单、无 `/system/dictionaries` 而失败 |
| 3 | 实现系统菜单层级和路由 | Pending | 左侧只保留系统父菜单，子菜单可进入六个系统页面 |
| 4 | 拆出字典管理页面 | Pending | `/system/dictionaries` 可新建字典、新增项、编辑项，`/system` 只保留入口和摘要 |
| 5 | 自动化验证 | Pending | 前端定向测试、全量测试、构建通过 |
| 6 | 本地 UAT | Pending | `/system` 和 `/system/dictionaries` 无服务端异常，核心 DOM 验收通过 |
| 7 | 更新项目 TODOList 并提交 | Pending | 模块 8 Done，模块 9 Current，提交号记录 |

## Task 1: Failing Frontend Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add grouped system menu test**

Add this test inside `describe("CRM frontend V1 workflow", () => { ... })`, near the existing system management tests:

```tsx
  it("renders system as one top-level menu with professional child modules", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    expect(screen.getByRole("menuitem", { name: /系统/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /系统管理/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "系统概览" }));
    expect(await screen.findByRole("heading", { name: "系统概览" })).toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "组织管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "用户管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "角色权限" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "审计日志" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "字典管理" }).length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Add dictionary independent page test**

Add this test after the grouped menu test:

```tsx
  it("maintains dictionaries from an independent dictionary management page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统概览" }));
    expect(await screen.findByRole("heading", { name: "系统概览" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "字典管理" })).toBeInTheDocument();
    expect(screen.queryByText("客户等级 (account_level)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "字典管理" }));
    expect(await screen.findByRole("heading", { name: "字典管理" })).toBeInTheDocument();
    expect(screen.getByText("客户等级 (account_level)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建字典" }));
    await user.type(screen.getByLabelText("字典编码"), "risk_level");
    await user.type(screen.getByLabelText("字典名称"), "风险等级");
    await user.click(screen.getByRole("button", { name: "保存字典" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/dicts/types",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("risk_level")
        })
      );
    });
  });
```

- [ ] **Step 3: Update existing system test navigation expectations**

Update system tests that currently start with:

```tsx
    await user.click(screen.getByRole("link", { name: "系统管理" }));
```

to:

```tsx
    await user.click(screen.getByRole("link", { name: "系统概览" }));
```

Update the existing dictionary creation test name from:

```tsx
  it("creates a dictionary type from system management", async () => {
```

to:

```tsx
  it("creates a dictionary type from dictionary management", async () => {
```

Then replace its navigation and heading assertions with:

```tsx
    await user.click(screen.getByRole("link", { name: "字典管理" }));
    expect(await screen.findByRole("heading", { name: "字典管理" })).toBeInTheDocument();
    expect(screen.getByText("客户等级 (account_level)")).toBeInTheDocument();
```

- [ ] **Step 4: Run RED**

Run:

```bash
cd frontend && npm test -- App.test.tsx -t "system|dictionary"
```

Expected: FAIL because the current menu still contains `系统管理`, no grouped `系统` menu exists, and `/system/dictionaries` is not routed.

## Task 2: Implement System Menu Hierarchy

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update navigation types**

Replace the current `NavItem` shape with this discriminated structure near the top of `frontend/src/App.tsx`:

```tsx
type BaseNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  permission?: string;
  permissions?: string[];
};

type NavItem = BaseNavItem & {
  children?: BaseNavItem[];
};
```

- [ ] **Step 2: Replace flat system nav entries**

Replace the existing `navItems` system entries with a single parent and children:

```tsx
  {
    key: "/system",
    label: "系统",
    icon: <ShieldCheck size={18} />,
    permissions: ["system.dict.manage", "system.user.manage", "system.role.manage", "system.audit.read"],
    children: [
      { key: "/system", label: "系统概览", permission: "system.user.manage" },
      { key: "/system/departments", label: "组织管理", permission: "system.user.manage" },
      { key: "/system/users", label: "用户管理", permission: "system.user.manage" },
      { key: "/system/roles", label: "角色权限", permission: "system.role.manage" },
      { key: "/system/audit-logs", label: "审计日志", permission: "system.audit.read" },
      { key: "/system/dictionaries", label: "字典管理", permission: "system.dict.manage" }
    ]
  }
```

Keep all non-system entries unchanged.

- [ ] **Step 3: Add nav filtering helpers**

Add these helpers above `CrmShell`:

```tsx
function canAccessNavItem(item: Pick<NavItem, "permission" | "permissions">, permissions: string[]) {
  return (
    (!item.permission || permissions.includes(item.permission)) &&
    (!item.permissions || item.permissions.some((permission) => permissions.includes(permission)))
  );
}

function allowedNavItems(items: NavItem[], permissions: string[]): NavItem[] {
  return items
    .map((item) => {
      const children = item.children?.filter((child) => canAccessNavItem(child, permissions));
      if (item.children) {
        return canAccessNavItem(item, permissions) && children?.length ? { ...item, children } : null;
      }
      return canAccessNavItem(item, permissions) ? item : null;
    })
    .filter((item): item is NavItem => Boolean(item));
}
```

- [ ] **Step 4: Render nested Ant Design menu items**

In `CrmShell`, replace the current `allowedNav` assignment with:

```tsx
  const allowedNav = allowedNavItems(navItems, user.permissions);
  const selectedMenuKey = location.pathname.startsWith("/system") ? location.pathname : location.pathname;
  const openMenuKeys = location.pathname.startsWith("/system") ? ["/system-root"] : undefined;
```

When rendering `<Menu>`, replace `items={allowedNav.map(...)}` with:

```tsx
          selectedKeys={[selectedMenuKey]}
          defaultOpenKeys={openMenuKeys}
          items={allowedNav.map((item) => ({
            key: item.children ? `${item.key}-root` : item.key,
            icon: item.icon,
            label: item.children ? item.label : <Link to={item.key}>{item.label}</Link>,
            children: item.children?.map((child) => ({
              key: child.key,
              label: <Link to={child.key}>{child.label}</Link>
            }))
          }))}
```

Remove the old `selectedKeys={[location.pathname]}` prop.

- [ ] **Step 5: Add dictionary route**

Add this route beside the other `/system` routes:

```tsx
            <Route path="/system/dictionaries" element={<SystemPage section="dictionaries" />} />
```

- [ ] **Step 6: Run navigation test**

Run:

```bash
cd frontend && npm test -- App.test.tsx -t "renders system as one top-level menu"
```

Expected: PASS after Task 2.

## Task 3: Implement Dictionary Management Section

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Extend section type**

Change:

```tsx
type SystemSection = "overview" | "departments" | "users" | "roles" | "auditLogs";
```

to:

```tsx
type SystemSection = "overview" | "departments" | "users" | "roles" | "auditLogs" | "dictionaries";
```

- [ ] **Step 2: Update section metadata**

Change the `overview` metadata:

```tsx
    overview: {
      title: "系统概览",
      description: "集中查看系统治理入口、基础配置数量和最近审计动态。",
      guide: "先从系统概览判断要维护的对象，再进入组织、用户、角色权限、审计日志或字典管理页面处理具体动作。"
    },
```

Add a `dictionaries` metadata item:

```tsx
    dictionaries: {
      title: "字典管理",
      description: "维护客户、商机、行动、风险等 V1 基础选项。",
      guide: "先确认字典类型，再维护字典项；停用项不再作为新建业务数据的推荐选项。"
    }
```

- [ ] **Step 3: Update loading, error, refresh, action maps**

Add `dictionaries` to the maps:

```tsx
  const sectionLoading: Record<SystemSection, boolean> = {
    overview: dictionaries.loading || departments.loading || users.loading || roles.loading || auditLogs.loading,
    departments: departments.loading,
    users: users.loading || roles.loading,
    roles: roles.loading || permissions.loading,
    auditLogs: auditLogs.loading,
    dictionaries: dictionaries.loading
  };
```

```tsx
  const sectionError: Record<SystemSection, string> = {
    overview: dictionaries.error || departments.error || users.error || roles.error || auditLogs.error,
    departments: departments.error,
    users: users.error || roles.error,
    roles: roles.error || permissions.error,
    auditLogs: auditLogs.error,
    dictionaries: dictionaries.error
  };
```

```tsx
  const sectionRefresh: Record<SystemSection, () => Promise<void>> = {
    overview: async () => {
      await Promise.all([dictionaries.refresh(), users.refresh(), departments.refresh(), roles.refresh(), auditLogs.refresh()]);
    },
    departments: departments.refresh,
    users: async () => {
      await Promise.all([users.refresh(), roles.refresh()]);
    },
    roles: async () => {
      await Promise.all([roles.refresh(), permissions.refresh()]);
    },
    auditLogs: auditLogs.refresh,
    dictionaries: dictionaries.refresh
  };
```

Move the existing `新建字典` action from `overview` to `dictionaries`:

```tsx
  const sectionAction: Record<SystemSection, React.ReactNode> = {
    overview: null,
    departments: (
      <Button icon={<Plus size={16} />} type="primary" onClick={() => setDepartmentOpen(true)}>
        新建组织
      </Button>
    ),
    users: (
      <Space>
        <Button icon={<Plus size={16} />} type="primary" onClick={() => setUserOpen(true)}>
          新增用户
        </Button>
        <Button onClick={() => setResetOpen(true)}>重置密码</Button>
      </Space>
    ),
    roles: null,
    auditLogs: null,
    dictionaries: (
      <Button icon={<Plus size={16} />} type="primary" onClick={() => setTypeOpen(true)}>
        新建字典
      </Button>
    )
  };
```

- [ ] **Step 4: Keep overview as entry summary only**

In the `section === "overview"` block, keep `system-module-grid`, add a dictionary card, and remove the dictionary cards grid from overview:

```tsx
          <div className="system-module-grid">
            <SystemModuleCard title="组织管理" description="部门、区域和组织状态维护" path="/system/departments" value={departments.data.length} />
            <SystemModuleCard title="用户管理" description="账号、角色和状态维护" path="/system/users" value={users.data.length} />
            <SystemModuleCard title="角色权限" description="角色授权和权限点配置" path="/system/roles" value={roles.data.length} />
            <SystemModuleCard title="审计日志" description="操作轨迹、对象和结果追溯" path="/system/audit-logs" value={auditLogs.data.length} />
            <SystemModuleCard title="字典管理" description="基础选项、启停和排序维护" path="/system/dictionaries" value={dictionaries.data.length} />
          </div>
```

- [ ] **Step 5: Add dictionary section render block**

Add this block after the overview block:

```tsx
      {section === "dictionaries" ? (
        <div className="dictionary-grid">
          {dictionaries.data.map((dict) => (
            <Card
              key={dict.id}
              size="small"
              title={`${dict.dict_name} (${dict.dict_code})`}
              extra={
                <Button size="small" onClick={() => setItemTarget(dict)}>
                  新增项
                </Button>
              }
            >
              <Space wrap>
                {dict.items.map((item) => (
                  <Tag
                    key={item.id}
                    color={item.is_active ? "blue" : "default"}
                    onClick={() => {
                      setEditingItem(item);
                      itemEditForm.setFieldsValue(item);
                    }}
                  >
                    {item.item_name}
                  </Tag>
                ))}
              </Space>
            </Card>
          ))}
        </div>
      ) : null}
```

- [ ] **Step 6: Run dictionary page test**

Run:

```bash
cd frontend && npm test -- App.test.tsx -t "dictionary management"
```

Expected: PASS after Task 3.

## Task 4: Verification And UAT

**Files:**
- Modify: `docs/product/crm-v1-page-logic-refactor-todolist.md`
- Create: `/private/tmp/crm-system-management-browser-smoke.mjs` during execution only, not committed

- [ ] **Step 1: Run full frontend verification**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
```

Expected:

- `npm test`: all tests pass.
- `npm run build`: TypeScript and Vite build pass.

- [ ] **Step 2: Deploy current frontend build to UAT container**

Run:

```bash
docker exec crm-ai-v1-test-frontend-1 sh -c 'rm -rf /usr/share/nginx/html/*'
docker cp frontend/dist/. crm-ai-v1-test-frontend-1:/usr/share/nginx/html/
```

Expected: both commands exit 0.

- [ ] **Step 3: Run browser UAT smoke**

Create `/private/tmp/crm-system-management-browser-smoke.mjs` following the existing CDP smoke pattern used for previous modules. The smoke must:

- Open `http://127.0.0.1:5174/system`.
- Log in with the existing local UAT account through the UI.
- Verify `系统概览`, `组织管理`, `用户管理`, `角色权限`, `审计日志`, `字典管理`.
- Navigate to `/system/dictionaries`.
- Verify `字典管理`, `客户等级`, and `新建字典`.
- Verify no `服务端异常` banner.
- Capture screenshot `/private/tmp/v1-system-management-review-smoke.png`.

Run:

```bash
node /private/tmp/crm-system-management-browser-smoke.mjs
```

Expected: JSON output with `"status": "passed"` and screenshot path.

- [ ] **Step 4: Update module TODOList**

Update `docs/product/crm-v1-page-logic-refactor-todolist.md`:

- Mark module 8 as `Done`.
- Mark module 9 as `Current`.
- Set current task to `9-v1-full-regression`.
- Record verification commands and screenshot path.
- Temporarily record commit hash as `待提交`; replace with the actual hash after commit.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/styles.css docs/product/crm-v1-page-logic-refactor-todolist.md
git commit -m "feat: refine v1 system management navigation"
```

Expected: commit succeeds.

- [ ] **Step 6: Record final commit hash**

Run:

```bash
git rev-parse --short HEAD
```

Update `docs/product/crm-v1-page-logic-refactor-todolist.md` replacing `待提交` with the actual hash.

Run:

```bash
git add docs/product/crm-v1-page-logic-refactor-todolist.md
git commit -m "docs: record v1 system management progress"
```

Expected: documentation commit succeeds.

- [ ] **Step 7: Push**

Run:

```bash
git push origin main
```

Expected: push succeeds.

## Self-Review

- Spec coverage: The plan covers the system top-level menu, six child pages, dictionary independent page, overview responsibility change, permission-aware navigation, tests, UAT, and TODOList update.
- Placeholder scan: The plan contains no unspecified implementation placeholders. The only temporary value is the explicit `待提交` workflow marker that must be replaced after commit.
- Type consistency: `SystemSection` includes `dictionaries`; route `/system/dictionaries`, nav child key `/system/dictionaries`, and tests all use the same spelling.
