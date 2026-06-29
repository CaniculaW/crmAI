# V2 合同管理链路设计说明

日期：2026-06-29

## 1. 设计目标

模块 3「合同管理链路」承接商机成交后的商务执行，把销售结果转成可追踪、可开票、可回款、可追责的合同资产。

本模块不是完整 OA 审批或电子签章系统。V2 首轮目标是建立合同台账和合同详情执行台，让销售、商务/法务、财务和管理层围绕同一份合同看到状态、金额、风险、付款条件、开票条件、变更记录、节点和附件，为后续开票、回款、核销模块提供稳定来源。

## 2. 已确认方案

采用方案 B：合同台账 + 合同详情执行台。

导航：

- 新增一级菜单：`合同`。
- 合同列表作为合同台账入口。
- 合同详情作为执行台，承接后续开票计划、回款计划、附件和节点。
- 后续 V2 模块继续新增 `财务` 一级菜单，包含开票、回款、核销。

页面：

- `合同列表`
- `合同详情`
- `新建/编辑合同`
- `合同变更记录`
- `合同节点`
- `合同附件`
- `终止合同`

## 3. 页面逻辑

### 3.1 合同列表

合同列表回答“哪些合同正在拟定、待签、履约、暂停、完成或终止”。

核心信息：

- 合同名称。
- 合同编号。
- 所属客户。
- 来源商机。
- 合同类型：项目合同、框架合同、采购合同、服务合同、补充协议。
- 合同状态：拟定中、审批中、待签署、履约中、暂停、已完成、已终止。
- 合同金额。
- 税率。
- 不含税金额。
- 签署日期。
- 生效日期。
- 结束日期。
- 合同负责人。
- 商务负责人。
- 风险等级。
- 最近更新时间。

筛选：

- 关键词。
- 客户。
- 商机。
- 合同类型。
- 合同状态。
- 风险等级。
- 合同负责人。
- 商务负责人。
- 签署日期范围。
- 金额范围。

主要操作：

- 新建合同。
- 查看详情。
- 编辑。
- 终止合同。

### 3.2 合同详情执行台

合同详情回答五个问题：

1. 这份合同来自哪个客户和商机。
2. 当前合同是否已签署并进入履约。
3. 合同金额、税率、付款条件和开票条件是什么。
4. 合同风险、变更和履约节点是否健康。
5. 后续开票、回款、核销模块应该从哪里接入。

信息分区：

- 摘要区：合同名称、编号、客户、商机、状态、金额、负责人。
- 商务信息区：合同类型、含税金额、税率、不含税金额、我方签约主体、客户签约主体。
- 时间区：签署日期、生效日期、结束日期。
- 条款区：付款条件、开票条件、交付范围、验收标准。
- 风险区：风险等级、风险说明。
- 变更记录区：变更类型、变更前、变更后、原因、变更人、变更时间。
- 节点区：项目启动、交付、初验、终验、质保等节点。
- 附件区：合同正文、盖章版、补充协议、审批材料。
- 后续入口占位：开票计划、回款计划、回款流水、核销明细。

### 3.3 新建/编辑合同

新建合同必须关联客户；来源商机可选但推荐必填。若从商机成交入口进入，默认带入客户、商机、预计合同金额和负责人。

必填字段：

- `account_id`
- `contract_name`
- `contract_type`
- `contract_status`
- `contract_amount`
- `owner_user_id`

建议填写：

- `opportunity_id`
- `contract_no`
- `tax_rate`
- `our_signing_entity`
- `customer_signing_entity`
- `business_owner_id`
- `payment_terms`
- `invoice_terms`
- `delivery_scope`
- `acceptance_criteria`
- `risk_level`

编辑合同允许修改基础字段、金额、条款、风险和日期；当合同金额、付款条件、开票条件或交付范围变化时，需要写入合同变更记录。

### 3.4 合同状态流转

V2 首轮采用明确状态，不做复杂审批流设计器。

状态：

- `drafting`：拟定中。
- `approving`：审批中。
- `pending_signature`：待签署。
- `performing`：履约中。
- `paused`：暂停。
- `completed`：已完成。
- `terminated`：已终止。

动作：

- 新建合同时可直接设置初始状态。
- 编辑合同可调整状态。
- 终止合同必须填写终止原因，写审计。

后续可在系统配置模块扩展审批角色和审批动作；本模块只保留状态字段和审计记录。

### 3.5 合同附件

合同附件复用 V1 通用附件模型：

- `object_type = contract`
- `object_id = crm_contracts.id`

附件能力：

- 新增附件。
- 下载附件：V2 首轮打开 `file_url`。
- 删除附件。
- 查看附件列表。

附件类型建议：

- `contract_draft`：合同草稿。
- `stamped_contract`：盖章版合同。
- `supplement`：补充协议。
- `approval_material`：审批材料。
- `delivery_material`：交付材料。
- `acceptance_material`：验收材料。

不单独创建 `crm_contract_attachments`，避免和 V2 模块 2 已采用的通用附件模式冲突。

### 3.6 合同变更

合同变更用于追踪关键字段变化，不是独立审批流。

变更类型：

- `amount`：合同金额。
- `scope`：交付范围。
- `payment_terms`：付款条件。
- `invoice_terms`：开票条件。
- `risk`：风险。
- `other`：其他。

