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
  "scripts/v1-uat-environment-validate.mjs",
  "scripts/v1-uat-environment-validate.test.mjs",
  "scripts/v1-uat-evidence-pack-validate.mjs",
  "scripts/v1-uat-evidence-pack-validate.test.mjs",
  "scripts/v1-uat-defect-register-validate.mjs",
  "scripts/v1-uat-defect-register-validate.test.mjs",
  "scripts/v1-uat-signoff-register-validate.mjs",
  "scripts/v1-uat-signoff-register-validate.test.mjs",
  "scripts/v1-kickoff-governance-validate.mjs",
  "scripts/v1-kickoff-governance-validate.test.mjs",
  "scripts/v1-uat-launch-intake-validate.mjs",
  "scripts/v1-uat-launch-intake-validate.test.mjs",
  "scripts/v1-uat-evidence-manifest-validate.mjs",
  "scripts/v1-uat-evidence-manifest-validate.test.mjs",
  "scripts/v1-evidence-reference-check.mjs",
  "scripts/v1-evidence-reference-check.test.mjs",
  "scripts/v1-uat-execution-tracker-validate.mjs",
  "scripts/v1-uat-execution-tracker-validate.test.mjs",
  "scripts/v1-release-gate.mjs",
  "scripts/v1-release-gate.test.mjs",
  "scripts/v1-validation-status.mjs",
  "scripts/v1-validation-status.test.mjs",
  "scripts/v1-uat-action-plan.mjs",
  "scripts/v1-uat-action-plan.test.mjs",
  "scripts/v1-uat-execution-pack.mjs",
  "scripts/v1-uat-execution-pack.test.mjs",
  "scripts/v1-go-no-go-meeting.mjs",
  "scripts/v1-go-no-go-meeting.test.mjs",
  "scripts/v1-external-uat-request.mjs",
  "scripts/v1-external-uat-request.test.mjs",
  "scripts/v1-generated-docs-check.mjs",
  "scripts/v1-generated-docs-check.test.mjs",
  "scripts/v1-release-gate-status-check.mjs",
  "scripts/v1-release-gate-status-check.test.mjs",
  "scripts/v1-plan-status-check.mjs",
  "scripts/v1-plan-status-check.test.mjs",
  "scripts/v1-acceptance-checklist-check.mjs",
  "scripts/v1-acceptance-checklist-check.test.mjs",
  "scripts/v1-uat-coverage-check.mjs",
  "scripts/v1-uat-coverage-check.test.mjs",
  "scripts/v1-traceability-check.mjs",
  "scripts/v1-traceability-check.test.mjs",
  "scripts/v1-blocker-consistency-check.mjs",
  "scripts/v1-blocker-consistency-check.test.mjs",
  "scripts/v1-external-uat-request-coverage-check.mjs",
  "scripts/v1-external-uat-request-coverage-check.test.mjs",
  "scripts/v1-final-evidence-handoff-check.mjs",
  "scripts/v1-final-evidence-handoff-check.test.mjs",
  "scripts/v1-secret-scan-check.mjs",
  "scripts/v1-secret-scan-check.test.mjs",
  "docs/releases/v1.0.0-rc.8.md",
  "docs/testing/v1-automated-validation-report-2026-06-18.md",
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-uat-execution-pack.md",
  "docs/testing/v1-go-no-go-meeting.md",
  "docs/testing/v1-external-uat-request.md",
  "docs/testing/v1-release-gate-status.json",
  "docs/meeting-notes/crm-kickoff-minutes.md",
  "docs/testing/crm-v1-validation-traceability.md",
  "docs/testing/crm-v1-test-environment-validation-runbook.md",
  "docs/testing/crm-v1-uat-evidence-pack-template.md",
  "docs/testing/crm-v1-uat-execution-tracker.md",
  "docs/testing/v1-uat-environment-evidence.md",
  "docs/testing/v1-uat-defect-register.md",
  "docs/testing/v1-uat-signoff-register.md",
  "docs/testing/v1-uat-launch-intake.md",
  "docs/testing/v1-uat-evidence-manifest.md",
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

function hasUatEvidenceManifest(content) {
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
    "CRM V1 UAT Evidence Manifest",
    "v1.0.0-rc.8",
    "Decision: No-Go",
    "Evidence ID",
    "Evidence reference",
    "ENV-EVIDENCE",
    "DEF-REGISTER",
    "DEF-P0",
    "DEF-P1",
    "SIGNOFF-SALES",
    "SIGNOFF-MANAGER",
    "SIGNOFF-PRODUCT",
    "SIGNOFF-TEST",
    "SIGNOFF-DEV",
    "SIGNOFF-PM",
    "GO-NOGO",
    "不记录明文密码",
    "node scripts/v1-uat-evidence-manifest-validate.mjs"
  ]) && includesAll(content, requiredPreChecks)
    && includesAll(content, requiredSmokeChecks)
    && includesAll(content, requiredUatCases);
}

