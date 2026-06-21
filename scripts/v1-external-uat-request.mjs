#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateKickoffGovernance } from "./v1-kickoff-governance-validate.mjs";
import { evaluateV1ReleaseGate } from "./v1-release-gate.mjs";
import { evaluateReadinessSnapshot, readSnapshot } from "./v1-uat-readiness-check.mjs";
import { evaluateUatDefectRegister } from "./v1-uat-defect-register-validate.mjs";
import { evaluateUatEvidencePack } from "./v1-uat-evidence-pack-validate.mjs";
import { evaluateUatEvidenceManifest } from "./v1-uat-evidence-manifest-validate.mjs";
import { evaluateUatEnvironmentEvidence } from "./v1-uat-environment-validate.mjs";
import { evaluateUatExecutionTracker } from "./v1-uat-execution-tracker-validate.mjs";
import { evaluateUatLaunchIntake } from "./v1-uat-launch-intake-validate.mjs";
import { evaluateUatSignoffRegister } from "./v1-uat-signoff-register-validate.mjs";
import { evaluateEvidenceReferencesFromFiles } from "./v1-evidence-reference-check.mjs";

const DEFAULT_EVIDENCE_PATH = "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md";
const DEFAULT_TRACKER_PATH = "docs/testing/crm-v1-uat-execution-tracker.md";
const DEFAULT_MANIFEST_PATH = "docs/testing/v1-uat-evidence-manifest.md";
const DEFAULT_DEFECT_REGISTER_PATH = "docs/testing/v1-uat-defect-register.md";
const DEFAULT_ENVIRONMENT_PATH = "docs/testing/v1-uat-environment-evidence.md";
const DEFAULT_SIGNOFF_REGISTER_PATH = "docs/testing/v1-uat-signoff-register.md";
const DEFAULT_LAUNCH_INTAKE_PATH = "docs/testing/v1-uat-launch-intake.md";
const DEFAULT_KICKOFF_PATH = "docs/meeting-notes/crm-kickoff-minutes.md";
const DEFAULT_RUNBOOK_PATH = "docs/testing/crm-v1-test-environment-validation-runbook.md";
const DEFAULT_AUTOMATED_REPORT_PATH = "docs/testing/v1-automated-validation-report-2026-06-18.md";
const DEFAULT_OUTPUT_PATH = "docs/testing/v1-external-uat-request.md";
const DEFAULT_CLOSURE_CHECKLIST_PATH = "docs/testing/v1-external-uat-closure-checklist.md";

function gateCommands(
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH
) {
  return [
    `node scripts/v1-kickoff-governance-validate.mjs ${kickoffPath}`,
    `node scripts/v1-uat-launch-intake-validate.mjs ${launchIntakePath}`,
    `node scripts/v1-uat-environment-validate.mjs ${environmentPath}`,
    `node scripts/v1-uat-evidence-pack-validate.mjs ${evidencePath}`,
    `node scripts/v1-uat-evidence-manifest-validate.mjs ${manifestPath}`,
    `node scripts/v1-evidence-reference-check.mjs ${manifestPath}`,
    `node scripts/v1-uat-execution-tracker-validate.mjs ${trackerPath}`,
    `node scripts/v1-uat-defect-register-validate.mjs ${defectRegisterPath}`,
    `node scripts/v1-uat-signoff-register-validate.mjs ${signoffRegisterPath}`,
    `node scripts/v1-release-gate.mjs . ${evidencePath} ${trackerPath} ${manifestPath} ${defectRegisterPath} ${environmentPath} ${signoffRegisterPath} ${launchIntakePath} ${kickoffPath}`,
    `node scripts/v1-release-gate.mjs --json . ${evidencePath} ${trackerPath} ${manifestPath} ${defectRegisterPath} ${environmentPath} ${signoffRegisterPath} ${launchIntakePath} ${kickoffPath}`
  ];
}

