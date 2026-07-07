package com.canicula.crmai.ai;

import java.time.OffsetDateTime;
import java.util.List;

public record AiCommunicationRecommendationResponse(
        Long id,
        String status,
        Long opportunity_id,
        Long account_id,
        Long contact_id,
        String opportunity_name,
        String account_name,
        String contact_name,
        String contact_title,
        List<String> recommended_channels,
        List<String> tone,
        List<String> key_messages,
        List<String> timing,
        List<String> escalation_path,
        List<String> do_not_say,
        String opening_message,
        List<AiEvidenceItem> evidence,
        Integer source_activity_count,
        Integer source_evidence_count,
        Long write_activity_id,
        String rejection_reason,
        OffsetDateTime created_at,
        OffsetDateTime confirmed_at,
        OffsetDateTime rejected_at) {
}
