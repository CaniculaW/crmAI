package com.canicula.crmai.ai;

import java.util.List;

public record AiOpportunityWeeklyProgress(
        Long opportunity_id,
        Long account_id,
        Long owner_department_id,
        Long owner_user_id,
        String opportunity_name,
        String account_name,
        Long activity_count,
        String summary,
        String risk_summary,
        String next_week_plan,
        List<AiEvidenceItem> evidence) {
}
