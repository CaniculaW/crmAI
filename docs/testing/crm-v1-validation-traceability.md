# CRM V1 验证追踪矩阵

日期：2026-06-18

本文用于把 `crm-v1-acceptance-checklist.md` 中的 V1 上线验收项逐项追踪到当前研发证据。状态口径分为：

- 研发验证通过：已有自动化测试、构建、契约或本地部署态 Smoke 证据。
- 业务待验收：研发证据已覆盖主路径，但仍需销售侧/管理侧在具名测试环境中演示或签署。
- 外部待确认：依赖具名测试环境、真实验收人、试点数据或业务规则确认。

## 1. 当前总览

| 类别 | 数量 | 说明 |
|---|---:|---|
| 研发验证通过 | 17 | AC-001 至 AC-017 均已有研发侧自动化或本地部署态证据 |
| 业务待验收 | 17 | 所有 AC 仍需业务侧在具名测试环境中确认试点可用性 |
| 外部待确认 | 3 | 测试环境部署、真实试点账号/数据、验收人签署 |

具名测试环境执行路径见 `docs/testing/crm-v1-test-environment-validation-runbook.md`。

## 2. 验收项追踪

| 验收项 | 研发侧状态 | 主要证据 | 业务/环境剩余动作 |
|---|---|---|---|
| AC-001 用户登录、登出、修改密码 | 研发验证通过 | `AuthControllerTest`、`PasswordManagementControllerTest`、`frontend/src/App.test.tsx`、本地浏览器 Smoke | 业务侧确认登录/退出/改密操作符合试点习惯 |
| AC-002 管理员重置密码 | 研发验证通过 | `PasswordManagementControllerTest`、`IdentityAdminControllerTest`、`frontend/src/App.test.tsx` | 正式测试账号策略和首次登录策略待确认 |
| AC-003 组织、用户、角色、权限、字典维护 | 研发验证通过 | `IdentityAdminControllerTest`、`DictionaryControllerTest`、`frontend/src/App.test.tsx`、本地系统管理页 Smoke | 项目侧确认试点组织、岗位和角色映射 |
| AC-004 菜单和操作权限 | 研发验证通过 | `AuthControllerTest`、`IdentityAdminControllerTest`、`frontend/src/App.test.tsx` | 业务侧按真实角色抽样验收菜单和按钮 |
| AC-005 数据范围 | 研发验证通过 | `DataPermissionServiceTest`、`V1WorkflowIntegrationTest` | 试点组织树、协同规则和跨部门边界需在测试环境复核 |
| AC-006 客户日常管理 | 研发验证通过 | `AccountControllerTest`、`V1WorkflowIntegrationTest`、`frontend/src/App.test.tsx` | 业务侧确认字段、筛选和详情入口满足日常使用 |
| AC-007 联系人与关系视图 | 研发验证通过 | `ContactControllerTest`、`frontend/src/App.test.tsx` | 业务侧确认关系分组口径和关键联系人字段 |
| AC-008 商机日常管理 | 研发验证通过 | `OpportunityControllerTest`、`V1WorkflowIntegrationTest`、`frontend/src/App.test.tsx` | 业务侧确认阶段、状态、风险字段命名和操作顺序 |
| AC-009 商机关闭和取消跟进 | 研发验证通过 | `OpportunityControllerTest`、`V1WorkflowIntegrationTest` | 关闭类型、取消原因字典仍需业务最终确认 |
| AC-010 销售行动日常管理 | 研发验证通过 | `ActivityControllerTest`、`V1WorkflowIntegrationTest`、`frontend/src/App.test.tsx` | 业务侧确认行动类型、结果和下一步计划字段 |
| AC-011 最近跟进自动回写 | 研发验证通过 | `ActivityControllerTest`、`V1WorkflowIntegrationTest` | 业务侧抽样确认列表/详情展示口径 |
| AC-012 风险触发 | 研发验证通过 | `ActivityControllerTest`、`V1WorkflowIntegrationTest` | 风险行动到商机风险状态映射规则需业务确认 |
| AC-013 周进展自动生成 | 研发验证通过 | `V1WorkflowIntegrationTest`、`frontend/src/App.test.tsx` | 业务侧确认周会可用性和自然周口径 |
| AC-014 核心集成链路 | 研发验证通过 | `V1WorkflowIntegrationTest`、本地部署态 API/浏览器 Smoke | 具名测试环境端到端演示待执行 |
| AC-015 销售负责人查看团队 | 研发验证通过 | `DataPermissionServiceTest`、`V1WorkflowIntegrationTest` | 试点负责人账号和部门树待确认 |
| AC-016 个人不能越权 | 研发验证通过 | `DataPermissionServiceTest`、`V1WorkflowIntegrationTest` | 业务/测试侧按真实组织进行越权抽样 |
| AC-017 关键操作审计日志 | 研发验证通过 | `AuditLogControllerTest`、`AuditLogServiceTest`、`V1WorkflowIntegrationTest`、`frontend/src/App.test.tsx` | 审计抽样标准和保留字段需项目侧确认 |

## 3. 当前验证命令

| 命令 | 覆盖目的 | 最近结果 |
|---|---|---|
| `mvn test` | 后端单元、接口集成、核心闭环、OpenAPI 覆盖 | 56 tests passed |
| `mvn verify -Ppostgres-it` | 后端全量测试、打包、PostgreSQL 迁移集成 | 56 surefire tests passed；1 PostgreSQL IT passed |
| `npm test` | 前端登录、权限菜单、系统管理、CRM页面基础交互、浏览器Smoke脚本辅助逻辑 | 16 tests passed |
| `npm run build` | TypeScript 编译与 Vite 生产构建 | Build succeeded |
| 本地 API Smoke | 演示账号登录和 `/api/bootstrap` 部署态探针 | HTTP 200，`permissions_count` 返回当前启用权限总数（本次Smoke观测为25） |
| `npm run smoke:v1:browser` | 登录后系统管理页展示演示组织、用户、角色 | console 0 warning/error |
| `node scripts/v1-uat-evidence-pack-validate.mjs <证据包>` | UAT 证据包 Go/No-Go、P0/P1缺陷、业务签署和证据完整性准出校验 | 待具名测试环境 UAT 证据包填写后执行 |

## 4. 不应由研发侧伪造的完成项

| 项目 | 为什么不能伪造 | 需要谁完成 |
|---|---|---|
| 销售侧和管理侧验收人签署 | 需要真实业务代表确认试点可用性 | 项目/业务 |
| 具名测试环境部署态验收 | 需要真实域名、账号、环境配置和网络链路；执行步骤见 `crm-v1-test-environment-validation-runbook.md`，证据包填写后需通过 validator | 研发/运维/测试 |
| 试点组织、角色和样例业务数据确认 | 需要客户真实组织与试点策略 | 产品/业务/测试 |

## 5. 结论

研发侧已经具备 V1 代码级、接口级、数据库迁移级、前端交互级和本地部署态验证证据。若目标口径是“研发侧 V1 验证通过”，当前证据已闭合；若目标口径是“项目 V1 验收通过”，仍需完成具名测试环境验证和业务验收签署。
