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
  "scripts/v1-deployment-config-check.mjs",
  "scripts/v1-deployment-config-check.test.mjs",
  "scripts/v1-uat-evidence-pack.mjs",
  "scripts/v1-uat-evidence-pack.test.mjs",
  "scripts/v1-uat-evidence-pack-validate.mjs",
  "scripts/v1-uat-evidence-pack-validate.test.mjs",
  "scripts/v1-release-gate.mjs",
  "scripts/v1-release-gate.test.mjs",
  "docs/releases/v1.0.0-rc.8.md",
  "docs/testing/v1-automated-validation-report-2026-06-18.md",
  "docs/testing/crm-v1-validation-traceability.md",
  "docs/testing/crm-v1-test-environment-validation-runbook.md",
  "docs/testing/crm-v1-uat-evidence-pack-template.md",
  "docs/testing/crm-v1-uat-execution-tracker.md",
  "docs/testing/evidence/v1-local-uat-2026-06-18.md",
  "docs/testing/evidence/v1-compose-uat-2026-06-19.md",
  "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md",
  "docs/testing/crm-v1-acceptance-checklist.md",
  "README.md"
];

function includesAll(content, needles) {
  return needles.every((needle) => content.includes(needle));
}

function businessCountAtLeastOne(content, key) {
  const match = content.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
  return match !== null && Number(match[1]) >= 1;
}

function hasNonEmptyBusinessCounts(content) {
  return ["accounts", "contacts", "opportunities", "activities"]
    .every((key) => businessCountAtLeastOne(content, key));
}

function hasRc8NoGoHandoffDraft(content) {
  return includesAll(content, [
    "v1.0.0-rc.8",
    "0c9db47b0df8a0b05e63b66bdaa09f46222d9f0c",
    "27776171025",
    "No-Go",
    "FAIL",
    "具名测试环境",
    "UAT-001",
    "UAT-010",
    "P0/P1缺陷汇总未填写",
    "销售侧、管理侧、产品、测试、研发和项目负责人签署未完成",
    "不能作为 `Go` 准出记录"
  ]);
}

function hasComposeDeploymentEvidence(content) {
  return includesAll(content, [
    "V1-compose-uat-20260619",
    "v1.0.0-rc.8",
    "8e9efba2ea50bfe32304ec488cde72ee5262f86b",
    "docker.1ms.run/library/postgres:16",
    "CRM_BACKEND_BUILD_IMAGE=docker.1ms.run/library/maven:3.9-eclipse-temurin-17",
    "CRM_BACKEND_RUNTIME_IMAGE=docker.1ms.run/library/eclipse-temurin:17-jre",
    "CRM_FRONTEND_BUILD_IMAGE=docker.1ms.run/library/node:22-alpine",
    "CRM_FRONTEND_RUNTIME_IMAGE=docker.1ms.run/library/nginx:1.27-alpine",
    "docker compose -f compose.v1-test.yml up -d --build",
    "crm-ai-v1-test-db-1",
    "crm-ai-v1-test-backend-1",
    "crm-ai-v1-test-frontend-1",
    "/api/health",
    "\"status\":\"UP\"",
    "/api/bootstrap",
    "\"permissions_count\":25",
    "\"accounts\":1",
    "\"contacts\":1",
    "\"opportunities\":1",
    "\"activities\":1",
    "npm run smoke:v1:browser",
    "v1-rc8-compose-browser-smoke-20260619.png"
  ]);
}

