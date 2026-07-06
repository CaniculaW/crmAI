package com.canicula.crmai.ai;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record AiDraftResponse(
        Long id,
        Long input_record_id,
        String draft_type,
        String status,
        String target_action,
        String source_text,
        Map<String, Object> payload,
        List<String> missing_fields,
        List<String> conflicts,
        String confidence_status,
        String write_object_type,
        Long write_object_id,
        String rejection_reason,
        OffsetDateTime created_at,
        OffsetDateTime confirmed_at,
        OffsetDateTime rejected_at) {
}
