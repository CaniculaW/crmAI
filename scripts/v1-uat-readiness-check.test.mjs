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
  "scripts/v1-deployment-config-check.mjs": "evaluateDeploymentConfigSnapshot\nCRM_BACKEND_BUILD_IMAGE\nCRM_FRONTEND_RUNTIME_IMAGE\n",
  "scripts/v1-deployment-config-check.test.mjs": "configurable for mirrored registries\n",
  "docs/releases/v1.0.0-rc.6.md": "v1.0.0-rc.6\nGitHub Actions `V1 Validation`\nsuccess\nUAT\nGo/No-Go\nV1-local-uat-20260618\nCRM_BACKEND_BUILD_IMAGE\n仍需在具名测试环境完成验收签署\n",
  "docs/testing/v1-automated-validation-report-2026-06-18.md": "代码级、接口级、迁移级、本地部署态\nGitHub Actions\n具名测试环境部署态验收\n业务验收签署\n",
  "docs/testing/crm-v1-validation-traceability.md": "研发验证通过\n若目标口径是“项目 V1 验收通过”，仍需完成具名测试环境验证和业务验收签署。\n",
  "docs/testing/crm-v1-test-environment-validation-runbook.md": "具名测试环境\n证据包\n签署\n",
  "docs/testing/crm-v1-uat-evidence-pack-template.md": "Go/No-Go\n签署\n缺陷\n",
  "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.6\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\n",
  "docs/testing/crm-v1-acceptance-checklist.md": Array.from({ length: 17 }, (_, index) => {
    const id = String(index + 1).padStart(3, "0");
    return `AC-${id} | 研发验证通过，待业务验收`;
  }).join("\n") + "\n具名测试环境待部署确认\n",
  "README.md": "docs/releases/v1.0.0-rc.6.md\ncompose.v1-test.yml\n"
};

test("passes when V1 rc6 and UAT readiness artifacts are documented", () => {
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

test("fails when local UAT evidence points to an older release candidate", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.5\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\n"
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
