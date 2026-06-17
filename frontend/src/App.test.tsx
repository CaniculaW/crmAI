import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("CRM frontend shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the V1 navigation skeleton", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "项目型大客户 CRM" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "客户池" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "商机" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "周进展" })).toBeInTheDocument();
  });

  it("saves login state and supports logout", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "模拟登录" }));

    expect(localStorage.getItem("crm.authenticated")).toBe("true");
    expect(screen.getByText("已登录")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "退出" }));

    expect(localStorage.getItem("crm.authenticated")).toBeNull();
    expect(screen.getByText("未登录")).toBeInTheDocument();
  });

  it("shows unified request errors", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "服务暂不可用" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "检查后端" }));

    expect(await screen.findByText("服务暂不可用")).toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it("unwraps successful unified API responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "OK",
          message: "success",
          data: { service: "crm-ai-backend", status: "UP" },
          trace_id: "frontend-trace-001"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "检查后端" }));

    expect(await screen.findByText("crm-ai-backend: UP")).toBeInTheDocument();
    fetchMock.mockRestore();
  });
});
