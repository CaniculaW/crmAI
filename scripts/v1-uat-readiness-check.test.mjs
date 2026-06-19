import assert from "node:assert/strict";
import test from "node:test";

import { evaluateReadinessSnapshot } from "./v1-uat-readiness-check.mjs";

const completeSnapshot = {
  ".github/workflows/v1-validation.yml": `
jobs:
  deployment-config:
    steps:
      - run: docker compose -f compose.v1-test.yml config
      - run: node scripts/v1-deployment-config-check.mjs
      - run: node --test scripts/v1-deployment-config-check.test.mjs
      - run: node --test scripts/v1-uat-environment-validate.test.mjs
      - run: node --test scripts/v1-uat-evidence-pack-validate.test.mjs
      - run: node --test scripts/v1-uat-defect-register-validate.test.mjs
      - run: node --test scripts/v1-uat-signoff-register-validate.test.mjs
      - run: node --test scripts/v1-kickoff-governance-validate.test.mjs
      - run: node --test scripts/v1-uat-launch-intake-validate.test.mjs
      - run: node --test scripts/v1-uat-evidence-manifest-validate.test.mjs
      - run: node --test scripts/v1-uat-execution-tracker-validate.test.mjs
      - run: node --test scripts/v1-release-gate.test.mjs
      - run: node --test scripts/v1-validation-status.test.mjs
      - run: node --test scripts/v1-uat-action-plan.test.mjs
      - run: node --test scripts/v1-uat-execution-pack.test.mjs
      - run: node --test scripts/v1-go-no-go-meeting.test.mjs
      - run: node --test scripts/v1-generated-docs-check.test.mjs
      - run: node scripts/v1-generated-docs-check.mjs
      - run: node --test scripts/v1-plan-status-check.test.mjs
      - run: node scripts/v1-plan-status-check.mjs
      - run: node --test scripts/v1-acceptance-checklist-check.test.mjs
      - run: node scripts/v1-acceptance-checklist-check.mjs
      - run: node --test scripts/v1-uat-coverage-check.test.mjs
      - run: node scripts/v1-uat-coverage-check.mjs
  backend:
    steps:
      - run: mvn -B test
      - run: mvn -B verify -Ppostgres-it
  frontend:
    steps:
      - run: npm test
      - run: npm run build
`,
  ".env.example": "CRM_SEED_V1_DEMO_ENABLED=true\nCRM_DB_USERNAME=crm_ai\n",
  "compose.v1-test.yml": "services:\n  db:\n  backend:\n  frontend:\n",
  "backend/Dockerfile": "FROM maven:3.9-eclipse-temurin-17 AS build\n",
  "frontend/Dockerfile": "FROM node:22-alpine AS build\nFROM nginx:1.27-alpine\n",
  "frontend/nginx.conf": "location /api/ { proxy_pass http://backend:8080/api/; }\n",
  "scripts/v1-uat-evidence-pack.mjs": "generateEvidencePackMarkdown\nUAT-001\nUAT-010\nGo / Conditional Go / No-Go\n不记录明文密码\n",
  "scripts/v1-uat-evidence-pack.test.mjs": "generates a V1 UAT evidence pack\n",
  "scripts/v1-uat-environment-validate.mjs": "evaluateUatEnvironmentEvidence\nenvironment-summary\nenvironment-checks\nno-secret-material\n",
  "scripts/v1-uat-environment-validate.test.mjs": "fails a draft environment record when named environment evidence is pending\n",
  "scripts/v1-uat-evidence-pack-validate.mjs": "evaluateUatEvidencePack\np0-defects\nsignoff-complete\ngo-hard-gates\n",
  "scripts/v1-uat-evidence-pack-validate.test.mjs": "fails a Go evidence pack when a P0 defect remains open\n",
  "scripts/v1-uat-defect-register-validate.mjs": "evaluateUatDefectRegister\np0-p1-summary\nregression-evidence\nno-secret-material\n",
  "scripts/v1-uat-defect-register-validate.test.mjs": "fails the current draft defect register because P0 and P1 closure evidence is pending\n",
  "scripts/v1-uat-signoff-register-validate.mjs": "evaluateUatSignoffRegister\nrequired-signoffs\nproject-go-decision\nno-secret-material\n",
  "scripts/v1-uat-signoff-register-validate.test.mjs": "fails the draft signoff register because signoffs are pending\n",
  "scripts/v1-kickoff-governance-validate.mjs": "evaluateKickoffGovernance\nrequired-owners\nscope-freeze\nscope-boundary\nno-secret-material\n",
  "scripts/v1-kickoff-governance-validate.test.mjs": "fails the current kickoff draft because owners and scope freeze remain pending\n",
  "scripts/v1-uat-launch-intake-validate.mjs": "evaluateUatLaunchIntake\nenvironment-intake\nparticipant-roster\naccount-custody\nno-secret-material\n",
  "scripts/v1-uat-launch-intake-validate.test.mjs": "fails a draft launch intake because external UAT inputs are pending\n",
  "scripts/v1-uat-evidence-manifest-validate.mjs": "evaluateUatEvidenceManifest\nrequired-items\nevidence-complete\nno-secret-material\n",
  "scripts/v1-uat-evidence-manifest-validate.test.mjs": "fails the current draft manifest because external UAT evidence is pending\n",
  "scripts/v1-uat-execution-tracker-validate.mjs": "evaluateUatExecutionTracker\nrequired-items\nrelease-gates\n",
  "scripts/v1-uat-execution-tracker-validate.test.mjs": "fails the current rc8 tracker because external UAT remains pending\n",
  "scripts/v1-release-gate.mjs": "evaluateV1ReleaseGate\nevaluateV1ReleaseGateFromFiles\nV1 release gate requires Go\nkickoff-governance\nuat-launch-intake\nuat-environment\n",
  "scripts/v1-release-gate.test.mjs": "fails when kickoff governance remains incomplete\nfails when the UAT launch intake remains incomplete\nfails when the project decision is Conditional Go\n",
  "scripts/v1-validation-status.mjs": "generateV1ValidationStatusMarkdown\nOverall: No-Go\nKickoff Governance\nUAT Environment Evidence\nUAT Execution Tracker\n",
  "scripts/v1-validation-status.test.mjs": "summarizes a No-Go V1 status with concrete blocker commands\n",
  "scripts/v1-uat-action-plan.mjs": "generateV1UatActionPlanMarkdown\nOverall: No-Go\nRole Workstreams\nKickoff Governance\nUAT Environment Evidence\n",
  "scripts/v1-uat-action-plan.test.mjs": "generates a No-Go UAT action plan grouped by project, test, business, and engineering workstreams\n",
  "scripts/v1-uat-execution-pack.mjs": "generateV1UatExecutionPackMarkdown\nOverall: No-Go\nExecution Items\nKICKOFF-OWNERS\nENV-001\nUAT-010\n",
  "scripts/v1-uat-execution-pack.test.mjs": "generates an executable UAT evidence collection pack from failed gates\n",
  "scripts/v1-go-no-go-meeting.mjs": "generateV1GoNoGoMeetingMarkdown\nDecision Recommendation: No-Go\nFinal Signoff Table\nKickoff Governance\nUAT Environment Evidence\n",
  "scripts/v1-go-no-go-meeting.test.mjs": "generates a No-Go meeting pack that blocks approval until validators pass\n",
  "scripts/v1-generated-docs-check.mjs": "evaluateGeneratedDocsSnapshot\nGenerated document is stale\n",
  "scripts/v1-generated-docs-check.test.mjs": "fails when a generated document drifts from its generator\n",
  "scripts/v1-plan-status-check.mjs": "evaluateV1PlanStatusSnapshot\nopen-plan-items-no-go\n",
  "scripts/v1-plan-status-check.test.mjs": "fails when open plan items are paired with a Go validation status\n",
  "scripts/v1-acceptance-checklist-check.mjs": "evaluateV1AcceptanceChecklistSnapshot\nacceptance-status-release-alignment\n",
  "scripts/v1-acceptance-checklist-check.test.mjs": "fails when all acceptance items are marked business passed while the release gate is No-Go\n",
  "scripts/v1-uat-coverage-check.mjs": "evaluateV1UatCoverageSnapshot\nuat-covers-all-acceptance-items\n",
  "scripts/v1-uat-coverage-check.test.mjs": "fails when acceptance criteria are missing from UAT case mapping\n",
  "scripts/v1-deployment-config-check.mjs": "evaluateDeploymentConfigSnapshot\nCRM_BACKEND_BUILD_IMAGE\nCRM_FRONTEND_RUNTIME_IMAGE\n",
  "scripts/v1-deployment-config-check.test.mjs": "configurable for mirrored registries\n",
  "docs/releases/v1.0.0-rc.8.md": "v1.0.0-rc.8\nGitHub Actions `V1 Validation`\nsuccess\nUAT\nGo/No-Go\nV1-local-uat-20260618\nCRM_BACKEND_BUILD_IMAGE\nv1-uat-evidence-pack-validate\nV1演示业务数据\n仍需在具名测试环境完成验收签署\n",
  "docs/testing/v1-automated-validation-report-2026-06-18.md": "代码级、接口级、迁移级、本地部署态\nGitHub Actions\n具名测试环境部署态验收\n业务验收签署\n",
  "docs/testing/v1-validation-status.md": "CRM V1 Validation Status\nOverall: No-Go\nUAT Environment Evidence\nUAT Execution Tracker\nRelease Gate\n具名测试环境\n业务验收签署\n仍需\n",
  "docs/testing/v1-uat-action-plan.md": "CRM V1 UAT Action Plan\nOverall: No-Go\nRole Workstreams\nUAT Environment Evidence\n具名测试环境\n业务验收签署\n仍需\n",
  "docs/testing/v1-uat-execution-pack.md": "CRM V1 UAT Execution Pack\nOverall: No-Go\nExecution Items\nENV-001\nPRE-001\nSMK-001\nUAT-001\nDEF-REGISTER\nSIGNOFF-SALES\nGO-NOGO\n",
  "docs/testing/v1-go-no-go-meeting.md": "CRM V1 Go/No-Go Meeting Pack\nDecision Recommendation: No-Go\nFinal Signoff Table\nUAT Environment Evidence\n具名测试环境\n业务验收签署\n仍需\n",
  "docs/meeting-notes/crm-kickoff-minutes.md": `CRM研发启动会纪要
Decision: No-Go
产品负责人
业务验收人-销售侧
业务验收人-管理侧
研发负责人
前端负责人
后端负责人
测试负责人
V1 模块范围
V1 业务闭环
V1 暂不做
上线周期
技术栈
验收方式
V1范围冻结
不记录明文密码
node scripts/v1-kickoff-governance-validate.mjs
`,
  "docs/testing/crm-v1-validation-traceability.md": "研发验证通过\n若目标口径是“项目 V1 验收通过”，仍需完成具名测试环境验证和业务验收签署。\n",
  "docs/testing/crm-v1-test-environment-validation-runbook.md": "具名测试环境\n证据包\n签署\nUAT-001\nUAT-010\nAC-005\nAC-014\nnode scripts/v1-generated-docs-check.mjs\nnode scripts/v1-plan-status-check.mjs\nnode scripts/v1-uat-coverage-check.mjs\n",
  "docs/testing/crm-v1-uat-evidence-pack-template.md": "Go/No-Go\n签署\n缺陷\n",
  "docs/testing/crm-v1-uat-execution-tracker.md": `CRM V1 UAT执行派工与证据追踪表
v1.0.0-rc.8
${Array.from({ length: 6 }, (_, index) => `PRE-${String(index + 1).padStart(3, "0")}`).join("\n")}
${Array.from({ length: 5 }, (_, index) => `SMK-${String(index + 1).padStart(3, "0")}`).join("\n")}
${Array.from({ length: 10 }, (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`).join("\n")}
销售侧验收人
管理侧验收人
产品负责人
测试负责人
研发负责人
项目负责人
node scripts/v1-uat-evidence-pack-validate.mjs
node scripts/v1-release-gate.mjs
crm-v1-uat-evidence-pack-rc8-draft.md
No-Go
具名测试环境待确认
`,
  "docs/testing/v1-uat-environment-evidence.md": `CRM V1 UAT Environment Evidence
