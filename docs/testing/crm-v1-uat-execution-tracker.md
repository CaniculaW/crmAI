# CRM V1 UAT执行派工与证据追踪表

版本：v1.0.0-rc.8

状态：具名测试环境待确认。当前工程侧证据已完成，正式 UAT 仍为 `No-Go`，不得把本表的待执行项视为已通过。

配套材料：

- Runbook：`docs/testing/crm-v1-test-environment-validation-runbook.md`
- UAT证据包模板：`docs/testing/crm-v1-uat-evidence-pack-template.md`
- UAT具名测试环境证据：`docs/testing/v1-uat-environment-evidence.md`
- UAT证据清单：`docs/testing/v1-uat-evidence-manifest.md`
- UAT缺陷台账：`docs/testing/v1-uat-defect-register.md`
- UAT签署台账：`docs/testing/v1-uat-signoff-register.md`
- 启动治理纪要：`docs/meeting-notes/crm-kickoff-minutes.md`
- rc.8交接草稿：`docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md`
- Compose部署态证据：`docs/testing/evidence/v1-compose-uat-2026-06-19.md`
- 最终放行门禁：`node scripts/v1-release-gate.mjs . <crm-v1-uat-evidence-pack.md> docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md`

## 1. 执行原则

- 不记录明文密码、生产密钥、API Token 或个人敏感信息。
- 每个通过项必须有截图、命令输出、缺陷单或会议纪要之一作为证据。
- UAT证据包填写后必须执行 `node scripts/v1-uat-evidence-pack-validate.mjs <crm-v1-uat-evidence-pack.md>`。
- UAT具名测试环境证据填写后必须执行 `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md`。
- UAT证据清单填写后必须执行 `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md`。
- 本追踪表填写后必须执行 `node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md`。
- UAT缺陷台账填写后必须执行 `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md`。
- UAT签署台账填写后必须执行 `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md`。
- 启动治理纪要填写后必须执行 `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md`。
- V1最终验证通过必须执行 `node scripts/v1-release-gate.mjs . <crm-v1-uat-evidence-pack.md> docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` 并返回 `PASS`。
- 当前 rc.8 草稿为 `No-Go`；具名测试环境、业务验收、缺陷闭环和签署完成前，不得改写为 `Go`。

## 2. 角色与签署责任

| 角色 | 当前负责人 | 责任 | 状态 |
|---|---|---|---|
| 销售侧验收人 | 待项目指定 | 验收销售个人主流程、客户/联系人/商机/行动可用性 | 待确认 |
| 管理侧验收人 | 待项目指定 | 验收团队查看、周进展、权限边界和管理口径 | 待确认 |
| 产品负责人 | 待项目指定 | 确认V1范围、验收口径和遗留需求处理 | 待确认 |
| 测试负责人 | 待项目指定 | 组织UAT执行、缺陷归档、回归和证据包质量 | 待确认 |
| 研发负责人 | Codex研发Agent | 提供版本、自动化、部署和缺陷修复支持 | 工程侧已就绪 |
| 项目负责人 | 待项目指定 | 组织Go/No-Go会议并做最终准出判定 | 待确认 |

## 3. 前置检查派工

| 编号 | 检查项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
| PRE-001 | 测试环境域名可访问，前端和 `/api/health` 可用 | 研发/运维 | 域名、健康检查输出或截图 | 待执行 |
| PRE-002 | PostgreSQL已完成 Flyway 14 个迁移脚本 | 研发/运维 | 启动日志或迁移历史截图 | 待执行 |
| PRE-003 | 管理员、销售个人、销售负责人三类账号已准备 | 研发/测试 | 脱敏账号清单 | 待执行 |
| PRE-004 | 组织、用户、角色、权限和字典可维护 | 测试/业务 | 系统管理页截图 | 待执行 |
| PRE-005 | 可构造客户、联系人、商机、销售行动和周进展样本 | 测试/业务 | 样例数据编号或截图 | 待执行 |
| PRE-006 | 销售侧验收人和管理侧验收人已具名 | 项目/业务 | 会议纪要或验收安排 | 待执行 |

