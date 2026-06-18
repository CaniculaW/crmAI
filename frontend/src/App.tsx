import {
  Button,
  Card,
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
  Contact,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  type Account,
  type Activity,
  type Contact as CrmContact,
  type CurrentUser,
  type Opportunity,
  type Reminder,
  type WeeklyProgress,
  crmApi,
  currentUser,
  login as loginApi,
  logout as logoutApi
} from "./api/crm";
import { getAuthToken } from "./api/client";
import "./styles.css";

const { Header, Sider, Content } = Layout;

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
};

const navItems: NavItem[] = [
  { key: "/", label: "工作台", icon: <LayoutDashboard size={18} /> },
  { key: "/accounts", label: "客户池", icon: <Users size={18} />, permission: "account.read" },
  { key: "/contacts", label: "联系人", icon: <Contact size={18} />, permission: "contact.read" },
  { key: "/opportunities", label: "商机", icon: <BriefcaseBusiness size={18} />, permission: "opportunity.read" },
  { key: "/activities", label: "销售行动", icon: <CalendarCheck size={18} />, permission: "activity.read" },
  { key: "/weekly-progress", label: "周进展", icon: <BarChart3 size={18} />, permission: "weekly_progress.read" },
  { key: "/system", label: "系统管理", icon: <ShieldCheck size={18} /> }
];

type SelectOption = {
  label: string;
  value: number;
};

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
  const [messageApi, contextHolder] = message.useMessage();

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

  const allowedNav = navItems.filter((item) => !item.permission || user.permissions.includes(item.permission));

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
            <Route path="/system" element={<SystemPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
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
  const resource = useResource(crmApi.accounts.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<Account> = [
    { title: "客户名称", dataIndex: "account_name" },
    { title: "类型", dataIndex: "account_type" },
    { title: "等级", dataIndex: "account_level", render: textOrDash },
    { title: "状态", dataIndex: "account_status", render: statusTag },
    { title: "最近跟进", dataIndex: "last_activity_summary", render: textOrDash }
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

  return (
    <DataWorkspace
      title="客户池"
      description="客户新增、列表查询、最近跟进和客户状态维护入口。"
      loading={resource.loading}
      error={resource.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建客户</Button>}
      refresh={resource.refresh}
    >
      <Table rowKey="id" size="middle" dataSource={resource.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建客户" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={440}>
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
    </DataWorkspace>
  );
}

function ContactsPage({ currentUser }: { currentUser: CurrentUser }) {
  const contacts = useResource(crmApi.contacts.list, []);
  const accounts = useResource(crmApi.accounts.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const accountOptions = toAccountOptions(accounts.data);

  const columns: ColumnsType<CrmContact> = [
    { title: "姓名", dataIndex: "name" },
    { title: "客户ID", dataIndex: "account_id" },
    { title: "职务", dataIndex: "title", render: textOrDash },
    { title: "类型", dataIndex: "contact_type", render: textOrDash },
    { title: "态度", dataIndex: "attitude", render: textOrDash },
    { title: "关系热度", dataIndex: "relationship_heat", render: textOrDash }
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

  return (
    <DataWorkspace
      title="联系人"
      description="维护客户干系人、态度、影响力和项目角色。"
      loading={contacts.loading}
      error={contacts.error}
      action={<Button icon={<Plus size={16} />} type="primary" onClick={() => setDrawerOpen(true)}>新建联系人</Button>}
      refresh={contacts.refresh}
    >
      <Table rowKey="id" dataSource={contacts.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建联系人" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={440}>
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
    </DataWorkspace>
  );
}

function OpportunitiesPage({ currentUser }: { currentUser: CurrentUser }) {
  const opportunities = useResource(crmApi.opportunities.list, []);
  const accounts = useResource(crmApi.accounts.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closing, setClosing] = useState<Opportunity | null>(null);
  const [form] = Form.useForm();
  const [closeForm] = Form.useForm();

  const columns: ColumnsType<Opportunity> = [
    { title: "商机名称", dataIndex: "opportunity_name" },
    { title: "客户ID", dataIndex: "account_id" },
    { title: "阶段", dataIndex: "stage" },
    { title: "状态", dataIndex: "status", render: statusTag },
    { title: "风险", dataIndex: "risk_status", render: statusTag },
    { title: "最近跟进", dataIndex: "last_activity_summary", render: textOrDash },
    {
      title: "操作",
      render: (_, record) => (
        <Button size="small" disabled={record.status !== "following"} onClick={() => setClosing(record)}>
          关闭/取消
        </Button>
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

  const closeOpportunity = async (values: Record<string, unknown>) => {
    if (!closing) {
      return;
    }
    await crmApi.opportunities.close(closing.id, values);
    setClosing(null);
    closeForm.resetFields();
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
      <Table rowKey="id" dataSource={opportunities.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建商机" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={460}>
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
  const activities = useResource(crmApi.activities.list, []);
  const accounts = useResource(crmApi.accounts.list, []);
  const opportunities = useResource(crmApi.opportunities.list, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [completing, setCompleting] = useState<Activity | null>(null);
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  const columns: ColumnsType<Activity> = [
    { title: "行动主题", dataIndex: "subject" },
    { title: "客户ID", dataIndex: "account_id" },
    { title: "商机ID", dataIndex: "opportunity_id", render: textOrDash },
    { title: "状态", dataIndex: "activity_status", render: statusTag },
    { title: "下次跟进", dataIndex: "next_follow_up_at", render: dateText },
    {
      title: "操作",
      render: (_, record) => (
        <Button size="small" disabled={record.activity_status === "completed"} onClick={() => setCompleting(record)}>
          完成
        </Button>
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
      <Table rowKey="id" dataSource={activities.data} columns={columns} pagination={{ pageSize: 8 }} />
      <Drawer title="新建行动" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={480}>
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
  const progress = useResource(crmApi.weeklyProgress.list, []);
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

function SystemPage() {
  const dictionaries = useResource(crmApi.dictionaries.list, []);
  return (
    <DataWorkspace
      title="系统管理"
      description="V1 当前接入字典配置查询，用户、组织、角色权限页面继续沿用后端权限模型推进。"
      loading={dictionaries.loading}
      error={dictionaries.error}
      refresh={dictionaries.refresh}
    >
      <div className="dictionary-grid">
        {dictionaries.data.map((dict) => (
          <Card key={dict.id} size="small" title={`${dict.dict_name} (${dict.dict_code})`}>
            <Space wrap>
              {dict.items.map((item) => (
                <Tag key={item.id} color={item.is_active ? "blue" : "default"}>
                  {item.item_name}
                </Tag>
              ))}
            </Space>
          </Card>
        ))}
      </div>
    </DataWorkspace>
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

function toDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }
  return new Date(value).toISOString();
}

function withoutEmpty(values: Record<string, unknown>, omittedKeys: string[]) {
  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => !omittedKeys.includes(key) && value !== undefined && value !== "")
  );
}
