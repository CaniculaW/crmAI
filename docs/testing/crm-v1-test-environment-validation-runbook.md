# CRM V1 具名测试环境验收执行 Runbook

日期：2026-06-18

本文用于把研发侧已通过的 V1 自动化验证结果，转化为测试/业务侧可在具名测试环境执行、留痕和签署的验收步骤。

适用范围：

- V1 试点测试环境部署态验收。
- 销售侧和管理侧业务验收演示。
- 上线前准出复核。

配套模板：

- `docs/testing/crm-v1-uat-evidence-pack-template.md`：用于汇总验收证据、缺陷状态、Go/No-Go 判定和签署记录。
- `docs/testing/crm-v1-uat-execution-tracker.md`：用于把 PRE、SMK、UAT-001 至 UAT-010、缺陷和签署逐项派工、追踪和归档。
- `docs/testing/v1-uat-launch-intake.md`：用于在正式 UAT 启动前收敛具名环境、UAT窗口、证据归档位置、参与人和账号准备状态。
- `docs/meeting-notes/crm-kickoff-minutes.md`：用于收敛产品、业务验收、研发、前端、后端和测试负责人，以及 V1 范围冻结结论。
- `docs/testing/v1-uat-environment-evidence.md`：用于记录具名测试环境、前后端地址、账号 Smoke、权限样本和浏览器 Smoke 证据。
- `docs/testing/v1-uat-defect-register.md`：用于记录 P0/P1 缺陷闭环、回归证据和项目准出结论。
- `docs/testing/v1-uat-signoff-register.md`：用于记录销售侧、管理侧、产品、测试、研发和项目负责人六方签署结论。
- `scripts/v1-uat-evidence-pack.mjs`：用于按具名测试环境参数生成 UAT 证据包草稿，不写入明文密码或 API Token。
- `scripts/v1-uat-launch-intake-validate.mjs`：用于在正式 UAT 启动前校验具名环境、参与人、账号保管、UAT窗口和证据归档位置。
- `scripts/v1-kickoff-governance-validate.mjs`：用于在正式 UAT 准出前校验启动会负责人、业务验收人、V1范围冻结、项目 Go 结论和敏感材料。
- `scripts/v1-uat-evidence-pack-validate.mjs`：用于在证据包填写完成后校验 Go/No-Go 条件、P0/P1 缺陷和签署是否一致。
- `scripts/v1-uat-environment-validate.mjs`：用于在具名环境证据填写完成后校验 ENV-001 至 ENV-008、环境元数据和敏感材料。
- `scripts/v1-uat-defect-register-validate.mjs`：用于在缺陷台账填写完成后校验 P0/P1 未关闭数量、回归证据、敏感材料和 Go/No-Go 条件。
- `scripts/v1-uat-signoff-register-validate.mjs`：用于在签署台账填写完成后校验六方签署、项目 `Go` 结论、证据引用和敏感材料。
- `scripts/v1-deployment-config-check.mjs`：用于确认 Compose、Dockerfile 和部署手册支持企业镜像代理或内网镜像仓库覆盖基础镜像。

不适用范围：

- 生产环境开通审批。
- V2 合同、开票、回款和经营驾驶舱验收。
- 替代真实业务代表签署。

## 1. 验收前置条件

| 编号 | 前置项 | 验收口径 | 责任侧 | 证据 |
|---|---|---|---|---|
| PRE-001 | 测试环境域名 | 前端域名和后端 `/api/health` 可访问 | 研发/运维 | 域名、健康检查截图或命令输出 |
| PRE-002 | 数据库迁移 | PostgreSQL 已执行 Flyway 14 个迁移脚本 | 研发/运维 | 应用启动日志或 `flyway_schema_history` 截图 |
| PRE-003 | 基础账号 | 至少具备管理员、销售个人、销售负责人三类账号 | 研发/测试 | 账号清单，不在文档中记录明文密码 |
| PRE-004 | 组织和角色 | 测试环境组织、用户、角色、权限可维护 | 测试/业务 | 系统管理页截图 |
| PRE-005 | 试点样例数据 | 可创建客户、联系人、商机、销售行动和周进展样本 | 测试/业务 | 样例数据编号或截图 |
| PRE-006 | 验收人 | 销售侧验收人和管理侧验收人已具名 | 项目/业务 | 会议纪要 |

## 2. 环境变量和命令