v1.0.0-rc.8
Decision: No-Go
Environment Summary
测试环境名称
前端访问地址
后端 API 地址
候选版本
Git 提交号
ENV-001
ENV-002
ENV-003
ENV-004
ENV-005
ENV-006
ENV-007
ENV-008
不记录明文密码
node scripts/v1-uat-environment-validate.mjs
`,
  "docs/testing/v1-uat-defect-register.md": `CRM V1 UAT Defect Register
v1.0.0-rc.8
Decision: No-Go
Severity Summary
P0 / S1 阻断
P1 / S2 严重
Defect Details
DEF-DRAFT
不记录明文密码
node scripts/v1-uat-defect-register-validate.mjs
`,
  "docs/testing/v1-uat-signoff-register.md": `CRM V1 UAT Signoff Register
v1.0.0-rc.8
Decision: No-Go
SIGNOFF-SALES
SIGNOFF-MANAGER
SIGNOFF-PRODUCT
SIGNOFF-TEST
SIGNOFF-DEV
SIGNOFF-PM
不记录明文密码
node scripts/v1-uat-signoff-register-validate.mjs
`,
  "docs/testing/v1-uat-launch-intake.md": `CRM V1 UAT Launch Intake
v1.0.0-rc.8
Decision: No-Go
测试环境名称
前端访问地址
后端 API 地址
Git 提交号
UAT窗口
证据归档位置
UAT-SALES
UAT-MANAGER
UAT-PRODUCT
UAT-TEST
UAT-DEV
UAT-PM
管理员账号
销售个人账号
销售负责人账号
权限样本账号
不记录明文密码
node scripts/v1-uat-launch-intake-validate.mjs
`,
  "docs/testing/v1-uat-evidence-manifest.md": `CRM V1 UAT Evidence Manifest
