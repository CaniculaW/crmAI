#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_SIGNOFFS = [
  { id: "SIGNOFF-SALES", role: "销售侧验收人", decision: "同意" },
  { id: "SIGNOFF-MANAGER", role: "管理侧验收人", decision: "同意" },
  { id: "SIGNOFF-PRODUCT", role: "产品负责人", decision: "同意" },
  { id: "SIGNOFF-TEST", role: "测试负责人", decision: "同意" },
  { id: "SIGNOFF-DEV", role: "研发负责人", decision: "同意" },
  { id: "SIGNOFF-PM", role: "项目负责人", decision: "Go" }
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
  return /待填写|待补充|待确认|待完成|PENDING|通过 \/ 不通过|同意 \/ 不同意|Go \/ No-Go/.test(value);
}

function hasSecretLikeMaterial(markdown) {
  return /((password|passwd|secret|api[_ -]?token|access[_ -]?token|refresh[_ -]?token)\s*[:=]|S3cure!123|Bearer\s+[A-Za-z0-9._-]+)/i.test(markdown);
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function findRow(rows, id) {
  return rows.find((row) => row[0] === id);
}

function isConcrete(value) {
  return Boolean(value) && !hasPlaceholder(value);
}

function isNamedOwner(value) {
  return isConcrete(value)
    && !/(Owner|负责人|验收人|测试|研发|产品|项目|销售|管理|QA|Dev|PM|Manager|Product|Sales|Test|Frontend|Backend)/i.test(value);
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function evidenceReferenceTokens(value) {
  return String(value ?? "")
    .replace(/`/g, "")
    .split(/[,\s;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isRetainedEvidenceReference(value) {
  return isConcrete(value) && evidenceReferenceTokens(value).some((token) =>
    token.startsWith("docs/") || /^https?:\/\//i.test(token)
  );
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

export function evaluateUatSignoffRegister(markdown, options = {}) {
  const rows = tableRows(markdown);
  const decision = extractDecision(markdown);
  const checks = [];

  const missingRoles = REQUIRED_SIGNOFFS
    .filter((required) => {
      const row = findRow(rows, required.id);
      return !row || row[1] !== required.role;
    })
    .map((required) => required.id);

  checks.push(makeCheck(
    "required-roles",
    missingRoles.length === 0,
    missingRoles.length === 0
      ? "Signoff register contains every required signoff role."
      : `Missing signoff roles: ${missingRoles.join(", ")}`
  ));

  const incompleteSignoffs = REQUIRED_SIGNOFFS
    .filter((required) => {
      const row = findRow(rows, required.id);
      if (!row) {
        return true;
      }
      const owner = row[2] ?? "";
      const rowDecision = row[3] ?? "";
      const signedDate = row[4] ?? "";
      const evidence = row[5] ?? "";
      return rowDecision !== required.decision
        || !isConcrete(owner)
        || !isIsoDate(signedDate)
        || !isConcrete(evidence);
    })
    .map((required) => required.id);

  checks.push(makeCheck(
    "required-signoffs",
    incompleteSignoffs.length === 0,
    incompleteSignoffs.length === 0
      ? "All required signoffs have owner, decision, date, and evidence."
      : `Incomplete signoffs: ${incompleteSignoffs.join(", ")}`
  ));

  const invalidSignedDateSignoffs = REQUIRED_SIGNOFFS
    .filter((required) => {
      const row = findRow(rows, required.id);
      if (!row) {
        return false;
      }
      const signedDate = row[4] ?? "";
      return isConcrete(signedDate) && !isIsoDate(signedDate);
    })
    .map((required) => required.id);

  checks.push(makeCheck(
    "signed-date-format",
    invalidSignedDateSignoffs.length === 0,
    invalidSignedDateSignoffs.length === 0
      ? "Signed dates use YYYY-MM-DD."
      : `Signoffs have non-ISO signed dates: ${invalidSignedDateSignoffs.join(", ")}`
  ));

  const invalidOwnerNameSignoffs = REQUIRED_SIGNOFFS
    .filter((required) => {
      const row = findRow(rows, required.id);
      if (!row) {
        return false;
      }
      const owner = row[2] ?? "";
      const rowDecision = row[3] ?? "";
      return rowDecision === required.decision && isConcrete(owner) && !isNamedOwner(owner);
    })
    .map((required) => required.id);

  checks.push(makeCheck(
    "signoff-owner-name-format",
    invalidOwnerNameSignoffs.length === 0,
    invalidOwnerNameSignoffs.length === 0
      ? "Approved signoff owners are named people rather than role labels."
      : `Approved signoffs use role labels instead of named people: ${invalidOwnerNameSignoffs.join(", ")}`
  ));

  const unretainedEvidenceSignoffs = REQUIRED_SIGNOFFS
    .filter((required) => {
      const row = findRow(rows, required.id);
      if (!row) {
        return false;
      }
      const owner = row[2] ?? "";
      const rowDecision = row[3] ?? "";
      const signedDate = row[4] ?? "";
      const evidence = row[5] ?? "";
      const completedSignoff = rowDecision === required.decision
        && isConcrete(owner)
        && isIsoDate(signedDate)
        && isConcrete(evidence);

      return completedSignoff && !isRetainedEvidenceReference(evidence);
    })
    .map((required) => required.id);

  checks.push(makeCheck(
    "signoff-evidence-retained",
    unretainedEvidenceSignoffs.length === 0,
    unretainedEvidenceSignoffs.length === 0
      ? "Approved signoff evidence references point to retained artifacts or external URLs."
      : `Approved signoffs have unretained evidence references: ${unretainedEvidenceSignoffs.join(", ")}`
  ));

  const completedSignoffEvidenceReferences = REQUIRED_SIGNOFFS
    .map((required) => findRow(rows, required.id))
    .filter((row, index) => {
      const required = REQUIRED_SIGNOFFS[index];
      if (!row) {
        return false;
      }
      const owner = row[2] ?? "";
      const rowDecision = row[3] ?? "";
      const signedDate = row[4] ?? "";
      const evidence = row[5] ?? "";

      return rowDecision === required.decision
        && isConcrete(owner)
        && isIsoDate(signedDate)
        && isConcrete(evidence)
        && isRetainedEvidenceReference(evidence);
    })
    .map((row) => row[5] ?? "");

  const missingEvidenceArtifacts = missingRepositoryArtifacts(
    options.rootDir,
    completedSignoffEvidenceReferences
  );

  checks.push(makeCheck(
    "signoff-evidence-artifacts",
    missingEvidenceArtifacts.length === 0,
    missingEvidenceArtifacts.length === 0
      ? "Approved signoff docs evidence artifacts exist and are non-empty when checked."
      : `Approved signoff docs evidence artifacts are missing or empty: ${missingEvidenceArtifacts.join(", ")}`
  ));

  const projectRow = findRow(rows, "SIGNOFF-PM");
  checks.push(makeCheck(
    "project-go-decision",
    decision === "Go" && projectRow?.[3] === "Go",
    decision === "Go" && projectRow?.[3] === "Go"
      ? "Project owner has explicitly signed Go."
      : `Project signoff is ${projectRow?.[3] || "MISSING"} and register decision is ${decision || "MISSING"}; V1 validation requires Go.`
  ));

  checks.push(makeCheck(
    "no-secret-material",
    !hasSecretLikeMaterial(markdown),
    hasSecretLikeMaterial(markdown)
      ? "Signoff register contains secret-like material."
      : "Signoff register does not contain secret-like material."
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    unretainedEvidenceSignoffs,
    missingEvidenceArtifacts,
    invalidOwnerNameSignoffs,
    invalidSignedDateSignoffs,
    passed,
    failed,
    checks
  };
}

function printResult(result) {
  const lines = [
    "# V1 UAT Signoff Register Validation",
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
    console.error("Usage: node scripts/v1-uat-signoff-register-validate.mjs <v1-uat-signoff-register.md>");
    process.exitCode = 1;
  } else {
    const result = evaluateUatSignoffRegister(readFileSync(targetPath, "utf8"), { rootDir: process.cwd() });
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  }
}
