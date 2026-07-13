# Approval Workflow Module Design

## Background

报价、投标、合同都属于金额、承诺和交付风险较高的销售业务动作。当前系统已经有方案标书、合同、附件、审计、角色权限等能力，但审批仍停留在业务状态字段上，没有统一的审批发起、审批任务、审批记录、审批配置和审批中心。

本次设计先补齐通用审批流模块，再将审批能力接入报价、投标和合同三类业务对象。审批流不直接替代业务模块，而是作为横向能力为业务对象提供状态流转、审批记录和权限控制。

## Scope

本次范围包含：

- 新增通用审批流数据模型。
- 新增审批模板、审批实例、审批节点、审批动作记录。
- 新增审批中心 API 和审批配置 API。
- 新增审批权限点。
- 报价审批接入方案标书中的报价对象。
- 投标审批接入方案标书中的投标文件对象。
- 合同审批接入合同对象。
- 前端新增审批中心页面。
- 系统管理下新增审批配置页面。
- 方案标书和合同详情中展示审批状态、审批记录和操作入口。

本次不包含：

- 复杂条件分支流程。
- 会签、或签、加签、转办。
- 企业微信、钉钉、邮件通知。
- 独立 BPMN 建模器。
- 移动端审批。

## Business Objects

审批对象用统一的 `object_type + object_id` 表示。

| object_type | 业务含义 | 来源表 | 进入条件 |
| --- | --- | --- | --- |
| `quotation` | 报价审批 | `crm_solution_documents` | `document_type = quotation` 或存在 `quotation_amount` |
| `bid` | 投标审批 | `crm_solution_documents` | `document_type = bid_document` |
| `contract` | 合同审批 | `crm_contracts` | 合同处于草稿或驳回状态 |

报价和投标继续归属方案标书模块，不拆出独立业务表。这样能复用现有商机、客户、附件、投标自检和报价字段。

## Workflow Model

审批采用轻量顺序流：

1. 审批模板定义对象类型、模板名称、启用状态和节点列表。
2. 业务对象提交审批时创建审批实例。
3. 审批实例复制模板节点为实例节点，避免后续模板变更影响历史审批。
4. 当前节点审批通过后进入下一节点。
5. 最后一个节点通过后实例状态变为 `approved`。
6. 任一节点驳回后实例状态变为 `rejected`。

审批实例状态：

| 状态 | 含义 |
| --- | --- |
| `pending` | 已提交，等待当前节点处理 |
| `approved` | 全部节点通过 |
| `rejected` | 任一节点驳回 |
| `cancelled` | 发起人取消，后续版本预留 |

审批节点状态：

| 状态 | 含义 |
| --- | --- |
| `waiting` | 未轮到该节点 |
| `pending` | 当前待处理节点 |
| `approved` | 当前节点已通过 |
| `rejected` | 当前节点已驳回 |
| `skipped` | 后续版本预留 |

审批动作：

| action | 含义 |
| --- | --- |
| `submit` | 发起审批 |
| `approve` | 审批通过 |
| `reject` | 审批驳回 |

## Template Rules

V1 审批模板保持简单：

- 每个对象类型至少一套默认模板。
- 模板节点按 `step_order` 顺序执行。
- 节点处理人通过 `approver_role_id` 配置。
- 具备该角色且状态有效的用户可以处理对应节点。
- 如模板缺失或没有节点，提交审批返回业务错误。
- 如当前节点找不到有效审批人，提交或流转返回业务错误。

默认模板建议：

| 对象类型 | 默认流程 |
| --- | --- |
| 报价审批 | 销售负责人审批 -> 商务负责人审批 |
| 投标审批 | 销售负责人审批 -> 方案评审员审批 |
| 合同审批 | 销售负责人审批 -> 商务/法务审批 |

## Business State Mapping

审批流负责审批状态，业务模块保留业务状态。提交、通过、驳回时做同步更新。

| 对象 | 提交审批 | 审批通过 | 审批驳回 |
| --- | --- | --- | --- |
| 报价 | `status = approving` | `status = approved` | `status = draft` |
| 投标 | `status = approving` | `status = approved` | `status = draft` |
| 合同 | `contract_status = approving` | `contract_status = pending_signature` | `contract_status = drafting` |

