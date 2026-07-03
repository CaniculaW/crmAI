import { clearAuthToken, requestBlob, requestJson, setAuthToken } from "./client";

type QueryParams = Record<string, unknown>;

export type CurrentUser = {
  id: number;
  name: string;
  email?: string;
  permissions: string[];
};

export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  user: CurrentUser;
};

export type Account = {
  id: number;
  parent_id?: number;
  account_name: string;
  account_short_name?: string;
  account_type: string;
  account_level?: string;
  account_status: string;
  account_source?: string;
  industry?: string;
  region_province?: string;
  region_city?: string;
  address?: string;
  relationship_status?: string;
  owner_department_id: number;
  owner_user_id: number;
  background?: string;
  key_needs?: string;
  remark?: string;
  last_activity_summary?: string;
  last_activity_at?: string;
};

export type Contact = {
  id: number;
  account_id: number;
  name: string;
  department?: string;
  title?: string;
  mobile?: string;
  email?: string;
  wechat?: string;
  contact_type?: string;
  decision_influence?: string;
  attitude?: string;
  relationship_heat?: string;
  importance_level?: string;
  birthday?: string;
  anniversary?: string;
  last_communication_summary?: string;
  next_action?: string;
  remark?: string;
  project_roles?: string[];
};

export type Opportunity = {
  id: number;
  account_id: number;
  opportunity_name: string;
  stage: string;
  status: string;
  level?: string;
  source?: string;
  potential_point?: string;
  risk_status?: string;
  estimated_budget_amount?: number;
  estimated_contract_amount?: number;
  expected_close_date?: string;
  owner_department_id: number;
  owner_user_id: number;
  current_progress?: string;
  next_plan?: string;
  remark?: string;
  last_activity_summary?: string;
};

export type SolutionDocument = {
  id: number;
  tenant_id?: number;
  account_id: number;
  opportunity_id: number;
  document_name: string;
  document_type: string;
  version_no: string;
  status: string;
  owner_user_id: number;
  customer_requirement_summary?: string;
  technical_solution_summary?: string;
  stakeholder_strategy?: string;
  quotation_amount?: number;
  cost_amount?: number;
  estimated_gross_margin_rate?: number;
  bid_self_check_result?: string;
  bid_risk_description?: string;
  submitted_to_customer_at?: string;
  customer_feedback?: string;
  void_reason?: string;
  voided_at?: string;
  voided_by?: number;
  remark?: string;
};

export type Contract = {
  id: number;
  tenant_id?: number;
  account_id: number;
  opportunity_id?: number;
  contract_name: string;
  contract_no?: string;
  contract_type: string;
  contract_status: string;
  contract_amount: number;
  tax_rate?: number;
  net_amount?: number;
  our_signing_entity?: string;
  customer_signing_entity?: string;
  owner_user_id: number;
  business_owner_id?: number;
  signed_at?: string;
  effective_at?: string;
  ended_at?: string;
  payment_terms?: string;
  invoice_terms?: string;
  delivery_scope?: string;
  acceptance_criteria?: string;
  risk_level?: string;
  risk_description?: string;
  termination_reason?: string;
  terminated_at?: string;
  terminated_by?: number;
  remark?: string;
  created_at?: string;
  updated_at?: string;
};

export type ContractChange = {
  id: number;
  contract_id: number;
  change_type: string;
  before_value?: string;
  after_value?: string;
  change_reason: string;
  changed_by?: number;
  changed_at?: string;
};

export type ContractMilestone = {
  id: number;
  contract_id: number;
  milestone_name: string;
  milestone_type: string;
  planned_at?: string;
  actual_at?: string;
  status: string;
  remark?: string;
  created_at?: string;
  updated_at?: string;
};

