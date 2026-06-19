#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";

function tableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function hasSecretMaterial(value) {
  return /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization|bearer)\s*[:=]/i.test(value);
}

function extractDecision(markdown) {
  const match = markdown.match(/Decision:\s*(Conditional Go|No-Go|Go)/i);
  return match?.[1] ?? "";
}

function makeCheck(id, ok, message) {
  return { id, ok, message };
}

function isExternalUrl(reference) {
  return /^https?:\/\/\S+/i.test(reference);
}

function looksLikeRetainedArtifactPath(reference) {
  return /^docs\//.test(reference);
}

function extractBacktickReferences(value) {
  return [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());
}

function extractPlainReferences(value) {
  return value
    .split(/[\s,;，；]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/[。.!）)]+$/g, ""));
}

function extractEvidenceReferences(value) {
  const references = [...extractBacktickReferences(value), ...extractPlainReferences(value)];
  return [...new Set(references)].filter((reference) => isExternalUrl(reference) || looksLikeRetainedArtifactPath(reference));
}

function existingRepositoryPath(rootDir, reference) {
  if (!looksLikeRetainedArtifactPath(reference)) {
    return false;
  }

  const absolutePath = path.resolve(rootDir, reference);
  if (!absolutePath.startsWith(path.resolve(rootDir))) {
    return false;
  }

  return existsSync(absolutePath) && statSync(absolutePath).size > 0;
}

function passEvidenceRows(markdown) {
  const rows = tableRows(markdown);
  return rows
    .filter((row) => row[0] !== "Evidence ID" && row[3] === "PASS")
    .map((row) => ({
      id: row[0],
      reference: row[4] ?? ""
    }));
}

export function evaluateEvidenceReferences({
  rootDir = process.cwd(),
  manifestMarkdown
}) {
  const decision = extractDecision(manifestMarkdown);
  const passRows = passEvidenceRows(manifestMarkdown);
  const checks = [];

  checks.push(makeCheck(
    "no-secret-material",
    !hasSecretMaterial(manifestMarkdown),
    hasSecretMaterial(manifestMarkdown)
      ? "Evidence references contain secret-like material and must be sanitized."
      : "Evidence references do not contain secret-like material."
  ));

  const invalidRows = passRows.flatMap((row) => {
    const references = extractEvidenceReferences(row.reference);
    if (references.length === 0) {
      return [`${row.id} has no retained docs artifact or external URL evidence reference`];
    }

    const missingPaths = references
      .filter((reference) => looksLikeRetainedArtifactPath(reference))
      .filter((reference) => !existingRepositoryPath(rootDir, reference));

    return missingPaths.map((reference) => `${row.id} references missing artifact ${reference}`);
  });

  checks.push(makeCheck(
    "pass-reference-artifacts",
    invalidRows.length === 0,
    invalidRows.length === 0
      ? "Every PASS evidence row references an existing retained docs artifact or external URL."
      : `Invalid PASS evidence references: ${invalidRows.join("; ")}`
  ));

  checks.push(makeCheck(
    "go-pass-references",
    decision !== "Go" || passRows.length > 0,
    decision !== "Go" || passRows.length > 0
      ? "Go decisions have PASS evidence rows available for artifact checking."
      : "Manifest decision is Go but contains no PASS evidence rows to verify."
  ));

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  return {
    ok: failed.length === 0,
    decision,
    passed,
    failed,
    checks
  };
}

export function evaluateEvidenceReferencesFromFiles(
  rootDir = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_PATH
) {
  return evaluateEvidenceReferences({
    rootDir,
    manifestMarkdown: readFileSync(path.resolve(rootDir, manifestPath), "utf8")
  });
}

function printResult(result) {
  const lines = [
    "# V1 Evidence Reference Check",
    "",
    `Result: ${result.ok ? "PASS" : "FAIL"}`,
    `Decision: ${result.decision || "MISSING"}`,
    "",
    "## Checks"
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  lines.push("");
  lines.push("Note: PASS means every manifest PASS row points to an existing retained docs artifact or an external URL. It does not replace UAT execution, signoff, or the final release gate.");

  console.log(lines.join("\n"));
}

function printUsage() {
  console.error("Usage: node scripts/v1-evidence-reference-check.mjs [v1-uat-evidence-manifest.md]");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const manifestPath = process.argv[2] ?? DEFAULT_MANIFEST_PATH;
    const result = evaluateEvidenceReferencesFromFiles(process.cwd(), manifestPath);
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
