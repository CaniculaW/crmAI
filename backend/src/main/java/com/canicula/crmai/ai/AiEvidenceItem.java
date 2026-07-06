package com.canicula.crmai.ai;

import java.time.OffsetDateTime;

public record AiEvidenceItem(
        String object_type,
        Long object_id,
        String title,
        String summary,
        OffsetDateTime occurred_at,
        String drilldown_url) {
}
