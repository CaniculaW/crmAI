# 项目型大客户CRM V1验收清单

版本：V1.0

适用范围：Sprint 0测试与验收准备，面向V1试点上线前的测试准入、测试准出、业务验收和上线验收。

参考文档：

- `docs/superpowers/plans/2026-06-17-crm-development-kickoff.md`
- `docs/prd/project-crm-prd.md`
- `docs/superpowers/specs/2026-06-17-project-crm-design.md`
- `docs/database/project-crm-data-model.md`
- `docs/testing/crm-v1-validation-traceability.md`
- `docs/testing/crm-v1-test-environment-validation-runbook.md`
- `docs/testing/crm-v1-uat-evidence-pack-template.md`

## 1. 验收目标

V1验收目标是确认系统可以支撑销售基础闭环试点上线：

客户建档 -> 联系人/干系人维护 -> 商机创建 -> 商机阶段和状态推进 -> 销售行动记录 -> 客户和商机最近跟进回写 -> 商机周进展自动汇总 -> 商机关闭或取消跟进 -> 关键操作审计追踪。

V1不验收方案标书、合同、开票、回款、经营驾驶舱和AI销售助手完整能力；如界面存在入口，仅验收其不影响V1主流程。

## 2. 测试准入

| 准入项 | 标准 | 责任侧 | 状态 |
|---|---|---|---|
| V1范围冻结 | 系统基础、客户池、联系人与干系人、商机生命周期、销售行动、周进展汇总范围已确认 | 产品/项目 | 待确认 |
| PRD和设计可评审 | PRD、系统设计、数据模型、页面清单、API清单达到测试设计可引用状态 | 产品/研发 | 待确认 |
| 测试环境可用 | 测试环境可访问，前后端版本部署完成，基础配置可维护；本地 PostgreSQL 部署态、浏览器 Smoke、Docker Compose 测试环境入口和镜像源覆盖配置已提供 | 研发/运维 | 本地通过，具名测试环境待部署确认 |
| 基础账号可用 | 管理员、销售个人、销售负责人、管理层、售前/方案人员账号已准备；研发侧已提供 `crm.seed.v1-demo.enabled=true` 演示管理员种子 | 研发/测试 | 演示账号已具备，正式测试账号待确认 |
| 组织和权限可配置 | 组织、角色、权限点、数据范围、字典可在系统中维护；系统管理页浏览器 Smoke 已验证组织、用户、角色展示 | 研发/测试 | 自动化和本地浏览器已通过 |
| 测试数据可构造 | 可创建客户、联系人、商机、销售行动，支持跨部门和协同数据场景 | 测试/业务 | 待确认 |
| 缺陷流程明确 | 缺陷提交流程、优先级、修复时限、回归负责人已明确 | 项目/测试 | 待确认 |

## 3. V1上线验收清单

