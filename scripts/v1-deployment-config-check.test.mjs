import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDeploymentConfigSnapshot } from "./v1-deployment-config-check.mjs";

const completeSnapshot = {
  "backend/Dockerfile": `
ARG BACKEND_BUILD_IMAGE=maven:3.9-eclipse-temurin-17
ARG BACKEND_RUNTIME_IMAGE=eclipse-temurin:17-jre
FROM \${BACKEND_BUILD_IMAGE} AS build
FROM \${BACKEND_RUNTIME_IMAGE}
`,
  "frontend/Dockerfile": `
ARG FRONTEND_BUILD_IMAGE=node:22-alpine
ARG FRONTEND_RUNTIME_IMAGE=nginx:1.27-alpine
FROM \${FRONTEND_BUILD_IMAGE} AS build
FROM \${FRONTEND_RUNTIME_IMAGE}
`,
  "compose.v1-test.yml": `
services:
  db:
    image: \${CRM_POSTGRES_IMAGE:-postgres:16}
  backend:
    build:
      args:
        BACKEND_BUILD_IMAGE: \${CRM_BACKEND_BUILD_IMAGE:-maven:3.9-eclipse-temurin-17}
        BACKEND_RUNTIME_IMAGE: \${CRM_BACKEND_RUNTIME_IMAGE:-eclipse-temurin:17-jre}
  frontend:
    build:
      args:
        FRONTEND_BUILD_IMAGE: \${CRM_FRONTEND_BUILD_IMAGE:-node:22-alpine}
        FRONTEND_RUNTIME_IMAGE: \${CRM_FRONTEND_RUNTIME_IMAGE:-nginx:1.27-alpine}
`,
  ".env.example": `
CRM_POSTGRES_IMAGE=postgres:16
CRM_BACKEND_BUILD_IMAGE=maven:3.9-eclipse-temurin-17
CRM_BACKEND_RUNTIME_IMAGE=eclipse-temurin:17-jre
CRM_FRONTEND_BUILD_IMAGE=node:22-alpine
CRM_FRONTEND_RUNTIME_IMAGE=nginx:1.27-alpine
`,
  "docs/deployment/v1-test-environment-compose.md": `
## 镜像源配置
CRM_BACKEND_BUILD_IMAGE=registry.example.com/library/maven:3.9-eclipse-temurin-17
CRM_FRONTEND_RUNTIME_IMAGE=registry.example.com/library/nginx:1.27-alpine
Docker Hub token 超时
`
};

test("passes when V1 Compose build images are configurable for mirrored registries", () => {
  const result = evaluateDeploymentConfigSnapshot(completeSnapshot);

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.ok(result.passed.some((check) => check.id === "dockerfile-build-args"));
  assert.ok(result.passed.some((check) => check.id === "compose-build-args"));
});

test("fails when backend Dockerfile hardcodes its build image", () => {
  const snapshot = {
    ...completeSnapshot,
    "backend/Dockerfile": "FROM maven:3.9-eclipse-temurin-17 AS build\nFROM eclipse-temurin:17-jre\n"
  };

  const result = evaluateDeploymentConfigSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "dockerfile-build-args"));
});

test("fails when deployment docs do not describe mirrored registry overrides", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/deployment/v1-test-environment-compose.md": "docker compose -f compose.v1-test.yml up -d --build\n"
  };

  const result = evaluateDeploymentConfigSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "deployment-docs-mirror-guidance"));
});