## 4. 测试环境Smoke派工

| 编号 | 验证项 | 责任侧 | 证据要求 | 当前状态 |
|---|---|---|---|---|
| SMK-001 | 前端登录页可访问，无框架错误覆盖层 | 测试 | 登录页截图 | 待执行 |
| SMK-002 | 管理员登录成功，可进入系统页面 | 测试 | 浏览器Smoke输出或截图 | 待执行 |
| SMK-003 | 系统管理页组织、用户、角色可见 | 测试 | `npm run smoke:v1:browser` 输出和截图 | 待执行 |
| SMK-004 | `/api/bootstrap` 返回200，包含当前用户、权限数和V1计数 | 测试/研发 | 脱敏curl输出或接口截图 | 待执行 |
| SMK-005 | 浏览器console无warning/error | 测试 | Smoke输出 | 待执行 |

## 5. 业务UAT派工

| 编号 | 验收链路 | 主要验收人 | 对应验收项 | 证据要求 | 当前状态 |
|---|---|---|---|---|---|
| UAT-001 | 登录、退出、修改密码 | 销售侧验收人 | AC-001 | 截图、操作记录、缺陷单 | 待执行 |
| UAT-002 | 管理员重置密码 | 测试负责人 | AC-002 | 截图、审计日志截图 | 待执行 |
| UAT-003 | 组织、用户、角色、权限、字典维护 | 测试负责人 | AC-003、AC-004 | 截图、权限配置记录 | 待执行 |
| UAT-004 | 客户和联系人建档 | 销售侧验收人 | AC-006、AC-007 | 客户编号、联系人截图 | 待执行 |
| UAT-005 | 商机创建与推进 | 销售侧验收人 | AC-008 | 商机编号、阶段状态截图 | 待执行 |
| UAT-006 | 销售行动完成与最近跟进回写 | 销售侧验收人 | AC-010、AC-011 | 行动截图、客户/商机回写截图 | 待执行 |
| UAT-007 | 风险行动与周进展 | 管理侧验收人 | AC-012、AC-013 | 周进展截图、风险说明截图 | 待执行 |
| UAT-008 | 商机关闭或取消跟进 | 销售侧验收人 | AC-009 | 关闭原因截图、列表筛选截图 | 待执行 |
| UAT-009 | 团队查看和个人越权 | 管理侧验收人 | AC-015、AC-016 | 负责人视图、个人越权失败证据 | 待执行 |
| UAT-010 | 关键审计日志 | 测试负责人 | AC-017 | 审计日志截图或导出 | 待执行 |

## 6. 缺陷与回归追踪

| 等级 | 准出要求 | 当前状态 | 证据 |
|---|---|---|---|
| P0 / S1 阻断 | 必须全部关闭并回归通过 | 待测试侧汇总 | 待填写 |
| P1 / S2 严重 | 原则上关闭；延期需业务和项目认可规避方案 | 待测试侧汇总 | 待填写 |
| P2 / S3 一般 | 评估试点影响，可进入版本修复池 | 待测试侧汇总 | 待填写 |
| P3 / S4 轻微 | 可后续优化 | 待测试侧汇总 | 待填写 |

## 7. Go/No-Go执行门禁

