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
  "scripts/v1-generated-docs-check.mjs",
  "scripts/v1-generated-docs-check.test.mjs",
  "scripts/v1-plan-status-check.mjs",
  "scripts/v1-plan-status-check.test.mjs",
  "scripts/v1-acceptance-checklist-check.mjs",
  "scripts/v1-acceptance-checklist-check.test.mjs",
  "scripts/v1-uat-coverage-check.mjs",
  "scripts/v1-uat-coverage-check.test.mjs",
  "scripts/v1-traceability-check.mjs",
  "scripts/v1-traceability-check.test.mjs",
  "docs/releases/v1.0.0-rc.8.md",
  "docs/testing/v1-automated-validation-report-2026-06-18.md",
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-uat-execution-pack.md",
  "docs/testing/v1-go-no-go-meeting.md",
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

  const environmentValidator = snapshot["scripts/v1-uat-environment-validate.mjs"] ?? "";
  const environmentValidatorTest = snapshot["scripts/v1-uat-environment-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-environment-validator",
    includesAll(workflow + environmentValidator + environmentValidatorTest, [
      "node --test scripts/v1-uat-environment-validate.test.mjs",
      "evaluateUatEnvironmentEvidence",
      "environment-summary",
      "environment-checks",
      "no-secret-material",
      "fails a draft environment record when named environment evidence is pending"
    ]),
    "UAT environment evidence validator is tested and enforces named environment metadata, smoke evidence, account evidence, and secret redaction."
  ));

  const defectRegisterValidator = snapshot["scripts/v1-uat-defect-register-validate.mjs"] ?? "";
  const defectRegisterValidatorTest = snapshot["scripts/v1-uat-defect-register-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-defect-register-validator",
    includesAll(workflow + defectRegisterValidator + defectRegisterValidatorTest, [
      "node --test scripts/v1-uat-defect-register-validate.test.mjs",
      "evaluateUatDefectRegister",
      "p0-p1-summary",
      "regression-evidence",
      "no-secret-material",
      "fails the current draft defect register because P0 and P1 closure evidence is pending"
    ]),
    "UAT defect register validator is tested and enforces P0/P1 summary, closure, regression evidence, and secret redaction."
  ));

  const signoffRegisterValidator = snapshot["scripts/v1-uat-signoff-register-validate.mjs"] ?? "";
  const signoffRegisterValidatorTest = snapshot["scripts/v1-uat-signoff-register-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-signoff-register-validator",
    includesAll(workflow + signoffRegisterValidator + signoffRegisterValidatorTest, [
      "node --test scripts/v1-uat-signoff-register-validate.test.mjs",
      "evaluateUatSignoffRegister",
      "required-signoffs",
      "project-go-decision",
      "no-secret-material",
      "fails the draft signoff register because signoffs are pending"
    ]),
    "UAT signoff register validator is tested and enforces role signoff, project Go decision, and secret redaction."
  ));

  const kickoffValidator = snapshot["scripts/v1-kickoff-governance-validate.mjs"] ?? "";
  const kickoffValidatorTest = snapshot["scripts/v1-kickoff-governance-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "kickoff-governance-validator",
    includesAll(workflow + kickoffValidator + kickoffValidatorTest, [
      "node --test scripts/v1-kickoff-governance-validate.test.mjs",
      "evaluateKickoffGovernance",
      "required-owners",
      "scope-freeze",
      "scope-boundary",
      "no-secret-material",
      "fails the current kickoff draft because owners and scope freeze remain pending"
    ]),
    "Kickoff governance validator is tested and enforces named owners, V1 scope freeze, scope boundary, project Go, and secret redaction."
  ));

  const launchIntakeValidator = snapshot["scripts/v1-uat-launch-intake-validate.mjs"] ?? "";
  const launchIntakeValidatorTest = snapshot["scripts/v1-uat-launch-intake-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-launch-intake-validator",
    includesAll(workflow + launchIntakeValidator + launchIntakeValidatorTest, [
      "node --test scripts/v1-uat-launch-intake-validate.test.mjs",
      "evaluateUatLaunchIntake",
      "environment-intake",
      "participant-roster",
      "account-custody",
      "no-secret-material",
      "fails a draft launch intake because external UAT inputs are pending"
    ]),
    "UAT launch intake validator is tested and enforces named environment, participant roster, account custody, and secret redaction."
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
      "no-secret-material",
      "fails the current draft manifest because external UAT evidence is pending"
    ]),
    "UAT evidence manifest validator is tested and enforces evidence inventory completeness, concrete references, and secret redaction."
  ));

  const executionTrackerValidator = snapshot["scripts/v1-uat-execution-tracker-validate.mjs"] ?? "";
  const executionTrackerValidatorTest = snapshot["scripts/v1-uat-execution-tracker-validate.test.mjs"] ?? "";
  checks.push(makeCheck(
    "uat-execution-tracker-validator",
    includesAll(workflow + executionTrackerValidator + executionTrackerValidatorTest, [
      "node --test scripts/v1-uat-execution-tracker-validate.test.mjs",
      "evaluateUatExecutionTracker",
      "required-items",
      "release-gates",
      "fails the current rc8 tracker because external UAT remains pending"
    ]),
    "UAT execution tracker validator is tested and reports pending external UAT, defects, signoff, and release-gate blockers."
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

  const generatedDocsChecker = snapshot["scripts/v1-generated-docs-check.mjs"] ?? "";
  const generatedDocsCheckerTest = snapshot["scripts/v1-generated-docs-check.test.mjs"] ?? "";
  checks.push(makeCheck(
    "v1-generated-docs-checker",
    includesAll(workflow + generatedDocsChecker + generatedDocsCheckerTest, [
      "node --test scripts/v1-generated-docs-check.test.mjs",
      "node scripts/v1-generated-docs-check.mjs",
      "evaluateGeneratedDocsSnapshot",
      "Generated document is stale",
      "fails when a generated document drifts from its generator"
    ]),
    "Generated V1 docs checker is tested and wired into CI to prevent stale generated evidence packs."
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
      "fails when acceptance criteria are missing from UAT case mapping"
    ]),
    "V1 UAT coverage checker is tested and wired into CI to keep UAT-001 through UAT-010 mapped to every AC-001 through AC-017 acceptance item."
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
  checks.push(makeCheck(
    "external-uat-blockers-documented",
    includesAll(traceability + validationReport + validationStatusDoc + uatActionPlanDoc + goNoGoMeetingDoc + release + acceptance, [
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

  const readme = snapshot["README.md"] ?? "";
  checks.push(makeCheck(
    "readme-entrypoints",
    includesAll(readme, ["compose.v1-test.yml", "docs/releases/v1.0.0-rc.8.md", "v1-kickoff-governance-validate.mjs", "v1-uat-environment-validate.mjs", "v1-uat-evidence-pack-validate.mjs", "v1-uat-defect-register-validate.mjs", "v1-uat-signoff-register-validate.mjs", "v1-uat-launch-intake-validate.mjs", "v1-uat-evidence-manifest-validate.mjs", "v1-validation-status.mjs", "v1-uat-action-plan.mjs", "v1-uat-execution-pack.mjs", "v1-go-no-go-meeting.mjs", "v1-generated-docs-check.mjs", "v1-plan-status-check.mjs", "v1-acceptance-checklist-check.mjs", "v1-uat-coverage-check.mjs", "v1-traceability-check.mjs"]),
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