function hasUatEnvironmentEvidence(content) {
  const requiredChecks = Array.from(
    { length: 8 },
    (_, index) => `ENV-${String(index + 1).padStart(3, "0")}`
  );

  return includesAll(content, [
    "CRM V1 UAT Environment Evidence",
    "v1.0.0-rc.8",
    "Decision: No-Go",
    "Environment Summary",
    "测试环境名称",
    "前端访问地址",
    "后端 API 地址",
    "候选版本",
    "Git 提交号",
    "不记录明文密码",
    "node scripts/v1-uat-environment-validate.mjs"
  ]) && includesAll(content, requiredChecks);
}

function hasUatDefectRegister(content) {
  return includesAll(content, [
    "CRM V1 UAT Defect Register",
    "v1.0.0-rc.8",
    "Decision: No-Go",
    "Severity Summary",
    "P0 / S1 阻断",
    "P1 / S2 严重",
    "Defect Details",
    "DEF-DRAFT",
    "不记录明文密码",
    "node scripts/v1-uat-defect-register-validate.mjs"
  ]);
}

function hasUatSignoffRegister(content) {
  return includesAll(content, [
    "CRM V1 UAT Signoff Register",
    "v1.0.0-rc.8",
    "Decision: No-Go",
    "SIGNOFF-SALES",
    "SIGNOFF-MANAGER",
    "SIGNOFF-PRODUCT",
    "SIGNOFF-TEST",
    "SIGNOFF-DEV",
    "SIGNOFF-PM",
    "不记录明文密码",
    "node scripts/v1-uat-signoff-register-validate.mjs"
  ]);
}

function hasKickoffGovernance(content) {
  return includesAll(content, [
    "CRM研发启动会纪要",
    "Decision: No-Go",
    "产品负责人",
    "业务验收人-销售侧",
    "业务验收人-管理侧",
    "研发负责人",
    "前端负责人",
    "后端负责人",
    "测试负责人",
    "V1 模块范围",
    "V1 业务闭环",
    "V1 暂不做",
    "上线周期",
    "技术栈",
    "验收方式",
    "V1范围冻结",
    "不记录明文密码",
    "node scripts/v1-kickoff-governance-validate.mjs"
  ]);
}

