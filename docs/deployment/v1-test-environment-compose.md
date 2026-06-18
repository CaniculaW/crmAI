# CRM V1测试环境Compose部署手册

本文用于在测试机或本地以容器方式拉起 V1 验收环境，覆盖 PostgreSQL、Spring Boot 后端、Nginx 托管的前端生产包。

## 1. 前置条件

- Docker Engine 或 Docker Desktop 可用。
- `code` 仓库已拉取到测试机。
- 8080、5174、55432 端口未被占用；如被占用，可在 `.env` 中调整。

## 2. 环境变量

复制默认配置：

```bash
cp .env.example .env
```

测试环境默认启用 V1 演示管理员种子：

```text
CRM_SEED_V1_DEMO_ENABLED=true
```

默认演示账号：

```text
username: demo_admin
password: S3cure!123
```

正式试点或生产环境不得启用演示种子，应将 `CRM_SEED_V1_DEMO_ENABLED` 改为 `false`，并由管理员在系统管理中创建真实账号。

## 3. 镜像源配置

若测试机出现 Docker Hub token 超时、访问 Docker Hub token 接口超时，或企业网络要求使用内网镜像仓库，可在 `.env` 中覆盖基础镜像。默认值如下：

```text
CRM_POSTGRES_IMAGE=postgres:16
CRM_BACKEND_BUILD_IMAGE=maven:3.9-eclipse-temurin-17
CRM_BACKEND_RUNTIME_IMAGE=eclipse-temurin:17-jre
CRM_FRONTEND_BUILD_IMAGE=node:22-alpine
CRM_FRONTEND_RUNTIME_IMAGE=nginx:1.27-alpine
```

使用企业镜像代理时示例：

```text
CRM_POSTGRES_IMAGE=registry.example.com/library/postgres:16
CRM_BACKEND_BUILD_IMAGE=registry.example.com/library/maven:3.9-eclipse-temurin-17
CRM_BACKEND_RUNTIME_IMAGE=registry.example.com/library/eclipse-temurin:17-jre
CRM_FRONTEND_BUILD_IMAGE=registry.example.com/library/node:22-alpine
CRM_FRONTEND_RUNTIME_IMAGE=registry.example.com/library/nginx:1.27-alpine
```

覆盖后继续使用同一条启动命令。该配置只改变镜像来源，不改变应用运行参数。

## 4. 启动

```bash
docker compose -f compose.v1-test.yml up -d --build
```

访问地址：

```text
http://127.0.0.1:5174/
```

后端健康检查：

```text
http://127.0.0.1:8080/api/health
```

## 5. 验证

后端容器启动时会执行 Flyway 迁移。测试环境验证建议按以下顺序执行：

```bash
curl http://127.0.0.1:8080/api/health
```

使用浏览器打开 `http://127.0.0.1:5174/`，以 `demo_admin` 登录，确认系统管理、客户、联系人、商机、销售行动和周进展菜单可访问。

如需复跑本地浏览器冒烟：

```bash
cd frontend
npm run smoke:v1:browser
```

## 6. 停止与清理

停止容器但保留数据库数据：

```bash
docker compose -f compose.v1-test.yml down
```

清理测试数据库卷：

```bash
docker compose -f compose.v1-test.yml down -v
```

## 7. 纳入V1验收证据

执行具名测试环境验收时，应在 UAT 证据包中记录：

- Git commit SHA。
- `docker compose -f compose.v1-test.yml ps` 输出。
- `/api/health` 返回结果。
- 登录截图、核心链路截图和缺陷记录。
