package com.canicula.crmai.audit;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;

public record AuditLogResponse(
        Long id,
        Long actor_user_id,
        String module_code,
        String action_code,
        String object_type,
        Long object_id,
        JsonNode before_data,
        JsonNode after_data,
        String result,
        String failure_reason,
        String ip_address,
        String user_agent,
        String trace_id,
        OffsetDateTime occurred_at) {
}
