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
- UAT 准出材料：RC/UAT readiness、启动治理 validator、UAT 启动输入 validator、UAT 证据包生成器、UAT 证据包 Go/No-Go validator、UAT 缺陷台账 validator、UAT 证据清单 validator、证据引用保全检查、UAT 签署台账 validator、外部UAT请求包、release gate JSON 快照、release gate JSON schema 校验、验收清单一致性检查、UAT覆盖检查、验证追踪矩阵一致性检查、阻塞项一致性检查、外部UAT请求覆盖检查、最终交接证据一致性检查、证据秘密扫描、生成文档一致性检查和计划状态一致性检查测试
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

UAT 启动输入：

```text
docs/testing/v1-uat-launch-intake.md
```

UAT 启动输入校验：

```bash
node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md
```

`UAT窗口` 必须使用 `YYYY-MM-DD HH:mm 至 YYYY-MM-DD HH:mm`，结束时间晚于开始时间。
已确认 UAT 参与人必须填写具体姓名，不能用“销售侧验收人”“产品负责人”等角色标签替代。
已准备账号保管 Owner 必须填写具体姓名，不能用“测试负责人”等角色标签替代。
前端访问地址和后端 API 地址必须为 `http(s)` URL，Git 提交号必须为40位提交 SHA。

启动治理纪要：

```text
docs/meeting-notes/crm-kickoff-minutes.md
```

启动治理校验：

```bash
node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md
```

已确认启动治理负责人和业务验收人必须填写具体姓名，不能用“产品负责人”“业务验收人-销售侧”等角色标签替代。
启动治理中的上线周期正式确认后必须使用 `YYYY-MM-DD 至 YYYY-MM-DD`，结束日期晚于开始日期。

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

UAT 具名测试环境证据：

```text
docs/testing/v1-uat-environment-evidence.md
```

UAT 具名测试环境证据校验：

```bash
node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md
```

前端访问地址和后端 API 地址必须为 `http(s)` URL，Git 提交号必须为40位提交 SHA。
PASS 环境检查 Owner 必须填写具体姓名，不能用“测试负责人”“研发/运维”等角色标签替代。

UAT 证据包填写后校验：

```bash
node scripts/v1-uat-evidence-pack-validate.mjs <crm-v1-uat-evidence-pack.md>
```

通过项证据需引用 `docs/` 下已存在且非空的留存文件或外部 `http(s)` 系统链接，不能只填写游离文件名、文本说明或不存在的 `docs/` 路径。验收日期和已同意签署日期必须为 `YYYY-MM-DD`，前端访问地址和后端 API 地址必须为 `http(s)` URL，Git 提交号必须为40位提交 SHA；候选版本、前端版本/构建号、后端版本/构建号和数据库版本必须填写具体可追溯值。基本信息责任人、已通过 UAT 用例验收人和已同意签署人必须填写具体姓名，不得缺失、留空或用“测试负责人”“销售侧验收人”“Owner”等角色标签替代。证据包不得包含明文密码、Bearer token、API key 或等价敏感材料。

UAT 缺陷台账：

```text
docs/testing/v1-uat-defect-register.md
```

UAT 缺陷台账校验：

```bash
node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md
```

P0/P1 缺陷来源用例必须引用 `PRE-001`、`SMK-001` 或 `UAT-001` 这类可追溯编号；P0/P1 缺陷 Owner 必须填写具体姓名，不能用“研发负责人”“测试负责人”等角色标签替代；已关闭 P0/P1 回归证据必须引用 `docs/` 下留存文件或外部 `http(s)` 系统链接。

UAT 证据清单：

```text
docs/testing/v1-uat-evidence-manifest.md
```

UAT 证据清单校验：

```bash
node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md
```

证据清单中每个 `PASS` 行必须填写具体 Owner 姓名，不能用“测试负责人”“销售侧验收人”或 `QA Owner` 等角色标签替代；证据引用必须指向 `docs/` 下已归档工件或外部 `http(s)` URL。

UAT 证据引用保全检查：

```bash
node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md
```

UAT 执行派工与证据追踪：

```text
docs/testing/crm-v1-uat-execution-tracker.md
```

UAT 执行追踪表校验：

```bash
node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md
```

已签署角色负责人和已通过 UAT 用例验收人必须填写具体姓名，不能用“销售侧验收人”“测试负责人”等角色标签替代；已通过的 PRE、SMK、UAT 和 P0/P1 缺陷证据需引用 `docs/` 下留存文件或外部 `http(s)` 系统链接。

UAT 签署台账：

```text
docs/testing/v1-uat-signoff-register.md
```

UAT 签署台账校验：

```bash
node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md
```

已批准签署必须填写具体签署人姓名，不能用“销售侧验收人”“产品负责人”等角色标签替代；签署日期必须为 `YYYY-MM-DD`，证据引用必须指向 `docs/` 下留存工件或外部 `http(s)` URL。

V1 最终放行门禁：

```bash
node scripts/v1-release-gate.mjs . \
  <crm-v1-uat-evidence-pack.md> \
  docs/testing/crm-v1-uat-execution-tracker.md \
  docs/testing/v1-uat-evidence-manifest.md \
  docs/testing/v1-uat-defect-register.md \
  docs/testing/v1-uat-environment-evidence.md \
  docs/testing/v1-uat-signoff-register.md \
  docs/testing/v1-uat-launch-intake.md \
  docs/meeting-notes/crm-kickoff-minutes.md
```

V1 聚合状态报告：

```bash
node scripts/v1-validation-status.mjs \
  --git-commit <git-sha> \
  --output docs/testing/v1-validation-status.md
```

V1 UAT行动计划：

```bash
node scripts/v1-uat-action-plan.mjs --output docs/testing/v1-uat-action-plan.md
```

V1 UAT逐项执行包：

```bash
node scripts/v1-uat-execution-pack.mjs --output docs/testing/v1-uat-execution-pack.md
```

V1 Go/No-Go会议包：

```bash
node scripts/v1-go-no-go-meeting.mjs --output docs/testing/v1-go-no-go-meeting.md
```

V1 外部UAT请求包：

```bash
node scripts/v1-external-uat-request.mjs --output docs/testing/v1-external-uat-request.md
```

V1 生成文档一致性检查：

```bash
node scripts/v1-generated-docs-check.mjs
```

V1 最终放行门禁 JSON 快照校验：

```bash
node scripts/v1-release-gate-status-check.mjs
```

V1 计划状态一致性检查：

```bash
node scripts/v1-plan-status-check.mjs
```

V1 验收清单一致性检查：

```bash
node scripts/v1-acceptance-checklist-check.mjs
```

V1 UAT覆盖检查：

```bash
node scripts/v1-uat-coverage-check.mjs
```

V1 验证追踪矩阵一致性检查：

```bash
node scripts/v1-traceability-check.mjs
```

V1 阻塞项一致性检查：

```bash
node scripts/v1-blocker-consistency-check.mjs
```

V1 外部UAT请求覆盖检查：

```bash
node scripts/v1-external-uat-request-coverage-check.mjs
```

V1 最终交接证据一致性检查：

```bash
node scripts/v1-final-evidence-handoff-check.mjs
```

V1 当前证据秘密扫描：

```bash
node scripts/v1-secret-scan-check.mjs
```

当前启动治理纪要、rc.8 草稿、UAT 执行追踪表、UAT 签署台账和 UAT 逐项执行包仍是 `No-Go`，因此最终放行门禁会失败；待启动负责人和范围冻结、具名测试环境 UAT、缺陷闭环、追踪表、签署台账和签署完成并形成 `Go` 证据包后，该命令才应通过。

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
