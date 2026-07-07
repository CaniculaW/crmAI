package com.canicula.crmai.ai;

import java.util.List;

public record AiOpportunityAnalysisContent(
        Long opportunity_id,
        Long account_id,
        Long owner_department_id,
        Long owner_user_id,
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
        Integer source_evidence_count) {
}
