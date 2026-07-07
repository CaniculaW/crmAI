package com.canicula.crmai.ai;

import java.time.OffsetDateTime;
import java.util.List;

public record AiOpportunityAnalysisResponse(
        Long id,
        String status,
        Long opportunity_id,
        Long account_id,
        String opportunity_name,
        String account_name,
        List<String> stage_health,
        List<String> relationship_gaps,
        List<String> risks,
        List<String> blockers,
        List<String> win_factors,
        List<String> next_actions,
        List<AiEvidenceItem> evidence,
        Integer source_activity_count,
        Integer source_evidence_count,
        Long write_activity_id,
        String rejection_reason,
        OffsetDateTime created_at,
        OffsetDateTime confirmed_at,
        OffsetDateTime rejected_at) {
}
