# 客户关联详情浏览器验收记录（2026-07-21）

## 验收信息

- 分支：`codex/account-related-details`
- 浏览器验收提交：`f7582b23d0400f41e69320344fda93ee1b0e8bc7`
- 前端：`http://127.0.0.1:5175`
- 后端：`http://127.0.0.1:8080`
- 演示数据：客户 `1`（V1演示客户-上海智造集团）、联系人 `1`（王敏）、商机 `1`（智能制造CRM一期试点）。
- 本轮只刷新浏览器和 API 证据，未修改或重跑生产代码与测试代码。

## 验收方法

1. 使用已有演示管理员登录态，在 `1440x1000` 和 `390x844` 视口分别打开客户经营详情，并从真实关系记录进入联系人、商机深链。
2. 每页读取 `body`、`documentElement`、抽屉正文宽度；移动客户关系页额外读取两个 `.ant-table-content` 的 `clientWidth`、`scrollWidth`、`scrollLeft` 和 `overflow-x`。
3. 页面控制台错误通过浏览器页签 error 日志计数。失败响应通过对当前页面使用的精确 API 路径执行授权重放并统计 HTTP `>=400`；原始结果不保存令牌、凭据、请求头或 Cookie。
4. “查看全部商机”和两个同路由 query 清除场景均从实际 UI 点击，核对最终 URL、客户控件状态和对应 scoped/unscoped API 路径。

原始结果：[browser-checks.json](artifacts/account-related-details-20260721/browser-checks.json)、[api-checks.json](artifacts/account-related-details-20260721/api-checks.json)。

## 浏览器矩阵

| 页面 | 视口 | 最终 URL | body/doc/drawer scrollWidth | 控制台错误 | 失败响应 | 结果 |
| --- | --- | --- | --- | ---: | ---: | --- |
| 客户关系详情 | `1440x1000` | `/accounts` | `1440/1440/736` | 0 | 0 | 通过 |
| 联系人深链 | `1440x1000` | `/contacts?account_id=1&contact_id=1` | `1440/1440/736` | 0 | 0 | 通过 |
| 商机深链 | `1440x1000` | `/opportunities?account_id=1&opportunity_id=1` | `1440/1440/736` | 0 | 0 | 通过 |
| 客户关系详情 | `390x844` | `/accounts` | `390/390/390` | 0 | 0 | 通过 |
| 联系人深链 | `390x844` | `/contacts?account_id=1&contact_id=1` | `390/390/390` | 0 | 0 | 通过 |
| 商机深链 | `390x844` | `/opportunities?account_id=1&opportunity_id=1` | `390/390/390` | 0 | 0 | 通过 |

六页均未发现不连贯重叠或页面级横向溢出。桌面抽屉正文为 `736px`，移动抽屉正文为 `390px`。

## 发布缺口复核

### 移动关系表内部滚动

- 关系面板左右边界为 `16px`、`374px`，可用宽度 `358px`。
- 联系人表 `scrollWidth/clientWidth=620/358`，`overflow-x=auto`；实际滚动到 `scrollLeft=220`。
- 商机表 `scrollWidth/clientWidth=680/358`，`overflow-x=auto`；实际滚动到 `scrollLeft=240`。
- 两次内部滚动期间，`body/document/drawer` 的 `scrollWidth` 始终为 `390/390/390`，页面和抽屉未被表格撑宽。
- 移动客户截图停在关系区，两个表头、真实记录、查看全部入口和内部滚动条可辨认。

### 查看全部商机

- 从客户经营详情点击“查看全部商机”，链接为 `/opportunities?account_id=1`，最终 URL 精确为 `/opportunities?account_id=1`。
- 商机页客户控件显示“V1演示客户-上海智造集团”。
- 对应请求为 `GET /api/opportunities?account_id=1`，不含 `default_following=true`，返回 HTTP `200`、`1` 条商机。

### 同路由 query 清除

- 联系人：从 `/contacts?account_id=1` 点击侧栏“联系人”到 `/contacts`；客户控件从“V1演示客户-上海智造集团”清空，请求从 `/api/contacts?account_id=1` 切换为 `/api/contacts`，HTTP `200`。
- 商机：从 `/opportunities?account_id=1` 点击侧栏“商机”到 `/opportunities`；客户控件清空，请求从 `/api/opportunities?account_id=1` 切换为 `/api/opportunities?default_following=true`，HTTP `200`。

## API 结果

- 登录、客户详情、联系人 scoped/详情/unscoped、商机 scoped/详情/default-following 共 `8` 个请求，全部 HTTP `200`。
- 失败响应数：`0`；六页控制台错误合计：`0`。
- scoped 和 unscoped 结果均使用真实种子 ID `1`，未保存任何秘密值。

## 截图与 SHA-256

| 文件 | 尺寸 | SHA-256 |
| --- | --- | --- |
| `desktop-customer-detail-relations.png` | `1440x1000` | `ace5a89442759b92e8aa812ef12f9ad0dcee21e766266502bc6e240dee59b05a` |
| `desktop-contact-deep-link-detail.png` | `1440x1000` | `d7b49d282757f3aa5058bdb49bc862883b2a41b8708373bf2148b45b691b2722` |
| `desktop-opportunity-deep-link-detail.png` | `1440x1000` | `db9f125c0bb952384d7ea40e0068c68d994eefdca5987325fe5e86f0f51b5f4e` |
| `mobile-customer-detail-relations.png` | `390x844` | `4a33d9f74db6f2f9b0e322e1a3cb5dbb8b2bf6e7934af69f706440f8d5c42d9d` |
| `mobile-contact-deep-link-detail.png` | `390x844` | `7a517bc996bbed2222c9e94bb6c7a4675c38f261f7334633f2bdf1de809b5f07` |
| `mobile-opportunity-deep-link-detail.png` | `390x844` | `e2eeff4327ff1c092efdb4c77f50a7bcd4da786638c50a328f9f37db5898bc3b` |

截图目录：`docs/testing/evidence/artifacts/account-related-details-20260721/`。

## 结论

通过。当前提交未发现浏览器阻塞缺陷。