export type Invoice = {
  id: number;
  tenant_id?: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  plan_name: string;
  invoice_status: string;
  invoice_type: string;
  planned_invoice_date?: string;
  planned_amount: number;
  applied_amount?: number;
  applied_at?: string;
  application_note?: string;
  applied_by?: number;
  invoice_code?: string;
  invoice_no?: string;
  invoice_date?: string;
  tax_rate?: number;
  net_amount?: number;
  tax_amount?: number;
  actual_invoice_amount?: number;
  signed_at?: string;
  signed_by_name?: string;
  sign_note?: string;
  exception_type?: string;
  exception_reason?: string;
  exception_resolution?: string;
  exception_at?: string;
  void_reason?: string;
  voided_at?: string;
  voided_by?: number;
  owner_user_id: number;
  invoice_terms_snapshot?: string;
  remark?: string;
  contract_amount?: number;
  effective_invoiced_amount?: number;
  remaining_invoice_amount?: number;
  reconciled_amount?: number;
  unreconciled_amount?: number;
  created_at?: string;
  updated_at?: string;
};

export type ReceivablePlan = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  plan_name: string;
  plan_stage?: string;
  receivable_status: string;
  planned_receivable_date?: string;
  planned_amount: number;
  owner_user_id: number;
  payment_terms_snapshot?: string;
  overdue_reason?: string;
  termination_reason?: string;
  terminated_at?: string;
  terminated_by?: number;
  contract_amount?: number;
  effective_invoiced_amount?: number;
  confirmed_received_amount?: number;
  unreceived_amount?: number;
  unreconciled_payment_amount?: number;
  overdue_days?: number;
  remark?: string;
  created_at?: string;
  updated_at?: string;
};

export type ReceivableFollowUp = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  receivable_plan_id: number;
  follow_up_at?: string;
  follow_up_by?: number;
  follow_up_content: string;
  customer_feedback?: string;
  next_action?: string;
  next_follow_up_at?: string;
  remark?: string;
  created_at?: string;
  updated_at?: string;
};

export type Payment = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  receivable_plan_id?: number;
  payment_name: string;
  payment_status: string;
  received_at?: string;
  received_amount: number;
  confirmed_amount?: number;
  confirmed_at?: string;
  confirmed_by?: number;
  payment_method: string;
  payer_name?: string;
  receiving_account?: string;
  bank_flow_no?: string;
  reconciled_amount?: number;
  unreconciled_amount?: number;
  exception_type?: string;
  exception_reason?: string;
  exception_resolution?: string;
  refund_reason?: string;
  refunded_at?: string;
  refunded_by?: number;
  owner_user_id: number;
  remark?: string;
  created_at?: string;
  updated_at?: string;
};

export type Reconciliation = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  contract_id: number;
  invoice_id: number;
  payment_id: number;
  invoice_no?: string;
  payment_name?: string;
  reconciliation_no: string;
  reconciliation_status: string;
  reconciled_amount: number;
  reconciled_at?: string;
  reconciled_by?: number;
  reconcile_note?: string;
  void_reason?: string;
  voided_at?: string;
  voided_by?: number;
  invoice_actual_amount?: number;
  invoice_reconciled_amount?: number;
  invoice_unreconciled_amount?: number;
  payment_confirmed_amount?: number;
  payment_reconciled_amount?: number;
  payment_unreconciled_amount?: number;
  created_at?: string;
  updated_at?: string;
};

export type ReconciliationWorkbench = {
  summary: {
    invoice_amount: number;
    payment_amount: number;
    reconciled_amount: number;
    unreconciled_invoice_amount: number;
    unallocated_payment_amount: number;
  };
  pending_invoices: Array<{
    id: number;
    account_id: number;
    opportunity_id?: number;
    contract_id: number;
    plan_name: string;
    invoice_no?: string;
    invoice_status: string;
    actual_invoice_amount?: number;
    reconciled_amount?: number;
    unreconciled_amount?: number;
  }>;
  pending_payments: Array<{
    id: number;
    account_id: number;
    opportunity_id?: number;
    contract_id: number;
    payment_name: string;
    payment_status: string;
    received_at?: string;
    confirmed_amount?: number;
    reconciled_amount?: number;
    unreconciled_amount?: number;
  }>;
  recent_reconciliations: Reconciliation[];
};

export type Activity = {
  id: number;
  account_id: number;
  opportunity_id?: number;
  subject: string;
  activity_type: string;
  activity_status: string;
  activity_result?: string;
  activity_time?: string;
  next_follow_up_at?: string;
  owner_department_id: number;
  owner_user_id: number;
  communication_content?: string;
  customer_feedback?: string;
  conclusion?: string;
  next_plan?: string;
  risk_description?: string;
  include_in_weekly_progress?: boolean;
  weekly_period?: string;
  source_type?: string;
  completed_at?: string;
  completed_by?: number;
  remark?: string;
  contact_ids?: number[];
  participants?: Array<{ user_id: number; participant_role?: string }>;
  risk_types?: string[];
};