当用户在编辑合同时修改上述关键字段，系统记录：

- 变更类型。
- 变更前。
- 变更后。
- 变更原因。
- 变更人。
- 变更时间。

V2 首轮可以允许用户在编辑表单填写 `change_reason`，如果关键字段变化而未填写原因，后端返回业务规则错误。

### 3.7 合同节点

合同节点用于合同履约和验收的轻量跟踪。

节点类型：

- `kickoff`：项目启动。
- `delivery`：交付。
- `initial_acceptance`：初验。
- `final_acceptance`：终验。
- `warranty`：质保。

节点字段：

- 节点名称。
- 节点类型。
- 计划日期。
- 实际完成日期。
- 状态：待处理、已完成、延期、取消。
- 备注。

V2 首轮支持在合同详情中新增、编辑节点，不自动生成提醒；后续可与提醒、销售行动和项目交付模块联动。

## 4. 数据模型

新增主表：`crm_contracts`。

核心字段：

- `account_id`
- `opportunity_id`
- `contract_name`
- `contract_no`
- `contract_type`
- `contract_status`
- `contract_amount`
- `tax_rate`
- `net_amount`
- `our_signing_entity`
- `customer_signing_entity`
- `owner_user_id`
- `business_owner_id`
- `signed_at`
- `effective_at`
- `ended_at`
- `payment_terms`
- `invoice_terms`
- `delivery_scope`
- `acceptance_criteria`
- `risk_level`
- `risk_description`
- `termination_reason`
- `terminated_at`
- `terminated_by`
- `remark`

新增变更表：`crm_contract_changes`。

核心字段：

- `contract_id`
- `change_type`
- `before_value`
- `after_value`
- `change_reason`
- `changed_by`
- `changed_at`

新增节点表：`crm_contract_milestones`。

核心字段：

- `contract_id`
- `milestone_name`
- `milestone_type`
- `planned_at`
- `actual_at`
- `status`
- `remark`

复用附件表：`crm_attachments`。

- `object_type = contract`
- `object_id = crm_contracts.id`

金额口径：

- `contract_amount` 为含税合同金额。
- `tax_rate` 为小数，如 0.13。
- `net_amount` 为不含税金额，可由前端传入或后端按 `contract_amount / (1 + tax_rate)` 计算；V2 首轮建议后端在 tax_rate 存在时计算，避免前端误差。

## 5. API 契约

合同：

- `GET /api/contracts`
- `GET /api/contracts/{contractId}`
- `POST /api/contracts`
- `PATCH /api/contracts/{contractId}`
- `POST /api/contracts/{contractId}/terminate`

变更：

- `GET /api/contracts/{contractId}/changes`

节点：

- `GET /api/contracts/{contractId}/milestones`
- `POST /api/contracts/{contractId}/milestones`
- `PATCH /api/contracts/{contractId}/milestones/{milestoneId}`

附件：

- `GET /api/attachments?object_type=contract&object_id={contractId}`
- `POST /api/attachments`
- `DELETE /api/attachments/{attachmentId}`

列表过滤参数：

- `keyword`
- `account_id`
- `opportunity_id`
- `contract_type`
- `contract_status`
- `risk_level`
- `owner_user_id`
- `business_owner_id`
- `signed_from`
- `signed_to`
- `amount_min`
- `amount_max`

## 6. 权限与审计

新增权限点：

- `contract.read`
- `contract.create`
- `contract.update`
- `contract.terminate`
- `contract.milestone.manage`

复用附件权限：

- `attachment.read`
- `attachment.create`
- `attachment.delete`

审计动作：

- `contract.create`
- `contract.update`
- `contract.terminate`
- `contract.milestone.create`
- `contract.milestone.update`
- `attachment.create`
- `attachment.delete`

数据权限：

- 合同数据权限以合同负责人、商务负责人、客户/商机关联可见性为基础。
- V2 首轮建议复用关联商机可见性作为底线，再扩展 `contract` 模块数据范围。
- 管理员和具备全局数据范围的角色可查看全部合同。

## 7. V2 首轮不做

- 不做电子签章。
- 不做 OA 审批流设计器。
- 不做合同在线预览和版本 diff。
- 不自动生成开票计划和回款计划；仅保留条款和后续入口占位。
- 不做合同导出。
- 不做复杂项目交付管理。

## 8. 验收标准

- 用户可从一级菜单进入合同列表。
- 用户可新建、编辑、查看、终止合同。
- 合同可关联客户和商机。
- 合同详情展示金额、税率、不含税金额、付款条件、开票条件、风险和关键日期。
- 修改金额、付款条件、开票条件或交付范围时写入变更记录，并要求变更原因。
- 合同节点可新增和编辑。
- 合同附件可新增、删除、下载。
- 合同终止必须填写原因并记录审计。
- 自动化测试、构建和浏览器 Smoke 通过。

## 9. 自检

- 无占位项。
- 合同模块未包含开票、回款、核销实现。
- 附件模式与方案标书模块保持一致，复用 `crm_attachments`。
- 状态流转保持轻量，未引入审批流设计器。
- 后续开票和回款模块有清晰合同来源字段和详情入口。
