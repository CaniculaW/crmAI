import { beforeEach, describe, expect, it, vi } from "vitest";
import { crmApi } from "./crm";
import type {
  ApprovalInstance,
  ApprovalInstanceDetail,
  ApprovalObjectStatus,
  ApprovalTask
} from "./crm";

const instance: ApprovalInstance = {
  id: 41,
  tenant_id: 1,
  template_id: 7,
  object_type: "contract",
  object_id: 99,
  object_name: "Annual contract",
  status: "pending",
  current_step_order: 1,
  submitted_by: 1001,
  submitted_at: "2026-07-14T09:00:00+08:00",
  completed_at: null,
  result_comment: null,
  created_at: "2026-07-14T09:00:00+08:00",
  updated_at: "2026-07-14T09:00:00+08:00"
};

const detail: ApprovalInstanceDetail = {
  instance,
  nodes: [],
  actions: []
};

const task: ApprovalTask = {
  instance,
  current_node: {
    id: 51,
    instance_id: 41,
    step_order: 1,
    node_name: "Legal review",
    approver_role_id: 3,
    approver_role_name: "Legal",
    status: "pending",
    handled_by: null,
    handled_at: null,
    comment: null,
    created_at: "2026-07-14T09:00:00+08:00",
    updated_at: "2026-07-14T09:00:00+08:00"
  }
};

const objectStatusWithoutInstance: ApprovalObjectStatus = {
  object_type: "contract",
  object_id: 99,
  instance: null,
  history: []
};

const fetchMock = vi.fn<typeof fetch>();

function mockData(data: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ code: "OK", data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );
}

function requestAt(index: number) {
  const call = fetchMock.mock.calls[index];
  expect(call).toBeDefined();
  return call;
}

describe("crm approval API contracts", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    localStorage.clear();
  });

  it("reads task buckets, instance details, and nullable object status from exact paths", async () => {
    mockData([task]);
    mockData(detail);
    mockData(objectStatusWithoutInstance);

    await expect(crmApi.approvals.tasks("pending")).resolves.toEqual([task]);
    await expect(crmApi.approvals.detail(41)).resolves.toEqual(detail);
    await expect(crmApi.approvals.objectStatus("contract", 99)).resolves.toEqual(objectStatusWithoutInstance);

    expect(requestAt(0)[0]).toBe("/api/approvals/tasks?bucket=pending");
    expect(requestAt(1)[0]).toBe("/api/approvals/instances/41");
    expect(requestAt(2)[0]).toBe("/api/approvals/object/contract/99");
  });

  it("submits an approval and sends decision comments in POST bodies", async () => {
    mockData(instance);
    mockData(instance);
    mockData(instance);

    const submission = { object_type: "contract" as const, object_id: 99, object_name: "Annual contract" };
    await crmApi.approvals.submit(submission);
    await crmApi.approvals.approve(41, { comment: "Approved" });
    await crmApi.approvals.reject(41, { comment: "Please revise" });

    expect(requestAt(0)[0]).toBe("/api/approvals/instances");
    expect(requestAt(0)[1]).toMatchObject({ method: "POST", body: JSON.stringify(submission) });
    expect(requestAt(1)[0]).toBe("/api/approvals/instances/41/approve");
    expect(requestAt(1)[1]).toMatchObject({ method: "POST", body: JSON.stringify({ comment: "Approved" }) });
    expect(requestAt(2)[0]).toBe("/api/approvals/instances/41/reject");
    expect(requestAt(2)[1]).toMatchObject({ method: "POST", body: JSON.stringify({ comment: "Please revise" }) });
  });

  it("lists, creates, and patches approval templates", async () => {
    const created = {
      id: 7,
      tenant_id: 1,
      object_type: "contract" as const,
      template_name: "Contract approval",
      status: "active" as const,
      is_default: true,
      created_by: 1001,
      created_at: "2026-07-14T09:00:00+08:00",
      updated_by: null,
      updated_at: "2026-07-14T09:00:00+08:00"
    };
    const createBody = {
      object_type: "contract" as const,
      template_name: "Contract approval",
      is_default: true,
      status: "active" as const
    };
    const updateBody = { template_name: "Contract approval v2", status: "inactive" as const };
    mockData([created]);
    mockData(created);
    mockData({ ...created, ...updateBody });

    await crmApi.approvalTemplates.list();
    await crmApi.approvalTemplates.create(createBody);
    await crmApi.approvalTemplates.update(7, updateBody);

    expect(requestAt(0)[0]).toBe("/api/approval-templates");
    expect(requestAt(1)[0]).toBe("/api/approval-templates");
    expect(requestAt(1)[1]).toMatchObject({ method: "POST", body: JSON.stringify(createBody) });
    expect(requestAt(2)[0]).toBe("/api/approval-templates/7");
    expect(requestAt(2)[1]).toMatchObject({ method: "PATCH", body: JSON.stringify(updateBody) });
  });

  it("adds and patches template nodes through template-scoped paths", async () => {
    const createBody = { step_order: 1, node_name: "Legal review", approver_role_id: 3, status: "active" as const };
    const updateBody = { node_name: "Finance review", approver_role_id: 4, status: "inactive" as const };
    mockData({});
    mockData({});

    await crmApi.approvalTemplates.addNode(7, createBody);
    await crmApi.approvalTemplates.updateNode(7, 51, updateBody);

    expect(requestAt(0)[0]).toBe("/api/approval-templates/7/nodes");
    expect(requestAt(0)[1]).toMatchObject({ method: "POST", body: JSON.stringify(createBody) });
    expect(requestAt(1)[0]).toBe("/api/approval-templates/7/nodes/51");
    expect(requestAt(1)[1]).toMatchObject({ method: "PATCH", body: JSON.stringify(updateBody) });
  });

  it("uses backend business shortcut paths for solution and contract submissions", async () => {
    mockData({ id: 12 });
    mockData({ id: 99 });

    await crmApi.solutions.submitApproval(12);
    await crmApi.contracts.submitApproval(99);

    expect(requestAt(0)[0]).toBe("/api/solutions/12/submit-approval");
    expect(requestAt(0)[1]).toMatchObject({ method: "POST" });
    expect(requestAt(1)[0]).toBe("/api/contracts/99/submit-approval");
    expect(requestAt(1)[1]).toMatchObject({ method: "POST" });
  });
});
