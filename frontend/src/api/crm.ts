import { clearAuthToken, requestJson, setAuthToken } from "./client";

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
