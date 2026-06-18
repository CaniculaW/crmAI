# 项目型大客户 CRM

本目录是项目型大客户 CRM 后续研发代码仓库。

当前阶段：Sprint 0，进行技术栈、工程骨架、接口、数据库和测试验收准备。

## 后端

后端工程位于 `backend/`，当前采用 Java 17 + Spring Boot + Maven。

运行测试：

```bash
cd backend
mvn test
```

当前已提供健康检查接口：

```text
GET /api/health
```

## 前端

前端工程位于 `frontend/`，当前采用 React + TypeScript + Vite + Ant Design。

运行测试：

```bash
cd frontend
npm test
```

生产构建：

```bash
cd frontend
npm run build
```

V1 本地浏览器冒烟（需先启动后端和 Vite，并启用 V1 demo seed）：

```bash
cd frontend
npm run smoke:v1:browser
```

本地启动：

```bash
cd frontend
npm run dev
```
