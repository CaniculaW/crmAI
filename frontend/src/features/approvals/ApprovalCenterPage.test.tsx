import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  crmApi,
  type ApprovalInstanceDetail,
  type ApprovalTask,
  type CurrentUser,
  type SystemRoleSummary
} from "../../api/crm";
import { ApprovalCenterPage } from "./ApprovalCenterPage";

type ApprovalCenterUser = CurrentUser & { roles: SystemRoleSummary[] };

const currentUser: ApprovalCenterUser = {
  id: 1001,
  name: "审批用户",
  permissions: [],
  roles: []
};

const approverUser: ApprovalCenterUser = {
  ...currentUser,
  permissions: ["approval.approve"],
  roles: [{ id: 12, code: "finance_owner", name: "财务负责人" }]
};

const unmatchedRoleUser: ApprovalCenterUser = {
  ...approverUser,
  roles: [{ id: 99, code: "sales_rep", name: "销售人员" }]
};

const pendingTask: ApprovalTask = {
  instance: {
    id: 41,
    tenant_id: 1,
    template_id: 7,
    object_type: "contract",
    object_id: 301,
    object_name: "V2试点项目合同",
    status: "pending",
    current_step_order: 2,
    submitted_by: 1002,
    submitted_at: "2026-07-14T09:30:00+08:00",
    completed_at: null,
    result_comment: null,
    created_at: "2026-07-14T09:30:00+08:00",
    updated_at: "2026-07-14T09:30:00+08:00"
  },
  current_node: {
    id: 52,
    instance_id: 41,
    step_order: 2,
    node_name: "财务负责人审批",
    approver_role_id: 12,
    approver_role_name: "财务负责人",
    status: "pending",
    handled_by: null,
    handled_at: null,
    comment: null,
    created_at: "2026-07-14T09:30:00+08:00",
    updated_at: "2026-07-14T09:30:00+08:00"
  }
};

const pendingDetail: ApprovalInstanceDetail = {
  instance: pendingTask.instance,
  nodes: [
    pendingTask.current_node!,
    {
      id: 51,
      instance_id: 41,
      step_order: 1,
      node_name: "销售总监审批",
      approver_role_id: 11,
      approver_role_name: "销售总监",
      status: "approved",
      handled_by: 1003,
      handled_at: "2026-07-14T10:00:00+08:00",
      comment: "合同条款已确认",
      created_at: "2026-07-14T09:30:00+08:00",
      updated_at: "2026-07-14T10:00:00+08:00"
    }
  ],
  actions: [
    {
      id: 61,
      instance_id: 41,
      node_id: null,
      action: "submit",
      actor_user_id: 1002,
      comment: "请审批合同",
      action_at: "2026-07-14T09:30:00+08:00"
    },
    {
      id: 62,
      instance_id: 41,
      node_id: 51,
      action: "approve",
      actor_user_id: 1003,
      comment: "合同条款已确认",
      action_at: "2026-07-14T10:00:00+08:00"
    }
  ]
};

const secondTask: ApprovalTask = {
  instance: {
    ...pendingTask.instance,
    id: 42,
    object_id: 302,
    object_name: "续签项目合同"
  },
  current_node: {
    ...pendingTask.current_node!,
    id: 53,
    instance_id: 42
  }
};

const secondDetail: ApprovalInstanceDetail = {
  instance: secondTask.instance,
  nodes: [secondTask.current_node!],
  actions: []
};

