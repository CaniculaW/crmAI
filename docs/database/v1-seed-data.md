# CRM V1 初始化数据计划

日期：2026-06-17

适用范围：CRM V1测试环境和试点生产环境初始化数据。本文定义seed内容和分批策略，不包含完整SQL。

## 1. Seed原则

- 字典编码使用英文稳定编码，展示名称使用中文。
- 角色、权限点、数据范围必须先于用户和业务数据初始化。
- 测试环境可包含演示客户、联系人、商机和行动；试点生产环境只初始化系统字典、角色、权限、组织骨架和经确认的真实账号。
- 所有seed脚本应可重复执行，按唯一编码幂等更新。
- 试点生产环境不得写入虚构客户或虚构联系人。

## 2. 分批策略

| 批次 | 内容 | 目标环境 | 依赖 |
|---|---|---|---|
| seed-001-system-dicts | 系统、客户、联系人、商机、行动、风险、附件、提醒字典 | 测试、试点生产 | 无 |
| seed-002-permissions | 菜单权限、操作权限、API权限点 | 测试、试点生产 | seed-001 |
| seed-003-roles-scopes | 默认角色、角色权限、数据范围 | 测试、试点生产 | seed-002 |
| seed-004-org-users | 默认部门、管理员、试点用户 | 测试、试点生产 | seed-003 |
| seed-005-demo-crm | 演示客户、联系人、商机、销售行动、风险样例 | 仅测试环境 | seed-004 |

## 3. 数据字典

### 3.1 客户字典

| 字典类型 | 编码 | 名称 |
|---|---|---|
| account_type | group | 集团客户 |
| account_type | subsidiary | 子公司 |
| account_type | government | 政府单位 |
| account_type | institution | 事业单位 |
| account_type | enterprise | 企业客户 |
| account_type | partner | 合作伙伴 |
| account_level | A | A重点 |
| account_level | B | B潜力 |
| account_level | C | C普通 |
| account_level | D | D观察 |
| account_status | potential | 潜在 |
| account_status | following | 跟进中 |
| account_status | cooperating | 合作中 |
| account_status | paused | 暂停 |
| account_status | lost | 流失 |
| account_source | self_developed | 自拓 |
| account_source | referral | 转介绍 |
| account_source | partner | 伙伴 |
| account_source | bidding | 招投标 |
| account_source | existing | 历史客户 |
| account_source | campaign | 市场活动 |
| relationship_status | stranger | 陌生 |
| relationship_status | contacted | 已接触 |
| relationship_status | stable | 稳定 |
| relationship_status | breakthrough | 关键突破 |
| relationship_status | risk | 风险 |

### 3.2 联系人与干系人字典

| 字典类型 | 编码 | 名称 |
|---|---|---|
| contact_type | decision_maker | 决策人 |
| contact_type | user | 使用人 |
| contact_type | technical | 技术负责人 |
| contact_type | procurement | 采购负责人 |
| contact_type | finance | 财务负责人 |
| contact_type | influencer | 影响人 |
| contact_type | partner | 外部伙伴 |
| contact_project_role | demand_owner | 需求提出 |
| contact_project_role | budget_promoter | 预算推动 |
| contact_project_role | technical_gatekeeper | 技术把关 |
| contact_project_role | procurement_executor | 采购执行 |
| contact_project_role | contract_approver | 合同审批 |
| contact_project_role | acceptance_owner | 验收确认 |
| decision_influence | high | 高 |
| decision_influence | medium | 中 |
| decision_influence | low | 低 |
| decision_influence | unknown | 未知 |
| attitude | supportive | 支持 |
| attitude | neutral | 中立 |
| attitude | wait_and_see | 观望 |
| attitude | opposed | 反对 |
| attitude | unknown | 未知 |
| relationship_heat | stranger | 陌生 |
| relationship_heat | contacted | 已接触 |
| relationship_heat | familiar | 熟悉 |
| relationship_heat | trusted | 信任 |
| relationship_heat | key | 关键关系 |
| importance_level | core | 核心关键人 |
| importance_level | important | 重要干系人 |
| importance_level | normal | 普通联系人 |

### 3.3 商机字典

