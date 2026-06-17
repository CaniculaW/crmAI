# CRM V1 API接口清单

日期：2026-06-17

适用范围：CRM V1认证与系统API、客户、联系人、商机、销售行动、周进展API。

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

## 3. 系统管理API

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | /api/system/users | 用户列表 | system.user.manage 或系统只读 |
| POST | /api/system/users | 新建用户 | system.user.manage |
| PATCH | /api/system/users/{id} | 编辑、启停、绑定部门角色 | system.user.manage |
| GET | /api/system/departments | 组织树 | 登录用户 |
| POST | /api/system/departments | 新建组织 | system.user.manage |
| PATCH | /api/system/departments/{id} | 编辑组织 | system.user.manage |
| GET | /api/system/roles | 角色列表 | system.role.manage 或系统只读 |
| POST | /api/system/roles | 新建角色 | system.role.manage |
| PATCH | /api/system/roles/{id} | 编辑角色 | system.role.manage |
| GET | /api/system/permissions | 权限点列表 | system.role.manage 或系统只读 |
| GET | /api/system/dicts | 字典类型和字典项 | 登录用户 |
| POST | /api/system/dicts | 新建字典类型或字典项 | system.dict.manage |
| PATCH | /api/system/dicts/{id} | 编辑字典类型或字典项 | system.dict.manage |
| GET | /api/system/audit-logs | 审计日志查询 | system.audit.read |

过滤建议：

- 用户：`keyword`、`department_id`、`status`、`role_id`
- 审计日志：`actor_user_id`、`module_code`、`object_type`、`object_id`、`action_code`、`occurred_from`、`occurred_to`
- 字典：`dict_code`、`is_active`

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
- 重启需 `can_reopen = true` 或具备专项权限，具体规则待确认。

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

## 9. 附件与提醒API预留

V1如开发资源允许，建议补充：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/attachments | 按对象查询附件 |
| POST | /api/attachments | 创建附件元数据或获取上传凭证 |
| DELETE | /api/attachments/{id} | 删除附件元数据 |
| GET | /api/reminders | 我的提醒 |
| PATCH | /api/reminders/{id} | 完成或取消提醒 |

待确认：文件上传链路、附件下载审计、提醒通知方式。

## 10. 待确认项

- 登录态采用JWT、服务端Session还是企业统一认证。
- 列表 `page_size` 最大值。
- 客户、联系人、商机重复数据是阻断还是提示。
- 导出接口是否纳入V1。
- 附件上传API是否在V1交付，还是仅保留表结构。
