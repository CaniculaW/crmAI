# CRM V1 API接口清单

日期：2026-06-18

适用范围：CRM V1认证与系统API、客户、联系人、商机、销售行动、周进展、附件、提醒API。

OpenAPI契约文件：`docs/openapi/crm-v1-openapi.yaml`。当前已建立 `OpenApiContractCoverageTest`，用于校验运行时 Spring MVC 暴露的 `/api` 路径均被 OpenAPI 文档覆盖。

## 1. 通用接口规范

### 1.1 URL与版本

- API前缀：`/api`
- V1可通过网关路径、Header或文档版本管理；当前清单先使用 `/api/...`。
- 请求和响应默认使用JSON。

### 1.2 认证

- V1默认账号密码登录。
- 登录成功后返回访问令牌或建立服务端会话，最终机制由后端安全方案确认。
- 除登录、重置密码令牌校验等公开接口外，所有接口必须校验登录态。

### 1.3 分页、排序、过滤

列表接口统一支持：

| 参数 | 示例 | 说明 |
|---|---|---|
| page | 1 | 页码，从1开始。 |
| page_size | 20 | 每页条数，默认20，最大值待确认，建议不超过100。 |
| sort | -updated_at,account_name | `-` 表示倒序，多个字段逗号分隔。 |

过滤参数按模块定义，时间范围建议使用 `*_from` 和 `*_to`。

### 1.4 响应格式

当前后端基线已实现 `/api` 响应自动包裹、参数校验错误统一结构和 `X-Trace-Id` 响应头回传；前端请求层已兼容统一响应并返回 `data` 给页面层。

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {},
  "trace_id": "request-trace-id"
}
```

分页响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [],
    "page": 1,
    "page_size": 20,
    "total": 0
  },
  "trace_id": "request-trace-id"
}
```

