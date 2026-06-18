import { render, screen, waitFor } from "@testing-library/react";
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
      "system.user.manage"
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
  contacts: [],
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
  weeklyProgress: [],
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
    expect(await screen.findByText("account.create")).toBeInTheDocument();
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
});

async function loginThroughUi(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("用户名"), "sales");
  await user.type(screen.getByLabelText("密码"), "S3cure!123");
  await user.click(screen.getByRole("button", { name: /登\s*录/ }));
  await screen.findByText("销售一号");
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
