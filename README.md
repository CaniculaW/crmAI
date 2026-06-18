# 项目型大客户 CRM

本目录是项目型大客户 CRM 后续研发代码仓库。

当前阶段：Sprint 0，进行技术栈、工程骨架、接口、数据库和测试验收准备。

## V1 质量门

GitHub Actions 已配置 V1 自动验证工作流：

```text
.github/workflows/v1-validation.yml
```

触发方式：

- push 到 `main`
- 面向 `main` 的 pull request
- 手动 `workflow_dispatch`

覆盖内容：

- 后端：`mvn -B test`
- 后端 PostgreSQL 集成验证：`mvn -B verify -Ppostgres-it`
- 前端：`npm test`
- 前端生产构建：`npm run build`
- 部署配置：`docker compose -f compose.v1-test.yml config`

## V1 测试环境部署

仓库提供 Docker Compose 测试环境：

```text
compose.v1-test.yml
```

复制环境变量并启动：

```bash
cp .env.example .env
docker compose -f compose.v1-test.yml up -d --build
```

默认访问：

```text
http://127.0.0.1:5174/
```

详细说明见 `docs/deployment/v1-test-environment-compose.md`。

## V1 候选版本

当前候选版本记录：

```text
docs/releases/v1.0.0-rc.2.md
```

RC/UAT 就绪审计：

```bash
node scripts/v1-uat-readiness-check.mjs
```

审计器测试：

```bash
node --test scripts/v1-uat-readiness-check.test.mjs
```

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
