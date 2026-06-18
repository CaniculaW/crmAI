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
- UAT 准出材料：RC/UAT readiness、UAT 证据包生成器和 UAT 证据包 Go/No-Go validator 测试
- 最终放行门禁：`v1-release-gate` 规则测试

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

若测试机访问 Docker Hub token 接口超时，可通过环境变量覆盖基础镜像来源。本地已验证的镜像代理示例：

```bash
CRM_POSTGRES_IMAGE=docker.1ms.run/library/postgres:16 \
CRM_BACKEND_BUILD_IMAGE=docker.1ms.run/library/maven:3.9-eclipse-temurin-17 \
CRM_BACKEND_RUNTIME_IMAGE=docker.1ms.run/library/eclipse-temurin:17-jre \
CRM_FRONTEND_BUILD_IMAGE=docker.1ms.run/library/node:22-alpine \
CRM_FRONTEND_RUNTIME_IMAGE=docker.1ms.run/library/nginx:1.27-alpine \
docker compose -f compose.v1-test.yml up -d --build
```

默认访问：

```text
http://127.0.0.1:5174/
```

详细说明见 `docs/deployment/v1-test-environment-compose.md`。
Compose部署态验证证据见 `docs/testing/evidence/v1-compose-uat-2026-06-19.md`。

## V1 候选版本

当前候选版本记录：

```text
docs/releases/v1.0.0-rc.8.md
```

RC/UAT 就绪审计：

```bash
node scripts/v1-uat-readiness-check.mjs
```

审计器测试：

```bash
node --test scripts/v1-uat-readiness-check.test.mjs
```

部署配置检查：

```bash
node scripts/v1-deployment-config-check.mjs
```

UAT 证据包草稿生成：

```bash
node scripts/v1-uat-evidence-pack.mjs \
  --environment <test-env-name> \
  --frontend-url <test-frontend-url> \
  --backend-url <test-backend-url> \
  --git-commit <git-sha> \
  --rc <release-candidate> \
  --username <masked-admin-user>
```

UAT 证据包填写后校验：

```bash
node scripts/v1-uat-evidence-pack-validate.mjs <crm-v1-uat-evidence-pack.md>
```

UAT 执行派工与证据追踪：

```text
docs/testing/crm-v1-uat-execution-tracker.md
```

UAT 执行追踪表校验：

```bash
node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md
```

V1 最终放行门禁：

```bash
node scripts/v1-release-gate.mjs . <crm-v1-uat-evidence-pack.md> docs/testing/crm-v1-uat-execution-tracker.md
```

V1 聚合状态报告：

```bash
node scripts/v1-validation-status.mjs --output docs/testing/v1-validation-status.md
```

当前 rc.8 草稿和 UAT 执行追踪表仍是 `No-Go`，因此最终放行门禁会失败；待具名测试环境 UAT、缺陷闭环、追踪表和签署完成并形成 `Go` 证据包后，该命令才应通过。

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