| 门禁 | 命令或证据 | 通过条件 | 当前状态 |
|---|---|---|---|
| UAT证据清单一致性 | `node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md` | 返回 `PASS` | 当前清单为 `FAIL / No-Go` |
| UAT具名环境一致性 | `node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md` | 返回 `PASS`，且 ENV-001 至 ENV-008 均有具名环境证据 | 当前环境证据为 `FAIL / No-Go` |
| UAT证据包一致性 | `node scripts/v1-uat-evidence-pack-validate.mjs <crm-v1-uat-evidence-pack.md>` | 返回 `PASS` | 当前rc.8草稿为 `FAIL / No-Go` |
| UAT缺陷台账一致性 | `node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md` | 返回 `PASS`，且 P0/P1 未关闭数量为 0 或有项目认可结论 | 当前台账为 `FAIL / No-Go` |
| UAT签署台账一致性 | `node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md` | 返回 `PASS`，且六方签署完整、项目负责人选择 `Go` | 当前签署台账为 `FAIL / No-Go` |
| 启动治理一致性 | `node scripts/v1-kickoff-governance-validate.mjs docs/meeting-notes/crm-kickoff-minutes.md` | 返回 `PASS`，且负责人、业务验收人、V1范围冻结和项目 `Go` 结论完整 | 当前启动纪要为 `FAIL / No-Go` |
| V1最终放行门禁 | `node scripts/v1-release-gate.mjs . <crm-v1-uat-evidence-pack.md> docs/testing/crm-v1-uat-execution-tracker.md docs/testing/v1-uat-evidence-manifest.md docs/testing/v1-uat-defect-register.md docs/testing/v1-uat-environment-evidence.md docs/testing/v1-uat-signoff-register.md docs/testing/v1-uat-launch-intake.md docs/meeting-notes/crm-kickoff-minutes.md` | 返回 `PASS`，且项目负责人选择 `Go` | 当前rc.8草稿为 `FAIL / No-Go` |
| 项目签署 | 销售侧验收人、管理侧验收人、产品负责人、测试负责人、研发负责人、项目负责人 | 全部签署完成 | 待执行 |

## 8. 当前结论

当前结论：No-Go。

原因：

- 具名测试环境待确认。
- 启动会负责人、业务验收人和 V1范围冻结仍待确认。
- PRE-001 至 PRE-006 未完成。
- SMK-001 至 SMK-005 未完成。
- UAT-001 至 UAT-010 未完成。
- P0/P1缺陷汇总未形成。
- 销售侧验收人、管理侧验收人、产品负责人、测试负责人、研发负责人和项目负责人签署未完成。

完成上述事项并形成正式 UAT 证据包后，重新运行启动治理 validator、UAT证据包 validator 和 V1最终放行门禁。

当前签署台账 validator：

```bash
node scripts/v1-uat-signoff-register-validate.mjs docs/testing/v1-uat-signoff-register.md
```

当前预期结果：`FAIL / No-Go`。该结果用于暴露六方签署、签署日期、证据引用和项目 `Go` 结论未补齐的项目。

当前追踪表 validator：

```bash
node scripts/v1-uat-execution-tracker-validate.mjs docs/testing/crm-v1-uat-execution-tracker.md
```

当前预期结果：`FAIL / No-Go`。该结果用于持续暴露具名测试环境、UAT执行、P0/P1缺陷闭环、签署和最终 release gate 阻塞项。

当前证据清单 validator：

```bash
node scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md
```

当前预期结果：`FAIL / No-Go`。该结果用于集中暴露 PRE、SMK、UAT、缺陷、签署和 Go/No-Go 证据引用未补齐的项目。

当前具名测试环境证据 validator：

```bash
node scripts/v1-uat-environment-validate.mjs docs/testing/v1-uat-environment-evidence.md
```

当前预期结果：`FAIL / No-Go`。该结果用于暴露测试环境名称、前后端地址、提交号、ENV-001 至 ENV-008 Smoke/账号/权限证据和 Go/No-Go 结论未补齐的项目。

当前缺陷台账 validator：

```bash
node scripts/v1-uat-defect-register-validate.mjs docs/testing/v1-uat-defect-register.md
```

当前预期结果：`FAIL / No-Go`。该结果用于暴露 P0/P1 汇总、缺陷明细、回归证据和项目 Go/No-Go 结论未补齐的项目。
