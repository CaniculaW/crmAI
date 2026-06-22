#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_EVIDENCE_ROOT,
  DEFAULT_KICKOFF_PATH,
  KICKOFF_GOVERNANCE_TEMPLATE_REQUIREMENTS,
  evaluateKickoffGovernanceEvidenceTemplates,
  kickoffGovernanceEvidencePath
} from "./v1-kickoff-governance-evidence-apply.mjs";

function requiredClosureValue(filename, label) {
  const values = {
    "product-owner.md": "Named person, not a role label",
    "sales-owner.md": "Named person, not a role label",
    "manager-owner.md": "Named person, not a role label",
    "dev-owner.md": "Named person, not a role label",
    "frontend-owner.md": "Named person, not a role label",
    "backend-owner.md": "Named person, not a role label",
    "qa-owner.md": "Named person, not a role label",
    "v1-scope.md": "Confirmed V1 sales foundation modules",
    "v1-loop.md": "Confirmed end-to-end sales foundation flow",
    "out-of-scope.md": "Confirmed later-version and out-of-scope items",
    "schedule.md": "`YYYY-MM-DD 至 YYYY-MM-DD` with end after start",
    "tech-stack.md": "Confirmed React + Ant Design, Java Spring Boot, PostgreSQL or approved change",
    "acceptance-mode.md": "Confirmed sales-side and management-side acceptance mode",
    "scope-freeze.md": "Confirm V1 only includes sales foundation loop and later-version items stay out"
  };
  return values[filename] ?? `Concrete closure value for ${label}`;
}

function targetRow(type, label) {
  return `${type === "owner" ? "参会人" : "启动确认基线"}/${label}`;
}

function itemPath(evidenceRoot, filename) {
  return kickoffGovernanceEvidencePath(evidenceRoot, filename);
}

function templateItem(requirement, evidenceRoot) {
  const [filename, type, label, targetStatus] = requirement;
  return {
    filename,
    type,
    label,
    evidenceStatus: "Pending",
    targetStatus,
    ownerOrApprover: "待填写",
    closureValue: "待填写",
    confirmationDate: "YYYY-MM-DD",
    confirmationSource: "待填写，会议纪要、审批系统、邮件归档或外部系统 URL",
    retainedEvidenceReference: itemPath(evidenceRoot, filename),
    notes: "待填写",
    requiredClosureValue: requiredClosureValue(filename, label)
  };
}

