import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");

const REQUIRED_AI_PERMISSIONS = [
  "ai.context.read",
  "ai.draft.manage",
  "ai.weekly.manage",
  "ai.opportunity.analyze",
  "ai.visit.plan",
  "ai.communication.recommend",
  "ai.log.read"
];

export function resolveV4ApiSmokeConfig(env = process.env) {
  const timestamp = formatTimestamp(new Date());
  const evidenceDir = env.CRM_SMOKE_EVIDENCE_DIR
    ?? path.join(REPO_ROOT, "docs/testing/evidence/artifacts", `v4-api-smoke-${timestamp}`);
  return {
    baseUrl: trimTrailingSlash(env.CRM_API_SMOKE_URL ?? "http://127.0.0.1:8085"),
    username: env.CRM_SMOKE_USERNAME ?? "demo_admin",
    password: env.CRM_SMOKE_PASSWORD ?? "S3cure!123",
    evidenceDir,
    reportPath: env.CRM_SMOKE_REPORT ?? path.join(evidenceDir, "report.json")
  };
}

async function runV4ApiSmoke(config = resolveV4ApiSmokeConfig()) {
  await mkdir(config.evidenceDir, { recursive: true });
  let token;

  const login = await request(config, "/api/auth/login", {
    method: "POST",
    body: { username: config.username, password: config.password }
  });
  token = login.access_token;
  if (!token) {
    throw new Error("V4 API smoke login did not return access_token");
  }

  const currentUser = await request(config, "/api/auth/me", { token });
  const missedPermissions = REQUIRED_AI_PERMISSIONS.filter((permission) => !currentUser.permissions?.includes(permission));
  if (missedPermissions.length > 0) {
    throw new Error(`V4 API smoke user missed permissions: ${missedPermissions.join(", ")}`);
  }

  const context = await request(config, "/api/ai-context/summary", { token });
  const opportunity = context.opportunities?.[0];
  const contactId = opportunity?.contact_relations?.find((relation) => relation.is_key_person)?.contact_id
    ?? opportunity?.contact_relations?.[0]?.contact_id
    ?? context.contacts?.[0]?.id;
  if (!opportunity?.id || !contactId) {
    throw new Error("V4 API smoke requires at least one visible opportunity and contact relation");
  }

  const draftParse = await request(config, "/api/ai-drafts/parse", {
    method: "POST",
    token,
    body: {
      source_text: "客户：V4 API Smoke客户，行业：智能制造。联系人：李测试，职务：项目负责人，手机：13900000000。商机：AI销售作战助手试点，预算：50万。行动：下周三拜访，确认周报生成与商机分析试点范围。"
    }
  });
  const draft = draftParse.drafts?.[0];
  if (!draft?.id) {
    throw new Error("V4 API smoke parse did not create a draft");
  }
  const rejectedDraft = await request(config, `/api/ai-drafts/${draft.id}/reject`, {
    method: "POST",
    token,
    body: { reason: "V4 API Smoke 验证拒绝入口" }
  });

  const weeklyReport = await request(config, "/api/ai-weekly-reports/generate", {
    method: "POST",
    token,
    body: { week_start: "2026-07-06", week_end: "2026-07-12" }
  });
  const rejectedWeeklyReport = await request(config, `/api/ai-weekly-reports/${weeklyReport.id}/reject`, {
    method: "POST",
    token,
    body: { reason: "V4 API Smoke 验证拒绝入口" }
  });

  const opportunityAnalysis = await request(config, "/api/ai-opportunity-analyses/generate", {
    method: "POST",
    token,
    body: { opportunity_id: opportunity.id }
  });
  const rejectedOpportunityAnalysis = await request(config, `/api/ai-opportunity-analyses/${opportunityAnalysis.id}/reject`, {
    method: "POST",
    token,
    body: { reason: "V4 API Smoke 验证拒绝入口" }
  });

  const visitPlan = await request(config, "/api/ai-visit-plans/generate", {
    method: "POST",
    token,
    body: { opportunity_id: opportunity.id }
  });
  const rejectedVisitPlan = await request(config, `/api/ai-visit-plans/${visitPlan.id}/reject`, {
    method: "POST",
    token,
    body: { reason: "V4 API Smoke 验证拒绝入口" }
  });

  const communicationRecommendation = await request(config, "/api/ai-communication-recommendations/generate", {
    method: "POST",
    token,
    body: { contact_id: contactId, opportunity_id: opportunity.id }
  });
  const rejectedCommunicationRecommendation = await request(
    config,
    `/api/ai-communication-recommendations/${communicationRecommendation.id}/reject`,
    {
      method: "POST",
      token,
      body: { reason: "V4 API Smoke 验证拒绝入口" }
    }
  );

  const logs = await request(config, "/api/ai-logs?limit=30", { token });
  const logModules = new Set(logs.map((log) => log.ai_module));
  ["draft", "weekly_report", "opportunity_analysis", "visit_plan", "communication_recommendation"].forEach((module) => {
    if (!logModules.has(module)) {
      throw new Error(`V4 API smoke missed AI log module: ${module}`);
    }
  });

  const report = {
    status: "passed",
    generatedAt: new Date().toISOString(),
    baseUrl: config.baseUrl,
    user: { id: currentUser.id, email: currentUser.email, aiPermissions: REQUIRED_AI_PERMISSIONS.length },
    selectedContext: {
      opportunityId: opportunity.id,
      opportunityName: opportunity.opportunity_name,
      contactId
    },
    checks: {
      contextCounts: {
        accounts: context.accounts?.length ?? 0,
        opportunities: context.opportunities?.length ?? 0,
        recentActivities: context.recent_activities?.length ?? 0,
        evidence: context.evidence?.length ?? 0
      },
      draft: {
        inputRecordId: draftParse.input_record_id,
        draftId: draft.id,
        generatedCount: draftParse.drafts.length,
        rejectedStatus: rejectedDraft.status
      },
      weeklyReport: {
        id: weeklyReport.id,
        generatedStatus: weeklyReport.status,
        rejectedStatus: rejectedWeeklyReport.status,
        opportunityProgressCount: weeklyReport.opportunity_progress?.length ?? 0
      },
      opportunityAnalysis: {
        id: opportunityAnalysis.id,
        generatedStatus: opportunityAnalysis.status,
        rejectedStatus: rejectedOpportunityAnalysis.status,
        evidenceCount: opportunityAnalysis.evidence?.length ?? 0
      },
      visitPlan: {
        id: visitPlan.id,
        generatedStatus: visitPlan.status,
        rejectedStatus: rejectedVisitPlan.status,
        evidenceCount: visitPlan.evidence?.length ?? 0
      },
      communicationRecommendation: {
        id: communicationRecommendation.id,
        generatedStatus: communicationRecommendation.status,
        rejectedStatus: rejectedCommunicationRecommendation.status,
        evidenceCount: communicationRecommendation.evidence?.length ?? 0
      },
      logs: {
        count: logs.length,
        modules: Array.from(logModules).sort()
      }
    }
  };

  await writeFile(config.reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { ...report, reportPath: config.reportPath, evidenceDir: config.evidenceDir };
}

async function request(config, apiPath, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  headers.set("X-Trace-Id", `v4-api-smoke-${Date.now()}`);

  const response = await fetch(`${config.baseUrl}${apiPath}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code === "ERROR") {
    throw new Error(`V4 API smoke request failed: ${response.status} ${apiPath} ${payload.message ?? ""}`);
  }
  return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runV4ApiSmoke()
    .then((result) => {
      console.log(JSON.stringify({
        status: result.status,
        baseUrl: result.baseUrl,
        aiPermissions: result.user.aiPermissions,
        selectedContext: result.selectedContext,
        apiLogCount: result.checks.logs.count,
        evidenceDir: result.evidenceDir,
        reportPath: result.reportPath
      }, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
