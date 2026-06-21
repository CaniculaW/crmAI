#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";
const DEFAULT_EVIDENCE_ROOT = "docs/meeting-notes/evidence/kickoff";

const TEMPLATE_REQUIREMENTS = [
  ["product-owner.md", "owner", "产品负责人", "已确认"],
  ["sales-owner.md", "owner", "业务验收人-销售侧", "已确认"],
  ["manager-owner.md", "owner", "业务验收人-管理侧", "已确认"],
  ["dev-owner.md", "owner", "研发负责人", "已确认"],
  ["frontend-owner.md", "owner", "前端负责人", "已确认"],
  ["backend-owner.md", "owner", "后端负责人", "已确认"],
  ["qa-owner.md", "owner", "测试负责人", "已确认"],
  ["v1-scope.md", "scope", "V1 模块范围", "已确认"],
  ["v1-loop.md", "scope", "V1 业务闭环", "已确认"],
  ["out-of-scope.md", "scope", "V1 暂不做", "已确认"],
  ["schedule.md", "scope", "上线周期", "已确认"],
  ["tech-stack.md", "scope", "技术栈", "已确认"],
  ["acceptance-mode.md", "scope", "验收方式", "已确认"],
  ["scope-freeze.md", "scope", "V1范围冻结", "已冻结"]
];

function evidencePath(evidenceRoot, filename) {
  return `${evidenceRoot.replace(/\/+$/, "")}/${filename}`;
}

function hasPlaceholder(value) {
  return /待填写|待补充|待确认|PENDING|TBD|TODO|<.+>/i.test(value);
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value);
}

function isNamedOwner(value) {
  return isConcrete(value)
    && !/(Owner|负责人|验收人|测试|研发|产品|项目|销售|管理|QA|Dev|PM|Manager|Product|Sales|Test|Frontend|Backend)/i.test(value);
}

