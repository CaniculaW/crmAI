#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CURRENT_V1_EVIDENCE_DOCS = [
  "README.md",
  "docs/releases/v1.0.0-rc.8.md",
  "docs/testing/v1-automated-validation-report-2026-06-18.md",
  "docs/testing/v1-validation-status.md",
  "docs/testing/v1-uat-action-plan.md",
  "docs/testing/v1-uat-execution-pack.md",
  "docs/testing/v1-go-no-go-meeting.md",
  "docs/testing/v1-external-uat-request.md",
  "docs/testing/v1-external-uat-closure-checklist.md",
  "docs/testing/v1-external-uat-evidence-intake.md",
  "docs/testing/v1-next-closure-phase.md",
  "docs/meeting-notes/crm-kickoff-governance-closure-intake.md",
  "docs/testing/v1-progress-todo.md",
  "docs/testing/v1-external-uat-blockers.json",
  "docs/testing/v1-release-gate-status.json",
  "docs/testing/v1-uat-environment-evidence.md",
  "docs/testing/v1-uat-defect-register.md",
  "docs/testing/v1-uat-signoff-register.md",
  "docs/testing/v1-uat-launch-intake.md",
  "docs/testing/v1-uat-evidence-manifest.md",
  "docs/testing/crm-v1-acceptance-checklist.md",
  "docs/testing/crm-v1-validation-traceability.md",
  "docs/testing/crm-v1-test-environment-validation-runbook.md",
  "docs/testing/crm-v1-uat-evidence-pack-template.md",
  "docs/testing/crm-v1-uat-execution-tracker.md",
  "docs/testing/evidence/v1-local-uat-2026-06-18.md",
  "docs/testing/evidence/v1-compose-uat-2026-06-19.md",
  "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md",
  "docs/meeting-notes/crm-kickoff-minutes.md"
];

const SECRET_PATTERNS = [
  {
    id: "literal-secret-value",
    regex: /S3cure!123|secret-token/i
  },
  {
    id: "bearer-token",
    regex: /Bearer\s+(?!<|redacted|masked)[A-Za-z0-9._-]{8,}/i
  },
  {
    id: "secret-assignment",
    regex: /\b(password|passwd|pwd|secret|api[_ -]?key|api[_ -]?token|access[_ -]?token|refresh[_ -]?token|authorization)\b\s*[:=]\s*(?!<[^>]+>|\$\{[^}]+}|Bearer\s+\$\{[^}]+}|redacted\b|masked\b|待|TBD\b|TODO\b|xxx\b)[^\s`"'|]+/i
  }
];

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function scanDocument(docPath, text) {
  const findings = [];
  const lines = String(text).split(/\r?\n/);

  for (const [lineIndex, line] of lines.entries()) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.id === "secret-assignment" && findings.some((finding) => finding.line === lineIndex + 1 && finding.pattern === "bearer-token")) {
        continue;
      }

      if (pattern.regex.test(line)) {
        findings.push({
          docPath,
          pattern: pattern.id,
          line: lineIndex + 1
        });
      }
    }
  }

  return findings;
}

export function evaluateV1SecretScanSnapshot({ documents }) {
  const findings = Object.entries(documents)
    .flatMap(([docPath, text]) => scanDocument(docPath, text));

  const checks = [
    makeCheck(
      "current-v1-evidence-no-secrets",
      findings.length === 0,
      findings.length === 0
        ? "Current V1 evidence documents do not contain obvious plaintext secrets."
        : `Current V1 evidence documents contain possible plaintext secrets: ${findings.map((finding) => `${finding.docPath}:${finding.line}:${finding.pattern}`).join(", ")}`
    )
  ];

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    findings,
    passed,
    failed,
    checks
  };
}

export function evaluateV1SecretScanFromFiles(rootDir = process.cwd()) {
  const documents = Object.fromEntries(
    CURRENT_V1_EVIDENCE_DOCS.map((docPath) => [
      docPath,
      readFileSync(path.join(rootDir, docPath), "utf8")
    ])
  );

  return evaluateV1SecretScanSnapshot({ documents });
}

function printResult(result) {
  const lines = [
    "# V1 Secret Scan Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means current V1 evidence documents avoid obvious plaintext secrets. It does not replace repository-wide secret scanning or external credential rotation.");

  console.log(lines.join("\n"));
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = evaluateV1SecretScanFromFiles(rootDir);
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
