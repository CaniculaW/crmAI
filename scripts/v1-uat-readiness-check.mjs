#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ARTIFACTS = [
  ".github/workflows/v1-validation.yml",
  ".env.example",
  "compose.v1-test.yml",
  "backend/Dockerfile",
  "frontend/Dockerfile",
  "frontend/nginx.conf",
  "scripts/v1-uat-evidence-pack.mjs",
  "scripts/v1-uat-evidence-pack.test.mjs",
  "docs/releases/v1.0.0-rc.5.md",
  "docs/testing/v1-automated-validation-report-2026-06-18.md",
  "docs/testing/crm-v1-validation-traceability.md",
  "docs/testing/crm-v1-test-environment-validation-runbook.md",
  "docs/testing/crm-v1-uat-evidence-pack-template.md",
  "docs/testing/evidence/v1-local-uat-2026-06-18.md",
  "docs/testing/crm-v1-acceptance-checklist.md",
  "README.md"
];

function includesAll(content, needles) {
  return needles.every((needle) => content.includes(needle));
}

function makeCheck(id, ok, message, severity = "fail") {
  return { id, ok, message, severity };
}

export function evaluateReadinessSnapshot(snapshot) {
  const checks = [];

  const missingArtifacts = REQUIRED_ARTIFACTS.filter((artifact) => !(artifact in snapshot));
  checks.push(makeCheck(
    "required-artifacts",
    missingArtifacts.length === 0,
    missingArtifacts.length === 0
      ? "Required V1 RC/UAT artifacts are present."
      : `Missing required artifacts: ${missingArtifacts.join(", ")}`
  ));

  const workflow = snapshot[".github/workflows/v1-validation.yml"] ?? "";
  checks.push(makeCheck(
    "workflow-v1-validation",
    includesAll(workflow, [
      "deployment-config",
      "backend:",
      "frontend:",
      "docker compose -f compose.v1-test.yml config",
      "mvn -B test",
      "mvn -B verify -Ppostgres-it",
      "npm test",
      "npm run build"
    ]),
    "GitHub Actions V1 Validation covers deployment config, backend, PostgreSQL integration, frontend tests, and build."
  ));

  const compose = snapshot["compose.v1-test.yml"] ?? "";
  checks.push(makeCheck(
    "compose-services",
    includesAll(compose, ["db:", "backend:", "frontend:"]),
    "Compose test environment declares db, backend, and frontend services."
  ));

  const envExample = snapshot[".env.example"] ?? "";
  checks.push(makeCheck(
    "env-example-demo-seed",
    includesAll(envExample, ["CRM_SEED_V1_DEMO_ENABLED=true", "CRM_DB_USERNAME"]),
    ".env.example documents V1 demo seed and database settings."
  ));

  const evidenceGenerator = snapshot["scripts/v1-uat-evidence-pack.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-evidence-generator",
    includesAll(evidenceGenerator, ["generateEvidencePackMarkdown", "UAT-001", "UAT-010", "Go / Conditional Go / No-Go", "不记录明文密码"]),
    "UAT evidence pack generator covers business demo cases, Go/No-Go, and secret handling guidance."
  ));

  const release = snapshot["docs/releases/v1.0.0-rc.5.md"] ?? "";
  checks.push(makeCheck(
    "rc-release-record",
    includesAll(release, ["v1.0.0-rc.5", "GitHub Actions", "success", "UAT", "Go/No-Go", "V1-local-uat-20260618"]),
    "V1 RC record captures tag, CI evidence, UAT, and Go/No-Go context."
  ));

  const localEvidence = snapshot["docs/testing/evidence/v1-local-uat-2026-06-18.md"] ?? "";
  checks.push(makeCheck(
    "local-uat-evidence",
    includesAll(localEvidence, ["V1-local-uat-20260618", "v1.0.0-rc.5", "Flyway", "14", "/api/health", "/api/bootstrap", "Browser Use URL policy"]),
    "Local named validation evidence captures service checks and browser/Docker limitations."
  ));

  const acceptance = snapshot["docs/testing/crm-v1-acceptance-checklist.md"] ?? "";
  const missingAcceptanceItems = Array.from({ length: 17 }, (_, index) => {
    const id = String(index + 1).padStart(3, "0");
    return `AC-${id}`;
  }).filter((id) => !acceptance.includes(id));
  checks.push(makeCheck(
    "acceptance-items",
    missingAcceptanceItems.length === 0,
    missingAcceptanceItems.length === 0
      ? "Acceptance checklist covers AC-001 through AC-017."
      : `Acceptance checklist is missing: ${missingAcceptanceItems.join(", ")}`
  ));

  const traceability = snapshot["docs/testing/crm-v1-validation-traceability.md"] ?? "";
  const validationReport = snapshot["docs/testing/v1-automated-validation-report-2026-06-18.md"] ?? "";
  checks.push(makeCheck(
    "external-uat-blockers-documented",
    includesAll(traceability + validationReport + release + acceptance, [
      "具名测试环境",
      "业务验收签署",
      "仍需"
    ]),
    "External UAT blockers are explicitly documented instead of being treated as complete.",
    "warn"
  ));

  const uatTemplate = snapshot["docs/testing/crm-v1-uat-evidence-pack-template.md"] ?? "";
  const runbook = snapshot["docs/testing/crm-v1-test-environment-validation-runbook.md"] ?? "";
  checks.push(makeCheck(
    "uat-execution-materials",
    includesAll(uatTemplate + runbook, ["Go/No-Go", "签署", "证据"]),
    "UAT runbook and evidence template include evidence, signature, and Go/No-Go sections."
  ));

  const readme = snapshot["README.md"] ?? "";
  checks.push(makeCheck(
    "readme-entrypoints",
    includesAll(readme, ["compose.v1-test.yml", "docs/releases/v1.0.0-rc.5.md"]),
    "README links the test environment and V1 RC record."
  ));

  const failed = checks.filter((check) => !check.ok && check.severity === "fail");
  const warnings = checks.filter((check) => check.severity === "warn");
  const passed = checks.filter((check) => check.ok && check.severity === "fail");

  return {
    ok: failed.length === 0,
    passed,
    warnings,
    failed,
    checks
  };
}

export function readSnapshot(rootDir = process.cwd()) {
  const snapshot = {};
  for (const artifact of REQUIRED_ARTIFACTS) {
    const artifactPath = path.join(rootDir, artifact);
    if (existsSync(artifactPath)) {
      snapshot[artifact] = readFileSync(artifactPath, "utf8");
    }
  }
  return snapshot;
}

function printResult(result) {
  const lines = [
    "# V1 RC/UAT Readiness Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    const mark = check.ok ? "PASS" : check.severity === "warn" ? "WARN" : "FAIL";
    lines.push(`- ${mark} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means the RC/UAT engineering evidence pack is ready for execution. It does not replace named test environment validation or business signoff.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateReadinessSnapshot(readSnapshot(rootDir));
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
