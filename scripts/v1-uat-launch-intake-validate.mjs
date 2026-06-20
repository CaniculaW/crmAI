#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ENVIRONMENT_FIELDS = [
  "测试环境名称",
  "前端访问地址",
  "后端 API 地址",
  "Git 提交号",
  "UAT窗口",
  "证据归档位置"
];

const REQUIRED_PARTICIPANTS = [
  { id: "UAT-SALES", role: "销售侧验收人" },
  { id: "UAT-MANAGER", role: "管理侧验收人" },
  { id: "UAT-PRODUCT", role: "产品负责人" },
  { id: "UAT-TEST", role: "测试负责人" },
  { id: "UAT-DEV", role: "研发负责人" },
  { id: "UAT-PM", role: "项目负责人" }
];

const REQUIRED_ACCOUNT_ITEMS = [
  "管理员账号",
  "销售个人账号",
  "销售负责人账号",
  "权限样本账号"
];

function tableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function hasPlaceholder(value) {
  return /待填写|待补充|待确认|待准备|待执行|PENDING|TBD|TODO|<.+>/i.test(value);
}

function hasSecretLikeMaterial(markdown) {
  return /((password|passwd|secret|api[_ -]?token|access[_ -]?token|refresh[_ -]?token)\s*[:=]|S3cure!123|Bearer\s+[A-Za-z0-9._-]+)/i.test(markdown);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function findRow(rows, firstCell) {
  return rows.find((row) => row[0] === firstCell);
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value);
}

function isNamedOwner(value) {
  return isConcrete(value)
    && !/(Owner|负责人|验收人|测试|研发|产品|项目|销售|管理|QA|Dev|PM|Manager|Product|Sales|Test|Frontend|Backend)/i.test(value);
}

function parseDateTime(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const normalized = parsed.toISOString().slice(0, 16).replace("T", " ");
  return normalized === value ? parsed : null;
}

