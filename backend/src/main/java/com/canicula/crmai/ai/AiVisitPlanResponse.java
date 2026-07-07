package com.canicula.crmai.ai;

import java.time.OffsetDateTime;
import java.util.List;

public record AiVisitPlanResponse(
        Long id,
        String status,
        Long opportunity_id,
        Long account_id,
        String opportunity_name,
        String account_name,
        List<String> visit_objectives,
        List<String> attendees,
        List<String> agenda,
        List<String> materials,
        List<String> questions,
        List<String> expected_outcomes,
        List<String> follow_up_actions,
        List<AiEvidenceItem> evidence,
        Integer source_activity_count,
        Integer source_evidence_count,
        Long write_activity_id,
        String rejection_reason,
        OffsetDateTime created_at,
        OffsetDateTime confirmed_at,
        OffsetDateTime rejected_at) {
}
