#!/usr/bin/env node

import { fileURLToPath } from "node:url";

const UAT_CASES = [
  ["UAT-001", "登录、退出、修改密码"],
  ["UAT-002", "管理员重置密码"],
  ["UAT-003", "组织、用户、角色、权限、字典维护"],
  ["UAT-004", "客户和联系人建档"],
  ["UAT-005", "商机创建与推进"],
  ["UAT-006", "销售行动完成与最近跟进回写"],
  ["UAT-007", "风险行动与周进展"],
  ["UAT-008", "商机关闭或取消跟进"],
  ["UAT-009", "团队查看和个人越权"],
  ["UAT-010", "关键审计日志"]
];

const AUTOMATION_COMMANDS = [
  "mvn test",
  "mvn verify -Ppostgres-it",
  "npm test",
  "npm run build",
  "npm run smoke:v1:browser",
  "/api/bootstrap Smoke"
];

const ENVIRONMENT_CHECKS = [
  ["前端登录页可访问", "显示 CRM 登录表单，无框架错误覆盖层"],
  ["后端健康检查", "/api/health 返回 200"],
  ["数据库迁移", "Flyway 14 个迁移脚本完成"],
  ["管理员账号", "可登录，可进入系统管理页"],
  ["销售个人账号", "可登录，可创建客户/商机/行动"],
  ["销售负责人账号", "可查看本部门数据"],
  ["权限样本账号", "可验证本人、本部门、协同、全局四类数据范围"]
];

export function parseEvidenceArgs(argv) {
  const aliases = new Map([
    ["--environment", "environment"],
    ["--frontend-url", "frontendUrl"],
    ["--backend-url", "backendUrl"],
    ["--git-commit", "gitCommit"],
    ["--rc", "releaseCandidate"],
    ["--test-owner", "testOwner"],
    ["--product-owner", "productOwner"],
    ["--dev-owner", "devOwner"],
    ["--username", "username"],
    ["--date", "date"]
  ]);
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (!aliases.has(option)) {
      throw new Error(`Unknown option: ${option}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${option}`);
    }
    parsed[aliases.get(option)] = value;
    index += 1;
  }

  return parsed;
}

export function buildEvidenceModel(input = {}) {
  const now = input.now instanceof Date ? input.now : new Date();
  return {
    date: input.date ?? now.toISOString().slice(0, 10),
    environment: input.environment ?? "待填写",
    frontendUrl: input.frontendUrl ?? "待填写",
    backendUrl: input.backendUrl ?? "待填写",
    gitCommit: input.gitCommit ?? "待填写",
    releaseCandidate: input.releaseCandidate ?? "待填写",
    testOwner: input.testOwner ?? "待填写",
    productOwner: input.productOwner ?? "待填写",
    devOwner: input.devOwner ?? "待填写",
    username: input.username ?? "待填写"
  };
}

