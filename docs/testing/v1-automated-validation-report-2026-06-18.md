# CRM V1 自动化验证报告（2026-06-18）

## 1. 验证结论

V1 当前代码分支已通过自动化验证、本地 PostgreSQL 部署态 API 冒烟、浏览器端登录冒烟和 Docker Compose 部署态工程验证，可进入具名测试环境业务验收准备。

本报告仅确认代码级、接口级、迁移级、本地部署态、Compose部署态和前端交互级自动化验证结果。业务验收签署、试点演示确认和具名测试环境账号仍需由项目/测试/业务侧在正式测试环境中执行。

具名测试环境执行步骤、证据包结构和验收会议模板见 `docs/testing/crm-v1-test-environment-validation-runbook.md`；验收结果汇总和 Go/No-Go 记录模板见 `docs/testing/crm-v1-uat-evidence-pack-template.md`。

GitHub Actions 质量门见 `.github/workflows/v1-validation.yml`，覆盖Compose部署配置校验、RC/UAT readiness 审计、UAT 启动输入 validator、UAT 证据包生成器、UAT 证据包 Go/No-Go validator、UAT具名环境证据 validator、UAT缺陷台账 validator、UAT签署台账 validator、UAT执行追踪表 validator、V1最终放行门禁规则、V1聚合状态报告规则、V1 UAT行动计划规则、V1 UAT逐项执行包规则、V1 Go/No-Go会议包规则、后端测试、PostgreSQL 集成验证、前端测试和前端生产构建。readiness 审计同时校验 rc.8 UAT 交接草稿保留 `No-Go`、validator `FAIL`、Compose部署态证据、UAT启动输入、UAT执行派工追踪表、UAT具名环境证据、UAT逐项执行包、UAT缺陷台账、UAT签署台账、聚合状态报告、UAT行动计划、Go/No-Go会议包和外部 UAT/签署阻塞项。

## 2. 验证范围

| 范围 | 覆盖内容 | 结论 |
|---|---|---|
| 后端单元与接口集成 | 认证、密码、权限、数据权限、客户、联系人、商机、销售行动、周进展、附件、提醒、字典、审计、V1核心闭环 | 通过 |
| PostgreSQL迁移集成 | Flyway 14个迁移脚本在 PostgreSQL 16 容器中完成迁移 | 通过 |
| OpenAPI契约覆盖 | Spring MVC运行时 `/api/**` 操作均已纳入 `docs/openapi/crm-v1-openapi.yaml` | 通过 |
| 前端交互自动化 | 登录、统一响应解包、客户维护、修改密码、字典维护、审计展示、组织新建、用户新增/编辑、角色授权、周进展筛选、联系人关系分组 | 通过 |
| 前端生产构建 | TypeScript 编译与 Vite 生产构建 | 通过 |
| 测试环境部署配置 | Docker Compose 配置可展开，覆盖 PostgreSQL、后端和前端生产包服务；支持企业镜像代理或内网镜像仓库覆盖基础镜像 | 通过 |
| Compose部署态工程验证 | 使用镜像源覆盖完成 `compose.v1-test.yml` 后端/前端镜像构建、容器启动、API Smoke 和浏览器 Smoke | 通过 |
| RC/UAT就绪审计 | 候选版本记录、自动化验证报告、验收清单、追踪矩阵、Runbook、UAT证据模板、证据包 validator、Compose部署态证据、Compose部署入口和CI质量门齐备性检查 | 通过 |
| UAT证据包准出校验 | 已提供 `scripts/v1-uat-evidence-pack-validate.mjs`，校验 Go/No-Go、P0/P1缺陷、UAT用例、自动化结果和签署记录一致性 | 通过 |
| UAT具名环境证据准出校验 | 已提供 `scripts/v1-uat-environment-validate.mjs` 和 `docs/testing/v1-uat-environment-evidence.md`，校验测试环境元数据、Smoke、账号、权限样本、责任人和敏感材料 | 通过 |
| UAT缺陷台账准出校验 | 已提供 `scripts/v1-uat-defect-register-validate.mjs` 和 `docs/testing/v1-uat-defect-register.md`，校验 P0/P1 汇总、关闭状态、回归证据、敏感材料和 Go/No-Go 结论一致性 | 通过 |
| UAT签署台账准出校验 | 已提供 `scripts/v1-uat-signoff-register-validate.mjs` 和 `docs/testing/v1-uat-signoff-register.md`，校验六方签署、签署日期、证据引用、敏感材料和项目 `Go` 结论一致性 | 通过 |
| UAT启动输入准出校验 | 已提供 `scripts/v1-uat-launch-intake-validate.mjs` 和 `docs/testing/v1-uat-launch-intake.md`，校验具名环境、UAT窗口、证据归档位置、参与人、账号保管和敏感材料 | 通过 |
| 本地部署态冒烟 | PostgreSQL 16 + Spring Boot + Vite dev proxy，演示管理员登录、`/api/bootstrap`、系统管理页组织/用户/角色展示 | 通过 |

