# CRM V1 UAT 证据包与 Go/No-Go 记录（rc.8草稿）

填写原则：不记录明文密码、生产密钥、API Token 或个人敏感信息。截图和命令输出需来自具名测试环境，或明确标记为本地验证。

> 状态：工程侧交接草稿。本文件已预填 rc.8 自动化和本地验证证据，但尚未完成项目指定具名测试环境 UAT、缺陷闭环和业务签署，因此不能作为 `Go` 准出记录。

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 验收日期 | 2026-06-19 |
| 测试环境名称 | V1-local-uat-20260618 |
| 前端访问地址 | http://127.0.0.1:5175/system |
| 后端 API 地址 | http://127.0.0.1:8080 |
| Git 提交号 | 0c9db47b0df8a0b05e63b66bdaa09f46222d9f0c |
| 候选版本 | v1.0.0-rc.8 |
| 前端版本/构建号 | 本地 Vite build；远端 CI run 27776171025 |
| 后端版本/构建号 | Maven package；远端 CI run 27776171025 |
| 数据库版本 | PostgreSQL 16.14 |
| 测试负责人 | 待填写 |
| 产品负责人 | 待填写 |
| 研发负责人 | Codex研发Agent |
| 销售侧验收人 | 待填写 |
| 管理侧验收人 | 待填写 |

## 2. 自动化验证结果

| 命令 | 执行环境 | 结果 | 证据文件 |
|---|---|---|---|
| `mvn test` | 本地 + GitHub Actions | 通过 | `docs/releases/v1.0.0-rc.8.md`；GitHub Actions run `27776171025` |
| `mvn verify -Ppostgres-it` | 本地 + GitHub Actions | 通过 | `docs/releases/v1.0.0-rc.8.md`；GitHub Actions run `27776171025` |
| `npm test` | 本地 + GitHub Actions | 通过 | `docs/releases/v1.0.0-rc.8.md`；GitHub Actions run `27776171025` |
| `npm run build` | 本地 + GitHub Actions | 通过 | `docs/releases/v1.0.0-rc.8.md`；GitHub Actions run `27776171025` |
| `npm run smoke:v1:browser` | 本地 V1-local-uat-20260618 | 通过 | `docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png` |
| `/api/bootstrap Smoke` | 本地 V1-local-uat-20260618 | 通过 | `docs/testing/evidence/v1-local-uat-2026-06-18.md` |

自动化结论：

```text
工程侧自动化、本地服务级 Smoke 和远端 V1 Validation 已通过。正式准出仍需项目指定具名测试环境复测和业务签署。
```

## 3. 环境与账号证据

| 证据项 | 通过标准 | 结果 | 证据文件 |
|---|---|---|---|
| 前端登录页可访问 | 显示 CRM 登录表单，无框架错误覆盖层 | 通过 | `docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png` |
| 后端健康检查 | /api/health 返回 200 | 通过 | `docs/testing/evidence/v1-local-uat-2026-06-18.md` |
| 数据库迁移 | Flyway 14 个迁移脚本完成 | 通过 | `docs/testing/evidence/v1-local-uat-2026-06-18.md` |
| 管理员账号 | 可登录，可进入系统管理页 | 通过 | `docs/testing/evidence/v1-local-uat-2026-06-18.md` |
| 销售个人账号 | 可登录，可创建客户/商机/行动 | 待执行 | 项目具名测试环境补充 |
| 销售负责人账号 | 可查看本部门数据 | 待执行 | 项目具名测试环境补充 |
| 权限样本账号 | 可验证本人、本部门、协同、全局四类数据范围 | 待执行 | 项目具名测试环境补充 |

账号说明：

```text
管理员或测试账号脱敏标识：demo_admin
只记录账号类型、账号编号或脱敏用户名，不记录明文密码。
```

## 4. 业务演示验收记录

| 编号 | 验收链路 | 验收人 | 结果 | 证据文件 | 遗留问题 |
|---|---|---|---|---|---|
| UAT-001 | 登录、退出、修改密码 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-002 | 管理员重置密码 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-003 | 组织、用户、角色、权限、字典维护 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-004 | 客户和联系人建档 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-005 | 商机创建与推进 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-006 | 销售行动完成与最近跟进回写 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-007 | 风险行动与周进展 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-008 | 商机关闭或取消跟进 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-009 | 团队查看和个人越权 | 待填写 | 待执行 | 待填写 | 待填写 |
| UAT-010 | 关键审计日志 | 待填写 | 待执行 | 待填写 | 待填写 |

业务验收结论：

```text
待填写销售侧和管理侧对 V1 是否可进入试点的意见。
```

## 5. 缺陷汇总