function failedLines(label, result) {
  return (result.failed ?? []).map((check) => `- ${label}/${check.id}: ${check.message}`);
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function closurePhaseSummaries(blockers) {
  const phaseMap = blockers.reduce((phases, blocker) => {
    const phase = phases.get(blocker.closurePhase) ?? {
      phase: blocker.closurePhase,
      order: blocker.closureOrder,
      totalBlockers: 0,
      byOwnerSide: {}
    };
    phase.totalBlockers += 1;
    phase.byOwnerSide[blocker.ownerSide] = (phase.byOwnerSide[blocker.ownerSide] ?? 0) + 1;
    phase.order = Math.min(phase.order, blocker.closureOrder);
    phases.set(blocker.closurePhase, phase);
    return phases;
  }, new Map());

  return Array.from(phaseMap.values()).sort((left, right) => left.order - right.order || left.phase.localeCompare(right.phase));
}

function isExternalUatClosed(releaseGateResult, blockers) {
  return blockers.length === 0 && releaseGateResult.ok && releaseGateResult.decision === "Go";
}

function resolveFromRoot(rootDir, filePath) {
  return path.resolve(rootDir, filePath);
}

function validationCommandFor(gate, paths) {
  const {
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  } = paths;

  const commands = {
    "Readiness": "node scripts/v1-uat-readiness-check.mjs",
    "Kickoff Governance": `node scripts/v1-kickoff-governance-validate.mjs ${kickoffPath}`,
    "UAT Launch Intake": `node scripts/v1-uat-launch-intake-validate.mjs ${launchIntakePath}`,
    "UAT Environment Evidence": `node scripts/v1-uat-environment-validate.mjs ${environmentPath}`,
    "UAT Evidence Pack": `node scripts/v1-uat-evidence-pack-validate.mjs ${evidencePath}`,
    "UAT Evidence Manifest": `node scripts/v1-uat-evidence-manifest-validate.mjs ${manifestPath}`,
    "UAT Evidence References": `node scripts/v1-evidence-reference-check.mjs ${manifestPath}`,
    "UAT Execution Tracker": `node scripts/v1-uat-execution-tracker-validate.mjs ${trackerPath}`,
    "UAT Defect Register": `node scripts/v1-uat-defect-register-validate.mjs ${defectRegisterPath}`,
    "UAT Signoff Register": `node scripts/v1-uat-signoff-register-validate.mjs ${signoffRegisterPath}`,
    "Release Gate": `node scripts/v1-release-gate.mjs --json . ${evidencePath} ${trackerPath} ${manifestPath} ${defectRegisterPath} ${environmentPath} ${signoffRegisterPath} ${launchIntakePath} ${kickoffPath}`
  };

  return commands[gate] ?? "node scripts/v1-release-gate.mjs --json";
}

function sourceDocumentFor(gate, checkId, paths) {
  const {
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
  } = paths;

  if (gate === "Release Gate") {
    return {
      "kickoff-governance": kickoffPath,
      "uat-launch-intake": launchIntakePath,
      "uat-environment": environmentPath,
      "uat-evidence-pack": evidencePath,
      "uat-evidence-manifest": manifestPath,
      "uat-defect-register": defectRegisterPath,
      "uat-signoff-register": signoffRegisterPath,
      "uat-execution-tracker": trackerPath,
      "go-decision": "docs/testing/v1-go-no-go-meeting.md"
    }[checkId] ?? "docs/testing/v1-validation-status.md";
  }

  return {
    "Readiness": runbookPath,
    "Kickoff Governance": kickoffPath,
    "UAT Launch Intake": launchIntakePath,
    "UAT Environment Evidence": environmentPath,
    "UAT Evidence Pack": evidencePath,
    "UAT Evidence Manifest": manifestPath,
    "UAT Evidence References": manifestPath,
    "UAT Execution Tracker": trackerPath,
    "UAT Defect Register": defectRegisterPath,
    "UAT Signoff Register": signoffRegisterPath
  }[gate] ?? automatedReportPath;
}

function ownerSideFor(gate, checkId) {
  if (gate === "Readiness") {
    return "研发";
  }
  if (gate === "UAT Environment Evidence" || gate === "UAT Evidence Manifest" || gate === "UAT Evidence References" || gate === "UAT Defect Register") {
    return "测试";
  }
  if (gate === "UAT Evidence Pack") {
    return {
      "environment-results": "测试",
      "p0-defects": "测试",
      "p1-defects": "测试",
      "uat-business-cases": "业务UAT",
      "signoff-complete": "项目/产品",
      "go-criteria": "项目/产品",
      "basic-owners-complete": "项目/产品",
      "basic-owner-name-format": "项目/产品",
      "no-placeholders": "项目/产品"
    }[checkId] ?? "业务UAT";
  }
  if (gate === "UAT Execution Tracker") {
    return {
      "pre-checks": "测试",
      "smoke-checks": "测试",
      "uat-cases": "业务UAT",
      "p0-p1-defects": "测试",
      "roles-assigned": "项目/产品",
      "tracker-role-owner-name-format": "项目/产品",
      "release-gates": "项目/产品",
      "go-decision": "项目/产品"
    }[checkId] ?? "项目/产品";
  }
  if (gate === "Release Gate") {
    return {
      "uat-environment": "测试",
      "uat-evidence-manifest": "测试",
      "uat-defect-register": "测试",
      "uat-evidence-pack": "业务UAT",
      "uat-execution-tracker": "项目/产品",
      "uat-signoff-register": "项目/产品",
      "uat-launch-intake": "项目/产品",
      "kickoff-governance": "项目/产品",
      "go-decision": "项目/产品"
    }[checkId] ?? "项目/产品";
  }

  return "项目/产品";
}

function closureSequencingFor(gate, checkId) {
  if (gate === "Readiness") {
    return { closurePhase: "0-engineering-readiness", closureOrder: 0 };
  }
  if (gate === "Kickoff Governance") {
    return { closurePhase: "1-governance", closureOrder: 10 };
  }
  if (gate === "UAT Launch Intake") {
    return { closurePhase: "2-uat-launch", closureOrder: 20 };
  }
  if (gate === "UAT Environment Evidence") {
    return { closurePhase: "2-uat-environment", closureOrder: 21 };
  }
  if (gate === "UAT Evidence Pack" || gate === "UAT Evidence Manifest" || gate === "UAT Evidence References" || gate === "UAT Execution Tracker") {
    return { closurePhase: "3-uat-evidence", closureOrder: 30 };
  }
  if (gate === "UAT Defect Register") {
    return { closurePhase: "4-defect-closure", closureOrder: 40 };
  }
  if (gate === "UAT Signoff Register") {
    return { closurePhase: "5-signoff", closureOrder: 50 };
  }
  if (gate === "Release Gate") {
    return {
      "kickoff-governance": { closurePhase: "1-governance", closureOrder: 10 },
      "uat-launch-intake": { closurePhase: "2-uat-launch", closureOrder: 20 },
      "uat-environment": { closurePhase: "2-uat-environment", closureOrder: 21 },
      "uat-evidence-pack": { closurePhase: "3-uat-evidence", closureOrder: 30 },
      "uat-evidence-manifest": { closurePhase: "3-uat-evidence", closureOrder: 30 },
      "uat-execution-tracker": { closurePhase: "3-uat-evidence", closureOrder: 30 },
      "uat-defect-register": { closurePhase: "4-defect-closure", closureOrder: 40 },
      "uat-signoff-register": { closurePhase: "5-signoff", closureOrder: 50 },
      "go-decision": { closurePhase: "6-final-go-decision", closureOrder: 60 }
    }[checkId] ?? { closurePhase: "6-final-go-decision", closureOrder: 60 };
  }

  return { closurePhase: "6-final-go-decision", closureOrder: 60 };
}

function blockerRows(gate, result, paths) {
  return (result.failed ?? []).map((check) => {
    const closureSequencing = closureSequencingFor(gate, check.id);
    return {
      blockerId: `${gate}/${check.id}`,
      gate,
      checkId: check.id,
      ownerSide: ownerSideFor(gate, check.id),
      ...closureSequencing,
      sourceDocument: sourceDocumentFor(gate, check.id, paths),
      validationCommand: validationCommandFor(gate, paths),
      message: check.message
    };
  });
}

function collectBlockers({
  readinessResult,
  kickoffResult,
  launchIntakeResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH
}) {
  const paths = {
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
  };

  const rows = [
    ...blockerRows("Readiness", readinessResult, paths),
    ...blockerRows("Kickoff Governance", kickoffResult, paths),
    ...blockerRows("UAT Launch Intake", launchIntakeResult, paths),
    ...blockerRows("UAT Environment Evidence", environmentResult, paths),
    ...blockerRows("UAT Evidence Pack", evidenceResult, paths),
    ...blockerRows("UAT Evidence Manifest", manifestResult, paths),
    ...blockerRows("UAT Evidence References", evidenceReferenceResult, paths),
    ...blockerRows("UAT Execution Tracker", trackerResult, paths),
    ...blockerRows("UAT Defect Register", defectRegisterResult, paths),
    ...blockerRows("UAT Signoff Register", signoffRegisterResult, paths),
    ...blockerRows("Release Gate", releaseGateResult, paths)
  ];

  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.gate}::${row.checkId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function escapeMarkdownTableCell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function manifestIds(prefix, start, end) {
  return Array.from(
    { length: end - start + 1 },
    (_, index) => `${prefix}-${String(start + index).padStart(3, "0")}`
  );
}

function evidenceIntakeRows({
  evidencePath,
  trackerPath,
  manifestPath,
  defectRegisterPath,
  environmentPath,
  signoffRegisterPath,
  launchIntakePath,
  kickoffPath
}) {
  const releaseGateCommand = validationCommandFor("Release Gate", {
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  });

  return [
    {
      intakeId: "KICKOFF-LAUNCH",
      ownerSide: "项目/产品",
      manifestIds: ["PRE-006"],
      sourceDocuments: [kickoffPath, launchIntakePath, manifestPath],
      validationCommands: [
        validationCommandFor("Kickoff Governance", { kickoffPath }),
        validationCommandFor("UAT Launch Intake", { launchIntakePath }),
        validationCommandFor("UAT Evidence Manifest", { manifestPath })
      ],
      intakeNotes: "补齐启动治理负责人、V1范围冻结、UAT窗口、参与人、账号保管和项目Go证据。"
    },
    {
      intakeId: "TEST-ENV",
      ownerSide: "测试",
      manifestIds: ["ENV-EVIDENCE", ...manifestIds("PRE", 1, 5), ...manifestIds("SMK", 1, 5)],
      sourceDocuments: [environmentPath, trackerPath, manifestPath],
      validationCommands: [
        validationCommandFor("UAT Environment Evidence", { environmentPath }),
        validationCommandFor("UAT Execution Tracker", { trackerPath }),
        validationCommandFor("UAT Evidence Manifest", { manifestPath })
      ],
      intakeNotes: "补齐具名环境、Smoke、账号权限样本和可留存截图/日志证据。"
    },
    {
      intakeId: "BUSINESS-UAT",
      ownerSide: "业务UAT",
      manifestIds: manifestIds("UAT", 1, 10),
      sourceDocuments: [evidencePath, trackerPath, manifestPath],
      validationCommands: [
        validationCommandFor("UAT Evidence Pack", { evidencePath }),
        validationCommandFor("UAT Execution Tracker", { trackerPath }),
        validationCommandFor("UAT Evidence Manifest", { manifestPath })
      ],
      intakeNotes: "逐项执行 UAT-001 至 UAT-010，留存截图、操作记录、缺陷单或外部URL。"
    },
    {
      intakeId: "DEFECT-CLOSURE",
      ownerSide: "测试",
      manifestIds: ["DEF-REGISTER", "DEF-P0", "DEF-P1"],
      sourceDocuments: [defectRegisterPath, manifestPath],
      validationCommands: [
        validationCommandFor("UAT Defect Register", { defectRegisterPath }),
        validationCommandFor("UAT Evidence Manifest", { manifestPath })
      ],
      intakeNotes: "补齐P0/P1汇总、缺陷Owner、关闭状态、回归证据和保全引用。"
    },
    {
      intakeId: "SIGNOFF-GO",
      ownerSide: "项目/产品",
      manifestIds: [
        "SIGNOFF-REGISTER",
        "SIGNOFF-SALES",
        "SIGNOFF-MANAGER",
        "SIGNOFF-PRODUCT",
        "SIGNOFF-TEST",
        "SIGNOFF-DEV",
        "SIGNOFF-PM",
        "GO-NOGO"
      ],
      sourceDocuments: [signoffRegisterPath, "docs/testing/v1-go-no-go-meeting.md", manifestPath],
      validationCommands: [
        validationCommandFor("UAT Signoff Register", { signoffRegisterPath }),
        releaseGateCommand
      ],
      intakeNotes: "补齐六方具名签署、签署日期、签署证据引用和项目Go结论。"
    }
  ];
}

function requestRows({
  evidencePath,
  trackerPath,
  manifestPath,
  defectRegisterPath,
  environmentPath,
  signoffRegisterPath,
  launchIntakePath,
  kickoffPath,
  runbookPath,
  automatedReportPath
}) {
  return [
    `| Project / Product | 项目/产品 | ${kickoffPath}; ${launchIntakePath}; ${signoffRegisterPath} | 指定负责人、冻结V1范围、确认UAT窗口、组织签署和Go/No-Go会议 |`,
    `| Test | 测试 | ${environmentPath}; ${defectRegisterPath}; ${manifestPath} | 执行具名环境检查、维护缺陷闭环、汇总证据清单并重跑校验命令 |`,
    `| Business UAT | 业务 | ${evidencePath}; ${trackerPath} | 执行UAT-001至UAT-010，提供截图、操作记录、缺陷单和验收结论 |`,
    `| Engineering | 研发 | ${runbookPath}; ${automatedReportPath} | 支撑环境、账号、Smoke定位和最终release gate复验 |`
  ];
}

export function generateV1ExternalUatRequestMarkdown({
  generatedAt,
  readinessResult,
  kickoffResult,
  launchIntakeResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH
}) {
  const blockers = [
    ...failedLines("Readiness", readinessResult),
    ...failedLines("Kickoff Governance", kickoffResult),
    ...failedLines("UAT Launch Intake", launchIntakeResult),
    ...failedLines("UAT Environment Evidence", environmentResult),
    ...failedLines("UAT Evidence Pack", evidenceResult),
    ...failedLines("UAT Evidence Manifest", manifestResult),
    ...failedLines("UAT Evidence References", evidenceReferenceResult),
    ...failedLines("UAT Execution Tracker", trackerResult),
    ...failedLines("UAT Defect Register", defectRegisterResult),
    ...failedLines("UAT Signoff Register", signoffRegisterResult),
    ...failedLines("Release Gate", releaseGateResult)
  ];
  const isGo = isExternalUatClosed(releaseGateResult, blockers);

  const lines = [
    "# CRM V1 External UAT Request Packet",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Request Status: ${isGo ? "No External UAT Requests Open" : "External UAT Evidence Required"}`,
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in any request evidence.",
    "",
    "## Request Board",
    ""
  ];

  if (isGo) {
    lines.push("All external UAT request items are closed by validator evidence.");
  } else {
    lines.push("| Workstream | Owner side | Source documents | Request |");
    lines.push("|---|---|---|---|");
    lines.push(...requestRows({
      evidencePath,
      trackerPath,
      manifestPath,
      defectRegisterPath,
      environmentPath,
      signoffRegisterPath,
      launchIntakePath,
      kickoffPath,
      runbookPath,
      automatedReportPath
    }));
  }

  lines.push("");
  lines.push("## Validation Commands");
  lines.push("");
  for (const command of gateCommands(evidencePath, trackerPath, manifestPath, defectRegisterPath, environmentPath, signoffRegisterPath, launchIntakePath, kickoffPath)) {
    lines.push(`- \`${command}\``);
  }

  lines.push("");
  lines.push("## Current Blocking Evidence Requests");
  lines.push("");
  if (blockers.length === 0) {
    lines.push("- None.");
  } else {
    lines.push(...blockers);
    lines.push("");
    lines.push("Keep this request packet open until every source document validates PASS and the final release gate returns Go.");
  }

  lines.push("");
  lines.push("Note: This packet is a stakeholder-facing request board. It does not replace the UAT source documents, validator output, or final release gate.");

  return `${lines.join("\n")}\n`;
}

export function generateV1ExternalUatBlockersJson({
  generatedAt,
  readinessResult,
  kickoffResult,
  launchIntakeResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH
}) {
  const blockers = collectBlockers({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
  });
  const isGo = isExternalUatClosed(releaseGateResult, blockers);
  const payload = {
    generatedAt,
    status: isGo ? "No External UAT Requests Open" : "External UAT Evidence Required",
    decision: isGo ? "Go" : "No-Go",
    ok: isGo,
    summary: {
      totalBlockers: blockers.length,
      byOwnerSide: countBy(blockers, "ownerSide"),
      byClosurePhase: countBy(blockers, "closurePhase"),
      closurePhases: closurePhaseSummaries(blockers)
    },
    blockers
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function generateV1ExternalUatClosureChecklistMarkdown({
  generatedAt,
  readinessResult,
  kickoffResult,
  launchIntakeResult,
  environmentResult,
  evidenceResult,
  manifestResult,
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult,
  defectRegisterResult,
  signoffRegisterResult,
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH
}) {
  const blockers = collectBlockers({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
  });
  const isGo = isExternalUatClosed(releaseGateResult, blockers);
  const ownerSides = ["项目/产品", "测试", "业务UAT", "研发"];
  const lines = [
    "# CRM V1 External UAT Closure Checklist",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Overall: ${isGo ? "Go" : "No-Go"}`,
    "",
    `Open blocker count: ${blockers.length}`,
    "",
    "Do not record plaintext passwords, bearer tokens, API keys, or unmasked account custody secrets in closure evidence.",
    ""
  ];

  if (blockers.length === 0) {
    lines.push("All closure rows are closed by validator evidence.");
  } else {
    for (const ownerSide of ownerSides) {
      const ownerBlockers = blockers.filter((blocker) => blocker.ownerSide === ownerSide);
      if (ownerBlockers.length === 0) {
        continue;
      }
      lines.push(`## ${ownerSide}`);
      lines.push("");
      lines.push("| Status | Gate | Check ID | Source document | Validation command | Closure evidence needed |");
      lines.push("|---|---|---|---|---|---|");
      for (const blocker of ownerBlockers) {
        lines.push([
          "Open",
          blocker.gate,
          blocker.checkId,
          blocker.sourceDocument,
          `\`${blocker.validationCommand}\``,
          blocker.message
        ].map(escapeMarkdownTableCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
      }
      lines.push("");
    }
    lines.push("Do not mark a row Closed until its source document validates PASS and the final release gate returns Go.");
  }

  lines.push("");
  lines.push("Note: This checklist is generated from validator output. Update the source evidence documents, then regenerate this file instead of editing closure rows manually.");

  return `${lines.join("\n")}\n`;
}

export function generateV1ExternalUatEvidenceIntakeMarkdown({
  generatedAt,
  readinessResult = { ok: true, failed: [] },
  kickoffResult = { ok: true, failed: [] },
  launchIntakeResult = { ok: true, failed: [] },
  environmentResult = { ok: true, failed: [] },
  evidenceResult = { ok: true, failed: [] },
  manifestResult = { ok: true, failed: [] },
  evidenceReferenceResult = { ok: true, failed: [] },
  trackerResult = { ok: true, failed: [] },
  defectRegisterResult = { ok: true, failed: [] },
  signoffRegisterResult = { ok: true, failed: [] },
  releaseGateResult,
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  closureChecklistPath = DEFAULT_CLOSURE_CHECKLIST_PATH
}) {
  const blockers = collectBlockers({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  });
  const isGo = isExternalUatClosed(releaseGateResult, blockers);
  const lines = [
    "# CRM V1 External UAT Evidence Intake",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Overall: ${isGo ? "Go" : "No-Go"}`,
    "",
    `Closure checklist: ${closureChecklistPath}`,
    "",
    `Evidence manifest: ${manifestPath}`,
    "",
    "Do not paste passwords, bearer tokens, API keys, or unmasked account secrets into intake evidence.",
    "",
    "## Intake Rows",
    ""
  ];

  if (isGo) {
    lines.push("All intake rows are closed by validator evidence.");
  } else {
    lines.push("| Intake ID | Owner side | Manifest evidence IDs | Source documents | Validation commands | Intake notes |");
    lines.push("|---|---|---|---|---|---|");
    for (const row of evidenceIntakeRows({
      evidencePath,
      trackerPath,
      manifestPath,
      defectRegisterPath,
      environmentPath,
      signoffRegisterPath,
      launchIntakePath,
      kickoffPath
    })) {
      lines.push([
        row.intakeId,
        row.ownerSide,
        row.manifestIds.join(", "),
        row.sourceDocuments.join("; "),
        row.validationCommands.map((command) => `\`${command}\``).join("<br>"),
        row.intakeNotes
      ].map(escapeMarkdownTableCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
  }

  lines.push("");
  lines.push("## Final Verification");
  lines.push("");
  lines.push(`- \`${validationCommandFor("UAT Evidence Manifest", { manifestPath })}\``);
  lines.push(`- \`${validationCommandFor("Release Gate", {
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  })}\``);
  lines.push("");
  lines.push("Note: This intake checklist routes incoming evidence into the formal UAT source documents. It does not replace the validators, manifest, closure checklist, or final release gate.");

  return `${lines.join("\n")}\n`;
}

export function generateV1ExternalUatRequestFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const kickoffResult = evaluateKickoffGovernance(readFileSync(resolveFromRoot(rootDir, kickoffPath), "utf8"));
  const launchIntakeResult = evaluateUatLaunchIntake(readFileSync(resolveFromRoot(rootDir, launchIntakePath), "utf8"));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(resolveFromRoot(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(resolveFromRoot(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(resolveFromRoot(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(resolveFromRoot(rootDir, manifestPath), "utf8"));
  const evidenceReferenceResult = evaluateEvidenceReferencesFromFiles(rootDir, manifestPath);
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(resolveFromRoot(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(resolveFromRoot(rootDir, signoffRegisterPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult,
    evidenceReferenceResult,
    defectRegisterResult,
    signoffRegisterResult
  });

  return generateV1ExternalUatRequestMarkdown({
    generatedAt,
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
  });
}

export function generateV1ExternalUatBlockersFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const kickoffResult = evaluateKickoffGovernance(readFileSync(resolveFromRoot(rootDir, kickoffPath), "utf8"));
  const launchIntakeResult = evaluateUatLaunchIntake(readFileSync(resolveFromRoot(rootDir, launchIntakePath), "utf8"));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(resolveFromRoot(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(resolveFromRoot(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(resolveFromRoot(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(resolveFromRoot(rootDir, manifestPath), "utf8"));
  const evidenceReferenceResult = evaluateEvidenceReferencesFromFiles(rootDir, manifestPath);
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(resolveFromRoot(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(resolveFromRoot(rootDir, signoffRegisterPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult,
    evidenceReferenceResult,
    defectRegisterResult,
    signoffRegisterResult
  });

  return generateV1ExternalUatBlockersJson({
    generatedAt,
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
  });
}

export function generateV1ExternalUatClosureChecklistFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  runbookPath = DEFAULT_RUNBOOK_PATH,
  automatedReportPath = DEFAULT_AUTOMATED_REPORT_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const kickoffResult = evaluateKickoffGovernance(readFileSync(resolveFromRoot(rootDir, kickoffPath), "utf8"));
  const launchIntakeResult = evaluateUatLaunchIntake(readFileSync(resolveFromRoot(rootDir, launchIntakePath), "utf8"));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(resolveFromRoot(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(resolveFromRoot(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(resolveFromRoot(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(resolveFromRoot(rootDir, manifestPath), "utf8"));
  const evidenceReferenceResult = evaluateEvidenceReferencesFromFiles(rootDir, manifestPath);
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(resolveFromRoot(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(resolveFromRoot(rootDir, signoffRegisterPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult,
    evidenceReferenceResult,
    defectRegisterResult,
    signoffRegisterResult
  });

  return generateV1ExternalUatClosureChecklistMarkdown({
    generatedAt,
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath,
    runbookPath,
    automatedReportPath
  });
}

export function generateV1ExternalUatEvidenceIntakeFromFiles({
  rootDir = process.cwd(),
  evidencePath = DEFAULT_EVIDENCE_PATH,
  trackerPath = DEFAULT_TRACKER_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  defectRegisterPath = DEFAULT_DEFECT_REGISTER_PATH,
  environmentPath = DEFAULT_ENVIRONMENT_PATH,
  signoffRegisterPath = DEFAULT_SIGNOFF_REGISTER_PATH,
  launchIntakePath = DEFAULT_LAUNCH_INTAKE_PATH,
  kickoffPath = DEFAULT_KICKOFF_PATH,
  generatedAt = new Date().toISOString()
} = {}) {
  const readinessResult = evaluateReadinessSnapshot(readSnapshot(rootDir));
  const kickoffResult = evaluateKickoffGovernance(readFileSync(resolveFromRoot(rootDir, kickoffPath), "utf8"));
  const launchIntakeResult = evaluateUatLaunchIntake(readFileSync(resolveFromRoot(rootDir, launchIntakePath), "utf8"));
  const environmentResult = evaluateUatEnvironmentEvidence(readFileSync(resolveFromRoot(rootDir, environmentPath), "utf8"));
  const evidenceResult = evaluateUatEvidencePack(readFileSync(resolveFromRoot(rootDir, evidencePath), "utf8"));
  const trackerResult = evaluateUatExecutionTracker(readFileSync(resolveFromRoot(rootDir, trackerPath), "utf8"));
  const manifestResult = evaluateUatEvidenceManifest(readFileSync(resolveFromRoot(rootDir, manifestPath), "utf8"));
  const evidenceReferenceResult = evaluateEvidenceReferencesFromFiles(rootDir, manifestPath);
  const defectRegisterResult = evaluateUatDefectRegister(readFileSync(resolveFromRoot(rootDir, defectRegisterPath), "utf8"));
  const signoffRegisterResult = evaluateUatSignoffRegister(readFileSync(resolveFromRoot(rootDir, signoffRegisterPath), "utf8"));
  const releaseGateResult = evaluateV1ReleaseGate({
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    uatEvidenceResult: evidenceResult,
    trackerResult,
    evidenceManifestResult: manifestResult,
    evidenceReferenceResult,
    defectRegisterResult,
    signoffRegisterResult
  });

  return generateV1ExternalUatEvidenceIntakeMarkdown({
    generatedAt,
    readinessResult,
    kickoffResult,
    launchIntakeResult,
    environmentResult,
    evidenceResult,
    manifestResult,
    evidenceReferenceResult,
    trackerResult,
    defectRegisterResult,
    signoffRegisterResult,
    releaseGateResult,
    evidencePath,
    trackerPath,
    manifestPath,
    defectRegisterPath,
    environmentPath,
    signoffRegisterPath,
    launchIntakePath,
    kickoffPath
  });
}

function parseArgs(argv) {
  const parsed = {
    rootDir: process.cwd(),
    evidencePath: DEFAULT_EVIDENCE_PATH,
    trackerPath: DEFAULT_TRACKER_PATH,
    manifestPath: DEFAULT_MANIFEST_PATH,
    defectRegisterPath: DEFAULT_DEFECT_REGISTER_PATH,
    environmentPath: DEFAULT_ENVIRONMENT_PATH,
    signoffRegisterPath: DEFAULT_SIGNOFF_REGISTER_PATH,
    launchIntakePath: DEFAULT_LAUNCH_INTAKE_PATH,
    kickoffPath: DEFAULT_KICKOFF_PATH,
    outputPath: null,
    json: false,
    closureChecklist: false,
    evidenceIntake: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.rootDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--evidence") {
      parsed.evidencePath = argv[index + 1];
      index += 1;
    } else if (arg === "--tracker") {
      parsed.trackerPath = argv[index + 1];
      index += 1;
    } else if (arg === "--manifest") {
      parsed.manifestPath = argv[index + 1];
      index += 1;
    } else if (arg === "--defects") {
      parsed.defectRegisterPath = argv[index + 1];
      index += 1;
    } else if (arg === "--environment") {
      parsed.environmentPath = argv[index + 1];
      index += 1;
    } else if (arg === "--signoffs") {
      parsed.signoffRegisterPath = argv[index + 1];
      index += 1;
    } else if (arg === "--launch-intake") {
      parsed.launchIntakePath = argv[index + 1];
      index += 1;
    } else if (arg === "--kickoff") {
      parsed.kickoffPath = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      parsed.outputPath = argv[index + 1];
      index += 1;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--closure-checklist") {
      parsed.closureChecklist = true;
    } else if (arg === "--evidence-intake") {
      parsed.evidenceIntake = true;
    }
  }

  return parsed;
}

function printUsage() {
  console.error("Usage: node scripts/v1-external-uat-request.mjs [--json | --closure-checklist | --evidence-intake] [--root path] [--output docs/testing/v1-external-uat-request.md] [--evidence file] [--tracker file] [--manifest file] [--defects file] [--environment file] [--signoffs file] [--launch-intake file] [--kickoff file]");
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const output = options.json
      ? generateV1ExternalUatBlockersFromFiles(options)
      : options.closureChecklist
        ? generateV1ExternalUatClosureChecklistFromFiles(options)
        : options.evidenceIntake
          ? generateV1ExternalUatEvidenceIntakeFromFiles(options)
          : generateV1ExternalUatRequestFromFiles(options);
    if (options.outputPath) {
      writeFileSync(resolveFromRoot(options.rootDir, options.outputPath), output);
    } else {
      process.stdout.write(output);
    }
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
