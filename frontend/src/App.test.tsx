import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const apiData = {
  user: {
    id: 1001,
    name: "销售一号",
    permissions: [
      "account.read",
      "account.create",
      "contact.read",
      "contact.create",
      "opportunity.read",
      "opportunity.create",
      "activity.read",
      "activity.create",
      "activity.complete",
      "reminder.read",
      "weekly_progress.read",
      "system.audit.read",
      "system.dict.manage",
      "system.user.manage",
      "system.role.manage"
    ]
  },
  accounts: [
    {
      id: 1,
      account_name: "测试客户A",
      account_type: "enterprise",
      account_level: "A",
      account_status: "following",
      owner_department_id: 1,
      owner_user_id: 1001
    }
  ],
  contacts: [
    {
      id: 21,
      account_id: 1,
      name: "张决策",
      title: "CIO",
      attitude: "supporter",
      relationship_heat: "trusted",
      project_roles: ["decision_maker", "budget_promoter"]
    },
    {
      id: 22,
      account_id: 1,
      name: "李采购",
      title: "采购经理",
      attitude: "neutral",
      relationship_heat: "warm",
      project_roles: ["procurement_executor"]
    }
  ],
  opportunities: [
    {
      id: 10,
      account_id: 1,
      opportunity_name: "测试商机A",
      stage: "lead",
      status: "following",
      risk_status: "normal",
      owner_department_id: 1,
      owner_user_id: 1001
    }
  ],
  activities: [],
  reminders: [],
  weeklyProgress: [
    {
      opportunity_id: 10,
      account_id: 1,
      owner_user_id: 1001,
      week_start_date: "2026-06-15",
      week_end_date: "2026-06-21",
      activity_count: 1,
      progress_items: [{ activity_id: 88, subject: "方案沟通", conclusion: "客户认可", next_plan: "推进预算" }]
    }
  ],
  dictionaries: [
    {
      id: 501,
      dict_code: "account_level",
      dict_name: "客户等级",
      items: [{ id: 9001, item_code: "A", item_name: "A级", is_active: true }]
    }
  ],
  auditLogs: [
    {
      id: 7001,
      actor_user_id: 1001,
      module_code: "account",
      action_code: "account.create",
      object_type: "crm_account",
      object_id: 1,
      result: "success",
      trace_id: "trace-001",
      occurred_at: "2026-06-18T10:00:00+08:00"
    }
  ],
  users: [
    {
      id: 1001,
      department_id: 1,
      name: "销售一号",
      email: "sales@example.com",
      status: "active",
      roles: [{ id: 3001, code: "sales_admin", name: "销售管理员" }]
    }
  ],
  departments: [
    {
      id: 1,
      code: "sales-cn",
      name: "华东销售部",
      region_code: "CN-31",
      status: "active"
    }
  ],
  roles: [
    {
      id: 3001,
      code: "sales_admin",
      name: "销售管理员",
      description: "V1 销售管理员",
      permission_codes: ["account.read"]
    }
  ],
  permissions: [
    {
      id: 4101,
      permission_code: "account.read",
      permission_name: "查看客户",
      permission_type: "operation",
      module_code: "account"
    },
    {
      id: 4102,
      permission_code: "account.create",
      permission_name: "新建客户",
      permission_type: "operation",
      module_code: "account"
    },
    {
      id: 4103,
      permission_code: "system.audit.read",
      permission_name: "查看审计日志",
      permission_type: "operation",
      module_code: "system"
    }
  ]
};