错误响应：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数校验失败",
  "data": {
    "field_errors": []
  },
  "trace_id": "request-trace-id"
}
```

### 1.5 错误码

| code | HTTP建议 | 说明 |
|---|---:|---|
| OK | 200 | 成功。 |
| UNAUTHORIZED | 401 | 未登录、会话过期或令牌无效。 |
| FORBIDDEN | 403 | 权限不足或数据范围不足。 |
| VALIDATION_ERROR | 400 | 参数格式、必填、枚举、长度校验失败。 |
| BUSINESS_RULE_FAILED | 409 | 业务规则失败，如关闭商机未填原因、阶段规则不满足。 |
| NOT_FOUND | 404 | 数据不存在或已删除。 |
| DUPLICATE_DATA | 409 | 唯一约束或重复数据校验失败。 |
| CONFLICT | 409 | 乐观锁版本冲突。 |
| RATE_LIMITED | 429 | 请求过于频繁，V1可预留。 |
| INTERNAL_ERROR | 500 | 服务端异常。 |

### 1.6 权限与审计要求

- 菜单权限控制页面入口，操作权限控制按钮和接口。
- 数据权限必须在服务端执行，不能依赖前端隐藏。
- 关键操作必须写入 `sys_audit_logs`：用户/角色/权限变更、密码重置、客户关键字段变更、商机阶段/状态变更、商机关闭/取消跟进、行动完成、风险触发。
- 审计日志需记录操作人、动作、模块、对象、前后快照、结果、失败原因、IP和User-Agent。

## 2. 认证API

| 方法 | 路径 | 说明 | 权限 | 审计 |
|---|---|---|---|---|
| POST | /api/auth/login | 登录 | 公开 | 登录日志 |
| POST | /api/auth/logout | 登出 | 登录用户 | 登录日志 |
| POST | /api/auth/change-password | 修改本人密码 | 登录用户 | 审计 |
| POST | /api/auth/reset-password | 重置密码 | 管理员或有效重置令牌 | 审计 |
| GET | /api/auth/me | 当前用户、角色、权限、数据范围 | 登录用户 | 否 |

接口要点：

- 登录需校验用户状态、账号状态、凭据状态、失败次数和锁定时间。
- 登出需使服务端会话失效。
- 修改密码需校验旧密码和密码强度。
- 管理员重置密码后应标记 `force_password_change = true`。

当前认证基线已落地：`POST /api/auth/login` 使用用户名密码登录，成功后返回 `access_token` 和当前用户；`GET /api/auth/me` 使用 `Authorization: Bearer <token>` 返回角色和权限点；`POST /api/auth/logout` 撤销服务端session。密码凭据使用 PBKDF2WithHmacSHA256 哈希保存。

当前密码管理已落地：`POST /api/auth/change-password` 校验旧密码后更新本人密码；`POST /api/auth/reset-password` 支持管理员重置目标用户密码并设置 `force_password_change = true`，同时写入密码重置审计日志。

当前权限基线已落地：后端支持 `@RequirePermission` 服务端权限点拦截，缺少登录态返回 `UNAUTHORIZED`，登录但缺少权限点返回 `FORBIDDEN`。字典管理接口要求 `system.dict.manage`，密码重置接口要求 `system.user.manage`。数据权限服务可按 `own`、`department`、`department_tree`、`collaborated`、`global` 组装列表查询条件。

## 3. 系统管理API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/system/users | 用户列表 | system.user.manage |
| POST | /api/system/users | 新建用户 | system.user.manage |
| PATCH | /api/system/users/{id} | 编辑、启停、绑定部门角色 | system.user.manage |
| GET | /api/system/departments | 组织树 | 登录用户 |
| POST | /api/system/departments | 新建组织 | system.user.manage |
| PATCH | /api/system/departments/{id} | 编辑组织 | system.user.manage |
| GET | /api/system/roles | 角色列表 | system.role.manage |
| POST | /api/system/roles | 新建角色 | system.role.manage |
| PATCH | /api/system/roles/{id} | 编辑角色 | system.role.manage |
| GET | /api/system/permissions | 权限点列表 | system.role.manage |
| PUT | /api/system/roles/{roleId}/permissions | 替换角色权限点 | system.role.manage |
| GET | /api/system/dicts | 字典类型和字典项 | 登录用户 |
| POST | /api/system/dicts/types | 新建字典类型 | system.dict.manage |
| POST | /api/system/dicts/types/{dictTypeId}/items | 新建字典项 | system.dict.manage |
| PATCH | /api/system/dicts/items/{itemId} | 编辑、启停字典项 | system.dict.manage |
| GET | /api/system/audit-logs | 审计日志查询 | system.audit.read |

过滤建议：

- 用户：`keyword`、`department_id`、`status`、`role_id`
- 审计日志：`actor_user_id`、`module_code`、`object_type`、`object_id`、`action_code`、`occurred_from`、`occurred_to`
- 字典：`dict_code`、`is_active`

字典查询已落地：`GET /api/system/dicts?dict_code=account_type` 默认仅返回启用类型和启用字典项；如需管理端查看停用项，可传 `include_inactive=true`。

身份管理基础接口已落地：`GET /api/system/users` 返回用户及已分配角色；`GET /api/system/roles` 返回角色及权限点；`GET /api/system/permissions` 返回启用权限点；`PUT /api/system/roles/{roleId}/permissions` 支持替换角色权限并写入 `system.role.permissions.replace` 审计。用户新增/编辑、组织树维护和角色新增/编辑仍作为后续管理端增强。

## 4. 客户API

| 方法 | 路径 | 说明 | 权限 | 审计 |
|---|---|---|---|---|
| GET | /api/accounts | 客户列表 | account.read + 数据权限 | 否 |
| POST | /api/accounts | 新建客户 | account.create | 是 |
| GET | /api/accounts/{id} | 客户详情 | account.read + 数据权限 | 否 |
| PATCH | /api/accounts/{id} | 编辑客户 | account.update + 数据权限 | 是 |
| GET | /api/accounts/{id}/contacts | 客户下联系人 | contact.read + 数据权限 | 否 |
| GET | /api/accounts/{id}/opportunities | 客户下商机 | opportunity.read + 数据权限 | 否 |
| GET | /api/accounts/{id}/activities | 客户下行动 | activity.read + 数据权限 | 否 |

列表过滤：

- `keyword`
- `account_type`
- `industry`
- `region_province`
- `region_city`
- `account_level`
- `account_status`
- `account_source`
- `owner_user_id`
- `owner_department_id`
- `last_activity_from`
- `last_activity_to`

请求字段要点：

- 新建客户必填：account_name、account_type、account_status、owner_department_id、owner_user_id。
- 上级客户使用 `parent_id`。
- 协同人员可通过客户写接口一并提交，或后续扩展独立协同接口。

当前客户池基线已落地：`POST /api/accounts` 支持客户新增和协同人员写入并记录 `account.create` 审计；`GET /api/accounts` 按登录用户的数据范围返回客户列表，并支持 `keyword`、`account_type`、`account_level`、`account_status`、`account_source`、`industry`、`region_province`、`region_city`、`owner_user_id`、`owner_department_id` 筛选；`GET /api/accounts/{id}` 校验客户数据权限后返回详情；`PATCH /api/accounts/{id}` 支持更新等级、状态和备注并记录 `account.update` 审计。

## 5. 联系人API

| 方法 | 路径 | 说明 | 权限 | 审计 |
|---|---|---|---|---|
| GET | /api/contacts | 联系人列表 | contact.read + 数据权限 | 否 |
| POST | /api/contacts | 新建联系人 | contact.create | 是 |
| GET | /api/contacts/{id} | 联系人详情 | contact.read + 数据权限 | 否 |
| PATCH | /api/contacts/{id} | 编辑联系人 | contact.update + 数据权限 | 是 |

列表过滤：

- `keyword`
- `account_id`
- `contact_type`
- `attitude`
- `relationship_heat`
- `importance_level`
- `project_role`
- `last_communication_from`
- `last_communication_to`

请求字段要点：

- 新建联系人必填：account_id、name。
- 项目角色使用 `project_roles` 数组写入 `crm_contact_project_roles`。
- 联系人关联商机通过商机联系人接口或商机保存时维护。

当前联系人基线已落地：`POST /api/contacts` 支持联系人新增和项目角色写入并记录 `contact.create` 审计；`GET /api/contacts` 按登录用户的数据范围返回联系人列表，并支持 `keyword`、`account_id`、`contact_type`、`attitude`、`relationship_heat`、`importance_level`、`project_role`、`last_communication_from`、`last_communication_to` 筛选；`GET /api/accounts/{id}/contacts` 返回客户下可见联系人；`GET /api/contacts/{id}` 校验联系人数据权限后返回详情；`PATCH /api/contacts/{id}` 支持更新关系字段、联系方式、项目角色等，并记录 `contact.update` 审计。

## 6. 商机API

| 方法 | 路径 | 说明 | 权限 | 审计 |
|---|---|---|---|---|
| GET | /api/opportunities | 商机列表 | opportunity.read + 数据权限 | 否 |
| POST | /api/opportunities | 新建商机 | opportunity.create | 是 |
| GET | /api/opportunities/{id} | 商机详情 | opportunity.read + 数据权限 | 否 |
| PATCH | /api/opportunities/{id} | 编辑商机、阶段状态维护 | opportunity.update + 数据权限 | 是 |
| POST | /api/opportunities/{id}/close | 关闭或取消跟进 | opportunity.close + 数据权限 | 是 |
| POST | /api/opportunities/{id}/reopen | 重启商机 | opportunity.reopen + 数据权限 | 是 |
| GET | /api/opportunities/{id}/contacts | 商机关联联系人列表 | opportunity.read + 数据权限 | 否 |
| PUT | /api/opportunities/{id}/contacts | 批量替换商机关联联系人 | opportunity.update + 数据权限 | 是 |
| POST | /api/opportunities/{id}/contacts | 新增单个商机关联联系人 | opportunity.update + 数据权限 | 是 |
| DELETE | /api/opportunities/{id}/contacts/{contact_id} | 移除商机关联联系人 | opportunity.update + 数据权限 | 是 |
| GET | /api/opportunities/{id}/weekly-progress | 单商机周进展 | weekly_progress.read + 数据权限 | 否 |

列表过滤：

- `keyword`
- `account_id`
- `stage`
- `status`
- `level`
- `source`
- `owner_user_id`
- `owner_department_id`
- `risk_status`
- `amount_min`
- `amount_max`
- `expected_close_from`
- `expected_close_to`
- `default_following=true`

业务规则：

- 阶段和状态独立维护。
- 新建和编辑商机可通过 `contact_relations` 数组同时维护商机关联联系人；字段包括 `contact_id`、`role_in_opportunity`、`is_key_person`。
- 商机关联联系人必须属于同一客户，或具备明确跨客户关联权限；V1 默认只允许同一客户联系人。
- 关闭或取消跟进必须提交 close_type、close_reason、close_description。
- 关闭和取消跟进商机不进入默认跟进列表。
- 重启需具备 `opportunity.reopen` 权限，且商机满足 `can_reopen = true` 并处于 `closed` 或 `cancelled` 状态。

当前商机基线已落地：`POST /api/opportunities` 支持商机新增、协同人员和联系人关系写入，并记录 `opportunity.create` 审计；`GET /api/opportunities` 按登录用户数据范围返回商机列表，支持 `keyword`、`account_id`、`stage`、`status`、`level`、`source`、`owner_user_id`、`owner_department_id`、`risk_status`、`amount_min`、`amount_max`、`expected_close_from`、`expected_close_to`、`default_following` 筛选；`GET /api/accounts/{id}/opportunities` 返回客户下可见商机；`GET /api/opportunities/{id}` 校验商机数据权限后返回详情；`PATCH /api/opportunities/{id}` 支持阶段、状态、风险和进展等字段维护，并记录 `opportunity.update` 审计；`POST /api/opportunities/{id}/close` 支持关闭、输单和取消跟进，要求填写类型、原因和说明，成功后不再进入默认跟进列表并记录 `opportunity.close` 审计；`POST /api/opportunities/{id}/reopen` 支持按规则重启商机，恢复为 `following` 状态并记录 `opportunity.reopen` 审计。

## 7. 销售行动API

| 方法 | 路径 | 说明 | 权限 | 审计 |
|---|---|---|---|---|
| GET | /api/activities | 行动列表 | activity.read + 数据权限 | 否 |
| POST | /api/activities | 新建行动 | activity.create | 是 |
| GET | /api/activities/{id} | 行动详情 | activity.read + 数据权限 | 否 |
| PATCH | /api/activities/{id} | 编辑行动 | activity.update + 数据权限 | 是 |
| POST | /api/activities/{id}/complete | 完成行动 | activity.complete + 数据权限 | 是 |

列表过滤：

- `keyword`
- `account_id`
- `opportunity_id`
- `owner_user_id`
- `participant_user_id`
- `activity_type`
- `activity_status`
- `activity_result`
- `risk_type`
- `activity_from`
- `activity_to`
- `overdue=true`
- `include_in_weekly_progress=true`

业务规则：

- 行动必须关联客户，可选关联商机。
- 行动可关联多个联系人和多个我方参与人员。
- 完成行动后回写客户最近跟进；若有关联商机，同步回写商机最近跟进。
- 行动结果为发现风险时，可更新商机风险状态并记录审计。
- 下次跟进时间不为空时生成提醒。

当前销售行动基线已落地：`POST /api/activities` 支持创建客户经营行动和项目推进行动，可选关联商机，支持联系人、我方参与人和风险类型写入；下次跟进时间不为空时自动生成跟进提醒，并记录 `activity.create` 审计；`GET /api/activities` 按登录用户数据范围返回行动列表，支持 `keyword`、`account_id`、`opportunity_id`、`owner_user_id`、`participant_user_id`、`activity_type`、`activity_status`、`activity_result`、`risk_type`、`activity_from`、`activity_to`、`overdue`、`include_in_weekly_progress` 筛选；`GET /api/accounts/{id}/activities` 和 `GET /api/opportunities/{id}/activities` 返回对象下可见行动；`GET /api/activities/{id}` 校验行动数据权限后返回详情；`PATCH /api/activities/{id}` 支持编辑行动基础字段、联系人、参与人和风险类型，并同步更新跟进提醒，记录 `activity.update` 审计；`POST /api/activities/{id}/complete` 支持完成行动、写入完成时间和完成人、回写客户及商机最近跟进，风险行动同步升级商机风险状态，待处理跟进提醒自动完成，并记录 `activity.complete` 审计。

## 8. 周进展API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/weekly-progress/opportunities | 按商机查看周进展 | weekly_progress.read + 数据权限 |
| GET | /api/weekly-progress/owners | 按负责人查看周进展 | weekly_progress.read + 数据权限 |
| GET | /api/opportunities/{id}/weekly-progress | 单商机周进展 | weekly_progress.read + 数据权限 |

过滤参数：

- `opportunity_id`
- `owner_user_id`
- `account_id`
- `week_start`
- `week_end`
- `month`
- `risk_only`

响应要点：

- 来源为 `v_opportunity_weekly_progress`。
- 展示行动时间、行动主题、形成结论、下一步计划、风险说明。
- 不提供新增、编辑、删除周进展接口。

当前周进展基线已落地：`v_opportunity_weekly_progress` 从已完成、已关联商机且进入周进展的销售行动按自然周聚合；`GET /api/weekly-progress/opportunities` 支持按商机、负责人、客户、自然周/月度和风险过滤；`GET /api/opportunities/{id}/weekly-progress` 返回单商机周进展，响应保留同周多条行动明细。周进展不写入商机主表。

## 9. 方案标书API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/solutions | 查询方案标书列表 | solution.read + 关联商机数据权限 |
| GET | /api/solutions/{id} | 查看方案标书详情 | solution.read + 关联商机数据权限 |
| POST | /api/solutions | 创建方案标书 | solution.create + 关联商机数据权限 |
| PATCH | /api/solutions/{id} | 编辑方案标书 | solution.update + 关联商机数据权限 |
| POST | /api/solutions/{id}/void | 作废方案标书 | solution.void + 关联商机数据权限 |

过滤参数：

- `keyword`
- `account_id`
- `opportunity_id`
- `document_type`
- `status`
- `bid_self_check_result`
- `owner_user_id`

当前 V2 方案标书基线已落地：`crm_solution_documents` 关联客户和商机，支持方案/投标文件状态、版本、报价、成本、预计毛利、投标自检、客户反馈和作废原因；数据访问复用关联商机的数据权限。附件沿用通用附件 API，使用 `object_type=solution_document`。

## 10. 合同管理API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/contracts | 查询合同列表 | contract.read + 关联商机/客户数据权限 |
| GET | /api/contracts/{id} | 查看合同详情 | contract.read + 关联商机/客户数据权限 |
| POST | /api/contracts | 创建合同 | contract.create + 关联商机/客户数据权限 |
| PATCH | /api/contracts/{id} | 编辑合同 | contract.update + 关联商机/客户数据权限 |
| POST | /api/contracts/{id}/terminate | 终止合同 | contract.terminate + 关联商机/客户数据权限 |
| GET | /api/contracts/{id}/changes | 查询合同变更记录 | contract.read + 关联商机/客户数据权限 |
| GET | /api/contracts/{id}/milestones | 查询合同节点 | contract.read + 关联商机/客户数据权限 |
| POST | /api/contracts/{id}/milestones | 新增合同节点 | contract.milestone.manage + 关联商机/客户数据权限 |
| PATCH | /api/contracts/{id}/milestones/{milestoneId} | 编辑合同节点 | contract.milestone.manage + 关联商机/客户数据权限 |

过滤参数：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_type`
- `contract_status`
- `risk_level`
- `owner_user_id`
- `business_owner_id`