| 字典类型 | 编码 | 名称 |
|---|---|---|
| opportunity_stage | lead | 商业线索 |
| opportunity_stage | validation | 商业验证 |
| opportunity_stage | solution | 商业方案 |
| opportunity_stage | negotiation | 商业谈判 |
| opportunity_stage | won | 商业成交 |
| opportunity_status | following | 跟进中 |
| opportunity_status | paused | 暂停 |
| opportunity_status | closed | 关闭 |
| opportunity_status | cancelled | 取消跟进 |
| opportunity_level | A | 高 |
| opportunity_level | B | 中 |
| opportunity_level | C | 低 |
| opportunity_source | customer | 客户提出 |
| opportunity_source | policy_fund | 政策资金 |
| opportunity_source | partner | 伙伴推荐 |
| opportunity_source | bidding | 招投标 |
| opportunity_source | existing | 存量经营 |
| opportunity_source | campaign | 市场活动 |
| technical_solution_status | not_started | 未开始 |
| technical_solution_status | researching | 调研中 |
| technical_solution_status | drafting | 方案中 |
| technical_solution_status | submitted | 已提交 |
| technical_solution_status | reviewed | 已评审 |
| stakeholder_plan_status | not_started | 未梳理 |
| stakeholder_plan_status | identified | 已识别 |
| stakeholder_plan_status | managing | 经营中 |
| stakeholder_plan_status | breakthrough | 已突破 |
| stakeholder_plan_status | risk | 有风险 |
| quotation_status | not_started | 未测算 |
| quotation_status | calculating | 测算中 |
| quotation_status | calculated | 已测算 |
| quotation_status | review_required | 需复核 |
| bid_self_check_status | not_applicable | 不涉及 |
| bid_self_check_status | pending | 待自评 |
| bid_self_check_status | completed | 已自评 |
| bid_self_check_status | risk | 有风险 |
| opportunity_risk_status | normal | 正常 |
| opportunity_risk_status | attention | 关注 |
| opportunity_risk_status | risk | 风险 |
| opportunity_risk_status | high_risk | 高风险 |
| opportunity_close_type | won | 赢单 |
| opportunity_close_type | lost | 输单 |
| opportunity_close_type | invalid | 无效 |
| opportunity_close_type | cancelled | 放弃 |

### 3.4 行动与风险字典

| 字典类型 | 编码 | 名称 |
|---|---|---|
| activity_type | visit | 拜访 |
| activity_type | meeting | 会议 |
| activity_type | phone | 电话 |
| activity_type | wechat | 微信 |
| activity_type | email | 邮件 |
| activity_type | solution_presentation | 方案汇报 |
| activity_type | demo | 客户演示 |
| activity_type | bidding_communication | 投标沟通 |
| activity_type | payment_followup | 回款跟进 |
| activity_type | internal_collaboration | 内部协同 |
| activity_status | pending | 待执行 |
| activity_status | completed | 已完成 |
| activity_status | cancelled | 已取消 |
| activity_status | postponed | 已延期 |
| activity_result | progressed | 有推进 |
| activity_result | no_progress | 无明显推进 |
| activity_result | waiting_customer | 待客户反馈 |
| activity_result | risk_found | 发现风险 |
| activity_result | milestone_completed | 完成关键节点 |
| risk_type | budget | 预算 |
| risk_type | relationship | 关系 |
| risk_type | competition | 竞争 |
| risk_type | technical | 技术 |
| risk_type | procurement | 采购 |
| risk_type | delivery | 交付 |
| risk_type | contract | 合同 |
| risk_type | payment | 回款 |
| source_type | manual | 手工录入 |
| source_type | ai | AI写入 |
| source_type | imported | 导入 |

### 3.5 附件与提醒字典

| 字典类型 | 编码 | 名称 |
|---|---|---|
| attachment_object_type | account | 客户 |
| attachment_object_type | contact | 联系人 |
| attachment_object_type | opportunity | 商机 |
| attachment_object_type | activity | 销售行动 |
| reminder_object_type | opportunity | 商机 |
| reminder_object_type | activity | 销售行动 |
| reminder_type | follow_up | 跟进提醒 |
| reminder_type | overdue | 逾期提醒 |
| reminder_type | review | 复盘提醒 |
| reminder_status | pending | 待处理 |
| reminder_status | completed | 已完成 |
| reminder_status | cancelled | 已取消 |
| reminder_status | overdue | 已逾期 |

## 4. 默认角色

| 角色编码 | 角色名称 | 默认数据范围 | 说明 |
|---|---|---|---|
| sales_user | 销售个人 | 本人/协同 | 管理本人客户、联系人、商机和行动。 |
| sales_manager | 销售负责人 | 本部门及下级 | 查看团队客户、商机、行动和周进展。 |
| presales | 售前/方案 | 协同数据 | V1主要作为协同人员和只读参与者。 |
| business_legal | 商务/法务 | 协同数据 | V1预留角色，V2合同启用更多权限。 |
| finance | 财务 | 关联可见 | V1预留角色，V2开票回款启用更多权限。 |
| executive | 管理层 | 全局 | 查看全局客户、商机、行动和周进展。 |
| admin | 系统管理员 | 全局 | 管理组织、用户、角色、权限、字典和审计。 |

## 5. 数据范围