v1.0.0-rc.8
Decision: No-Go
Evidence ID
Evidence reference
ENV-EVIDENCE
${Array.from({ length: 6 }, (_, index) => `PRE-${String(index + 1).padStart(3, "0")}`).join("\n")}
${Array.from({ length: 5 }, (_, index) => `SMK-${String(index + 1).padStart(3, "0")}`).join("\n")}
${Array.from({ length: 10 }, (_, index) => `UAT-${String(index + 1).padStart(3, "0")}`).join("\n")}
DEF-P0
DEF-P1
DEF-REGISTER
SIGNOFF-REGISTER
SIGNOFF-SALES
SIGNOFF-MANAGER
SIGNOFF-PRODUCT
SIGNOFF-TEST
SIGNOFF-DEV
SIGNOFF-PM
GO-NOGO
不记录明文密码
node scripts/v1-uat-evidence-manifest-validate.mjs
`,
  "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.8\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\nUAT evidence pack validator\nV1演示业务数据\n\"accounts\": 1\n\"contacts\": 1\n\"opportunities\": 1\n\"activities\": 1\n",
  "docs/testing/evidence/v1-compose-uat-2026-06-19.md": "V1-compose-uat-20260619\nv1.0.0-rc.8\n8e9efba2ea50bfe32304ec488cde72ee5262f86b\ndocker.1ms.run/library/postgres:16\nCRM_BACKEND_BUILD_IMAGE=docker.1ms.run/library/maven:3.9-eclipse-temurin-17\nCRM_BACKEND_RUNTIME_IMAGE=docker.1ms.run/library/eclipse-temurin:17-jre\nCRM_FRONTEND_BUILD_IMAGE=docker.1ms.run/library/node:22-alpine\nCRM_FRONTEND_RUNTIME_IMAGE=docker.1ms.run/library/nginx:1.27-alpine\ndocker compose -f compose.v1-test.yml up -d --build\ncrm-ai-v1-test-db-1\ncrm-ai-v1-test-backend-1\ncrm-ai-v1-test-frontend-1\n/api/health\n\"status\":\"UP\"\n/api/bootstrap\n\"permissions_count\":25\n\"accounts\":1\n\"contacts\":1\n\"opportunities\":1\n\"activities\":1\nnpm run smoke:v1:browser\nv1-rc8-compose-browser-smoke-20260619.png\n",
  "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md": "v1.0.0-rc.8\n0c9db47b0df8a0b05e63b66bdaa09f46222d9f0c\n27776171025\nNo-Go\nFAIL\n具名测试环境\nUAT-001\nUAT-010\nP0/P1缺陷汇总未填写\n销售侧、管理侧、产品、测试、研发和项目负责人签署未完成\n不能作为 `Go` 准出记录\n",
  "docs/testing/crm-v1-acceptance-checklist.md": Array.from({ length: 17 }, (_, index) => {
    const id = String(index + 1).padStart(3, "0");
    return `AC-${id} | 研发验证通过，待业务验收`;
  }).join("\n") + "\n具名测试环境待部署确认\n",
  "README.md": "docs/releases/v1.0.0-rc.8.md\ncompose.v1-test.yml\nv1-kickoff-governance-validate.mjs\nv1-uat-environment-validate.mjs\nv1-uat-evidence-pack-validate.mjs\nv1-uat-defect-register-validate.mjs\nv1-uat-signoff-register-validate.mjs\nv1-uat-launch-intake-validate.mjs\nv1-uat-evidence-manifest-validate.mjs\nv1-validation-status.mjs\nv1-uat-action-plan.mjs\nv1-uat-execution-pack.mjs\nv1-go-no-go-meeting.mjs\nv1-generated-docs-check.mjs\nv1-plan-status-check.mjs\nv1-acceptance-checklist-check.mjs\nv1-uat-coverage-check.mjs\n"
};

test("passes when V1 rc8 and UAT readiness artifacts are documented", () => {
  const result = evaluateReadinessSnapshot(completeSnapshot);

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.ok(result.passed.some((check) => check.id === "workflow-v1-validation"));
  assert.ok(result.warnings.some((check) => check.id === "external-uat-blockers-documented"));
});

test("fails when a required readiness artifact is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/crm-v1-uat-evidence-pack-template.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the UAT evidence pack generator is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["scripts/v1-uat-evidence-pack.mjs"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the rc8 UAT handoff draft is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the Compose deployment evidence is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/evidence/v1-compose-uat-2026-06-19.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when local UAT evidence points to an older release candidate", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.7\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\nUAT evidence pack validator\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "local-uat-evidence"));
});

test("passes when local UAT business demo counts are greater than one", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.8\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\nUAT evidence pack validator\nV1演示业务数据\n\"accounts\": 2\n\"contacts\": 2\n\"opportunities\": 2\n\"activities\": 2\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
});

test("fails when local UAT business demo counts are empty", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.8\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\nUAT evidence pack validator\nV1演示业务数据\n\"accounts\": 0\n\"contacts\": 1\n\"opportunities\": 1\n\"activities\": 1\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "local-uat-evidence"));
});

test("fails when V1 deployment config checker is not wired into readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    ".github/workflows/v1-validation.yml": `
jobs:
  deployment-config:
    steps:
      - run: docker compose -f compose.v1-test.yml config
  backend:
    steps:
      - run: mvn -B test
      - run: mvn -B verify -Ppostgres-it
  frontend:
    steps:
      - run: npm test
      - run: npm run build