| 编号 | 验收项 | 验收标准 | 建议验证方式 | 状态 |
|---|---|---|---|---|
| AC-001 | 用户登录、登出、修改密码 | 用户可以登录、登出、修改密码；停用用户不能登录；会话失效后需重新登录 | 执行 AUTH-001 至 AUTH-008 | 研发验证通过，待业务验收 |
| AC-002 | 管理员重置密码 | 管理员可以重置用户密码；非管理员不能重置；重置后用户首次登录提示修改密码 | 执行 AUTH-009、AUTH-010 | 研发验证通过，待业务验收 |
| AC-003 | 组织、用户、角色、权限、字典维护 | 管理员可以维护组织、用户、角色、权限、数据范围和V1字典 | 执行 IAM-001 至 IAM-012 | 研发验证通过，待业务验收 |
| AC-004 | 菜单和操作权限 | 不同角色登录后菜单和按钮不同；未授权接口访问被拦截 | 角色切换验证、接口越权验证 | 研发验证通过，待业务验收 |
| AC-005 | 数据范围 | 销售个人只能访问本人或协同数据；销售负责人可访问本部门数据；管理层可访问全局数据 | 执行 IAM-008 至 IAM-011、INT-002、INT-003 | 研发验证通过，待业务验收 |
| AC-006 | 客户日常管理 | 销售可以创建、编辑、查询客户并查看客户详情；客户支持上级客户、负责人、协同人员 | 执行 CUS-001 至 CUS-007 | 研发验证通过，待业务验收 |
| AC-007 | 联系人与关系视图 | 销售可以创建、编辑联系人，维护项目角色、影响力、态度、关系热度，并查看关系视图 | 执行 CON-001 至 CON-007 | 研发验证通过，待业务验收 |
| AC-008 | 商机日常管理 | 销售可以创建、编辑、查询商机；商机阶段和商机状态可独立维护 | 执行 OPP-001 至 OPP-006 | 研发验证通过，待业务验收 |
| AC-009 | 商机关闭和取消跟进 | 商机关闭和取消跟进必须填写原因；关闭和取消后不进入默认跟进列表 | 执行 OPP-007 至 OPP-010 | 研发验证通过，待业务验收 |
| AC-010 | 销售行动日常管理 | 销售可以创建客户经营行动和项目推进行动，可以完成行动 | 执行 ACT-001 至 ACT-004 | 研发验证通过，待业务验收 |
| AC-011 | 最近跟进自动回写 | 销售行动完成后自动回写客户和商机最近跟进时间、摘要 | 执行 CUS-008、ACT-005、ACT-006 | 研发验证通过，待业务验收 |
| AC-012 | 风险触发 | 发现风险的销售行动可触发商机风险状态更新，并保留风险说明 | 执行 ACT-007、WPR-007 | 研发验证通过，待业务验收 |
| AC-013 | 周进展自动生成 | 商机周进展由已完成且进入周进展的销售行动自动汇总生成，不依赖商机主表手工填报 | 执行 WPR-001 至 WPR-006 | 研发验证通过，待业务验收 |
| AC-014 | 核心集成链路 | 登录 -> 新建客户 -> 新建联系人 -> 新建商机 -> 新建销售行动 -> 完成销售行动 -> 查看商机周进展 -> 关闭商机全链路可跑通 | 执行 INT-001 | 自动化已通过，待业务验收 |
| AC-015 | 销售负责人查看团队 | 销售负责人可以查看本部门客户、商机、行动和周进展 | 执行 INT-002 | 研发验证通过，待业务验收 |
| AC-016 | 个人不能越权 | 销售个人不能查看或操作无关客户、联系人、商机、行动、周进展 | 执行 INT-003 | 研发验证通过，待业务验收 |
| AC-017 | 关键操作审计日志 | 登录、登出、修改密码、重置密码、用户停用、角色权限变更、客户创建、商机关闭、销售行动完成等关键操作可在审计日志中查看 | 执行 INT-004、AUD-001、AUD-002 | 自动化已通过，待业务验收 |

## 4. 业务验收口径

| 业务口径 | 可接受标准 | 不通过示例 |
|---|---|---|
| 销售可日常管理 | 销售人员无需Excel即可完成客户、联系人、商机、行动的新增、查询、详情查看和核心状态更新 | 仍需在Excel中补录客户、商机或行动主流程字段 |
| 周进展自动生成 | 周进展来自销售行动，能按商机、负责人、自然周查看，展示行动时间、行动主题、形成结论、下一步计划、风险说明 | 需要人工在商机主表录入第一周、第二周等固定周字段 |
| 负责人查看团队 | 销售负责人可查看本部门客户、商机、行动和周进展，用于周会追踪 | 负责人只能看本人数据，无法查看团队进展 |
| 个人不能越权 | 销售个人只能查看本人负责、协同或参与的数据，跨部门无关数据不可见 | 通过列表、搜索、详情地址或接口可看到无关数据 |
| 关键操作审计 | 权限变更、密码重置、用户停用、商机关闭、销售行动完成等关键操作可追溯 | 审计日志缺少操作人、操作时间、操作对象或变更内容 |