当前 V2 合同管理基线已落地：`crm_contracts` 关联客户和可选来源商机，支持合同编号、类型、状态、含税金额、税率、不含税金额、付款条件、开票条件、交付范围、验收标准、风险、终止原因；关键字段变更写入 `crm_contract_changes`，合同履约节点写入 `crm_contract_milestones`。附件沿用通用附件 API，使用 `object_type=contract`。

## 11. 开票管理API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/invoices | 查询开票计划/发票列表 | invoice.read + 关联合同数据权限 |
| GET | /api/invoices/{id} | 查看开票详情 | invoice.read + 关联合同数据权限 |
| POST | /api/invoices | 创建开票计划 | invoice.create + 关联合同数据权限 |
| PATCH | /api/invoices/{id} | 编辑开票计划 | invoice.update + 关联合同数据权限 |
| POST | /api/invoices/{id}/apply | 提交开票申请 | invoice.apply + 关联合同数据权限 |
| POST | /api/invoices/{id}/issue | 登记实际发票 | invoice.issue + 关联合同数据权限 |
| POST | /api/invoices/{id}/sign | 确认客户签收 | invoice.sign + 关联合同数据权限 |
| POST | /api/invoices/{id}/exception | 登记开票异常 | invoice.exception + 关联合同数据权限 |
| POST | /api/invoices/{id}/void | 作废发票 | invoice.void + 关联合同数据权限 |