| 编码 | 名称 | 说明 |
|---|---|---|
| own | 本人 | 业务记录负责人为本人。 |
| department | 本部门 | 业务记录归属部门为本人所在部门。 |
| department_tree | 本部门及下级 | 本部门及下级部门数据。 |
| collaborated | 协同/参与 | 本人为协同人、参与人或关联处理人。 |
| global | 全局 | 可访问全部数据。 |
| custom | 自定义 | 预留给后续按区域、行业或客户池分配。 |

## 6. 权限点

### 6.1 菜单权限

| 权限编码 | 名称 |
|---|---|
| menu.workbench | 工作台 |
| menu.accounts | 客户池 |
| menu.contacts | 联系人与干系人 |
| menu.opportunities | 商机 |
| menu.activities | 销售行动 |
| menu.weekly_progress | 周进展 |
| menu.system | 系统管理 |
| menu.system.users | 用户管理 |
| menu.system.departments | 组织管理 |
| menu.system.roles | 角色权限 |
| menu.system.dicts | 字典配置 |
| menu.system.audit_logs | 审计日志 |

### 6.2 操作权限

| 权限编码 | 名称 |
|---|---|
| account.read | 查看客户 |
| account.create | 新建客户 |
| account.update | 编辑客户 |
| account.delete | 删除客户 |
| contact.read | 查看联系人 |
| contact.create | 新建联系人 |
| contact.update | 编辑联系人 |
| contact.delete | 删除联系人 |
| opportunity.read | 查看商机 |
| opportunity.create | 新建商机 |
| opportunity.update | 编辑商机 |
| opportunity.close | 关闭/取消跟进商机 |
| opportunity.reopen | 重启商机 |
| activity.read | 查看销售行动 |
| activity.create | 新建销售行动 |
| activity.update | 编辑销售行动 |
| activity.complete | 完成销售行动 |
| weekly_progress.read | 查看周进展 |
| system.user.manage | 管理用户 |
| system.role.manage | 管理角色权限 |
| system.dict.manage | 管理字典 |
| system.audit.read | 查看审计日志 |
| export.crm | 导出CRM数据 |

### 6.3 API权限

API权限可按模块映射到操作权限，V1不建议为每个接口维护独立角色配置，但应在 `sys_permissions.permission_type = api` 中预留：

- `api.auth.me`
- `api.accounts.read/write`
- `api.contacts.read/write`
- `api.opportunities.read/write`
- `api.activities.read/write`
- `api.weekly_progress.read`
- `api.system.read/write`

## 7. 角色权限默认映射

| 角色 | 默认权限摘要 |
|---|---|
| 销售个人 | 工作台、客户/联系人/商机/行动读写、周进展查看、本人密码修改。 |
| 销售负责人 | 销售个人权限 + 团队数据查看 + 周进展团队视图。 |
| 售前/方案 | 协同客户、联系人、商机、行动只读；可作为行动参与人。 |
| 商务/法务 | V1只读协同客户、商机和行动；V2扩展合同权限。 |
| 财务 | V1只读关联客户、商机和行动；V2扩展开票回款权限。 |
| 管理层 | 全局只读客户、联系人、商机、行动、周进展。 |
| 系统管理员 | 系统管理全权限 + CRM全局管理权限。 |

## 8. 测试环境演示业务数据

仅测试环境建议初始化：

### 8.1 客户样例

- A重点集团客户：用于验证集团/子公司、重点客户筛选、客户详情Tab。
- B潜力企业客户：用于验证普通销售跟进。
- 合作伙伴客户：用于验证客户类型和伙伴来源。

字段要求：

- 覆盖客户类型、等级、状态、来源、行业、区域、负责人、归属部门。
- 至少一条客户包含上级客户关系。

### 8.2 联系人样例

- 每个演示客户至少2个联系人。
- 覆盖决策人、技术负责人、采购负责人、财务负责人、影响人。
- 覆盖支持、中立、观望、反对、未知态度。

### 8.3 商机样例

- 至少5条商机，覆盖5个阶段。
- 至少4条商机，覆盖跟进中、暂停、关闭、取消跟进状态。
- 至少1条高风险商机。
- 至少1条关闭商机包含关闭原因、关闭说明、关闭人和关闭时间。

### 8.4 销售行动与风险样例

- 至少8条销售行动，覆盖拜访、会议、电话、微信、方案汇报、内部协同。
- 至少3条已完成且进入周进展的行动。
- 至少1条不关联商机的客户经营行动。
- 至少1条行动结果为发现风险，并关联多个风险类型。
- 至少1条行动生成下次跟进提醒。

## 9. 待确认项

- 试点生产环境真实组织、用户、角色分配名单。
- 是否允许试点生产环境初始化示例客户；默认不允许。
- 密码初始化策略：管理员一次性重置、首次登录强制修改、或企业SSO。
- 角色权限是否需要按公司实际岗位进一步拆分。
