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
  CalendarCheck,
  CircleDollarSign,
  Contact,
  FileSignature,
  FileText,
  LayoutDashboard,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  type Account,
  type Activity,
  type Attachment,
  type AuditLog,
  type Contract as CrmContract,
  type ContractChange,
  type ContractMilestone,
  type Contact as CrmContact,
  type CurrentUser,
  type DictionaryType,
  type Invoice,
  type Opportunity,
  type Payment,
  type ReceivableFollowUp,
  type ReceivablePlan,
  type Reminder,
  type SolutionDocument,
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

type BaseNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  permission?: string;
  permissions?: string[];
};

type NavItem = BaseNavItem & {
  children?: BaseNavItem[];
};

const navItems: NavItem[] = [
  { key: "/", label: "工作台", icon: <LayoutDashboard size={18} /> },
  { key: "/accounts", label: "客户池", icon: <Users size={18} />, permission: "account.read" },
  { key: "/contacts", label: "联系人", icon: <Contact size={18} />, permission: "contact.read" },
  { key: "/opportunities", label: "商机", icon: <BriefcaseBusiness size={18} />, permission: "opportunity.read" },
  { key: "/solutions", label: "方案标书", icon: <FileText size={18} />, permission: "solution.read" },
  { key: "/contracts", label: "合同", icon: <FileSignature size={18} />, permission: "contract.read" },
  { key: "/invoices", label: "开票管理", icon: <ReceiptText size={18} />, permission: "invoice.read" },
  { key: "/receivables", label: "回款管理", icon: <CircleDollarSign size={18} />, permission: "receivable.read" },
  { key: "/activities", label: "销售行动", icon: <CalendarCheck size={18} />, permission: "activity.read" },
  { key: "/weekly-progress", label: "周进展", icon: <BarChart3 size={18} />, permission: "weekly_progress.read" },
  {
    key: "/system",
    label: "系统",
    icon: <ShieldCheck size={18} />,
    permissions: ["system.dict.manage", "system.user.manage", "system.role.manage", "system.audit.read"],
    children: [
      { key: "/system", label: "系统概览", permissions: ["system.dict.manage", "system.user.manage", "system.role.manage", "system.audit.read"] },
      { key: "/system/departments", label: "组织管理", permission: "system.user.manage" },
      { key: "/system/users", label: "用户管理", permission: "system.user.manage" },
      { key: "/system/roles", label: "角色权限", permission: "system.role.manage" },
      { key: "/system/audit-logs", label: "审计日志", permission: "system.audit.read" },
      { key: "/system/dictionaries", label: "字典管理", permission: "system.dict.manage" }
    ]
  }
];

type SelectOption = {
  label: string;
  value: number;
};

type RelationshipBucket = {
  key: string;
  contacts: CrmContact[];
};

type SystemSection = "overview" | "departments" | "users" | "roles" | "auditLogs" | "dictionaries";

function canAccessNavItem(item: Pick<NavItem, "permission" | "permissions">, permissions: string[]) {
  return (
    (!item.permission || permissions.includes(item.permission)) &&
    (!item.permissions || item.permissions.some((permission) => permissions.includes(permission)))
  );
}

function allowedNavItems(items: NavItem[], permissions: string[]): NavItem[] {
  return items
    .map((item) => {
      const children = item.children?.filter((child) => canAccessNavItem(child, permissions));
      if (item.children) {
        return canAccessNavItem(item, permissions) && children?.length ? { ...item, children } : null;
      }
      return canAccessNavItem(item, permissions) ? item : null;
    })
    .filter((item): item is NavItem => Boolean(item));
}

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
    await changePassword({
      old_password: values.old_password,
      new_password: values.new_password
    });
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

  const allowedNav = allowedNavItems(navItems, user.permissions);
  const selectedMenuKey = location.pathname;

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
          selectedKeys={[selectedMenuKey]}
          defaultOpenKeys={["/system-root"]}
          items={allowedNav.map((item) => ({
            key: item.children ? `${item.key}-root` : item.key,
            icon: item.icon,
            label: item.children ? item.label : <Link to={item.key}>{item.label}</Link>,
            children: item.children?.map((child) => ({
              key: child.key,
              label: <Link to={child.key}>{child.label}</Link>
            }))
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
            <Route path="/solutions" element={<SolutionDocumentsPage currentUser={user} />} />
            <Route path="/contracts" element={<ContractsPage currentUser={user} />} />
            <Route path="/invoices" element={<InvoicesPage currentUser={user} />} />
            <Route path="/receivables" element={<ReceivablesPage currentUser={user} />} />
            <Route path="/activities" element={<ActivitiesPage currentUser={user} />} />
            <Route path="/weekly-progress" element={<WeeklyProgressPage />} />
            <Route path="/system" element={<SystemPage section="overview" />} />
            <Route path="/system/departments" element={<SystemPage section="departments" />} />
            <Route path="/system/users" element={<SystemPage section="users" />} />
            <Route path="/system/roles" element={<SystemPage section="roles" />} />
            <Route path="/system/audit-logs" element={<SystemPage section="auditLogs" />} />
            <Route path="/system/dictionaries" element={<SystemPage section="dictionaries" />} />
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
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={["new_password"]}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的新密码不一致"));
                }
              })
            ]}
          >
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
  const priorityMessage = getDashboardPriorityMessage(
    pendingReminders.length,
    plannedActivities.length,
    activeOpportunities.length,
    activities.length
  );

  return (
    <section className="workspace">
      <PageTitle
        title="工作台"
        description="从待办、商机和行动中判断今天先处理什么。"
        action={<RefreshButton onClick={refreshReminders} />}
      />
      <section className="dashboard-command-center">
        <div>
          <Typography.Title level={3}>今日优先处理</Typography.Title>
          <p>{priorityMessage}</p>
        </div>
        <div className="quick-entry-grid">
          <Link to="/accounts">新建客户</Link>
          <Link to="/opportunities">新建商机</Link>
          <Link to="/activities">新建行动</Link>
          <Link to="/weekly-progress">查看周进展</Link>
        </div>
      </section>
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
            empty="暂无待办，可从销售行动创建下次跟进"
          />
        </Card>
        <Card title="活跃商机" size="small">
          <SimpleList
            items={activeOpportunities.slice(0, 5)}
            render={(opportunity) => `${opportunity.opportunity_name} · ${opportunity.stage}`}
            empty="暂无活跃商机，可新建商机或查看客户池"
          />
        </Card>
      </div>
    </section>
  );
}

