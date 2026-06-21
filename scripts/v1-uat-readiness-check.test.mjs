import assert from "node:assert/strict";
import test from "node:test";

import { evaluateReadinessSnapshot } from "./v1-uat-readiness-check.mjs";

const completeSnapshot = {
  ".github/workflows/v1-validation.yml": `
jobs:
  deployment-config:
    steps:
      - run: docker compose -f compose.v1-test.yml config
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - run: node scripts/v1-deployment-config-check.mjs
      - run: node --test scripts/*.test.mjs
      - run: node --test scripts/v1-deployment-config-check.test.mjs
      - run: node --test scripts/v1-uat-environment-validate.test.mjs
      - run: node --test scripts/v1-uat-evidence-pack-validate.test.mjs
      - run: node --test scripts/v1-uat-defect-register-validate.test.mjs
      - run: node --test scripts/v1-uat-signoff-register-validate.test.mjs
      - run: node --test scripts/v1-kickoff-governance-validate.test.mjs
      - run: node --test scripts/v1-uat-launch-intake-validate.test.mjs
      - run: node --test scripts/v1-uat-evidence-manifest-validate.test.mjs
      - run: node --test scripts/v1-evidence-reference-check.test.mjs
      - run: node scripts/v1-evidence-reference-check.mjs
      - run: node --test scripts/v1-uat-execution-tracker-validate.test.mjs
      - run: node --test scripts/v1-release-gate.test.mjs
      - run: node --test scripts/v1-validation-status.test.mjs
      - run: node --test scripts/v1-uat-action-plan.test.mjs
      - run: node --test scripts/v1-uat-execution-pack.test.mjs
      - run: node --test scripts/v1-go-no-go-meeting.test.mjs
      - run: node --test scripts/v1-external-uat-request.test.mjs
      - run: node scripts/v1-external-uat-request.mjs --closure-checklist --output docs/testing/v1-external-uat-closure-checklist.md
      - run: node scripts/v1-external-uat-request.mjs --evidence-intake --output docs/testing/v1-external-uat-evidence-intake.md
      - run: node scripts/v1-external-uat-request.mjs --json --output docs/testing/v1-external-uat-blockers.json
      - run: node --test scripts/v1-generated-docs-check.test.mjs
      - run: node scripts/v1-generated-docs-check.mjs
      - run: node --test scripts/v1-release-gate-status-check.test.mjs
      - run: node scripts/v1-release-gate-status-check.mjs
      - run: node --test scripts/v1-plan-status-check.test.mjs
      - run: node scripts/v1-plan-status-check.mjs
      - run: node --test scripts/v1-acceptance-checklist-check.test.mjs
      - run: node scripts/v1-acceptance-checklist-check.mjs
      - run: node --test scripts/v1-uat-coverage-check.test.mjs
      - run: node scripts/v1-uat-coverage-check.mjs
      - run: node --test scripts/v1-traceability-check.test.mjs
      - run: node scripts/v1-traceability-check.mjs
      - run: node --test scripts/v1-blocker-consistency-check.test.mjs
      - run: node scripts/v1-blocker-consistency-check.mjs
      - run: node --test scripts/v1-external-uat-request-coverage-check.test.mjs
      - run: node scripts/v1-external-uat-request-coverage-check.mjs
      - run: node --test scripts/v1-final-evidence-handoff-check.test.mjs
      - run: node scripts/v1-final-evidence-handoff-check.mjs
      - run: node --test scripts/v1-secret-scan-check.test.mjs
      - run: node scripts/v1-secret-scan-check.mjs
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
  "scripts/v1-uat-environment-validate.mjs": "evaluateUatEnvironmentEvidence\nenvironment-summary\nenvironment-summary-format\nenvironment-checks\nenvironment-owner-name-format\nenvironment-evidence-retained\nenvironment-evidence-artifacts\nno-secret-material\n",
  "scripts/v1-uat-environment-validate.test.mjs": "fails a draft environment record when named environment evidence is pending\nfails when environment URLs or git commit are not structured\nfails when a PASS environment check owner is only a role label\nfails when PASS environment evidence reference is not retained\nfails when PASS environment evidence reference points to a missing docs artifact\n",
  "scripts/v1-uat-evidence-pack-validate.mjs": "evaluateUatEvidencePack\np0-defects\nsignoff-complete\ngo-hard-gates\nbasic-info-format\nbasic-version-fields-complete\nbasic-owners-complete\nbasic-owner-name-format\nuat-case-owner-name-format\nsignoff-owner-name-format\nsignoff-date-format\nno-secret-material\nevidence-references-retained\nevidence-reference-artifacts\n",
  "scripts/v1-uat-evidence-pack-validate.test.mjs": "fails a Go evidence pack when a P0 defect remains open\nfails when basic evidence pack metadata is not structured\nfails when evidence pack version rows are missing\nfails when evidence pack contains secret-like material\nfails when passed evidence references point to missing docs artifacts\nfails when a basic evidence pack owner row is missing\nfails when a basic evidence pack owner is only a role label\nfails when a passed UAT case owner is only a role label\nfails when an approved signoff owner is only a role label\nfails when an approved signoff date is not structured\nfails when passed UAT evidence references are not retained\n",
  "scripts/v1-uat-defect-register-validate.mjs": "evaluateUatDefectRegister\np0-p1-summary\ndefect-source-case-format\ndefect-owner-name-format\nregression-evidence\ndefect-evidence-retained\ndefect-evidence-artifacts\nno-secret-material\n",
  "scripts/v1-uat-defect-register-validate.test.mjs": "fails the current draft defect register because P0 and P1 closure evidence is pending\nfails when a P0 or P1 defect source case is not traceable\nfails when a P0 or P1 defect owner is only a role label\nfails when closed P0 or P1 regression evidence is not retained\nfails when closed P0 or P1 regression evidence points to a missing docs artifact\n",
  "scripts/v1-uat-signoff-register-validate.mjs": "evaluateUatSignoffRegister\nrequired-signoffs\nsignoff-owner-name-format\nsigned-date-format\nsignoff-evidence-retained\nsignoff-evidence-artifacts\nproject-go-decision\nno-secret-material\n",
  "scripts/v1-uat-signoff-register-validate.test.mjs": "fails the draft signoff register because signoffs are pending\nfails when an approved signoff owner is only a role label\nfails when an approved signoff uses a non-ISO signed date\nfails when an approved signoff evidence reference is not retained\nfails when approved signoff evidence points to a missing docs artifact\n",
  "scripts/v1-kickoff-governance-validate.mjs": "evaluateKickoffGovernance\nrequired-owners\nowner-name-format\nscope-freeze\nscope-boundary\nschedule-format\nkickoff-evidence-retained\nkickoff-evidence-artifacts\nno-secret-material\n",
  "scripts/v1-kickoff-governance-validate.test.mjs": "fails the current kickoff draft because owners and scope freeze remain pending\nfails when a confirmed kickoff owner is only a role label\nfails when kickoff schedule is not a structured date range\nfails when confirmed kickoff governance evidence is not retained\nfails when confirmed kickoff governance evidence points to missing docs artifacts\n",
  "scripts/v1-uat-launch-intake-validate.mjs": "evaluateUatLaunchIntake\nenvironment-intake\nenvironment-format\nlaunch-window-format\nparticipant-roster\nparticipant-owner-name-format\naccount-custody\naccount-owner-name-format\nlaunch-evidence-retained\nlaunch-evidence-artifacts\nno-secret-material\n",
  "scripts/v1-uat-launch-intake-validate.test.mjs": "fails a draft launch intake because external UAT inputs are pending\nfails when a confirmed UAT participant owner is only a role label\nfails when a prepared account custody owner is only a role label\nfails when launch environment URLs or git commit are not structured\nfails when the UAT launch window is not a structured date time range\nfails when UAT launch evidence references are not retained\nfails when UAT launch evidence references point to missing docs artifacts\n",
  "scripts/v1-uat-evidence-manifest-validate.mjs": "evaluateUatEvidenceManifest\nrequired-items\nevidence-complete\nevidence-references-retained\npass-owner-name-format\nno-secret-material\n",
  "scripts/v1-uat-evidence-manifest-validate.test.mjs": "fails the current draft manifest because external UAT evidence is pending\nfails when PASS evidence references are not retained\nfails when a PASS evidence owner is only a role label\n",
  "scripts/v1-evidence-reference-check.mjs": "evaluateEvidenceReferences\nevaluateEvidenceReferencesFromFiles\npass-reference-artifacts\ngo-pass-references\n",
  "scripts/v1-evidence-reference-check.test.mjs": "fails a PASS evidence row when its repository artifact path is missing\nfails a PASS evidence row when its reference is not retained under docs or an external URL\n",
  "scripts/v1-uat-execution-tracker-validate.mjs": "evaluateUatExecutionTracker\nrequired-items\ntracker-role-owner-name-format\nuat-case-owner-name-format\nrelease-gates\ntracker-evidence-retained\ntracker-evidence-artifacts\n",
  "scripts/v1-uat-execution-tracker-validate.test.mjs": "fails the current rc8 tracker because external UAT remains pending\nfails when a signed tracker role owner is only a role label\nfails when a passed UAT case owner is only a role label\nfails when passed tracker evidence references are not retained\nfails when passed tracker evidence references point to missing docs artifacts\n",
  "scripts/v1-release-gate.mjs": "evaluateV1ReleaseGate\nevaluateV1ReleaseGateFromFiles\nV1 release gate requires Go\nkickoff-governance\nuat-launch-intake\nuat-environment\nuat-evidence-references\n",
  "scripts/v1-release-gate.test.mjs": "fails when kickoff governance remains incomplete\nfails when the UAT launch intake remains incomplete\nfails when PASS evidence references do not resolve to retained artifacts\nfails when the project decision is Conditional Go\n",
  "scripts/v1-validation-status.mjs": "generateV1ValidationStatusMarkdown\nOverall: No-Go\nKickoff Governance\nUAT Environment Evidence\nUAT Execution Tracker\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-validation-status.test.mjs": "summarizes a No-Go V1 status with concrete blocker commands\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-uat-action-plan.mjs": "generateV1UatActionPlanMarkdown\nOverall: No-Go\nRole Workstreams\nKickoff Governance\nUAT Environment Evidence\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-uat-action-plan.test.mjs": "generates a No-Go UAT action plan grouped by project, test, business, and engineering workstreams\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-uat-execution-pack.mjs": "generateV1UatExecutionPackMarkdown\nOverall: No-Go\nExecution Items\nKICKOFF-OWNERS\nENV-001\nUAT-010\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-uat-execution-pack.test.mjs": "generates an executable UAT evidence collection pack from failed gates\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-go-no-go-meeting.mjs": "generateV1GoNoGoMeetingMarkdown\nDecision Recommendation: No-Go\nFinal Signoff Table\nKickoff Governance\nUAT Environment Evidence\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-go-no-go-meeting.test.mjs": "generates a No-Go meeting pack that blocks approval until validators pass\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-external-uat-request.mjs": "generateV1ExternalUatRequestMarkdown\ngenerateV1ExternalUatBlockersJson\ngenerateV1ExternalUatBlockersFromFiles\ngenerateV1ExternalUatClosureChecklistMarkdown\ngenerateV1ExternalUatClosureChecklistFromFiles\ngenerateV1ExternalUatEvidenceIntakeMarkdown\ngenerateV1ExternalUatEvidenceIntakeFromFiles\nRequest Status: External UAT Evidence Required\nRequest Board\nCRM V1 External UAT Closure Checklist\nCRM V1 External UAT Evidence Intake\nDo not record plaintext passwords\nnode scripts/v1-release-gate.mjs --json\n--json\n--closure-checklist\n--evidence-intake\nv1-external-uat-blockers.json\nv1-external-uat-closure-checklist.md\nv1-external-uat-evidence-intake.md\n",
  "scripts/v1-external-uat-request.test.mjs": "generates a No-Go external UAT request packet with source documents and validation commands\nexports machine-readable external UAT blockers with owner routing and validation commands\ngenerates an external UAT closure checklist grouped by owner side\ngenerates an external UAT evidence intake checklist tied to manifest ids\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-generated-docs-check.mjs": "evaluateGeneratedDocsSnapshot\nGenerated document is stale\nvalidation-status-current-commit\n",
  "scripts/v1-generated-docs-check.test.mjs": "fails when a generated document drifts from its generator\nfails when the validation status document is not bound to the current git commit\n",
  "scripts/v1-release-gate-status-check.mjs": "evaluateV1ReleaseGateStatusSnapshot\nrequired-checks\nresult-shape\ndecision-consistency\nlive-release-gate-match\nevaluateV1ReleaseGateFromFiles\nnode scripts/v1-release-gate-status-check.mjs\n",
  "scripts/v1-release-gate-status-check.test.mjs": "fails when the release gate JSON snapshot omits a required check\nfails when the release gate result and decision disagree\nfails when the release gate JSON snapshot does not match the current release gate result\n",
  "scripts/v1-plan-status-check.mjs": "evaluateV1PlanStatusSnapshot\nopen-plan-items-no-go\n",
  "scripts/v1-plan-status-check.test.mjs": "fails when open plan items are paired with a Go validation status\n",
  "scripts/v1-acceptance-checklist-check.mjs": "evaluateV1AcceptanceChecklistSnapshot\nacceptance-status-release-alignment\n",
  "scripts/v1-acceptance-checklist-check.test.mjs": "fails when all acceptance items are marked business passed while the release gate is No-Go\n",
  "scripts/v1-uat-coverage-check.mjs": "evaluateV1UatCoverageSnapshot\nuat-covers-all-acceptance-items\nuat-case-execution-detail\n",
  "scripts/v1-uat-coverage-check.test.mjs": "fails when acceptance criteria are missing from UAT case mapping\nfails when UAT rows omit owner or evidence requirements\n",
  "scripts/v1-traceability-check.mjs": "evaluateV1TraceabilitySnapshot\ntraceability-release-alignment\n",
  "scripts/v1-traceability-check.test.mjs": "fails when traceability claims project acceptance while release gate is No-Go\n",
  "scripts/v1-blocker-consistency-check.mjs": "evaluateV1BlockerConsistencySnapshot\ndecision-doc-release-blockers\n",
  "scripts/v1-blocker-consistency-check.test.mjs": "fails when a decision document omits a release gate blocker\nfails when the external UAT request packet omits a release gate blocker\n",
  "scripts/v1-external-uat-request-coverage-check.mjs": "evaluateV1ExternalUatRequestCoverageSnapshot\nrequest-blocker-coverage\nrequest-command-coverage\nrequest-workstream-routing\nnode scripts/v1-external-uat-request-coverage-check.mjs\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-external-uat-request-coverage-check.test.mjs": "fails when the external UAT request packet omits a failed validator check\nfails when the external UAT request packet omits the machine-readable release gate command\n",
  "scripts/v1-final-evidence-handoff-check.mjs": "evaluateV1FinalEvidenceHandoffSnapshot\nhandoff-materials-present\nrelease-gate-status-readable\nexternal-blockers-visible\nno-go-handoff-guardrail\nhandoff-command-coverage\nnode scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md\nnode scripts/v1-acceptance-checklist-check.mjs\nnode scripts/v1-uat-coverage-check.mjs\nnode scripts/v1-traceability-check.mjs\nnode scripts/v1-final-evidence-handoff-check.mjs\nnode scripts/v1-release-gate.mjs --json\n",
  "scripts/v1-final-evidence-handoff-check.test.mjs": "fails when final handoff materials claim V1 acceptance while release gate is No-Go\nfails when final handoff materials omit acceptance and traceability commands\nfails when final handoff materials omit the machine-readable final release gate command\nfails when No-Go final handoff materials hide external UAT blockers\nfails when generated UAT handoff packets are missing\n",
  "scripts/v1-secret-scan-check.mjs": "evaluateV1SecretScanSnapshot\ncurrent-v1-evidence-no-secrets\nREADME.md\n",
  "scripts/v1-secret-scan-check.test.mjs": "fails when a current V1 evidence document contains a bearer token\ntracks the README final handoff entrypoint as current V1 evidence\n",
  "scripts/v1-deployment-config-check.mjs": "evaluateDeploymentConfigSnapshot\nCRM_BACKEND_BUILD_IMAGE\nCRM_FRONTEND_RUNTIME_IMAGE\n",
  "scripts/v1-deployment-config-check.test.mjs": "configurable for mirrored registries\n",
  "docs/releases/v1.0.0-rc.8.md": "v1.0.0-rc.8\nGitHub Actions `V1 Validation`\nsuccess\nUAT\nGo/No-Go\nV1-local-uat-20260618\nCRM_BACKEND_BUILD_IMAGE\nv1-uat-evidence-pack-validate\nV1演示业务数据\n仍需在具名测试环境完成验收签署\n",
  "docs/testing/v1-automated-validation-report-2026-06-18.md": "代码级、接口级、迁移级、本地部署态\nGitHub Actions\n具名测试环境部署态验收\n业务验收签署\n",
  "docs/testing/v1-validation-status.md": "CRM V1 Validation Status\nOverall: No-Go\nUAT Environment Evidence\nUAT Execution Tracker\nRelease Gate\n具名测试环境\n业务验收签署\n仍需\n",
  "docs/testing/v1-uat-action-plan.md": "CRM V1 UAT Action Plan\nOverall: No-Go\nRole Workstreams\nUAT Environment Evidence\n具名测试环境\n业务验收签署\n仍需\n",
  "docs/testing/v1-uat-execution-pack.md": "CRM V1 UAT Execution Pack\nOverall: No-Go\nExecution Items\nENV-001\nPRE-001\nSMK-001\nUAT-001\nDEF-REGISTER\nSIGNOFF-SALES\nGO-NOGO\n",
  "docs/testing/v1-go-no-go-meeting.md": "CRM V1 Go/No-Go Meeting Pack\nDecision Recommendation: No-Go\nFinal Signoff Table\nUAT Environment Evidence\n具名测试环境\n业务验收签署\n仍需\n",
  "docs/testing/v1-external-uat-request.md": "CRM V1 External UAT Request Packet\nRequest Status: External UAT Evidence Required\nRequest Board\nProject / Product\nTest\nBusiness UAT\nEngineering\nDo not record plaintext passwords\nKickoff Governance\nUAT Launch Intake\nUAT Environment Evidence\nUAT Evidence Pack\nUAT Evidence Manifest\nUAT Execution Tracker\nUAT Defect Register\nUAT Signoff Register\nRelease Gate\n",
  "docs/testing/v1-external-uat-closure-checklist.md": "CRM V1 External UAT Closure Checklist\nOverall: No-Go\nOpen blocker count: 1\n## 项目/产品\n## 测试\n## 业务UAT\nStatus\nGate\nCheck ID\nSource document\nValidation command\nClosure evidence needed\nDo not mark a row Closed until its source document validates PASS and the final release gate returns Go\n",
  "docs/testing/v1-external-uat-evidence-intake.md": "CRM V1 External UAT Evidence Intake\nOverall: No-Go\nClosure checklist: docs/testing/v1-external-uat-closure-checklist.md\nEvidence manifest: docs/testing/v1-uat-evidence-manifest.md\nTEST-ENV\nBUSINESS-UAT\nDEFECT-CLOSURE\nSIGNOFF-GO\nENV-EVIDENCE\nUAT-001\nUAT-010\nDEF-P0\nSIGNOFF-PM\nnode scripts/v1-uat-evidence-manifest-validate.mjs docs/testing/v1-uat-evidence-manifest.md\nnode scripts/v1-release-gate.mjs --json\nDo not paste passwords\n",
  "docs/testing/v1-external-uat-blockers.json": "{\"status\":\"External UAT Evidence Required\",\"decision\":\"No-Go\",\"ok\":false,\"summary\":{\"totalBlockers\":1,\"byOwnerSide\":{\"项目/产品\":1}},\"blockers\":[{\"gate\":\"Release Gate\",\"checkId\":\"go-decision\",\"ownerSide\":\"项目/产品\",\"sourceDocument\":\"docs/testing/v1-go-no-go-meeting.md\",\"validationCommand\":\"node scripts/v1-release-gate.mjs --json\",\"message\":\"Project decision is No-Go; V1 release gate requires Go.\"}]}\n",
  "docs/testing/v1-release-gate-status.json": "{\"result\":\"FAIL\",\"decision\":\"No-Go\",\"ok\":false,\"checks\":[{\"id\":\"go-decision\",\"ok\":false}]}\n",
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
  "docs/testing/crm-v1-validation-traceability.md": "研发验证通过\n若目标口径是“项目 V1 验收通过”，仍需完成具名测试环境验证和业务验收签署。\nnode scripts/v1-traceability-check.mjs\n",
  "docs/testing/crm-v1-test-environment-validation-runbook.md": "具名测试环境\n证据包\n签署\nUAT-001\nUAT-010\nAC-005\nAC-014\nnode scripts/v1-generated-docs-check.mjs\nnode scripts/v1-plan-status-check.mjs\nnode scripts/v1-uat-coverage-check.mjs\nnode scripts/v1-blocker-consistency-check.mjs\nnode scripts/v1-external-uat-request-coverage-check.mjs\nnode scripts/v1-final-evidence-handoff-check.mjs\nnode scripts/v1-secret-scan-check.mjs\nnode scripts/v1-release-gate.mjs --json\n",
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
node scripts/v1-evidence-reference-check.mjs
`,
  "docs/testing/evidence/v1-local-uat-2026-06-18.md": "V1-local-uat-20260618\nv1.0.0-rc.8\nFlyway\n14\n/api/health\n/api/bootstrap\nBrowser Use URL policy\nUAT evidence pack validator\nV1演示业务数据\n\"accounts\": 1\n\"contacts\": 1\n\"opportunities\": 1\n\"activities\": 1\n",
  "docs/testing/evidence/v1-compose-uat-2026-06-19.md": "V1-compose-uat-20260619\nv1.0.0-rc.8\n8e9efba2ea50bfe32304ec488cde72ee5262f86b\ndocker.1ms.run/library/postgres:16\nCRM_BACKEND_BUILD_IMAGE=docker.1ms.run/library/maven:3.9-eclipse-temurin-17\nCRM_BACKEND_RUNTIME_IMAGE=docker.1ms.run/library/eclipse-temurin:17-jre\nCRM_FRONTEND_BUILD_IMAGE=docker.1ms.run/library/node:22-alpine\nCRM_FRONTEND_RUNTIME_IMAGE=docker.1ms.run/library/nginx:1.27-alpine\ndocker compose -f compose.v1-test.yml up -d --build\ncrm-ai-v1-test-db-1\ncrm-ai-v1-test-backend-1\ncrm-ai-v1-test-frontend-1\n/api/health\n\"status\":\"UP\"\n/api/bootstrap\n\"permissions_count\":25\n\"accounts\":1\n\"contacts\":1\n\"opportunities\":1\n\"activities\":1\nnpm run smoke:v1:browser\nv1-rc8-compose-browser-smoke-20260619.png\n",
  "docs/testing/evidence/crm-v1-uat-evidence-pack-rc8-draft.md": "v1.0.0-rc.8\n0c9db47b0df8a0b05e63b66bdaa09f46222d9f0c\n27776171025\nNo-Go\nFAIL\n具名测试环境\nUAT-001\nUAT-010\nP0/P1缺陷汇总未填写\n销售侧、管理侧、产品、测试、研发和项目负责人签署未完成\n不能作为 `Go` 准出记录\n",
  "docs/testing/crm-v1-acceptance-checklist.md": Array.from({ length: 17 }, (_, index) => {
    const id = String(index + 1).padStart(3, "0");
    return `AC-${id} | 研发验证通过，待业务验收`;
  }).join("\n") + "\n具名测试环境待部署确认\n",
  "README.md": "docs/releases/v1.0.0-rc.8.md\ncompose.v1-test.yml\nv1-kickoff-governance-validate.mjs\nv1-uat-environment-validate.mjs\nv1-uat-evidence-pack-validate.mjs\nv1-uat-defect-register-validate.mjs\nv1-uat-signoff-register-validate.mjs\nv1-uat-launch-intake-validate.mjs\nv1-uat-evidence-manifest-validate.mjs\nv1-evidence-reference-check.mjs\nv1-release-gate.mjs\nv1-validation-status.mjs\nv1-uat-action-plan.mjs\nv1-uat-execution-pack.mjs\nv1-go-no-go-meeting.mjs\nv1-external-uat-request.mjs\nnode scripts/v1-external-uat-request.mjs --closure-checklist --output docs/testing/v1-external-uat-closure-checklist.md\nnode scripts/v1-external-uat-request.mjs --evidence-intake --output docs/testing/v1-external-uat-evidence-intake.md\nnode scripts/v1-external-uat-request.mjs --json --output docs/testing/v1-external-uat-blockers.json\nv1-generated-docs-check.mjs\nv1-release-gate-status-check.mjs\nv1-plan-status-check.mjs\nv1-acceptance-checklist-check.mjs\nv1-uat-coverage-check.mjs\nv1-traceability-check.mjs\nv1-blocker-consistency-check.mjs\nv1-external-uat-request-coverage-check.mjs\nv1-final-evidence-handoff-check.mjs\nv1-secret-scan-check.mjs\n"
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

test("fails when the release gate JSON snapshot is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-release-gate-status.json"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the external UAT blockers JSON snapshot is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-external-uat-blockers.json"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the external UAT closure checklist snapshot is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-external-uat-closure-checklist.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the external UAT evidence intake checklist snapshot is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["docs/testing/v1-external-uat-evidence-intake.md"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when V1 validation checkout cannot verify status commit freshness", () => {
  const snapshot = {
    ...completeSnapshot,
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 2\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "workflow-v1-validation"));
});