### 2.1 后端运行参数

测试环境若使用演示种子，需明确仅用于测试环境：

```bash
CRM_DB_URL=jdbc:postgresql://<host>:<port>/<database>
CRM_DB_USERNAME=<username>
CRM_DB_PASSWORD=<password>
CRM_SEED_V1_DEMO_ENABLED=true
```

要求：

- 不得在 `prod` profile 下启用 `CRM_SEED_V1_DEMO_ENABLED=true`。
- 若测试环境使用真实测试账号，可以关闭演示种子，但仍需准备管理员、销售个人、销售负责人账号。

### 2.2 自动化验证命令

在代码仓库中执行：

```bash
node scripts/v1-deployment-config-check.mjs
docker compose -f compose.v1-test.yml config
```

若测试机访问 Docker Hub token 接口超时，先按 `docs/deployment/v1-test-environment-compose.md` 在 `.env` 中配置 `CRM_BACKEND_BUILD_IMAGE`、`CRM_BACKEND_RUNTIME_IMAGE`、`CRM_FRONTEND_BUILD_IMAGE`、`CRM_FRONTEND_RUNTIME_IMAGE` 和 `CRM_POSTGRES_IMAGE`，再执行完整 Compose 启动。本地已使用 `docker.1ms.run/library/*` 镜像代理完成过 Compose 构建、启动和 Smoke，证据见 `docs/testing/evidence/v1-compose-uat-2026-06-19.md`。

```bash
cd backend
mvn test
mvn verify -Ppostgres-it
```

```bash
cd frontend
npm test
npm run build
```

测试环境前端和后端启动后执行浏览器 Smoke：

```bash
cd frontend
CRM_SMOKE_URL=https://<test-frontend-domain>/system \
CRM_SMOKE_USERNAME=<test-admin-username> \
CRM_SMOKE_PASSWORD=<test-admin-password> \
CRM_SMOKE_EXPECTED_TEXTS="<组织名称>,<管理员姓名>,<角色编码>" \
npm run smoke:v1:browser
```

若测试环境通过本地端口或跳板机访问，可以把 `CRM_SMOKE_URL` 指向实际可访问地址。

生成 UAT 证据包草稿：

```bash
node scripts/v1-uat-evidence-pack.mjs \
  --environment <test-env-name> \
  --frontend-url <test-frontend-url> \
  --backend-url <test-backend-url> \
  --git-commit <git-sha> \
  --rc <release-candidate> \
  --username <masked-admin-user> \
  > crm-v1-uat-evidence-pack.md
```

注意：不要向生成器传入明文密码、生产密钥或 API Token。

UAT启动输入填写后执行状态校验：

```bash
node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md
```

要求：正式 UAT 执行前，启动输入 validator 必须返回 `PASS`；若返回 `FAIL`，按输出补齐测试环境、UAT窗口、证据归档位置、参与人、联系方式或账号保管证据。

启动治理纪要填写后执行状态校验：

```bash
node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md
```

要求：正式准出前，启动治理 validator 必须返回 `PASS`；若返回 `FAIL`，按输出补齐产品负责人、销售侧/管理侧业务验收人、研发负责人、前端负责人、后端负责人、测试负责人、V1范围冻结状态或项目 `Go` 结论。

证据包填写完成后执行准出一致性校验：

```bash
node scripts/v1-uat-evidence-pack-validate.mjs crm-v1-uat-evidence-pack.md
```

要求：若选择 `Go`，validator 必须返回 `PASS`；若返回 `FAIL`，需先补齐证据、关闭阻断缺陷或把结论调整为符合实际的 `Conditional Go` / `No-Go`。

具名测试环境证据填写后执行状态校验：

```bash
node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md
```

要求：正式准出前，环境证据 validator 必须返回 `PASS`；若返回 `FAIL`，按输出补齐测试环境名称、前后端地址、提交号、账号、权限样本或 Smoke 证据。

UAT执行追踪表填写后执行状态校验：

```bash
node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md
```

要求：正式准出前，tracker validator 必须返回 `PASS`；若返回 `FAIL`，按输出补齐角色、PRE、SMK、UAT、P0/P1、签署或 release gate 状态。

UAT缺陷台账填写后执行状态校验：

```bash
node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md
```

