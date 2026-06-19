#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateUatDefectRegister } from "./v1-uat-defect-register-validate.mjs";
import { evaluateUatEnvironmentEvidence } from "./v1-uat-environment-validate.mjs";
import { evaluateUatEvidenceManifest } from "./v1-uat-evidence-manifest-validate.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";
import { evaluateUatExecutionTracker } from "./v1-uat-execution-tracker-validate.mjs";
import { evaluateUatSignoffRegister } from "./v1-uat-signoff-register-validate.mjs";

const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";
const DEFAULT_TRACKER_PATH = "docs/testing/crm-v1-uat-execution-tracker.md";
const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";
const DEFAULT_DEFECT_REGISTER_PATH = "docs/testing/v1-uat-defect-register.md";
const DEFAULT_ENVIRONMENT_PATH = "docs/testing/v1-uat-environment-evidence.md";
const DEFAULT_SIGNOFF_REGISTER_PATH = "docs/testing/v1-uat-signoff-register.md";
const DEFAULT_OUTPUT_PATH = "docs/testing/v1-uat-execution-pack.md";

const SIGNOFF_OWNER = new Map([
  ["SIGNOFF-SALES", "业务UAT"],
  ["SIGNOFF-MANAGER", "业务UAT"],
  ["SIGNOFF-PRODUCT", "项目/产品"],
  ["SIGNOFF-TEST", "测试"],
  ["SIGNOFF-DEV", "研发"],
  ["SIGNOFF-PM", "项目/产品"]
]);

function extractIds(pattern, text) {
  return [...String(text).matchAll(pattern)].map((match) => match[0]);
}

function unique(items) {
  return [...new Set(items)];
}

function collectFailedMessages(...results) {
  return results.flatMap((result) => (result.failed ?? []).map((check) => check.message));
}

function executionItem(id) {
  if (id.startsWith("ENV-")) {
    return {
      id,
      owner: "测试",
      action: "补充具名环境 Smoke 证据",
      evidence: "具名环境截图、命令输出、账号验证记录或浏览器 Smoke 记录"
    };
  }

  if (id.startsWith("PRE-")) {
    return {
      id,
      owner: "测试",
      action: "完成 UAT 前置检查",
      evidence: "环境、账号、数据、权限或演示脚本检查记录"
    };
  }

  if (id.startsWith("SMK-")) {
    return {
      id,
      owner: "测试",
      action: "完成具名环境 Smoke 检查",
      evidence: "Smoke 截图、接口输出、浏览器控制台记录或缺陷单"
    };
  }

  if (id.startsWith("UAT-")) {
    return {
      id,
      owner: "业务UAT",
      action: "完成业务验收用例",
      evidence: "业务验收截图、操作记录、会议纪要或缺陷单"
    };
  }

  if (id.startsWith("DEF-")) {
    return {
      id,
      owner: "测试",
      action: "补齐缺陷台账",
      evidence: "P0/P1 缺陷汇总、关闭状态和回归验证证据"
    };
  }

  if (id.startsWith("SIGNOFF-")) {
    return {
      id,
      owner: SIGNOFF_OWNER.get(id) ?? "项目/产品",
      action: "补齐签署证据",
      evidence: "具名签署人、签署日期、签署结论和会议纪要"
    };
  }

  return {
    id,
    owner: "项目/产品",
    action: "完成 Go/No-Go 会议结论",
    evidence: "Go/No-Go 会议记录、结论、风险接受项和项目负责人确认"
  };
}

function collectExecutionItems({
  environmentResult,
  trackerResult,
  manifestResult,
  defectRegisterResult,
  signoffRegisterResult,
  evidenceResult
}) {
  const messages = collectFailedMessages(
    environmentResult,
    trackerResult,
    manifestResult,
    defectRegisterResult,
    signoffRegisterResult,
    evidenceResult
  ).join("\n");

  const ids = unique([
    ...extractIds(/ENV-\d{3}/g, messages),
    ...extractIds(/PRE-\d{3}/g, messages),
    ...extractIds(/SMK-\d{3}/g, messages),
    ...extractIds(/UAT-\d{3}/g, messages),
    ...extractIds(/DEF-[A-Z0-9-]+/g, messages),
    ...extractIds(/SIGNOFF-[A-Z]+/g, messages),
    ...extractIds(/GO-NOGO/g, messages)
  ]);

  if ((defectRegisterResult.failed ?? []).length > 0 && !ids.includes("DEF-REGISTER")) {
    ids.push("DEF-REGISTER");
  }

  return ids.map(executionItem);
}