export type Reminder = {
  id: number;
  object_type: string;
  object_id: number;
  reminder_type: string;
  title: string;
  due_at: string;
  status: string;
};

export type Attachment = {
  id: number;
  object_type: string;
  object_id: number;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: number;
  uploaded_at?: string;
  remark?: string;
};

export type AttachmentUploadRequest = {
  object_type: string;
  object_id: number;
  file: File;
  file_type?: string;
  remark?: string;
};

export type WeeklyProgressItem = {
  activity_id: number;
  subject: string;
  activity_time?: string;
  conclusion?: string;
  next_plan?: string;
  risk_description?: string;
  activity_result?: string;
};

export type WeeklyProgress = {
  opportunity_id: number;
  account_id: number;
  owner_user_id: number;
  week_start_date: string;
  week_end_date: string;
  activity_count: number;
  latest_activity_at?: string;
  progress_items: WeeklyProgressItem[];
};

export type DictionaryType = {
  id: number;
  dict_code: string;
  dict_name: string;
  items: Array<{ id: number; item_code: string; item_name: string; is_active: boolean }>;
};

export type AuditLog = {
  id: number;
  actor_user_id?: number;
  module_code: string;
  action_code: string;
  object_type?: string;
  object_id?: number;
  result: string;
  trace_id?: string;
  occurred_at: string;
};

export type SystemRoleSummary = {
  id: number;
  code: string;
  name: string;
};

export type SystemUser = {
  id: number;
  department_id?: number;
  name: string;
  mobile?: string;
  email?: string;
  role_code?: string;
  status: string;
  last_login_at?: string;
  roles: SystemRoleSummary[];
};

export type SystemDepartment = {
  id: number;
  parent_id?: number;
  code: string;
  name: string;
  region_code?: string;
  status: string;
};

export type SystemRole = {
  id: number;
  code: string;
  name: string;
  description?: string;
  permission_codes: string[];
};

export type SystemPermission = {
  id: number;
  permission_code: string;
  permission_name: string;
  permission_type: string;
  module_code: string;
};

export type DashboardMetricCard = {
  key: string;
  label: string;
  value: number;
  unit: string;
  drilldown_url: string;
};

export type DashboardBusinessFlowItem = {
  key: string;
  label: string;
  amount: number;
  count: number;
  risk_count: number;
  drilldown_url: string;
};

export type DashboardRiskSummary = {
  risk_type: string;
  label: string;
  count: number;
  amount: number;
  highest_level: string;
  drilldown_url: string;
};

export type DashboardRiskItem = {
  risk_type: string;
  risk_level: string;
  title: string;
  amount: number;
  object_type: string;
  object_id: number;
  owner_user_id?: number;
  account_id?: number;
  opportunity_id?: number;
  occurred_at?: string;
  drilldown_url: string;
};

export type DashboardOverview = {
  filters: Record<string, unknown>;
  metric_cards: DashboardMetricCard[];
  business_flow: DashboardBusinessFlowItem[];
  risk_summary: DashboardRiskSummary[];
  top_risks: DashboardRiskItem[];
};

export type DashboardFunnelStage = {
  key: string;
  label: string;
  count: number;
  amount: number;
  weighted_amount: number;
  conversion_rate: number;
  drilldown_url: string;
};

export type DashboardForecastTrendPoint = {
  period: string;
  forecast_amount: number;
  weighted_forecast_amount: number;
  count: number;
};

export type DashboardAttentionOpportunity = {
  opportunity_id: number;
  opportunity_name: string;
  account_id?: number;
  owner_user_id?: number;
  stage: string;
  risk_status?: string;
  amount: number;
  expected_close_date?: string;
  last_activity_at?: string;
  reason: string;
  drilldown_url: string;
};

export type DashboardFunnel = {
  filters: Record<string, unknown>;
  metric_cards: DashboardMetricCard[];
  stages: DashboardFunnelStage[];
  forecast_trend: DashboardForecastTrendPoint[];
  attention_opportunities: DashboardAttentionOpportunity[];
};

