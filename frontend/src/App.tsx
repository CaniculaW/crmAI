import {
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  Contact,
  History,
  KeyRound,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  type Account,
  type Activity,
  type AuditLog,
  type Contact as CrmContact,
  type CurrentUser,
  type DictionaryType,
  type Opportunity,
  type Reminder,
  type SystemDepartment,
  type SystemPermission,
  type SystemRole,
  type SystemUser,
  type WeeklyProgress,
  changePassword,
  crmApi,
  currentUser,
  login as loginApi,
  logout as logoutApi,
  resetPassword
} from "./api/crm";
import { getAuthToken } from "./api/client";
import "./styles.css";

const { Header, Sider, Content } = Layout;

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  permissions?: string[];
};

const navItems: NavItem[] = [
  { key: "/", label: "工作台", icon: <LayoutDashboard size={18} /> },
  { key: "/accounts", label: "客户池", icon: <Users size={18} />, permission: "account.read" },
  { key: "/contacts", label: "联系人", icon: <Contact size={18} />, permission: "contact.read" },
  { key: "/opportunities", label: "商机", icon: <BriefcaseBusiness size={18} />, permission: "opportunity.read" },
  { key: "/activities", label: "销售行动", icon: <CalendarCheck size={18} />, permission: "activity.read" },
  { key: "/weekly-progress", label: "周进展", icon: <BarChart3 size={18} />, permission: "weekly_progress.read" },
  { key: "/system", label: "系统管理", icon: <ShieldCheck size={18} />, permissions: ["system.dict.manage", "system.user.manage", "system.role.manage", "system.audit.read"] },
  { key: "/system/departments", label: "组织管理", icon: <Building2 size={18} />, permission: "system.user.manage" },
  { key: "/system/users", label: "用户管理", icon: <UserCog size={18} />, permission: "system.user.manage" },
  { key: "/system/roles", label: "角色权限", icon: <KeyRound size={18} />, permission: "system.role.manage" },
  { key: "/system/audit-logs", label: "审计日志", icon: <History size={18} />, permission: "system.audit.read" }
];

type SelectOption = {
  label: string;
  value: number;
};

type RelationshipBucket = {
  key: string;
  contacts: CrmContact[];
};

type SystemSection = "overview" | "departments" | "users" | "roles" | "auditLogs";

export function App() {
  return (
    <BrowserRouter>
      <CrmShell />
    </BrowserRouter>
  );
}

