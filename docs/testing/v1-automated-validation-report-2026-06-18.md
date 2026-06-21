# CRM V1 自动化验证报告（2026-06-18）

## 1. 验证结论

V1 当前代码分支已通过自动化验证、本地 PostgreSQL 部署态 API 冒烟、浏览器端登录冒烟和 Docker Compose 部署态工程验证，可进入具名测试环境业务验收准备。

本报告仅确认代码级、接口级、迁移级、本地部署态、Compose部署态和前端交互级自动化验证结果。业务验收签署、试点演示确认和具名测试环境账号仍需由项目/测试/业务侧在正式测试环境中执行。

具名测试环境执行步骤、证据包结构和验收会议模板见 `docs/testing/crm-v1-test-environment-validation-runbook.md`；验收结果汇总和 Go/No-Go 记录模板见 `docs/testing/crm-v1-uat-evidence-pack-template.md`。

GitHub Actions 质量门见 `.github/workflows/v1-validation.yml`，覆盖Compose部署配置校验、RC/UAT readiness 审计、启动治理 validator、UAT 启动输入 validator、UAT 证据包生成器、UAT 证据包 Go/No-Go validator、UAT具名环境证据 validator、UAT缺陷台账 validator、UAT签署台账 validator、UAT执行追踪表 validator、V1最终放行门禁规则、V1聚合状态报告规则、V1 UAT行动计划规则、V1 UAT逐项执行包规则、V1 Go/No-Go会议包规则、V1外部UAT请求包规则、release gate JSON 快照一致性、release gate JSON schema 校验、release gate JSON 实时对齐检查、V1生成文档一致性检查、V1计划状态一致性检查、V1验收清单一致性检查、V1 UAT覆盖检查、V1验证追踪矩阵一致性检查、V1阻塞项一致性检查、V1外部UAT请求覆盖检查、V1最终交接证据一致性检查、V1证据秘密扫描、后端测试、PostgreSQL 集成验证、前端测试和前端生产构建。readiness 审计同时校验 rc.8 UAT 交接草稿保留 `No-Go`、validator `FAIL`、Compose部署态证据、启动治理纪要、UAT启动输入、UAT执行派工追踪表、UAT具名环境证据、UAT逐项执行包、UAT缺陷台账、UAT签署台账、聚合状态报告、UAT行动计划、Go/No-Go会议包、外部UAT请求包、release gate JSON 快照、release gate JSON schema 校验、release gate JSON 实时对齐检查、生成文档一致性检查、计划状态一致性检查、验收清单一致性检查、UAT覆盖检查、验证追踪矩阵一致性检查、阻塞项一致性检查、外部UAT请求覆盖检查、最终交接证据一致性检查、证据秘密扫描和外部 UAT/签署阻塞项。

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
| RC/UAT就绪审计 | 候选版本记录、自动化验证报告、验收清单、追踪矩阵、Runbook、UAT证据模板、启动治理纪要、证据包 validator、Compose部署态证据、Compose部署入口和CI质量门齐备性检查 | 通过 |
| 启动治理准出校验 | 已提供 `scripts/v1-kickoff-governance-validate.mjs` 和 `docs/meeting-notes/crm-kickoff-minutes.md`，校验负责人和业务验收人不得以角色标签替代具体姓名、`YYYY-MM-DD 至 YYYY-MM-DD` 上线周期、V1范围冻结、确认/冻结证据引用必须指向已存在且非空的 `docs/` 留存工件或外部 URL、范围边界、项目 `Go` 结论和敏感材料 | 通过 |
| UAT证据包准出校验 | 已提供 `scripts/v1-uat-evidence-pack-validate.mjs`，校验 Go/No-Go、P0/P1缺陷、UAT用例、自动化结果、签署记录一致性、验收日期/前后端地址/Git 提交号格式、候选版本/前端构建/后端构建/数据库版本必填、基本信息责任人必填且具名、已通过 UAT 用例验收人具名、已同意签署人具名、已同意签署日期格式、通过项证据必须指向已存在且非空的 `docs/` 留存工件或外部 URL，以及敏感材料拦截 | 通过 |
| UAT具名环境证据准出校验 | 已提供 `scripts/v1-uat-environment-validate.mjs` 和 `docs/testing/v1-uat-environment-evidence.md`，校验测试环境元数据、前后端 `http(s)` URL、40位 Git 提交号、Smoke、账号、权限样本、PASS 环境检查 Owner 不得以角色标签替代姓名、证据引用必须指向已存在且非空的 `docs/` 留存工件或外部 URL、责任人和敏感材料 | 通过 |
| UAT缺陷台账准出校验 | 已提供 `scripts/v1-uat-defect-register-validate.mjs` 和 `docs/testing/v1-uat-defect-register.md`，校验 P0/P1 汇总、`PRE-###`/`SMK-###`/`UAT-###` 来源用例、关闭状态、P0/P1 缺陷 Owner 不得以角色标签替代姓名、回归证据必须指向已存在且非空的 `docs/` 留存工件或外部 URL、敏感材料和 Go/No-Go 结论一致性 | 通过 |
| UAT签署台账准出校验 | 已提供 `scripts/v1-uat-signoff-register-validate.mjs` 和 `docs/testing/v1-uat-signoff-register.md`，校验六方具体签署人姓名、不得以角色标签替代签署人、`YYYY-MM-DD` 签署日期、证据引用必须指向已存在且非空的 `docs/` 留存工件或外部 URL、敏感材料和项目 `Go` 结论一致性 | 通过 |
| UAT启动输入准出校验 | 已提供 `scripts/v1-uat-launch-intake-validate.mjs` 和 `docs/testing/v1-uat-launch-intake.md`，校验具名环境、前后端 `http(s)` URL、40位 Git 提交号、`YYYY-MM-DD HH:mm 至 YYYY-MM-DD HH:mm` UAT窗口、证据归档位置、具体参与人姓名、不得以角色标签替代参与人或账号保管 Owner、账号保管、证据引用必须指向已存在且非空的 `docs/` 留存工件或外部 URL，以及敏感材料 | 通过 |
| UAT证据引用保全检查 | 已提供 `scripts/v1-evidence-reference-check.mjs`，校验证据清单中每个 `PASS` 行必须引用 `docs/` 下已归档工件或外部 URL，并拦截普通仓库文件和敏感材料 | 通过 |
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
| `node --test scripts/*.test.mjs` | 275 tests passed |
| `node --test scripts/v1-kickoff-governance-validate.test.mjs` | 9 tests passed；覆盖完整启动治理记录、当前草稿 No-Go、缺失负责人、负责人仅为角色标签、V2/AI 范围误入 V1、上线周期非结构化、确认/冻结证据引用未指向可留存工件/URL、确认/冻结证据本地 `docs/` 工件缺失和敏感材料拦截 |
| `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | FAIL as expected；当前启动会负责人、V1范围冻结和项目 Go 结论仍为 No-Go |
| `node --test scripts/v1-uat-evidence-pack-validate.test.mjs` | 14 tests passed；覆盖证据包验收日期、前后端地址、Git 提交号和已同意签署日期必须结构化，候选版本、前端构建、后端构建和数据库版本必须补齐，已通过自动化、环境、UAT用例和签署证据必须指向可留存仓库工件或外部 URL，且本地 `docs/` 工件必须存在且非空，基本信息责任人必须必填并不得以角色标签替代姓名，已通过 UAT 用例验收人和已同意签署人不得以角色标签替代姓名，并拦截敏感材料 |
| `node --test scripts/v1-uat-evidence-manifest-validate.test.mjs` | 6 tests passed；覆盖完整证据清单、当前草稿 No-Go、PASS项缺证据、PASS项 Owner 仅为角色标签、PASS项证据未指向可留存工件/URL和敏感材料拦截 |
| `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | FAIL as expected；当前证据清单仍为 No-Go |
| `node --test scripts/v1-evidence-reference-check.test.mjs` | 5 tests passed；覆盖 PASS 行缺失归档文件、`docs/` 已归档工件/外部 URL 通过、普通仓库文件不可作为保全证据、当前 No-Go 待补证据行通过和敏感材料拦截 |
| `node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md` | PASS；当前证据清单仍为 No-Go，暂无 PASS 行需要解析，后续 Go 前必须引用 `docs/` 下已归档工件或外部 URL |
| `node --test scripts/v1-uat-environment-validate.test.mjs` | 9 tests passed；覆盖完整具名环境证据、当前草稿 No-Go、缺失 ENV 检查、环境 URL/提交号格式错误、PASS项缺证据、PASS环境检查Owner仅为角色标签、PASS项证据未指向可留存工件/URL、PASS项证据本地 `docs/` 工件缺失和敏感材料拦截 |
| `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` | FAIL as expected；当前具名环境证据仍为 No-Go |
| `node --test scripts/v1-uat-defect-register-validate.test.mjs` | 9 tests passed；覆盖完整缺陷台账、当前草稿 No-Go、P0/P1 未关闭、缺失回归证据、P0/P1 来源用例不可追溯、P0/P1 缺陷 Owner 仅为角色标签、回归证据未指向可留存工件/URL、回归证据本地 `docs/` 工件缺失和敏感材料拦截 |
| `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` | FAIL as expected；当前缺陷台账仍为 No-Go |
| `node --test scripts/v1-uat-signoff-register-validate.test.mjs` | 10 tests passed；覆盖完整签署台账、当前草稿 No-Go、缺失签署角色、PASS项缺证据、签署人仅为角色标签、签署日期非 `YYYY-MM-DD`、签署证据引用未指向可留存工件/URL、签署证据本地 `docs/` 工件缺失、项目负责人未 Go 和敏感材料拦截 |
| `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md` | FAIL as expected；当前签署台账仍为 No-Go |
| `node --test scripts/v1-uat-launch-intake-validate.test.mjs` | 12 tests passed；覆盖完整启动输入、当前草稿 No-Go、缺失参与角色、参与人仅为角色标签、账号保管 Owner 仅为角色标签、环境缺证据、启动环境 URL/提交号格式错误、UAT窗口非结构化、账号未准备、启动输入/账号证据引用未指向可留存工件/URL、启动输入/账号证据本地 `docs/` 工件缺失和敏感材料拦截 |
| `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md` | FAIL as expected；当前 UAT 启动输入仍为 No-Go |
| `node scripts/v1-uat-readiness-check.mjs` | RC/UAT readiness check passed |
| `node --test scripts/v1-uat-readiness-check.test.mjs` | 102 tests passed；包含启动治理纪要具名负责人、启动治理纪要可留存证据引用、启动治理纪要 `docs/` 工件存在性、启动治理上线周期格式、UAT执行派工追踪表具名角色负责人、UAT执行派工追踪表具名 UAT 用例验收人、UAT执行派工追踪表可留存证据引用、UAT执行派工追踪表 `docs/` 工件存在性、UAT启动输入具名参与人、UAT启动输入具名账号保管 Owner、UAT启动输入可留存证据引用、UAT启动输入 `docs/` 工件存在性、UAT启动输入 URL/提交号格式、结构化UAT窗口、UAT具名环境 URL/提交号格式、UAT具名环境PASS检查Owner、UAT具名环境可留存证据、UAT具名环境 `docs/` 工件存在性、UAT证据包基本信息格式、UAT证据包版本字段必填、UAT证据包基本信息责任人必填、UAT证据包基本信息责任人具名、UAT证据包已通过 UAT 用例验收人具名、UAT证据包已同意签署人具名、UAT证据包已同意签署日期格式、UAT证据包敏感材料拦截、UAT证据包通过项可留存证据引用、UAT证据包 `docs/` 工件存在性、UAT证据清单 PASS Owner 具名、UAT证据清单通过项可留存证据引用、UAT缺陷台账来源用例格式、UAT缺陷台账具名缺陷 Owner、UAT缺陷台账 `docs/` 工件存在性、UAT逐项执行包、UAT证据清单、证据引用保全检查、UAT缺陷台账可留存回归证据、UAT签署台账具名签署人、UAT签署台账可留存证据引用、UAT签署台账 `docs/` 工件存在性、release gate JSON 快照、release gate JSON schema gate、release gate JSON decision consistency gate、release gate JSON live alignment gate、tracker validator gate、聚合状态报告gate、UAT行动计划gate、Go/No-Go会议包gate、Go/No-Go会议包机器可读门禁命令gate、外部UAT请求包gate、生成文档一致性gate、生成状态报告提交绑定gate、CI checkout 历史深度gate、计划状态一致性gate、验收清单一致性gate、UAT覆盖gate、UAT执行明细gate、验证追踪矩阵gate、阻塞项一致性gate、外部UAT请求覆盖gate、外部UAT请求责任侧路由gate、最终交接证据一致性gate、最终交接关键验证命令覆盖gate、最终交接机器可读门禁命令覆盖gate、最终交接状态与外部阻塞可见性gate、证据秘密扫描gate、README 交接入口秘密扫描覆盖gate、README 秘密扫描入口和 README 关键准出检查入口 |
| `node --test ../scripts/v1-uat-readiness-check.test.mjs` | 95 tests passed；覆盖CI前端job相对路径 |
| `node --test scripts/v1-uat-execution-tracker-validate.test.mjs` | 9 tests passed；覆盖完整 Go 追踪表、当前 No-Go 追踪表、缺失证据、已签署角色负责人仅为角色标签、已通过 UAT 用例验收人仅为角色标签、追踪表证据未指向可留存工件/URL、追踪表本地 `docs/` 工件缺失、缺陷台账门禁未通过和签署台账门禁缺失 |
| `node --test scripts/v1-validation-status.test.mjs` | 4 tests passed；覆盖 No-Go 聚合状态、绝对路径 UAT 源文档、全量 Go 状态和显式 git commit 参数 |
| `node scripts/v1-validation-status.mjs --git-commit <git-sha> --output docs/testing/v1-validation-status.md` | 生成当前 `No-Go` 聚合状态报告，并显式绑定被验证提交 |
| `node --test scripts/v1-uat-action-plan.test.mjs` | 3 tests passed；覆盖 No-Go 行动计划、绝对路径 UAT 源文档和全量 Go 状态 |
| `node scripts/v1-uat-action-plan.mjs --output docs/testing/v1-uat-action-plan.md` | 生成当前 `No-Go` UAT行动计划 |
| `node --test scripts/v1-uat-execution-pack.test.mjs` | 3 tests passed；覆盖 No-Go 逐项补证清单、绝对路径 UAT 源文档和全量 Go 状态 |
| `node scripts/v1-uat-execution-pack.mjs --output docs/testing/v1-uat-execution-pack.md` | 生成当前 `No-Go` UAT逐项执行包 |
| `node --test scripts/v1-go-no-go-meeting.test.mjs` | 3 tests passed；覆盖 No-Go 会议包、机器可读最终门禁命令、绝对路径 UAT 源文档和全量 Go 状态 |
| `node scripts/v1-go-no-go-meeting.mjs --output docs/testing/v1-go-no-go-meeting.md` | 生成当前 `No-Go` Go/No-Go会议包 |
| `node --test scripts/v1-external-uat-request.test.mjs` | 3 tests passed；覆盖 No-Go 外部 UAT 请求包、绝对路径 UAT 源文档和全量 Go 状态 |
| `node scripts/v1-external-uat-request.mjs --output docs/testing/v1-external-uat-request.md` | 生成当前 `No-Go` 外部 UAT 请求包 |
| `node --test scripts/v1-generated-docs-check.test.mjs` | 5 tests passed；覆盖生成文档一致、生成器输出漂移、release gate JSON 快照缺失、状态报告提交绑定陈旧和提交后直接父提交复用 |
| `node scripts/v1-generated-docs-check.mjs` | V1 generated docs check passed；状态报告、行动计划、逐项执行包、会议包、外部 UAT 请求包和 release gate JSON 快照与当前生成器一致，且状态报告绑定当前或直接上一提交 |
| `node --test scripts/v1-release-gate-status-check.test.mjs` | 6 tests passed；覆盖 JSON schema 稳定、非法 JSON、缺失必需 release gate check id、result/ok 不一致、result/ok/decision 不一致和 JSON 快照未对齐实时 release gate |
| `node scripts/v1-release-gate-status-check.mjs` | V1 release gate status JSON check passed；当前 release gate JSON 快照字段、值域、result/ok/decision 一致性和实时 release gate 对齐稳定 |
| `node --test scripts/v1-plan-status-check.test.mjs` | 2 tests passed；覆盖计划未完成项与 No-Go 证据一致，以及误配 Go 状态时失败 |
| `node scripts/v1-plan-status-check.mjs` | V1 plan status check passed；启动计划未完成项与当前 No-Go 状态一致 |
| `node --test scripts/v1-acceptance-checklist-check.test.mjs` | 2 tests passed；覆盖待业务验收状态和 release gate No-Go 一致，以及误标业务通过时失败 |
| `node scripts/v1-acceptance-checklist-check.mjs` | V1 acceptance checklist check passed；AC-001 至 AC-017 完整且全部仍为待业务验收 |
| `node --test scripts/v1-uat-coverage-check.test.mjs` | 3 tests passed；覆盖 UAT 用例完整映射、AC 验收项漏映射、缺操作人或证据要求时失败 |
| `node scripts/v1-uat-coverage-check.mjs` | V1 UAT coverage check passed；UAT-001 至 UAT-010 覆盖 AC-001 至 AC-017，且每条 UAT 用例具备操作人与证据要求 |
| `node --test scripts/v1-traceability-check.test.mjs` | 3 tests passed；覆盖追踪矩阵完整、AC漏项和 release gate No-Go 时误标项目验收通过 |
| `node scripts/v1-traceability-check.mjs` | V1 traceability check passed；AC-001 至 AC-017 追踪矩阵完整且与当前 No-Go 状态一致 |
| `node --test scripts/v1-blocker-consistency-check.test.mjs` | 6 tests passed；覆盖决策材料和执行包完整映射当前 release gate 阻塞项、CLI 外部 UAT 源文档/决策材料绝对路径参数、决策文档漏项、外部UAT请求包漏项和执行行动项漏项 |
| `node scripts/v1-blocker-consistency-check.mjs` | V1 blocker consistency check passed；当前 release gate 阻塞项已出现在决策材料并映射到 UAT 执行包行动项 |
| `node --test scripts/v1-external-uat-request-coverage-check.test.mjs` | 5 tests passed；覆盖外部 UAT 请求包阻塞项完整、责任侧路由、漏写 validator 失败项、漏写命令和 No-Go 时误标请求关闭 |
| `node scripts/v1-external-uat-request-coverage-check.mjs` | V1 external UAT request coverage check passed；外部 UAT 请求包覆盖当前失败 validator 明细、补证命令和责任侧路由 |
| `node --test scripts/v1-final-evidence-handoff-check.test.mjs` | 7 tests passed；覆盖 No-Go 阻塞和门禁命令可见、No-Go 时误称验收通过、缺失最终门禁命令、缺失机器可读最终门禁命令、缺失验收/覆盖/追踪/交接命令、缺失生成的UAT交接包和隐藏外部阻塞项 |
| `node scripts/v1-final-evidence-handoff-check.mjs` | V1 final evidence handoff check passed；最终交接材料与当前 `FAIL / No-Go` release gate 保持一致 |
| `node --test scripts/v1-secret-scan-check.test.mjs` | 6 tests passed；覆盖当前证据清单包含 README 交接入口、外部 UAT 请求包、release gate JSON 快照、脱敏占位允许、明文密码拦截和 Bearer token 拦截 |
| `node scripts/v1-secret-scan-check.mjs` | V1 secret scan check passed；当前 V1 证据文档和 README 交接入口未发现明显明文敏感材料 |
| `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md` | FAIL as expected；当前追踪表仍缺具名环境、UAT执行、P0/P1、签署和Go |
| `node --test scripts/v1-release-gate.test.mjs` | 22 tests passed；覆盖完整 Go、从已填写 UAT 源文件读取完整 Go、CLI 命名外部 UAT 源文档参数、机器可读 JSON 输出、readiness 失败、启动治理未完成、启动治理缺失本地 `docs/` 工件、UAT启动输入未完成、UAT启动输入缺失本地 `docs/` 工件、UAT具名环境未完成、No-Go、正式UAT证据包缺失本地 `docs/` 工件、UAT具名环境缺失本地 `docs/` 工件、UAT执行追踪表缺失本地 `docs/` 工件、签署台账缺失本地 `docs/` 工件、缺陷台账缺失本地 `docs/` 工件、Conditional Go、tracker 未完成、证据清单未完成、证据引用缺失、缺陷台账未完成和签署台账未完成 |
| `node scripts/v1-release-gate.mjs` | FAIL as expected；当前启动治理和 rc.8 草稿不是正式 Go 证据包 |
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