## 5. 测试准出

| 准出项 | 标准 |
|---|---|
| P0用例 | P0测试用例全部执行，阻断缺陷全部关闭 |
| P1用例 | P1测试用例完成执行；未关闭缺陷有业务和项目共同确认的规避方案 |
| 核心链路 | INT-001、INT-002、INT-003、INT-004全部通过 |
| 权限回归 | 本人、本部门、协同、全局四类数据权限主路径通过 |
| 审计回归 | 关键操作可在审计日志中查询，日志字段满足追溯要求 |
| 数据一致性 | 行动完成后的客户最近跟进、商机最近跟进、周进展明细一致 |
| 业务验收 | 销售侧和管理侧验收人完成试点演示或试用确认；姓名在会议纪要中记录，不在本文档虚构 |
| 上线风险 | 遗留缺陷、规避方案、上线观察项和回滚条件已记录 |
| 环境证据准出校验 | 具名测试环境证据填写完成后执行 `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md`；ENV-001 至 ENV-008 必须有具体 Owner 和指向 `docs/` 留存工件或外部 URL 的可留存证据，PASS 行 Owner 不得以角色标签替代姓名 |
| 证据包准出校验 | UAT 证据包填写完成后执行 `node scripts/v1-uat-evidence-pack-validate.mjs <证据包>`；若选择 Go，validator 必须返回 PASS；基本信息责任人、已通过 UAT 用例验收人和已同意签署人必须必填且具名，且通过项证据必须指向可留存工件或外部 URL |
| 缺陷台账准出校验 | UAT 缺陷台账填写完成后执行 `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md`；P0/P1 未关闭数量、具体缺陷 Owner、可留存回归证据和 Go/No-Go 结论必须一致，P0/P1 缺陷 Owner 不得以角色标签替代姓名 |

## 6. 缺陷分级

| 等级 | 定义 | 示例 | 处理要求 |
|---|---|---|---|
| S1 阻断 | 主流程不可用、数据泄露、权限越权、核心数据错误、系统不可登录 | 无法登录；销售个人可看全局客户；完成行动未回写且无法修复 | 上线前必须修复并回归通过 |
| S2 严重 | V1关键功能不可用或存在高概率业务误导，但有有限规避方式 | 周进展漏明细；关闭商机未退出默认跟进列表；审计日志缺关键字段 | 上线前原则上修复；如延期需业务和项目共同确认 |
| S3 一般 | 非核心路径异常、提示不清晰、筛选分页局部问题，不影响主流程闭环 | 某筛选组合结果不准；错误提示不够明确 | 可进入版本修复池，但需评估试点影响 |
| S4 轻微 | 文案、样式、低频兼容问题，不影响业务操作和数据准确性 | 表格列宽、提示语错别字、非关键页面展示瑕疵 | 可排入后续优化 |

## 7. 回归范围

每次后端、前端或权限配置相关变更后，至少执行以下回归：

| 变更类型 | 必回归范围 |
|---|---|
| 登录、会话、密码变更 | AUTH-001 至 AUTH-010，IAM-007，AUD-001 |
| 组织、角色、权限、数据范围变更 | IAM-005 至 IAM-011，CUS-007，CON-008，OPP-012，ACT-010，INT-002，INT-003 |
| 客户模块变更 | CUS-001 至 CUS-008，CON-001，OPP-001，ACT-005 |
| 联系人模块变更 | CON-001 至 CON-008，INT-001 |
| 商机模块变更 | OPP-001 至 OPP-012，ACT-006，WPR-001，INT-001 |
| 销售行动模块变更 | ACT-001 至 ACT-010，CUS-008，WPR-001 至 WPR-007，INT-001 |
| 周进展逻辑变更 | WPR-001 至 WPR-007，INT-001，INT-002 |
| 审计日志变更 | AUTH-006，AUTH-009，IAM-007，OPP-008，OPP-010，AUD-001，AUD-002 |
| 字典变更 | IAM-012，OPP-004，OPP-005，ACT-001，ACT-007 |

