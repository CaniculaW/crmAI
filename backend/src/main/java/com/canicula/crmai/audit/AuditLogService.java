package com.canicula.crmai.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.sql.Types;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlParameterValue;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    AuditLogService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void record(AuditLogEntry entry) {
        jdbcTemplate.update(
                """
                insert into sys_audit_logs (
                    actor_user_id, module_code, action_code, object_type, object_id,
                    before_data, after_data, result, failure_reason, ip_address, user_agent, trace_id
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                entry.actorUserId(),
                entry.moduleCode(),
                entry.actionCode(),
                entry.objectType(),
                entry.objectId(),
                jsonParameter(entry.beforeData()),
                jsonParameter(entry.afterData()),
                entry.result(),
                entry.failureReason(),
                entry.ipAddress(),
                entry.userAgent(),
                entry.traceId());
    }

    public List<AuditLogResponse> list(
            String moduleCode,
            String actionCode,
            String objectType,
            Long objectId,
            Long actorUserId,
            Integer limit) {
        StringBuilder sql = new StringBuilder("""
                select id, actor_user_id, module_code, action_code, object_type, object_id,
                       before_data, after_data, result, failure_reason, ip_address, user_agent,
                       trace_id, occurred_at
                from sys_audit_logs
                where 1 = 1
                """);
        List<Object> params = new ArrayList<>();
        appendEquals(sql, params, "module_code", moduleCode);
        appendEquals(sql, params, "action_code", actionCode);
        appendEquals(sql, params, "object_type", objectType);
        appendEquals(sql, params, "object_id", objectId);
        appendEquals(sql, params, "actor_user_id", actorUserId);
        sql.append(" order by occurred_at desc, id desc limit ?");
        params.add(limit == null ? 50 : Math.min(Math.max(limit, 1), 200));

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new AuditLogResponse(
                rs.getLong("id"),
                nullableLong(rs.getObject("actor_user_id")),
                rs.getString("module_code"),
                rs.getString("action_code"),
                rs.getString("object_type"),
                nullableLong(rs.getObject("object_id")),
                jsonNode(rs.getObject("before_data")),
                jsonNode(rs.getObject("after_data")),
                rs.getString("result"),
                rs.getString("failure_reason"),
                rs.getString("ip_address"),
                rs.getString("user_agent"),
                rs.getString("trace_id"),
                nullableOffsetDateTime(rs.getObject("occurred_at"))), params.toArray());
    }

    private static void appendEquals(StringBuilder sql, List<Object> params, String column, Object value) {
        if (value != null && (!(value instanceof String stringValue) || !stringValue.isBlank())) {
            sql.append(" and ").append(column).append(" = ?");
            params.add(value);
        }
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

    private SqlParameterValue jsonParameter(Object value) {
        return new SqlParameterValue(Types.OTHER, toJson(value));
    }

    private JsonNode jsonNode(Object value) {
        if (value == null) {
            return null;
        }
        try {
            JsonNode node;
            if (value instanceof byte[] bytes) {
                node = objectMapper.readTree(new String(bytes, StandardCharsets.UTF_8));
            } else {
                node = objectMapper.readTree(String.valueOf(value));
            }
            if (node.isTextual() && looksLikeJson(node.asText())) {
                return objectMapper.readTree(node.asText());
            }
            return node;
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Audit snapshot must be readable JSON", exception);
        }
    }

    private static boolean looksLikeJson(String value) {
        String trimmed = value.trim();
        return trimmed.startsWith("{") || trimmed.startsWith("[");
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Audit snapshot must be JSON serializable", exception);
        }
    }
}