## 3. 执行命令与结果

| 命令 | 结果 |
|---|---|
| `mvn test` | 56 tests passed |
| `mvn verify -Ppostgres-it` | 56 surefire tests passed；1 PostgreSQL integration test passed |
| `mvn -Dtest=IdentityAdminControllerTest test` | 5 tests passed |
| `mvn -Dtest=OpenApiContractCoverageTest test` | 1 test passed |
| `mvn -Dtest=V1DemoDataSeederTest test` | 5 tests passed；演示管理员、权限、V1演示业务数据、seed幂等性和周进展聚合探针通过 |
| `npm test` | 16 tests passed |
| `npm run build` | Build succeeded；保留 antd vendor chunk 体积提示 |
| `docker compose -f compose.v1-test.yml config` | Compose config validation passed |
| `docker compose -f compose.v1-test.yml build` | 默认 Docker Hub token 接口超时；已改用镜像源覆盖完成构建 |
| `CRM_POSTGRES_IMAGE=docker.1ms.run/library/postgres:16 ... docker compose -f compose.v1-test.yml up -d --build` | Compose build and startup passed；db/backend/frontend 均 Up，db healthy |
| `node scripts/v1-deployment-config-check.mjs` | V1 deployment config check passed；Dockerfile/Compose 支持可配置基础镜像 |
| `node --test scripts/v1-deployment-config-check.test.mjs` | 3 tests passed |
| `node --test scripts/*.test.mjs` | 96 tests passed |
| `node --test scripts/v1-uat-evidence-pack-validate.test.mjs` | 4 tests passed |
| `node --test scripts/v1-uat-evidence-manifest-validate.test.mjs` | 4 tests passed；覆盖完整证据清单、当前草稿 No-Go、PASS项缺证据和敏感材料拦截 |
| `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | FAIL as expected；当前证据清单仍为 No-Go |
| `node --test scripts/v1-uat-environment-validate.test.mjs` | 5 tests passed；覆盖完整具名环境证据、当前草稿 No-Go、缺失 ENV 检查、PASS项缺证据和敏感材料拦截 |
| `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` | FAIL as expected；当前具名环境证据仍为 No-Go |
| `node --test scripts/v1-uat-defect-register-validate.test.mjs` | 5 tests passed；覆盖完整缺陷台账、当前草稿 No-Go、P0/P1 未关闭、缺失回归证据和敏感材料拦截 |
| `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` | FAIL as expected；当前缺陷台账仍为 No-Go |
| `node --test scripts/v1-uat-signoff-register-validate.test.mjs` | 6 tests passed；覆盖完整签署台账、当前草稿 No-Go、缺失签署角色、PASS项缺证据、项目负责人未 Go 和敏感材料拦截 |
| `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md` | FAIL as expected；当前签署台账仍为 No-Go |
| `node --test scripts/v1-uat-launch-intake-validate.test.mjs` | 6 tests passed；覆盖完整启动输入、当前草稿 No-Go、缺失参与角色、环境缺证据、账号未准备和敏感材料拦截 |
| `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md` | FAIL as expected；当前 UAT 启动输入仍为 No-Go |
| `node scripts/v1-uat-readiness-check.mjs` | RC/UAT readiness check passed |
| `node --test scripts/v1-uat-readiness-check.test.mjs` | 36 tests passed；包含UAT执行派工追踪表、UAT启动输入、UAT具名环境证据、UAT逐项执行包、UAT证据清单、UAT缺陷台账、UAT签署台账、tracker validator gate、聚合状态报告gate、UAT行动计划gate和Go/No-Go会议包gate |
| `node --test ../scripts/v1-uat-readiness-check.test.mjs` | 36 tests passed；覆盖CI前端job相对路径 |
| `node --test scripts/v1-uat-execution-tracker-validate.test.mjs` | 5 tests passed；覆盖完整 Go 追踪表、当前 No-Go 追踪表、缺失证据、缺陷台账门禁未通过和签署台账门禁缺失 |
| `node --test scripts/v1-validation-status.test.mjs` | 2 tests passed；覆盖 No-Go 聚合状态和全量 Go 状态 |
| `node scripts/v1-validation-status.mjs --output docs/testing/v1-validation-status.md` | 生成当前 `No-Go` 聚合状态报告 |
| `node --test scripts/v1-uat-action-plan.test.mjs` | 2 tests passed；覆盖 No-Go 行动计划和全量 Go 状态 |
| `node scripts/v1-uat-action-plan.mjs --output docs/testing/v1-uat-action-plan.md` | 生成当前 `No-Go` UAT行动计划 |
| `node --test scripts/v1-uat-execution-pack.test.mjs` | 2 tests passed；覆盖 No-Go 逐项补证清单和全量 Go 状态 |
| `node scripts/v1-uat-execution-pack.mjs --output docs/testing/v1-uat-execution-pack.md` | 生成当前 `No-Go` UAT逐项执行包 |
| `node --test scripts/v1-go-no-go-meeting.test.mjs` | 2 tests passed；覆盖 No-Go 会议包和全量 Go 状态 |
| `node scripts/v1-go-no-go-meeting.mjs --output docs/testing/v1-go-no-go-meeting.md` | 生成当前 `No-Go` Go/No-Go会议包 |
| `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | FAIL as expected；当前追踪表仍缺具名环境、UAT执行、P0/P1、签署和Go |
| `node --test scripts/v1-release-gate.test.mjs` | 10 tests passed；覆盖完整 Go、readiness 失败、UAT启动输入未完成、UAT具名环境未完成、No-Go、Conditional Go、tracker 未完成、证据清单未完成、缺陷台账未完成和签署台账未完成 |
| `node scripts/v1-release-gate.mjs` | FAIL as expected；当前 rc.8 草稿不是正式 Go 证据包 |
| `node --test scripts/v1-uat-evidence-pack.test.mjs` | 4 tests passed |
| `node scripts/v1-uat-evidence-pack.mjs ...` | 可生成不含明文密码/API Token、包含 validator 留痕区的 UAT 证据包草稿 |
| GitHub Actions `V1 Validation` | `v1.0.0-rc.8` 所属提交 `0c9db47b0df8a0b05e63b66bdaa09f46222d9f0c` 的远端 run `27776171025` 已通过 |
| V1候选版本 | `v1.0.0-rc.8` 作为包含RC/UAT就绪审计、本地具名验证环境证据、证据版本一致性检查、UAT 证据包生成器、证据包 Go/No-Go validator、镜像源覆盖配置检查和 V1演示业务数据 seed 的候选版本 |
| `npm run smoke:v1:browser` | `http://127.0.0.1:5175/system` 通过；截图归档至 `docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png` |
| 本地API Smoke | `POST /api/auth/login` + `GET /api/bootstrap` 返回 200，`permissions_count` 返回当前启用权限总数（本次Smoke观测为25），V1演示业务数据计数返回客户/联系人/商机/销售行动各1条 |
| Compose API Smoke | `POST /api/auth/login` + `GET /api/bootstrap` 返回 200，`permissions_count=25`，V1演示业务数据计数返回客户/联系人/商机/销售行动各1条 |
| Compose浏览器Smoke | `CRM_SMOKE_URL=http://127.0.0.1:5174/system npm run smoke:v1:browser` 通过；截图归档至 `docs/testing/evidence/artifacts/v1-rc8-compose-browser-smoke-20260619.png` |

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