export type DashboardContractStatusItem = {
  status: string;
  label: string;
  count: number;
  amount: number;
  drilldown_url: string;
};

export type DashboardContractMilestoneSummary = {
  key: string;
  label: string;
  count: number;
  drilldown_url: string;
};

export type DashboardContractChangeTrendPoint = {
  period: string;
  change_count: number;
};

export type DashboardAttentionContract = {
  contract_id: number;
  contract_name: string;
  account_id?: number;
  opportunity_id?: number;
  owner_user_id?: number;
  contract_status: string;
  risk_level?: string;
  contract_amount: number;
  next_milestone_name?: string;
  next_milestone_planned_at?: string;
  reason: string;
  drilldown_url: string;
};

export type DashboardContracts = {
  filters: Record<string, unknown>;
  metric_cards: DashboardMetricCard[];
  status_distribution: DashboardContractStatusItem[];
  milestone_summary: DashboardContractMilestoneSummary[];
  change_trend: DashboardContractChangeTrendPoint[];
  attention_contracts: DashboardAttentionContract[];
};

function withQuery(path: string, query?: QueryParams) {
  if (!query) {
    return path;
  }
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function login(username: string, password: string) {
  const response = await requestJson<AuthTokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  setAuthToken(response.access_token);
  return response.user;
}

export async function logout() {
  try {
    await requestJson<{ logged_out: boolean }>("/api/auth/logout", { method: "POST" });
  } finally {
    clearAuthToken();
  }
}

export function currentUser() {
  return requestJson<CurrentUser>("/api/auth/me");
}

export function changePassword(body: Record<string, unknown>) {
  return requestJson<{ password_changed: boolean }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function resetPassword(body: Record<string, unknown>) {
  return requestJson<{ force_password_change: boolean }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export const crmApi = {
  dashboard: {
    overview: (query?: QueryParams) => requestJson<DashboardOverview>(withQuery("/api/dashboard/overview", query)),
    funnel: (query?: QueryParams) => requestJson<DashboardFunnel>(withQuery("/api/dashboard/funnel", query)),
    contracts: (query?: QueryParams) => requestJson<DashboardContracts>(withQuery("/api/dashboard/contracts", query))
  },
  accounts: {
    list: (query?: QueryParams) => requestJson<Account[]>(withQuery("/api/accounts", query)),
    detail: (id: number) => requestJson<Account>(`/api/accounts/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<Account>("/api/accounts", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Account>(`/api/accounts/${id}`, { method: "PATCH", body: JSON.stringify(body) })
  },
  contacts: {
    list: (query?: QueryParams) => requestJson<Contact[]>(withQuery("/api/contacts", query)),
    detail: (id: number) => requestJson<Contact>(`/api/contacts/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<Contact>("/api/contacts", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Contact>(`/api/contacts/${id}`, { method: "PATCH", body: JSON.stringify(body) })
  },
  opportunities: {
    list: (query?: QueryParams) => requestJson<Opportunity[]>(withQuery("/api/opportunities", query)),
    detail: (id: number) => requestJson<Opportunity>(`/api/opportunities/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<Opportunity>("/api/opportunities", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Opportunity>(`/api/opportunities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    close: (id: number, body: Record<string, unknown>) =>
      requestJson<Opportunity>(`/api/opportunities/${id}/close`, { method: "POST", body: JSON.stringify(body) }),
    reopen: (id: number, body: Record<string, unknown>) =>
      requestJson<Opportunity>(`/api/opportunities/${id}/reopen`, { method: "POST", body: JSON.stringify(body) })
  },
  solutions: {
    list: (query?: QueryParams) => requestJson<SolutionDocument[]>(withQuery("/api/solutions", query)),
    detail: (id: number) => requestJson<SolutionDocument>(`/api/solutions/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<SolutionDocument>("/api/solutions", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<SolutionDocument>(`/api/solutions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    void: (id: number, body: Record<string, unknown>) =>
      requestJson<SolutionDocument>(`/api/solutions/${id}/void`, { method: "POST", body: JSON.stringify(body) })
  },
  contracts: {
    list: (query?: QueryParams) => requestJson<Contract[]>(withQuery("/api/contracts", query)),
    detail: (id: number) => requestJson<Contract>(`/api/contracts/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<Contract>("/api/contracts", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Contract>(`/api/contracts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    terminate: (id: number, body: Record<string, unknown>) =>
      requestJson<Contract>(`/api/contracts/${id}/terminate`, { method: "POST", body: JSON.stringify(body) }),
    changes: (id: number) => requestJson<ContractChange[]>(`/api/contracts/${id}/changes`),
    milestones: (id: number) => requestJson<ContractMilestone[]>(`/api/contracts/${id}/milestones`),
    createMilestone: (id: number, body: Record<string, unknown>) =>
      requestJson<ContractMilestone>(`/api/contracts/${id}/milestones`, { method: "POST", body: JSON.stringify(body) }),
    updateMilestone: (id: number, milestoneId: number, body: Record<string, unknown>) =>
      requestJson<ContractMilestone>(`/api/contracts/${id}/milestones/${milestoneId}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
  },
  invoices: {
    list: (query?: QueryParams) => requestJson<Invoice[]>(withQuery("/api/invoices", query)),
    detail: (id: number) => requestJson<Invoice>(`/api/invoices/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Invoice>(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    apply: (id: number, body: Record<string, unknown>) =>
      requestJson<Invoice>(`/api/invoices/${id}/apply`, { method: "POST", body: JSON.stringify(body) }),
    issue: (id: number, body: Record<string, unknown>) =>
      requestJson<Invoice>(`/api/invoices/${id}/issue`, { method: "POST", body: JSON.stringify(body) }),
    sign: (id: number, body: Record<string, unknown>) =>
      requestJson<Invoice>(`/api/invoices/${id}/sign`, { method: "POST", body: JSON.stringify(body) }),
    exception: (id: number, body: Record<string, unknown>) =>
      requestJson<Invoice>(`/api/invoices/${id}/exception`, { method: "POST", body: JSON.stringify(body) }),
    void: (id: number, body: Record<string, unknown>) =>
      requestJson<Invoice>(`/api/invoices/${id}/void`, { method: "POST", body: JSON.stringify(body) })
  },
  receivablePlans: {
    list: (query?: QueryParams) => requestJson<ReceivablePlan[]>(withQuery("/api/receivable-plans", query)),
    detail: (id: number) => requestJson<ReceivablePlan>(`/api/receivable-plans/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<ReceivablePlan>("/api/receivable-plans", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<ReceivablePlan>(`/api/receivable-plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    terminate: (id: number, body: Record<string, unknown>) =>
      requestJson<ReceivablePlan>(`/api/receivable-plans/${id}/terminate`, { method: "POST", body: JSON.stringify(body) }),
    followUps: (id: number) => requestJson<ReceivableFollowUp[]>(`/api/receivable-plans/${id}/follow-ups`),
    createFollowUp: (id: number, body: Record<string, unknown>) =>
      requestJson<ReceivableFollowUp>(`/api/receivable-plans/${id}/follow-ups`, { method: "POST", body: JSON.stringify(body) })
  },
  payments: {
    list: (query?: QueryParams) => requestJson<Payment[]>(withQuery("/api/payments", query)),
    detail: (id: number) => requestJson<Payment>(`/api/payments/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<Payment>("/api/payments", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Payment>(`/api/payments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    confirm: (id: number, body: Record<string, unknown>) =>
      requestJson<Payment>(`/api/payments/${id}/confirm`, { method: "POST", body: JSON.stringify(body) }),
    exception: (id: number, body: Record<string, unknown>) =>
      requestJson<Payment>(`/api/payments/${id}/exception`, { method: "POST", body: JSON.stringify(body) }),
    refund: (id: number, body: Record<string, unknown>) =>
      requestJson<Payment>(`/api/payments/${id}/refund`, { method: "POST", body: JSON.stringify(body) })
  },
  reconciliations: {
    workbench: (query?: QueryParams) => requestJson<ReconciliationWorkbench>(withQuery("/api/reconciliations/workbench", query)),
    list: (query?: QueryParams) => requestJson<Reconciliation[]>(withQuery("/api/reconciliations", query)),
    create: (body: Record<string, unknown>) =>
      requestJson<Reconciliation>("/api/reconciliations", { method: "POST", body: JSON.stringify(body) }),
    void: (id: number, body: Record<string, unknown>) =>
      requestJson<Reconciliation>(`/api/reconciliations/${id}/void`, { method: "POST", body: JSON.stringify(body) })
  },
  activities: {
    list: (query?: QueryParams) => requestJson<Activity[]>(withQuery("/api/activities", query)),
    detail: (id: number) => requestJson<Activity>(`/api/activities/${id}`),
    create: (body: Record<string, unknown>) =>
      requestJson<Activity>("/api/activities", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Activity>(`/api/activities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    complete: (id: number, body: Record<string, unknown>) =>
      requestJson<Activity>(`/api/activities/${id}/complete`, { method: "POST", body: JSON.stringify(body) })
  },
  reminders: {
    list: (query?: QueryParams) => requestJson<Reminder[]>(withQuery("/api/reminders", query)),
    update: (id: number, body: Record<string, unknown>) =>
      requestJson<Reminder>(`/api/reminders/${id}`, { method: "PATCH", body: JSON.stringify(body) })
  },
  attachments: {
    list: (query: QueryParams) => requestJson<Attachment[]>(withQuery("/api/attachments", query)),
    create: (body: Record<string, unknown>) =>
      requestJson<Attachment>("/api/attachments", { method: "POST", body: JSON.stringify(body) }),
    upload: (body: AttachmentUploadRequest) => {
      const formData = new FormData();
      formData.set("object_type", body.object_type);
      formData.set("object_id", String(body.object_id));
      formData.set("file", body.file);
      if (body.file_type) {
        formData.set("file_type", body.file_type);
      }
      if (body.remark) {
        formData.set("remark", body.remark);
      }
      return requestJson<Attachment>("/api/attachments/upload", { method: "POST", body: formData });
    },
    download: (id: number) => requestBlob(`/api/attachments/${id}/download`),
    delete: (id: number) => requestJson<{ deleted: boolean }>(`/api/attachments/${id}`, { method: "DELETE" })
  },
  weeklyProgress: {
    list: (query?: QueryParams) => requestJson<WeeklyProgress[]>(withQuery("/api/weekly-progress/opportunities", query))
  },
  dictionaries: {
    list: (query?: QueryParams) => requestJson<DictionaryType[]>(withQuery("/api/system/dicts", query)),
    createType: (body: Record<string, unknown>) =>
      requestJson<DictionaryType>("/api/system/dicts/types", { method: "POST", body: JSON.stringify(body) }),
    createItem: (dictTypeId: number, body: Record<string, unknown>) =>
      requestJson<DictionaryType>(`/api/system/dicts/types/${dictTypeId}/items`, {
        method: "POST",
        body: JSON.stringify(body)
      }),
    updateItem: (itemId: number, body: Record<string, unknown>) =>
      requestJson<DictionaryType>(`/api/system/dicts/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
  },
  auditLogs: {
    list: (query?: QueryParams) => requestJson<AuditLog[]>(withQuery("/api/system/audit-logs", query))
  },
  users: {
    list: () => requestJson<SystemUser[]>("/api/system/users"),
    create: (body: Record<string, unknown>) =>
      requestJson<SystemUser>("/api/system/users", { method: "POST", body: JSON.stringify(body) }),
    update: (userId: number, body: Record<string, unknown>) =>
      requestJson<SystemUser>(`/api/system/users/${userId}`, { method: "PUT", body: JSON.stringify(body) })
  },
  departments: {
    list: () => requestJson<SystemDepartment[]>("/api/system/departments"),
    create: (body: Record<string, unknown>) =>
      requestJson<SystemDepartment>("/api/system/departments", { method: "POST", body: JSON.stringify(body) })
  },
  roles: {
    list: () => requestJson<SystemRole[]>("/api/system/roles"),
    replacePermissions: (roleId: number, permissionCodes: string[]) =>
      requestJson<SystemRole>(`/api/system/roles/${roleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permission_codes: permissionCodes })
      })
  },
  permissions: {
    list: () => requestJson<SystemPermission[]>("/api/system/permissions")
  }
};
