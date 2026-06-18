# CRM V1 Compose部署态验证证据（2026-06-19）

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 验证环境 | V1-compose-uat-20260619 |
| 候选版本 | v1.0.0-rc.8 |
| 验证提交 | 8e9efba2ea50bfe32304ec488cde72ee5262f86b |
| Compose文件 | `compose.v1-test.yml` |
| 前端地址 | `http://127.0.0.1:5174/` |
| 后端地址 | `http://127.0.0.1:8080/` |
| 数据库端口 | `127.0.0.1:55432` |
| 验证结论 | Compose部署态工程验证通过；仍不替代外部具名测试环境UAT和业务签署 |

## 2. 镜像源覆盖

Docker Hub token接口在当前网络下仍会超时。本次使用 `.env` 支持的镜像源覆盖入口完成构建：

```bash
CRM_POSTGRES_IMAGE=docker.1ms.run/library/postgres:16 \
CRM_BACKEND_BUILD_IMAGE=docker.1ms.run/library/maven:3.9-eclipse-temurin-17 \
CRM_BACKEND_RUNTIME_IMAGE=docker.1ms.run/library/eclipse-temurin:17-jre \
CRM_FRONTEND_BUILD_IMAGE=docker.1ms.run/library/node:22-alpine \
CRM_FRONTEND_RUNTIME_IMAGE=docker.1ms.run/library/nginx:1.27-alpine \
docker compose -f compose.v1-test.yml up -d --build
```

本次构建结果：

- `crm-ai-v1-test-frontend` build passed；`npm ci` 0 vulnerabilities；`npm run build` passed。
- `crm-ai-v1-test-backend` build passed；`mvn -B -DskipTests dependency:go-offline` passed；`mvn -B -DskipTests package` passed。
- `docker compose -f compose.v1-test.yml up -d --build` completed successfully。

## 3. 容器状态

```text
NAME                        IMAGE                                COMMAND                  SERVICE    STATUS                    PORTS
crm-ai-v1-test-backend-1    crm-ai-v1-test-backend               "java -jar /app/app.…"   backend    Up                        0.0.0.0:8080->8080/tcp
crm-ai-v1-test-db-1         docker.1ms.run/library/postgres:16   "docker-entrypoint.s…"   db         Up (healthy)              0.0.0.0:55432->5432/tcp
crm-ai-v1-test-frontend-1   crm-ai-v1-test-frontend              "/docker-entrypoint.…"   frontend   Up                        0.0.0.0:5174->80/tcp
```

## 4. API Smoke

### `/api/health`

```json
{"code":"OK","message":"success","data":{"status":"UP","service":"crm-ai-backend"},"trace_id":"eec27b32-ff63-4108-a2c3-ac4d0297f639"}
```

### `/api/auth/login`

演示账号 `demo_admin` 登录返回：

```json
{"code":"OK","message":"success","data":{"user":{"email":"demo_admin@example.com","roles":[{"code":"v1_demo_admin","name":"V1演示管理员"}]}},"trace_id":"compose-v1-login"}
```

### `/api/bootstrap`

```json
{"code":"OK","message":"success","data":{"permissions_count":25,"v1_counts":{"opportunities":1,"activities":1,"contacts":1,"users":1,"accounts":1,"departments":1,"roles":1}},"trace_id":"compose-v1-bootstrap"}
```

## 5. 前端浏览器Smoke

执行命令：

```bash
CRM_SMOKE_URL=http://127.0.0.1:5174/system \
CRM_SMOKE_SCREENSHOT=/Users/shensiwei/AIJob/codex_presolution/code/docs/testing/evidence/artifacts/v1-rc8-compose-browser-smoke-20260619.png \
npm run smoke:v1:browser
```

执行结果：

```json
{
  "status": "passed",
  "url": "http://127.0.0.1:5174/system",
  "title": "CRM AI",
  "screenshotPath": "/Users/shensiwei/AIJob/codex_presolution/code/docs/testing/evidence/artifacts/v1-rc8-compose-browser-smoke-20260619.png"
}
```

截图归档：

```text
docs/testing/evidence/artifacts/v1-rc8-compose-browser-smoke-20260619.png
```

## 6. 仍需外部完成

- 项目指定具名测试环境域名、账号和测试数据仍需由项目/测试侧确认。
- UAT-001 至 UAT-010 仍需测试/业务侧在正式测试环境执行并补充证据。
- P0/P1缺陷汇总和销售侧、管理侧、产品、测试、研发、项目负责人签署仍未完成。
- 本证据可证明 Compose部署态工程验证通过，但不能作为 `Go` 准出记录。