describe("CRM frontend V1 workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the real login form before authentication", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "项目型大客户 CRM" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /登\s*录/ })).toBeInTheDocument();
  });

  it("logs in, unwraps unified responses, and renders the V1 navigation", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("用户名"), "sales");
    await user.type(screen.getByLabelText("密码"), "S3cure!123");
    await user.click(screen.getByRole("button", { name: /登\s*录/ }));

    expect(await screen.findByText("销售一号")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "客户池" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "商机" })).toBeInTheDocument();
    expect(await screen.findByText("我的商机")).toBeInTheDocument();
    expect(localStorage.getItem("crm.access_token")).toBe("token-001");
  });

  it("shows login errors from the unified API layer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ code: "UNAUTHORIZED", message: "用户名或密码错误" }, 401)
    );
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("用户名"), "bad");
    await user.type(screen.getByLabelText("密码"), "bad");
    await user.click(screen.getByRole("button", { name: /登\s*录/ }));

    expect(await screen.findByText("用户名或密码错误")).toBeInTheDocument();
  });

  it("creates an account from the customer list page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    expect(await screen.findByText("测试客户A")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建客户" }));
    await user.type(screen.getByLabelText("客户名称"), "新增客户B");
    await user.click(screen.getByRole("button", { name: "保存客户" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/accounts",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("新增客户B")
        })
      );
    });
  });

  it("filters accounts with backend query parameters", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.type(screen.getByPlaceholderText("客户名称/简称"), "测试");
    await user.click(screen.getByRole("button", { name: /筛\s*选/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/accounts?keyword="), expect.anything());
    });
  });

  it("updates an account from the customer list page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.click(screen.getByRole("button", { name: /编\s*辑/ }));
    await user.type(screen.getByLabelText("备注"), "重点推进");
    await user.click(screen.getByRole("button", { name: /保存\s*修改/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/accounts/1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("重点推进")
        })
      );
    });
  });

  it("shows a grouped relationship view for contacts", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "联系人" }));

    expect(await screen.findByText("关系视图")).toBeInTheDocument();
    expect(screen.getByText("按项目角色")).toBeInTheDocument();
    expect(screen.getByText("按态度")).toBeInTheDocument();
    expect(screen.getByText("decision_maker")).toBeInTheDocument();
    expect(screen.getByText("budget_promoter")).toBeInTheDocument();
    expect(screen.getAllByText("supporter").length).toBeGreaterThan(1);
    expect(screen.getAllByText("张决策").length).toBeGreaterThan(1);
  });

  it("filters weekly progress by owner and natural week", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "周进展" }));
    expect(await screen.findByText("2026-06-15")).toBeInTheDocument();
    await user.type(screen.getByLabelText("负责人ID"), "1001");
    await user.type(screen.getByLabelText("周开始"), "2026-06-15");
    await user.type(screen.getByLabelText("周结束"), "2026-06-21");
    await user.click(screen.getByRole("button", { name: /筛\s*选/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/weekly-progress/opportunities?"),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("owner_user_id=1001"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("week_start=2026-06-15"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("week_end=2026-06-21"), expect.anything());
    });
  });

  it("shows business guidance and Chinese empty state on empty business lists", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "销售行动" }));

    expect(await screen.findByRole("heading", { name: "销售行动" })).toBeInTheDocument();
    expect(screen.getByText("当前页面怎么用")).toBeInTheDocument();
    expect(screen.getByText("先新建行动，或调整筛选条件查看计划、完成和逾期行动。")).toBeInTheDocument();
    expect(screen.getByText("暂无销售行动")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建行动" })).toBeInTheDocument();
  });

  it("changes the current user's password", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("button", { name: "修改密码" }));
    await user.type(screen.getByLabelText("原密码"), "Old!23456");
    await user.type(screen.getByLabelText("新密码"), "New!23456");
    await user.click(screen.getByRole("button", { name: "保存密码" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/change-password",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("New!23456")
        })
      );
    });
  });

  it("creates a dictionary type from system management", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统管理" }));
    expect(await screen.findByText("客户等级 (account_level)")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "角色权限" }).length).toBeGreaterThan(0);
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

  it("renders system management as independent professional modules", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统管理" }));

    expect(await screen.findByRole("heading", { name: "系统管理" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "组织管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "用户管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "角色权限" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "审计日志" }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("link", { name: "组织管理" })[0]);
    expect(await screen.findByRole("heading", { name: "组织管理" })).toBeInTheDocument();
    expect(screen.getByText("华东销售部")).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "用户管理" })[0]);
    expect(await screen.findByRole("heading", { name: "用户管理" })).toBeInTheDocument();
    expect((await screen.findAllByText("销售一号")).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
    expect(await screen.findByRole("heading", { name: "角色权限" })).toBeInTheDocument();
    expect((await screen.findAllByText("销售管理员")).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("link", { name: "审计日志" })[0]);
    expect(await screen.findByRole("heading", { name: "审计日志" })).toBeInTheDocument();
    expect(await screen.findByText("account.create")).toBeInTheDocument();
  });

  it("updates role permissions from the dedicated roles page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统管理" }));
    await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
    expect((await screen.findAllByText("销售管理员")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "授权" }));
    await user.click(await screen.findByLabelText("新建客户"));
    await user.click(screen.getByLabelText("查看审计日志"));
    await user.click(screen.getByRole("button", { name: "保存授权" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/roles/3001/permissions",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("system.audit.read")
        })
      );
    });
  });

  it("creates departments and maintains users from dedicated system pages", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统管理" }));
    await user.click(screen.getAllByRole("link", { name: "组织管理" })[0]);
    expect(await screen.findByText("华东销售部")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建组织" }));
    const departmentDialog = latestDialog();
    await user.type(departmentDialog.getByLabelText("组织编码"), "sales-south");
    await user.type(departmentDialog.getByLabelText("组织名称"), "华南销售部");
    await user.type(departmentDialog.getByLabelText("区域编码"), "CN-44");
    await user.click(departmentDialog.getByRole("button", { name: "保存组织" }));

    await user.click(screen.getAllByRole("link", { name: "用户管理" })[0]);
    await user.click(screen.getByRole("button", { name: "新增用户" }));
    const userCreateDialog = latestDialog();
    await user.type(userCreateDialog.getByLabelText("部门ID"), "1");
    await user.type(userCreateDialog.getByLabelText("姓名"), "新增销售");
    await user.type(userCreateDialog.getByLabelText("邮箱"), "new-sales@example.com");
    await user.type(userCreateDialog.getByLabelText("登录账号"), "new_sales");
    await user.type(userCreateDialog.getByLabelText("初始密码"), "S3cure!123");
    await user.click(userCreateDialog.getByLabelText("销售管理员"));
    await user.click(userCreateDialog.getByRole("button", { name: "保存用户" }));

    await user.click(screen.getByRole("button", { name: "编辑用户" }));
    const userEditDialog = latestDialog();
    await user.clear(userEditDialog.getByLabelText("姓名"));
    await user.type(userEditDialog.getByLabelText("姓名"), "销售一号更新");
    await user.click(userEditDialog.getByRole("button", { name: "保存用户" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/departments",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("sales-south")
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/users",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("new_sales")
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/users/1001",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("销售一号更新")
        })
      );
    });
  });
});