function hasUatLaunchIntake(content) {
  return includesAll(content, [
    "CRM V1 UAT Launch Intake",
    "v1.0.0-rc.8",
    "Decision: No-Go",
    "测试环境名称",
    "前端访问地址",
    "后端 API 地址",
    "Git 提交号",
    "UAT窗口",
    "证据归档位置",
    "UAT-SALES",
    "UAT-MANAGER",
    "UAT-PRODUCT",
    "UAT-TEST",
    "UAT-DEV",
    "UAT-PM",
    "管理员账号",
    "销售个人账号",
    "销售负责人账号",
    "权限样本账号",
    "不记录明文密码",
    "node scripts/v1-uat-launch-intake-validate.mjs"
  ]);
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
      "actions/checkout@v4",
      "fetch-depth: 2",
      "docker compose -f compose.v1-test.yml config",
      "node scripts/v1-deployment-config-check.mjs",
      "node --test scripts/v1-deployment-config-check.test.mjs",
      "mvn -B test",
      "mvn -B verify -Ppostgres-it",
      "npm test",
      "npm run build"
    ]),
    "GitHub Actions V1 Validation covers deployment config, backend, PostgreSQL integration, frontend tests, build, and checkout history depth for validation status commit freshness."
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
      "basic-info-format",
      "basic-version-fields-complete",
      "basic-owners-complete",
      "basic-owner-name-format",
      "uat-case-owner-name-format",
      "signoff-owner-name-format",
      "signoff-date-format",
      "no-secret-material",
      "evidence-references-retained",
      "evidence-reference-artifacts",
      "fails a Go evidence pack when a P0 defect remains open",
      "fails when basic evidence pack metadata is not structured",
      "fails when evidence pack version rows are missing",
      "fails when evidence pack contains secret-like material",
      "fails when passed evidence references point to missing docs artifacts",
      "fails when a basic evidence pack owner row is missing",
      "fails when a basic evidence pack owner is only a role label",
      "fails when a passed UAT case owner is only a role label",
      "fails when an approved signoff owner is only a role label",
      "fails when an approved signoff date is not structured",
      "fails when passed UAT evidence references are not retained"
    ]),
    "UAT evidence pack validator is covered by tests and enforces Go/No-Go hard gates with structured metadata, traceable version fields, named owners, dated signoffs, retained evidence references, existing docs artifacts, and secret redaction."
  ));

  const environmentValidator = snapshot["scripts/v1-uat-environment-validate.mjs"] ?? "";
  const environmentValidatorTest = snapshot["scripts/v1-uat-environment-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-environment-validator",
    includesAll(workflow + environmentValidator + environmentValidatorTest, [
      "node --test scripts/v1-uat-environment-validate.test.mjs",
      "evaluateUatEnvironmentEvidence",
      "environment-summary",
      "environment-summary-format",
      "environment-checks",
      "environment-owner-name-format",
      "environment-evidence-retained",
      "environment-evidence-artifacts",
      "no-secret-material",
      "fails a draft environment record when named environment evidence is pending",
      "fails when environment URLs or git commit are not structured",
      "fails when a PASS environment check owner is only a role label",
      "fails when PASS environment evidence reference is not retained",
      "fails when PASS environment evidence reference points to a missing docs artifact"
    ]),
    "UAT environment evidence validator is tested and enforces named environment metadata, http(s) URLs, 40-character git commit SHA, named PASS check owners, retained smoke/account evidence, existing docs artifacts, and secret redaction."
  ));

  const defectRegisterValidator = snapshot["scripts/v1-uat-defect-register-validate.mjs"] ?? "";
  const defectRegisterValidatorTest = snapshot["scripts/v1-uat-defect-register-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-defect-register-validator",
    includesAll(workflow + defectRegisterValidator + defectRegisterValidatorTest, [
      "node --test scripts/v1-uat-defect-register-validate.test.mjs",
      "evaluateUatDefectRegister",
      "p0-p1-summary",
      "defect-source-case-format",
      "defect-owner-name-format",
      "regression-evidence",
      "defect-evidence-retained",
      "defect-evidence-artifacts",
      "no-secret-material",
      "fails the current draft defect register because P0 and P1 closure evidence is pending",
      "fails when a P0 or P1 defect source case is not traceable",
      "fails when a P0 or P1 defect owner is only a role label",
      "fails when closed P0 or P1 regression evidence is not retained",
      "fails when closed P0 or P1 regression evidence points to a missing docs artifact"
    ]),
    "UAT defect register validator is tested and enforces P0/P1 summary, traceable source cases, named defect owners, closure, retained regression evidence, existing docs artifacts, and secret redaction."
  ));

  const signoffRegisterValidator = snapshot["scripts/v1-uat-signoff-register-validate.mjs"] ?? "";
  const signoffRegisterValidatorTest = snapshot["scripts/v1-uat-signoff-register-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-signoff-register-validator",
    includesAll(workflow + signoffRegisterValidator + signoffRegisterValidatorTest, [
      "node --test scripts/v1-uat-signoff-register-validate.test.mjs",
      "evaluateUatSignoffRegister",
      "required-signoffs",
      "signoff-owner-name-format",
      "signed-date-format",
      "signoff-evidence-retained",
      "signoff-evidence-artifacts",
      "project-go-decision",
      "no-secret-material",
      "fails the draft signoff register because signoffs are pending",
      "fails when an approved signoff owner is only a role label",
      "fails when an approved signoff uses a non-ISO signed date",
      "fails when an approved signoff evidence reference is not retained",
      "fails when approved signoff evidence points to a missing docs artifact"
    ]),
    "UAT signoff register validator is tested and enforces role signoff, named owners, ISO signed dates, retained evidence references, existing docs artifacts, project Go decision, and secret redaction."
  ));

  const kickoffValidator = snapshot["scripts/v1-kickoff-governance-validate.mjs"] ?? "";
  const kickoffValidatorTest = snapshot["scripts/v1-kickoff-governance-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "kickoff-governance-validator",
    includesAll(workflow + kickoffValidator + kickoffValidatorTest, [
      "node --test scripts/v1-kickoff-governance-validate.test.mjs",
      "evaluateKickoffGovernance",
      "required-owners",
      "owner-name-format",
      "scope-freeze",
      "scope-boundary",
      "schedule-format",
      "kickoff-evidence-retained",
      "kickoff-evidence-artifacts",
      "no-secret-material",
      "fails the current kickoff draft because owners and scope freeze remain pending",
      "fails when a confirmed kickoff owner is only a role label",
      "fails when kickoff schedule is not a structured date range",
      "fails when confirmed kickoff governance evidence is not retained",
      "fails when confirmed kickoff governance evidence points to missing docs artifacts"
    ]),
    "Kickoff governance validator is tested and enforces named owner rows, role-label rejection, V1 scope freeze, structured schedule, retained evidence references, existing docs artifacts, scope boundary, project Go, and secret redaction."
  ));

  const launchIntakeValidator = snapshot["scripts/v1-uat-launch-intake-validate.mjs"] ?? "";
  const launchIntakeValidatorTest = snapshot["scripts/v1-uat-launch-intake-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-launch-intake-validator",
    includesAll(workflow + launchIntakeValidator + launchIntakeValidatorTest, [
      "node --test scripts/v1-uat-launch-intake-validate.test.mjs",
      "evaluateUatLaunchIntake",
      "environment-intake",
      "environment-format",
      "launch-window-format",
      "participant-roster",
      "participant-owner-name-format",
      "account-custody",
      "account-owner-name-format",
      "launch-evidence-retained",
      "launch-evidence-artifacts",
      "no-secret-material",
      "fails a draft launch intake because external UAT inputs are pending",
      "fails when a confirmed UAT participant owner is only a role label",
      "fails when a prepared account custody owner is only a role label",
      "fails when launch environment URLs or git commit are not structured",
      "fails when the UAT launch window is not a structured date time range",
      "fails when UAT launch evidence references are not retained",
      "fails when UAT launch evidence references point to missing docs artifacts"
    ]),
    "UAT launch intake validator is tested and enforces named environment, http(s) URLs, 40-character git commit SHA, structured UAT window, named participant owners, participant roster, named account custody owners, account custody, retained evidence references, existing docs artifacts, and secret redaction."
  ));

  const evidenceManifestValidator = snapshot["scripts/v1-uat-evidence-manifest-validate.mjs"] ?? "";
  const evidenceManifestValidatorTest = snapshot["scripts/v1-uat-evidence-manifest-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-evidence-manifest-validator",
    includesAll(workflow + evidenceManifestValidator + evidenceManifestValidatorTest, [
      "node --test scripts/v1-uat-evidence-manifest-validate.test.mjs",
      "evaluateUatEvidenceManifest",
      "required-items",
      "evidence-complete",
      "evidence-references-retained",
      "pass-owner-name-format",
      "no-secret-material",
      "fails the current draft manifest because external UAT evidence is pending",
      "fails when PASS evidence references are not retained",
      "fails when a PASS evidence owner is only a role label"
    ]),
    "UAT evidence manifest validator is tested and enforces evidence inventory completeness, named PASS evidence owners, concrete retained references, and secret redaction."
  ));

  const evidenceReferenceChecker = snapshot["scripts/v1-evidence-reference-check.mjs"] ?? "";
  const evidenceReferenceCheckerTest = snapshot["scripts/v1-evidence-reference-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-evidence-reference-checker",
    includesAll(workflow + evidenceReferenceChecker + evidenceReferenceCheckerTest, [
      "node --test scripts/v1-evidence-reference-check.test.mjs",
      "node scripts/v1-evidence-reference-check.mjs",
      "evaluateEvidenceReferences",
      "evaluateEvidenceReferencesFromFiles",
      "pass-reference-artifacts",
      "go-pass-references",
      "fails a PASS evidence row when its repository artifact path is missing",
      "fails a PASS evidence row when its reference is not retained under docs or an external URL"
    ]),
    "V1 evidence reference checker is tested and wired into CI to keep manifest PASS rows tied to retained docs artifacts or external URLs."
  ));

  const executionTrackerValidator = snapshot["scripts/v1-uat-execution-tracker-validate.mjs"] ?? "";
  const executionTrackerValidatorTest = snapshot["scripts/v1-uat-execution-tracker-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-execution-tracker-validator",
    includesAll(workflow + executionTrackerValidator + executionTrackerValidatorTest, [
      "node --test scripts/v1-uat-execution-tracker-validate.test.mjs",
      "evaluateUatExecutionTracker",
      "required-items",
      "tracker-role-owner-name-format",
      "uat-case-owner-name-format",
      "release-gates",
      "tracker-evidence-retained",
      "tracker-evidence-artifacts",
      "fails the current rc8 tracker because external UAT remains pending",
      "fails when a signed tracker role owner is only a role label",
      "fails when a passed UAT case owner is only a role label",
      "fails when passed tracker evidence references are not retained",
      "fails when passed tracker evidence references point to missing docs artifacts"
    ]),
    "UAT execution tracker validator is tested and reports pending external UAT, named tracker role owners, named passed UAT case owners, retained evidence references, existing docs artifacts, defects, signoff, and release-gate blockers."
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
      "kickoff-governance",
      "uat-launch-intake",
      "uat-environment",
      "fails when kickoff governance remains incomplete",
      "fails when the project decision is Conditional Go"
    ]),
    "Final V1 release gate is tested and requires readiness, kickoff governance, UAT launch intake, formal UAT evidence, and an explicit Go decision."
  ));

  const validationStatus = snapshot["scripts/v1-validation-status.mjs"] ?? "";
  const validationStatusTest = snapshot["scripts/v1-validation-status.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-validation-status-report",
    includesAll(workflow + validationStatus + validationStatusTest, [
      "node --test scripts/v1-validation-status.test.mjs",
      "generateV1ValidationStatusMarkdown",
      "Overall: No-Go",
      "UAT Environment Evidence",
      "UAT Execution Tracker",
      "summarizes a No-Go V1 status with concrete blocker commands"
    ]),
    "V1 validation status report is tested and summarizes current Go/No-Go blockers from existing gates."
  ));

  const uatActionPlan = snapshot["scripts/v1-uat-action-plan.mjs"] ?? "";
  const uatActionPlanTest = snapshot["scripts/v1-uat-action-plan.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-uat-action-plan",
    includesAll(workflow + uatActionPlan + uatActionPlanTest, [
      "node --test scripts/v1-uat-action-plan.test.mjs",
      "generateV1UatActionPlanMarkdown",
      "Overall: No-Go",
      "Role Workstreams",
      "UAT Environment Evidence",
      "generates a No-Go UAT action plan grouped by project, test, business, and engineering workstreams"
    ]),
    "V1 UAT action plan is tested and turns validator blockers into role-based execution workstreams."
  ));

  const uatExecutionPack = snapshot["scripts/v1-uat-execution-pack.mjs"] ?? "";
  const uatExecutionPackTest = snapshot["scripts/v1-uat-execution-pack.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-uat-execution-pack",
    includesAll(workflow + uatExecutionPack + uatExecutionPackTest, [
      "node --test scripts/v1-uat-execution-pack.test.mjs",
      "generateV1UatExecutionPackMarkdown",
      "Overall: No-Go",
      "Execution Items",
      "ENV-001",
      "UAT-010",
      "generates an executable UAT evidence collection pack from failed gates"
    ]),
    "V1 UAT execution pack is tested and turns failed gates into item-level evidence collection work."
  ));

  const goNoGoMeeting = snapshot["scripts/v1-go-no-go-meeting.mjs"] ?? "";
  const goNoGoMeetingTest = snapshot["scripts/v1-go-no-go-meeting.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-go-no-go-meeting-pack",
    includesAll(workflow + goNoGoMeeting + goNoGoMeetingTest, [
      "node --test scripts/v1-go-no-go-meeting.test.mjs",
      "generateV1GoNoGoMeetingMarkdown",
      "Decision Recommendation: No-Go",
      "Final Signoff Table",
      "UAT Environment Evidence",
      "generates a No-Go meeting pack that blocks approval until validators pass"
    ]),
    "V1 Go/No-Go meeting pack is tested and keeps final approval tied to validator PASS plus project Go."
  ));

  const externalUatRequest = snapshot["scripts/v1-external-uat-request.mjs"] ?? "";
  const externalUatRequestTest = snapshot["scripts/v1-external-uat-request.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-external-uat-request-pack",
    includesAll(workflow + externalUatRequest + externalUatRequestTest, [
      "node --test scripts/v1-external-uat-request.test.mjs",
      "generateV1ExternalUatRequestMarkdown",
      "Request Status: External UAT Evidence Required",
      "Request Board",
      "generates a No-Go external UAT request packet with source documents and validation commands"
    ]),
    "V1 external UAT request packet is tested and turns No-Go validators into a stakeholder-facing request board."
  ));

  const generatedDocsChecker = snapshot["scripts/v1-generated-docs-check.mjs"] ?? "";
  const generatedDocsCheckerTest = snapshot["scripts/v1-generated-docs-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-generated-docs-checker",
    includesAll(workflow + generatedDocsChecker + generatedDocsCheckerTest, [
      "node --test scripts/v1-generated-docs-check.test.mjs",
      "node scripts/v1-generated-docs-check.mjs",
      "evaluateGeneratedDocsSnapshot",
      "Generated document is stale",
      "validation-status-current-commit",
      "fails when a generated document drifts from its generator",
      "fails when the validation status document is not bound to the current git commit"
    ]),
    "Generated V1 docs checker is tested and wired into CI to prevent stale generated evidence packs and stale validation status commit bindings."
  ));

  const releaseGateStatusChecker = snapshot["scripts/v1-release-gate-status-check.mjs"] ?? "";
  const releaseGateStatusCheckerTest = snapshot["scripts/v1-release-gate-status-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-release-gate-status-checker",
    includesAll(workflow + releaseGateStatusChecker + releaseGateStatusCheckerTest, [
      "node --test scripts/v1-release-gate-status-check.test.mjs",
      "node scripts/v1-release-gate-status-check.mjs",
      "evaluateV1ReleaseGateStatusSnapshot",
      "required-checks",
      "result-shape",
      "fails when the release gate JSON snapshot omits a required check"
    ]),
    "V1 release gate JSON status checker is tested and wired into CI to keep the machine-readable release gate snapshot schema stable."
  ));

  const planStatusChecker = snapshot["scripts/v1-plan-status-check.mjs"] ?? "";
  const planStatusCheckerTest = snapshot["scripts/v1-plan-status-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-plan-status-checker",
    includesAll(workflow + planStatusChecker + planStatusCheckerTest, [
      "node --test scripts/v1-plan-status-check.test.mjs",
      "node scripts/v1-plan-status-check.mjs",
      "evaluateV1PlanStatusSnapshot",
      "open-plan-items-no-go",
      "fails when open plan items are paired with a Go validation status"
    ]),
    "V1 plan status checker is tested and wired into CI to keep launch-plan open items aligned with No-Go evidence."
  ));

  const acceptanceChecklistChecker = snapshot["scripts/v1-acceptance-checklist-check.mjs"] ?? "";
  const acceptanceChecklistCheckerTest = snapshot["scripts/v1-acceptance-checklist-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-acceptance-checklist-checker",
    includesAll(workflow + acceptanceChecklistChecker + acceptanceChecklistCheckerTest, [
      "node --test scripts/v1-acceptance-checklist-check.test.mjs",
      "node scripts/v1-acceptance-checklist-check.mjs",
      "evaluateV1AcceptanceChecklistSnapshot",
      "acceptance-status-release-alignment",
      "fails when all acceptance items are marked business passed while the release gate is No-Go"
    ]),
    "V1 acceptance checklist checker is tested and wired into CI to keep AC-001 through AC-017 business acceptance status aligned with release-gate evidence."
  ));

  const uatCoverageChecker = snapshot["scripts/v1-uat-coverage-check.mjs"] ?? "";
  const uatCoverageCheckerTest = snapshot["scripts/v1-uat-coverage-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-uat-coverage-checker",
    includesAll(workflow + uatCoverageChecker + uatCoverageCheckerTest, [
      "node --test scripts/v1-uat-coverage-check.test.mjs",
      "node scripts/v1-uat-coverage-check.mjs",
      "evaluateV1UatCoverageSnapshot",
      "uat-covers-all-acceptance-items",
      "uat-case-execution-detail",
      "fails when acceptance criteria are missing from UAT case mapping",
      "fails when UAT rows omit owner or evidence requirements"
    ]),
    "V1 UAT coverage checker is tested and wired into CI to keep UAT-001 through UAT-010 mapped to every AC-001 through AC-017 acceptance item with owner roles and evidence requirements."
  ));

  const traceabilityChecker = snapshot["scripts/v1-traceability-check.mjs"] ?? "";
  const traceabilityCheckerTest = snapshot["scripts/v1-traceability-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-traceability-checker",
    includesAll(workflow + traceabilityChecker + traceabilityCheckerTest, [
      "node --test scripts/v1-traceability-check.test.mjs",
      "node scripts/v1-traceability-check.mjs",
      "evaluateV1TraceabilitySnapshot",
      "traceability-release-alignment",
      "fails when traceability claims project acceptance while release gate is No-Go"
    ]),
    "V1 traceability checker is tested and wired into CI to keep the AC-001 through AC-017 evidence matrix aligned with release-gate status."
  ));

  const blockerConsistencyChecker = snapshot["scripts/v1-blocker-consistency-check.mjs"] ?? "";
  const blockerConsistencyCheckerTest = snapshot["scripts/v1-blocker-consistency-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-blocker-consistency-checker",
    includesAll(workflow + blockerConsistencyChecker + blockerConsistencyCheckerTest, [
      "node --test scripts/v1-blocker-consistency-check.test.mjs",
      "node scripts/v1-blocker-consistency-check.mjs",
      "evaluateV1BlockerConsistencySnapshot",
      "decision-doc-release-blockers",
      "fails when a decision document omits a release gate blocker",
      "fails when the external UAT request packet omits a release gate blocker"
    ]),
    "V1 blocker consistency checker is tested and wired into CI to keep current release-gate blockers visible in decision materials, external UAT requests, and execution actions."
  ));

  const externalUatRequestCoverageChecker = snapshot["scripts/v1-external-uat-request-coverage-check.mjs"] ?? "";
  const externalUatRequestCoverageCheckerTest = snapshot["scripts/v1-external-uat-request-coverage-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-external-uat-request-coverage-checker",
    includesAll(workflow + externalUatRequestCoverageChecker + externalUatRequestCoverageCheckerTest, [
      "node --test scripts/v1-external-uat-request-coverage-check.test.mjs",
      "node scripts/v1-external-uat-request-coverage-check.mjs",
      "evaluateV1ExternalUatRequestCoverageSnapshot",
      "request-blocker-coverage",
      "request-command-coverage",
      "request-workstream-routing",
      "fails when the external UAT request packet omits a failed validator check"
    ]),
    "V1 external UAT request coverage checker is tested and wired into CI to keep stakeholder request packets aligned with current failed validator checks and owner-side routing."
  ));

  const finalEvidenceHandoffChecker = snapshot["scripts/v1-final-evidence-handoff-check.mjs"] ?? "";
  const finalEvidenceHandoffCheckerTest = snapshot["scripts/v1-final-evidence-handoff-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-final-evidence-handoff-checker",
    includesAll(workflow + finalEvidenceHandoffChecker + finalEvidenceHandoffCheckerTest, [
      "node --test scripts/v1-final-evidence-handoff-check.test.mjs",
      "node scripts/v1-final-evidence-handoff-check.mjs",
      "evaluateV1FinalEvidenceHandoffSnapshot",
      "handoff-materials-present",
      "release-gate-status-readable",
      "external-blockers-visible",
      "no-go-handoff-guardrail",
      "handoff-command-coverage",
      "node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md",
      "node scripts/v1-acceptance-checklist-check.mjs",
      "node scripts/v1-uat-coverage-check.mjs",
      "node scripts/v1-traceability-check.mjs",
      "node scripts/v1-final-evidence-handoff-check.mjs",
      "fails when final handoff materials claim V1 acceptance while release gate is No-Go",
      "fails when final handoff materials omit acceptance and traceability commands",
      "fails when No-Go final handoff materials hide external UAT blockers",
      "fails when generated UAT handoff packets are missing"
    ]),
    "V1 final evidence handoff checker is tested and wired into CI to keep final handoff materials, generated UAT packets, release gate status, and external blockers aligned."
  ));

  const secretScanChecker = snapshot["scripts/v1-secret-scan-check.mjs"] ?? "";
  const secretScanCheckerTest = snapshot["scripts/v1-secret-scan-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-secret-scan-checker",
    includesAll(workflow + secretScanChecker + secretScanCheckerTest, [
      "node --test scripts/v1-secret-scan-check.test.mjs",
      "node scripts/v1-secret-scan-check.mjs",
      "evaluateV1SecretScanSnapshot",
      "current-v1-evidence-no-secrets",
      "README.md",
      "tracks the README final handoff entrypoint as current V1 evidence",
      "fails when a current V1 evidence document contains a bearer token"
    ]),
    "V1 secret scan checker is tested and wired into CI to keep current V1 evidence documents and final handoff entrypoints free of obvious plaintext secrets."
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
  const validationStatusDoc = snapshot["docs/testing/v1-validation-status.md"] ?? "";
  const uatActionPlanDoc = snapshot["docs/testing/v1-uat-action-plan.md"] ?? "";
  const goNoGoMeetingDoc = snapshot["docs/testing/v1-go-no-go-meeting.md"] ?? "";
  const externalUatRequestDoc = snapshot["docs/testing/v1-external-uat-request.md"] ?? "";
  checks.push(makeCheck(
    "external-uat-blockers-documented",
    includesAll(traceability + validationReport + validationStatusDoc + uatActionPlanDoc + goNoGoMeetingDoc + externalUatRequestDoc + release + acceptance, [
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
    includesAll(uatTemplate + runbook, ["Go/No-Go", "签署", "证据", "node scripts/v1-uat-coverage-check.mjs"]),
    "UAT runbook and evidence template include evidence, signature, and Go/No-Go sections."
  ));

  const uatExecutionTracker = snapshot["docs/testing/crm-v1-uat-execution-tracker.md"] ?? "";
  checks.push(makeCheck(
    "uat-execution-tracker",
    hasUatExecutionTracker(uatExecutionTracker),
    "UAT execution tracker assigns pre-checks, smoke checks, UAT-001 through UAT-010, signoffs, and final release-gate evidence."
  ));

  const uatEnvironmentEvidence = snapshot["docs/testing/v1-uat-environment-evidence.md"] ?? "";
  checks.push(makeCheck(
    "uat-environment-evidence",
    hasUatEnvironmentEvidence(uatEnvironmentEvidence),
    "UAT environment evidence inventories named environment metadata, smoke checks, account checks, and permission checks without secrets."
  ));

  const uatDefectRegister = snapshot["docs/testing/v1-uat-defect-register.md"] ?? "";
  checks.push(makeCheck(
    "uat-defect-register",
    hasUatDefectRegister(uatDefectRegister),
    "UAT defect register inventories P0/P1 closure and regression evidence without secrets."
  ));

  const uatSignoffRegister = snapshot["docs/testing/v1-uat-signoff-register.md"] ?? "";
  checks.push(makeCheck(
    "uat-signoff-register",
    hasUatSignoffRegister(uatSignoffRegister),
    "UAT signoff register inventories sales, management, product, test, development, and project signoffs without secrets."
  ));

  const kickoffGovernance = snapshot["docs/meeting-notes/crm-kickoff-minutes.md"] ?? "";
  checks.push(makeCheck(
    "kickoff-governance",
    hasKickoffGovernance(kickoffGovernance),
    "Kickoff minutes inventory owners, V1 scope freeze, out-of-scope items, acceptance mode, and No-Go status without secrets."
  ));

  const uatLaunchIntake = snapshot["docs/testing/v1-uat-launch-intake.md"] ?? "";
  checks.push(makeCheck(
    "uat-launch-intake",
    hasUatLaunchIntake(uatLaunchIntake),
    "UAT launch intake inventories named environment, UAT window, evidence repository, participant roster, and masked account custody without secrets."
  ));

  const uatEvidenceManifest = snapshot["docs/testing/v1-uat-evidence-manifest.md"] ?? "";
  checks.push(makeCheck(
    "uat-evidence-manifest",
    hasUatEvidenceManifest(uatEvidenceManifest),
    "UAT evidence manifest inventories PRE, SMK, UAT, defect, signoff, and Go/No-Go evidence references without secrets."
  ));

  const uatExecutionPackDoc = snapshot["docs/testing/v1-uat-execution-pack.md"] ?? "";
  checks.push(makeCheck(
    "uat-execution-pack-doc",
    includesAll(uatExecutionPackDoc, [
      "CRM V1 UAT Execution Pack",
      "Overall: No-Go",
      "Execution Items",
      "ENV-001",
      "PRE-001",
      "SMK-001",
      "UAT-001",
      "DEF-REGISTER",
      "SIGNOFF-SALES",
      "GO-NOGO"
    ]),
    "UAT execution pack inventories item-level evidence collection work for environment, pre-check, smoke, UAT, defect, signoff, and Go/No-Go evidence."
  ));

  checks.push(makeCheck(
    "external-uat-request-doc",
    includesAll(externalUatRequestDoc, [
      "CRM V1 External UAT Request Packet",
      "Request Status: External UAT Evidence Required",
      "Request Board",
      "Project / Product",
      "Test",
      "Business UAT",
      "Engineering",
      "Do not record plaintext passwords",
      "Kickoff Governance",
      "UAT Launch Intake",
      "UAT Environment Evidence",
      "UAT Evidence Pack",
      "UAT Evidence Manifest",
      "UAT Execution Tracker",
      "UAT Defect Register",
      "UAT Signoff Register",
      "Release Gate"
    ]),
    "External UAT request packet inventories stakeholder-facing source documents, validation commands, and No-Go blockers."
  ));

  const readme = snapshot["README.md"] ?? "";
  checks.push(makeCheck(
    "readme-entrypoints",
    includesAll(readme, ["compose.v1-test.yml", "docs/releases/v1.0.0-rc.8.md", "v1-kickoff-governance-validate.mjs", "v1-uat-environment-validate.mjs", "v1-uat-evidence-pack-validate.mjs", "v1-uat-defect-register-validate.mjs", "v1-uat-signoff-register-validate.mjs", "v1-uat-launch-intake-validate.mjs", "v1-uat-evidence-manifest-validate.mjs", "v1-evidence-reference-check.mjs", "v1-release-gate.mjs", "v1-validation-status.mjs", "v1-uat-action-plan.mjs", "v1-uat-execution-pack.mjs", "v1-go-no-go-meeting.mjs", "v1-external-uat-request.mjs", "v1-generated-docs-check.mjs", "v1-release-gate-status-check.mjs", "v1-plan-status-check.mjs", "v1-acceptance-checklist-check.mjs", "v1-uat-coverage-check.mjs", "v1-traceability-check.mjs", "v1-blocker-consistency-check.mjs", "v1-external-uat-request-coverage-check.mjs", "v1-final-evidence-handoff-check.mjs", "v1-secret-scan-check.mjs"]),
    "README links the test environment, V1 RC record, and final verification entrypoints."
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