`
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "deployment-config-checker"));
});

test("fails when UAT evidence pack validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-evidence-pack-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT environment validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-environment-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-environment-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-environment-validator"));
});

test("fails when the UAT defect register validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-defect-register-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-defect-register-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-defect-register-validator"));
});

test("fails when the UAT signoff register validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-signoff-register-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-signoff-register-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-signoff-register-validator"));
});

test("fails when the UAT launch intake validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-launch-intake-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-launch-intake-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake-validator"));
});

test("fails when the kickoff governance validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-kickoff-governance-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-kickoff-governance-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "kickoff-governance-validator"));
});

test("fails when the UAT evidence manifest validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-manifest-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-evidence-manifest-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-manifest-validator"));
});

test("fails when the UAT execution tracker validator is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-execution-tracker-validate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-execution-tracker-validate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-execution-tracker-validator"));
});

test("fails when the final V1 release gate is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-release-gate.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-release-gate.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-release-gate"));
});

test("fails when the V1 validation status report is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-validation-status.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-validation-status.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-validation-status-report"));
});

test("fails when the V1 UAT action plan is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-action-plan.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-action-plan.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-uat-action-plan"));
});

test("fails when the V1 UAT execution pack is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-execution-pack.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-uat-execution-pack.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-uat-execution-pack"));
});

test("fails when the V1 Go/No-Go meeting pack is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-go-no-go-meeting.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-go-no-go-meeting.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-go-no-go-meeting-pack"));
});

test("fails when the V1 generated docs consistency checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-generated-docs-check.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-generated-docs-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-generated-docs-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-generated-docs-checker"));
});

test("fails when the V1 plan status checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-plan-status-check.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-plan-status-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-plan-status-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-plan-status-checker"));
});

test("fails when the V1 acceptance checklist checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-acceptance-checklist-check.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-acceptance-checklist-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-acceptance-checklist-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-acceptance-checklist-checker"));
});

test("fails when the V1 UAT coverage checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-coverage-check.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-uat-coverage-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-uat-coverage-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-uat-coverage-checker"));
});

test("fails when the V1 UAT execution pack document is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-uat-execution-pack.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the UAT execution tracker is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/crm-v1-uat-execution-tracker.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the UAT environment evidence is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-uat-environment-evidence.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the UAT environment evidence omits required ENV checks", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/v1-uat-environment-evidence.md": "CRM V1 UAT Environment Evidence\nDecision: No-Go\n测试环境名称\nENV-001\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-environment-evidence"));
});

test("fails when the UAT defect register is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-uat-defect-register.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the UAT signoff register is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-uat-signoff-register.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the UAT launch intake is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-uat-launch-intake.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the kickoff minutes are missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/meeting-notes/crm-kickoff-minutes.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the kickoff minutes omit scope freeze rows", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/meeting-notes/crm-kickoff-minutes.md": "CRM研发启动会纪要\nDecision: No-Go\n产品负责人\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "kickoff-governance"));
});

test("fails when the UAT launch intake omits account custody rows", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/v1-uat-launch-intake.md": "CRM V1 UAT Launch Intake\nDecision: No-Go\nUAT-SALES\n测试环境名称\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake"));
});

test("fails when the UAT signoff register omits required signoff rows", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/v1-uat-signoff-register.md": "CRM V1 UAT Signoff Register\nDecision: No-Go\nSIGNOFF-SALES\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-signoff-register"));
});

test("fails when the UAT defect register omits P0 or P1 summary rows", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/v1-uat-defect-register.md": "CRM V1 UAT Defect Register\nDecision: No-Go\nDEF-DRAFT\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-defect-register"));
});

test("fails when the UAT evidence manifest is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-uat-evidence-manifest.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the UAT evidence manifest omits required evidence IDs", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/v1-uat-evidence-manifest.md": "CRM V1 UAT Evidence Manifest\nDecision: No-Go\nPRE-001\nUAT-001\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-manifest"));
});

test("fails when the UAT execution tracker omits external UAT tasks or signoff roles", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/crm-v1-uat-execution-tracker.md": "CRM V1 UAT执行派工与证据追踪表\nv1.0.0-rc.8\nPRE-001\nUAT-001\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-execution-tracker"));
});

test("fails when the rc8 UAT handoff draft does not preserve No-Go blockers", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md": "v1.0.0-rc.8\n0c9db47b0df8a0b05e63b66bdaa09f46222d9f0c\n27776171025\nGo\nPASS\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-handoff-draft"));
});

test("fails when the Compose deployment evidence omits API or browser smoke proof", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/evidence/v1-compose-uat-2026-06-19.md": "V1-compose-uat-20260619\nv1.0.0-rc.8\ndocker compose -f compose.v1-test.yml up -d --build\n"
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "compose-uat-evidence"));
});
