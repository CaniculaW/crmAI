import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crmApi } from "../../api/crm";
import type {
  ApprovalInstanceDetail,
  ApprovalObjectStatus,
  ApprovalObjectType,
  Contract,
  SolutionDocument
} from "../../api/crm";
import { ApprovalStatusPanel } from "./ApprovalStatusPanel";

const emptyStatus: ApprovalObjectStatus = {
  object_type: "quotation",
  object_id: 12,
  instance: null,
  history: []
};

const pendingDetail: ApprovalInstanceDetail = {
  instance: {
    id: 41,
    tenant_id: 1,
    template_id: 7,
    object_type: "quotation",
    object_id: 12,
    object_name: "年度报价",
    status: "pending",
    current_step_order: 2,
    submitted_by: 1001,
    submitted_at: "2026-07-14T09:00:00+08:00",
    completed_at: null,
    result_comment: null,
    created_at: "2026-07-14T09:00:00+08:00",
    updated_at: "2026-07-14T09:30:00+08:00"
  },
  nodes: [
    {
      id: 51,
      instance_id: 41,
      step_order: 1,
      node_name: "销售负责人审核",
      approver_role_id: 3,
      approver_role_name: "销售负责人",
      status: "approved",
      handled_by: 1002,
      handled_at: "2026-07-14T09:20:00+08:00",
      comment: "预算核验通过",
      created_at: "2026-07-14T09:00:00+08:00",
      updated_at: "2026-07-14T09:20:00+08:00"
    },
    {
      id: 52,
      instance_id: 41,
      step_order: 2,
      node_name: "财务复核",
      approver_role_id: 4,
      approver_role_name: "财务",
      status: "pending",
      handled_by: null,
      handled_at: null,
      comment: null,
      created_at: "2026-07-14T09:00:00+08:00",
      updated_at: "2026-07-14T09:20:00+08:00"
    }
  ],
  actions: [
    {
      id: 61,
      instance_id: 41,
      node_id: null,
      action: "submit",
      actor_user_id: 1001,
      comment: "发起审批",
      action_at: "2026-07-14T09:00:00+08:00"
    },
    {
      id: 62,
      instance_id: 41,
      node_id: 51,
      action: "approve",
      actor_user_id: 1002,
      comment: "预算核验通过",
      action_at: "2026-07-14T09:20:00+08:00"
    }
  ]
};