function getDashboardPriorityMessage(
  pendingReminderCount: number,
  plannedActivityCount: number,
  activeOpportunityCount: number,
  weeklyActivityCount: number
) {
  if (pendingReminderCount > 0) {
    return `先处理 ${pendingReminderCount} 条待办，避免客户跟进遗漏。`;
  }
  if (plannedActivityCount > 0) {
    return `先推进 ${plannedActivityCount} 条待完成行动，完成后会回写最近跟进和周进展。`;
  }
  if (activeOpportunityCount > 0) {
    return `先查看 ${activeOpportunityCount} 个在办商机，确认阶段、风险和下一步计划。`;
  }
  if (weeklyActivityCount > 0) {
    return `本周已有 ${weeklyActivityCount} 条行动记录，可进入销售行动查看完成情况。`;
  }
  return "当前没有待办和在办事项，可先新建客户、商机或行动。";
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
    { title: "类型", dataIndex: "account_type", render: accountTypeText },
    { title: "等级", dataIndex: "account_level", render: textOrDash },
    { title: "状态", dataIndex: "account_status", render: statusTag },
    { title: "最近跟进", dataIndex: "last_activity_summary", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看经营
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
      description="从客户池进入客户经营，查看客户状态、最近跟进和后续业务入口。"
      guide="先用关键词、等级、状态或行业定位客户；打开客户经营查看摘要、最近跟进和后续业务入口，必要时新建客户。"
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
      <Table rowKey="id" size="middle" dataSource={resource.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无客户" }} />
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
      <Drawer title="客户经营" open={!!selected} onClose={() => setSelected(null)} size="large">
        <AccountOperationDrawer account={selected} />
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

function AccountOperationDrawer({ account }: { account: Account | null }) {
  if (!account) {
    return null;
  }
  const location = [account.region_province, account.region_city].filter(Boolean).join(" / ") || "-";
  const lastActivityAt = dateText(account.last_activity_at);
  const entries = [
    {
      icon: <Contact size={18} />,
      title: "维护联系人",
      description: "补全决策人、采购和影响者，沉淀客户关系。",
      to: "/contacts"
    },
    {
      icon: <BriefcaseBusiness size={18} />,
      title: "推进商机",
      description: "进入商机阶段、风险和状态推进。",
      to: "/opportunities"
    },
    {
      icon: <CalendarCheck size={18} />,
      title: "记录销售行动",
      description: "记录拜访、会议和下一步计划，回写最近跟进。",
      to: "/activities"
    }
  ];

  return (
    <div className="account-operation">
      <section className="account-operation-hero">
        <div>
          <Typography.Title level={3}>客户经营入口</Typography.Title>
          <p>{account.account_name}</p>
        </div>
        <Tag color="blue">{statusText(account.account_status)}</Tag>
      </section>

      <section>
        <Typography.Title level={4}>客户摘要</Typography.Title>
        <div className="account-summary-grid">
          <AccountSummaryItem label="客户类型" value={accountTypeText(account.account_type)} />
          <AccountSummaryItem label="客户等级" value={textOrDash(account.account_level)} />
          <AccountSummaryItem label="经营状态" value={statusText(account.account_status)} />
          <AccountSummaryItem label="行业" value={textOrDash(account.industry)} />
          <AccountSummaryItem label="区域" value={location} />
          <AccountSummaryItem label="归属销售" value={`用户 ${account.owner_user_id}`} />
        </div>
      </section>

      <section className="account-follow-up-panel">
        <div>
          <span>最近跟进</span>
          <strong>{textOrDash(account.last_activity_summary)}</strong>
        </div>
        <small>{lastActivityAt === "-" ? "暂无跟进时间" : lastActivityAt}</small>
      </section>

      <section>
        <Typography.Title level={4}>关联业务入口</Typography.Title>
        <div className="account-entry-grid">
          {entries.map((entry) => (
            <Link key={entry.to} className="account-entry-link" to={entry.to} aria-label={entry.title}>
              {entry.icon}
              <strong>{entry.title}</strong>
              <span>{entry.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="account-next-step">
        <Typography.Title level={4}>下一步建议</Typography.Title>
        <p>先确认联系人角色和态度，再推进商机阶段；所有拜访、会议和风险变化统一沉淀到销售行动。</p>
      </section>
    </div>
  );
}

function AccountSummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="account-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);
  const roleGroups = useMemo(() => groupContactsByRoles(contacts.data), [contacts.data]);
  const attitudeGroups = useMemo(() => groupContactsByField(contacts.data, "attitude"), [contacts.data]);
  const heatGroups = useMemo(() => groupContactsByField(contacts.data, "relationship_heat"), [contacts.data]);

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
    { title: "所属客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    { title: "职务", dataIndex: "title", render: textOrDash },
    { title: "类型", dataIndex: "contact_type", render: contactTypeText },
    { title: "态度", dataIndex: "attitude", render: contactAttitudeTag },
    { title: "关系热度", dataIndex: "relationship_heat", render: contactHeatTag },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看关系
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
      description="维护客户干系人关系，识别关键角色、态度和经营动作。"
      guide="先按客户、态度或关系热度定位关键人；通过关系判断查看角色覆盖，再进入联系人经营补动作。"
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
        <Typography.Title level={3}>关键关系判断</Typography.Title>
        <div className="relationship-grid">
          <RelationshipGroup title="项目角色覆盖" groups={roleGroups} formatKey={contactRoleText} />
          <RelationshipGroup title="态度判断" groups={attitudeGroups} formatKey={contactAttitudeText} />
          <RelationshipGroup title="关系热度" groups={heatGroups} formatKey={contactHeatText} />
        </div>
      </section>
      <Table rowKey="id" dataSource={contacts.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无联系人" }} />
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
      <Drawer title="联系人经营" open={!!selected} onClose={() => setSelected(null)} size="large">
        <ContactOperationDrawer contact={selected} account={selected ? accountById.get(selected.account_id) : undefined} />
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

function ContactOperationDrawer({ contact, account }: { contact: CrmContact | null; account?: Account }) {
  if (!contact) {
    return null;
  }
  const roleLabels = contact.project_roles?.length ? contact.project_roles.map(contactRoleText) : ["未标记角色"];
  const entries = [
    {
      icon: <Users size={18} />,
      title: "查看客户",
      description: "回到客户经营入口，确认客户状态和最近跟进。",
      to: "/accounts"
    },
    {
      icon: <BriefcaseBusiness size={18} />,
      title: "推进商机",
      description: "结合联系人态度和角色推进商机阶段。",
      to: "/opportunities"
    },
    {
      icon: <CalendarCheck size={18} />,
      title: "记录销售行动",
      description: "记录沟通结果、关系变化和下一步动作。",
      to: "/activities"
    }
  ];

  return (
    <div className="contact-operation">
      <section className="contact-operation-hero">
        <div>
          <Typography.Title level={3}>联系人经营入口</Typography.Title>
          <p>{contact.name} · {textOrDash(contact.title)}</p>
        </div>
        {contactAttitudeTag(contact.attitude)}
      </section>

      <section>
        <Typography.Title level={4}>关系判断</Typography.Title>
        <div className="contact-summary-grid">
          <ContactSummaryItem label="所属客户" value={account?.account_name ?? `客户 ${contact.account_id}`} />
          <ContactSummaryItem label="联系人类型" value={contactTypeText(contact.contact_type)} />
          <ContactSummaryItem label="项目角色" value={roleLabels.join(" / ")} />
          <ContactSummaryItem label="态度" value={contactAttitudeText(contact.attitude)} />
          <ContactSummaryItem label="关系热度" value={contactHeatText(contact.relationship_heat)} />
          <ContactSummaryItem label="部门" value={textOrDash(contact.department)} />
        </div>
      </section>

      <section className="contact-communication-panel">
        <div>
          <span>最近沟通</span>
          <strong>{textOrDash(contact.last_communication_summary)}</strong>
        </div>
        <div>
          <span>下一步动作</span>
          <strong>{textOrDash(contact.next_action)}</strong>
        </div>
      </section>

      <section>
        <Typography.Title level={4}>关联业务入口</Typography.Title>
        <div className="contact-entry-grid">
          {entries.map((entry) => (
            <Link key={entry.to} className="contact-entry-link" to={entry.to} aria-label={entry.title}>
              {entry.icon}
              <strong>{entry.title}</strong>
              <span>{entry.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ContactSummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="contact-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RelationshipGroup({
  title,
  groups,
  formatKey = (value) => value
}: {
  title: string;
  groups: RelationshipBucket[];
  formatKey?: (value: string) => string;
}) {
  return (
    <Card size="small" title={title}>
      {groups.length === 0 ? (
        <span className="muted">暂无关系数据</span>
      ) : (
        <div className="relationship-buckets">
          {groups.map((group) => (
            <div key={group.key} className="relationship-bucket">
              <div>
                <strong>{formatKey(group.key)}</strong>
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
  const accountOptions = toAccountOptions(accounts.data);
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);

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
    { title: "所属客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    { title: "阶段", dataIndex: "stage", render: opportunityStageText },
    { title: "状态", dataIndex: "status", render: opportunityStatusTag },
    { title: "风险", dataIndex: "risk_status", render: opportunityRiskTag },
    { title: "最近跟进", dataIndex: "last_activity_summary", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看推进
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
          <Button size="small" disabled={!isOpportunityOpen(record.status)} onClick={() => setClosing(record)}>
            关闭/取消
          </Button>
          <Button size="small" disabled={isOpportunityOpen(record.status)} onClick={() => void reopenOpportunity(record)}>
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
      description="围绕在办商机推进阶段、状态、风险和关闭/取消跟进。"
      guide="先看默认在办商机；按阶段、状态或风险筛选，再进入商机推进入口确认进展、下一步和关联动作。"
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
          <Select allowClear options={accountOptions} loading={accounts.loading} />
        </Form.Item>
        <Form.Item name="stage" label="阶段">
          <Select allowClear options={opportunityStageOptions()} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select allowClear options={opportunityStatusOptions()} />
        </Form.Item>
        <Form.Item name="risk_status" label="风险">
          <Select allowClear options={opportunityRiskOptions()} />
        </Form.Item>
      </FilterBar>
      <Table rowKey="id" dataSource={opportunities.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无商机" }} />
      <Drawer title="新建商机" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createOpportunity} initialValues={{ owner_department_id: 1 }}>
          <Form.Item name="account_id" label="所属客户" rules={[{ required: true }]}>
            <Select options={accountOptions} loading={accounts.loading} />
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
      <Drawer title="商机推进" open={!!selected} onClose={() => setSelected(null)} size="large">
        <OpportunityProgressDrawer
          opportunity={selected}
          account={selected ? accountById.get(selected.account_id) : undefined}
        />
      </Drawer>
      <Modal title="编辑商机" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateOpportunity}>
          <Form.Item name="stage" label="阶段">
            <Select allowClear options={opportunityStageOptions()} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select allowClear options={opportunityStatusOptions()} />
          </Form.Item>
          <Form.Item name="level" label="等级">
            <Select allowClear options={opportunityLevelOptions()} />
          </Form.Item>
          <Form.Item name="risk_status" label="风险状态">
            <Select allowClear options={opportunityRiskOptions()} />
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

function OpportunityProgressDrawer({ opportunity, account }: { opportunity: Opportunity | null; account?: Account }) {
  if (!opportunity) {
    return null;
  }
  const entries = [
    {
      icon: <Users size={18} />,
      title: "查看客户",
      description: "回到客户经营入口，确认客户状态、最近跟进和经营建议。",
      to: "/accounts"
    },
    {
      icon: <Contact size={18} />,
      title: "经营联系人",
      description: "确认决策人、预算推动人和采购执行人的关系状态。",
      to: "/contacts"
    },
    {
      icon: <CalendarCheck size={18} />,
      title: "记录销售行动",
      description: "记录会议、拜访、风险和下一步计划，沉淀推进过程。",
      to: "/activities"
    },
    {
      icon: <BarChart3 size={18} />,
      title: "查看周进展",
      description: "按自然周回看行动明细和商机推进变化。",
      to: "/weekly-progress"
    }
  ];

  return (
    <div className="opportunity-progress">
      <section className="opportunity-progress-hero">
        <div>
          <Typography.Title level={3}>商机推进入口</Typography.Title>
          <p>{opportunity.opportunity_name}</p>
        </div>
        {opportunityStatusTag(opportunity.status)}
      </section>

      <section>
        <Typography.Title level={4}>推进判断</Typography.Title>
        <div className="opportunity-summary-grid">
          <OpportunitySummaryItem label="所属客户" value={account?.account_name ?? `客户 ${opportunity.account_id}`} />
          <OpportunitySummaryItem label="阶段" value={opportunityStageText(opportunity.stage)} />
          <OpportunitySummaryItem label="状态" value={opportunityStatusText(opportunity.status)} />
          <OpportunitySummaryItem label="风险" value={opportunityRiskText(opportunity.risk_status)} />
          <OpportunitySummaryItem label="等级" value={opportunityLevelText(opportunity.level)} />
          <OpportunitySummaryItem label="预计合同金额" value={moneyText(opportunity.estimated_contract_amount)} />
        </div>
      </section>

      <section className="opportunity-progress-panel">
        <div>
          <span>当前进展</span>
          <strong>{textOrDash(opportunity.current_progress)}</strong>
        </div>
        <div>
          <span>下一步计划</span>
          <strong>{textOrDash(opportunity.next_plan)}</strong>
        </div>
        <div>
          <span>最近行动</span>
          <strong>{textOrDash(opportunity.last_activity_summary)}</strong>
        </div>
      </section>

      <section>
        <Typography.Title level={4}>关联业务入口</Typography.Title>
        <div className="opportunity-entry-grid">
          {entries.map((entry) => (
            <Link key={entry.to} className="opportunity-entry-link" to={entry.to} aria-label={entry.title}>
              {entry.icon}
              <strong>{entry.title}</strong>
              <span>{entry.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function OpportunitySummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="opportunity-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SolutionDocumentsPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const solutions = useResource(() => crmApi.solutions.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const opportunities = useResource(crmApi.opportunities.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<SolutionDocument | null>(null);
  const [editing, setEditing] = useState<SolutionDocument | null>(null);
  const [voiding, setVoiding] = useState<SolutionDocument | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [voidForm] = Form.useForm();
  const [attachmentForm] = Form.useForm();
  const accountOptions = toAccountOptions(accounts.data);
  const opportunityOptions = toOpportunityOptions(opportunities.data);
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);
  const opportunityById = useMemo(
    () => new Map(opportunities.data.map((opportunity) => [opportunity.id, opportunity])),
    [opportunities.data]
  );

  const loadAttachments = useCallback(async (solutionId: number) => {
    setAttachmentLoading(true);
    try {
      setAttachments(await crmApi.attachments.list({ object_type: "solution_document", object_id: solutionId }));
    } finally {
      setAttachmentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setAttachments([]);
      return;
    }
    void loadAttachments(selected.id);
  }, [loadAttachments, selected]);

  const columns: ColumnsType<SolutionDocument> = [
    {
      title: "方案名称",
      dataIndex: "document_name",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    { title: "商机", dataIndex: "opportunity_id", render: (value) => opportunityById.get(Number(value))?.opportunity_name ?? value },
    { title: "类型", dataIndex: "document_type", render: solutionDocumentTypeText },
    { title: "版本", dataIndex: "version_no", render: textOrDash },
    { title: "状态", dataIndex: "status", render: solutionStatusTag },
    { title: "报价", dataIndex: "quotation_amount", render: moneyText },
    { title: "自检", dataIndex: "bid_self_check_result", render: bidSelfCheckTag },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看
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
          <Button size="small" danger disabled={record.status === "voided"} onClick={() => setVoiding(record)}>
            作废
          </Button>
        </Space>
      )
    }
  ];

  const attachmentColumns: ColumnsType<Attachment> = [
    { title: "附件名称", dataIndex: "file_name" },
    { title: "类型", dataIndex: "file_type", render: textOrDash },
    { title: "大小", dataIndex: "file_size", render: fileSizeText },
    { title: "上传时间", dataIndex: "uploaded_at", render: dateText },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" href={record.file_url} target="_blank" rel="noreferrer">
            下载
          </Button>
          <Button size="small" danger onClick={() => void deleteAttachment(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  const createSolution = async (values: Record<string, unknown>) => {
    await crmApi.solutions.create({
      document_type: "technical_solution",
      version_no: "V1.0",
      status: "drafting",
      owner_user_id: currentUser.id,
      ...withoutEmpty(values, [])
    });
    setDrawerOpen(false);
    form.resetFields();
    await solutions.refresh();
  };

  const updateSolution = async (values: Record<string, unknown>) => {
    if (!editing) {
      return;
    }
    await crmApi.solutions.update(editing.id, withoutEmpty(values, []));
    setEditing(null);
    editForm.resetFields();
    await solutions.refresh();
  };

  const voidSolution = async (values: Record<string, unknown>) => {
    if (!voiding) {
      return;
    }
    await crmApi.solutions.void(voiding.id, values);
    setVoiding(null);
    voidForm.resetFields();
    await solutions.refresh();
  };

  const createAttachment = async (values: Record<string, unknown>) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.create({
      object_type: "solution_document",
      object_id: selected.id,
      ...withoutEmpty(values, [])
    });
    attachmentForm.resetFields();
    await loadAttachments(selected.id);
  };

  const deleteAttachment = async (attachmentId: number) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.delete(attachmentId);
    await loadAttachments(selected.id);
  };

  return (
    <DataWorkspace
      title="方案标书"
      description="管理商机关联的技术方案、投标文件、报价和客户反馈。"
      guide="先按客户、商机、状态筛选方案；进入详情维护方案摘要、投标自检和附件，作废时保留原因用于审计。"
      loading={solutions.loading}
      error={solutions.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建方案</Button>}
      refresh={solutions.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="方案名称" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={accountOptions} loading={accounts.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="opportunity_id" label="商机">
          <Select allowClear options={opportunityOptions} loading={opportunities.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="document_type" label="类型">
          <Select allowClear options={solutionDocumentTypeOptions()} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select allowClear options={solutionStatusOptions()} />
        </Form.Item>
      </FilterBar>
      <Table rowKey="id" dataSource={solutions.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无方案标书" }} />

      <Drawer title="新建方案" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createSolution}>
          <SolutionDocumentFormFields accountOptions={accountOptions} opportunityOptions={opportunityOptions} />
          <Button type="primary" htmlType="submit" block>保存方案</Button>
        </Form>
      </Drawer>

      <Drawer title="方案详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        <SolutionDocumentDetail
          solution={selected}
          account={selected ? accountById.get(selected.account_id) : undefined}
          opportunity={selected ? opportunityById.get(selected.opportunity_id) : undefined}
        />
        <section className="drawer-section">
          <div className="section-title-row">
            <Typography.Title level={4}>附件</Typography.Title>
            <Button icon={<Paperclip size={16} />} onClick={() => selected ? void loadAttachments(selected.id) : undefined}>
              刷新附件
            </Button>
          </div>
          <Table
            rowKey="id"
            size="small"
            loading={attachmentLoading}
            dataSource={attachments}
            columns={attachmentColumns}
            pagination={false}
            locale={{ emptyText: "暂无附件" }}
          />
          <Form form={attachmentForm} layout="vertical" className="inline-create-form" onFinish={createAttachment}>
            <Form.Item name="file_name" label="附件名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="file_url" label="附件地址" rules={[{ required: true }]}>
              <Input placeholder="https:// 或 oss:// 地址" />
            </Form.Item>
            <Form.Item name="file_type" label="附件类型">
              <Select allowClear options={attachmentFileTypeOptions()} />
            </Form.Item>
            <Form.Item name="file_size" label="文件大小">
              <InputNumber min={0} className="full-width" />
            </Form.Item>
            <Button type="primary" htmlType="submit">新增附件</Button>
          </Form>
        </section>
      </Drawer>

      <Modal title="编辑方案" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateSolution}>
          <SolutionDocumentFormFields accountOptions={accountOptions} opportunityOptions={opportunityOptions} editing />
          <Button type="primary" htmlType="submit" block>保存修改</Button>
        </Form>
      </Modal>

      <Modal title="作废方案" open={!!voiding} onCancel={() => setVoiding(null)} footer={null}>
        <Form form={voidForm} layout="vertical" onFinish={voidSolution}>
          <Form.Item name="void_reason" label="作废原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" danger htmlType="submit" block>确认作废</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function ContractsPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const contracts = useResource(() => crmApi.contracts.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const opportunities = useResource(crmApi.opportunities.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CrmContract | null>(null);
  const [editing, setEditing] = useState<CrmContract | null>(null);
  const [terminating, setTerminating] = useState<CrmContract | null>(null);
  const [changes, setChanges] = useState<ContractChange[]>([]);
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [terminateForm] = Form.useForm();
  const [attachmentForm] = Form.useForm();
  const [milestoneForm] = Form.useForm();
  const accountOptions = toAccountOptions(accounts.data);
  const opportunityOptions = toOpportunityOptions(opportunities.data);
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);
  const opportunityById = useMemo(
    () => new Map(opportunities.data.map((opportunity) => [opportunity.id, opportunity])),
    [opportunities.data]
  );

  const loadContractDetail = useCallback(async (contractId: number) => {
    setDetailLoading(true);
    try {
      const [nextChanges, nextMilestones, nextAttachments] = await Promise.all([
        crmApi.contracts.changes(contractId),
        crmApi.contracts.milestones(contractId),
        crmApi.attachments.list({ object_type: "contract", object_id: contractId })
      ]);
      setChanges(nextChanges);
      setMilestones(nextMilestones);
      setAttachments(nextAttachments);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setChanges([]);
      setMilestones([]);
      setAttachments([]);
      return;
    }
    void loadContractDetail(selected.id);
  }, [loadContractDetail, selected]);

  const columns: ColumnsType<CrmContract> = [
    {
      title: "合同名称",
      dataIndex: "contract_name",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "编号", dataIndex: "contract_no", render: textOrDash },
    { title: "客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    { title: "商机", dataIndex: "opportunity_id", render: (value) => opportunityById.get(Number(value))?.opportunity_name ?? textOrDash(value) },
    { title: "类型", dataIndex: "contract_type", render: contractTypeText },
    { title: "状态", dataIndex: "contract_status", render: contractStatusTag },
    { title: "金额", dataIndex: "contract_amount", render: moneyText },
    { title: "风险", dataIndex: "risk_level", render: contractRiskTag },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看
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
          <Button size="small" danger disabled={record.contract_status === "terminated"} onClick={() => setTerminating(record)}>
            终止
          </Button>
        </Space>
      )
    }
  ];

  const createContract = async (values: Record<string, unknown>) => {
    await crmApi.contracts.create({
      contract_type: "project",
      contract_status: "drafting",
      owner_user_id: currentUser.id,
      ...withoutEmpty(values, [])
    });
    setDrawerOpen(false);
    form.resetFields();
    await contracts.refresh();
  };

  const updateContract = async (values: Record<string, unknown>) => {
    if (!editing) {
      return;
    }
    await crmApi.contracts.update(editing.id, withoutEmpty(values, []));
    setEditing(null);
    editForm.resetFields();
    await contracts.refresh();
  };

  const terminateContract = async (values: Record<string, unknown>) => {
    if (!terminating) {
      return;
    }
    await crmApi.contracts.terminate(terminating.id, values);
    setTerminating(null);
    terminateForm.resetFields();
    await contracts.refresh();
  };

  const createAttachment = async (values: Record<string, unknown>) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.create({ object_type: "contract", object_id: selected.id, ...withoutEmpty(values, []) });
    attachmentForm.resetFields();
    await loadContractDetail(selected.id);
  };

  const deleteAttachment = async (attachmentId: number) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.delete(attachmentId);
    await loadContractDetail(selected.id);
  };

  const createMilestone = async (values: Record<string, unknown>) => {
    if (!selected) {
      return;
    }
    await crmApi.contracts.createMilestone(selected.id, {
      milestone_type: "kickoff",
      status: "pending",
      ...withoutEmpty(values, ["planned_at", "actual_at"])
    });
    milestoneForm.resetFields();
    await loadContractDetail(selected.id);
  };

  const attachmentColumns: ColumnsType<Attachment> = [
    { title: "附件名称", dataIndex: "file_name" },
    { title: "类型", dataIndex: "file_type", render: textOrDash },
    { title: "大小", dataIndex: "file_size", render: fileSizeText },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" href={record.file_url} target="_blank" rel="noreferrer">
            下载
          </Button>
          <Button size="small" danger onClick={() => void deleteAttachment(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <DataWorkspace
      title="合同"
      description="维护成交后的合同台账、状态、金额、条款、变更、节点和附件。"
      guide="先按客户、商机、状态和风险筛选合同；进入执行台查看变更、节点和附件，为后续开票与回款提供来源。"
      loading={contracts.loading}
      error={contracts.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建合同</Button>}
      refresh={contracts.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="合同名称/编号" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={accountOptions} loading={accounts.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="opportunity_id" label="商机">
          <Select allowClear options={opportunityOptions} loading={opportunities.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="contract_status" label="状态">
          <Select allowClear options={contractStatusOptions()} />
        </Form.Item>
        <Form.Item name="risk_level" label="风险">
          <Select allowClear options={contractRiskOptions()} />
        </Form.Item>
      </FilterBar>

      <Table rowKey="id" dataSource={contracts.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无合同" }} />

      <Drawer title="新建合同" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createContract}>
          <ContractFormFields accountOptions={accountOptions} opportunityOptions={opportunityOptions} />
          <Button type="primary" htmlType="submit" block>保存合同</Button>
        </Form>
      </Drawer>

      <Drawer title="合同详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        {selected && (
          <>
            <section className="drawer-section">
              <Typography.Title level={3}>合同执行台</Typography.Title>
              <div className="opportunity-summary-grid">
                <OpportunitySummaryItem label="合同编号" value={selected.contract_no ?? "-"} />
                <OpportunitySummaryItem label="客户" value={accountById.get(selected.account_id)?.account_name ?? `客户 ${selected.account_id}`} />
                <OpportunitySummaryItem label="商机" value={selected.opportunity_id ? opportunityById.get(selected.opportunity_id)?.opportunity_name ?? `商机 ${selected.opportunity_id}` : "-"} />
                <OpportunitySummaryItem label="状态" value={contractStatusText(selected.contract_status)} />
                <OpportunitySummaryItem label="含税金额" value={moneyText(selected.contract_amount)} />
                <OpportunitySummaryItem label="不含税金额" value={moneyText(selected.net_amount)} />
                <OpportunitySummaryItem label="风险" value={contractRiskText(selected.risk_level)} />
                <OpportunitySummaryItem label="付款条件" value={selected.payment_terms ?? "-"} />
              </div>
            </section>
            <section className="drawer-section">
              <Typography.Title level={4}>合同条款</Typography.Title>
              <RecordDetails
                record={selected as unknown as Record<string, unknown>}
                fields={[
                  ["开票条件", "invoice_terms"],
                  ["交付范围", "delivery_scope"],
                  ["验收标准", "acceptance_criteria"],
                  ["风险说明", "risk_description"],
                  ["终止原因", "termination_reason"]
                ]}
              />
            </section>
            <section className="drawer-section">
              <Typography.Title level={4}>变更记录</Typography.Title>
              <Table
                rowKey="id"
                size="small"
                loading={detailLoading}
                dataSource={changes}
                pagination={false}
                columns={[
                  { title: "类型", dataIndex: "change_type", render: contractChangeTypeText },
                  { title: "变更前", dataIndex: "before_value", render: textOrDash },
                  { title: "变更后", dataIndex: "after_value", render: textOrDash },
                  { title: "原因", dataIndex: "change_reason" },
                  { title: "时间", dataIndex: "changed_at", render: dateText }
                ]}
                locale={{ emptyText: "暂无变更记录" }}
              />
            </section>
            <section className="drawer-section">
              <div className="section-title-row">
                <Typography.Title level={4}>合同节点</Typography.Title>
                <Button icon={<Plus size={16} />} onClick={() => milestoneForm.submit()}>新增节点</Button>
              </div>
              <Table
                rowKey="id"
                size="small"
                loading={detailLoading}
                dataSource={milestones}
                pagination={false}
                columns={[
                  { title: "节点", dataIndex: "milestone_name" },
                  { title: "类型", dataIndex: "milestone_type", render: milestoneTypeText },
                  { title: "状态", dataIndex: "status", render: milestoneStatusTag },
                  { title: "备注", dataIndex: "remark", render: textOrDash }
                ]}
                locale={{ emptyText: "暂无合同节点" }}
              />
              <Form form={milestoneForm} layout="vertical" className="inline-create-form" onFinish={createMilestone}>
                <Form.Item name="milestone_name" label="节点名称" rules={[{ required: true }]}>
                  <Input placeholder="如项目启动会、初验、终验" />
                </Form.Item>
                <Form.Item name="milestone_type" label="节点类型">
                  <Select allowClear options={milestoneTypeOptions()} />
                </Form.Item>
                <Form.Item name="status" label="状态">
                  <Select allowClear options={milestoneStatusOptions()} />
                </Form.Item>
                <Form.Item name="remark" label="备注">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Form>
            </section>
            <section className="drawer-section">
              <div className="section-title-row">
                <Typography.Title level={4}>附件</Typography.Title>
                <Button icon={<Paperclip size={16} />} onClick={() => attachmentForm.submit()}>添加附件</Button>
              </div>
              <Table
                rowKey="id"
                size="small"
                loading={detailLoading}
                dataSource={attachments}
                columns={attachmentColumns}
                pagination={false}
                locale={{ emptyText: "暂无附件" }}
              />
              <Form form={attachmentForm} layout="vertical" className="inline-create-form" onFinish={createAttachment}>
                <Form.Item name="file_name" label="附件名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="file_url" label="附件地址" rules={[{ required: true }]}>
                  <Input placeholder="https:// 或 oss:// 地址" />
                </Form.Item>
                <Form.Item name="file_type" label="附件类型">
                  <Select allowClear options={contractAttachmentFileTypeOptions()} />
                </Form.Item>
                <Form.Item name="file_size" label="文件大小">
                  <InputNumber min={0} className="full-width" />
                </Form.Item>
              </Form>
            </section>
          </>
        )}
      </Drawer>

      <Modal title="编辑合同" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateContract}>
          <ContractFormFields accountOptions={accountOptions} opportunityOptions={opportunityOptions} editing />
          <Form.Item name="change_reason" label="变更原因">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存修改</Button>
        </Form>
      </Modal>

      <Modal title="终止合同" open={!!terminating} onCancel={() => setTerminating(null)} footer={null}>
        <Form form={terminateForm} layout="vertical" onFinish={terminateContract}>
          <Form.Item name="termination_reason" label="终止原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" danger htmlType="submit" block>确认终止</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function InvoicesPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const invoices = useResource(() => crmApi.invoices.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const opportunities = useResource(crmApi.opportunities.list, []);
  const contracts = useResource(crmApi.contracts.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [applying, setApplying] = useState<Invoice | null>(null);
  const [issuing, setIssuing] = useState<Invoice | null>(null);
  const [signing, setSigning] = useState<Invoice | null>(null);
  const [exceptioning, setExceptioning] = useState<Invoice | null>(null);
  const [voiding, setVoiding] = useState<Invoice | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [applyForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [signForm] = Form.useForm();
  const [exceptionForm] = Form.useForm();
  const [voidForm] = Form.useForm();
  const [attachmentForm] = Form.useForm();
  const accountOptions = toAccountOptions(accounts.data);
  const opportunityOptions = toOpportunityOptions(opportunities.data);
  const contractOptions = contracts.data.map((contract) => ({ label: contract.contract_name, value: contract.id }));
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);
  const opportunityById = useMemo(
    () => new Map(opportunities.data.map((opportunity) => [opportunity.id, opportunity])),
    [opportunities.data]
  );
  const contractById = useMemo(() => new Map(contracts.data.map((contract) => [contract.id, contract])), [contracts.data]);

  const loadInvoiceDetail = useCallback(async (invoiceId: number) => {
    setDetailLoading(true);
    try {
      const [nextInvoice, nextAttachments] = await Promise.all([
        crmApi.invoices.detail(invoiceId),
        crmApi.attachments.list({ object_type: "invoice", object_id: invoiceId })
      ]);
      setSelected(nextInvoice);
      setAttachments(nextAttachments);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setAttachments([]);
      return;
    }
    void loadInvoiceDetail(selected.id);
  }, [loadInvoiceDetail, selected?.id]);

  const columns: ColumnsType<Invoice> = [
    {
      title: "开票计划",
      dataIndex: "plan_name",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    { title: "合同", dataIndex: "contract_id", render: (value) => contractById.get(Number(value))?.contract_name ?? `合同 ${value}` },
    { title: "类型", dataIndex: "invoice_type", render: invoiceTypeText },
    { title: "状态", dataIndex: "invoice_status", render: invoiceStatusTag },
    { title: "计划日期", dataIndex: "planned_invoice_date", render: dateText },
    { title: "计划金额", dataIndex: "planned_amount", render: moneyText },
    { title: "实际开票", dataIndex: "actual_invoice_amount", render: moneyText },
    { title: "发票号", dataIndex: "invoice_no", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看
          </Button>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              editForm.setFieldsValue({
                ...record,
                planned_invoice_date: fromDateTime(record.planned_invoice_date)
              });
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            disabled={!canApplyInvoice(record.invoice_status)}
            onClick={() => {
              setApplying(record);
              applyForm.setFieldsValue({
                applied_amount: record.applied_amount ?? record.planned_amount,
                applied_at: fromDateTime(record.applied_at) ?? fromDateTime(new Date().toISOString()),
                application_note: record.application_note
              });
            }}
          >
            申请
          </Button>
          <Button
            size="small"
            disabled={record.invoice_status !== "applied"}
            onClick={() => {
              setIssuing(record);
              issueForm.setFieldsValue({
                tax_rate: record.tax_rate,
                actual_invoice_amount: record.applied_amount ?? record.planned_amount,
                invoice_date: fromDateTime(record.invoice_date) ?? fromDateTime(new Date().toISOString())
              });
            }}
          >
            开票
          </Button>
        </Space>
      )
    }
  ];

  const createInvoice = async (values: Record<string, unknown>) => {
    await crmApi.invoices.create({
      invoice_type: "vat_special",
      owner_user_id: currentUser.id,
      ...normalizeInvoiceValues(values, ["planned_invoice_date"])
    });
    setDrawerOpen(false);
    form.resetFields();
    await invoices.refresh();
  };

  const updateInvoice = async (values: Record<string, unknown>) => {
    if (!editing) {
      return;
    }
    await crmApi.invoices.update(editing.id, normalizeInvoiceValues(values, ["planned_invoice_date"]));
    setEditing(null);
    editForm.resetFields();
    await invoices.refresh();
    if (selected?.id === editing.id) {
      await loadInvoiceDetail(editing.id);
    }
  };

  const applyInvoice = async (values: Record<string, unknown>) => {
    if (!applying) {
      return;
    }
    await crmApi.invoices.apply(applying.id, normalizeInvoiceValues(values, ["applied_at"]));
    setApplying(null);
    applyForm.resetFields();
    await invoices.refresh();
    await loadInvoiceDetail(applying.id);
  };

  const issueInvoice = async (values: Record<string, unknown>) => {
    if (!issuing) {
      return;
    }
    await crmApi.invoices.issue(issuing.id, normalizeInvoiceValues(values, ["invoice_date"]));
    setIssuing(null);
    issueForm.resetFields();
    await invoices.refresh();
    await loadInvoiceDetail(issuing.id);
  };

  const signInvoice = async (values: Record<string, unknown>) => {
    if (!signing) {
      return;
    }
    await crmApi.invoices.sign(signing.id, normalizeInvoiceValues(values, ["signed_at"]));
    setSigning(null);
    signForm.resetFields();
    await invoices.refresh();
    await loadInvoiceDetail(signing.id);
  };

  const registerException = async (values: Record<string, unknown>) => {
    if (!exceptioning) {
      return;
    }
    await crmApi.invoices.exception(exceptioning.id, withoutEmpty(values, []));
    setExceptioning(null);
    exceptionForm.resetFields();
    await invoices.refresh();
    await loadInvoiceDetail(exceptioning.id);
  };

  const voidInvoice = async (values: Record<string, unknown>) => {
    if (!voiding) {
      return;
    }
    await crmApi.invoices.void(voiding.id, withoutEmpty(values, []));
    setVoiding(null);
    voidForm.resetFields();
    await invoices.refresh();
    await loadInvoiceDetail(voiding.id);
  };

  const createAttachment = async (values: Record<string, unknown>) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.create({
      object_type: "invoice",
      object_id: selected.id,
      ...withoutEmpty(values, [])
    });
    attachmentForm.resetFields();
    await loadInvoiceDetail(selected.id);
  };

  const deleteAttachment = async (attachmentId: number) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.delete(attachmentId);
    await loadInvoiceDetail(selected.id);
  };

  const attachmentColumns: ColumnsType<Attachment> = [
    { title: "附件名称", dataIndex: "file_name" },
    { title: "类型", dataIndex: "file_type", render: invoiceAttachmentFileTypeText },
    { title: "大小", dataIndex: "file_size", render: fileSizeText },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" href={record.file_url} target="_blank" rel="noreferrer">
            下载
          </Button>
          <Button size="small" danger onClick={() => void deleteAttachment(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <DataWorkspace
      title="开票管理"
      description="承接合同开票条件，管理计划、申请、发票登记、签收、异常和附件。"
      guide="先按合同、客户、状态筛选计划；财务开票前校验合同额度，开票后进入签收与后续回款核销。"
      loading={invoices.loading}
      error={invoices.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建计划</Button>}
      refresh={invoices.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="计划名称/发票号" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={accountOptions} loading={accounts.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="contract_id" label="合同">
          <Select allowClear options={contractOptions} loading={contracts.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="invoice_status" label="状态">
          <Select allowClear options={invoiceStatusOptions()} />
        </Form.Item>
        <Form.Item name="invoice_type" label="类型">
          <Select allowClear options={invoiceTypeOptions()} />
        </Form.Item>
      </FilterBar>

      <Table rowKey="id" dataSource={invoices.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无开票计划" }} />

      <Drawer title="新建开票计划" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createInvoice}>
          <InvoiceFormFields contractOptions={contractOptions} />
          <Button type="primary" htmlType="submit" block>保存计划</Button>
        </Form>
      </Drawer>

      <Drawer title="开票详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        {selected && (
          <>
            <section className="drawer-section">
              <Typography.Title level={3}>开票执行台</Typography.Title>
              <div className="opportunity-summary-grid">
                <OpportunitySummaryItem label="客户" value={accountById.get(selected.account_id)?.account_name ?? `客户 ${selected.account_id}`} />
                <OpportunitySummaryItem label="商机" value={selected.opportunity_id ? opportunityById.get(selected.opportunity_id)?.opportunity_name ?? `商机 ${selected.opportunity_id}` : "-"} />
                <OpportunitySummaryItem label="合同" value={contractById.get(selected.contract_id)?.contract_name ?? `合同 ${selected.contract_id}`} />
                <OpportunitySummaryItem label="状态" value={invoiceStatusText(selected.invoice_status)} />
                <OpportunitySummaryItem label="计划金额" value={moneyText(selected.planned_amount)} />
                <OpportunitySummaryItem label="实际开票" value={moneyText(selected.actual_invoice_amount)} />
                <OpportunitySummaryItem label="合同额度" value={moneyText(selected.contract_amount)} />
                <OpportunitySummaryItem label="剩余额度" value={moneyText(selected.remaining_invoice_amount)} />
              </div>
            </section>
            <section className="drawer-section">
              <Typography.Title level={4}>申请与发票</Typography.Title>
              <RecordDetails
                record={selected as unknown as Record<string, unknown>}
                fields={[
                  ["计划日期", "planned_invoice_date"],
                  ["申请时间", "applied_at"],
                  ["申请备注", "application_note"],
                  ["发票代码", "invoice_code"],
                  ["发票号码", "invoice_no"],
                  ["实际开票日", "invoice_date"],
                  ["税率", "tax_rate"],
                  ["税额", "tax_amount"],
                  ["不含税金额", "net_amount"]
                ]}
              />
              <Space wrap>
                <Button disabled={!canApplyInvoice(selected.invoice_status)} onClick={() => {
                  setApplying(selected);
                  applyForm.setFieldsValue({
                    applied_amount: selected.applied_amount ?? selected.planned_amount,
                    applied_at: fromDateTime(selected.applied_at) ?? fromDateTime(new Date().toISOString()),
                    application_note: selected.application_note
                  });
                }}>
                  提交申请
                </Button>
                <Button disabled={selected.invoice_status !== "applied"} onClick={() => {
                  setIssuing(selected);
                  issueForm.setFieldsValue({
                    tax_rate: selected.tax_rate,
                    actual_invoice_amount: selected.applied_amount ?? selected.planned_amount,
                    invoice_date: fromDateTime(selected.invoice_date) ?? fromDateTime(new Date().toISOString())
                  });
                }}>
                  登记发票
                </Button>
                <Button disabled={selected.invoice_status !== "invoiced"} onClick={() => {
                  setSigning(selected);
                  signForm.setFieldsValue({ signed_at: fromDateTime(selected.signed_at) ?? fromDateTime(new Date().toISOString()) });
                }}>
                  确认签收
                </Button>
                <Button disabled={selected.invoice_status === "voided"} onClick={() => setExceptioning(selected)}>
                  登记异常
                </Button>
                <Button danger disabled={!canVoidInvoice(selected.invoice_status)} onClick={() => setVoiding(selected)}>
                  作废发票
                </Button>
              </Space>
            </section>
            <section className="drawer-section">
              <Typography.Title level={4}>签收与异常</Typography.Title>
              <RecordDetails
                record={selected as unknown as Record<string, unknown>}
                fields={[
                  ["签收时间", "signed_at"],
                  ["签收人", "signed_by_name"],
                  ["签收备注", "sign_note"],
                  ["异常类型", "exception_type"],
                  ["异常原因", "exception_reason"],
                  ["作废原因", "void_reason"]
                ]}
              />
            </section>
            <section className="drawer-section">
              <div className="section-title-row">
                <Typography.Title level={4}>附件</Typography.Title>
                <Button icon={<Paperclip size={16} />} onClick={() => attachmentForm.submit()}>添加附件</Button>
              </div>
              <Table
                rowKey="id"
                size="small"
                loading={detailLoading}
                dataSource={attachments}
                columns={attachmentColumns}
                pagination={false}
                locale={{ emptyText: "暂无附件" }}
              />
              <Form form={attachmentForm} layout="vertical" className="inline-create-form" onFinish={createAttachment}>
                <Form.Item name="file_name" label="附件名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="file_url" label="附件地址" rules={[{ required: true }]}>
                  <Input placeholder="https:// 或 oss:// 地址" />
                </Form.Item>
                <Form.Item name="file_type" label="附件类型">
                  <Select allowClear options={invoiceAttachmentFileTypeOptions()} />
                </Form.Item>
                <Form.Item name="file_size" label="文件大小">
                  <InputNumber min={0} className="full-width" />
                </Form.Item>
              </Form>
            </section>
            <section className="drawer-section">
              <Typography.Title level={4}>后续回款/核销</Typography.Title>
              <p className="muted">当前发票已形成独立对象，后续回款模块将从已开票和已签收状态进入核销。</p>
            </section>
          </>
        )}
      </Drawer>

      <Modal title="编辑开票计划" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateInvoice}>
          <InvoiceFormFields contractOptions={contractOptions} editing />
          <Button type="primary" htmlType="submit" block>保存修改</Button>
        </Form>
      </Modal>

      <Modal title="提交开票申请" open={!!applying} onCancel={() => setApplying(null)} footer={null}>
        <Form form={applyForm} layout="vertical" onFinish={applyInvoice}>
          <Form.Item name="applied_amount" label="申请金额" rules={[{ required: true }]}>
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Form.Item name="applied_at" label="申请时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="application_note" label="申请备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>提交申请</Button>
        </Form>
      </Modal>

      <Modal title="登记发票" open={!!issuing} onCancel={() => setIssuing(null)} footer={null}>
        <Form form={issueForm} layout="vertical" onFinish={issueInvoice}>
          <Form.Item name="invoice_code" label="发票代码">
            <Input />
          </Form.Item>
          <Form.Item name="invoice_no" label="发票号码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="invoice_date" label="实际开票日" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="tax_rate" label="税率">
            <InputNumber min={0} max={1} step={0.01} className="full-width" />
          </Form.Item>
          <Form.Item name="actual_invoice_amount" label="实际开票金额" rules={[{ required: true }]}>
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>登记发票</Button>
        </Form>
      </Modal>

      <Modal title="确认客户签收" open={!!signing} onCancel={() => setSigning(null)} footer={null}>
        <Form form={signForm} layout="vertical" onFinish={signInvoice}>
          <Form.Item name="signed_at" label="签收时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="signed_by_name" label="签收人">
            <Input />
          </Form.Item>
          <Form.Item name="sign_note" label="签收备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>确认签收</Button>
        </Form>
      </Modal>

      <Modal title="登记开票异常" open={!!exceptioning} onCancel={() => setExceptioning(null)} footer={null}>
        <Form form={exceptionForm} layout="vertical" onFinish={registerException}>
          <Form.Item name="exception_type" label="异常类型" rules={[{ required: true }]}>
            <Select options={invoiceExceptionTypeOptions()} />
          </Form.Item>
          <Form.Item name="exception_reason" label="异常原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="exception_resolution" label="处理方案">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存异常</Button>
        </Form>
      </Modal>

      <Modal title="作废发票" open={!!voiding} onCancel={() => setVoiding(null)} footer={null}>
        <Form form={voidForm} layout="vertical" onFinish={voidInvoice}>
          <Form.Item name="void_reason" label="作废原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" danger htmlType="submit" block>确认作废</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function ReceivablesPage({ currentUser }: { currentUser: CurrentUser }) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const receivables = useResource(() => crmApi.receivablePlans.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const contracts = useResource(crmApi.contracts.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ReceivablePlan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [followUps, setFollowUps] = useState<ReceivableFollowUp[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [followUpForm] = Form.useForm();
  const [attachmentForm] = Form.useForm();
  const accountOptions = toAccountOptions(accounts.data);
  const contractOptions = contracts.data.map((contract) => ({ label: contract.contract_name, value: contract.id }));
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);
  const contractById = useMemo(() => new Map(contracts.data.map((contract) => [contract.id, contract])), [contracts.data]);

  const loadReceivableDetail = useCallback(async (planId: number) => {
    setDetailLoading(true);
    try {
      const [nextPlan, nextPayments, nextFollowUps, nextAttachments] = await Promise.all([
        crmApi.receivablePlans.detail(planId),
        crmApi.payments.list({ receivable_plan_id: planId }),
        crmApi.receivablePlans.followUps(planId),
        crmApi.attachments.list({ object_type: "receivable_plan", object_id: planId })
      ]);
      setSelected(nextPlan);
      setPayments(nextPayments);
      setFollowUps(nextFollowUps);
      setAttachments(nextAttachments);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setPayments([]);
      setFollowUps([]);
      setAttachments([]);
      return;
    }
    void loadReceivableDetail(selected.id);
  }, [loadReceivableDetail, selected?.id]);

  const reloadSelectedReceivable = async () => {
    if (!selected) {
      return;
    }
    await receivables.refresh();
    await loadReceivableDetail(selected.id);
  };

  const confirmPayment = async (payment: Payment) => {
    await crmApi.payments.confirm(payment.id, {
      confirmed_amount: payment.received_amount,
      confirmed_at: new Date().toISOString()
    });
    await reloadSelectedReceivable();
  };

  const markPaymentException = async (payment: Payment) => {
    await crmApi.payments.exception(payment.id, {
      exception_type: "manual_review",
      exception_reason: "前端登记异常"
    });
    await reloadSelectedReceivable();
  };

  const refundPayment = async (payment: Payment) => {
    await crmApi.payments.refund(payment.id, {
      refund_reason: "前端标记退款"
    });
    await reloadSelectedReceivable();
  };

  const columns: ColumnsType<ReceivablePlan> = [
    {
      title: "回款计划",
      dataIndex: "plan_name",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {value}
        </Button>
      )
    },
    { title: "客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    { title: "合同", dataIndex: "contract_id", render: (value) => contractById.get(Number(value))?.contract_name ?? `合同 ${value}` },
    { title: "阶段", dataIndex: "plan_stage", render: receivableStageText },
    { title: "状态", dataIndex: "receivable_status", render: receivableStatusTag },
    { title: "计划回款日", dataIndex: "planned_receivable_date", render: dateText },
    { title: "计划金额", dataIndex: "planned_amount", render: moneyText },
    {
      title: "已收/未收",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <span>已收 {currencyText(record.confirmed_received_amount)}</span>
          <span>未收 {currencyText(record.unreceived_amount)}</span>
        </Space>
      )
    },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看
          </Button>
        </Space>
      )
    }
  ];

  const paymentColumns: ColumnsType<Payment> = [
    { title: "到账名称", dataIndex: "payment_name" },
    { title: "状态", dataIndex: "payment_status", render: paymentStatusTag },
    { title: "到账时间", dataIndex: "received_at", render: dateText },
    { title: "到账金额", dataIndex: "received_amount", render: moneyText },
    { title: "确认金额", dataIndex: "confirmed_amount", render: moneyText },
    { title: "未核销", dataIndex: "unreconciled_amount", render: moneyText },
    { title: "付款方", dataIndex: "payer_name", render: textOrDash },
    { title: "流水号", dataIndex: "bank_flow_no", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            disabled={!["registered", "exception"].includes(record.payment_status)}
            onClick={() => void confirmPayment(record)}
          >
            确认到账
          </Button>
          <Button
            size="small"
            disabled={record.payment_status === "refunded"}
            onClick={() => void markPaymentException(record)}
          >
            登记异常
          </Button>
          <Button
            size="small"
            danger
            disabled={record.payment_status === "refunded"}
            onClick={() => void refundPayment(record)}
          >
            标记退款
          </Button>
        </Space>
      )
    }
  ];

  const followUpColumns: ColumnsType<ReceivableFollowUp> = [
    { title: "跟进时间", dataIndex: "follow_up_at", render: dateText },
    { title: "跟进内容", dataIndex: "follow_up_content" },
    { title: "客户反馈", dataIndex: "customer_feedback", render: textOrDash },
    { title: "下一步", dataIndex: "next_action", render: textOrDash }
  ];

  const attachmentColumns: ColumnsType<Attachment> = [
    { title: "附件名称", dataIndex: "file_name" },
    { title: "类型", dataIndex: "file_type", render: receivableAttachmentFileTypeText },
    { title: "大小", dataIndex: "file_size", render: fileSizeText },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" href={record.file_url} target="_blank" rel="noreferrer">
            下载
          </Button>
          <Button size="small" danger onClick={() => void deleteAttachment(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  const createReceivable = async (values: Record<string, unknown>) => {
    await crmApi.receivablePlans.create({
      owner_user_id: currentUser.id,
      ...normalizeInvoiceValues(values, ["planned_receivable_date"])
    });
    setDrawerOpen(false);
    form.resetFields();
    await receivables.refresh();
  };

  const createPayment = async (values: Record<string, unknown>) => {
    if (!selected) {
      return;
    }
    await crmApi.payments.create({
      contract_id: selected.contract_id,
      receivable_plan_id: selected.id,
      owner_user_id: currentUser.id,
      ...normalizeInvoiceValues(values, ["received_at"])
    });
    paymentForm.resetFields();
    await receivables.refresh();
    await loadReceivableDetail(selected.id);
  };

  const createFollowUp = async (values: Record<string, unknown>) => {
    if (!selected) {
      return;
    }
    await crmApi.receivablePlans.createFollowUp(selected.id, normalizeInvoiceValues(values, ["follow_up_at", "next_follow_up_at"]));
    followUpForm.resetFields();
    await loadReceivableDetail(selected.id);
  };

  const createAttachment = async (values: Record<string, unknown>) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.create({
      object_type: "receivable_plan",
      object_id: selected.id,
      ...withoutEmpty(values, [])
    });
    attachmentForm.resetFields();
    await loadReceivableDetail(selected.id);
  };

  const deleteAttachment = async (attachmentId: number) => {
    if (!selected) {
      return;
    }
    await crmApi.attachments.delete(attachmentId);
    await loadReceivableDetail(selected.id);
  };

  return (
    <DataWorkspace
      title="回款管理"
      description="围绕合同付款条件维护回款计划、到账流水、跟进记录和回单附件。"
      guide="先按合同、状态和计划日期定位回款节点；进入详情登记到账、沉淀跟进和附件，为后续核销提供准确金额口径。"
      loading={receivables.loading}
      error={receivables.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建计划</Button>}
      refresh={receivables.refresh}
    >
      <FilterBar
        initialValues={filters}
        onSearch={(values) => setFilters(withoutEmpty(values, []))}
        onReset={() => setFilters({})}
      >
        <Form.Item name="keyword" label="关键词">
          <Input allowClear placeholder="计划名称/付款条件" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={accountOptions} loading={accounts.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="contract_id" label="合同">
          <Select allowClear options={contractOptions} loading={contracts.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="receivable_status" label="状态">
          <Select allowClear options={receivableStatusOptions()} />
        </Form.Item>
      </FilterBar>

      <Table rowKey="id" dataSource={receivables.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无回款计划" }} />

      <Drawer title="新建回款计划" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createReceivable}>
          <ReceivablePlanFormFields contractOptions={contractOptions} />
          <Button type="primary" htmlType="submit" block>保存计划</Button>
        </Form>
      </Drawer>

      <Drawer title="回款详情" open={!!selected} onClose={() => setSelected(null)} size="large">
        {selected && (
          <>
            <section className="drawer-section">
              <Typography.Title level={3}>回款详情</Typography.Title>
              <div className="opportunity-summary-grid">
                <OpportunitySummaryItem label="客户" value={accountById.get(selected.account_id)?.account_name ?? `客户 ${selected.account_id}`} />
                <OpportunitySummaryItem label="合同" value={contractById.get(selected.contract_id)?.contract_name ?? `合同 ${selected.contract_id}`} />
                <OpportunitySummaryItem label="状态" value={receivableStatusText(selected.receivable_status)} />
                <OpportunitySummaryItem label="阶段" value={receivableStageText(selected.plan_stage)} />
                <OpportunitySummaryItem label="合同金额" value={moneyText(selected.contract_amount)} />
                <OpportunitySummaryItem label="计划回款" value={moneyText(selected.planned_amount)} />
                <OpportunitySummaryItem label="已收" value={currencyText(selected.confirmed_received_amount)} />
                <OpportunitySummaryItem label="未收" value={currencyText(selected.unreceived_amount)} />
              </div>
            </section>

            <section className="drawer-section">
              <Typography.Title level={4}>计划信息</Typography.Title>
              <RecordDetails
                record={selected as unknown as Record<string, unknown>}
                fields={[
                  ["计划回款日", "planned_receivable_date"],
                  ["付款条件快照", "payment_terms_snapshot"],
                  ["逾期原因", "overdue_reason"],
                  ["终止原因", "termination_reason"],
                  ["备注", "remark"]
                ]}
              />
            </section>

            <section className="drawer-section">
              <Typography.Title level={4}>合同口径</Typography.Title>
              <div className="opportunity-summary-grid">
                <OpportunitySummaryItem label="合同总额" value={moneyText(selected.contract_amount)} />
                <OpportunitySummaryItem label="已开票" value={moneyText(selected.effective_invoiced_amount)} />
                <OpportunitySummaryItem label="已确认回款" value={currencyText(selected.confirmed_received_amount)} />
                <OpportunitySummaryItem label="未回款" value={currencyText(selected.unreceived_amount)} />
                <OpportunitySummaryItem label="待核销回款" value={currencyText(selected.unreconciled_payment_amount)} />
                <OpportunitySummaryItem label="逾期天数" value={selected.overdue_days == null ? "-" : `${selected.overdue_days} 天`} />
              </div>
            </section>

            <section className="drawer-section">
              <div className="section-title-row">
                <Typography.Title level={4}>到账流水</Typography.Title>
                <Button icon={<Plus size={16} />} onClick={() => paymentForm.submit()}>登记到账</Button>
              </div>
              <Table
                rowKey="id"
                size="small"
                loading={detailLoading}
                dataSource={payments}
                columns={paymentColumns}
                pagination={false}
                locale={{ emptyText: "暂无到账流水" }}
              />
              <Form form={paymentForm} layout="vertical" className="inline-create-form" onFinish={createPayment}>
                <Form.Item name="payment_name" label="到账名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="received_at" label="到账时间" rules={[{ required: true }]}>
                  <Input type="datetime-local" />
                </Form.Item>
                <Form.Item name="received_amount" label="到账金额" rules={[{ required: true }]}>
                  <InputNumber min={0} className="full-width" />
                </Form.Item>
                <Form.Item name="payment_method" label="到账方式" rules={[{ required: true }]}>
                  <Select options={paymentMethodOptions()} />
                </Form.Item>
                <Form.Item name="payer_name" label="付款方">
                  <Input />
                </Form.Item>
                <Form.Item name="bank_flow_no" label="银行流水号">
                  <Input />
                </Form.Item>
              </Form>
            </section>

            <section className="drawer-section">
              <div className="section-title-row">
                <Typography.Title level={4}>跟进记录</Typography.Title>
                <Button onClick={() => followUpForm.submit()}>新增跟进</Button>
              </div>
              <Table
                rowKey="id"
                size="small"
                loading={detailLoading}
                dataSource={followUps}
                columns={followUpColumns}
                pagination={false}
                locale={{ emptyText: "暂无跟进记录" }}
              />
              <Form form={followUpForm} layout="vertical" className="inline-create-form" onFinish={createFollowUp}>
                <Form.Item name="follow_up_at" label="跟进时间">
                  <Input type="datetime-local" />
                </Form.Item>
                <Form.Item name="follow_up_content" label="跟进内容" rules={[{ required: true }]}>
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="customer_feedback" label="客户反馈">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name="next_action" label="下一步">
                  <Input />
                </Form.Item>
              </Form>
            </section>

            <section className="drawer-section">
              <Typography.Title level={4}>后续核销</Typography.Title>
              <p className="muted">已确认且未核销的到账流水将进入模块 6 核销工作台。</p>
            </section>

            <section className="drawer-section">
              <div className="section-title-row">
                <Typography.Title level={4}>附件</Typography.Title>
                <Button icon={<Paperclip size={16} />} onClick={() => attachmentForm.submit()}>添加附件</Button>
              </div>
              <Table
                rowKey="id"
                size="small"
                loading={detailLoading}
                dataSource={attachments}
                columns={attachmentColumns}
                pagination={false}
                locale={{ emptyText: "暂无附件" }}
              />
              <Form form={attachmentForm} layout="vertical" className="inline-create-form" onFinish={createAttachment}>
                <Form.Item name="file_name" label="附件名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="file_url" label="附件地址" rules={[{ required: true }]}>
                  <Input placeholder="https:// 或 oss:// 地址" />
                </Form.Item>
                <Form.Item name="file_type" label="附件类型">
                  <Select allowClear options={receivableAttachmentFileTypeOptions()} />
                </Form.Item>
                <Form.Item name="file_size" label="文件大小">
                  <InputNumber min={0} className="full-width" />
                </Form.Item>
              </Form>
            </section>
          </>
        )}
      </Drawer>
    </DataWorkspace>
  );
}

function ReceivablePlanFormFields({ contractOptions }: { contractOptions: SelectOption[] }) {
  return (
    <>
      <Form.Item name="contract_id" label="关联合同" rules={[{ required: true }]}>
        <Select options={contractOptions} className="full-width" />
      </Form.Item>
      <Form.Item name="plan_name" label="计划名称" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="plan_stage" label="回款阶段">
        <Select allowClear options={receivableStageOptions()} />
      </Form.Item>
      <Form.Item name="planned_receivable_date" label="计划回款日" rules={[{ required: true }]}>
        <Input type="datetime-local" />
      </Form.Item>
      <Form.Item name="planned_amount" label="计划回款金额" rules={[{ required: true }]}>
        <InputNumber min={0} className="full-width" />
      </Form.Item>
      <Form.Item name="payment_terms_snapshot" label="付款条件快照">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="remark" label="备注">
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}

function InvoiceFormFields({ contractOptions, editing = false }: { contractOptions: SelectOption[]; editing?: boolean }) {
  return (
    <>
      <Form.Item name="contract_id" label="关联合同" rules={editing ? [] : [{ required: true }]}>
        <Select options={contractOptions} disabled={editing} className="full-width" />
      </Form.Item>
      <Form.Item name="plan_name" label="计划名称" rules={editing ? [] : [{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="invoice_type" label="开票类型" rules={editing ? [] : [{ required: true }]}>
        <Select options={invoiceTypeOptions()} />
      </Form.Item>
      <Form.Item name="planned_invoice_date" label="计划开票日">
        <Input type="datetime-local" />
      </Form.Item>
      <Form.Item name="planned_amount" label="计划金额" rules={editing ? [] : [{ required: true }]}>
        <InputNumber min={0} className="full-width" />
      </Form.Item>
      <Form.Item name="tax_rate" label="税率">
        <InputNumber min={0} max={1} step={0.01} className="full-width" />
      </Form.Item>
      <Form.Item name="owner_user_id" label="负责人">
        <InputNumber min={1} className="full-width" />
      </Form.Item>
      <Form.Item name="invoice_terms_snapshot" label="开票条件快照">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="remark" label="备注">
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
}

function ContractFormFields({
  accountOptions,
  opportunityOptions,
  editing = false
}: {
  accountOptions: SelectOption[];
  opportunityOptions: SelectOption[];
  editing?: boolean;
}) {
  return (
    <>
      <Form.Item name="account_id" label="客户" rules={editing ? [] : [{ required: true }]}>
        <Select options={accountOptions} disabled={editing} className="full-width" />
      </Form.Item>
      <Form.Item name="opportunity_id" label="来源商机">
        <Select allowClear options={opportunityOptions} disabled={editing} className="full-width" />
      </Form.Item>
      <Form.Item name="contract_name" label="合同名称" rules={editing ? [] : [{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="contract_no" label="合同编号">
        <Input />
      </Form.Item>
      <Form.Item name="contract_type" label="合同类型" rules={editing ? [] : [{ required: true }]}>
        <Select options={contractTypeOptions()} />
      </Form.Item>
      <Form.Item name="contract_status" label="合同状态" rules={editing ? [] : [{ required: true }]}>
        <Select options={contractStatusOptions()} />
      </Form.Item>
      <Form.Item name="contract_amount" label="合同金额" rules={editing ? [] : [{ required: true }]}>
        <InputNumber min={0} className="full-width" />
      </Form.Item>
      <Form.Item name="tax_rate" label="税率">
        <InputNumber min={0} max={1} step={0.01} className="full-width" />
      </Form.Item>
      <Form.Item name="payment_terms" label="付款条件">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="invoice_terms" label="开票条件">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="delivery_scope" label="交付范围">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="acceptance_criteria" label="验收标准">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="risk_level" label="风险等级">
        <Select allowClear options={contractRiskOptions()} />
      </Form.Item>
      <Form.Item name="risk_description" label="风险说明">
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
}

function SolutionDocumentFormFields({
  accountOptions,
  opportunityOptions,
  editing = false
}: {
  accountOptions: SelectOption[];
  opportunityOptions: SelectOption[];
  editing?: boolean;
}) {
  return (
    <>
      {!editing ? (
        <>
          <Form.Item name="account_id" label="所属客户" rules={[{ required: true }]}>
            <Select options={accountOptions} />
          </Form.Item>
          <Form.Item name="opportunity_id" label="关联商机" rules={[{ required: true }]}>
            <Select options={opportunityOptions} />
          </Form.Item>
        </>
      ) : null}
      <Form.Item name="document_name" label="方案名称" rules={[{ required: !editing }]}>
        <Input />
      </Form.Item>
      <Form.Item name="document_type" label="方案类型">
        <Select allowClear options={solutionDocumentTypeOptions()} />
      </Form.Item>
      <Form.Item name="version_no" label="版本号">
        <Input />
      </Form.Item>
      <Form.Item name="status" label="状态">
        <Select allowClear options={solutionStatusOptions()} />
      </Form.Item>
      <Form.Item name="customer_requirement_summary" label="客户需求摘要">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="technical_solution_summary" label="技术方案摘要">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="quotation_amount" label="报价金额">
        <InputNumber min={0} className="full-width" />
      </Form.Item>
      <Form.Item name="cost_amount" label="成本金额">
        <InputNumber min={0} className="full-width" />
      </Form.Item>
      <Form.Item name="estimated_gross_margin_rate" label="预计毛利率">
        <InputNumber min={0} max={1} step={0.01} className="full-width" />
      </Form.Item>
      <Form.Item name="bid_self_check_result" label="投标自检">
        <Select allowClear options={bidSelfCheckOptions()} />
      </Form.Item>
      <Form.Item name="bid_risk_description" label="投标风险说明">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="customer_feedback" label="客户反馈">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="remark" label="备注">
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}

function SolutionDocumentDetail({
  solution,
  account,
  opportunity
}: {
  solution: SolutionDocument | null;
  account?: Account;
  opportunity?: Opportunity;
}) {
  if (!solution) {
    return null;
  }
  return (
    <div className="solution-detail">
      <section className="opportunity-progress-hero">
        <div>
          <Typography.Title level={3}>方案标书详情</Typography.Title>
          <p>{solution.document_name}</p>
        </div>
        {solutionStatusTag(solution.status)}
      </section>
      <div className="opportunity-summary-grid">
        <OpportunitySummaryItem label="客户" value={account?.account_name ?? `客户 ${solution.account_id}`} />
        <OpportunitySummaryItem label="商机" value={opportunity?.opportunity_name ?? `商机 ${solution.opportunity_id}`} />
        <OpportunitySummaryItem label="类型" value={solutionDocumentTypeText(solution.document_type)} />
        <OpportunitySummaryItem label="版本" value={solution.version_no} />
        <OpportunitySummaryItem label="报价" value={moneyText(solution.quotation_amount)} />
        <OpportunitySummaryItem label="毛利率" value={percentText(solution.estimated_gross_margin_rate)} />
      </div>
      <RecordDetails
        record={solution as unknown as Record<string, unknown>}
        fields={[
          ["客户需求摘要", "customer_requirement_summary"],
          ["技术方案摘要", "technical_solution_summary"],
          ["干系人策略", "stakeholder_strategy"],
          ["投标自检", "bid_self_check_result"],
          ["风险说明", "bid_risk_description"],
          ["客户反馈", "customer_feedback"],
          ["作废原因", "void_reason"],
          ["备注", "remark"]
        ]}
      />
    </div>
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
  const accountOptions = toAccountOptions(accounts.data);
  const opportunityOptions = toOpportunityOptions(opportunities.data);
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);
  const opportunityById = useMemo(
    () => new Map(opportunities.data.map((opportunity) => [opportunity.id, opportunity])),
    [opportunities.data]
  );

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
    { title: "所属客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    { title: "关联商机", dataIndex: "opportunity_id", render: (value) => value ? opportunityById.get(Number(value))?.opportunity_name ?? value : "-" },
    { title: "状态", dataIndex: "activity_status", render: activityStatusTag },
    { title: "类型", dataIndex: "activity_type", render: activityTypeText },
    { title: "下次跟进", dataIndex: "next_follow_up_at", render: dateText },
    { title: "风险", dataIndex: "risk_description", render: activityRiskTag },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>
            查看执行
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
      activity_result: values.risk_description ? "risk_found" : "milestone_completed",
      ...withoutEmpty(values, ["risk_types"]),
      risk_types: splitCsv(values.risk_types)
    });
    setCompleting(null);
    completeForm.resetFields();
    await activities.refresh();
  };

  return (
    <DataWorkspace
      title="销售行动"
      description="记录客户经营和商机推进动作，完成后回写最近跟进与周进展。"
      guide="先看计划、逾期和风险行动；进入行动执行入口确认沟通内容、客户反馈、结论和下一步计划。"
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
          <Select allowClear options={accountOptions} loading={accounts.loading} />
        </Form.Item>
        <Form.Item name="opportunity_id" label="商机">
          <Select allowClear options={opportunityOptions} loading={opportunities.loading} />
        </Form.Item>
        <Form.Item name="activity_status" label="状态">
          <Select allowClear options={activityStatusOptions()} />
        </Form.Item>
        <Form.Item name="overdue" label="逾期">
          <Select allowClear options={[{ label: "是", value: true }, { label: "否", value: false }]} />
        </Form.Item>
      </FilterBar>
      <Table rowKey="id" dataSource={activities.data} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: "暂无销售行动" }} />
      <Drawer title="新建行动" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large">
        <Form form={form} layout="vertical" onFinish={createActivity} initialValues={{ owner_department_id: 1 }}>
          <Form.Item name="account_id" label="客户" rules={[{ required: true }]}>
            <Select options={accountOptions} loading={accounts.loading} />
          </Form.Item>
          <Form.Item name="opportunity_id" label="商机">
            <Select allowClear options={opportunityOptions} loading={opportunities.loading} />
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
      <Drawer title="行动执行" open={!!selected} onClose={() => setSelected(null)} size="large">
        <ActivityExecutionDrawer
          activity={selected}
          account={selected ? accountById.get(selected.account_id) : undefined}
          opportunity={selected?.opportunity_id ? opportunityById.get(selected.opportunity_id) : undefined}
        />
      </Drawer>
      <Modal title="编辑行动" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={updateActivity}>
          <Form.Item name="subject" label="行动主题">
            <Input />
          </Form.Item>
          <Form.Item name="activity_status" label="状态">
            <Select allowClear options={activityStatusOptions()} />
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
          <Form.Item name="risk_description" label="风险说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="risk_types" label="风险类型">
            <Input placeholder="多个风险类型用英文逗号分隔" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>完成行动</Button>
        </Form>
      </Modal>
    </DataWorkspace>
  );
}

function ActivityExecutionDrawer({
  activity,
  account,
  opportunity
}: {
  activity: Activity | null;
  account?: Account;
  opportunity?: Opportunity;
}) {
  if (!activity) {
    return null;
  }
  const entries = [
    {
      icon: <Users size={18} />,
      title: "查看客户",
      description: "回到客户经营入口，确认客户状态和最近跟进。",
      to: "/accounts"
    },
    {
      icon: <BriefcaseBusiness size={18} />,
      title: "推进商机",
      description: "回到商机推进入口，确认阶段、风险和下一步计划。",
      to: "/opportunities"
    },
    {
      icon: <BarChart3 size={18} />,
      title: "查看周进展",
      description: "回看该行动是否进入自然周进展汇总。",
      to: "/weekly-progress"
    }
  ];

  return (
    <div className="activity-execution">
      <section className="activity-execution-hero">
        <div>
          <Typography.Title level={3}>行动执行入口</Typography.Title>
          <p>{activity.subject}</p>
        </div>
        {activityStatusTag(activity.activity_status)}
      </section>

      <section>
        <Typography.Title level={4}>执行判断</Typography.Title>
        <div className="activity-summary-grid">
          <ActivitySummaryItem label="所属客户" value={account?.account_name ?? `客户 ${activity.account_id}`} />
          <ActivitySummaryItem label="关联商机" value={opportunity?.opportunity_name ?? textOrDash(activity.opportunity_id)} />
          <ActivitySummaryItem label="行动类型" value={activityTypeText(activity.activity_type)} />
          <ActivitySummaryItem label="行动状态" value={activityStatusText(activity.activity_status)} />
          <ActivitySummaryItem label="行动结果" value={activityResultText(activity.activity_result)} />
          <ActivitySummaryItem label="进入周进展" value={weeklyProgressText(activity.include_in_weekly_progress)} />
          <ActivitySummaryItem label="关联联系人" value={contactCountText(activity.contact_ids)} />
          <ActivitySummaryItem label="风险类型" value={riskTypesText(activity.risk_types)} />
        </div>
      </section>

      <section className="activity-process-panel">
        <div>
          <span>沟通内容</span>
          <strong>{textOrDash(activity.communication_content)}</strong>
        </div>
        <div>
          <span>客户反馈</span>
          <strong>{textOrDash(activity.customer_feedback)}</strong>
        </div>
        <div>
          <span>形成结论</span>
          <strong>{textOrDash(activity.conclusion)}</strong>
        </div>
        <div>
          <span>下一步计划</span>
          <strong>{textOrDash(activity.next_plan)}</strong>
        </div>
        <div>
          <span>风险说明</span>
          <strong>{textOrDash(activity.risk_description)}</strong>
        </div>
      </section>

      <section>
        <Typography.Title level={4}>关联业务入口</Typography.Title>
        <div className="activity-entry-grid">
          {entries.map((entry) => (
            <Link key={entry.to} className="activity-entry-link" to={entry.to} aria-label={entry.title}>
              {entry.icon}
              <strong>{entry.title}</strong>
              <span>{entry.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActivitySummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="activity-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WeeklyProgressPage() {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const progress = useResource(() => crmApi.weeklyProgress.list(filters), [filters]);
  const accounts = useResource(crmApi.accounts.list, []);
  const opportunities = useResource(crmApi.opportunities.list, []);
  const [selected, setSelected] = useState<WeeklyProgress | null>(null);
  const accountOptions = toAccountOptions(accounts.data);
  const opportunityOptions = toOpportunityOptions(opportunities.data);
  const accountById = useMemo(() => new Map(accounts.data.map((account) => [account.id, account])), [accounts.data]);
  const opportunityById = useMemo(
    () => new Map(opportunities.data.map((opportunity) => [opportunity.id, opportunity])),
    [opportunities.data]
  );
  const columns: ColumnsType<WeeklyProgress> = [
    { title: "所属客户", dataIndex: "account_id", render: (value) => accountById.get(Number(value))?.account_name ?? value },
    {
      title: "商机",
      dataIndex: "opportunity_id",
      render: (value, record) => (
        <Button type="link" className="inline-action" onClick={() => setSelected(record)}>
          {opportunityById.get(Number(value))?.opportunity_name ?? value}
        </Button>
      )
    },
    { title: "负责人", dataIndex: "owner_user_id", render: (value) => `用户 ${value}` },
    { title: "自然周", render: (_, record) => weekRangeText(record) },
    { title: "行动数", dataIndex: "activity_count", render: actionCountText },
    { title: "最近行动", dataIndex: "latest_activity_at", render: dateText },
    { title: "风险", render: (_, record) => weeklyRiskTag(record) }
  ];

  return (
    <DataWorkspace
      title="周进展"
      description="按商机、负责人和自然周汇总已完成销售行动。"
      guide="先按自然周、负责人、客户或商机筛选，再进入周进展复盘查看行动结论、下一步和风险。"
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
          <Select allowClear options={opportunityOptions} loading={opportunities.loading} className="filter-select" />
        </Form.Item>
        <Form.Item name="account_id" label="客户">
          <Select allowClear options={accountOptions} loading={accounts.loading} className="filter-select" />
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
        locale={{ emptyText: "暂无周进展" }}
        expandable={{
          expandedRowRender: (row) => (
            <WeeklyProgressItems items={row.progress_items} />
          )
        }}
      />
      <Drawer title="周进展复盘" open={!!selected} onClose={() => setSelected(null)} size="large">
        <WeeklyProgressReviewDrawer
          progress={selected}
          account={selected ? accountById.get(selected.account_id) : undefined}
          opportunity={selected ? opportunityById.get(selected.opportunity_id) : undefined}
        />
      </Drawer>
    </DataWorkspace>
  );
}

function WeeklyProgressReviewDrawer({
  progress,
  account,
  opportunity
}: {
  progress: WeeklyProgress | null;
  account?: Account;
  opportunity?: Opportunity;
}) {
  if (!progress) {
    return null;
  }
  const entries = [
    {
      icon: <Users size={18} />,
      title: "查看客户",
      description: "回到客户经营入口，确认客户状态和最近跟进。",
      to: "/accounts"
    },
    {
      icon: <BriefcaseBusiness size={18} />,
      title: "推进商机",
      description: "回到商机推进入口，确认阶段、风险和下一步计划。",
      to: "/opportunities"
    },
    {
      icon: <CalendarCheck size={18} />,
      title: "查看销售行动",
      description: "查看本周进展来源行动和后续动作。",
      to: "/activities"
    }
  ];

  return (
    <div className="weekly-review">
      <section className="weekly-review-hero">
        <div>
          <Typography.Title level={3}>周进展复盘入口</Typography.Title>
          <p>{opportunity?.opportunity_name ?? `商机 ${progress.opportunity_id}`}</p>
        </div>
        {weeklyRiskTag(progress)}
      </section>

      <section>
        <Typography.Title level={4}>复盘摘要</Typography.Title>
        <div className="weekly-review-summary-grid">
          <WeeklyReviewSummaryItem label="所属客户" value={account?.account_name ?? `客户 ${progress.account_id}`} />
          <WeeklyReviewSummaryItem label="商机" value={opportunity?.opportunity_name ?? `商机 ${progress.opportunity_id}`} />
          <WeeklyReviewSummaryItem label="负责人" value={`用户 ${progress.owner_user_id}`} />
          <WeeklyReviewSummaryItem label="自然周" value={weekRangeText(progress)} />
          <WeeklyReviewSummaryItem label="行动数量" value={actionCountText(progress.activity_count)} />
          <WeeklyReviewSummaryItem label="最近行动" value={dateText(progress.latest_activity_at)} />
        </div>
      </section>

      <section>
        <Typography.Title level={4}>行动明细</Typography.Title>
        <WeeklyProgressItems items={progress.progress_items} />
      </section>

      <section>
        <Typography.Title level={4}>关联业务入口</Typography.Title>
        <div className="weekly-review-entry-grid">
          {entries.map((entry) => (
            <Link key={entry.to} className="weekly-review-entry-link" to={entry.to} aria-label={entry.title}>
              {entry.icon}
              <strong>{entry.title}</strong>
              <span>{entry.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function WeeklyReviewSummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="weekly-review-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WeeklyProgressItems({ items }: { items: WeeklyProgress["progress_items"] }) {
  if (items.length === 0) {
    return <span className="muted">暂无周进展明细</span>;
  }
  return (
    <div className="weekly-review-item-grid">
      {items.map((item) => (
        <article key={item.activity_id} className="weekly-review-item">
          <div>
            <strong>{item.subject}</strong>
            <Tag color={item.risk_description ? "red" : "blue"}>{activityResultText(item.activity_result)}</Tag>
          </div>
          <dl>
            <div>
              <dt>行动时间</dt>
              <dd>{dateText(item.activity_time)}</dd>
            </div>
            <div>
              <dt>形成结论</dt>
              <dd>{textOrDash(item.conclusion)}</dd>
            </div>
            <div>
              <dt>下一步计划</dt>
              <dd>{textOrDash(item.next_plan)}</dd>
            </div>
            <div>
              <dt>风险说明</dt>
              <dd>{textOrDash(item.risk_description)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
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

  const sectionMeta: Record<SystemSection, { title: string; description: string; guide: string }> = {
    overview: {
      title: "系统概览",
      description: "集中查看系统治理入口、基础配置数量和最近审计动态。",
      guide: "先从系统概览判断要维护的对象，再进入组织、用户、角色权限、审计日志或字典管理页面处理具体动作。"
    },
    departments: {
      title: "组织管理",
      description: "维护部门组织、区域归属和启停状态。",
      guide: "先确认组织编码和区域归属，再新建或停用组织；组织是用户归属和数据权限的基础。"
    },
    users: {
      title: "用户管理",
      description: "维护人员账号、角色分配、状态和管理员密码重置。",
      guide: "先确认用户所属组织和角色，再新增、编辑或重置密码；停用用户会影响登录和数据访问。"
    },
    roles: {
      title: "角色权限",
      description: "按角色配置权限点，支撑系统与业务操作授权。",
      guide: "先选择角色，再进入授权弹窗配置权限点；角色权限会影响菜单、按钮和接口访问。"
    },
    auditLogs: {
      title: "审计日志",
      description: "查看系统关键操作记录、Trace 和结果。",
      guide: "用于追溯关键操作的时间、对象、结果和 Trace；优先按异常或变更时间定位记录。"
    },
    dictionaries: {
      title: "字典管理",
      description: "维护客户、商机、行动、风险等 V1 基础选项。",
      guide: "先确认字典类型，再维护字典项；停用项不再作为新建业务数据的推荐选项。"
    }
  };

  const sectionLoading: Record<SystemSection, boolean> = {
    overview: dictionaries.loading || departments.loading || users.loading || roles.loading || auditLogs.loading,
    departments: departments.loading,
    users: users.loading || roles.loading,
    roles: roles.loading || permissions.loading,
    auditLogs: auditLogs.loading,
    dictionaries: dictionaries.loading
  };

  const sectionError: Record<SystemSection, string> = {
    overview: dictionaries.error || departments.error || users.error || roles.error || auditLogs.error,
    departments: departments.error,
    users: users.error || roles.error,
    roles: roles.error || permissions.error,
    auditLogs: auditLogs.error,
    dictionaries: dictionaries.error
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
    auditLogs: auditLogs.refresh,
    dictionaries: dictionaries.refresh
  };

  const sectionAction: Record<SystemSection, React.ReactNode> = {
    overview: null,
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
    auditLogs: null,
    dictionaries: (
      <Button icon={<Plus size={16} />} type="primary" onClick={() => setTypeOpen(true)}>
        新建字典
      </Button>
    )
  };

  return (
    <DataWorkspace
      title={sectionMeta[section].title}
      description={sectionMeta[section].description}
      guide={sectionMeta[section].guide}
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
            <SystemModuleCard title="字典管理" description="基础选项、启停和排序维护" path="/system/dictionaries" value={dictionaries.data.length} />
          </div>
        </>
      ) : null}
      {section === "dictionaries" ? (
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
            locale={{ emptyText: "暂无组织" }}
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
            locale={{ emptyText: "暂无用户" }}
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
            locale={{ emptyText: "暂无角色" }}
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
          locale={{ emptyText: "暂无审计日志" }}
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
  guide,
  loading,
  error,
  action,
  refresh,
  children
}: {
  title: string;
  description: string;
  guide?: string;
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
      {guide ? <PageGuide text={guide} /> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {children}
    </section>
  );
}

function PageGuide({ text }: { text: string }) {
  return (
    <div className="page-guide" aria-label="当前页面怎么用">
      <strong>当前页面怎么用</strong>
      <span>{text}</span>
    </div>
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

function accountTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    enterprise: "企业客户",
    government: "政企客户",
    channel: "渠道客户",
    individual: "个人客户"
  };
  return labels[type] ?? type;
}

function contactTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    decision_maker: "决策人",
    influencer: "影响者",
    user: "使用代表",
    technical: "技术负责人",
    procurement: "采购执行人",
    finance: "财务负责人",
    partner: "合作伙伴",
    user_representative: "使用代表",
    technical_owner: "技术负责人"
  };
  return labels[type] ?? type;
}

function contactRoleText(role?: string) {
  if (!role) {
    return "-";
  }
  const labels: Record<string, string> = {
    decision_maker: "决策人",
    budget_promoter: "预算推动人",
    procurement_executor: "采购执行人",
    user: "使用代表",
    technical: "技术评审人",
    procurement: "采购执行人",
    finance: "财务负责人",
    influencer: "影响者",
    partner: "合作伙伴",
    technical_reviewer: "技术评审人",
    business_owner: "业务负责人",
    未标记角色: "未标记角色"
  };
  return labels[role] ?? role;
}

function contactAttitudeText(attitude?: string) {
  if (!attitude) {
    return "-";
  }
  const labels: Record<string, string> = {
    supporter: "支持者",
    supportive: "支持者",
    neutral: "中立",
    opponent: "反对者",
    negative: "反对者",
    未标记: "未标记"
  };
  return labels[attitude] ?? attitude;
}

function contactHeatText(heat?: string) {
  if (!heat) {
    return "-";
  }
  const labels: Record<string, string> = {
    stranger: "陌生",
    contacted: "已接触",
    cold: "陌生",
    warm: "已接触",
    familiar: "熟悉",
    trusted: "可信赖",
    key: "关键关系",
    hot: "高热度",
    未标记: "未标记"
  };
  return labels[heat] ?? heat;
}

function contactAttitudeTag(attitude?: string) {
  if (!attitude) {
    return "-";
  }
  const color = attitude === "supporter" || attitude === "supportive" ? "green" : attitude === "opponent" || attitude === "negative" ? "red" : "blue";
  return <Tag color={color}>{contactAttitudeText(attitude)}</Tag>;
}

function contactHeatTag(heat?: string) {
  if (!heat) {
    return "-";
  }
  const color = heat === "trusted" || heat === "key" || heat === "hot" ? "green" : heat === "cold" || heat === "stranger" ? "default" : "blue";
  return <Tag color={color}>{contactHeatText(heat)}</Tag>;
}

function opportunityStageOptions() {
  return ["lead", "validation", "proposal", "solution", "negotiation", "contract", "won"].map((value) => ({
    label: opportunityStageText(value),
    value
  }));
}

function opportunityStatusOptions() {
  return ["following", "active", "paused", "won", "lost", "closed", "cancelled"].map((value) => ({
    label: opportunityStatusText(value),
    value
  }));
}

function opportunityRiskOptions() {
  return ["low", "normal", "attention", "risk", "high_risk"].map((value) => ({
    label: opportunityRiskText(value),
    value
  }));
}

function opportunityLevelOptions() {
  return ["A", "B", "C"].map((value) => ({
    label: opportunityLevelText(value),
    value
  }));
}

function opportunityStageText(stage?: string) {
  if (!stage) {
    return "-";
  }
  const labels: Record<string, string> = {
    lead: "商业线索",
    validation: "商业验证",
    proposal: "商业方案",
    solution: "商业方案",
    negotiation: "商业谈判",
    contract: "合同推进",
    won: "商业成交"
  };
  return labels[stage] ?? stage;
}

function opportunityStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    active: "跟进中",
    following: "跟进中",
    paused: "暂停",
    won: "赢单",
    lost: "输单",
    closed: "已关闭",
    cancelled: "已取消"
  };
  return labels[status] ?? status;
}

function opportunityRiskText(risk?: string) {
  if (!risk) {
    return "-";
  }
  const labels: Record<string, string> = {
    low: "低风险",
    normal: "正常",
    attention: "关注",
    risk: "风险",
    high_risk: "高风险"
  };
  return labels[risk] ?? risk;
}

function opportunityLevelText(level?: string) {
  if (!level) {
    return "-";
  }
  const labels: Record<string, string> = {
    A: "A级",
    B: "B级",
    C: "C级"
  };
  return labels[level] ?? level;
}

function opportunityStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color = status === "won" ? "green" : status === "lost" || status === "closed" || status === "cancelled" ? "default" : "blue";
  return <Tag color={color}>{opportunityStatusText(status)}</Tag>;
}

function opportunityRiskTag(risk?: string) {
  if (!risk) {
    return "-";
  }
  const color = risk === "risk" || risk === "high_risk" ? "red" : risk === "attention" ? "gold" : "green";
  return <Tag color={color}>{opportunityRiskText(risk)}</Tag>;
}

function isOpportunityOpen(status?: string) {
  return status === "following" || status === "active";
}

function contractTypeOptions() {
  return ["project", "framework", "procurement", "service", "supplement"].map((value) => ({
    label: contractTypeText(value),
    value
  }));
}

function contractTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    project: "项目合同",
    framework: "框架合同",
    procurement: "采购合同",
    service: "服务合同",
    supplement: "补充协议"
  };
  return labels[type] ?? type;
}

function contractStatusOptions() {
  return ["drafting", "approving", "pending_signature", "performing", "paused", "completed", "terminated"].map((value) => ({
    label: contractStatusText(value),
    value
  }));
}

function contractStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    drafting: "拟定中",
    approving: "审批中",
    pending_signature: "待签署",
    performing: "履约中",
    paused: "暂停",
    completed: "已完成",
    terminated: "已终止"
  };
  return labels[status] ?? status;
}

function contractStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color = status === "performing" ? "green" : status === "terminated" || status === "completed" ? "default" : status === "paused" ? "gold" : "blue";
  return <Tag color={color}>{contractStatusText(status)}</Tag>;
}

function contractRiskOptions() {
  return ["low", "medium", "high"].map((value) => ({
    label: contractRiskText(value),
    value
  }));
}

function contractRiskText(risk?: string) {
  if (!risk) {
    return "-";
  }
  const labels: Record<string, string> = {
    low: "低风险",
    medium: "中风险",
    high: "高风险"
  };
  return labels[risk] ?? risk;
}

function contractRiskTag(risk?: string) {
  if (!risk) {
    return "-";
  }
  const color = risk === "high" ? "red" : risk === "medium" ? "gold" : "green";
  return <Tag color={color}>{contractRiskText(risk)}</Tag>;
}

function invoiceStatusOptions() {
  return ["planned", "applied", "invoiced", "signed", "exception", "voided"].map((value) => ({
    label: invoiceStatusText(value),
    value
  }));
}

function invoiceStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    planned: "计划中",
    applied: "已申请",
    invoiced: "已开票",
    signed: "已签收",
    exception: "异常",
    voided: "已作废"
  };
  return labels[status] ?? status;
}

function invoiceStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color =
    status === "signed" ? "green" : status === "exception" ? "red" : status === "voided" ? "default" : status === "invoiced" ? "purple" : "blue";
  return <Tag color={color}>{invoiceStatusText(status)}</Tag>;
}

function invoiceTypeOptions() {
  return ["vat_special", "vat_normal", "electronic", "other"].map((value) => ({
    label: invoiceTypeText(value),
    value
  }));
}

function invoiceTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    vat_special: "增值税专票",
    vat_normal: "增值税普票",
    electronic: "电子发票",
    other: "其他"
  };
  return labels[type] ?? type;
}

function invoiceExceptionTypeOptions() {
  return ["title_error", "tax_no_error", "amount_error", "rejected", "delivery_lost", "other"].map((value) => ({
    label: invoiceExceptionTypeText(value),
    value
  }));
}

function invoiceExceptionTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    title_error: "抬头错误",
    tax_no_error: "税号错误",
    amount_error: "金额错误",
    rejected: "客户拒收",
    delivery_lost: "寄送异常",
    other: "其他"
  };
  return labels[type] ?? type;
}

function canApplyInvoice(status?: string) {
  return status === "planned" || status === "exception";
}

function canVoidInvoice(status?: string) {
  return status === "invoiced" || status === "exception";
}

function contractChangeTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    amount: "金额",
    scope: "范围",
    payment_terms: "付款条件",
    invoice_terms: "开票条件",
    risk: "风险",
    other: "其他"
  };
  return labels[type] ?? type;
}

function milestoneTypeOptions() {
  return ["kickoff", "delivery", "initial_acceptance", "final_acceptance", "warranty"].map((value) => ({
    label: milestoneTypeText(value),
    value
  }));
}

function milestoneTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    kickoff: "项目启动",
    delivery: "交付",
    initial_acceptance: "初验",
    final_acceptance: "终验",
    warranty: "质保"
  };
  return labels[type] ?? type;
}

function milestoneStatusOptions() {
  return ["pending", "completed", "delayed", "cancelled"].map((value) => ({
    label: milestoneStatusText(value),
    value
  }));
}

function milestoneStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    pending: "待处理",
    completed: "已完成",
    delayed: "延期",
    cancelled: "取消"
  };
  return labels[status] ?? status;
}

function milestoneStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color = status === "completed" ? "green" : status === "delayed" ? "red" : status === "cancelled" ? "default" : "blue";
  return <Tag color={color}>{milestoneStatusText(status)}</Tag>;
}

function solutionDocumentTypeOptions() {
  return ["technical_solution", "bid_document", "quotation", "implementation_plan"].map((value) => ({
    label: solutionDocumentTypeText(value),
    value
  }));
}

function solutionDocumentTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    technical_solution: "技术方案",
    bid_document: "投标文件",
    quotation: "报价单",
    implementation_plan: "实施计划"
  };
  return labels[type] ?? type;
}

function solutionStatusOptions() {
  return ["drafting", "internal_review", "submitted", "feedback", "won", "lost", "voided"].map((value) => ({
    label: solutionStatusText(value),
    value
  }));
}

function solutionStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    drafting: "编制中",
    internal_review: "内部评审",
    submitted: "已提交客户",
    feedback: "客户反馈",
    won: "已中标",
    lost: "未中标",
    voided: "已作废"
  };
  return labels[status] ?? status;
}

function solutionStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color = status === "won" ? "green" : status === "lost" || status === "voided" ? "default" : status === "feedback" ? "gold" : "blue";
  return <Tag color={color}>{solutionStatusText(status)}</Tag>;
}

function bidSelfCheckOptions() {
  return ["pass", "risk", "blocked"].map((value) => ({
    label: bidSelfCheckText(value),
    value
  }));
}

function bidSelfCheckText(result?: string) {
  if (!result) {
    return "-";
  }
  const labels: Record<string, string> = {
    pass: "通过",
    risk: "有风险",
    blocked: "阻塞"
  };
  return labels[result] ?? result;
}

function bidSelfCheckTag(result?: string) {
  if (!result) {
    return "-";
  }
  const color = result === "pass" ? "green" : result === "blocked" ? "red" : "gold";
  return <Tag color={color}>{bidSelfCheckText(result)}</Tag>;
}

function attachmentFileTypeOptions() {
  return ["technical_solution", "bid_document", "quotation", "customer_feedback", "contract_draft"].map((value) => ({
    label: solutionDocumentTypeText(value),
    value
  }));
}

function contractAttachmentFileTypeOptions() {
  return ["contract_draft", "stamped_contract", "supplement", "approval_material", "delivery_material", "acceptance_material"].map((value) => ({
    label: contractAttachmentFileTypeText(value),
    value
  }));
}

function contractAttachmentFileTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    contract_draft: "合同草稿",
    stamped_contract: "盖章版合同",
    supplement: "补充协议",
    approval_material: "审批材料",
    delivery_material: "交付材料",
    acceptance_material: "验收材料"
  };
  return labels[type] ?? type;
}

function invoiceAttachmentFileTypeOptions() {
  return ["invoice_scan", "application_form", "sign_receipt", "void_proof", "other"].map((value) => ({
    label: invoiceAttachmentFileTypeText(value),
    value
  }));
}

function invoiceAttachmentFileTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    invoice_scan: "发票扫描件",
    application_form: "开票申请单",
    sign_receipt: "客户签收凭证",
    void_proof: "作废证明",
    other: "其他"
  };
  return labels[type] ?? type;
}

function receivableStatusOptions() {
  return ["planned", "overdue", "partial_received", "received", "terminated"].map((value) => ({
    label: receivableStatusText(value),
    value
  }));
}

function receivableStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    planned: "计划中",
    overdue: "已逾期",
    partial_received: "部分回款",
    received: "已回款",
    terminated: "已终止"
  };
  return labels[status] ?? status;
}

function receivableStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color =
    status === "received" ? "green" : status === "overdue" ? "red" : status === "terminated" ? "default" : status === "partial_received" ? "gold" : "blue";
  return <Tag color={color}>{receivableStatusText(status)}</Tag>;
}

function receivableStageOptions() {
  return ["首付款", "上线款", "验收款", "质保款", "尾款"].map((value) => ({ label: value, value }));
}

function receivableStageText(stage?: string) {
  return stage || "-";
}

function paymentStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    registered: "已登记",
    confirmed: "已确认",
    partially_reconciled: "部分核销",
    reconciled: "已核销",
    exception: "异常",
    refunded: "已退款"
  };
  return labels[status] ?? status;
}

function paymentStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color = status === "confirmed" || status === "reconciled" ? "green" : status === "exception" ? "red" : status === "refunded" ? "default" : "blue";
  return <Tag color={color}>{paymentStatusText(status)}</Tag>;
}

function paymentMethodOptions() {
  return ["bank_transfer", "cash", "bill", "other"].map((value) => ({
    label: paymentMethodText(value),
    value
  }));
}

function paymentMethodText(method?: string) {
  if (!method) {
    return "-";
  }
  const labels: Record<string, string> = {
    bank_transfer: "银行转账",
    cash: "现金",
    bill: "票据",
    other: "其他"
  };
  return labels[method] ?? method;
}

function receivableAttachmentFileTypeOptions() {
  return ["bank_receipt", "bank_statement", "payment_notice", "customer_confirmation", "other"].map((value) => ({
    label: receivableAttachmentFileTypeText(value),
    value
  }));
}

function receivableAttachmentFileTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    bank_receipt: "银行回单",
    bank_statement: "银行流水",
    payment_notice: "付款通知",
    customer_confirmation: "客户确认",
    other: "其他"
  };
  return labels[type] ?? type;
}

function percentText(value?: number | null) {
  if (value === undefined || value === null) {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function fileSizeText(value?: number | null) {
  if (value === undefined || value === null) {
    return "-";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function activityStatusOptions() {
  return ["planned", "completed", "cancelled"].map((value) => ({
    label: activityStatusText(value),
    value
  }));
}

function activityTypeText(type?: string) {
  if (!type) {
    return "-";
  }
  const labels: Record<string, string> = {
    meeting: "会议沟通",
    customer_visit: "客户拜访",
    phone_call: "电话沟通",
    online_meeting: "线上会议",
    demo: "产品演示",
    follow_up: "跟进沟通",
    internal_sync: "内部协同"
  };
  return labels[type] ?? type;
}

function activityStatusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    planned: "计划中",
    completed: "已完成",
    cancelled: "已取消",
    overdue: "已逾期"
  };
  return labels[status] ?? status;
}

function activityResultText(result?: string) {
  if (!result) {
    return "-";
  }
  const labels: Record<string, string> = {
    pending: "待确认",
    aligned: "已达成共识",
    milestone_completed: "完成阶段动作",
    risk_found: "发现风险",
    no_progress: "暂无进展"
  };
  return labels[result] ?? result;
}

function activityStatusTag(status?: string) {
  if (!status) {
    return "-";
  }
  const color = status === "completed" ? "green" : status === "cancelled" ? "default" : "blue";
  return <Tag color={color}>{activityStatusText(status)}</Tag>;
}

function activityRiskTag(riskDescription?: string | null) {
  return riskDescription ? <Tag color="red">有风险</Tag> : <Tag color="green">无风险</Tag>;
}

function weeklyProgressText(value?: boolean) {
  if (value === undefined) {
    return "-";
  }
  return value ? "是" : "否";
}

function weekRangeText(progress: Pick<WeeklyProgress, "week_start_date" | "week_end_date">) {
  return `${progress.week_start_date} 至 ${progress.week_end_date}`;
}

function actionCountText(count?: number | null) {
  if (count === undefined || count === null) {
    return "-";
  }
  return `${count} 次行动`;
}

function weeklyRiskTag(progress: WeeklyProgress) {
  return progress.progress_items.some((item) => Boolean(item.risk_description)) ? (
    <Tag color="red">存在风险</Tag>
  ) : (
    <Tag color="green">无风险</Tag>
  );
}

function contactCountText(contactIds?: number[]) {
  if (!contactIds?.length) {
    return "未关联";
  }
  return `${contactIds.length} 个联系人`;
}

function riskTypesText(types?: string[]) {
  if (!types?.length) {
    return "-";
  }
  const labels: Record<string, string> = {
    budget: "预算风险",
    data_migration: "数据迁移",
    stakeholder: "干系人风险",
    schedule: "进度风险",
    technical: "技术风险"
  };
  return types.map((type) => labels[type] ?? type).join(" / ");
}

function statusText(status?: string) {
  if (!status) {
    return "-";
  }
  const labels: Record<string, string> = {
    active: "跟进中",
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

function moneyText(value?: number | null) {
  if (value === undefined || value === null) {
    return "-";
  }
  return `${value.toLocaleString("zh-CN")} 元`;
}

function currencyText(value?: number | null) {
  if (value === undefined || value === null) {
    return "-";
  }
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function normalizeInvoiceValues(values: Record<string, unknown>, dateKeys: string[]) {
  const normalized = { ...withoutEmpty(values, []) };
  dateKeys.forEach((key) => {
    if (normalized[key]) {
      normalized[key] = toDateTime(normalized[key]);
    }
  });
  return normalized;
}
