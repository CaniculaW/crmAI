package com.canicula.crmai.ai;

import java.util.List;

public record AiVisitPlanContent(
        Long opportunity_id,
        Long account_id,
        Long owner_department_id,
        Long owner_user_id,
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
        Integer source_evidence_count) {
}