function parseLaunchWindow(value) {
  const parts = String(value ?? "").split(/\s+至\s+/);
  if (parts.length !== 2) {
    return null;
  }

  const start = parseDateTime(parts[0]);
  const end = parseDateTime(parts[1]);
  if (!start || !end || end <= start) {
    return null;
  }

  return { start, end };
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isGitSha(value) {
  return /^[a-f0-9]{40}$/i.test(value ?? "");
}

function evidenceReferenceTokens(value) {
  return value
    .split(/[\s,，;；]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isRetainedEvidenceReference(value) {
  return isConcrete(value) && evidenceReferenceTokens(value).some((token) => (
    token.startsWith("docs/") || /^https?:\/\//i.test(token)
  ));
}

function repositoryArtifactPath(reference) {
  return reference.split("#")[0].split("?")[0];
}

function existingRepositoryArtifact(rootDir, reference) {
  const artifactPath = repositoryArtifactPath(reference);
  if (!artifactPath.startsWith("docs/")) {
    return true;
  }

  const root = path.resolve(rootDir);
  const absolutePath = path.resolve(root, artifactPath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    return false;
  }

  return existsSync(absolutePath) && statSync(absolutePath).size > 0;
}

function missingRepositoryArtifacts(rootDir, references) {
  if (!rootDir) {
    return [];
  }

  const artifactReferences = references
    .flatMap((reference) => evidenceReferenceTokens(reference))
    .filter((reference) => reference.startsWith("docs/"));

  return [...new Set(artifactReferences)]
    .filter((reference) => !existingRepositoryArtifact(rootDir, reference));
}

function extractDecision(markdown) {
  const match = markdown.match(/^Decision:\s*(Go|Conditional Go|No-Go)\s*$/m);
  return match?.[1] ?? "";
}

export function evaluateUatLaunchIntake(markdown, options = {}) {
  const rows = tableRows(markdown);
  const decision = extractDecision(markdown);
  const checks = [];

  const incompleteEnvironment = REQUIRED_ENVIRONMENT_FIELDS
    .filter((field) => {
      const row = findRow(rows, field);
      return !row || !isConcrete(row[1] ?? "") || !isConcrete(row[2] ?? "");
    });

  checks.push(makeCheck(
    "environment-intake",
    incompleteEnvironment.length === 0,
    incompleteEnvironment.length === 0
      ? "UAT launch environment, window, commit, and evidence repository are concrete."
      : `Incomplete launch environment fields: ${incompleteEnvironment.join(", ")}`
  ));

  const environmentFormatRules = [
    { field: "前端访问地址", valid: isHttpUrl },
    { field: "后端 API 地址", valid: isHttpUrl },
    { field: "Git 提交号", valid: isGitSha }
  ];
  const invalidEnvironmentFormats = environmentFormatRules
    .filter(({ field, valid }) => {
      const row = findRow(rows, field);
      const value = row?.[1] ?? "";
      return isConcrete(value) && !valid(value);
    })
    .map(({ field }) => field);

  checks.push(makeCheck(
    "environment-format",
    invalidEnvironmentFormats.length === 0,
    invalidEnvironmentFormats.length === 0
      ? "Launch environment URLs are http(s) and Git commit is a 40-character SHA."
      : `Invalid launch environment formats: ${invalidEnvironmentFormats.join(", ")}`
  ));

  const launchWindowRow = findRow(rows, "UAT窗口");
  const invalidLaunchWindowFields = launchWindowRow
    && isConcrete(launchWindowRow[1] ?? "")
    && !parseLaunchWindow(launchWindowRow[1])
    ? ["UAT窗口"]
    : [];

  checks.push(makeCheck(
    "launch-window-format",
    invalidLaunchWindowFields.length === 0,
    invalidLaunchWindowFields.length === 0
      ? "UAT launch window uses YYYY-MM-DD HH:mm 至 YYYY-MM-DD HH:mm with an end after the start."
      : "UAT launch window must use YYYY-MM-DD HH:mm 至 YYYY-MM-DD HH:mm with an end after the start."
  ));

  const incompleteParticipants = REQUIRED_PARTICIPANTS
    .filter((required) => {
      const row = findRow(rows, required.id);
      return !row
        || row[1] !== required.role
        || !isConcrete(row[2] ?? "")
        || !isConcrete(row[3] ?? "")
        || !isConcrete(row[4] ?? "")
        || row[5] !== "已确认";
    })
    .map((required) => required.id);

  checks.push(makeCheck(
    "participant-roster",
    incompleteParticipants.length === 0,
    incompleteParticipants.length === 0
      ? "All required UAT participants are named and confirmed."
      : `Incomplete UAT participants: ${incompleteParticipants.join(", ")}`
  ));

  const invalidParticipantOwnerIntakes = REQUIRED_PARTICIPANTS
    .filter((required) => {
      const row = findRow(rows, required.id);
      if (!row) {
        return false;
      }
      const owner = row[2] ?? "";
      const status = row[5] ?? "";
      return status === "已确认" && isConcrete(owner) && !isNamedOwner(owner);
    })
    .map((required) => required.id);

  checks.push(makeCheck(
    "participant-owner-name-format",
    invalidParticipantOwnerIntakes.length === 0,
    invalidParticipantOwnerIntakes.length === 0
      ? "Confirmed UAT participant owners are named people rather than role labels."
      : `Confirmed UAT participants use role labels instead of named people: ${invalidParticipantOwnerIntakes.join(", ")}`
  ));

  const incompleteAccountCustody = REQUIRED_ACCOUNT_ITEMS
    .filter((item) => {
      const row = findRow(rows, item);
      return !row
        || !isConcrete(row[1] ?? "")
        || row[2] !== "已准备"
        || !isConcrete(row[3] ?? "");
    });

  checks.push(makeCheck(
    "account-custody",
    incompleteAccountCustody.length === 0,
    incompleteAccountCustody.length === 0
      ? "All required UAT account custody items are prepared with evidence."
      : `Incomplete account custody items: ${incompleteAccountCustody.join(", ")}`
  ));

  const invalidAccountOwnerItems = REQUIRED_ACCOUNT_ITEMS
    .filter((item) => {
      const row = findRow(rows, item);
      if (!row) {
        return false;
      }
      const owner = row[1] ?? "";
      const status = row[2] ?? "";
      return status === "已准备" && isConcrete(owner) && !isNamedOwner(owner);
    });

  checks.push(makeCheck(
    "account-owner-name-format",
    invalidAccountOwnerItems.length === 0,
    invalidAccountOwnerItems.length === 0
      ? "Prepared UAT account custody owners are named people rather than role labels."
      : `Prepared UAT account custody items use role labels instead of named people: ${invalidAccountOwnerItems.join(", ")}`
  ));

  const unretainedLaunchEvidenceFields = REQUIRED_ENVIRONMENT_FIELDS
    .filter((field) => {
      const row = findRow(rows, field);
      return row
        && isConcrete(row[1] ?? "")
        && isConcrete(row[2] ?? "")
        && !isRetainedEvidenceReference(row[2]);
    });

  const unretainedAccountEvidenceItems = REQUIRED_ACCOUNT_ITEMS
    .filter((item) => {
      const row = findRow(rows, item);
      return row
        && isConcrete(row[1] ?? "")
        && row[2] === "已准备"
        && isConcrete(row[3] ?? "")
        && !isRetainedEvidenceReference(row[3]);
    });

  checks.push(makeCheck(
    "launch-evidence-retained",
    unretainedLaunchEvidenceFields.length === 0 && unretainedAccountEvidenceItems.length === 0,
    unretainedLaunchEvidenceFields.length === 0 && unretainedAccountEvidenceItems.length === 0
      ? "Launch environment and account custody evidence references point to retained docs or external systems."
      : [
        unretainedLaunchEvidenceFields.length === 0
          ? ""
          : `Unretained launch evidence fields: ${unretainedLaunchEvidenceFields.join(", ")}`,
        unretainedAccountEvidenceItems.length === 0
          ? ""
          : `Unretained account evidence items: ${unretainedAccountEvidenceItems.join(", ")}`
      ].filter(Boolean).join("; ")
  ));

  const retainedLaunchEvidenceReferences = [
    ...REQUIRED_ENVIRONMENT_FIELDS
      .map((field) => findRow(rows, field))
      .filter((row) => row && isConcrete(row[1] ?? "") && isConcrete(row[2] ?? "") && isRetainedEvidenceReference(row[2]))
      .map((row) => row[2]),
    ...REQUIRED_ACCOUNT_ITEMS
      .map((item) => findRow(rows, item))
      .filter((row) => row && isConcrete(row[1] ?? "") && row[2] === "已准备" && isConcrete(row[3] ?? "") && isRetainedEvidenceReference(row[3]))
      .map((row) => row[3])
  ];
  const missingLaunchEvidenceArtifacts = missingRepositoryArtifacts(
    options.rootDir,
    retainedLaunchEvidenceReferences
  );
  checks.push(makeCheck(
    "launch-evidence-artifacts",
    missingLaunchEvidenceArtifacts.length === 0,
    missingLaunchEvidenceArtifacts.length === 0
      ? "Launch intake docs evidence artifacts exist and are non-empty when checked."
      : `Launch intake evidence docs artifacts are missing or empty: ${missingLaunchEvidenceArtifacts.join(", ")}`
  ));

  checks.push(makeCheck(
    "project-go-decision",
    decision === "Go",
    decision === "Go"
      ? "Project has approved UAT launch intake."
      : `Launch intake decision is ${decision || "MISSING"}; UAT launch requires Go.`
  ));

  checks.push(makeCheck(
    "no-secret-material",
    !hasSecretLikeMaterial(markdown),
    hasSecretLikeMaterial(markdown)
      ? "Launch intake contains secret-like material."
      : "Launch intake does not contain secret-like material."
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    invalidEnvironmentFormats,
    invalidLaunchWindowFields,
    invalidParticipantOwnerIntakes,
    invalidAccountOwnerItems,
    unretainedLaunchEvidenceFields,
    unretainedAccountEvidenceItems,
    missingLaunchEvidenceArtifacts,
    passed,
    failed,
    checks
  };
}

function printResult(result) {
  const lines = [
    "# V1 UAT Launch Intake Validation",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    `Decision: ${result.decision || "MISSING"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.error("Usage: node scripts/v1-uat-launch-intake-validate.mjs <v1-uat-launch-intake.md>");
    process.exitCode = 1;
  } else {
    const result = evaluateUatLaunchIntake(
      readFileSync(targetPath, "utf8"),
      { rootDir: process.cwd() }
    );
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
