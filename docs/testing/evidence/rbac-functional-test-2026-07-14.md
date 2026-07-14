# 系统管理与 RBAC 功能测试报告

日期：2026-07-14
环境：`http://120.55.73.23/`
测试数据前缀：`FT-RBAC-0714`

## 结论

- 已执行 45 项：43 项通过、2 项失败，另有 5 项未测。
- 缺陷：P0 0、P1 1、P2 1、P3 0。
- 当前不满足 RBAC 专项准出条件。

## 已通过

- 二级组织创建和刷新持久化通过，Department ID `3`。
- 角色创建、权限保存和刷新持久化通过，Role ID `3`。
- 用户创建、账号显示、角色分配和新账号实际登录通过，User ID `4`。
- 未授权用户、角色、审计和 AI 配置 API 均返回 403。
- 受限用户菜单只显示已授权模块。
- 字典新增、编辑、排序、停用和查询通过，Type ID `21`、Item ID `77`。
- AI 配置读取、参数校验、假密钥脱敏和失败连接测试通过，Config ID `1`。
- 组织、角色、用户、字典和 AI 配置关键操作存在审计记录。

## 缺陷

### RBAC-001 P1 停用用户后旧会话未失效

- 步骤：用户登录取得会话后，由管理员停用该用户，再使用旧会话连续调用 `/api/auth/me`。
- 预期：旧会话立即失效，返回 401。
- 实际：新登录已返回 401，但旧会话连续 3 次仍返回 200。
- 对象：User ID `4`。
- Trace：`FT-RBAC-0714-REPRO-disable`、`FT-RBAC-0714-REPRO-old-session-me-1/2/3`、`FT-RBAC-0714-REPRO-disabled-login`。
- 清理：复现后已恢复测试用户为 active。

### RBAC-002 P2 直接 URL 可渲染未授权管理页面

- 步骤：使用仅有字典权限的用户直接访问 `/system/users`。
- 预期：跳转到工作台或展示 403 页面，不渲染用户管理操作入口。
- 实际：页面显示“用户管理”和“新增用户”；对应后端 API 正确返回 403。
- 对象：User ID `4`。
- Trace：`FT-RBAC-0714-rbac-02`。

## 未测

- AI 配置页面最终视觉读取、表单提示和“测试连接”按钮交互。
- 组织和角色停用/启用；当前页面及 API 未发现对应入口。

## 证据

- `docs/testing/evidence/artifacts/ft-rbac-0714/ft-rbac-0714-results.json`
- `docs/testing/evidence/artifacts/ft-rbac-0714/ft-rbac-0714-browser-results.json`
- `docs/testing/evidence/artifacts/ft-rbac-0714/ft-rbac-0714-admin-departments.png`
- `docs/testing/evidence/artifacts/ft-rbac-0714/ft-rbac-0714-admin-roles.png`
- `docs/testing/evidence/artifacts/ft-rbac-0714/ft-rbac-0714-admin-users.png`