function gateCommands({
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH
}) {
  return [
    `node scripts/v1-uat-environment-validate.mjs ${environmentPath}`,
    `node scripts/v1-uat-evidence-pack-validate.mjs ${evidencePath}`,
    `node scripts/v1-uat-evidence-manifest-validate.mjs ${manifestPath}`,
    `node scripts/v1-uat-execution-tracker-validate.mjs ${trackerPath}`,
    `node scripts/v1-uat-defect-register-validate.mjs ${defectRegisterPath}`,
    `node scripts/v1-uat-signoff-register-validate.mjs ${signoffRegisterPath}`,
    `node scripts/v1-release-gate.mjs . ${evidencePath} ${trackerPath} ${manifestPath} ${defectRegisterPath} ${environmentPath} ${signoffRegisterPath}`
  ];
}

export function generateV1UatExecutionPackMarkdown({
  generatedAt,
  environmentResult,
  trackerResult,
  manifestResult,
  defectRegisterResult,
  signoffRegisterResult,
  evidenceResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH
}) {
  const items = collectExecutionItems({
    environmentResult,
    trackerResult,
    manifestResult,
    defectRegisterResult,
    signoffRegisterResult,
    evidenceResult
  });
  const overall = items.length === 0 ? "Go" : "No-Go";

  const lines = [
    "# CRM V1 UAT Execution Pack",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Overall: ${overall}`,
    "",
    "## Execution Items",
    ""
  ];

  if (items.length === 0) {
    lines.push("No open execution items.");
  } else {
    lines.push("| Item | Owner side | Action | Evidence required |");
    lines.push("|---|---|---|---|");
    for (const item of items) {
      lines.push(`| ${item.id} | ${item.owner} | ${item.action} | ${item.evidence} |`);
    }
  }

  lines.push("");
  lines.push("## Verification Commands");
  lines.push("");
  for (const command of gateCommands({ evidencePath, trackerPath, manifestPath, defectRegisterPath, environmentPath, signoffRegisterPath })) {
    lines.push(`- \`${command}\``);
  }

  lines.push("");
  lines.push("## Completion Rule");
  lines.push("");
  lines.push("Every execution item must have concrete evidence in the source UAT documents before the final release gate can be treated as V1 validation evidence.");

  return `${lines.join("\n")}\n`;
}

export function generateV1UatExecutionPackFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(path.join(rootDir, environmentPath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(path.join(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(path.join(rootDir, manifestPath), "utf8"));
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(path.join(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(path.join(rootDir, signoffRegisterPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(path.join(rootDir, evidencePath), "utf8"));

  return generateV1UatExecutionPackMarkdown({
    generatedAt,
    environmentResult,
    trackerResult,
    manifestResult,
    defectRegisterResult,
    signoffRegisterResult,
    evidenceResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath
  });
}

function parseArgs(argv) {
  const parsed = {
    rootDir: process.cwd(),
    evidencePath: DEFAULT_EVIDENCE_PATH,
    trackerPath: DEFAULT_TRACKER_PATH,
    manifestPath: DEFAULT_MANIFEST_PATH,
    defectRegisterPath: DEFAULT_DEFECT_REGISTER_PATH,
    environmentPath: DEFAULT_ENVIRONMENT_PATH,
    signoffRegisterPath: DEFAULT_SIGNOFF_REGISTER_PATH,
    outputPath: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.rootDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--evidence") {
      parsed.evidencePath = argv[index + 1];
      index += 1;
    } else if (arg === "--tracker") {
      parsed.trackerPath = argv[index + 1];
      index += 1;
    } else if (arg === "--manifest") {
      parsed.manifestPath = argv[index + 1];
      index += 1;
    } else if (arg === "--defects") {
      parsed.defectRegisterPath = argv[index + 1];
      index += 1;
    } else if (arg === "--environment") {
      parsed.environmentPath = argv[index + 1];
      index += 1;
    } else if (arg === "--signoffs") {
      parsed.signoffRegisterPath = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      parsed.outputPath = argv[index + 1] ?? DEFAULT_OUTPUT_PATH;
      index += 1;
    }
  }

  return parsed;
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  const markdown = generateV1UatExecutionPackFromFiles(args);
  if (args.outputPath) {
    writeFileSync(path.join(args.rootDir, args.outputPath), markdown);
  } else {
    console.log(markdown.trimEnd());
  }
}