rc.8 Compose部署态证据见 `docs/testing/evidence/v1-compose-uat-2026-06-19.md`，覆盖镜像源覆盖、容器状态、API Smoke 和浏览器 Smoke。启动治理纪要见 `docs/meeting-notes/crm-kickoff-minutes.md`，用于收敛负责人、业务验收人、V1范围冻结和确认/冻结证据本地 `docs/` 工件存在性；kickoff governance validator 实测为 `FAIL / No-Go`。UAT执行派工追踪表见 `docs/testing/crm-v1-uat-execution-tracker.md`，用于逐项推进 PRE、SMK、UAT、缺陷和签署，并要求已签署角色负责人、已通过 UAT 用例验收人必须具名，且已通过项证据指向已存在且非空的本地 `docs/` 工件或外部 URL；tracker validator 实测为 `FAIL / No-Go`，会列出当前未完成项。UAT具名环境证据见 `docs/testing/v1-uat-environment-evidence.md`，用于收敛测试环境元数据、Smoke、账号和权限样本可留存证据，并要求本地 `docs/` 环境证据工件存在且非空；environment validator 实测为 `FAIL / No-Go`。UAT缺陷台账见 `docs/testing/v1-uat-defect-register.md`，用于收敛 P0/P1 缺陷闭环、具体缺陷 Owner 和可留存回归证据，并要求本地 `docs/` 回归证据工件存在且非空；defect register validator 实测为 `FAIL / No-Go`。UAT签署台账见 `docs/testing/v1-uat-signoff-register.md`，用于收敛销售侧、管理侧、产品、测试、研发和项目负责人签署证据，并要求本地 `docs/` 签署证据工件存在且非空；signoff register validator 实测为 `FAIL / No-Go`。