要求：正式准出前，缺陷台账 validator 必须返回 `PASS`；若返回 `FAIL`，按输出补齐 P0/P1 汇总、缺陷明细、回归证据或项目 Go/No-Go 结论。

UAT签署台账填写后执行状态校验：

```bash
node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md
```

要求：正式准出前，签署台账 validator 必须返回 `PASS`；若返回 `FAIL`，按输出补齐具名签署人、签署日期、签署结论、会议纪要或项目 `Go` 结论。

需要项目例会或验收推进页时，生成聚合状态报告：

```bash
node scripts/v1-validation-status.mjs --output docs/testing/v1-validation-status.md
```

该报告只汇总现有 validators 的结果，不替代 UAT 执行、缺陷闭环或签署。

需要把阻塞项拆成角色工作流时，生成 UAT 行动计划：

```bash
node scripts/v1-uat-action-plan.mjs --output docs/testing/v1-uat-action-plan.md
```

该行动计划用于项目/产品、测试、业务UAT和研发分工推进；不替代 tracker、证据包 validator 或最终 release gate。

需要召开正式 Go/No-Go 准出会议时，生成会议包：

```bash
node scripts/v1-go-no-go-meeting.mjs --output docs/testing/v1-go-no-go-meeting.md
```

该会议包集中列出参会角色、门禁命令、开放阻塞项和最终签署表；只有证据包 validator、tracker validator、最终 release gate 全部通过且项目负责人选择 `Go` 后，才能作为准出会议留痕。

正式准出前执行最终放行门禁：

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

该门禁必须在启动治理、UAT 启动输入、UAT 具名环境证据、UAT 证据包、执行追踪表、证据清单、缺陷台账和签署台账全部 `PASS`，且项目负责人选择 `Go` 后返回 `PASS`。

## 3. 测试环境 Smoke 步骤

| 编号 | 步骤 | 通过标准 | 证据 |
|---|---|---|---|
| SMK-001 | 访问前端登录页 | 页面展示项目型大客户 CRM 登录表单，无框架错误覆盖层 | 截图 |
| SMK-002 | 管理员登录 | 登录成功，进入系统页面或工作台 | 截图、浏览器 Smoke 输出 |
| SMK-003 | 系统管理页检查 | 组织、用户、角色权限列表可见 | 截图、`npm run smoke:v1:browser` 输出 |
| SMK-004 | API bootstrap | 管理员调用 `/api/bootstrap` 返回 200，包含当前用户、权限数和 V1 计数 | curl 输出或接口工具截图 |
| SMK-005 | Console 健康 | 浏览器 console 无 warning/error | Smoke 输出 |

API bootstrap 示例：

```bash
TOKEN=$(curl -s https://<test-backend-domain>/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'X-Trace-Id: v1-test-login' \
  -d '{"username":"<test-admin-username>","password":"<test-admin-password>"}' \
  | jq -r '.data.access_token')

curl -s https://<test-backend-domain>/api/bootstrap \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'X-Trace-Id: v1-test-bootstrap'
```

## 4. V1 业务验收演示脚本

| 编号 | 演示链路 | 操作人 | 通过标准 | 对应验收项 |
|---|---|---|---|---|
| UAT-001 | 登录、退出、修改密码 | 销售个人 | 账号可登录、可修改密码、退出后需重新登录 | AC-001 |
| UAT-002 | 管理员重置密码 | 管理员 | 可重置测试用户密码，非管理员无法重置 | AC-002 |
| UAT-003 | 组织、用户、角色、权限、字典维护 | 管理员 | 可维护组织、用户、角色权限和 V1 字典 | AC-003、AC-004 |
| UAT-004 | 客户和联系人建档 | 销售个人 | 可新建客户、联系人，并查看关系分组 | AC-006、AC-007 |
| UAT-005 | 商机创建与推进 | 销售个人 | 可创建商机、维护阶段/状态/风险字段 | AC-008 |
| UAT-006 | 销售行动完成 | 销售个人 | 可创建并完成行动，客户和商机最近跟进自动回写 | AC-010、AC-011 |
| UAT-007 | 风险行动与周进展 | 销售个人/负责人 | 风险说明进入周进展，周进展按自然周汇总 | AC-012、AC-013 |
| UAT-008 | 商机关闭或取消跟进 | 销售个人 | 必填原因，关闭/取消后不进入默认跟进列表 | AC-009 |
| UAT-009 | 团队查看和个人越权 | 负责人/销售个人 | 负责人可看本部门；个人不能看无关数据 | AC-015、AC-016 |
| UAT-010 | 关键审计日志 | 管理员 | 登录、密码、权限、商机关闭、行动完成可追溯 | AC-017 |