const longActionComment = "金额依据与合同条款需要补充说明ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("ApprovalCenterPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initially loads the pending approval bucket", async () => {
    const tasks = vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);

    render(<ApprovalCenterPage currentUser={currentUser} />);

    expect(screen.getByRole("heading", { name: "审批中心" })).toBeInTheDocument();
    await waitFor(() => expect(tasks).toHaveBeenCalledWith("pending"));
    expect(await screen.findByText("V2试点项目合同")).toBeInTheDocument();
  });

  it("renders all three approval tabs", async () => {
    const tasks = vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([]);

    render(<ApprovalCenterPage currentUser={currentUser} />);

    await waitFor(() => expect(tasks).toHaveBeenCalledWith("pending"));
    expect(screen.getByRole("tab", { name: "待我审批" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "我发起的" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "已处理" })).toBeInTheDocument();
  });

  it("loads the selected bucket whenever the active tab changes", async () => {
    const user = userEvent.setup();
    const tasks = vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([]);

    render(<ApprovalCenterPage currentUser={currentUser} />);
    await waitFor(() => expect(tasks).toHaveBeenCalledWith("pending"));

    await user.click(screen.getByRole("tab", { name: "我发起的" }));
    await waitFor(() => expect(tasks).toHaveBeenCalledWith("started"));

    await user.click(screen.getByRole("tab", { name: "已处理" }));
    await waitFor(() => expect(tasks).toHaveBeenCalledWith("processed"));
  });

  it("ignores a stale bucket response after a faster tab request completes", async () => {
    const user = userEvent.setup();
    const pendingRequest = deferred<ApprovalTask[]>();
    const startedRequest = deferred<ApprovalTask[]>();
    const tasks = vi.spyOn(crmApi.approvals, "tasks").mockImplementation((bucket) => {
      if (bucket === "pending") {
        return pendingRequest.promise;
      }
      if (bucket === "started") {
        return startedRequest.promise;
      }
      return Promise.resolve([]);
    });

    render(<ApprovalCenterPage currentUser={currentUser} />);
    await waitFor(() => expect(tasks).toHaveBeenCalledWith("pending"));

    await user.click(screen.getByRole("tab", { name: "我发起的" }));
    await waitFor(() => expect(tasks).toHaveBeenCalledWith("started"));

    await act(async () => {
      startedRequest.resolve([secondTask]);
      await startedRequest.promise;
    });
    expect(await screen.findByText("续签项目合同")).toBeInTheDocument();

    await act(async () => {
      pendingRequest.resolve([pendingTask]);
      await pendingRequest.promise;
    });

    expect(screen.getByText("续签项目合同")).toBeInTheDocument();
    expect(screen.queryByText("V2试点项目合同")).not.toBeInTheDocument();
  });

  it("renders the required approval workbench columns", async () => {
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);

    render(<ApprovalCenterPage currentUser={currentUser} />);

    await screen.findByText("V2试点项目合同");
    for (const heading of ["对象类型", "对象名称", "当前节点", "提交人", "提交时间", "状态", "操作"]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
  });

  it("opens a detail drawer from the row and shows ordered nodes and action comments", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    const detail = vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);

    render(<ApprovalCenterPage currentUser={currentUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await waitFor(() => expect(detail).toHaveBeenCalledWith(41));

    const drawer = await screen.findByRole("dialog", { name: "审批详情" });
    expect(within(drawer).getByText("基础信息")).toBeInTheDocument();
    expect(within(drawer).getByText("操作历史与意见")).toBeInTheDocument();
    expect(within(drawer).getAllByText("合同条款已确认")).toHaveLength(2);
    const drawerText = drawer.textContent ?? "";
    expect(drawerText.indexOf("销售总监审批")).toBeLessThan(drawerText.indexOf("财务负责人审批"));
  });

  it("wraps operation history and breaks long opinions in a narrow drawer", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue({
      ...pendingDetail,
      actions: [{ ...pendingDetail.actions[0], comment: longActionComment }]
    });

    render(<ApprovalCenterPage currentUser={currentUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    const drawer = await screen.findByRole("dialog", { name: "审批详情" });
    const comment = within(drawer).getByText(longActionComment);
    const historyItem = comment.parentElement!;

    expect(historyItem.style.flexWrap).toBe("wrap");
    expect(historyItem.style.maxWidth).toBe("100%");
    expect(historyItem.style.minWidth).toBe("0px");
    expect(comment.style.overflowWrap).toBe("anywhere");
    expect(comment.style.wordBreak).toBe("break-word");
    expect(comment.style.minWidth).toBe("0px");
  });

  it("allows a permitted user to approve a pending instance without an opinion", async () => {
    const user = userEvent.setup();
    const tasks = vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);
    const approve = vi.spyOn(crmApi.approvals, "approve").mockResolvedValue({
      ...pendingTask.instance,
      status: "approved"
    });

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await user.click(await screen.findByRole("button", { name: "通过" }));

    await waitFor(() => expect(approve).toHaveBeenCalledWith(41, undefined));
    await waitFor(() => expect(tasks).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("审批已通过")).toBeInTheDocument();
  });

  it("clears the optional approval opinion when opening another task", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask, secondTask]);
    const detail = vi.spyOn(crmApi.approvals, "detail").mockImplementation(async (id) =>
      id === secondTask.instance.id ? secondDetail : pendingDetail
    );

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await user.type(await screen.findByRole("textbox", { name: "审批意见（选填）" }), "仅属于第一项任务");

    fireEvent.click(screen.getByRole("row", { name: /续签项目合同/, hidden: true }));
    await waitFor(() => expect(detail).toHaveBeenLastCalledWith(42));

    expect(await screen.findByRole("textbox", { name: "审批意见（选填）" })).toHaveValue("");
  });

  it("clears the reject form after closing the drawer before another task", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask, secondTask]);
    vi.spyOn(crmApi.approvals, "detail").mockImplementation(async (id) =>
      id === secondTask.instance.id ? secondDetail : pendingDetail
    );

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await user.click(await screen.findByRole("button", { name: "驳回" }));
    await user.type(screen.getByRole("textbox", { name: "驳回意见" }), "仅属于第一项任务");
    await user.click(screen.getByRole("button", { name: /取\s*消/ }));

    const drawer = screen
      .getAllByRole("dialog", { name: "审批详情" })
      .find((dialog) => dialog.classList.contains("ant-drawer-section"))!;
    await user.click(within(drawer).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(within(drawer).queryByText("基础信息")).not.toBeInTheDocument());

    await user.click(screen.getByRole("row", { name: /续签项目合同/ }));
    await user.click(await screen.findByRole("button", { name: "驳回" }));

    expect(screen.getByRole("textbox", { name: "驳回意见" })).toHaveValue("");
  });

  it("hides approve and reject actions without the approval.approve permission", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);

    render(<ApprovalCenterPage currentUser={currentUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await screen.findByRole("dialog", { name: "审批详情" });

    expect(screen.queryByRole("button", { name: "通过" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "驳回" })).not.toBeInTheDocument();
  });

  it("hides approve and reject actions when the current node role does not match the user", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);

    render(<ApprovalCenterPage currentUser={unmatchedRoleUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await screen.findByRole("dialog", { name: "审批详情" });

    expect(screen.queryByRole("button", { name: "通过" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "驳回" })).not.toBeInTheDocument();
  });

  it("hides approve and reject actions when the task has no current node", async () => {
    const user = userEvent.setup();
    const taskWithoutCurrentNode: ApprovalTask = { ...pendingTask, current_node: null };
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([taskWithoutCurrentNode]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await screen.findByRole("dialog", { name: "审批详情" });

    expect(screen.queryByRole("button", { name: "通过" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "驳回" })).not.toBeInTheDocument();
  });

  it("hides approve and reject actions outside the pending bucket", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockImplementation(async (bucket) =>
      bucket === "started" ? [pendingTask] : []
    );
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(screen.getByRole("tab", { name: "我发起的" }));
    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await screen.findByRole("dialog", { name: "审批详情" });

    expect(screen.queryByRole("button", { name: "通过" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "驳回" })).not.toBeInTheDocument();
  });

  it("hides approve and reject actions when the instance is no longer pending", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue({
      ...pendingDetail,
      instance: { ...pendingDetail.instance, status: "approved" }
    });

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await screen.findByRole("dialog", { name: "审批详情" });

    expect(screen.queryByRole("button", { name: "通过" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "驳回" })).not.toBeInTheDocument();
  });

  it("requires an opinion before rejecting and refreshes the active bucket after success", async () => {
    const user = userEvent.setup();
    const tasks = vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);
    const reject = vi.spyOn(crmApi.approvals, "reject").mockResolvedValue({
      ...pendingTask.instance,
      status: "rejected"
    });

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await user.click(await screen.findByRole("button", { name: "驳回" }));
    expect(await screen.findByText("驳回审批")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确认驳回" }));
    expect(await screen.findByText("请输入驳回意见")).toBeInTheDocument();
    expect(reject).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: "驳回意见" }), "金额依据需要补充");
    await user.click(screen.getByRole("button", { name: "确认驳回" }));

    await waitFor(() => expect(reject).toHaveBeenCalledWith(41, { comment: "金额依据需要补充" }));
    await waitFor(() => expect(tasks).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("审批已驳回")).toBeInTheDocument();
  });

  it("shows the API error when loading the active bucket fails", async () => {
    vi.spyOn(crmApi.approvals, "tasks").mockRejectedValue(new Error("审批服务不可用"));

    render(<ApprovalCenterPage currentUser={currentUser} />);

    expect(await screen.findByText("审批服务不可用")).toBeInTheDocument();
  });

  it("shows the API error when loading approval detail fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockRejectedValue(new Error("审批详情加载失败"));

    render(<ApprovalCenterPage currentUser={currentUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    expect(await screen.findByText("审批详情加载失败")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "审批详情" })).toBeInTheDocument();
  });

  it("shows the API error and keeps the detail open when approval fails", async () => {
    const user = userEvent.setup();
    const tasks = vi.spyOn(crmApi.approvals, "tasks").mockResolvedValue([pendingTask]);
    vi.spyOn(crmApi.approvals, "detail").mockResolvedValue(pendingDetail);
    vi.spyOn(crmApi.approvals, "approve").mockRejectedValue(new Error("审批状态已变化"));

    render(<ApprovalCenterPage currentUser={approverUser} />);

    await user.click(await screen.findByRole("row", { name: /V2试点项目合同/ }));
    await user.click(await screen.findByRole("button", { name: "通过" }));

    expect(await screen.findByText("审批状态已变化")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "审批详情" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通过" })).toBeEnabled();
    expect(tasks).toHaveBeenCalledTimes(1);
  });
});