过滤参数：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_id`
- `invoice_status`
- `invoice_type`
- `owner_user_id`
- `planned_from`
- `planned_to`
- `invoice_date_from`
- `invoice_date_to`
- `exception_only`

当前 V2 开票管理基线已落地：`crm_invoices` 关联合同，并从合同继承客户和商机；支持开票计划、申请、实际发票登记、客户签收、异常登记、作废和合同累计开票额度校验。正式开票后累计已开票金额不得超过合同金额；作废发票会释放可开票额度。附件沿用通用附件 API，使用 `object_type=invoice`。

## 12. 回款管理API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/receivable-plans | 查询回款计划列表 | receivable.read + 关联合同数据权限 |
| GET | /api/receivable-plans/{id} | 查看回款计划详情 | receivable.read + 关联合同数据权限 |
| POST | /api/receivable-plans | 创建回款计划 | receivable.create + 关联合同数据权限 |
| PATCH | /api/receivable-plans/{id} | 编辑回款计划 | receivable.update + 关联合同数据权限 |
| POST | /api/receivable-plans/{id}/terminate | 终止回款计划 | receivable.terminate + 关联合同数据权限 |
| GET | /api/receivable-plans/{id}/payments | 查询计划到账流水 | receivable.read + 关联合同数据权限 |
| GET | /api/receivable-plans/{id}/follow-ups | 查询回款跟进 | receivable.read + 关联合同数据权限 |
| POST | /api/receivable-plans/{id}/follow-ups | 新增回款跟进 | receivable.follow_up + 关联合同数据权限 |
| GET | /api/payments | 查询到账流水列表 | payment.read + 关联合同数据权限 |
| GET | /api/payments/{id} | 查看到账流水详情 | payment.read + 关联合同数据权限 |
| POST | /api/payments | 登记到账流水 | payment.create + 关联合同数据权限 |
| PATCH | /api/payments/{id} | 编辑到账流水 | payment.update + 关联合同数据权限 |
| POST | /api/payments/{id}/confirm | 确认到账 | payment.confirm + 关联合同数据权限 |
| POST | /api/payments/{id}/exception | 登记到账异常 | payment.exception + 关联合同数据权限 |
| POST | /api/payments/{id}/refund | 标记退款 | payment.refund + 关联合同数据权限 |

过滤参数：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_id`
- `receivable_status`
- `plan_stage`
- `owner_user_id`
- `planned_from`
- `planned_to`
- `overdue_only`
- `receivable_plan_id`
- `payment_status`
- `payment_method`
- `received_from`
- `received_to`
- `exception_only`

