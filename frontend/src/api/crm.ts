import { clearAuthToken, requestJson, setAuthToken } from "./client";

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
  account_name: string;
  account_type: string;
  account_level?: string;
  account_status: string;
  industry?: string;
  region_province?: string;
  region_city?: string;
  owner_department_id: number;
  owner_user_id: number;
  last_activity_summary?: string;
  last_activity_at?: string;
};

export type Contact = {
  id: number;
  account_id: number;
  name: string;
  title?: string;
  mobile?: string;
  contact_type?: string;
  attitude?: string;
  relationship_heat?: string;
  project_roles?: string[];
};

export type Opportunity = {
  id: number;
  account_id: number;
  opportunity_name: string;
  stage: string;
  status: string;
  level?: string;
  risk_status?: string;
  estimated_contract_amount?: number;
  owner_department_id: number;
  owner_user_id: number;
  last_activity_summary?: string;
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
  conclusion?: string;
  next_plan?: string;
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

export type WeeklyProgressItem = {
  activity_id: number;
  subject: string;
  activity_time?: string;
  conclusion?: string;
  next_plan?: string;
  risk_description?: string;
};

export type WeeklyProgress = {
  opportunity_id: number;
  account_id: number;
  owner_user_id: number;
  week_start_date: string;
  week_end_date: string;
  activity_count: number;
  progress_items: WeeklyProgressItem[];
};

export type DictionaryType = {
  id: number;
  dict_code: string;
  dict_name: string;
  items: Array<{ id: number; item_code: string; item_name: string; is_active: boolean }>;
};

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

export const crmApi = {
  accounts: {
    list: () => requestJson<Account[]>("/api/accounts"),
    create: (body: Record<string, unknown>) =>
      requestJson<Account>("/api/accounts", { method: "POST", body: JSON.stringify(body) })
  },
  contacts: {
    list: () => requestJson<Contact[]>("/api/contacts"),
    create: (body: Record<string, unknown>) =>
      requestJson<Contact>("/api/contacts", { method: "POST", body: JSON.stringify(body) })
  },
  opportunities: {
    list: () => requestJson<Opportunity[]>("/api/opportunities"),
    create: (body: Record<string, unknown>) =>
      requestJson<Opportunity>("/api/opportunities", { method: "POST", body: JSON.stringify(body) }),
    close: (id: number, body: Record<string, unknown>) =>
      requestJson<Opportunity>(`/api/opportunities/${id}/close`, { method: "POST", body: JSON.stringify(body) })
  },
  activities: {
    list: () => requestJson<Activity[]>("/api/activities"),
    create: (body: Record<string, unknown>) =>
      requestJson<Activity>("/api/activities", { method: "POST", body: JSON.stringify(body) }),
    complete: (id: number, body: Record<string, unknown>) =>
      requestJson<Activity>(`/api/activities/${id}/complete`, { method: "POST", body: JSON.stringify(body) })
  },
  reminders: {
    list: () => requestJson<Reminder[]>("/api/reminders")
  },
  weeklyProgress: {
    list: () => requestJson<WeeklyProgress[]>("/api/weekly-progress/opportunities")
  },
  dictionaries: {
    list: () => requestJson<DictionaryType[]>("/api/system/dicts")
  }
};
