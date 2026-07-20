# CRM AI 紧凑型前端刷新验收报告

## 验收结论

- 结论：通过
- 验收日期：2026-07-20
- 验收分支：`codex/compact-ui-density`
- 验收代码：`b942d44`
- 本地地址：`http://127.0.0.1:5175/`
- 后端地址：`http://127.0.0.1:8080/`

本次刷新覆盖全部登录后页面，统一应用框架、导航、页面标题、表格、筛选表单、卡片、弹窗、抽屉、仪表盘、系统管理和 AI 助手的视觉密度。登录页与业务行为未调整。

## 自动化结果

| 验证项 | 结果 |
| --- | --- |
| Vitest 完整前端回归 | 9 个测试文件，173/173 通过 |
| TypeScript + Vite 生产构建 | 通过 |
| V2 浏览器回归 | 20 条路由 x 3 个视口，60/60 通过 |
| V4 AI 浏览器回归 | 8 条路由 x 3 个视口，24/24 通过 |
| 浏览器控制台错误 | 0 |
| 失败 API 响应 | 0 |
| `git diff --check` | 通过 |

V4 首轮验证发现 AI 助手使用 Ant Design 已弃用的 `Alert.message` 属性，已改为 `Alert.title`，并增加自动化契约后复测通过。

## 视口与页面

验证视口：

- Desktop：1440 x 1000
- Tablet：768 x 1024
- Mobile：390 x 844

重点人工检查页面：

- `/accounts`
- `/contracts`
- `/approvals`
- `/system/users`
- `/dashboard`

检查结果：桌面侧栏固定且内容区独立滚动；标题、操作按钮和筛选区无重叠；表格与卡片密度符合设计目标；移动端导航切换正常，操作控件保持 36px 可触达高度，宽表在表格容器内横向滚动。

## 证据

- V2 报告：`docs/testing/evidence/artifacts/compact-ui-density-20260720/v2/report.json`
- V4 报告：`docs/testing/evidence/artifacts/compact-ui-density-20260720/v4/report.json`
- 截图目录：`docs/testing/evidence/artifacts/compact-ui-density-20260720/`

共归档 83 个报告与截图文件。代表性桌面和移动截图已经逐张人工检查。

## 非阻塞项

- Vite 仍提示 Ant Design vendor chunk 超过 500 kB；这是现有按包加载策略导致的构建警告，不影响本次页面刷新，可在后续性能专项中通过路由级懒加载优化。
- jsdom 对伪元素 `getComputedStyle` 的提示来自测试运行环境能力限制；浏览器回归无对应控制台错误。