function hasUatExecutionTracker(content) {
  const requiredPreChecks = Array.from(
    { length: 6 },
    (_, index) => `PRE-${String(index + 1).padStart(3, "0")}`
  );
  const requiredSmokeChecks = Array.from(
    { length: 5 },
    (_, index) => `SMK-${String(index + 1).padStart(3, "0")}`
  );
  const requiredUatCases = Array.from(
    { length: 10 },
    (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`
  );

  return includesAll(content, [
    "CRM V1 UAT执行派工与证据追踪表",
    "v1.0.0-rc.8",
    "具名测试环境待确认",
    "crm-v1-uat-evidence-pack-rc8-draft.md",
    "node scripts/v1-uat-evidence-pack-validate.mjs",
    "node scripts/v1-release-gate.mjs",
    "No-Go",
    "销售侧验收人",
    "管理侧验收人",
    "产品负责人",
    "测试负责人",
    "研发负责人",
    "项目负责人"
  ]) && includesAll(content, requiredPreChecks)
    && includesAll(content, requiredSmokeChecks)
    && includesAll(content, requiredUatCases);
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
      "node scripts/v1-deployment-config-check.mjs",
      "node --test scripts/v1-deployment-config-check.test.mjs",
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

  const deploymentConfigChecker = snapshot["scripts/v1-deployment-config-check.mjs"] ?? "";
  const deploymentConfigCheckerTest = snapshot["scripts/v1-deployment-config-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "deployment-config-checker",
    includesAll(workflow + deploymentConfigChecker + deploymentConfigCheckerTest, [
      "node scripts/v1-deployment-config-check.mjs",
      "node --test scripts/v1-deployment-config-check.test.mjs",
      "evaluateDeploymentConfigSnapshot",
      "CRM_BACKEND_BUILD_IMAGE",
      "CRM_FRONTEND_RUNTIME_IMAGE",
      "configurable for mirrored registries"
    ]),
    "Deployment config checker is wired into CI and validates configurable mirrored-registry base images."
  ));

  const evidenceGenerator = snapshot["scripts/v1-uat-evidence-pack.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-evidence-generator",
    includesAll(evidenceGenerator, ["generateEvidencePackMarkdown", "UAT-001", "UAT-010", "Go / Conditional Go / No-Go", "不记录明文密码"]),
    "UAT evidence pack generator covers business demo cases, Go/No-Go, and secret handling guidance."
  ));

  const evidenceValidator = snapshot["scripts/v1-uat-evidence-pack-validate.mjs"] ?? "";
  const evidenceValidatorTest = snapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-evidence-validator",
    includesAll(workflow + evidenceValidator + evidenceValidatorTest, [
      "node --test scripts/v1-uat-evidence-pack-validate.test.mjs",
      "evaluateUatEvidencePack",
      "p0-defects",
      "signoff-complete",
      "go-hard-gates",
      "fails a Go evidence pack when a P0 defect remains open"
    ]),
    "UAT evidence pack validator is covered by tests and enforces Go/No-Go hard gates."
  ));

  const releaseGate = snapshot["scripts/v1-release-gate.mjs"] ?? "";
  const releaseGateTest = snapshot["scripts/v1-release-gate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-release-gate",
    includesAll(workflow + releaseGate + releaseGateTest, [
      "node --test scripts/v1-release-gate.test.mjs",
      "evaluateV1ReleaseGate",
      "evaluateV1ReleaseGateFromFiles",
      "V1 release gate requires Go",
      "fails when the project decision is Conditional Go"
    ]),
    "Final V1 release gate is tested and requires readiness, formal UAT evidence, and an explicit Go decision."
  ));

  const release = snapshot["docs/releases/v1.0.0-rc.8.md"] ?? "";
  checks.push(makeCheck(
    "rc-release-record",
    includesAll(release, ["v1.0.0-rc.8", "GitHub Actions", "success", "UAT", "Go/No-Go", "V1-local-uat-20260618", "CRM_BACKEND_BUILD_IMAGE", "v1-uat-evidence-pack-validate", "V1演示业务数据"]),
    "V1 RC record captures tag, CI evidence, UAT, and Go/No-Go context."
  ));

  const localEvidence = snapshot["docs/testing/evidence/v1-local-uat-2026-06-18.md"] ?? "";
  checks.push(makeCheck(
    "local-uat-evidence",
    includesAll(localEvidence, [
      "V1-local-uat-20260618",
      "v1.0.0-rc.8",
      "Flyway",
      "14",
      "/api/health",
      "/api/bootstrap",
      "Browser Use URL policy",
      "UAT evidence pack validator",
      "V1演示业务数据"
    ]) && hasNonEmptyBusinessCounts(localEvidence),
    "Local named validation evidence captures service checks, browser/Docker limitations, and non-empty V1 demo business data."
  ));

  const composeEvidence = snapshot["docs/testing/evidence/v1-compose-uat-2026-06-19.md"] ?? "";
  checks.push(makeCheck(
    "compose-uat-evidence",
    hasComposeDeploymentEvidence(composeEvidence),
    "Compose V1 test environment evidence captures mirrored image build, container status, API bootstrap counts, and browser smoke."
  ));

  const uatHandoffDraft = snapshot["docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md"] ?? "";
  checks.push(makeCheck(
    "uat-handoff-draft",
    hasRc8NoGoHandoffDraft(uatHandoffDraft),
    "RC8 UAT handoff draft preserves No-Go status and external UAT/signoff blockers."
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

  const uatExecutionTracker = snapshot["docs/testing/crm-v1-uat-execution-tracker.md"] ?? "";
  checks.push(makeCheck(
    "uat-execution-tracker",
    hasUatExecutionTracker(uatExecutionTracker),
    "UAT execution tracker assigns pre-checks, smoke checks, UAT-001 through UAT-010, signoffs, and final release-gate evidence."
  ));

  const readme = snapshot["README.md"] ?? "";
  checks.push(makeCheck(
    "readme-entrypoints",
    includesAll(readme, ["compose.v1-test.yml", "docs/releases/v1.0.0-rc.8.md", "v1-uat-evidence-pack-validate.mjs"]),
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
