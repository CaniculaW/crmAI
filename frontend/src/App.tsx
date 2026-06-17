import { Button, Layout, Menu, Typography, message } from "antd";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  Contact,
  LayoutDashboard,
  ShieldCheck,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { requestJson } from "./api/client";
import "./styles.css";

const { Header, Sider, Content } = Layout;

const AUTH_STORAGE_KEY = "crm.authenticated";

const navItems = [
  { key: "/", label: "工作台", icon: <LayoutDashboard size={18} /> },
  { key: "/accounts", label: "客户池", icon: <Users size={18} /> },
  { key: "/contacts", label: "联系人", icon: <Contact size={18} /> },
  { key: "/opportunities", label: "商机", icon: <BriefcaseBusiness size={18} /> },
  { key: "/activities", label: "销售行动", icon: <CalendarCheck size={18} /> },
  { key: "/weekly-progress", label: "周进展", icon: <BarChart3 size={18} /> },
  { key: "/system", label: "系统管理", icon: <ShieldCheck size={18} /> }
];

type HealthResponse = {
  status: string;
  service: string;
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
  const [authenticated, setAuthenticated] = useState(false);
  const [healthStatus, setHealthStatus] = useState("未检查");
  const [apiError, setApiError] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    setAuthenticated(localStorage.getItem(AUTH_STORAGE_KEY) === "true");
  }, []);

  const login = () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setAuthenticated(true);
    messageApi.success("登录态已保存");
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthenticated(false);
    messageApi.info("已退出");
  };

  const checkBackend = async () => {
    setApiError("");
    try {
      const health = await requestJson<HealthResponse>("/api/health");
      setHealthStatus(`${health.service}: ${health.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      setApiError(message);
      setHealthStatus("检查失败");
    }
  };

  return (
    <Layout className="app-shell">
      {contextHolder}
      <Sider width={232} className="app-sidebar">
        <div className="brand-block">
          <div className="brand-mark">C</div>
          <div>
            <Typography.Title level={1}>项目型大客户 CRM</Typography.Title>
            <span>{authenticated ? "已登录" : "未登录"}</span>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems.map((item) => ({
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
            <Button aria-label="检查后端" onClick={checkBackend}>
              检查后端
            </Button>
            {authenticated ? (
              <Button aria-label="退出" onClick={logout}>
                退出
              </Button>
            ) : (
              <Button aria-label="模拟登录" type="primary" onClick={login}>
                模拟登录
              </Button>
            )}
          </div>
        </Header>
        <Content className="app-content">
          <Routes>
            <Route index element={<Dashboard healthStatus={healthStatus} apiError={apiError} />} />
            <Route path="/accounts" element={<ModulePlaceholder title="客户池" />} />
            <Route path="/contacts" element={<ModulePlaceholder title="联系人" />} />
            <Route path="/opportunities" element={<ModulePlaceholder title="商机" />} />
            <Route path="/activities" element={<ModulePlaceholder title="销售行动" />} />
            <Route path="/weekly-progress" element={<ModulePlaceholder title="周进展" />} />
            <Route path="/system" element={<ModulePlaceholder title="系统管理" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function Dashboard({ healthStatus, apiError }: { healthStatus: string; apiError: string }) {
  return (
    <section className="workspace">
      <div className="workspace-header">
        <div>
          <Typography.Title level={2}>工作台</Typography.Title>
          <p>聚合我的待办、我的商机、今日行动和本周行动。</p>
        </div>
        <span className="health-chip">{healthStatus}</span>
      </div>
      {apiError ? <div className="error-banner">{apiError}</div> : null}
      <div className="summary-grid">
        {["我的待办", "我的商机", "今日行动", "本周行动"].map((title, index) => (
          <article key={title} className="summary-panel">
            <span>{title}</span>
            <strong>{index === 0 ? 0 : "--"}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModulePlaceholder({ title }: { title: string }) {
  return (
    <section className="workspace">
      <Typography.Title level={2}>{title}</Typography.Title>
      <p>工程骨架已就绪，后续 Sprint 将接入列表、表单、详情页和权限控制。</p>
    </section>
  );
}