## 8. 试点验收数据建议

| 数据项 | 建议数量 | 说明 |
|---|---:|---|
| 试点销售团队 | 1-2个部门 | 需覆盖销售个人和销售负责人 |
| 试点销售用户 | 3-8人 | 每人至少有独立客户和行动数据 |
| 重点客户 | 10-20个 | 包含本人负责、协同、跨部门、上级/下级客户 |
| 联系人 | 30-60个 | 覆盖决策人、技术负责人、采购负责人、财务负责人、外部伙伴 |
| 活跃商机 | 20-40个 | 覆盖不同阶段、状态、负责人、风险状态 |
| 销售行动 | 每人每周至少3条 | 至少包含拜访、会议、电话、方案汇报、风险行动 |
| 周进展样本 | 至少2个自然周 | 同一商机同一周需准备多条已完成行动 |
| 权限样本 | 至少4类数据范围 | 本人、本部门、协同、全局均需验证 |
| 审计样本 | 至少20条关键操作 | 包含登录、登出、密码、权限、商机关闭、行动完成 |

## 9. 试点验收观察指标

| 指标 | 建议观察口径 |
|---|---|
| 销售行动录入率 | 试点销售每人每周行动数是否达到约定下限 |
| 商机周进展完整率 | 有已完成行动的活跃商机是否能在对应自然周看到进展 |
| 商机最近跟进准确率 | 商机最近跟进时间和摘要是否与最新完成行动一致 |
| 客户最近跟进准确率 | 客户最近跟进时间和摘要是否与最新完成行动一致 |
| 权限问题数量 | 试点期越权、看不到应看数据、能操作不应操作数据的缺陷数 |
| 审计可追溯率 | 抽样关键操作是否能查到完整审计日志 |
| 周会可用性 | 周进展汇总是否可直接支撑销售例会追踪 |

## 10. 待确认项

| 编号 | 待确认项 | 影响 |
|---|---|---|
| TBD-001 | 销售侧验收人和管理侧验收人 | 影响业务验收签署和试点反馈归口 |
| TBD-002 | 密码强度、失败锁定、会话超时时长 | 影响认证异常用例预期和安全验收 |
| TBD-003 | 商机关闭类型、取消跟进原因字典 | 影响关闭和取消跟进表单校验 |
| TBD-004 | 风险行动触发商机风险状态的映射规则 | 影响 ACT-007 和 WPR-007 的精确预期 |
| TBD-005 | 关闭/取消后是否限制新增普通行动 | 影响关闭/取消后行动关联规则；当前不纳入 V1 上线硬验收 |
| TBD-006 | 审计日志保留字段和查询条件 | 影响 AC-017 和审计抽样标准 |

## 11. Task 8与V1上线标准自检

