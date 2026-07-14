# FT-FIN-0714 合同与回款链路功能测试报告

日期：2026-07-14
环境：`http://120.55.73.23/`
数据前缀：`FT-FIN-0714`
执行约束：仅测试；未修改源码、未部署、未修复；未输出或归档密码/token。

## 1. 结论

- API 功能测试包：20 个，通过 19 个，失败 1 个，阻塞 0 个。
- 浏览器全路由 Smoke：54 项，通过 54 项，失败 0 项，阻塞 0 项；覆盖桌面、平板和移动端。
- 浏览器定点复验：3 项，通过 2 项，失败 0 项，阻塞 1 项。
- 合计执行记录：77 项，通过 75 项，失败 1 项，阻塞 1 项。
- P0：0；P1：1；P2：0；P3：0。
- 准出判断：不通过。必须先修复负数合同金额可保存的 P1 数据完整性缺陷并回归。

说明：合计数混合了 API 测试包和浏览器路由检查，不等价于按原子测试步骤计算的业务用例通过率。

## 2. 已通过范围

- 方案、报价、投标标书：创建、编辑、状态转换、必填校验、列表与详情一致性。
- 合同：创建、编辑、变更记录、里程碑、终止、列表与详情一致性。
- 开票：计划创建与编辑、申请、开具、签收、异常、作废、零金额和非法状态转换校验。
- 应收：创建、编辑、跟进、终止、负金额校验、列表与详情一致性。
- 回款：登记、编辑、确认、异常、退款、零金额和超额确认校验，应收金额联动。
- 核销：工作台、超额校验、创建、查询、作废、金额回滚和重新核销。
- 附件：方案、报价、标书、合同、发票、回款条件快照和回款对象均完成上传、列表、下载内容比对、删除和删除后复查。
- 附件异常：空文件、不支持的对象类型、不存在的对象均被拒绝。
- 浏览器：54 个路由检查无控制台错误、无失败 API 响应；方案、合同、开票、回款、核销页面可展示本次测试数据。

## 3. 缺陷

### FIN-BUG-001 / P1 / 合同金额允许负数

步骤：

1. 使用管理员登录部署环境。
2. 基于测试客户 `account_id=8`、测试商机 `opportunity_id=9` 新建合同。
3. 提交 `contract_amount=-1`，其余必填项合法且均使用 `FT-FIN-0714` 前缀。
4. 打开合同列表检查保存结果。

预期：接口返回 HTTP 400 或 409，不生成合同记录。

实际：接口返回 HTTP 200、`code=OK`；合同列表展示 `FT-FIN-0714-负金额异常`，金额为 `-1 元`。

影响：破坏合同、开票、应收、回款及经营统计的金额口径，属于核心财务数据完整性问题。

证据：

- Trace：`FT-FIN-0714-026-CONTRACT-NEGATIVE`
- 关联对象：`account_id=8`、`opportunity_id=9`
- 缺陷合同名称：`FT-FIN-0714-负金额异常`
- 缺陷合同 ID：执行器未持久化该失败断言响应中的 ID，属于证据缺口；未为补证继续请求环境。
- 截图：`docs/testing/evidence/artifacts/ft-fin-0714-browser/desktop-contracts.png`

## 4. 关键对象与 Trace

| 对象 | ID | 关键 Trace |
|---|---:|---|
| 客户 | 8 | `FT-FIN-0714-003-ACCOUNT-CREATE` |
| 商机 | 9 | `FT-FIN-0714-004-OPPORTUNITY-CREATE` |
| 技术方案 | 3 | 创建链路已通过 |
| 报价 | 4 | `FT-FIN-0714-007-QUOTATION-CREATE` |
| 投标标书 | 5 | `FT-FIN-0714-009-BID-CREATE` |
| 主合同 | 1 | `FT-FIN-0714-016-CONTRACT-CREATE` |
| 合同里程碑 | 1 | 创建、完成及列表复查通过 |
| 主发票 | 1 | `FT-FIN-0714-027-INVOICE-CREATE`、`FT-FIN-0714-030-INVOICE-ISSUE`、`FT-FIN-0714-031-INVOICE-SIGN` |
| 主应收计划 | 1 | `FT-FIN-0714-045-RECEIVABLE-CREATE` |
| 主回款 | 1 | `FT-FIN-0714-054-PAYMENT-CREATE`、`FT-FIN-0714-056-PAYMENT-CONFIRM` |
| 已作废核销 | 1 | `FT-FIN-0714-069-RECON-CREATE` |
| 最终有效核销 | 2 | `FT-FIN-0714-077-RECON-RECREATE` |
| 附件 | 1-7 | 均完成上传、下载、删除；删除后不再出现在列表 |

附件样例 Trace：

- 报价上传/下载/删除：`FT-FIN-0714-085-ATTACHMENT-QUOTATION-UPLOAD`、`FT-FIN-0714-087-ATTACHMENT-QUOTATION-DOWNLOAD`、`FT-FIN-0714-088-ATTACHMENT-QUOTATION-DELETE`
- 标书上传：`FT-FIN-0714-090-ATTACHMENT-BID-UPLOAD`
- 合同上传：`FT-FIN-0714-095-ATTACHMENT-CONTRACT-UPLOAD`
- 发票上传：`FT-FIN-0714-100-ATTACHMENT-INVOICE-UPLOAD`
- 回款条件快照上传：`FT-FIN-0714-105-ATTACHMENT-RECEIVABLE-SNAPSHOT-U`

## 5. 浏览器证据

- 浏览器报告：`docs/testing/evidence/artifacts/ft-fin-0714-browser/report.json`
- 方案列表：`docs/testing/evidence/artifacts/ft-fin-0714-browser/desktop-solutions.png`
- 合同列表及负金额缺陷：`docs/testing/evidence/artifacts/ft-fin-0714-browser/desktop-contracts.png`
- 核销工作台：`docs/testing/evidence/artifacts/ft-fin-0714-browser/desktop-reconciliations.png`
- 开票定点复验：`docs/testing/evidence/artifacts/ft-fin-0714-browser/focused-invoices.png`
- 回款计划定点复验：`docs/testing/evidence/artifacts/ft-fin-0714-browser/focused-receivables.png`
- 到账流水截图：`docs/testing/evidence/artifacts/ft-fin-0714-browser/focused-payments.png`

浏览器全路由报告结果：`status=passed`、`routeChecks=54`、`consoleFailures=0`、`failedResponses=0`。

到账流水定点任务已生成目标截图，但 Chrome 临时目录清理时报 `ENOTEMPTY`，进程退出码为 1。因此该定点任务按“阻塞”记录，不计为正式通过，也不登记为产品缺陷。

## 6. 未测项

- 报价、投标、合同的审批发起、同意、驳回、撤回和审批人权限边界。
- 非管理员角色下的合同回款数据范围、按钮权限和直接 API 越权验证。
- 浏览器页面内逐按钮执行附件上传、下载、删除；本轮附件能力已在部署 API 层完成真实文件流验证。
- 附件最大尺寸边界、超大文件、恶意文件内容检测和文件类型白名单策略。
- 并发提交、重复提交、幂等性、断网恢复和长时间会话。
- Safari、Edge 等跨浏览器验证。
- 性能测试和安全测试；本轮按要求仅执行功能测试。

## 7. 测试数据说明

所有新建对象均使用 `FT-FIN-0714` 前缀，未修改已有业务数据。附件 ID 1-7 已在各自删除能力测试中删除；其余测试对象保留用于缺陷复现和后续回归。