聚合状态报告见 `docs/testing/v1-validation-status.md`；UAT行动计划见 `docs/testing/v1-uat-action-plan.md`，按项目/产品、测试、业务UAT和研发拆分下一步；UAT逐项执行包见 `docs/testing/v1-uat-execution-pack.md`，把失败门禁拆成 KICKOFF、ENV、PRE、SMK、UAT、DEF、SIGNOFF 和 GO-NOGO 补证项；Go/No-Go会议包见 `docs/testing/v1-go-no-go-meeting.md`，用于正式准出会议留痕；外部UAT请求包见 `docs/testing/v1-external-uat-request.md`，面向项目/产品、测试、业务UAT和研发集中列出源文档、验证命令和当前阻塞请求；release gate JSON 快照见 `docs/testing/v1-release-gate-status.json`，用于看板或验收机器人读取当前准出状态，并由 `scripts/v1-release-gate-status-check.mjs` 校验字段、值域、result/ok/decision 一致性和实时 release gate 对齐稳定。

生成文档一致性检查见 `scripts/v1-generated-docs-check.mjs`，用于防止生成器、状态报告提交绑定和已提交证据文档漂移；release gate JSON schema 校验见 `scripts/v1-release-gate-status-check.mjs`，用于防止机器可读准出快照结构漂移、result/ok/decision 决策矛盾和快照滞后；计划状态一致性检查见 `scripts/v1-plan-status-check.mjs`，用于防止启动计划未完成项被误配为 V1 Go；验收清单一致性检查见 `scripts/v1-acceptance-checklist-check.mjs`，用于防止 AC-001 至 AC-017 在最终放行仍为 No-Go 时被误标为业务通过；UAT覆盖检查见 `scripts/v1-uat-coverage-check.mjs`，用于防止 UAT-001 至 UAT-010 漏覆盖任一 V1 验收项，且防止 UAT 行缺操作人或证据要求；验证追踪矩阵一致性检查见 `scripts/v1-traceability-check.mjs`，用于防止 AC-001 至 AC-017 的研发证据矩阵漏项或误标项目验收通过；阻塞项一致性检查见 `scripts/v1-blocker-consistency-check.mjs`，用于防止当前 release gate 阻塞项从状态报告、行动计划、会议包或执行行动项中漏写；外部UAT请求覆盖检查见 `scripts/v1-external-uat-request-coverage-check.mjs`，用于防止项目/测试/业务侧请求包漏掉当前失败 validator 明细、补证命令或责任侧路由；最终交接证据一致性检查见 `scripts/v1-final-evidence-handoff-check.mjs`，用于防止 README、候选版本记录、自动化验证报告、Runbook、验收清单、UAT行动计划、UAT逐项执行包、Go/No-Go会议包或外部UAT请求包在 `No-Go` 状态下缺失、漏掉最终门禁命令、隐藏阻塞项，或误称 V1 已验收通过/可正式发布；证据秘密扫描见 `scripts/v1-secret-scan-check.mjs`，用于防止当前 V1 证据文档、外部 UAT 请求包和 release gate JSON 快照中出现明文密码、Bearer token、API key 或等价敏感材料。rc.8 UAT 交接草稿见 `docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md`。该草稿已预填工程侧自动化和本地验证证据，validator 实测为 `FAIL / No-Go`，最终 V1 放行门禁也返回 `FAIL`，仍需项目/测试/业务侧补齐启动治理、具名测试环境账号、UAT-001 至 UAT-010、缺陷汇总、回归证据和签署台账；readiness 审计会防止该草稿在外部 UAT 完成前被误标为 Go/PASS。

## 5. 待外部完成项

| 项目 | 原因 | 建议动作 |
|---|---|---|
| 启动治理确认 | 产品负责人、业务验收人、研发/前端/后端/测试负责人和 V1范围冻结仍待项目侧具名确认 | 按 `docs/meeting-notes/crm-kickoff-minutes.md` 补齐负责人和冻结结论，运行 `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` |
| 具名测试环境部署态验收 | 本地 Compose 部署态已通过；测试环境域名、账号仍需由项目/测试侧确认；若 Docker Hub token 超时，可通过 `.env` 镜像源覆盖使用企业镜像代理或经项目确认的等效镜像代理 | 按 `docs/testing/crm-v1-test-environment-validation-runbook.md` 执行环境Smoke、证据归档和业务演示 |
| 业务验收签署 | 销售侧和管理侧验收人尚未在文档中具名，六方签署台账仍为 `No-Go` | 项目侧指定验收人，填写 UAT 证据包和 `docs/testing/v1-uat-signoff-register.md`，并执行证据包 validator 与签署台账 validator 后形成签署记录 |
| V1范围冻结确认 | 产品/业务侧仍需确认最终试点范围和TBD项 | 在验收会中确认范围、字典、风险映射和审计抽样标准 |