## 5. 证据包目录建议

建议测试侧按以下结构归档，并使用 `crm-v1-uat-evidence-pack-template.md` 形成可签署的汇总记录。不提交明文密码：

```text
v1-uat-evidence/
  01-environment/
    health-check.txt
    migration-history.png
  02-smoke/
    browser-smoke-output.json
    browser-smoke-system-page.png
    bootstrap-response.json
  03-business-demo/
    uat-001-login.png
    uat-004-account-contact.png
    uat-006-activity-complete.png
    uat-007-weekly-progress.png
    uat-008-opportunity-close.png
    uat-010-audit-log.png
  04-signoff/
    crm-v1-uat-evidence-pack.md
    v1-uat-signoff-register.md
    v1-uat-launch-intake.md
    crm-kickoff-minutes.md
    meeting-minutes.md
    defect-summary.md
    v1-uat-defect-register.md
    go-no-go.md
```

执行派工和逐项状态先维护在 `docs/testing/crm-v1-uat-execution-tracker.md`，正式证据包只收敛最终结果、缺陷状态和签署记录。

## 6. 准出判定

| 判定项 | 通过条件 | 不通过处理 |
|---|---|---|
| 自动化验证 | `mvn test`、`mvn verify -Ppostgres-it`、`npm test`、`npm run build` 通过 | 回退到研发修复 |
| 启动治理 validator | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` 返回 PASS | 补齐负责人、业务验收人、V1范围冻结或项目 `Go` 结论 |
| 部署态 Smoke | `npm run smoke:v1:browser` 和 `/api/bootstrap` 通过 | 先定位环境、账号、代理或权限配置 |
| 环境证据 validator | `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` 返回 PASS | 修正环境元数据、账号证据、权限样本或 Smoke 证据 |
| UAT启动输入 validator | `node scripts/v1-uat-launch-intake-validate.mjs docs/testing/v1-uat-launch-intake.md` 返回 PASS | 补齐具名环境、UAT窗口、证据归档位置、参与人或账号保管证据 |
| P0 用例 | P0 全部通过，无阻断缺陷 | 不准出 |
| P1 用例 | P1 完成执行，遗留问题有项目/业务确认 | 形成规避方案或延期单 |
| 缺陷台账 validator | `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` 返回 PASS | 修正缺陷汇总、关闭状态、回归证据或 Go/No-Go 结论 |
| 业务验收 | 销售侧、管理侧验收人完成演示或试用确认 | 安排补验 |
| 签署台账 validator | `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md` 返回 PASS | 补齐六方具名签署、签署日期、证据引用或项目 `Go` 结论 |
| 上线风险 | 遗留缺陷、观察项、回滚条件已记录 | 补充上线风险清单 |
| 证据包 validator | `node scripts/v1-uat-evidence-pack-validate.mjs <证据包>` 返回 PASS | 修正证据包、缺陷状态或准出结论 |

## 7. 验收会议纪要模板

```text
会议名称：CRM V1 试点验收会
日期：
测试环境：
前端版本/提交：
后端版本/提交：

参会人：
- 销售侧验收人：
- 管理侧验收人：
- 产品负责人：
- 研发负责人：
- 测试负责人：

自动化验证结论：
- mvn test：
- mvn verify -Ppostgres-it：
- npm test：
- npm run build：
- npm run smoke:v1:browser：

业务演示结论：
- UAT-001 登录/密码：
- UAT-004 客户/联系人：
- UAT-006 销售行动：
- UAT-007 周进展：
- UAT-008 商机关闭：
- UAT-009 权限边界：
- UAT-010 审计日志：

遗留缺陷：
- P0：
- P1：
- P2/P3：

Go/No-Go 结论：

签署：
- 销售侧验收人：
- 管理侧验收人：
- 项目负责人：
```

## 8. 当前边界声明

研发侧已经提供代码级、接口级、数据库迁移级、前端交互级、本地部署态和可复跑浏览器 Smoke 证据。具名测试环境验证和业务签署必须由项目、测试、业务侧在真实测试环境完成，本文只提供执行路径和证据模板。
