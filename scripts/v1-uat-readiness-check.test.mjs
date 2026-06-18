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
      - run: node --test scripts/v1-uat-evidence-pack-validate.test.mjs
      - run: node --test scripts/v1-uat-execution-tracker-validate.test.mjs
      - run: node --test scripts/v1-release-gate.test.mjs
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
  "scripts/v1-uat-evidence-pack-validate.mjs": "evaluateUatEvidencePack\np0-defects\nsignoff-complete\ngo-hard-gates\n",
  "scripts/v1-uat-evidence-pack-validate.test.mjs": "fails a Go evidence pack when a P0 defect remains open\n",
  "scripts/v1-uat-execution-tracker-validate.mjs": "evaluateUatExecutionTracker\nrequired-items\nrelease-gates\n",
  "scripts/v1-uat-execution-tracker-validate.test.mjs": "fails the current rc8 tracker because external UAT remains pending\n",
  "scripts/v1-release-gate.mjs": "evaluateV1ReleaseGate\nevaluateV1ReleaseGateFromFiles\nV1 release gate requires Go\n",
  "scripts/v1-release-gate.test.mjs": "fails when the project decision is Conditional Go\n",
  "scripts/v1-deployment-config-check.mjs": "evaluateDeploymentConfigSnapshot\nCRM_BACKEND_BUILD_IMAGE\nCRM_FRONTEND_RUNTIME_IMAGE\n",
  "scripts/v1-deployment-config-check.test.mjs": "configurable for mirrored registries\n",
  "docs/releases/v1.0.0-rc.8.md": "v1.0.0-rc.8\nGitHub Actions `V1 Validation`\nsuccess\nUAT\nGo/No-Go\nV1-local-uat-20260618\nCRM_BACKEND_BUILD_IMAGE\nv1-uat-evidence-pack-validate\nV1演示业务数据\n仍需在具名测试环境完成验收签署\n",
  "docs/testing/v1-automated-validation-report-2026-06-18.md": "代码级、接口级、迁移级、本地部署态\nGitHub Actions\n具名测试环境部署态验收\n业务验收签署\n",
  "docs/testing/crm-v1-validation-traceability.md": "研发验证通过\n若目标口径是“项目 V1 验收通过”，仍需完成具名测试环境验证和业务验收签署。\n",
  "docs/testing/crm-v1-test-environment-validation-runbook.md": "具名测试环境\n证据包\n签署\n",
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
  "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.8\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\nUAT evidence pack validator\nV1演示业务数据\n\"accounts\": 1\n\"contacts\": 1\n\"opportunities\": 1\n\"activities\": 1\n",
  "docs/testing/evidence/v1-compose-uat-2026-06-19.md": "V1-compose-uat-20260619\nv1.0.0-rc.8\n8e9efba2ea50bfe32304ec488cde72ee5262f86b\ndocker.1ms.run/library/postgres:16\nCRM_BACKEND_BUILD_IMAGE=docker.1ms.run/library/maven:3.9-eclipse-temurin-17\nCRM_BACKEND_RUNTIME_IMAGE=docker.1ms.run/library/eclipse-temurin:17-jre\nCRM_FRONTEND_BUILD_IMAGE=docker.1ms.run/library/node:22-alpine\nCRM_FRONTEND_RUNTIME_IMAGE=docker.1ms.run/library/nginx:1.27-alpine\ndocker compose -f compose.v1-test.yml up -d --build\ncrm-ai-v1-test-db-1\ncrm-ai-v1-test-backend-1\ncrm-ai-v1-test-frontend-1\n/api/health\n\"status\":\"UP\"\n/api/bootstrap\n\"permissions_count\":25\n\"accounts\":1\n\"contacts\":1\n\"opportunities\":1\n\"activities\":1\nnpm run smoke:v1:browser\nv1-rc8-compose-browser-smoke-20260619.png\n",
  "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md": "v1.0.0-rc.8\n0c9db47b0df8a0b05e63b66bdaa09f46222d9f0c\n27776171025\nNo-Go\nFAIL\n具名测试环境\nUAT-001\nUAT-010\nP0/P1缺陷汇总未填写\n销售侧、管理侧、产品、测试、研发和项目负责人签署未完成\n不能作为 `Go` 准出记录\n",
  "docs/testing/crm-v1-acceptance-checklist.md": Array.from({ length: 17 }, (_, index) => {
    const id = String(index + 1).padStart(3, "0");
    return `AC-${id} | 研发验证通过，待业务验收`;
  }).join("\n") + "\n具名测试环境待部署确认\n",
  "README.md": "docs/releases/v1.0.0-rc.8.md\ncompose.v1-test.yml\nv1-uat-evidence-pack-validate.mjs\n"
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

test("fails when the UAT execution tracker is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/crm-v1-uat-execution-tracker.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
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