export function generateEvidencePackMarkdown(model) {
  const lines = [
    "# CRM V1 UAT 证据包与 Go/No-Go 记录",
    "",
    "填写原则：不记录明文密码、生产密钥、API Token 或个人敏感信息。截图和命令输出需来自具名测试环境，或明确标记为本地验证。",
    "",
    "## 1. 基本信息",
    "",
    "| 项目 | 内容 |",
    "|---|---|",
    `| 验收日期 | ${model.date} |`,
    `| 测试环境名称 | ${model.environment} |`,
    `| 前端访问地址 | ${model.frontendUrl} |`,
    `| 后端 API 地址 | ${model.backendUrl} |`,
    `| Git 提交号 | ${model.gitCommit} |`,
    `| 候选版本 | ${model.releaseCandidate} |`,
    "| 前端版本/构建号 | 待填写 |",
    "| 后端版本/构建号 | 待填写 |",
    "| 数据库版本 | PostgreSQL 16 或实际版本：待填写 |",
    `| 测试负责人 | ${model.testOwner} |`,
    `| 产品负责人 | ${model.productOwner} |`,
    `| 研发负责人 | ${model.devOwner} |`,
    "| 销售侧验收人 | 待填写 |",
    "| 管理侧验收人 | 待填写 |",
    "",
    "## 2. 自动化验证结果",
    "",
    "| 命令 | 执行环境 | 结果 | 证据文件 |",
    "|---|---|---|---|"
  ];

  for (const command of AUTOMATION_COMMANDS) {
    lines.push(`| \`${command}\` | ${model.environment} | 待执行 | 待填写 |`);
  }

  lines.push(
    "",
    "自动化结论：",
    "",
    "```text",
    "待填写失败项、重跑记录和是否影响 V1 准出。",
    "```",
    "",
    "## 3. 环境与账号证据",
    "",
    "| 证据项 | 通过标准 | 结果 | 证据文件 |",
    "|---|---|---|---|"
  );

  for (const [item, standard] of ENVIRONMENT_CHECKS) {
    lines.push(`| ${item} | ${standard} | 待执行 | 待填写 |`);
  }

  lines.push(
    "",
    "账号说明：",
    "",
    "```text",
    `管理员或测试账号脱敏标识：${model.username}`,
    "只记录账号类型、账号编号或脱敏用户名，不记录明文密码。",
    "```",
    "",
    "## 4. 业务演示验收记录",
    "",
    "| 编号 | 验收链路 | 验收人 | 结果 | 证据文件 | 遗留问题 |",
    "|---|---|---|---|---|---|"
  );

  for (const [id, title] of UAT_CASES) {
    lines.push(`| ${id} | ${title} | 待填写 | 待执行 | 待填写 | 待填写 |`);
  }

  lines.push(
    "",
    "业务验收结论：",
    "",
    "```text",
    "待填写销售侧和管理侧对 V1 是否可进入试点的意见。",
    "```",
    "",
    "## 5. 缺陷汇总",
    "",
    "| 等级 | 数量 | 未关闭数量 | 准出影响 | 处理结论 |",
    "|---|---:|---:|---|---|",
    "| P0 / S1 阻断 | 待填写 | 待填写 | 不允许准出 | 待填写 |",
    "| P1 / S2 严重 | 待填写 | 待填写 | 需关闭或形成业务认可规避方案 | 待填写 |",
    "| P2 / S3 一般 | 待填写 | 待填写 | 可进入版本修复池，需评估试点影响 | 待填写 |",
    "| P3 / S4 轻微 | 待填写 | 待填写 | 可后续优化 | 待填写 |",
    "",
    "## 6. 上线观察项与回滚条件",
    "",
    "| 类型 | 内容 | 触发条件 | 责任人 |",
    "|---|---|---|---|",
    "| 观察项 | 销售行动录入率 | 试点首周低于约定下限 | 待填写 |",
    "| 观察项 | 周进展完整率 | 有已完成行动但周进展缺失 | 待填写 |",
    "| 观察项 | 权限问题数量 | 出现越权或应看不可看问题 | 待填写 |",
    "| 回滚条件 | 主流程不可用 | 登录、客户、商机、行动、周进展任一核心链路阻断 | 待填写 |",
    "| 回滚条件 | 数据权限越权 | 销售个人可查看无关客户/商机/行动 | 待填写 |",
    "| 回滚条件 | 核心数据错误 | 行动完成后最近跟进或周进展大量错漏 | 待填写 |",
    "",
    "## 7. Go/No-Go 判定",
    "",
    "| 判定项 | Go 条件 | 当前结果 | 是否满足 |",
    "|---|---|---|---|",
    "| 自动化验证 | 后端、前端、构建、浏览器 Smoke 均通过 | 待填写 | 待填写 |",
    "| 测试环境 Smoke | 登录、系统管理、bootstrap 均通过 | 待填写 | 待填写 |",
    "| P0 缺陷 | 无未关闭 P0/S1 | 待填写 | 待填写 |",
    "| P1 缺陷 | 已关闭或业务认可规避方案 | 待填写 | 待填写 |",
    "| 业务验收 | 销售侧、管理侧完成确认 | 待填写 | 待填写 |",
    "| 上线风险 | 观察项和回滚条件已记录 | 待填写 | 待填写 |",
    "",
    "Go/No-Go 结论：",
    "",
    "```text",
    "选择：Go / Conditional Go / No-Go",
    "",
    "结论说明：",
    "```",
    "",
    "证据包 validator：",
    "",
    "```bash",
    "node scripts/v1-uat-evidence-pack-validate.mjs crm-v1-uat-evidence-pack.md",
    "```",
    "",
    "```text",
    "填写 validator 输出摘要。若选择 Go，结果必须为 PASS。",
    "```",
    "",
    "## 8. 签署",
    "",
    "| 角色 | 姓名 | 结论 | 日期 |",
    "|---|---|---|---|",
    "| 销售侧验收人 | 待填写 | 同意 / 不同意 | 待填写 |",
    "| 管理侧验收人 | 待填写 | 同意 / 不同意 | 待填写 |",
    "| 产品负责人 | 待填写 | 同意 / 不同意 | 待填写 |",
    "| 测试负责人 | 待填写 | 同意 / 不同意 | 待填写 |",
    "| 研发负责人 | 待填写 | 同意 / 不同意 | 待填写 |",
    "| 项目负责人 | 待填写 | Go / Conditional Go / No-Go | 待填写 |",
    "",
    "## 9. 附件清单",
    "",
    "| 附件 | 说明 | 路径或链接 |",
    "|---|---|---|",
    "| 自动化验证日志 | 命令输出或 CI 链接 | 待填写 |",
    "| 浏览器 Smoke 截图 | 系统管理页截图 | 待填写 |",
    "| bootstrap 响应 | 脱敏后的 JSON 输出 | 待填写 |",
    "| 业务演示截图 | UAT-001 至 UAT-010 关键截图 | 待填写 |",
    "| 缺陷列表 | 缺陷平台导出或汇总表 | 待填写 |",
    "| 会议纪要 | 验收会纪要 | 待填写 |",
    "| 证据包 validator 输出 | Go/No-Go 一致性校验结果 | 待填写 |",
    ""
  );

  return lines.join("\n");
}

function printUsage() {
  console.error([
    "Usage: node scripts/v1-uat-evidence-pack.mjs --environment <name> --frontend-url <url> --backend-url <url> --git-commit <sha> --rc <tag>",
    "",
    "Optional: --date <YYYY-MM-DD> --test-owner <name> --product-owner <name> --dev-owner <name> --username <masked-user>",
    "Do not pass passwords, production secrets, or API tokens."
  ].join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const options = parseEvidenceArgs(process.argv.slice(2));
    console.log(generateEvidencePackMarkdown(buildEvidenceModel(options)));
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exitCode = 1;
  }
}