describe("ApprovalStatusPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the object approval status on mount and shows the empty state", async () => {
    const objectStatus = vi.spyOn(crmApi.approvals, "objectStatus").mockResolvedValue(emptyStatus);

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit={false}
        isPending={false}
      />
    );

    expect(await screen.findByText("尚未提交审批")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交审批" })).not.toBeInTheDocument();
    expect(objectStatus).toHaveBeenCalledWith("quotation", 12);
  });

  it("shows the submit action when the user has permission and no approval exists", async () => {
    vi.spyOn(crmApi.approvals, "objectStatus").mockResolvedValue(emptyStatus);

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit
        isPending={false}
      />
    );

    expect(await screen.findByRole("button", { name: "提交审批" })).toBeInTheDocument();
  });

  it.each([
    ["quotation", "solutions"],
    ["bid", "solutions"],
    ["contract", "contracts"]
  ] as const)(
    "submits a %s through the %s shortcut, refreshes, and notifies the parent",
    async (objectType, expectedShortcut) => {
      const objectId = 27;
      const status: ApprovalObjectStatus = {
        ...emptyStatus,
        object_type: objectType as ApprovalObjectType,
        object_id: objectId
      };
      const objectStatus = vi
        .spyOn(crmApi.approvals, "objectStatus")
        .mockResolvedValue(status);
      const submitSolution = vi
        .spyOn(crmApi.solutions, "submitApproval")
        .mockResolvedValue({} as SolutionDocument);
      const submitContract = vi
        .spyOn(crmApi.contracts, "submitApproval")
        .mockResolvedValue({} as Contract);
      const onSubmitted = vi.fn();
      const user = userEvent.setup();

      render(
        <ApprovalStatusPanel
          objectType={objectType}
          objectId={objectId}
          canSubmit
          isPending={false}
          onSubmitted={onSubmitted}
        />
      );

      await user.click(await screen.findByRole("button", { name: "提交审批" }));

      const expected = expectedShortcut === "solutions" ? submitSolution : submitContract;
      const unexpected = expectedShortcut === "solutions" ? submitContract : submitSolution;
      await waitFor(() => expect(expected).toHaveBeenCalledWith(objectId));
      expect(unexpected).not.toHaveBeenCalled();
      await waitFor(() => expect(objectStatus).toHaveBeenCalledTimes(2));
      expect(onSubmitted).toHaveBeenCalledOnce();
    }
  );

  it("shows a pending approval explicitly and hides the submit action", async () => {
    vi.spyOn(crmApi.approvals, "objectStatus").mockResolvedValue({
      ...emptyStatus,
      instance: pendingDetail,
      history: [pendingDetail]
    });

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit
        isPending={false}
      />
    );

    expect(await screen.findByText("审批中")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交审批" })).not.toBeInTheDocument();
  });

  it("shows the submit action when the latest approval is completed", async () => {
    const approvedDetail: ApprovalInstanceDetail = {
      ...pendingDetail,
      instance: {
        ...pendingDetail.instance,
        status: "approved",
        current_step_order: null,
        completed_at: "2026-07-14T10:00:00+08:00"
      }
    };
    vi.spyOn(crmApi.approvals, "objectStatus").mockResolvedValue({
      ...emptyStatus,
      instance: approvedDetail,
      history: [approvedDetail]
    });

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit
        isPending={false}
      />
    );

    expect(await screen.findByRole("button", { name: "提交审批" })).toBeInTheDocument();
  });

  it("shows the approval template and submitted time", async () => {
    vi.spyOn(crmApi.approvals, "objectStatus").mockResolvedValue({
      ...emptyStatus,
      instance: pendingDetail,
      history: [pendingDetail]
    });

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit={false}
        isPending
      />
    );

    expect(await screen.findByText("模板 #7")).toBeInTheDocument();
    expect(screen.getByText("2026-07-14 09:00:00")).toBeInTheDocument();
  });

  it("shows ordered approval nodes, historical actions, and comments", async () => {
    vi.spyOn(crmApi.approvals, "objectStatus").mockResolvedValue({
      ...emptyStatus,
      instance: pendingDetail,
      history: [pendingDetail]
    });

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit={false}
        isPending
      />
    );

    expect(await screen.findByText("审批节点")).toBeInTheDocument();
    const firstNode = screen.getByText("1. 销售负责人审核");
    const secondNode = screen.getByText("2. 财务复核");
    expect(firstNode.compareDocumentPosition(secondNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("销售负责人")).toBeInTheDocument();
    expect(screen.getByText("财务")).toBeInTheDocument();
    expect(screen.getByText("历史操作")).toBeInTheDocument();
    expect(screen.getByText("提交审批 · 用户 #1001")).toBeInTheDocument();
    expect(screen.getByText("通过 · 用户 #1002")).toBeInTheDocument();
    expect(screen.getAllByText("意见：预算核验通过")).toHaveLength(2);
  });

  it("shows an error when loading the approval status fails", async () => {
    vi.spyOn(crmApi.approvals, "objectStatus").mockRejectedValue(new Error("状态查询失败"));

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit={false}
        isPending={false}
      />
    );

    expect(await screen.findByText("审批状态加载失败：状态查询失败")).toBeInTheDocument();
  });

  it("shows an error and restores the action when submission fails", async () => {
    const objectStatus = vi.spyOn(crmApi.approvals, "objectStatus").mockResolvedValue(emptyStatus);
    vi.spyOn(crmApi.solutions, "submitApproval").mockRejectedValue(new Error("当前状态不可提交"));
    const onSubmitted = vi.fn();
    const user = userEvent.setup();

    render(
      <ApprovalStatusPanel
        objectType="quotation"
        objectId={12}
        canSubmit
        isPending={false}
        onSubmitted={onSubmitted}
      />
    );

    await user.click(await screen.findByRole("button", { name: "提交审批" }));

    expect(await screen.findByText("提交审批失败：当前状态不可提交")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /提交审批/ })).not.toHaveClass("ant-btn-loading");
    expect(objectStatus).toHaveBeenCalledOnce();
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