function latestDialog() {
  const dialogs = screen.getAllByRole("dialog");
  const dialog = dialogs[dialogs.length - 1];
  return within(dialog);
}

async function loginThroughUi(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("用户名"), "sales");
  await user.type(screen.getByLabelText("密码"), "S3cure!123");
  await user.click(screen.getByRole("button", { name: /登\s*录/ }));
  await screen.findByRole("link", { name: "工作台" });
}

function mockCrmFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const path = url.split("?")[0];
    const method = init?.method ?? "GET";
    if (path.endsWith("/api/auth/login")) {
      return jsonResponse({ code: "OK", data: { access_token: "token-001", token_type: "Bearer", user: apiData.user } });
    }
    if (path.endsWith("/api/auth/logout")) {
      return jsonResponse({ code: "OK", data: { logged_out: true } });
    }
    if (path.endsWith("/api/auth/me")) {
      return jsonResponse({ code: "OK", data: apiData.user });
    }
    if (path.endsWith("/api/auth/change-password")) {
      return jsonResponse({ code: "OK", data: { password_changed: true } });
    }
    if (path.endsWith("/api/auth/reset-password")) {
      return jsonResponse({ code: "OK", data: { force_password_change: true } });
    }
    if (path.endsWith("/api/accounts/1") && method === "PATCH") {
      return jsonResponse({ code: "OK", data: { ...apiData.accounts[0], remark: "重点推进" } });
    }
    if (path.endsWith("/api/accounts") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...apiData.accounts[0], id: 2, account_name: "新增客户B" } });
    }
    if (path.endsWith("/api/accounts")) {
      return jsonResponse({ code: "OK", data: apiData.accounts });
    }
    if (path.endsWith("/api/contacts")) {
      return jsonResponse({ code: "OK", data: apiData.contacts });
    }
    if (path.endsWith("/api/opportunities")) {
      return jsonResponse({ code: "OK", data: apiData.opportunities });
    }
    if (path.endsWith("/api/activities")) {
      return jsonResponse({ code: "OK", data: apiData.activities });
    }
    if (path.endsWith("/api/reminders")) {
      return jsonResponse({ code: "OK", data: apiData.reminders });
    }
    if (path.endsWith("/api/weekly-progress/opportunities")) {
      return jsonResponse({ code: "OK", data: apiData.weeklyProgress });
    }
    if (path.endsWith("/api/system/dicts")) {
      return jsonResponse({ code: "OK", data: apiData.dictionaries });
    }
    if (path.endsWith("/api/system/audit-logs")) {
      return jsonResponse({ code: "OK", data: apiData.auditLogs });
    }
    if (path.endsWith("/api/system/departments") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...apiData.departments[0], id: 2, code: "sales-south", name: "华南销售部" } });
    }
    if (path.endsWith("/api/system/departments")) {
      return jsonResponse({ code: "OK", data: apiData.departments });
    }
    if (path.endsWith("/api/system/users") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...apiData.users[0], id: 1002, name: "新增销售" } });
    }
    if (path.endsWith("/api/system/users")) {
      return jsonResponse({ code: "OK", data: apiData.users });
    }
    if (path.endsWith("/api/system/users/1001") && method === "PUT") {
      return jsonResponse({ code: "OK", data: { ...apiData.users[0], name: "销售一号更新" } });
    }
    if (path.endsWith("/api/system/roles")) {
      return jsonResponse({ code: "OK", data: apiData.roles });
    }
    if (path.endsWith("/api/system/permissions")) {
      return jsonResponse({ code: "OK", data: apiData.permissions });
    }
    if (path.endsWith("/api/system/roles/3001/permissions") && method === "PUT") {
      return jsonResponse({
        code: "OK",
        data: {
          ...apiData.roles[0],
          permission_codes: ["account.read", "account.create", "system.audit.read"]
        }
      });
    }
    if (path.endsWith("/api/system/dicts/types") && method === "POST") {
      return jsonResponse({ code: "OK", data: { id: 502, dict_code: "risk_level", dict_name: "风险等级", items: [] } });
    }
    if (path.includes("/api/system/dicts/types/") && path.endsWith("/items") && method === "POST") {
      return jsonResponse({ code: "OK", data: apiData.dictionaries[0] });
    }
    if (path.includes("/api/system/dicts/items/") && method === "PATCH") {
      return jsonResponse({ code: "OK", data: apiData.dictionaries[0] });
    }
    return jsonResponse({ code: "NOT_FOUND", message: "not found" }, 404);
  });
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
