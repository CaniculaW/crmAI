package com.canicula.crmai.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Types;
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

    private SqlParameterValue jsonParameter(Object value) {
        return new SqlParameterValue(Types.OTHER, toJson(value));
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