rc.8 Compose部署态证据见 `docs/testing/evidence/v1-compose-uat-2026-06-19.md`，覆盖镜像源覆盖、容器状态、API Smoke 和浏览器 Smoke。UAT执行派工追踪表见 `docs/testing/crm-v1-uat-execution-tracker.md`，用于逐项推进 PRE、SMK、UAT、缺陷和签署；tracker validator 实测为 `FAIL / No-Go`，会列出当前未完成项。UAT具名环境证据见 `docs/testing/v1-uat-environment-evidence.md`，用于收敛测试环境元数据、Smoke、账号和权限样本证据；environment validator 实测为 `FAIL / No-Go`。UAT缺陷台账见 `docs/testing/v1-uat-defect-register.md`，用于收敛 P0/P1 缺陷闭环和回归证据；defect register validator 实测为 `FAIL / No-Go`。UAT签署台账见 `docs/testing/v1-uat-signoff-register.md`，用于收敛销售侧、管理侧、产品、测试、研发和项目负责人签署证据；signoff register validator 实测为 `FAIL / No-Go`。聚合状态报告见 `docs/testing/v1-validation-status.md`；UAT行动计划见 `docs/testing/v1-uat-action-plan.md`，按项目/产品、测试、业务UAT和研发拆分下一步；UAT逐项执行包见 `docs/testing/v1-uat-execution-pack.md`，把失败门禁拆成 ENV、PRE、SMK、UAT、DEF、SIGNOFF 和 GO-NOGO 补证项；Go/No-Go会议包见 `docs/testing/v1-go-no-go-meeting.md`，用于正式准出会议留痕。rc.8 UAT 交接草稿见 `docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md`。该草稿已预填工程侧自动化和本地验证证据，validator 实测为 `FAIL / No-Go`，最终 V1 放行门禁也返回 `FAIL`，仍需测试/业务侧补齐具名测试环境账号、UAT-001 至 UAT-010、缺陷汇总、回归证据和签署台账；readiness 审计会防止该草稿在外部 UAT 完成前被误标为 Go/PASS。

## 5. 待外部完成项

| 项目 | 原因 | 建议动作 |
|---|---|---|
| 具名测试环境部署态验收 | 本地 Compose 部署态已通过；测试环境域名、账号仍需由项目/测试侧确认；若 Docker Hub token 超时，可通过 `.env` 镜像源覆盖使用企业镜像代理或经项目确认的等效镜像代理 | 按 `docs/testing/crm-v1-test-environment-validation-runbook.md` 执行环境Smoke、证据归档和业务演示 |
| 业务验收签署 | 销售侧和管理侧验收人尚未在文档中具名，六方签署台账仍为 `No-Go` | 项目侧指定验收人，填写 UAT 证据包和 `docs/testing/v1-uat-signoff-register.md`，并执行证据包 validator 与签署台账 validator 后形成签署记录 |
| V1范围冻结确认 | 产品/业务侧仍需确认最终试点范围和TBD项 | 在验收会中确认范围、字典、风险映射和审计抽样标准 |
