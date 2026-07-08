package com.canicula.crmai.ai;

import java.time.OffsetDateTime;

public record AiLogResponse(
        Long id,
        String event_type,
        String ai_module,
        String operation,
        String status,
        String source_type,
        Long source_id,
        String object_type,
        Long object_id,
        String title,
        String summary,
        String business_url,
        String error_message,
        Long actor_user_id,
        String trace_id,
        OffsetDateTime occurred_at) {
}