审批中禁止修改关键字段：

- 报价：报价金额、成本金额、毛利率、方案类型、版本号。
- 投标：方案类型、版本号、投标自检、风险说明。
- 合同：合同金额、税率、付款条件、开票条件、交付范围、验收标准、风险等级。

非关键备注字段可继续编辑，但仍记录审计日志。

## Permissions

新增权限点：

| 权限点 | 名称 | 模块 |
| --- | --- | --- |
| `approval.read` | 查看审批 | approval |
| `approval.submit` | 发起审批 | approval |
| `approval.approve` | 处理审批 | approval |
| `approval.config.manage` | 管理审批配置 | approval |

业务入口还需同时满足业务权限：

- 报价/投标提交审批：需要 `solution.read`、`solution.update`、`approval.submit`。
- 合同提交审批：需要 `contract.read`、`contract.update`、`approval.submit`。
- 审批处理：需要 `approval.approve`，且当前用户属于当前节点配置角色。

## API Design

审批中心：

- `GET /api/approvals/tasks?bucket=pending|started|processed`
- `GET /api/approvals/instances/{instanceId}`
- `POST /api/approvals/instances`
- `POST /api/approvals/instances/{instanceId}/approve`
- `POST /api/approvals/instances/{instanceId}/reject`
- `GET /api/approvals/object/{objectType}/{objectId}`

审批配置：

- `GET /api/approval-templates`
- `POST /api/approval-templates`
- `PATCH /api/approval-templates/{templateId}`
- `GET /api/approval-templates/{templateId}/nodes`
- `POST /api/approval-templates/{templateId}/nodes`
- `PATCH /api/approval-templates/{templateId}/nodes/{nodeId}`

业务快捷入口：

- `POST /api/solutions/{solutionId}/submit-approval`
- `POST /api/contracts/{contractId}/submit-approval`

报价和投标都通过方案标书接口提交，后端根据 `document_type` 决定 `quotation` 或 `bid`。

## Frontend Design

新增一级菜单：

- `审批中心`

系统管理下新增：

- `审批配置`

审批中心页面分为三个 Tab：

- 待我审批
- 我发起的
- 已处理

审批详情抽屉展示：

- 审批对象摘要。
- 当前状态。
- 当前节点。
- 审批节点进度。
- 审批意见记录。
- 通过/驳回操作。

方案标书详情新增：

- 审批状态块。
- 提交审批按钮。
- 审批记录表。

合同详情新增：

- 审批状态块。
- 提交审批按钮。
- 审批记录表。

## Audit

以下动作必须写入审计日志：

- 审批模板创建和修改。
- 审批提交。
- 审批通过。
- 审批驳回。
- 审批导致的业务状态变更。

审计模块使用现有 `AuditLogService`，模块编码为 `approval`，对象表分别记录 `approval_instance`、`approval_template` 或业务对象。

## Acceptance Criteria

- 管理员可配置报价、投标、合同三类默认审批模板。
- 销售可从报价、投标、合同详情发起审批。
- 发起审批后业务对象进入审批中状态。
- 有对应节点角色的用户能在审批中心看到待办并处理。
- 审批通过后业务状态正确流转。
- 审批驳回后业务状态回到草稿态。
- 审批记录在审批中心和业务详情中都可查看。
- 审批中关键字段不可修改。
- 无权限用户不能发起或处理审批。
- 所有审批动作写入审计日志。

## Testing Strategy

后端测试：

- 数据库迁移测试验证审批表和权限点。
- `ApprovalControllerTest` 覆盖提交、待办、通过、驳回、无权限。
- `SolutionDocumentControllerTest` 覆盖报价和投标提交审批。
- `ContractControllerTest` 覆盖合同提交审批和状态流转。
- 审计测试验证审批动作落审计。

前端测试：

- 审批中心页面展示待办、我发起、已处理。
- 审批详情可通过和驳回。
- 方案标书详情展示审批状态和提交入口。
- 合同详情展示审批状态和提交入口。
- 审批配置页面能展示模板和节点。

Smoke 验证：

- 登录管理员。
- 创建报价并提交审批。
- 创建投标并提交审批。
- 创建合同并提交审批。
- 使用审批角色用户处理审批。
- 验证三个业务对象状态和审批记录。
