package com.canicula.crmai.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AiLogService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    AiLogService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<AiLogResponse> list(
            Long userId,
            String eventType,
            String aiModule,
            String status,
            String objectType,
            Long objectId,
            OffsetDateTime occurredFrom,
            OffsetDateTime occurredTo,
            Integer limit) {
        int safeLimit = limit == null ? 50 : Math.min(Math.max(limit, 1), 200);
        List<AiLogResponse> logs = new ArrayList<>();
        logs.addAll(generatedDraftLogs(userId));
        logs.addAll(generatedWeeklyReportLogs(userId));
        logs.addAll(generatedOpportunityAnalysisLogs(userId));
        logs.addAll(generatedVisitPlanLogs(userId));
        logs.addAll(generatedCommunicationRecommendationLogs(userId));
        logs.addAll(writeLogs(userId));
        return logs.stream()
                .filter(log -> matches(log.event_type(), eventType))
                .filter(log -> matches(log.ai_module(), aiModule))
                .filter(log -> matches(log.status(), status))
                .filter(log -> matches(log.object_type(), objectType))
                .filter(log -> objectId == null || objectId.equals(log.object_id()))
                .filter(log -> occurredFrom == null || (log.occurred_at() != null && !log.occurred_at().isBefore(occurredFrom)))
                .filter(log -> occurredTo == null || (log.occurred_at() != null && !log.occurred_at().isAfter(occurredTo)))
                .sorted(Comparator.comparing(AiLogResponse::occurred_at, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed()
                        .thenComparing(AiLogResponse::id, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(safeLimit)
                .toList();
    }

    private List<AiLogResponse> generatedDraftLogs(Long userId) {
        return jdbcTemplate.query(
                """
                select id, draft_type, status, source_text, payload_json,
                       write_object_type, write_object_id, created_by, created_at
                from ai_extraction_drafts
                where created_by = ?
                """,
                (rs, rowNum) -> new AiLogResponse(
                        rs.getLong("id"),
                        "generated",
                        "draft",
                        "generate",
                        rs.getString("status"),
                        rs.getString("draft_type"),
                        rs.getLong("id"),
                        nullableString(rs.getString("write_object_type")),
                        nullableLong(rs.getObject("write_object_id")),
                        draftTypeText(rs.getString("draft_type")),
                        draftSummary(rs.getString("payload_json"), rs.getString("source_text")),
                        "/ai-assistant/drafts",
                        null,
                        nullableLong(rs.getObject("created_by")),
                        null,
                        nullableOffsetDateTime(rs.getObject("created_at"))),
                userId);
    }

    private List<AiLogResponse> generatedWeeklyReportLogs(Long userId) {
        return jdbcTemplate.query(
                """
                select id, status, report_json, source_activity_count, created_by, created_at
                from ai_weekly_reports
                where created_by = ?
                """,
                (rs, rowNum) -> generatedLog(
                        rs.getLong("id"),
                        "weekly_report",
                        "AI周报",
                        textAt(rs.getString("report_json"), "personal_summary", "headline"),
                        rs.getString("status"),
                        "weekly_report",
                        rs.getLong("id"),
                        nullableLong(rs.getObject("created_by")),
                        nullableOffsetDateTime(rs.getObject("created_at"))),
                userId);
    }

    private List<AiLogResponse> generatedOpportunityAnalysisLogs(Long userId) {
        return jdbcTemplate.query(
                """
                select id, status, analysis_json, opportunity_id, write_activity_id, created_by, created_at
                from ai_opportunity_analyses
                where created_by = ?
                """,
                (rs, rowNum) -> generatedLog(
                        rs.getLong("id"),
                        "opportunity_analysis",
                        "商机分析",
                        firstArrayText(rs.getString("analysis_json"), "next_actions", textAt(rs.getString("analysis_json"), "opportunity_name")),
                        rs.getString("status"),
                        "opportunity_analysis",
                        rs.getLong("id"),
                        nullableLong(rs.getObject("created_by")),
                        nullableOffsetDateTime(rs.getObject("created_at"))),
                userId);
    }

    private List<AiLogResponse> generatedVisitPlanLogs(Long userId) {
        return jdbcTemplate.query(
                """
                select id, status, plan_json, opportunity_id, write_activity_id, created_by, created_at
                from ai_visit_plans
                where created_by = ?
                """,
                (rs, rowNum) -> generatedLog(
                        rs.getLong("id"),
                        "visit_plan",
                        "拜访计划",
                        firstArrayText(rs.getString("plan_json"), "visit_objectives", textAt(rs.getString("plan_json"), "opportunity_name")),
                        rs.getString("status"),
                        "visit_plan",
                        rs.getLong("id"),
                        nullableLong(rs.getObject("created_by")),
                        nullableOffsetDateTime(rs.getObject("created_at"))),
                userId);
    }

    private List<AiLogResponse> generatedCommunicationRecommendationLogs(Long userId) {
        return jdbcTemplate.query(
                """
                select id, status, recommendation_json, contact_id, write_activity_id, created_by, created_at
                from ai_communication_recommendations
                where created_by = ?
                """,
                (rs, rowNum) -> generatedLog(
                        rs.getLong("id"),
                        "communication_recommendation",
                        "沟通建议",
                        firstArrayText(rs.getString("recommendation_json"), "recommended_channels", textAt(rs.getString("recommendation_json"), "opening_message")),
                        rs.getString("status"),
                        "communication_recommendation",
                        rs.getLong("id"),
                        nullableLong(rs.getObject("created_by")),
                        nullableOffsetDateTime(rs.getObject("created_at"))),
                userId);
    }

    private AiLogResponse generatedLog(
            Long id,
            String aiModule,
            String title,
            String summary,
            String status,
            String sourceType,
            Long sourceId,
            Long actorUserId,
            OffsetDateTime occurredAt) {
        return new AiLogResponse(
                id,
                "generated",
                aiModule,
                "generate",
                status,
                sourceType,
                sourceId,
                null,
                null,
                title,
                summary,
                moduleUrl(aiModule),
                null,
                actorUserId,
                null,
                occurredAt);
    }

    private List<AiLogResponse> writeLogs(Long userId) {
        return jdbcTemplate.query(
                """
                select id, draft_id, operation, object_type, object_id, status,
                       error_message, created_by, created_at, trace_id
                from ai_write_logs
                where created_by = ?
                """,
                (rs, rowNum) -> {
                    String operation = rs.getString("operation");
                    String aiModule = moduleFromOperation(operation);
                    String objectType = nullableString(rs.getString("object_type"));
                    Long objectId = nullableLong(rs.getObject("object_id"));
                    return new AiLogResponse(
                            rs.getLong("id"),
                            "write",
                            aiModule,
                            operation,
                            rs.getString("status"),
                            aiModule,
                            nullableLong(rs.getObject("draft_id")),
                            objectType,
                            objectId,
                            operationText(operation),
                            writeSummary(operation, objectType, objectId),
                            objectUrl(objectType, objectId, aiModule),
                            nullableString(rs.getString("error_message")),
                            nullableLong(rs.getObject("created_by")),
                            nullableString(rs.getString("trace_id")),
                            nullableOffsetDateTime(rs.getObject("created_at")));
                },
                userId);
    }

    private String draftSummary(String payloadJson, String fallback) {
        JsonNode payload = readTree(payloadJson);
        for (String field : List.of("account_name", "name", "opportunity_name", "subject", "source_text")) {
            JsonNode value = payload.path(field);
            if (value.isTextual() && !value.asText().isBlank()) {
                return value.asText();
            }
        }
        return fallback;
    }

    private String textAt(String json, String... path) {
        JsonNode node = readTree(json);
        for (String segment : path) {
            node = node.path(segment);
        }
        return node.isTextual() ? node.asText() : "";
    }

    private String firstArrayText(String json, String arrayField, String fallback) {
        JsonNode value = readTree(json).path(arrayField);
        if (value.isArray() && value.size() > 0 && value.get(0).isTextual()) {
            return value.get(0).asText();
        }
        return fallback;
    }

    private JsonNode readTree(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception exception) {
            return objectMapper.createObjectNode();
        }
    }

    private static boolean matches(String actual, String expected) {
        return expected == null || expected.isBlank() || expected.equals(actual);
    }

    private static String draftTypeText(String draftType) {
        return switch (draftType) {
            case "account" -> "客户草稿";
            case "contact" -> "联系人草稿";
            case "opportunity" -> "商机草稿";
            case "activity" -> "行动草稿";
            default -> "AI草稿";
        };
    }

    private static String moduleFromOperation(String operation) {
        if (operation == null || operation.isBlank()) {
            return "draft";
        }
        if (operation.startsWith("weekly_report")) {
            return "weekly_report";
        }
        if (operation.startsWith("opportunity_analysis")) {
            return "opportunity_analysis";
        }
        if (operation.startsWith("visit_plan")) {
            return "visit_plan";
        }
        if (operation.startsWith("communication_recommendation")) {
            return "communication_recommendation";
        }
        return "draft";
    }

    private static String operationText(String operation) {
        if (operation == null) {
            return "AI操作";
        }
        if (operation.endsWith("reject") || "reject".equals(operation)) {
            return "拒绝AI建议";
        }
        if (operation.endsWith("confirm") || "confirm".equals(operation)) {
            return "确认并写入";
        }
        return operation;
    }

    private static String writeSummary(String operation, String objectType, Long objectId) {
        if (objectType == null || objectId == null) {
            return operationText(operation);
        }
        return operationText(operation) + "：" + objectTypeText(objectType) + " #" + objectId;
    }

    private static String objectTypeText(String objectType) {
        return switch (objectType) {
            case "account" -> "客户";
            case "contact" -> "联系人";
            case "opportunity" -> "商机";
            case "activity" -> "销售行动";
            case "weekly_report" -> "AI周报";
            case "opportunity_analysis" -> "商机分析";
            case "visit_plan" -> "拜访计划";
            case "communication_recommendation" -> "沟通建议";
            default -> objectType;
        };
    }

    private static String objectUrl(String objectType, Long objectId, String aiModule) {
        if (objectType == null || objectId == null) {
            return moduleUrl(aiModule);
        }
        return switch (objectType) {
            case "account" -> "/accounts?account_id=" + objectId;
            case "contact" -> "/contacts?contact_id=" + objectId;
            case "opportunity" -> "/opportunities?opportunity_id=" + objectId;
            case "activity" -> "/activities?activity_id=" + objectId;
            default -> moduleUrl(aiModule);
        };
    }

    private static String moduleUrl(String aiModule) {
        return switch (aiModule) {
            case "weekly_report" -> "/ai-assistant/weekly-report";
            case "opportunity_analysis" -> "/ai-assistant/opportunities";
            case "visit_plan" -> "/ai-assistant/visit-plans";
            case "communication_recommendation" -> "/ai-assistant/communication";
            default -> "/ai-assistant/drafts";
        };
    }

    private static String nullableString(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static OffsetDateTime nullableOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().atOffset(OffsetDateTime.now().getOffset());
        }
        throw new IllegalArgumentException("Unsupported timestamp value: " + value.getClass());
    }
}
