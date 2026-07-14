import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { crmApi } from "./crm";
import type {
  ApprovalApproverRole,
  ApprovalDecisionRequest,
  ApprovalInstance,
  ApprovalInstanceDetail,
  ApprovalObjectStatus,
  ApprovalTask,
  ApprovalTemplateNode,
  Contract,
  SolutionDocument
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

const templateNode: ApprovalTemplateNode = {
  id: 51,
  template_id: 7,
  step_order: 1,
  node_name: "Legal review",
  approver_role_id: 3,
  approver_role_name: "Legal",
  status: "active",
  created_at: "2026-07-14T09:00:00+08:00",
  updated_at: "2026-07-14T09:00:00+08:00"
};

const solutionDocument: SolutionDocument = {
  id: 12,
  tenant_id: 1,
  account_id: 1,
  opportunity_id: 10,
  document_name: "Annual quotation",
  document_type: "quotation",
  version_no: "V1.0",
  status: "approving",
  owner_user_id: 1001,
  customer_requirement_summary: "Customer scope",
  technical_solution_summary: "Technical scope",
  stakeholder_strategy: "Executive sponsor alignment",
  quotation_amount: 500000,
  cost_amount: 350000,
  estimated_gross_margin_rate: 0.3,
  bid_self_check_result: "passed",
  bid_risk_description: "No blocking risk",
  submitted_to_customer_at: "2026-07-14T09:30:00+08:00",
  customer_feedback: "Pending approval",
  remark: "Approval submitted"
};

const contract: Contract = {
  id: 99,
  tenant_id: 1,
  account_id: 1,
  opportunity_id: 10,
  contract_name: "Annual contract",
  contract_no: "C-2026-0099",
  contract_type: "sales",
  contract_status: "approving",
  contract_amount: 500000,
  tax_rate: 0.06,
  net_amount: 471698.11,
  our_signing_entity: "Canicula Shanghai",
  customer_signing_entity: "Example Manufacturing",
  owner_user_id: 1001,
  business_owner_id: 1001,
  signed_at: "2026-07-14T10:00:00+08:00",
  effective_at: "2026-07-15T00:00:00+08:00",
  ended_at: "2027-07-14T23:59:59+08:00",
  payment_terms: "30 days",
  invoice_terms: "Milestone billing",
  delivery_scope: "CRM implementation",
  acceptance_criteria: "Production acceptance",
  risk_level: "low",
  risk_description: "No blocking risk",
  remark: "Approval submitted",
  created_at: "2026-07-14T08:00:00+08:00",
  updated_at: "2026-07-14T09:00:00+08:00"
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

    expectTypeOf(crmApi.approvals.approve).parameter(1).toEqualTypeOf<ApprovalDecisionRequest | undefined>();
    expectTypeOf(crmApi.approvals.reject).parameter(1).toEqualTypeOf<{ comment: string }>();
    if (false) {
      // @ts-expect-error A rejection must include a comment body.
      void crmApi.approvals.reject(41);
    }

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

  it("lists, adds, and patches typed template nodes through template-scoped paths", async () => {
    const createBody = { step_order: 1, node_name: "Legal review", approver_role_id: 3, status: "active" as const };
    const updateBody = { node_name: "Finance review", approver_role_id: 4, status: "inactive" as const };
    const updatedNode: ApprovalTemplateNode = {
      ...templateNode,
      node_name: updateBody.node_name,
      approver_role_id: updateBody.approver_role_id,
      approver_role_name: "Finance",
      status: updateBody.status
    };
    mockData([templateNode]);
    mockData(templateNode);
    mockData(updatedNode);

    await expect(crmApi.approvalTemplates.listNodes(7)).resolves.toEqual([templateNode]);
    await expect(crmApi.approvalTemplates.addNode(7, createBody)).resolves.toEqual(templateNode);
    await expect(crmApi.approvalTemplates.updateNode(7, 51, updateBody)).resolves.toEqual(updatedNode);

    expect(requestAt(0)[0]).toBe("/api/approval-templates/7/nodes");
    expect(requestAt(0)[1]?.method).toBeUndefined();
    expect(requestAt(1)[0]).toBe("/api/approval-templates/7/nodes");
    expect(requestAt(1)[1]).toMatchObject({ method: "POST", body: JSON.stringify(createBody) });
    expect(requestAt(2)[0]).toBe("/api/approval-templates/7/nodes/51");
    expect(requestAt(2)[1]).toMatchObject({ method: "PATCH", body: JSON.stringify(updateBody) });
  });

  it("lists typed approver roles through the approval configuration endpoint", async () => {
    const roles: ApprovalApproverRole[] = [
      { id: 3, code: "legal", name: "Legal" },
      { id: 4, code: "finance", name: "Finance" }
    ];
    mockData(roles);

    const result = await crmApi.approvalTemplates.approverRoles();

    expectTypeOf(result).toEqualTypeOf<ApprovalApproverRole[]>();
    expect(result).toEqual(roles);
    expect(requestAt(0)[0]).toBe("/api/approval-templates/approver-roles");
    expect(requestAt(0)[1]?.method).toBeUndefined();
  });

  it("returns typed business objects from solution and contract approval shortcuts", async () => {
    mockData(solutionDocument);
    mockData(contract);

    const submittedSolution = await crmApi.solutions.submitApproval(12);
    const submittedContract = await crmApi.contracts.submitApproval(99);

    expectTypeOf(submittedSolution).toEqualTypeOf<SolutionDocument>();
    expectTypeOf(submittedContract).toEqualTypeOf<Contract>();
    expect(submittedSolution).toEqual(solutionDocument);
    expect(submittedContract).toEqual(contract);

    expect(requestAt(0)[0]).toBe("/api/solutions/12/submit-approval");
    expect(requestAt(0)[1]).toMatchObject({ method: "POST" });
    expect(requestAt(1)[0]).toBe("/api/contracts/99/submit-approval");
    expect(requestAt(1)[1]).toMatchObject({ method: "POST" });
  });
});