function CrmShell() {
  const location = useLocation();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [passwordForm] = Form.useForm();

  const restoreSession = useCallback(async () => {
    if (!getAuthToken()) {
      setLoadingSession(false);
      return;
    }
    try {
      setUser(await currentUser());
    } catch {
      setUser(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const handleLogin = async (username: string, password: string) => {
    const current = await loginApi(username, password);
    setUser(current);
    messageApi.success("登录成功");
  };

  const handleLogout = async () => {
    await logoutApi();
    setUser(null);
    messageApi.info("已退出");
  };

  const handleChangePassword = async (values: Record<string, unknown>) => {
    await changePassword(values);
    passwordForm.resetFields();
    setPasswordOpen(false);
    messageApi.success("密码已修改");
  };

  if (loadingSession) {
    return <div className="boot-screen">正在恢复登录态...</div>;
  }

  if (!user) {
    return (
      <>
        {contextHolder}
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  const allowedNav = navItems.filter(
    (item) =>
      (!item.permission || user.permissions.includes(item.permission)) &&
      (!item.permissions || item.permissions.some((permission) => user.permissions.includes(permission)))
  );

  return (
    <Layout className="app-shell">
      {contextHolder}
      <Sider width={232} className="app-sidebar">
        <div className="brand-block">
          <div className="brand-mark">C</div>
          <div>
            <Typography.Title level={1}>项目型大客户 CRM</Typography.Title>
            <span>{user.name}</span>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={allowedNav.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link to={item.key}>{item.label}</Link>
          }))}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div>
            <strong>V1 销售基础闭环</strong>
            <span>客户、联系人、商机、行动与周进展</span>
          </div>
          <div className="header-actions">
            <Tag color="blue">{user.permissions.length} 个权限点</Tag>
            <Button aria-label="修改密码" onClick={() => setPasswordOpen(true)}>
              修改密码
            </Button>
            <Button aria-label="退出" onClick={handleLogout}>
              退出
            </Button>
          </div>
        </Header>
        <Content className="app-content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="/accounts" element={<AccountsPage currentUser={user} />} />
            <Route path="/contacts" element={<ContactsPage currentUser={user} />} />
            <Route path="/opportunities" element={<OpportunitiesPage currentUser={user} />} />
            <Route path="/activities" element={<ActivitiesPage currentUser={user} />} />
            <Route path="/weekly-progress" element={<WeeklyProgressPage />} />
            <Route path="/system" element={<SystemPage section="overview" />} />
            <Route path="/system/departments" element={<SystemPage section="departments" />} />
            <Route path="/system/users" element={<SystemPage section="users" />} />
            <Route path="/system/roles" element={<SystemPage section="roles" />} />
            <Route path="/system/audit-logs" element={<SystemPage section="auditLogs" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
      <Modal title="修改密码" open={passwordOpen} onCancel={() => setPasswordOpen(false)} footer={null}>
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="old_password" label="原密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存密码
          </Button>
        </Form>
      </Modal>
    </Layout>
  );
}

function LoginPage({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (values: { username: string; password: string }) => {
    setSubmitting(true);
    setError("");
    try {
      await onLogin(values.username, values.password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div>
          <Typography.Title level={1}>项目型大客户 CRM</Typography.Title>
          <p>V1 销售基础闭环工作台</p>
        </div>
        <Form layout="vertical" onFinish={submit}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {error ? <div className="error-banner">{error}</div> : null}
          <Button type="primary" htmlType="submit" loading={submitting} block>
            登录
          </Button>
        </Form>
      </section>
    </main>
  );
}

function Dashboard() {
  const { data: reminders, loading: reminderLoading, refresh: refreshReminders } = useResource(crmApi.reminders.list, []);
  const { data: opportunities, loading: opportunityLoading } = useResource(crmApi.opportunities.list, []);
  const { data: activities, loading: activityLoading } = useResource(crmApi.activities.list, []);

  const pendingReminders = reminders.filter((reminder) => reminder.status === "pending" || reminder.status === "overdue");
  const activeOpportunities = opportunities.filter((opportunity) => opportunity.status === "following");
  const plannedActivities = activities.filter((activity) => activity.activity_status !== "completed");

  return (
    <section className="workspace">
      <PageTitle
        title="工作台"
        description="聚合我的待办、我的商机、今日行动和本周行动。"
        action={<RefreshButton onClick={refreshReminders} />}
      />
      <div className="summary-grid">
        <SummaryPanel title="我的待办" value={pendingReminders.length} loading={reminderLoading} />
        <SummaryPanel title="我的商机" value={activeOpportunities.length} loading={opportunityLoading} />
        <SummaryPanel title="待完成行动" value={plannedActivities.length} loading={activityLoading} />
        <SummaryPanel title="本周行动" value={activities.length} loading={activityLoading} />
      </div>
      <div className="dashboard-grid">
        <Card title="近期待办" size="small">
          <SimpleList
            items={pendingReminders.slice(0, 5)}
            render={(reminder) => `${reminder.title} · ${statusText(reminder.status)}`}
            empty="暂无待办"
          />
        </Card>
        <Card title="活跃商机" size="small">
          <SimpleList
            items={activeOpportunities.slice(0, 5)}
            render={(opportunity) => `${opportunity.opportunity_name} · ${opportunity.stage}`}
            empty="暂无活跃商机"
          />
        </Card>
      </div>
    </section>
  );
}

function AccountsPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const resource = useResource(() => crmApi.accounts.list(filters), [filters]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const columns: ColumnsType<Account> = [
    {
      title: "客户名称",
      dataIndex: "account_name",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "类型", dataIndex: "account_type" },
    { title: "等级", dataIndex: "account_level", render: textOrDash },
    { title: "状态", dataIndex: "account_status", render: statusTag },
    { title: "最近跟进", dataIndex: "last_activity_summary", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            详情
          </Button>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              editForm.setFieldsValue(record);
            }}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  const createAccount = async (values: Record<string, unknown>) => {
    await crmApi.accounts.create({
      account_type: "enterprise",
      account_status: "following",
      collaborators: [],
      owner_user_id: currentUser.id,
      ...values
    });
    setDrawerOpen(false);
    form.resetFields();
    await resource.refresh();
  };

  const updateAccount = async (values: Record<string, unknown>) => {
    if (!editing) {
      return;
    }
    await crmApi.accounts.update(editing.id, withoutEmpty(values, []));
    setEditing(null);
    editForm.resetFields();
    await resource.refresh();
  };

  return (
    <DataWorkspace
      title="客户池"
      description="客户新增、列表查询、最近跟进和客户状态维护入口。"
      loading={resource.loading}
      error={resource.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建客户</Button>}
      refresh={resource.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="客户名称/简称" />
        </Form.Item>
        <Form.Item name="account_level" label="等级">
          <Select allowClear options={["A", "B", "C"].map(option)} />
        </Form.Item>
        <Form.Item name="account_status" label="状态">
          <Select allowClear options={["following", "closed", "cancelled"].map(option)} />
        </Form.Item>
        <Form.Item name="industry" label="行业">
          <Input allowClear />
        </Form.Item>
      </FilterBar>
      <Table rowKey="id" size="middle" dataSource={resource.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建客户" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createAccount} initialValues={{ owner_department_id: 1 }}>
          <Form.Item name="account_name" label="客户名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="account_level" label="客户等级">
            <Select options={["A", "B", "C"].map(option)} />
          </Form.Item>
          <Form.Item name="industry" label="行业">
            <Input />
          </Form.Item>
          <Form.Item name="region_city" label="城市">
            <Input />
          </Form.Item>
          <Form.Item name="owner_department_id" label="归属部门ID" rules={[{ required: true }]}>
            <InputNumber min={1} className="full-width" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存客户</Button>
        </Form>
      </Drawer>
      <Drawer title="客户详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        <RecordDetails
          record={selected}
          fields={[
            ["客户名称", "account_name"],
            ["类型", "account_type"],
            ["等级", "account_level"],
            ["状态", "account_status"],
            ["行业", "industry"],
            ["省份", "region_province"],
            ["城市", "region_city"],
            ["最近跟进", "last_activity_summary"],
            ["最近跟进时间", "last_activity_at"]
          ]}
        />
      </Drawer>
      <Modal title="编辑客户" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateAccount}>
          <Form.Item name="account_level" label="客户等级">
            <Select allowClear options={["A", "B", "C"].map(option)} />
          </Form.Item>
          <Form.Item name="account_status" label="客户状态">
            <Select allowClear options={["following", "closed", "cancelled"].map(option)} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存修改</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function ContactsPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const contacts = useResource(() => crmApi.contacts.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [editing, setEditing] = useState<CrmContact | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const accountOptions = toAccountOptions(accounts.data);
  const roleGroups = useMemo(() => groupContactsByRoles(contacts.data), [contacts.data]);
  const attitudeGroups = useMemo(() => groupContactsByField(contacts.data, "attitude"), [contacts.data]);

  const columns: ColumnsType<CrmContact> = [
    {
      title: "姓名",
      dataIndex: "name",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "客户ID", dataIndex: "account_id" },
    { title: "职务", dataIndex: "title", render: textOrDash },
    { title: "类型", dataIndex: "contact_type", render: textOrDash },
    { title: "态度", dataIndex: "attitude", render: textOrDash },
    { title: "关系热度", dataIndex: "relationship_heat", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            详情
          </Button>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              editForm.setFieldsValue({
                ...record,
                project_roles: record.project_roles?.join(",")
              });
            }}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  const createContact = async (values: Record<string, unknown>) => {
    await crmApi.contacts.create({
      contact_type: "decision_maker",
      attitude: "supporter",
      relationship_heat: "familiar",
      project_roles: ["budget_promoter"],
      owner_user_id: currentUser.id,
      ...values
    });
    setDrawerOpen(false);
    form.resetFields();
    await contacts.refresh();
  };

  const updateContact = async (values: Record<string, unknown>) => {
    if (!editing) {
      return;
    }
    await crmApi.contacts.update(editing.id, {
      ...withoutEmpty(values, []),
      project_roles: splitCsv(values.project_roles)
    });
    setEditing(null);
    editForm.resetFields();
    await contacts.refresh();
  };

  return (
    <DataWorkspace
      title="联系人"
      description="维护客户干系人、态度、影响力和项目角色。"
      loading={contacts.loading}
      error={contacts.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建联系人</Button>}
      refresh={contacts.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="姓名/职务" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={accountOptions} loading={accounts.loading} />
        </Form.Item>
        <Form.Item name="attitude" label="态度">
          <Select allowClear options={["supporter", "neutral", "opponent"].map(option)} />
        </Form.Item>
        <Form.Item name="relationship_heat" label="关系热度">
          <Select allowClear options={["cold", "warm", "familiar", "trusted"].map(option)} />
        </Form.Item>
      </FilterBar>
      <section className="relationship-view">
        <Typography.Title level={3}>关系视图</Typography.Title>
        <div className="relationship-grid">
          <RelationshipGroup title="按项目角色" groups={roleGroups} />
          <RelationshipGroup title="按态度" groups={attitudeGroups} />
        </div>
      </section>
      <Table rowKey="id" dataSource={contacts.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建联系人" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createContact}>
          <Form.Item name="account_id" label="所属客户" rules={[{ required: true }]}>
            <Select options={accountOptions} loading={accounts.loading} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="title" label="职务">
            <Input />
          </Form.Item>
          <Form.Item name="mobile" label="手机">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存联系人</Button>
        </Form>
      </Drawer>
      <Drawer title="联系人详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        <RecordDetails
          record={selected}
          fields={[
            ["姓名", "name"],
            ["客户ID", "account_id"],
            ["部门", "department"],
            ["职务", "title"],
            ["手机", "mobile"],
            ["邮箱", "email"],
            ["类型", "contact_type"],
            ["态度", "attitude"],
            ["关系热度", "relationship_heat"],
            ["项目角色", "project_roles"]
          ]}
        />
      </Drawer>
      <Modal title="编辑联系人" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateContact}>
          <Form.Item name="title" label="职务">
            <Input />
          </Form.Item>
          <Form.Item name="mobile" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="attitude" label="态度">
            <Select allowClear options={["supporter", "neutral", "opponent"].map(option)} />
          </Form.Item>
          <Form.Item name="relationship_heat" label="关系热度">
            <Select allowClear options={["cold", "warm", "familiar", "trusted"].map(option)} />
          </Form.Item>
          <Form.Item name="project_roles" label="项目角色">
            <Input placeholder="多个角色用英文逗号分隔" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存修改</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function RelationshipGroup({ title, groups }: { title: string; groups: RelationshipBucket[] }) {
  return (
    <Card size="small" title={title}>
      {groups.length === 0 ? (
        <span className="muted">暂无关系数据</span>
      ) : (
        <div className="relationship-buckets">
          {groups.map((group) => (
            <div key={group.key} className="relationship-bucket">
              <div>
                <strong>{group.key}</strong>
                <Tag>{group.contacts.length} 人</Tag>
              </div>
              <Space wrap>
                {group.contacts.map((contact) => (
                  <Tag key={contact.id} color="blue">
                    {contact.name}
                  </Tag>
                ))}
              </Space>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function groupContactsByRoles(contacts: CrmContact[]): RelationshipBucket[] {
  const buckets = new Map<string, CrmContact[]>();

  contacts.forEach((contact) => {
    const roles = contact.project_roles?.length ? contact.project_roles : ["未标记角色"];
    roles.forEach((role) => addRelationshipBucket(buckets, role, contact));
  });

  return toRelationshipBuckets(buckets);
}

function groupContactsByField(
  contacts: CrmContact[],
  field: "attitude" | "relationship_heat"
): RelationshipBucket[] {
  const buckets = new Map<string, CrmContact[]>();

  contacts.forEach((contact) => {
    addRelationshipBucket(buckets, String(contact[field] ?? "未标记"), contact);
  });

  return toRelationshipBuckets(buckets);
}

function addRelationshipBucket(
  buckets: Map<string, CrmContact[]>,
  key: string,
  contact: CrmContact
) {
  const normalizedKey = key.trim() || "未标记";
  buckets.set(normalizedKey, [...(buckets.get(normalizedKey) ?? []), contact]);
}

function toRelationshipBuckets(buckets: Map<string, CrmContact[]>): RelationshipBucket[] {
  return [...buckets.entries()]
    .map(([key, contacts]) => ({ key, contacts }))
    .sort((left, right) => right.contacts.length - left.contacts.length || left.key.localeCompare(right.key));
}

function OpportunitiesPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({ default_following: true });
  const opportunities = useResource(() => crmApi.opportunities.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [closing, setClosing] = useState<Opportunity | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [closeForm] = Form.useForm();

  const columns: ColumnsType<Opportunity> = [
    {
      title: "商机名称",
      dataIndex: "opportunity_name",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "客户ID", dataIndex: "account_id" },
    { title: "阶段", dataIndex: "stage" },
    { title: "状态", dataIndex: "status", render: statusTag },
    { title: "风险", dataIndex: "risk_status", render: statusTag },
    { title: "最近跟进", dataIndex: "last_activity_summary", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            详情
          </Button>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              editForm.setFieldsValue(record);
            }}
          >
            编辑
          </Button>
          <Button size="small" disabled={record.status !== "following"} onClick={() => setClosing(record)}>
            关闭/取消
          </Button>
          <Button size="small" disabled={record.status === "following"} onClick={() => void reopenOpportunity(record)}>
            重启
          </Button>
        </Space>
      )
    }
  ];

  const createOpportunity = async (values: Record<string, unknown>) => {
    await crmApi.opportunities.create({
      stage: "lead",
      status: "following",
      level: "A",
      source: "customer",
      risk_status: "normal",
      collaborators: [],
      contact_relations: [],
      owner_user_id: currentUser.id,
      ...values
    });
    setDrawerOpen(false);
    form.resetFields();
    await opportunities.refresh();
  };

  const updateOpportunity = async (values: Record<string, unknown>) => {
    if (!editing) {
      return;
    }
    await crmApi.opportunities.update(editing.id, withoutEmpty(values, []));
    setEditing(null);
    editForm.resetFields();
    await opportunities.refresh();
  };

  const closeOpportunity = async (values: Record<string, unknown>) => {
    if (!closing) {
      return;
    }
    await crmApi.opportunities.close(closing.id, values);
    setClosing(null);
    closeForm.resetFields();
    await opportunities.refresh();
  };

  const reopenOpportunity = async (record: Opportunity) => {
    await crmApi.opportunities.reopen(record.id, { reopen_reason: "frontend_reopen" });
    await opportunities.refresh();
  };

  return (
    <DataWorkspace
      title="商机"
      description="商机阶段、状态、风险和关闭/取消跟进管理。"
      loading={opportunities.loading}
      error={opportunities.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建商机</Button>}
      refresh={opportunities.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({ default_following: true })}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="商机名称" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={toAccountOptions(accounts.data)} loading={accounts.loading} />
        </Form.Item>
        <Form.Item name="stage" label="阶段">
          <Select allowClear options={["lead", "proposal", "negotiation", "contract"].map(option)} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select allowClear options={["following", "won", "lost", "cancelled"].map(option)} />
        </Form.Item>
        <Form.Item name="risk_status" label="风险">
          <Select allowClear options={["normal", "risk"].map(option)} />
        </Form.Item>
      </FilterBar>
      <Table rowKey="id" dataSource={opportunities.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建商机" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createOpportunity} initialValues={{ owner_department_id: 1 }}>
          <Form.Item name="account_id" label="所属客户" rules={[{ required: true }]}>
            <Select options={toAccountOptions(accounts.data)} loading={accounts.loading} />
          </Form.Item>
          <Form.Item name="opportunity_name" label="商机名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="estimated_contract_amount" label="预计合同金额">
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Form.Item name="potential_point" label="潜在需求">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="owner_department_id" label="归属部门ID" rules={[{ required: true }]}>
            <InputNumber min={1} className="full-width" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存商机</Button>
        </Form>
      </Drawer>
      <Drawer title="商机详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        <RecordDetails
          record={selected}
          fields={[
            ["商机名称", "opportunity_name"],
            ["客户ID", "account_id"],
            ["阶段", "stage"],
            ["状态", "status"],
            ["等级", "level"],
            ["风险", "risk_status"],
            ["预计合同金额", "estimated_contract_amount"],
            ["当前进展", "current_progress"],
            ["下一步计划", "next_plan"],
            ["最近跟进", "last_activity_summary"]
          ]}
        />
      </Drawer>
      <Modal title="编辑商机" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateOpportunity}>
          <Form.Item name="stage" label="阶段">
            <Select allowClear options={["lead", "proposal", "negotiation", "contract"].map(option)} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select allowClear options={["following", "won", "lost", "cancelled"].map(option)} />
          </Form.Item>
          <Form.Item name="level" label="等级">
            <Select allowClear options={["A", "B", "C"].map(option)} />
          </Form.Item>
          <Form.Item name="risk_status" label="风险状态">
            <Select allowClear options={["normal", "risk"].map(option)} />
          </Form.Item>
          <Form.Item name="estimated_contract_amount" label="预计合同金额">
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Form.Item name="current_progress" label="当前进展">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="next_plan" label="下一步计划">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存修改</Button>
        </Form>
      </Modal>
      <Modal title="关闭/取消商机" open={!!closing} onCancel={() => setClosing(null)} footer={null}>
        <Form form={closeForm} layout="vertical" onFinish={closeOpportunity} initialValues={{ close_type: "won" }}>
          <Form.Item name="close_type" label="类型" rules={[{ required: true }]}>
            <Select options={[option("won"), option("lost"), option("cancelled")]} />
          </Form.Item>
          <Form.Item name="close_reason" label="原因" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="close_description" label="说明" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>提交</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function ActivitiesPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const activities = useResource(() => crmApi.activities.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const opportunities = useResource(crmApi.opportunities.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [completing, setCompleting] = useState<Activity | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [completeForm] = Form.useForm();

  const columns: ColumnsType<Activity> = [
    {
      title: "行动主题",
      dataIndex: "subject",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "客户ID", dataIndex: "account_id" },
    { title: "商机ID", dataIndex: "opportunity_id", render: textOrDash },
    { title: "状态", dataIndex: "activity_status", render: statusTag },
    { title: "下次跟进", dataIndex: "next_follow_up_at", render: dateText },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            详情
          </Button>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              editForm.setFieldsValue({
                ...record,
                activity_time: fromDateTime(record.activity_time),
                next_follow_up_at: fromDateTime(record.next_follow_up_at)
              });
            }}
          >
            编辑
          </Button>
          <Button size="small" disabled={record.activity_status === "completed"} onClick={() => setCompleting(record)}>
            完成
          </Button>
        </Space>
      )
    }
  ];

  const createActivity = async (values: Record<string, unknown>) => {
    await crmApi.activities.create({
      activity_type: "customer_visit",
      activity_status: "planned",
      activity_result: "pending",
      activity_time: toDateTime(values.activity_time),
      next_follow_up_at: toDateTime(values.next_follow_up_at),
      include_in_weekly_progress: true,
      contact_ids: [],
      participants: [{ user_id: currentUser.id, participant_role: "owner" }],
      risk_types: [],
      owner_user_id: currentUser.id,
      ...withoutEmpty(values, ["activity_time", "next_follow_up_at"])
    });
    setDrawerOpen(false);
    form.resetFields();
    await activities.refresh();
  };

  const updateActivity = async (values: Record<string, unknown>) => {
    if (!editing) {
      return;
    }
    await crmApi.activities.update(editing.id, {
      activity_time: toDateTime(values.activity_time),
      next_follow_up_at: toDateTime(values.next_follow_up_at),
      ...withoutEmpty(values, ["activity_time", "next_follow_up_at"])
    });
    setEditing(null);
    editForm.resetFields();
    await activities.refresh();
  };

  const completeActivity = async (values: Record<string, unknown>) => {
    if (!completing) {
      return;
    }
    await crmApi.activities.complete(completing.id, {
      activity_result: "milestone_completed",
      ...values
    });
    setCompleting(null);
    completeForm.resetFields();
    await activities.refresh();
  };

  return (
    <DataWorkspace
      title="销售行动"
      description="记录客户经营行动和项目推进行动，完成后回写客户与商机最近跟进。"
      loading={activities.loading}
      error={activities.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建行动</Button>}
      refresh={activities.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="行动主题" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={toAccountOptions(accounts.data)} loading={accounts.loading} />
        </Form.Item>
        <Form.Item name="opportunity_id" label="商机">
          <Select allowClear options={toOpportunityOptions(opportunities.data)} loading={opportunities.loading} />
        </Form.Item>
        <Form.Item name="activity_status" label="状态">
          <Select allowClear options={["planned", "completed", "cancelled"].map(option)} />
        </Form.Item>
        <Form.Item name="overdue" label="逾期">
          <Select allowClear options={[{ label: "是", value: true }, { label: "否", value: false }]} />
        </Form.Item>
      </FilterBar>
      <Table rowKey="id" dataSource={activities.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建行动" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createActivity} initialValues={{ owner_department_id: 1 }}>
          <Form.Item name="account_id" label="客户" rules={[{ required: true }]}>
            <Select options={toAccountOptions(accounts.data)} loading={accounts.loading} />
          </Form.Item>
          <Form.Item name="opportunity_id" label="商机">
            <Select allowClear options={toOpportunityOptions(opportunities.data)} loading={opportunities.loading} />
          </Form.Item>
          <Form.Item name="subject" label="行动主题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="activity_time" label="行动时间" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="next_follow_up_at" label="下次跟进时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="communication_content" label="沟通内容">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="owner_department_id" label="归属部门ID" rules={[{ required: true }]}>
            <InputNumber min={1} className="full-width" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存行动</Button>
        </Form>
      </Drawer>
      <Drawer title="行动详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        <RecordDetails
          record={selected}
          fields={[
            ["行动主题", "subject"],
            ["客户ID", "account_id"],
            ["商机ID", "opportunity_id"],
            ["类型", "activity_type"],
            ["状态", "activity_status"],
            ["结果", "activity_result"],
            ["行动时间", "activity_time"],
            ["下次跟进", "next_follow_up_at"],
            ["沟通内容", "communication_content"],
            ["客户反馈", "customer_feedback"],
            ["形成结论", "conclusion"],
            ["下一步计划", "next_plan"],
            ["风险说明", "risk_description"]
          ]}
        />
      </Drawer>
      <Modal title="编辑行动" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateActivity}>
          <Form.Item name="subject" label="行动主题">
            <Input />
          </Form.Item>
          <Form.Item name="activity_status" label="状态">
            <Select allowClear options={["planned", "completed", "cancelled"].map(option)} />
          </Form.Item>
          <Form.Item name="activity_time" label="行动时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="next_follow_up_at" label="下次跟进时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="communication_content" label="沟通内容">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="customer_feedback" label="客户反馈">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="conclusion" label="形成结论">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="next_plan" label="下一步计划">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存修改</Button>
        </Form>
      </Modal>
      <Modal title="完成行动" open={!!completing} onCancel={() => setCompleting(null)} footer={null}>
        <Form form={completeForm} layout="vertical" onFinish={completeActivity}>
          <Form.Item name="conclusion" label="形成结论" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="next_plan" label="下一步计划" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>完成行动</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function WeeklyProgressPage() {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const progress = useResource(() => crmApi.weeklyProgress.list(filters), [filters]);
  const columns: ColumnsType<WeeklyProgress> = [
    { title: "商机ID", dataIndex: "opportunity_id" },
    { title: "负责人ID", dataIndex: "owner_user_id" },
    { title: "周开始", dataIndex: "week_start_date", render: dateText },
    { title: "周结束", dataIndex: "week_end_date", render: dateText },
    { title: "行动数", dataIndex: "activity_count" }
  ];

  return (
    <DataWorkspace
      title="周进展"
      description="按商机、负责人和自然周展示已完成销售行动形成的周进展。"
      loading={progress.loading}
      error={progress.error}
      refresh={progress.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="owner_user_id" label="负责人ID">
          <InputNumber className="filter-number" min={1} />
        </Form.Item>
        <Form.Item name="opportunity_id" label="商机ID">
          <InputNumber className="filter-number" min={1} />
        </Form.Item>
        <Form.Item name="account_id" label="客户ID">
          <InputNumber className="filter-number" min={1} />
        </Form.Item>
        <Form.Item name="week_start" label="周开始">
          <Input allowClear placeholder="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="week_end" label="周结束">
          <Input allowClear placeholder="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="risk_only" label="仅风险">
          <Select
            allowClear
            className="filter-select"
            options={[
              { label: "是", value: true },
              { label: "否", value: false }
            ]}
          />
        </Form.Item>
      </FilterBar>
      <Table
        rowKey={(row) => `${row.opportunity_id}-${row.week_start_date}`}
        dataSource={progress.data}
        columns={columns}
        expandable={{
          expandedRowRender: (row) => (
            <SimpleList
              items={row.progress_items}
              render={(item) => `${item.subject} · ${item.conclusion ?? "暂无结论"} · ${item.next_plan ?? "暂无下一步"}`}
              empty="暂无周进展明细"
            />
          )
        }}
      />
    </DataWorkspace>
  );
}

function SystemPage({ section }: { section: SystemSection }) {
  const dictionaries = useResource(crmApi.dictionaries.list, []);
  const auditLogs = useResource(() => crmApi.auditLogs.list({ limit: 20 }), []);
  const users = useResource(crmApi.users.list, []);
  const departments = useResource(crmApi.departments.list, []);
  const roles = useResource(crmApi.roles.list, []);
  const permissions = useResource(crmApi.permissions.list, []);
  const [typeOpen, setTypeOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [itemTarget, setItemTarget] = useState<DictionaryType | null>(null);
  const [editingItem, setEditingItem] = useState<DictionaryType["items"][number] | null>(null);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [typeForm] = Form.useForm();
  const [departmentForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const [userEditForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [itemEditForm] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const createType = async (values: Record<string, unknown>) => {
    await crmApi.dictionaries.createType(values);
    typeForm.resetFields();
    setTypeOpen(false);
    await dictionaries.refresh();
  };

  const createDepartment = async (values: Record<string, unknown>) => {
    await crmApi.departments.create(withoutEmpty(values, []));
    departmentForm.resetFields();
    setDepartmentOpen(false);
    await departments.refresh();
    await auditLogs.refresh();
  };

  const createUser = async (values: Record<string, unknown>) => {
    await crmApi.users.create(withoutEmpty(values, []));
    userForm.resetFields();
    setUserOpen(false);
    await users.refresh();
    await auditLogs.refresh();
  };

  const createItem = async (values: Record<string, unknown>) => {
    if (!itemTarget) {
      return;
    }
    await crmApi.dictionaries.createItem(itemTarget.id, values);
    itemForm.resetFields();
    setItemTarget(null);
    await dictionaries.refresh();
  };

  const updateItem = async (values: Record<string, unknown>) => {
    if (!editingItem) {
      return;
    }
    await crmApi.dictionaries.updateItem(editingItem.id, values);
    itemEditForm.resetFields();
    setEditingItem(null);
    await dictionaries.refresh();
  };

  const resetUserPassword = async (values: Record<string, unknown>) => {
    await resetPassword(values);
    resetForm.resetFields();
    setResetOpen(false);
  };

  const editUser = (user: SystemUser) => {
    setEditingUser(user);
    userEditForm.setFieldsValue({
      department_id: user.department_id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role_code: user.role_code,
      status: user.status,
      role_ids: user.roles.map((role) => role.id)
    });
  };

  const updateUser = async (values: Record<string, unknown>) => {
    if (!editingUser) {
      return;
    }
    await crmApi.users.update(editingUser.id, withoutEmpty(values, []));
    userEditForm.resetFields();
    setEditingUser(null);
    await users.refresh();
    await auditLogs.refresh();
  };

  const editRolePermissions = (role: SystemRole) => {
    setEditingRole(role);
    permissionForm.setFieldsValue({ permission_codes: role.permission_codes });
  };

  const saveRolePermissions = async (values: { permission_codes?: string[] }) => {
    if (!editingRole) {
      return;
    }
    await crmApi.roles.replacePermissions(editingRole.id, values.permission_codes ?? []);
    permissionForm.resetFields();
    setEditingRole(null);
    await roles.refresh();
    await auditLogs.refresh();
  };

  const userColumns: ColumnsType<SystemUser> = [
    { title: "姓名", dataIndex: "name", width: 140 },
    { title: "部门ID", dataIndex: "department_id", width: 90, render: textOrDash },
    { title: "邮箱", dataIndex: "email", width: 220, render: textOrDash },
    { title: "状态", dataIndex: "status", width: 100, render: statusTag },
    {
      title: "角色",
      width: 160,
      render: (_, record) => (
        <Space wrap>
          {record.roles.map((role) => (
            <Tag key={role.id}>{role.name}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: "操作",
      width: 96,
      render: (_, record) => (
        <Button aria-label="编辑用户" size="small" onClick={() => editUser(record)}>
          编辑
        </Button>
      )
    }
  ];

  const departmentColumns: ColumnsType<SystemDepartment> = [
    { title: "组织", dataIndex: "name", width: 160 },
    { title: "编码", dataIndex: "code", width: 180 },
    { title: "上级ID", dataIndex: "parent_id", width: 100, render: textOrDash },
    { title: "区域", dataIndex: "region_code", width: 100, render: textOrDash },
    { title: "状态", dataIndex: "status", width: 100, render: statusTag }
  ];

  const roleColumns: ColumnsType<SystemRole> = [
    { title: "角色", dataIndex: "name", width: 160 },
    { title: "编码", dataIndex: "code", width: 180 },
    { title: "权限数", width: 100, render: (_, record) => record.permission_codes.length },
    {
      title: "操作",
      width: 96,
      render: (_, record) => (
        <Button aria-label="授权" size="small" onClick={() => editRolePermissions(record)}>
          授权
        </Button>
      )
    }
  ];

  const auditColumns: ColumnsType<AuditLog> = [
    { title: "时间", dataIndex: "occurred_at", render: dateText },
    { title: "模块", dataIndex: "module_code" },
    { title: "动作", dataIndex: "action_code" },
    { title: "对象", render: (_, record) => `${record.object_type ?? "-"} #${record.object_id ?? "-"}` },
    { title: "操作人", dataIndex: "actor_user_id", render: textOrDash },
    { title: "结果", dataIndex: "result", render: statusTag },
    { title: "Trace", dataIndex: "trace_id", render: textOrDash }
  ];

  const sectionMeta: Record<SystemSection, { title: string; description: string }> = {
    overview: {
      title: "系统管理",
      description: "按组织、用户、角色权限和审计日志拆分系统治理入口，保留 V1 字典配置。"
    },
    departments: {
      title: "组织管理",
      description: "维护部门组织、区域归属和启停状态。"
    },
    users: {
      title: "用户管理",
      description: "维护人员账号、角色分配、状态和管理员密码重置。"
    },
    roles: {
      title: "角色权限",
      description: "按角色配置权限点，支撑系统与业务操作授权。"
    },
    auditLogs: {
      title: "审计日志",
      description: "查看系统关键操作记录、Trace 和结果。"
    }
  };

  const sectionLoading: Record<SystemSection, boolean> = {
    overview: dictionaries.loading || departments.loading || users.loading || roles.loading || auditLogs.loading,
    departments: departments.loading,
    users: users.loading || roles.loading,
    roles: roles.loading || permissions.loading,
    auditLogs: auditLogs.loading
  };

  const sectionError: Record<SystemSection, string> = {
    overview: dictionaries.error || departments.error || users.error || roles.error || auditLogs.error,
    departments: departments.error,
    users: users.error || roles.error,
    roles: roles.error || permissions.error,
    auditLogs: auditLogs.error
  };

  const sectionRefresh: Record<SystemSection, () => Promise<void>> = {
    overview: async () => {
      await Promise.all([dictionaries.refresh(), users.refresh(), departments.refresh(), roles.refresh(), auditLogs.refresh()]);
    },
    departments: departments.refresh,
    users: async () => {
      await Promise.all([users.refresh(), roles.refresh()]);
    },
    roles: async () => {
      await Promise.all([roles.refresh(), permissions.refresh()]);
    },
    auditLogs: auditLogs.refresh
  };

  const sectionAction: Record<SystemSection, React.ReactNode> = {
    overview: (
      <Button icon={<Plus size={16} />} onClick={() => setTypeOpen(true)}>
        新建字典
      </Button>
    ),
    departments: (
      <Button icon={<Plus size={16} />} type="primary" onClick={() => setDepartmentOpen(true)}>
        新建组织
      </Button>
    ),
    users: (
      <Space>
        <Button icon={<Plus size={16} />} type="primary" onClick={() => setUserOpen(true)}>
          新增用户
        </Button>
        <Button onClick={() => setResetOpen(true)}>重置密码</Button>
      </Space>
    ),
    roles: null,
    auditLogs: null
  };

  return (
    <DataWorkspace
      title={sectionMeta[section].title}
      description={sectionMeta[section].description}
      loading={sectionLoading[section]}
      error={sectionError[section]}
      refresh={sectionRefresh[section]}
      action={sectionAction[section]}
    >
      {section === "overview" ? (
        <>
          <div className="system-module-grid">
            <SystemModuleCard title="组织管理" description="部门、区域和组织状态维护" path="/system/departments" value={departments.data.length} />
            <SystemModuleCard title="用户管理" description="账号、角色和状态维护" path="/system/users" value={users.data.length} />
            <SystemModuleCard title="角色权限" description="角色授权和权限点配置" path="/system/roles" value={roles.data.length} />
            <SystemModuleCard title="审计日志" description="操作轨迹、对象和结果追溯" path="/system/audit-logs" value={auditLogs.data.length} />
          </div>
          <div className="dictionary-grid">
            {dictionaries.data.map((dict) => (
              <Card
                key={dict.id}
                size="small"
                title={`${dict.dict_name} (${dict.dict_code})`}
                extra={
                  <Button size="small" onClick={() => setItemTarget(dict)}>
                    新增项
                  </Button>
                }
              >
                <Space wrap>
                  {dict.items.map((item) => (
                    <Tag
                      key={item.id}
                      color={item.is_active ? "blue" : "default"}
                      onClick={() => {
                        setEditingItem(item);
                        itemEditForm.setFieldsValue(item);
                      }}
                    >
                      {item.item_name}
                    </Tag>
                  ))}
                </Space>
              </Card>
            ))}
          </div>
        </>
      ) : null}
      {section === "departments" ? (
        <Card size="small" title="组织列表">
          <Table
            rowKey="id"
            size="small"
            loading={departments.loading}
            dataSource={departments.data}
            columns={departmentColumns}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 640 }}
          />
        </Card>
      ) : null}
      {section === "users" ? (
        <Card size="small" title="用户列表">
          <Table
            rowKey="id"
            size="small"
            loading={users.loading}
            dataSource={users.data}
            columns={userColumns}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 806 }}
          />
        </Card>
      ) : null}
      {section === "roles" ? (
        <Card size="small" title="角色权限">
          <Table
            rowKey="id"
            size="small"
            loading={roles.loading}
            dataSource={roles.data}
            columns={roleColumns}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 536 }}
          />
        </Card>
      ) : null}
      {section === "auditLogs" ? (
        <Card size="small" title="最近审计日志">
        <Table
          rowKey="id"
          size="small"
          loading={auditLogs.loading}
          dataSource={auditLogs.data}
          columns={auditColumns}
          pagination={{ pageSize: 8 }}
        />
      </Card>
      ) : null}
      <Modal title="新建组织" open={departmentOpen} onCancel={() => setDepartmentOpen(false)} footer={null} destroyOnHidden>
        <Form name="departmentForm" form={departmentForm} layout="vertical" onFinish={createDepartment} initialValues={{ status: "active" }}>
          <Form.Item name="parent_id" label="上级组织ID">
            <InputNumber className="full-width" min={1} />
          </Form.Item>
          <Form.Item name="code" label="组织编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="组织名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="region_code" label="区域编码">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={["active", "inactive"].map(option)} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存组织
          </Button>
        </Form>
      </Modal>
      <Modal title="新增用户" open={userOpen} onCancel={() => setUserOpen(false)} footer={null} destroyOnHidden>
        <Form name="userCreateForm" form={userForm} layout="vertical" onFinish={createUser} initialValues={{ status: "active" }}>
          <Form.Item name="department_id" label="部门ID" rules={[{ required: true }]}>
            <InputNumber className="full-width" min={1} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="mobile" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="role_code" label="岗位编码">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={["active", "inactive"].map(option)} />
          </Form.Item>
          <Form.Item name="login_username" label="登录账号" rules={[{ required: true }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="initial_password" label="初始密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="role_ids" label="角色">
            <Checkbox.Group className="permission-check-list">
              {roles.data.map((role: SystemRole) => (
                <Checkbox key={role.id} value={role.id}>
                  {role.name}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存用户
          </Button>
        </Form>
      </Modal>
      <Modal title="编辑用户" open={!!editingUser} onCancel={() => setEditingUser(null)} footer={null} destroyOnHidden>
        <Form name="userEditForm" form={userEditForm} layout="vertical" onFinish={updateUser}>
          <Form.Item name="department_id" label="部门ID">
            <InputNumber className="full-width" min={1} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="mobile" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="role_code" label="岗位编码">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={["active", "inactive"].map(option)} />
          </Form.Item>
          <Form.Item name="role_ids" label="角色">
            <Checkbox.Group className="permission-check-list">
              {roles.data.map((role: SystemRole) => (
                <Checkbox key={role.id} value={role.id}>
                  {role.name}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存用户
          </Button>
        </Form>
      </Modal>
      <Modal title="新建字典" open={typeOpen} onCancel={() => setTypeOpen(false)} footer={null}>
        <Form form={typeForm} layout="vertical" onFinish={createType}>
          <Form.Item name="dict_code" label="字典编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dict_name" label="字典名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存字典
          </Button>
        </Form>
      </Modal>
      <Modal title={`新增字典项${itemTarget ? `：${itemTarget.dict_name}` : ""}`} open={!!itemTarget} onCancel={() => setItemTarget(null)} footer={null}>
        <Form form={itemForm} layout="vertical" onFinish={createItem}>
          <Form.Item name="item_code" label="项编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="item_name" label="项名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber className="full-width" min={0} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存字典项
          </Button>
        </Form>
      </Modal>
      <Modal title="编辑字典项" open={!!editingItem} onCancel={() => setEditingItem(null)} footer={null}>
        <Form form={itemEditForm} layout="vertical" onFinish={updateItem}>
          <Form.Item name="item_name" label="项名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber className="full-width" min={0} />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用">
            <Select options={[{ label: "启用", value: true }, { label: "停用", value: false }]} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存字典项
          </Button>
        </Form>
      </Modal>
      <Modal title={editingRole ? `角色授权：${editingRole.name}` : "角色授权"} open={!!editingRole} onCancel={() => setEditingRole(null)} footer={null}>
        <Form form={permissionForm} layout="vertical" onFinish={saveRolePermissions}>
          <Form.Item name="permission_codes" label="权限点">
            <Checkbox.Group className="permission-check-list">
              {permissions.data.map((permission: SystemPermission) => (
                <Checkbox key={permission.id} value={permission.permission_code}>
                  {permission.permission_name}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
          <Button aria-label="保存授权" type="primary" htmlType="submit" block>
            保存授权
          </Button>
        </Form>
      </Modal>
      <Modal title="管理员重置密码" open={resetOpen} onCancel={() => setResetOpen(false)} footer={null}>
        <Form form={resetForm} layout="vertical" onFinish={resetUserPassword}>
          <Form.Item name="user_id" label="用户ID" rules={[{ required: true }]}>
            <InputNumber className="full-width" min={1} />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            重置密码
          </Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function SystemModuleCard({
  title,
  description,
  path,
  value
}: {
  title: string;
  description: string;
  path: string;
  value: number;
}) {
  return (
    <Card size="small" className="system-module-card">
      <Link to={path}>{title}</Link>
      <p>{description}</p>
      <strong>{value}</strong>
    </Card>
  );
}

function DataWorkspace({
  title,
  description,
  loading,
  error,
  action,
  refresh,
  children
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string;
  action?: React.ReactNode;
  refresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <section className="workspace">
      <PageTitle
        title={title}
        description={description}
        action={
          <Space>
            <RefreshButton onClick={refresh} loading={loading} />
            {action}
          </Space>
        }
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {children}
    </section>
  );
}

function PageTitle({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="workspace-header">
      <div>
        <Typography.Title level={2}>{title}</Typography.Title>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function FilterBar({
  initialValues,
  children,
  onSearch,
  onReset
}: {
  initialValues: Record<string, unknown>;
  children: React.ReactNode;
  onSearch: (values: Record<string, unknown>) => void;
  onReset: () => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  return (
    <Form className="filter-bar" form={form} layout="inline" onFinish={onSearch}>
      {children}
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            筛选
          </Button>
          <Button
            onClick={() => {
              form.resetFields();
              onReset();
            }}
          >
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

function RecordDetails<T extends Record<string, unknown>>({
  record,
  fields
}: {
  record: T | null;
  fields: Array<[string, keyof T & string]>;
}) {
  if (!record) {
    return null;
  }
  return (
    <dl className="record-details">
      {fields.map(([label, key]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{formatValue(record[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function RefreshButton({ onClick, loading }: { onClick: () => void | Promise<void>; loading?: boolean }) {
  return (
    <Button aria-label="刷新" icon={<RefreshCw size={16} />} loading={loading} onClick={() => void onClick()}>
      刷新
    </Button>
  );
}

function SummaryPanel({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <article className="summary-panel">
      <span>{title}</span>
      <strong>{loading ? "--" : value}</strong>
    </article>
  );
}

function SimpleList<T>({ items, render, empty }: { items: T[]; render: (item: T) => string; empty: string }) {
  if (items.length === 0) {
    return <span className="muted">{empty}</span>;
  }
  return (
    <ul className="simple-list">
      {items.map((item, index) => (
        <li key={index}>{render(item)}</li>
      ))}
    </ul>
  );
}

function useResource<T>(loader: () => Promise<T[]>, deps: React.DependencyList) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

function toAccountOptions(accounts: Account[]): SelectOption[] {
  return accounts.map((account) => ({ label: account.account_name, value: account.id }));
}

function toOpportunityOptions(opportunities: Opportunity[]): SelectOption[] {
  return opportunities.map((opportunity) => ({ label: opportunity.opportunity_name, value: opportunity.id }));
}

function option(value: string) {
  return { label: value, value };
}

function statusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    following: "跟进中",
    planned: "计划中",
    pending: "待处理",
    overdue: "已逾期",
    completed: "已完成",
    cancelled: "已取消",
    closed: "已关闭",
    normal: "正常"
  };
  return labels[status] ?? status;
}

function statusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color = status === "completed" || status === "won" ? "green" : status === "overdue" || status === "risk" ? "red" : "blue";
  return <Tag color={color}>{statusText(status)}</Tag>;
}

function textOrDash(value?: string | number | null) {
  return value ?? "-";
}

function dateText(value?: string | null) {
  if (!value) {
    return "-";
  }
  return value.replace("T", " ").slice(0, 16);
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }
  if (typeof value === "string") {
    return value.includes("T") ? dateText(value) : value || "-";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "-";
}

function toDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }
  return new Date(value).toISOString();
}

function fromDateTime(value?: string | null) {
  if (!value) {
    return undefined;
  }
  return value.slice(0, 16);
}

function splitCsv(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function withoutEmpty(values: Record<string, unknown>, omittedKeys: string[]) {
  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => !omittedKeys.includes(key) && value !== undefined && value !== "")
  );
}
