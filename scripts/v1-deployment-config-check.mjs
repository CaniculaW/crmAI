#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ARTIFACTS = [
  "backend/Dockerfile",
  "frontend/Dockerfile",
  "compose.v1-test.yml",
  ".env.example",
  "docs/deployment/v1-test-environment-compose.md"
];

function includesAll(content, needles) {
  return needles.every((needle) => content.includes(needle));
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

export function evaluateDeploymentConfigSnapshot(snapshot) {
  const checks = [];

  const missingArtifacts = REQUIRED_ARTIFACTS.filter((artifact) => !(artifact in snapshot));
  checks.push(makeCheck(
    "required-artifacts",
    missingArtifacts.length === 0,
    missingArtifacts.length === 0
      ? "Required V1 deployment artifacts are present."
      : `Missing required artifacts: ${missingArtifacts.join(", ")}`
  ));

  const backendDockerfile = snapshot["backend/Dockerfile"] ?? "";
  const frontendDockerfile = snapshot["frontend/Dockerfile"] ?? "";
  checks.push(makeCheck(
    "dockerfile-build-args",
    includesAll(backendDockerfile, [
      "ARG BACKEND_BUILD_IMAGE=",
      "ARG BACKEND_RUNTIME_IMAGE=",
      "FROM ${BACKEND_BUILD_IMAGE} AS build",
      "FROM ${BACKEND_RUNTIME_IMAGE}"
    ]) && includesAll(frontendDockerfile, [
      "ARG FRONTEND_BUILD_IMAGE=",
      "ARG FRONTEND_RUNTIME_IMAGE=",
      "FROM ${FRONTEND_BUILD_IMAGE} AS build",
      "FROM ${FRONTEND_RUNTIME_IMAGE}"
    ]),
    "Backend and frontend Dockerfiles allow mirrored build/runtime base images."
  ));

  const compose = snapshot["compose.v1-test.yml"] ?? "";
  checks.push(makeCheck(
    "compose-build-args",
    includesAll(compose, [
      "${CRM_POSTGRES_IMAGE:-postgres:16}",
      "BACKEND_BUILD_IMAGE: ${CRM_BACKEND_BUILD_IMAGE:-maven:3.9-eclipse-temurin-17}",
      "BACKEND_RUNTIME_IMAGE: ${CRM_BACKEND_RUNTIME_IMAGE:-eclipse-temurin:17-jre}",
      "FRONTEND_BUILD_IMAGE: ${CRM_FRONTEND_BUILD_IMAGE:-node:22-alpine}",
      "FRONTEND_RUNTIME_IMAGE: ${CRM_FRONTEND_RUNTIME_IMAGE:-nginx:1.27-alpine}"
    ]),
    "Compose passes configurable base-image args and PostgreSQL image override."
  ));

  const envExample = snapshot[".env.example"] ?? "";
  checks.push(makeCheck(
    "env-example-image-overrides",
    includesAll(envExample, [
      "CRM_POSTGRES_IMAGE=postgres:16",
      "CRM_BACKEND_BUILD_IMAGE=maven:3.9-eclipse-temurin-17",
      "CRM_BACKEND_RUNTIME_IMAGE=eclipse-temurin:17-jre",
      "CRM_FRONTEND_BUILD_IMAGE=node:22-alpine",
      "CRM_FRONTEND_RUNTIME_IMAGE=nginx:1.27-alpine"
    ]),
    ".env.example documents image overrides for mirrored registries."
  ));

  const deploymentDocs = snapshot["docs/deployment/v1-test-environment-compose.md"] ?? "";
  checks.push(makeCheck(
    "deployment-docs-mirror-guidance",
    includesAll(deploymentDocs, [
      "镜像源配置",
      "CRM_BACKEND_BUILD_IMAGE",
      "CRM_FRONTEND_RUNTIME_IMAGE",
      "Docker Hub token 超时"
    ]),
    "Deployment docs explain mirrored-registry overrides for Docker Hub token timeouts."
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    passed,
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
    "# V1 Deployment Config Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means the Compose deployment entrypoint supports configurable base images for mirrored registries. It does not prove the target registry is reachable.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateDeploymentConfigSnapshot(readSnapshot(rootDir));
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