test("fails when V1 validation omits the full scripts test suite safety net", () => {
  const snapshot = {
    ...completeSnapshot,
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/*.test.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "workflow-v1-validation"));
});

test("fails when the external UAT request generator omits the machine-readable blockers export", () => {
  const snapshot = {
    ...completeSnapshot,
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node scripts/v1-external-uat-request.mjs --json --output docs/testing/v1-external-uat-blockers.json\n", ""),
    "scripts/v1-external-uat-request.mjs": completeSnapshot["scripts/v1-external-uat-request.mjs"]
      .replace("generateV1ExternalUatBlockersJson\n", "")
      .replace("generateV1ExternalUatBlockersFromFiles\n", "")
      .replace("--json\n", "")
      .replace("v1-external-uat-blockers.json\n", ""),
    "scripts/v1-external-uat-request.test.mjs": completeSnapshot["scripts/v1-external-uat-request.test.mjs"]
      .replace("exports machine-readable external UAT blockers with owner routing and validation commands\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-pack"));
});

test("fails when the external UAT request generator omits the closure checklist export", () => {
  const result = evaluateReadinessSnapshot({
    ...completeSnapshot,
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node scripts/v1-external-uat-request.mjs --closure-checklist --output docs/testing/v1-external-uat-closure-checklist.md\n", ""),
    "scripts/v1-external-uat-request.mjs": completeSnapshot["scripts/v1-external-uat-request.mjs"]
      .replace("generateV1ExternalUatClosureChecklistMarkdown\n", "")
      .replace("generateV1ExternalUatClosureChecklistFromFiles\n", "")
      .replace("--closure-checklist\n", "")
      .replace("v1-external-uat-closure-checklist.md\n", ""),
    "scripts/v1-external-uat-request.test.mjs": completeSnapshot["scripts/v1-external-uat-request.test.mjs"]
      .replace("generates an external UAT closure checklist grouped by owner side\n", "")
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-pack"));
});

test("fails when the external UAT request generator omits the evidence intake export", () => {
  const result = evaluateReadinessSnapshot({
    ...completeSnapshot,
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node scripts/v1-external-uat-request.mjs --evidence-intake --output docs/testing/v1-external-uat-evidence-intake.md\n", ""),
    "scripts/v1-external-uat-request.mjs": completeSnapshot["scripts/v1-external-uat-request.mjs"]
      .replace("generateV1ExternalUatEvidenceIntakeMarkdown\n", "")
      .replace("generateV1ExternalUatEvidenceIntakeFromFiles\n", "")
      .replace("--evidence-intake\n", "")
      .replace("v1-external-uat-evidence-intake.md\n", ""),
    "scripts/v1-external-uat-request.test.mjs": completeSnapshot["scripts/v1-external-uat-request.test.mjs"]
      .replace("generates an external UAT evidence intake checklist tied to manifest ids\n", "")
  });

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-pack"));
});

test("fails when the UAT evidence pack generator is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["scripts/v1-uat-evidence-pack.mjs"];

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "required-artifacts"));
});

test("fails when the evidence reference checker is missing", () => {
  const snapshot = { ...completeSnapshot };
  delete snapshot["scripts/v1-evidence-reference-check.mjs"];

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

test("fails when the UAT evidence pack validator omits retained evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("evidence-references-retained\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when passed UAT evidence references are not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits basic metadata format guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("basic-info-format\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when basic evidence pack metadata is not structured\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits version fields guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("basic-version-fields-complete\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when evidence pack version rows are missing\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits secret material guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("no-secret-material\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when evidence pack contains secret-like material\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits evidence artifact existence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("evidence-reference-artifacts\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when passed evidence references point to missing docs artifacts\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits required basic owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("basic-owners-complete\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when a basic evidence pack owner row is missing\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits named basic owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("basic-owner-name-format\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when a basic evidence pack owner is only a role label\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits named UAT case owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("uat-case-owner-name-format\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when a passed UAT case owner is only a role label\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits named signoff owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("signoff-owner-name-format\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when an approved signoff owner is only a role label\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-validator"));
});

test("fails when the UAT evidence pack validator omits signoff date format guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-pack-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.mjs"].replace("signoff-date-format\n", ""),
    "scripts/v1-uat-evidence-pack-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-pack-validate.test.mjs"].replace("fails when an approved signoff date is not structured\n", "")
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

test("fails when the UAT environment validator omits retained evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-environment-validate.mjs": completeSnapshot["scripts/v1-uat-environment-validate.mjs"].replace("environment-evidence-retained\n", ""),
    "scripts/v1-uat-environment-validate.test.mjs": completeSnapshot["scripts/v1-uat-environment-validate.test.mjs"].replace("fails when PASS environment evidence reference is not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-environment-validator"));
});

test("fails when the UAT environment validator omits evidence artifact existence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-environment-validate.mjs": completeSnapshot["scripts/v1-uat-environment-validate.mjs"].replace("environment-evidence-artifacts\n", ""),
    "scripts/v1-uat-environment-validate.test.mjs": completeSnapshot["scripts/v1-uat-environment-validate.test.mjs"].replace("fails when PASS environment evidence reference points to a missing docs artifact\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-environment-validator"));
});

test("fails when the UAT environment validator omits named check owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-environment-validate.mjs": completeSnapshot["scripts/v1-uat-environment-validate.mjs"].replace("environment-owner-name-format\n", ""),
    "scripts/v1-uat-environment-validate.test.mjs": completeSnapshot["scripts/v1-uat-environment-validate.test.mjs"].replace("fails when a PASS environment check owner is only a role label\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-environment-validator"));
});

test("fails when the UAT environment validator omits summary format guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-environment-validate.mjs": completeSnapshot["scripts/v1-uat-environment-validate.mjs"].replace("environment-summary-format\n", ""),
    "scripts/v1-uat-environment-validate.test.mjs": completeSnapshot["scripts/v1-uat-environment-validate.test.mjs"].replace("fails when environment URLs or git commit are not structured\n", "")
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

test("fails when the UAT defect register validator omits retained regression evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-defect-register-validate.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.mjs"].replace("defect-evidence-retained\n", ""),
    "scripts/v1-uat-defect-register-validate.test.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.test.mjs"].replace("fails when closed P0 or P1 regression evidence is not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-defect-register-validator"));
});

test("fails when the UAT defect register validator omits evidence artifact existence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-defect-register-validate.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.mjs"].replace("defect-evidence-artifacts\n", ""),
    "scripts/v1-uat-defect-register-validate.test.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.test.mjs"].replace("fails when closed P0 or P1 regression evidence points to a missing docs artifact\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-defect-register-validator"));
});

test("fails when the UAT defect register validator omits source case format guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-defect-register-validate.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.mjs"].replace("defect-source-case-format\n", ""),
    "scripts/v1-uat-defect-register-validate.test.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.test.mjs"].replace("fails when a P0 or P1 defect source case is not traceable\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-defect-register-validator"));
});

test("fails when the UAT defect register validator omits named defect owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-defect-register-validate.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.mjs"].replace("defect-owner-name-format\n", ""),
    "scripts/v1-uat-defect-register-validate.test.mjs": completeSnapshot["scripts/v1-uat-defect-register-validate.test.mjs"].replace("fails when a P0 or P1 defect owner is only a role label\n", "")
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

test("fails when the UAT signoff register validator omits retained evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-signoff-register-validate.mjs": completeSnapshot["scripts/v1-uat-signoff-register-validate.mjs"].replace("signoff-evidence-retained\n", ""),
    "scripts/v1-uat-signoff-register-validate.test.mjs": completeSnapshot["scripts/v1-uat-signoff-register-validate.test.mjs"].replace("fails when an approved signoff evidence reference is not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-signoff-register-validator"));
});

test("fails when the UAT signoff register validator omits evidence artifact existence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-signoff-register-validate.mjs": completeSnapshot["scripts/v1-uat-signoff-register-validate.mjs"].replace("signoff-evidence-artifacts\n", ""),
    "scripts/v1-uat-signoff-register-validate.test.mjs": completeSnapshot["scripts/v1-uat-signoff-register-validate.test.mjs"].replace("fails when approved signoff evidence points to a missing docs artifact\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-signoff-register-validator"));
});

test("fails when the UAT signoff register validator omits named owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-signoff-register-validate.mjs": completeSnapshot["scripts/v1-uat-signoff-register-validate.mjs"].replace("signoff-owner-name-format\n", ""),
    "scripts/v1-uat-signoff-register-validate.test.mjs": completeSnapshot["scripts/v1-uat-signoff-register-validate.test.mjs"].replace("fails when an approved signoff owner is only a role label\n", "")
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

test("fails when the UAT launch intake validator omits retained evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-launch-intake-validate.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.mjs"].replace("launch-evidence-retained\n", ""),
    "scripts/v1-uat-launch-intake-validate.test.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.test.mjs"].replace("fails when UAT launch evidence references are not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake-validator"));
});

test("fails when the UAT launch intake validator omits evidence artifact existence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-launch-intake-validate.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.mjs"].replace("launch-evidence-artifacts\n", ""),
    "scripts/v1-uat-launch-intake-validate.test.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.test.mjs"].replace("fails when UAT launch evidence references point to missing docs artifacts\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake-validator"));
});

test("fails when the UAT launch intake validator omits launch window format guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-launch-intake-validate.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.mjs"].replace("launch-window-format\n", ""),
    "scripts/v1-uat-launch-intake-validate.test.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.test.mjs"].replace("fails when the UAT launch window is not a structured date time range\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake-validator"));
});

test("fails when the UAT launch intake validator omits environment format guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-launch-intake-validate.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.mjs"].replace("environment-format\n", ""),
    "scripts/v1-uat-launch-intake-validate.test.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.test.mjs"].replace("fails when launch environment URLs or git commit are not structured\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake-validator"));
});

test("fails when the UAT launch intake validator omits named participant owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-launch-intake-validate.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.mjs"].replace("participant-owner-name-format\n", ""),
    "scripts/v1-uat-launch-intake-validate.test.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.test.mjs"].replace("fails when a confirmed UAT participant owner is only a role label\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-launch-intake-validator"));
});

test("fails when the UAT launch intake validator omits named account custody owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-launch-intake-validate.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.mjs"].replace("account-owner-name-format\n", ""),
    "scripts/v1-uat-launch-intake-validate.test.mjs": completeSnapshot["scripts/v1-uat-launch-intake-validate.test.mjs"].replace("fails when a prepared account custody owner is only a role label\n", "")
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

test("fails when the kickoff governance validator omits retained evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-kickoff-governance-validate.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.mjs"].replace("kickoff-evidence-retained\n", ""),
    "scripts/v1-kickoff-governance-validate.test.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.test.mjs"].replace("fails when confirmed kickoff governance evidence is not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "kickoff-governance-validator"));
});

test("fails when the kickoff governance validator omits evidence artifact existence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-kickoff-governance-validate.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.mjs"].replace("kickoff-evidence-artifacts\n", ""),
    "scripts/v1-kickoff-governance-validate.test.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.test.mjs"].replace("fails when confirmed kickoff governance evidence points to missing docs artifacts\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "kickoff-governance-validator"));
});

test("fails when the kickoff governance validator omits named owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-kickoff-governance-validate.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.mjs"].replace("owner-name-format\n", ""),
    "scripts/v1-kickoff-governance-validate.test.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.test.mjs"].replace("fails when a confirmed kickoff owner is only a role label\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "kickoff-governance-validator"));
});

test("fails when the kickoff governance validator omits schedule format guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-kickoff-governance-validate.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.mjs"].replace("schedule-format\n", ""),
    "scripts/v1-kickoff-governance-validate.test.mjs": completeSnapshot["scripts/v1-kickoff-governance-validate.test.mjs"].replace("fails when kickoff schedule is not a structured date range\n", "")
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

test("fails when the UAT evidence manifest validator omits retained evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-manifest-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-manifest-validate.mjs"].replace("evidence-references-retained\n", ""),
    "scripts/v1-uat-evidence-manifest-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-manifest-validate.test.mjs"].replace("fails when PASS evidence references are not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-evidence-manifest-validator"));
});

test("fails when the UAT evidence manifest validator omits named PASS owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-evidence-manifest-validate.mjs": completeSnapshot["scripts/v1-uat-evidence-manifest-validate.mjs"].replace("pass-owner-name-format\n", ""),
    "scripts/v1-uat-evidence-manifest-validate.test.mjs": completeSnapshot["scripts/v1-uat-evidence-manifest-validate.test.mjs"].replace("fails when a PASS evidence owner is only a role label\n", "")
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

test("fails when the UAT execution tracker validator omits retained evidence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-execution-tracker-validate.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.mjs"].replace("tracker-evidence-retained\n", ""),
    "scripts/v1-uat-execution-tracker-validate.test.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.test.mjs"].replace("fails when passed tracker evidence references are not retained\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-execution-tracker-validator"));
});

test("fails when the UAT execution tracker validator omits evidence artifact existence guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-execution-tracker-validate.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.mjs"].replace("tracker-evidence-artifacts\n", ""),
    "scripts/v1-uat-execution-tracker-validate.test.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.test.mjs"].replace("fails when passed tracker evidence references point to missing docs artifacts\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-execution-tracker-validator"));
});

test("fails when the UAT execution tracker validator omits named role owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-execution-tracker-validate.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.mjs"].replace("tracker-role-owner-name-format\n", ""),
    "scripts/v1-uat-execution-tracker-validate.test.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.test.mjs"].replace("fails when a signed tracker role owner is only a role label\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-execution-tracker-validator"));
});

test("fails when the UAT execution tracker validator omits named UAT case owner guard", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-execution-tracker-validate.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.mjs"].replace("uat-case-owner-name-format\n", ""),
    "scripts/v1-uat-execution-tracker-validate.test.mjs": completeSnapshot["scripts/v1-uat-execution-tracker-validate.test.mjs"].replace("fails when a passed UAT case owner is only a role label\n", "")
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

test("fails when the V1 validation status report omits machine-readable release gate command coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-validation-status.mjs": completeSnapshot["scripts/v1-validation-status.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", ""),
    "scripts/v1-validation-status.test.mjs": completeSnapshot["scripts/v1-validation-status.test.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", "")
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

test("fails when the V1 Go/No-Go meeting pack omits machine-readable release gate command coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-go-no-go-meeting.mjs": completeSnapshot["scripts/v1-go-no-go-meeting.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", ""),
    "scripts/v1-go-no-go-meeting.test.mjs": completeSnapshot["scripts/v1-go-no-go-meeting.test.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-go-no-go-meeting-pack"));
});

test("fails when the V1 external UAT request packet is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-external-uat-request.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"].replace(
      "      - run: node --test scripts/v1-external-uat-request.test.mjs\n",
      ""
    )
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-pack"));
});

test("fails when the V1 external UAT request packet omits machine-readable release gate command coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-external-uat-request.mjs": completeSnapshot["scripts/v1-external-uat-request.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", ""),
    "scripts/v1-external-uat-request.test.mjs": completeSnapshot["scripts/v1-external-uat-request.test.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-pack"));
});

test("fails when README omits the V1 secret scan entrypoint", () => {
  const snapshot = {
    ...completeSnapshot,
    "README.md": completeSnapshot["README.md"].replace("v1-secret-scan-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "readme-entrypoints"));
});

test("fails when README omits critical V1 release verification entrypoints", () => {
  for (const entrypoint of [
    "v1-evidence-reference-check.mjs",
    "v1-release-gate.mjs",
    "v1-release-gate-status-check.mjs",
    "v1-blocker-consistency-check.mjs"
  ]) {
    const snapshot = {
      ...completeSnapshot,
      "README.md": completeSnapshot["README.md"].replace(`${entrypoint}\n`, "")
    };

    const result = evaluateReadinessSnapshot(snapshot);

    assert.equal(result.ok, false, `${entrypoint} should be required in README`);
    assert.ok(result.failed.some((check) => check.id === "readme-entrypoints"));
  }
});

test("fails when README omits external UAT generated handoff commands", () => {
  for (const command of [
    "node scripts/v1-external-uat-request.mjs --closure-checklist --output docs/testing/v1-external-uat-closure-checklist.md",
    "node scripts/v1-external-uat-request.mjs --evidence-intake --output docs/testing/v1-external-uat-evidence-intake.md",
    "node scripts/v1-external-uat-request.mjs --json --output docs/testing/v1-external-uat-blockers.json"
  ]) {
    const snapshot = {
      ...completeSnapshot,
      "README.md": completeSnapshot["README.md"].replace(command, "")
    };

    const result = evaluateReadinessSnapshot(snapshot);

    assert.equal(result.ok, false, `${command} should be required in README`);
    assert.ok(result.failed.some((check) => check.id === "readme-entrypoints"));
  }
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

test("fails when the V1 generated docs checker omits validation status commit freshness", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-generated-docs-check.mjs": completeSnapshot["scripts/v1-generated-docs-check.mjs"]
      .replace("validation-status-current-commit\n", ""),
    "scripts/v1-generated-docs-check.test.mjs": completeSnapshot["scripts/v1-generated-docs-check.test.mjs"]
      .replace("fails when the validation status document is not bound to the current git commit\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-generated-docs-checker"));
});

test("fails when the V1 release gate status JSON checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-release-gate-status-check.mjs": "",
    "scripts/v1-release-gate-status-check.test.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-release-gate-status-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-release-gate-status-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-release-gate-status-checker"));
});

test("fails when the V1 release gate status JSON checker omits decision consistency", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-release-gate-status-check.mjs": completeSnapshot["scripts/v1-release-gate-status-check.mjs"]
      .replace("decision-consistency\n", ""),
    "scripts/v1-release-gate-status-check.test.mjs": completeSnapshot["scripts/v1-release-gate-status-check.test.mjs"]
      .replace("fails when the release gate result and decision disagree\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-release-gate-status-checker"));
});

test("fails when the V1 release gate status JSON checker omits live release gate matching", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-release-gate-status-check.mjs": completeSnapshot["scripts/v1-release-gate-status-check.mjs"]
      .replace("live-release-gate-match\n", "")
      .replace("evaluateV1ReleaseGateFromFiles\n", ""),
    "scripts/v1-release-gate-status-check.test.mjs": completeSnapshot["scripts/v1-release-gate-status-check.test.mjs"]
      .replace("fails when the release gate JSON snapshot does not match the current release gate result\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-release-gate-status-checker"));
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

test("fails when the V1 UAT coverage checker omits execution detail guards", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-coverage-check.mjs": completeSnapshot["scripts/v1-uat-coverage-check.mjs"]
      .replace("uat-case-execution-detail\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-uat-coverage-checker"));
});

test("fails when the V1 traceability checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-traceability-check.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-traceability-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-traceability-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-traceability-checker"));
});

test("fails when the V1 blocker consistency checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-blocker-consistency-check.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-blocker-consistency-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-blocker-consistency-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-blocker-consistency-checker"));
});

test("fails when the V1 external UAT request coverage checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-external-uat-request-coverage-check.mjs": "",
    "scripts/v1-external-uat-request-coverage-check.test.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-external-uat-request-coverage-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-external-uat-request-coverage-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-coverage-checker"));
});

test("fails when the V1 external UAT request coverage checker omits owner-side routing guards", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-external-uat-request-coverage-check.mjs": completeSnapshot["scripts/v1-external-uat-request-coverage-check.mjs"]
      .replace("request-workstream-routing\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-coverage-checker"));
});

test("fails when the V1 external UAT request coverage checker omits machine-readable release gate command coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-external-uat-request-coverage-check.mjs": completeSnapshot["scripts/v1-external-uat-request-coverage-check.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", ""),
    "scripts/v1-external-uat-request-coverage-check.test.mjs": completeSnapshot["scripts/v1-external-uat-request-coverage-check.test.mjs"]
      .replace("fails when the external UAT request packet omits the machine-readable release gate command\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-external-uat-request-coverage-checker"));
});

test("fails when the V1 final evidence handoff checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-final-evidence-handoff-check.mjs": "",
    "scripts/v1-final-evidence-handoff-check.test.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-final-evidence-handoff-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-final-evidence-handoff-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-final-evidence-handoff-checker"));
});

test("fails when the V1 final evidence handoff checker omits critical verification commands", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-final-evidence-handoff-check.mjs": completeSnapshot["scripts/v1-final-evidence-handoff-check.mjs"]
      .replace("node scripts/v1-evidence-reference-check.mjs docs/testing/v1-uat-evidence-manifest.md\n", "")
      .replace("node scripts/v1-acceptance-checklist-check.mjs\n", "")
      .replace("node scripts/v1-uat-coverage-check.mjs\n", "")
      .replace("node scripts/v1-traceability-check.mjs\n", "")
      .replace("node scripts/v1-final-evidence-handoff-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-final-evidence-handoff-checker"));
});

test("fails when the V1 final evidence handoff checker omits machine-readable release gate command coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-final-evidence-handoff-check.mjs": completeSnapshot["scripts/v1-final-evidence-handoff-check.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", ""),
    "scripts/v1-final-evidence-handoff-check.test.mjs": completeSnapshot["scripts/v1-final-evidence-handoff-check.test.mjs"]
      .replace("fails when final handoff materials omit the machine-readable final release gate command\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-final-evidence-handoff-checker"));
});

test("fails when the V1 final evidence handoff checker omits status and blocker visibility guards", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-final-evidence-handoff-check.mjs": completeSnapshot["scripts/v1-final-evidence-handoff-check.mjs"]
      .replace("release-gate-status-readable\n", "")
      .replace("external-blockers-visible\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-final-evidence-handoff-checker"));
});

test("fails when the V1 secret scan checker is missing from readiness materials", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-secret-scan-check.mjs": "",
    ".github/workflows/v1-validation.yml": completeSnapshot[".github/workflows/v1-validation.yml"]
      .replace("      - run: node --test scripts/v1-secret-scan-check.test.mjs\n", "")
      .replace("      - run: node scripts/v1-secret-scan-check.mjs\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-secret-scan-checker"));
});

test("fails when the V1 secret scan checker omits README handoff coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-secret-scan-check.mjs": completeSnapshot["scripts/v1-secret-scan-check.mjs"]
      .replace("README.md\n", ""),
    "scripts/v1-secret-scan-check.test.mjs": completeSnapshot["scripts/v1-secret-scan-check.test.mjs"]
      .replace("tracks the README final handoff entrypoint as current V1 evidence\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-secret-scan-checker"));
});

test("fails when the V1 UAT action plan omits machine-readable release gate command coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-action-plan.mjs": completeSnapshot["scripts/v1-uat-action-plan.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", ""),
    "scripts/v1-uat-action-plan.test.mjs": completeSnapshot["scripts/v1-uat-action-plan.test.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-uat-action-plan"));
});

test("fails when the V1 UAT execution pack omits machine-readable release gate command coverage", () => {
  const snapshot = {
    ...completeSnapshot,
    "scripts/v1-uat-execution-pack.mjs": completeSnapshot["scripts/v1-uat-execution-pack.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", ""),
    "scripts/v1-uat-execution-pack.test.mjs": completeSnapshot["scripts/v1-uat-execution-pack.test.mjs"]
      .replace("node scripts/v1-release-gate.mjs --json\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "v1-uat-execution-pack"));
});

test("fails when UAT execution materials omit the machine-readable final release gate command", () => {
  const snapshot = {
    ...completeSnapshot,
    "docs/testing/crm-v1-test-environment-validation-runbook.md": completeSnapshot[
      "docs/testing/crm-v1-test-environment-validation-runbook.md"
    ].replace("node scripts/v1-release-gate.mjs --json\n", "")
  };

  const result = evaluateReadinessSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.ok(result.failed.some((check) => check.id === "uat-execution-materials"));
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