export function generateKickoffGovernanceEvidenceIntakeTemplate({
  generatedAt = new Date().toISOString(),
  kickoffPath = DEFAULT_KICKOFF_PATH,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT
} = {}) {
  const payload = {
    generatedAt,
    decision: "Go",
    kickoffPath,
    evidenceRoot,
    confirmationDate: "YYYY-MM-DD",
    instructions: [
      "Replace every 待填写 or placeholder value with real named owners, closure values, confirmation sources, and retained docs/ or http(s) evidence references.",
      "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets.",
      "Run this script with --input and --write only after every item is Ready."
    ],
    items: KICKOFF_GOVERNANCE_TEMPLATE_REQUIREMENTS.map((requirement) => templateItem(requirement, evidenceRoot))
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function intakeItemByFilename(intake) {
  return new Map((intake.items ?? []).map((item) => [item.filename, item]));
}

function hasPlaceholder(value) {
  return /待填写|待补充|待确认|PENDING|TBD|TODO|<.+>/i.test(value ?? "");
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value);
}

function isNamedOwner(value) {
  return isConcrete(value)
    && !/(Owner|负责人|验收人|测试|研发|产品|项目|销售|管理|QA|Dev|PM|Manager|Product|Sales|Test|Frontend|Backend)/i.test(value);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");
}

function intakeFailureList(item, requirement) {
  const [, expectedType, expectedLabel, expectedTargetStatus] = requirement;
  const failures = [];

  if (item.type !== expectedType) {
    failures.push(`Expected evidence type ${expectedType}.`);
  }
  if (item.label !== expectedLabel) {
    failures.push(`Expected evidence label ${expectedLabel}.`);
  }
  if (item.targetStatus !== expectedTargetStatus) {
    failures.push(`Expected target status ${expectedTargetStatus}.`);
  }
  if (item.evidenceStatus !== "Ready") {
    failures.push("Evidence status must be `Ready` before writing templates.");
  }
  if (!isNamedOwner(item.ownerOrApprover)) {
    failures.push("Owner or approver is incomplete.");
  }
  if (!isConcrete(item.closureValue)) {
    failures.push("Closure value is incomplete.");
  }
  if (!isIsoDate(item.confirmationDate)) {
    failures.push("Confirmation date must use YYYY-MM-DD.");
  }
  if (!isConcrete(item.confirmationSource)) {
    failures.push("Confirmation source is incomplete.");
  }

  return failures;
}

export function evaluateKickoffGovernanceEvidenceIntake(intake = {}) {
  const itemsByFilename = intakeItemByFilename(intake);
  const entries = [];
  const failed = [];

  for (const requirement of KICKOFF_GOVERNANCE_TEMPLATE_REQUIREMENTS) {
    const [filename, type, label, targetStatus] = requirement;
    const item = {
      filename,
      type,
      label,
      targetStatus,
      ...(itemsByFilename.get(filename) ?? {})
    };
    const failures = itemsByFilename.has(filename)
      ? intakeFailureList(item, requirement)
      : ["Required intake row is missing."];
    const entry = {
      filename,
      type,
      label,
      evidenceStatus: item.evidenceStatus ?? "Missing",
      failures
    };
    entries.push(entry);
    if (failures.length > 0) {
      failed.push({
        filename,
        type,
        label,
        failures
      });
    }
  }

  const ready = entries.filter((entry) => entry.evidenceStatus === "Ready" && entry.failures.length === 0).length;
  const total = entries.length;

  return {
    ok: failed.length === 0,
    total,
    ready,
    pending: total - ready,
    entries,
    failed
  };
}

export function renderKickoffGovernanceEvidenceIntakeStatus(readiness) {
  const lines = [
    "# Kickoff Governance Intake Status",
    "",
    `Ready rows: \`${readiness.ready}/${readiness.total}\``,
    `Pending rows: \`${readiness.pending}\``,
    "",
    "| Intake row | Type | Target | Missing readiness |",
    "|---|---|---|---|"
  ];

  for (const failure of readiness.failed ?? []) {
    const missingReadiness = failure.failures.length > 0 ? failure.failures.join("; ") : "-";
    lines.push(`| ${failure.filename} | ${failure.type} | ${failure.label} | ${missingReadiness} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function generateKickoffGovernanceEvidenceCollectionForm({
  intake,
  generatedAt = new Date().toISOString()
} = {}) {
  const readiness = evaluateKickoffGovernanceEvidenceIntake(intake ?? {});
  const itemsByFilename = intakeItemByFilename(intake ?? {});
  const lines = [
    "# CRM V1 Kickoff Governance Evidence Collection Form",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Decision target: \`${intake?.decision ?? "Go"}\``,
    `Kickoff source: \`${intake?.kickoffPath ?? DEFAULT_KICKOFF_PATH}\``,
    `Evidence root: \`${intake?.evidenceRoot ?? DEFAULT_EVIDENCE_ROOT}\``,
    `Ready rows: \`${readiness.ready}/${readiness.total}\``,
    `Pending rows: \`${readiness.pending}\``,
    "",
    "Use this form to collect named owner, closure value, confirmation date, source, and retained evidence reference for the current `1-governance` task.",
    "Do not paste secret material or unmasked account custody data in this form.",
    "",
    "Validation commands:",
    "- `node scripts/v1-kickoff-governance-evidence-intake.mjs --input docs/meeting-notes/evidence/kickoff/intake.json --status`",
    "- `node scripts/v1-kickoff-governance-evidence-intake.mjs --input docs/meeting-notes/evidence/kickoff/intake.json --write`",
    "",
    "| Intake row | Type | Target | Status | Required closure value | Owner or approver | Closure value | Confirmation date | Confirmation source | Retained evidence reference | Notes |",
    "|---|---|---|---|---|---|---|---|---|---|---|"
  ];

  for (const requirement of KICKOFF_GOVERNANCE_TEMPLATE_REQUIREMENTS) {
    const [filename, type, label] = requirement;
    const item = itemsByFilename.get(filename) ?? {};
    lines.push([
      filename,
      type,
      label,
      item.evidenceStatus ?? "Missing",
      requiredClosureValue(filename, label),
      item.ownerOrApprover ?? "",
      item.closureValue ?? "",
      item.confirmationDate ?? "",
      item.confirmationSource ?? "",
      item.retainedEvidenceReference ?? itemPath(intake?.evidenceRoot ?? DEFAULT_EVIDENCE_ROOT, filename),
      item.notes ?? ""
    ].map((value) => String(value).replaceAll("|", "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  lines.push("");
  lines.push("Completion standard: all 14 rows become `Ready`; then write evidence templates and run kickoff governance validation before moving to the next TODOList phase.");

  return `${lines.join("\n")}\n`;
}

function evidenceMarkdown({
  item,
  generatedAt,
  kickoffPath,
  evidenceRoot
}) {
  const evidencePath = itemPath(evidenceRoot, item.filename);
  const confirmationDate = item.confirmationDate || "待填写";
  const lines = [
    `# CRM V1 Kickoff Governance Evidence - ${item.label}`,
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Evidence type: \`${item.type}\``,
    `Evidence status: \`${item.evidenceStatus}\``,
    `Target status in kickoff minutes: \`${item.targetStatus}\``,
    `Update target row: \`${kickoffPath}\` ${targetRow(item.type, item.label)}`,
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in this evidence.",
    "",
    "## Evidence Intake",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Named owner or approver | ${item.ownerOrApprover ?? ""} |`,
    `| Closure value | ${item.closureValue ?? ""} |`,
    `| Confirmation date | ${confirmationDate} |`,
    `| Confirmation source | ${item.confirmationSource ?? ""} |`,
    `| Retained evidence reference | ${item.retainedEvidenceReference ?? evidencePath} |`,
    `| Notes | ${item.notes ?? ""} |`
  ];
  return `${lines.join("\n")}\n`;
}

export function buildKickoffGovernanceEvidenceTemplatesFromIntake(intake, {
  generatedAt = intake?.generatedAt ?? new Date().toISOString(),
  kickoffPath = intake?.kickoffPath ?? DEFAULT_KICKOFF_PATH,
  evidenceRoot = intake?.evidenceRoot ?? DEFAULT_EVIDENCE_ROOT
} = {}) {
  const itemsByFilename = intakeItemByFilename(intake ?? {});
  const templatesByPath = {};

  for (const requirement of KICKOFF_GOVERNANCE_TEMPLATE_REQUIREMENTS) {
    const [filename, type, label, targetStatus] = requirement;
    const item = itemsByFilename.get(filename) ?? {};
    const normalizedItem = {
      ...item,
      filename,
      type,
      label,
      targetStatus
    };
    templatesByPath[itemPath(evidenceRoot, filename)] = evidenceMarkdown({
      item: normalizedItem,
      generatedAt,
      kickoffPath,
      evidenceRoot
    });
  }

  const evaluation = evaluateKickoffGovernanceEvidenceTemplates(templatesByPath, { evidenceRoot });
  if (!evaluation.ok) {
    return {
      ok: false,
      failed: evaluation.failed
    };
  }

  return {
    ok: true,
    failed: [],
    templatesByPath
  };
}

export function writeKickoffGovernanceEvidenceTemplatesFromIntake({
  rootDir = process.cwd(),
  intake
} = {}) {
  const result = buildKickoffGovernanceEvidenceTemplatesFromIntake(intake);
  if (!result.ok) {
    return result;
  }

  for (const [templatePath, content] of Object.entries(result.templatesByPath)) {
    const absolutePath = path.resolve(rootDir, templatePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }

  return result;
}

function parseArgs(argv) {
  const parsed = {
    template: false,
    inputPath: null,
    outputPath: null,
    write: false,
    status: false,
    collectionForm: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--template") {
      parsed.template = true;
    } else if (arg === "--input") {
      parsed.inputPath = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      parsed.outputPath = argv[index + 1];
      index += 1;
    } else if (arg === "--write") {
      parsed.write = true;
    } else if (arg === "--status") {
      parsed.status = true;
    } else if (arg === "--collection-form") {
      parsed.collectionForm = true;
    }
  }

  return parsed;
}

function printUsage() {
  console.error("Usage: node scripts/v1-kickoff-governance-evidence-intake.mjs --template [--output intake.json]");
  console.error("   or: node scripts/v1-kickoff-governance-evidence-intake.mjs --input intake.json --status");
  console.error("   or: node scripts/v1-kickoff-governance-evidence-intake.mjs --input intake.json --collection-form [--output form.md]");
  console.error("   or: node scripts/v1-kickoff-governance-evidence-intake.mjs --input intake.json --write");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const options = parseArgs(process.argv.slice(2));
  if (options.template) {
    const template = generateKickoffGovernanceEvidenceIntakeTemplate();
    if (options.outputPath) {
      writeFileSync(path.resolve(options.outputPath), template);
      console.log(options.outputPath);
    } else {
      process.stdout.write(template);
    }
  } else if (options.inputPath) {
    const intake = JSON.parse(readFileSync(path.resolve(options.inputPath), "utf8"));
    if (options.status) {
      const readiness = evaluateKickoffGovernanceEvidenceIntake(intake);
      process.stdout.write(renderKickoffGovernanceEvidenceIntakeStatus(readiness));
      if (!readiness.ok) {
        process.exitCode = 1;
      }
    } else if (options.collectionForm) {
      const markdown = generateKickoffGovernanceEvidenceCollectionForm({ intake });
      if (options.outputPath) {
        const outputPath = path.resolve(options.outputPath);
        mkdirSync(path.dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, markdown);
        console.log(outputPath);
      } else {
        process.stdout.write(markdown);
      }
    } else {
      const result = options.write
        ? writeKickoffGovernanceEvidenceTemplatesFromIntake({ intake })
        : buildKickoffGovernanceEvidenceTemplatesFromIntake(intake);
      if (!result.ok) {
        console.error("Kickoff governance intake is not ready:");
        for (const failure of result.failed) {
          console.error(`- ${failure.path}: ${failure.failures.join("; ")}`);
        }
        process.exitCode = 1;
      } else {
        for (const templatePath of Object.keys(result.templatesByPath)) {
          console.log(templatePath);
        }
      }
    }
  } else {
    printUsage();
    process.exitCode = 1;
  }
}