当前 V2 回款管理基线已落地：`crm_receivable_plans` 从合同继承客户和商机，支持回款计划、终止和跟进记录；`crm_payments` 支持到账登记、确认、异常和退款。回款计划详情返回合同金额、有效开票金额、确认到账金额、未收金额和未核销金额。附件沿用通用附件 API，使用 `object_type=receivable_plan` 和 `object_type=payment`。

## 13. 发票回款核销API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/reconciliations/workbench | 查询核销工作台汇总、待核销发票、待分配回款和最近核销 | reconciliation.read + 关联合同数据权限 |
| GET | /api/reconciliations | 查询核销明细列表 | reconciliation.read + 关联合同数据权限 |
| GET | /api/reconciliations/{id} | 查看核销明细详情 | reconciliation.read + 关联合同数据权限 |
| POST | /api/reconciliations | 新增发票回款核销 | reconciliation.create + 关联合同数据权限 |
| POST | /api/reconciliations/{id}/void | 撤销核销 | reconciliation.void + 关联合同数据权限 |

过滤参数：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_id`
- `invoice_id`
- `payment_id`
- `reconciliation_status`
- `active_only`
- `pending_only`

当前 V2 核销管理基线已落地：`crm_reconciliations` 关联客户、商机、合同、发票和到账流水；新增核销会同步增加发票与回款的已核销金额，撤销核销会反向恢复金额并记录撤销原因。核销工作台返回待核销发票、待分配回款、汇总金额和最近核销记录；所有操作通过关联合同继承数据权限，并记录 `reconciliation.create`、`reconciliation.void` 审计。

## 14. 附件与提醒API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/attachments | 按对象查询附件元数据 |
| POST | /api/attachments | 创建附件元数据 |
| DELETE | /api/attachments/{id} | 删除附件元数据 |
| GET | /api/reminders | 我的提醒 |
| PATCH | /api/reminders/{id} | 完成或取消提醒 |

当前附件元数据基线已落地：`crm_attachments` 统一保存 `object_type + object_id`、文件名、文件地址/对象Key、类型、大小、MIME、上传人和上传时间；支持 account、contact、opportunity、activity 四类 V1 对象，并在 V2 扩展支持 solution_document、contract、invoice、receivable_plan、payment；写入、查询、删除均先校验业务对象访问权限。

当前提醒基线已落地：`crm_reminders` 支持销售行动下次跟进自动生成 `activity/follow_up` 提醒；`GET /api/reminders` 返回当前用户待办，支持 `status`、`overdue`、`object_type`、`object_id` 筛选，逾期待办在响应中标识为 `overdue`；`PATCH /api/reminders/{id}` 支持将本人提醒更新为 `completed` 或 `cancelled` 并记录 `reminder.update` 审计；完成销售行动会自动完成该行动待处理跟进提醒。真实文件上传链路、下载审计和提醒通知方式待后续确认。

## 15. V4 AI助手API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/ai-context/summary | 当前用户可读客户、商机、行动和风险上下文摘要 | ai.context.read + 数据权限 |
| GET | /api/ai-context/accounts/{accountId} | 客户中心 AI 证据上下文 | ai.context.read + 客户数据权限 |
| GET | /api/ai-context/opportunities/{opportunityId} | 商机中心 AI 证据上下文 | ai.context.read + 商机数据权限 |
| POST | /api/ai-drafts/parse | 文本解析为客户、联系人、商机、行动待确认草稿 | ai.draft.create |
| GET | /api/ai-drafts | 当前用户 AI 录入草稿列表 | ai.draft.read |
| POST | /api/ai-drafts/{draftId}/confirm | 确认草稿并写入业务对象 | ai.draft.confirm + 对象写权限 |
| POST | /api/ai-drafts/{draftId}/reject | 驳回草稿 | ai.draft.confirm |
| POST | /api/ai-weekly-reports/generate | 生成销售周报 | ai.weekly_report.generate |
| GET | /api/ai-weekly-reports | 当前用户 AI 周报列表 | ai.weekly_report.read |
| POST | /api/ai-weekly-reports/{reportId}/confirm | 确认周报并写入周进展行动 | ai.weekly_report.confirm |
| POST | /api/ai-weekly-reports/{reportId}/reject | 驳回周报 | ai.weekly_report.confirm |
| POST | /api/ai-opportunity-analyses/generate | 生成商机分析 | ai.opportunity_analysis.generate + 商机数据权限 |
| GET | /api/ai-opportunity-analyses | 当前用户商机分析列表 | ai.opportunity_analysis.read |
| POST | /api/ai-opportunity-analyses/{analysisId}/confirm | 确认商机分析并写入计划行动 | ai.opportunity_analysis.confirm |
| POST | /api/ai-opportunity-analyses/{analysisId}/reject | 驳回商机分析 | ai.opportunity_analysis.confirm |
| POST | /api/ai-visit-plans/generate | 生成拜访计划建议 | ai.visit_plan.generate + 商机数据权限 |
| GET | /api/ai-visit-plans | 当前用户拜访计划列表 | ai.visit_plan.read |
| POST | /api/ai-visit-plans/{planId}/confirm | 确认拜访计划并写入计划行动 | ai.visit_plan.confirm |
| POST | /api/ai-visit-plans/{planId}/reject | 驳回拜访计划 | ai.visit_plan.confirm |
| POST | /api/ai-communication-recommendations/generate | 生成沟通方式推荐 | ai.communication_recommendation.generate + 联系人/商机数据权限 |
| GET | /api/ai-communication-recommendations | 当前用户沟通推荐列表 | ai.communication_recommendation.read |
| POST | /api/ai-communication-recommendations/{recommendationId}/confirm | 确认沟通推荐并写入计划行动 | ai.communication_recommendation.confirm |
| POST | /api/ai-communication-recommendations/{recommendationId}/reject | 驳回沟通推荐 | ai.communication_recommendation.confirm |
| GET | /api/ai-logs | 当前用户 AI 生成与确认写入日志 | ai.log.read |

当前 V4 AI助手基线已落地：AI 不再只是数据录入员，而是围绕销售业务链路提供文本录入、周报生成、商机分析、拜访计划建议、沟通方式推荐，以及统一 AI 生成/写入日志追踪。所有确认写入动作均保留人工确认入口，AI 日志用于追踪来源、状态、业务对象和 trace_id。

AI 日志支持 `event_type`、`ai_module`、`status`、`object_type`、`object_id`、`occurred_from`、`occurred_to` 和 `limit` 查询参数；权限拒绝由服务端统一写入 `sys_audit_logs`，用于追踪无权访问场景。

## 16. 待确认项

- 登录态采用JWT、服务端Session还是企业统一认证。
- 列表 `page_size` 最大值。
- 客户、联系人、商机重复数据是阻断还是提示。
- 导出接口是否纳入V1。
- 附件上传API是否在V1交付，还是仅保留表结构。
