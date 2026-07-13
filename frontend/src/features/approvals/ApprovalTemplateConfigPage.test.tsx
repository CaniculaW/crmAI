import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crmApi, type ApprovalTemplate, type ApprovalTemplateNode, type SystemRole } from "../../api/crm";
import { ApprovalTemplateConfigPage } from "./ApprovalTemplateConfigPage";

const getComputedStyle = window.getComputedStyle.bind(window);

const templates: ApprovalTemplate[] = [
  {
    id: 7,
    tenant_id: 1,
    object_type: "contract",
    template_name: "合同审批",
    status: "active",
    is_default: true,
    created_by: 1001,
    created_at: "2026-07-01T09:00:00+08:00",
    updated_by: 1001,
    updated_at: "2026-07-12T10:30:00+08:00"
  },
  {
    id: 8,
    tenant_id: 1,
    object_type: "bid",
    template_name: "投标审批",
    status: "inactive",
    is_default: false,
    created_by: 1001,
    created_at: "2026-07-02T09:00:00+08:00",
    updated_by: null,
    updated_at: "2026-07-02T09:00:00+08:00"
  },
  {
    id: 9,
    tenant_id: 1,
    object_type: "quotation",
    template_name: "报价审批",
    status: "active",
    is_default: false,
    created_by: 1001,
    created_at: "2026-07-03T09:00:00+08:00",
    updated_by: null,
    updated_at: "2026-07-03T09:00:00+08:00"
  }
];

const roles: SystemRole[] = [
  { id: 3, code: "legal", name: "法务", permission_codes: [] },
  { id: 4, code: "finance", name: "财务", permission_codes: [] }
];

const nodes: ApprovalTemplateNode[] = [
  {
    id: 51,
    template_id: 7,
    step_order: 1,
    node_name: "法务审批",
    approver_role_id: 3,
    approver_role_name: "法务",
    status: "active",
    created_at: "2026-07-01T09:00:00+08:00",
    updated_at: "2026-07-01T09:00:00+08:00"
  },
  {
    id: 52,
    template_id: 7,
    step_order: 2,
    node_name: "财务审批",
    approver_role_id: 4,
    approver_role_name: "财务",
    status: "active",
    created_at: "2026-07-01T09:00:00+08:00",
    updated_at: "2026-07-01T09:00:00+08:00"
  }
];

describe("ApprovalTemplateConfigPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => getComputedStyle(element));
    vi.spyOn(message, "success").mockImplementation(() => undefined as never);
    vi.spyOn(message, "error").mockImplementation(() => undefined as never);
  });

  it("renders the compact approval template list", async () => {
    mockApprovalApis();

    render(<ApprovalTemplateConfigPage />);

    expect(screen.getByRole("heading", { name: "审批配置" })).toBeInTheDocument();
    expect(await screen.findByText("合同审批")).toBeInTheDocument();
    expect(screen.getByText("投标审批")).toBeInTheDocument();
    expect(screen.getByText("报价审批")).toBeInTheDocument();
    for (const column of ["类型", "名称", "默认", "状态", "更新时间", "操作"]) {
      expect(screen.getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    expect(screen.getByText("合同")).toBeInTheDocument();
    expect(screen.getByText("标书")).toBeInTheDocument();
    expect(screen.getByText("报价")).toBeInTheDocument();
  });

  it("opens the node drawer and loads roles and ordered nodes", async () => {
    const api = mockApprovalApis();
    const user = userEvent.setup();
    render(<ApprovalTemplateConfigPage />);

    await user.click(await screen.findByRole("button", { name: "配置模板 合同审批" }));

    expect(api.listNodes).toHaveBeenCalledWith(7);
    expect(api.listRoles).toHaveBeenCalledOnce();
    const drawer = within(await screen.findByRole("dialog", { name: "审批节点：合同审批" }));
    expect(await drawer.findByText("法务审批")).toBeInTheDocument();
    expect(drawer.getByText("财务审批")).toBeInTheDocument();
    expect(drawer.getByText("法务")).toBeInTheDocument();
    expect(drawer.getByRole("cell", { name: "1" })).toBeInTheDocument();
    expect(drawer.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });

  it("suggests the next step order and adds a node", async () => {
    const api = mockApprovalApis();
    api.addNode.mockResolvedValue({
      ...nodes[1],
      id: 53,
      step_order: 3,
      node_name: "总经理审批",
      approver_role_id: 3,
      approver_role_name: "法务"
    });
    const user = userEvent.setup();
    render(<ApprovalTemplateConfigPage />);

    await user.click(await screen.findByRole("button", { name: "配置模板 合同审批" }));
    await screen.findByText("法务审批");
    await user.click(screen.getByRole("button", { name: "新增节点" }));

    const dialog = latestDialog("新增审批节点");
    expect(dialog.getByLabelText("步骤顺序")).toHaveValue("3");
    await user.type(dialog.getByLabelText("节点名称"), "总经理审批");
    await user.click(dialog.getByLabelText("审批角色"));
    await user.click(await screen.findByTitle("法务"));
    await user.click(dialog.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.addNode).toHaveBeenCalledWith(7, {
        step_order: 3,
        node_name: "总经理审批",
        approver_role_id: 3,
        status: "active"
      });
    });
  });

  it("creates a quotation approval template", async () => {
    const api = mockApprovalApis();
    api.createTemplate.mockResolvedValue({
      ...templates[2],
      id: 10,
      template_name: "大额报价审批",
      is_default: true
    });
    const user = userEvent.setup();
    render(<ApprovalTemplateConfigPage />);

    await screen.findByText("合同审批");
    await user.click(screen.getByRole("button", { name: "新建模板" }));
    const dialog = latestDialog("新建审批模板");
    await user.click(dialog.getByLabelText("对象类型"));
    await user.click(await screen.findByTitle("报价"));
    await user.type(dialog.getByLabelText("模板名称"), "大额报价审批");
    await user.click(dialog.getByRole("switch", { name: "默认模板" }));
    await user.click(dialog.getByRole("button", { name: "保存模板" }));

    await waitFor(() => {
      expect(api.createTemplate).toHaveBeenCalledWith({
        object_type: "quotation",
        template_name: "大额报价审批",
        is_default: true,
        status: "active"
      });
    });
  });

  it("edits a template through the update API", async () => {
    const api = mockApprovalApis();
    api.updateTemplate.mockResolvedValue({
      ...templates[0],
      template_name: "合同审批（更新）",
      is_default: false,
      status: "inactive"
    });
    const user = userEvent.setup();
    render(<ApprovalTemplateConfigPage />);

    await user.click(await screen.findByRole("button", { name: "编辑模板 合同审批" }));
    const dialog = latestDialog("编辑审批模板");
    expect(dialog.getByLabelText("对象类型")).toBeDisabled();
    await user.clear(dialog.getByLabelText("模板名称"));
    await user.type(dialog.getByLabelText("模板名称"), "合同审批（更新）");
    await user.click(dialog.getByRole("switch", { name: "默认模板" }));
    await user.click(dialog.getByLabelText("状态"));
    await user.click(await screen.findByTitle("停用"));
    await user.click(dialog.getByRole("button", { name: "保存模板" }));

    await waitFor(() => {
      expect(api.updateTemplate).toHaveBeenCalledWith(7, {
        template_name: "合同审批（更新）",
        is_default: false,
        status: "inactive"
      });
    });
  });

  it("edits an existing approval node", async () => {
    const api = mockApprovalApis();
    api.updateNode.mockResolvedValue({ ...nodes[0], node_name: "法务复核" });
    const user = userEvent.setup();
    render(<ApprovalTemplateConfigPage />);

    await user.click(await screen.findByRole("button", { name: "配置模板 合同审批" }));
    await screen.findByText("法务审批");
    await user.click(screen.getByRole("button", { name: "编辑节点 法务审批" }));
    const dialog = latestDialog("编辑审批节点");
    await user.clear(dialog.getByLabelText("节点名称"));
    await user.type(dialog.getByLabelText("节点名称"), "法务复核");
    await user.click(dialog.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.updateNode).toHaveBeenCalledWith(7, 51, {
        step_order: 1,
        node_name: "法务复核",
        approver_role_id: 3,
        status: "active"
      });
    });
  });

  it("reports template loading errors with an Ant Design message", async () => {
    mockApprovalApis();
    vi.spyOn(crmApi.approvalTemplates, "list").mockRejectedValue(new Error("模板接口不可用"));
    const errorMessage = vi.mocked(message.error);

    render(<ApprovalTemplateConfigPage />);

    await waitFor(() => {
      expect(errorMessage).toHaveBeenCalledWith("模板接口不可用");
    });
  });
});

function mockApprovalApis() {
  return {
    listTemplates: vi.spyOn(crmApi.approvalTemplates, "list").mockResolvedValue(templates),
    createTemplate: vi.spyOn(crmApi.approvalTemplates, "create").mockResolvedValue(templates[0]),
    updateTemplate: vi.spyOn(crmApi.approvalTemplates, "update").mockResolvedValue(templates[0]),
    listNodes: vi.spyOn(crmApi.approvalTemplates, "listNodes").mockResolvedValue(nodes),
    addNode: vi.spyOn(crmApi.approvalTemplates, "addNode").mockResolvedValue(nodes[0]),
    updateNode: vi.spyOn(crmApi.approvalTemplates, "updateNode").mockResolvedValue(nodes[0]),
    listRoles: vi.spyOn(crmApi.roles, "list").mockResolvedValue(roles)
  };
}

function latestDialog(name: string) {
  const titles = screen.getAllByText(name);
  const modal = titles[titles.length - 1].closest(".ant-modal");
  if (!modal) throw new Error(`Modal not found for title: ${name}`);
  return within(modal as HTMLElement);
}
