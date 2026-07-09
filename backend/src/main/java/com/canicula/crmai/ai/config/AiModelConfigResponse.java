package com.canicula.crmai.ai.config;

import java.time.OffsetDateTime;

public record AiModelConfigResponse(
        Long id,
        String provider,
        String base_url,
        String model_name,
        String api_key_masked,
        boolean enabled,
        String last_test_status,
        String last_test_message,
        OffsetDateTime last_test_at,
        Long created_by,
        OffsetDateTime created_at,
        Long updated_by,
        OffsetDateTime updated_at) {
}