function isRetainedEvidenceReference(value) {
  return isConcrete(value) && (value.startsWith("docs/") || /^https?:\/\//i.test(value));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function fieldMap(markdown) {
  const fields = new Map();
  for (const row of tableRows(markdown)) {
    if (row.length >= 2 && row[0] !== "Field") {
      fields.set(row[0], row[1]);
    }
  }
  return fields;
}

function metadataValue(markdown, label) {
  const match = markdown.match(new RegExp(`^${escapeRegex(label)}:\\s*\`?([^\\n\`]+)\`?\\s*$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function parseTemplate(content, templatePath, requirement) {
  const [, expectedType, expectedLabel, expectedTargetStatus] = requirement;
  const labelMatch = content.match(/^# CRM V1 Kickoff Governance Evidence - (.+)$/m);
  const fields = fieldMap(content);
  const parsed = {
    path: templatePath,
    type: metadataValue(content, "Evidence type"),
    status: metadataValue(content, "Evidence status"),
    label: labelMatch?.[1]?.trim() ?? "",
    targetStatus: metadataValue(content, "Target status in kickoff minutes"),
    ownerOrApprover: fields.get("Named owner or approver") ?? "",
    closureValue: fields.get("Closure value") ?? "",
    retainedEvidenceReference: fields.get("Retained evidence reference") ?? "",
    failures: []
  };

  if (parsed.type !== expectedType) {
    parsed.failures.push(`Expected evidence type ${expectedType}.`);
  }
  if (parsed.label !== expectedLabel) {
    parsed.failures.push(`Expected evidence label ${expectedLabel}.`);
  }
  if (parsed.targetStatus !== expectedTargetStatus) {
    parsed.failures.push(`Expected target status ${expectedTargetStatus}.`);
  }
  if (parsed.status !== "Ready") {
    parsed.failures.push("Evidence status must be `Ready` before applying.");
  }
  if (!isConcrete(parsed.closureValue)) {
    parsed.failures.push("Closure value is incomplete.");
  }
  if (!isRetainedEvidenceReference(parsed.retainedEvidenceReference)) {
    parsed.failures.push("Retained evidence reference must be a docs/ artifact or http(s) URL.");
  }
  if (expectedType === "owner" && !isNamedOwner(parsed.ownerOrApprover)) {
    parsed.failures.push("Named owner or approver must be a named person, not a role label.");
  }
  if (expectedType === "scope" && !isNamedOwner(parsed.ownerOrApprover)) {
    parsed.failures.push("Scope approver must be a named person, not a role label.");
  }

  return parsed;
}

export function evaluateKickoffGovernanceEvidenceTemplates(
  templatesByPath,
  { evidenceRoot = DEFAULT_EVIDENCE_ROOT } = {}
) {
  const entries = [];
  const failed = [];

  for (const requirement of TEMPLATE_REQUIREMENTS) {
    const [filename] = requirement;
    const templatePath = evidencePath(evidenceRoot, filename);
    const content = templatesByPath[templatePath];
    if (!content) {
      failed.push({ path: templatePath, failures: ["Required evidence template is missing."] });
      continue;
    }

    const parsed = parseTemplate(content, templatePath, requirement);
    entries.push(parsed);
    if (parsed.failures.length > 0) {
      failed.push({ path: templatePath, failures: parsed.failures });
    }
  }

  return {
    ok: failed.length === 0,
    entries,
    failed
  };
}

function replaceDecision(markdown, decision) {
  if (!decision) {
    return markdown;
  }
  if (/^Decision:\s*(Go|Conditional Go|No-Go)\s*$/m.test(markdown)) {
    return markdown.replace(/^Decision:\s*(Go|Conditional Go|No-Go)\s*$/m, `Decision: ${decision}`);
  }
  return markdown.replace(/^(日期：.+)$/m, `$1\n\nDecision: ${decision}`);
}

function replaceMarkdownRow(markdown, rowLabel, newRow) {
  const rowRegex = new RegExp(`^\\|\\s*${escapeRegex(rowLabel)}\\s*\\|.*$`, "m");
  if (!rowRegex.test(markdown)) {
    return markdown;
  }
  return markdown.replace(rowRegex, newRow);
}

export function applyKickoffGovernanceEvidenceToMarkdown({
  kickoffMarkdown,
  templatesByPath,
  decision = null,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT
}) {
  const evaluation = evaluateKickoffGovernanceEvidenceTemplates(templatesByPath, { evidenceRoot });
  if (!evaluation.ok) {
    return {
      ok: false,
      failed: evaluation.failed,
      updatedMarkdown: kickoffMarkdown
    };
  }

  let updatedMarkdown = replaceDecision(kickoffMarkdown, decision);
  for (const entry of evaluation.entries) {
    if (entry.type === "owner") {
      updatedMarkdown = replaceMarkdownRow(
        updatedMarkdown,
        entry.label,
        `| ${entry.label} | ${entry.ownerOrApprover} | ${entry.targetStatus} | ${entry.retainedEvidenceReference} | 启动治理补证已留存 |`
      );
    } else {
      updatedMarkdown = replaceMarkdownRow(
        updatedMarkdown,
        entry.label,
        `| ${entry.label} | ${entry.closureValue} | ${entry.targetStatus} | ${entry.retainedEvidenceReference} |`
      );
    }
  }

  return {
    ok: true,
    failed: [],
    updatedMarkdown
  };
}

function readTemplates(rootDir, evidenceRoot) {
  const templatesByPath = {};
  for (const [filename] of TEMPLATE_REQUIREMENTS) {
    const templatePath = evidencePath(evidenceRoot, filename);
    const absolutePath = path.resolve(rootDir, templatePath);
    if (existsSync(absolutePath)) {
      templatesByPath[templatePath] = readFileSync(absolutePath, "utf8");
    }
  }
  return templatesByPath;
}

function parseArgs(argv) {
  const parsed = {
    write: false,
    kickoffPath: DEFAULT_KICKOFF_PATH,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT,
    decision: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") {
      parsed.write = true;
    } else if (arg === "--kickoff") {
      parsed.kickoffPath = argv[index + 1];
      index += 1;
    } else if (arg === "--evidence-root") {
      parsed.evidenceRoot = argv[index + 1];
      index += 1;
    } else if (arg === "--decision") {
      parsed.decision = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function printUsage() {
  console.error("Usage: node scripts/v1-kickoff-governance-evidence-apply.mjs [--write] [--decision Go] [--kickoff docs/meeting-notes/crm-kickoff-minutes.md] [--evidence-root docs/meeting-notes/evidence/kickoff]");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.decision) {
    printUsage();
    process.exitCode = 1;
  } else {
    const kickoffPath = path.resolve(options.kickoffPath);
    const kickoffMarkdown = readFileSync(kickoffPath, "utf8");
    const templatesByPath = readTemplates(process.cwd(), options.evidenceRoot);
    const result = applyKickoffGovernanceEvidenceToMarkdown({
      kickoffMarkdown,
      templatesByPath,
      decision: options.decision,
      evidenceRoot: options.evidenceRoot
    });

    if (!result.ok) {
      console.error("Kickoff governance evidence templates are not ready:");
      for (const failure of result.failed) {
        console.error(`- ${failure.path}: ${failure.failures.join("; ")}`);
      }
      process.exitCode = 1;
    } else if (options.write) {
      writeFileSync(kickoffPath, result.updatedMarkdown);
      console.log(options.kickoffPath);
    } else {
      process.stdout.write(result.updatedMarkdown);
    }
  }
}
