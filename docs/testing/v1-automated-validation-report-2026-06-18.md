# CRM V1 自动化验证报告（2026-06-18）

## 1. 验证结论

V1 当前代码分支已通过自动化验证、本地 PostgreSQL 部署态 API 冒烟和浏览器端登录冒烟，可进入具名测试环境部署和业务验收准备。

本报告仅确认代码级、接口级、迁移级、本地部署态和前端交互级自动化验证结果。业务验收签署、试点演示确认和具名测试环境账号仍需由项目/测试/业务侧在正式测试环境中执行。

## 2. 验证范围

| 范围 | 覆盖内容 | 结论 |
|---|---|---|
| 后端单元与接口集成 | 认证、密码、权限、数据权限、客户、联系人、商机、销售行动、周进展、附件、提醒、字典、审计、V1核心闭环 | 通过 |
| PostgreSQL迁移集成 | Flyway 14个迁移脚本在 PostgreSQL 16 容器中完成迁移 | 通过 |
| OpenAPI契约覆盖 | Spring MVC运行时 `/api/**` 操作均已纳入 `docs/openapi/crm-v1-openapi.yaml` | 通过 |
| 前端交互自动化 | 登录、统一响应解包、客户维护、修改密码、字典维护、审计展示、组织新建、用户新增/编辑、角色授权、周进展筛选、联系人关系分组 | 通过 |
| 前端生产构建 | TypeScript 编译与 Vite 生产构建 | 通过 |
| 本地部署态冒烟 | PostgreSQL 16 + Spring Boot + Vite dev proxy，演示管理员登录、`/api/bootstrap`、系统管理页组织/用户/角色展示 | 通过 |

## 3. 执行命令与结果

| 命令 | 结果 |
|---|---|
| `mvn test` | 56 tests passed |
| `mvn verify -Ppostgres-it` | 56 surefire tests passed；1 PostgreSQL integration test passed |
| `mvn -Dtest=IdentityAdminControllerTest test` | 5 tests passed |
| `mvn -Dtest=OpenApiContractCoverageTest test` | 1 test passed |
| `mvn -Dtest=V1DemoDataSeederTest test` | 1 test passed |
| `npm test` | 16 tests passed |
| `npm run build` | Build succeeded；保留 antd vendor chunk 体积提示 |
| `npm run smoke:v1:browser` | `http://127.0.0.1:5175/system` 登录后展示 `V1演示销售部`、`V1演示管理员`、`v1_demo_admin`；console 0 warning/error |
| 本地API Smoke | `POST /api/auth/login` + `GET /api/bootstrap` 返回 200，`permissions_count` 返回当前启用权限总数（本次Smoke观测为25） |

## 4. 已验证的V1核心链路

| 验证点 | 自动化证据 |
|---|---|
| 登录与会话恢复 | `AuthControllerTest`、`frontend/src/App.test.tsx` |
| 修改密码与管理员重置密码 | `PasswordManagementControllerTest`、`frontend/src/App.test.tsx` |
| 组织、用户、角色权限维护 | `IdentityAdminControllerTest`、`frontend/src/App.test.tsx` |
| 操作权限与数据权限 | `IdentityAdminControllerTest`、`DataPermissionServiceTest` |
| 客户、联系人、商机、销售行动核心闭环 | `V1WorkflowIntegrationTest` |
| 商机关闭/重启规则 | `OpportunityControllerTest` |
| 行动完成回写与周进展汇总 | `ActivityControllerTest`、`V1WorkflowIntegrationTest` |
| 审计日志查询与关键操作审计 | `AuditLogControllerTest`、`frontend/src/App.test.tsx` |
| PostgreSQL迁移可用性 | `PostgresMigrationIT` |
| 演示管理员种子和部署态探针 | `V1DemoDataSeederTest`、`GET /api/bootstrap`、浏览器Smoke |

逐项验收证据见 `docs/testing/crm-v1-validation-traceability.md`。

## 5. 待外部完成项

| 项目 | 原因 | 建议动作 |
|---|---|---|
| 具名测试环境部署态验收 | 本地部署态已通过；测试环境域名、账号和样例业务数据仍需由项目/测试侧确认 | 按 `crm.seed.v1-demo.enabled=true` 或测试侧账号策略准备账号后执行浏览器全链路验收 |
| 业务验收签署 | 销售侧和管理侧验收人尚未在文档中具名 | 项目侧指定验收人并形成会议纪要 |
| V1范围冻结确认 | 产品/业务侧仍需确认最终试点范围和TBD项 | 在验收会中确认范围、字典、风险映射和审计抽样标准 |