| 等级 | 数量 | 未关闭数量 | 准出影响 | 处理结论 |
|---|---:|---:|---|---|
| P0 / S1 阻断 | 待填写 | 待填写 | 不允许准出 | 待填写 |
| P1 / S2 严重 | 待填写 | 待填写 | 需关闭或形成业务认可规避方案 | 待填写 |
| P2 / S3 一般 | 待填写 | 待填写 | 可进入版本修复池，需评估试点影响 | 待填写 |
| P3 / S4 轻微 | 待填写 | 待填写 | 可后续优化 | 待填写 |

## 6. 上线观察项与回滚条件

| 类型 | 内容 | 触发条件 | 责任人 |
|---|---|---|---|
| 观察项 | 销售行动录入率 | 试点首周低于约定下限 | 待填写 |
| 观察项 | 周进展完整率 | 有已完成行动但周进展缺失 | 待填写 |
| 观察项 | 权限问题数量 | 出现越权或应看不可看问题 | 待填写 |
| 回滚条件 | 主流程不可用 | 登录、客户、商机、行动、周进展任一核心链路阻断 | 待填写 |
| 回滚条件 | 数据权限越权 | 销售个人可查看无关客户/商机/行动 | 待填写 |
| 回滚条件 | 核心数据错误 | 行动完成后最近跟进或周进展大量错漏 | 待填写 |

## 7. Go/No-Go 判定

| 判定项 | Go 条件 | 当前结果 | 是否满足 |
|---|---|---|---|
| 自动化验证 | 后端、前端、构建、浏览器 Smoke 均通过 | 工程侧已通过 | 是 |
| 测试环境 Smoke | 登录、系统管理、bootstrap 均通过 | 本地已通过，具名测试环境待执行 | 否 |
| P0 缺陷 | 无未关闭 P0/S1 | 待填写 | 待填写 |
| P1 缺陷 | 已关闭或业务认可规避方案 | 待填写 | 待填写 |
| 业务验收 | 销售侧、管理侧完成确认 | 待填写 | 否 |
| 上线风险 | 观察项和回滚条件已记录 | 草稿已列出，责任人待指定 | 否 |

Go/No-Go 结论：

```text
选择：No-Go

结论说明：当前为工程侧交接草稿。待具名测试环境 UAT、缺陷闭环和业务签署完成后，重新运行 validator 并形成正式 Go/No-Go 记录。
```

证据包 validator：

```bash
node scripts/v1-uat-evidence-pack-validate.mjs docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md
```

```text
实测结果：FAIL。
Decision: No-Go。
失败项：草稿占位符未清理；销售个人账号、销售负责人账号、权限样本账号未在具名测试环境验证；UAT-001 至 UAT-010 未执行业务验收；P0/P1缺陷汇总未填写；Go/No-Go 硬门未满足；销售侧、管理侧、产品、测试、研发和项目负责人签署未完成。
```

最终 V1 放行门禁：

```bash
node scripts/v1-release-gate.mjs . \
  docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md \
  docs/testing/crm-v1-uat-execution-tracker.md \
  docs/testing/v1-uat-evidence-manifest.md \
  docs/testing/v1-uat-defect-register.md \
  docs/testing/v1-uat-environment-evidence.md \
  docs/testing/v1-uat-signoff-register.md
```

```text
实测结果：FAIL。
Decision: No-Go。
失败项：当前证据包未通过正式 UAT validator，UAT具名环境证据、UAT执行追踪表、证据清单、缺陷台账和签署台账仍未完成，且项目决策不是 Go。该结果符合草稿态预期。
```

## 8. 签署

| 角色 | 姓名 | 结论 | 日期 |
|---|---|---|---|
| 销售侧验收人 | 待填写 | 同意 / 不同意 | 待填写 |
| 管理侧验收人 | 待填写 | 同意 / 不同意 | 待填写 |
| 产品负责人 | 待填写 | 同意 / 不同意 | 待填写 |
| 测试负责人 | 待填写 | 同意 / 不同意 | 待填写 |
| 研发负责人 | 待填写 | 同意 / 不同意 | 待填写 |
| 项目负责人 | 待填写 | Go / Conditional Go / No-Go | 待填写 |

## 9. 附件清单

| 附件 | 说明 | 路径或链接 |
|---|---|---|
| 自动化验证日志 | CI 链接 | `https://github.com/CaniculaW/crmAI/actions/runs/27776171025` |
| 浏览器 Smoke 截图 | 系统管理页截图 | `docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png` |
| bootstrap 响应 | 脱敏后的 JSON 输出 | `docs/testing/evidence/v1-local-uat-2026-06-18.md` |
| 业务演示截图 | UAT-001 至 UAT-010 关键截图 | 待填写 |
| 缺陷列表 | 缺陷平台导出或汇总表 | 待填写 |
| 会议纪要 | 验收会纪要 | 待填写 |
| 证据包 validator 输出 | Go/No-Go 一致性校验结果 | 本文件第7章记录草稿态 FAIL 摘要 |