| 检查项 | 结果 | 覆盖位置 |
|---|---|---|
| Task 8 Step 1：输出测试用例 | 已覆盖 | `crm-v1-test-cases.md` |
| Task 8 Step 2：执行集成测试核心链路 | 自动化已执行 | `V1WorkflowIntegrationTest` 覆盖 INT-001 至 INT-004；`mvn test`、`mvn verify -Ppostgres-it` 已通过 |
| Task 8 Step 3：业务验收清单 | 已覆盖 | 本文第3、4章 |
| V1自动化验证报告 | 已形成 | `docs/testing/v1-automated-validation-report-2026-06-18.md` |
| V1验证追踪矩阵 | 已形成 | `docs/testing/crm-v1-validation-traceability.md` 逐项映射 AC-001 至 AC-017 的研发证据和外部验收动作 |
| GitHub Actions V1质量门 | 已形成 | `.github/workflows/v1-validation.yml` 在 push/PR 时执行Compose部署配置校验、后端测试、PostgreSQL集成验证、前端测试和前端生产构建 |
| V1容器化测试环境入口 | 已形成 | `compose.v1-test.yml`、`docs/deployment/v1-test-environment-compose.md` 提供 PostgreSQL + 后端 + 前端生产包的测试环境启动方式 |
| RC/UAT就绪审计 | 已形成 | `scripts/v1-uat-readiness-check.mjs` 检查候选版本记录、自动化验证报告、验收清单、追踪矩阵、Runbook、UAT证据模板、启动治理纪要、UAT执行追踪表、UAT启动输入、UAT证据清单、证据引用保全检查、UAT签署台账、聚合状态报告、UAT行动计划、Go/No-Go会议包、外部UAT请求包、release gate JSON 快照、release gate JSON schema 校验、外部UAT请求覆盖检查、最终交接证据一致性检查、Compose部署入口、CI质量门齐备性和本地具名验证证据版本一致性；配套 `scripts/v1-uat-readiness-check.test.mjs` |
| 启动治理校验器 | 已形成 | `scripts/v1-kickoff-governance-validate.mjs` 读取 `docs/meeting-notes/crm-kickoff-minutes.md`，校验产品、业务验收、研发、前端、后端和测试负责人具名确认，不得以角色标签替代具体姓名，`YYYY-MM-DD 至 YYYY-MM-DD` 上线周期、V1范围冻结、确认/冻结证据引用必须指向 `docs/` 留存工件或外部 URL、范围边界、项目 `Go` 结论和敏感材料；当前草案保持 `FAIL / No-Go` |
| UAT证据包生成器 | 已形成 | `scripts/v1-uat-evidence-pack.mjs` 可按具名测试环境、前后端地址、提交号和候选版本生成 UAT 证据包草稿，覆盖 UAT-001 至 UAT-010、缺陷汇总、Go/No-Go、签署和附件清单；配套 `scripts/v1-uat-evidence-pack.test.mjs` |
| UAT证据包准出校验器 | 已形成 | `scripts/v1-uat-evidence-pack-validate.mjs` 读取已填写 UAT 证据包，校验自动化结果、环境 Smoke、UAT-001 至 UAT-010、P0/P1缺陷、Go/No-Go判定、签署记录一致性、基本信息责任人必填且具名、已通过 UAT 用例验收人具名、已同意签署人具名和通过项可留存证据引用；配套 `scripts/v1-uat-evidence-pack-validate.test.mjs` |
| UAT证据清单准出校验器 | 已形成 | `scripts/v1-uat-evidence-manifest-validate.mjs` 读取 UAT 证据清单，校验 PRE/SMK/UAT/缺陷/签署/Go-No-Go 证据项完整、PASS 行 Owner 具名、PASS 行证据引用可留存、敏感材料拦截和 `Go` 判定一致性；配套 `scripts/v1-uat-evidence-manifest-validate.test.mjs` |
| UAT具名环境证据校验器 | 已形成 | `scripts/v1-uat-environment-validate.mjs` 读取具名测试环境证据，校验环境名称、前后端 `http(s)` 地址、40位 Git 提交号、ENV-001 至 ENV-008、PASS 环境检查 Owner 不得以角色标签替代姓名、证据引用必须指向 `docs/` 留存工件或外部 URL、责任人和敏感材料；配套 `docs/testing/v1-uat-environment-evidence.md` |
| UAT缺陷台账准出校验器 | 已形成 | `scripts/v1-uat-defect-register-validate.mjs` 读取 UAT 缺陷台账，校验 P0/P1 汇总、未关闭缺陷、`PRE-###`/`SMK-###`/`UAT-###` 来源用例、P0/P1 缺陷 Owner 不得以角色标签替代具体姓名、回归证据必须指向 `docs/` 留存工件或外部 URL、敏感材料和 Go/No-Go 判定一致性；配套 `docs/testing/v1-uat-defect-register.md` |
| UAT签署台账准出校验器 | 已形成 | `scripts/v1-uat-signoff-register-validate.mjs` 读取 UAT 签署台账，校验六方具体签署人姓名、不得以角色标签替代签署人、`YYYY-MM-DD` 签署日期、证据引用必须指向 `docs/` 留存工件或外部 URL、敏感材料和项目 `Go` 判定一致性；配套 `docs/testing/v1-uat-signoff-register.md` |
| UAT启动输入校验器 | 已形成 | `scripts/v1-uat-launch-intake-validate.mjs` 读取 UAT 启动输入，校验具名环境、前后端 `http(s)` URL、40位 Git 提交号、`YYYY-MM-DD HH:mm 至 YYYY-MM-DD HH:mm` UAT窗口、证据归档位置、具体参与人姓名、不得以角色标签替代参与人或账号保管 Owner、账号保管、证据引用必须指向 `docs/` 留存工件或外部 URL，以及敏感材料；配套 `docs/testing/v1-uat-launch-intake.md` |
| V1证据引用保全检查 | 已形成 | `scripts/v1-evidence-reference-check.mjs` 读取 UAT 证据清单，校验每个 `PASS` 行必须引用 `docs/` 下已归档工件或外部 URL，并拦截普通仓库文件和敏感材料；配套 `scripts/v1-evidence-reference-check.test.mjs` |
| V1 UAT覆盖检查 | 已形成 | `scripts/v1-uat-coverage-check.mjs` 校验 `docs/testing/crm-v1-test-environment-validation-runbook.md` 中 UAT-001 至 UAT-010 完整覆盖 AC-001 至 AC-017，且每条 UAT 用例具备操作人与证据要求，防止正式业务验收漏测或漏留痕；配套 `scripts/v1-uat-coverage-check.test.mjs` |
| V1外部UAT请求包 | 已形成 | `scripts/v1-external-uat-request.mjs` 面向项目/产品、测试、业务UAT和研发集中列出源文档、验证命令和当前 No-Go 阻塞请求；配套 `docs/testing/v1-external-uat-request.md` |
| V1外部UAT请求覆盖检查 | 已形成 | `scripts/v1-external-uat-request-coverage-check.mjs` 校验外部 UAT 请求包已列出当前每个失败 validator 的具体 `Gate/check-id`、全部补证命令和项目/测试/业务/研发责任侧路由，防止请求包漏掉实际阻塞项或责任入口；配套 `scripts/v1-external-uat-request-coverage-check.test.mjs` |
| V1最终放行门禁JSON快照 | 已形成 | `docs/testing/v1-release-gate-status.json` 保存当前 release gate 机器可读结果；`scripts/v1-generated-docs-check.mjs` 会防止该快照与当前门禁输出漂移，`scripts/v1-release-gate-status-check.mjs` 会校验 JSON schema、结果状态和值域稳定性 |
| V1最终交接证据一致性检查 | 已形成 | `scripts/v1-final-evidence-handoff-check.mjs` 校验 README、候选版本记录、自动化验证报告、Runbook、验收清单、UAT行动计划、UAT逐项执行包、Go/No-Go会议包和外部UAT请求包在 release gate `No-Go` 时继续保留最终门禁命令、外部 UAT/签署阻塞项，且不得误称 V1 已验收通过或可正式发布；配套 `scripts/v1-final-evidence-handoff-check.test.mjs` |
| V1证据秘密扫描 | 已形成 | `scripts/v1-secret-scan-check.mjs` 扫描当前 V1 验收证据文档、外部UAT请求包和 release gate JSON 快照，拦截明文密码、Bearer token、API key 或等价敏感材料；配套 `scripts/v1-secret-scan-check.test.mjs` |
| 部署配置检查器 | 已形成 | `scripts/v1-deployment-config-check.mjs` 检查 Dockerfile、Compose、`.env.example` 和部署手册是否支持可配置基础镜像，降低 Docker Hub token 超时对具名测试环境完整构建的影响；配套 `scripts/v1-deployment-config-check.test.mjs` |
| 本地具名验证环境执行记录 | 已形成 | `docs/testing/evidence/v1-local-uat-2026-06-18.md` 记录 `V1-local-uat-20260618` 的 PostgreSQL healthy、Flyway 14 个迁移、`/api/health`、`/api/bootstrap`、V1演示业务数据非空计数、周进展聚合探针和前端 HTTP 入口验证；Docker Hub 与 Browser 插件限制已单列 |
| 前端登录页渲染 | 已通过浏览器Smoke Test | `docs/testing/evidence/frontend-login-smoke.png` |
| 本地部署态登录和系统页Smoke | 已通过可复跑浏览器Smoke Test | PostgreSQL 16 + Spring Boot + Vite dev proxy；`npm run smoke:v1:browser` 验证 `demo_admin` 登录后系统管理页展示演示组织、用户、角色；console 0 warning/error |
| 部署态API bootstrap探针 | 已通过API Smoke Test | `POST /api/auth/login` + `GET /api/bootstrap` 返回 200，`permissions_count` 返回当前启用权限总数（本次Smoke观测为25） |
| 具名测试环境验收执行Runbook | 已形成 | `docs/testing/crm-v1-test-environment-validation-runbook.md` 覆盖环境前置、自动化命令、浏览器Smoke、业务演示脚本、证据包和签署模板 |
| UAT证据包与Go/No-Go模板 | 已形成 | `docs/testing/crm-v1-uat-evidence-pack-template.md` 覆盖自动化结果、环境账号、业务演示、缺陷汇总、上线观察、准出判定、签署和签署证据引用 |
| UAT执行派工与证据追踪表 | 已形成 | `docs/testing/crm-v1-uat-execution-tracker.md` 覆盖 PRE-001 至 PRE-006、SMK-001 至 SMK-005、UAT-001 至 UAT-010、缺陷闭环、签署角色和最终 release gate；`scripts/v1-uat-execution-tracker-validate.mjs` 校验当前执行状态、已签署角色负责人、已通过 UAT 用例验收人和通过项可留存证据引用 |
| 前端客户列表筛选与编辑 | 自动化已执行 | `frontend/src/App.test.tsx` 覆盖客户筛选查询参数和客户编辑 PATCH |
| 前端修改密码与字典维护 | 自动化已执行 | `frontend/src/App.test.tsx` 覆盖修改密码和新建字典 |
| 审计日志查询与展示 | 自动化已执行 | `AuditLogControllerTest` 覆盖审计查询和权限；`frontend/src/App.test.tsx` 覆盖系统页审计日志展示 |
| 用户、组织与角色授权基础维护 | 自动化已执行 | `IdentityAdminControllerTest` 覆盖组织列表/创建、用户列表/创建/编辑、权限点列表、角色权限替换和权限拦截；`frontend/src/App.test.tsx` 覆盖系统页组织新建、用户新增/编辑、用户展示和角色授权提交 |
| 周进展负责人和自然周筛选 | 自动化已执行 | `frontend/src/App.test.tsx` 覆盖周进展按 `owner_user_id`、`week_start`、`week_end` 查询参数筛选 |
| 联系人关系分组视图 | 自动化已执行 | `frontend/src/App.test.tsx` 覆盖联系人按项目角色和态度分组展示 |
| 登录、登出、修改密码、重置密码 | 已覆盖 | AC-001、AC-002 |
| 用户、组织、角色、权限、数据范围 | 已覆盖 | AC-003 至 AC-005 |
| 销售创建客户、联系人、商机、销售行动 | 已覆盖 | AC-006 至 AC-010 |
| 商机阶段和状态独立维护 | 已覆盖 | AC-008 |
| 商机关闭和取消跟进必须填写原因 | 已覆盖 | AC-009 |
| 销售行动完成后自动回写客户和商机最近跟进 | 已覆盖 | AC-011 |
| 商机周进展由销售行动自动汇总生成 | 已覆盖 | AC-013 |
| 销售负责人查看本部门客户、商机、行动 | 已覆盖 | AC-015 |
| 销售个人不能越权查看无关数据 | 已覆盖 | AC-016 |
| 关键操作可以在审计日志中查看 | 已覆盖 | AC-017 |
