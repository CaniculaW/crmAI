package com.canicula.crmai.ai;

import java.util.List;

public record AiWeeklyReportContent(
        AiWeeklyPersonalSummary personal_summary,
        List<AiOpportunityWeeklyProgress> opportunity_progress,
        List<AiEvidenceItem> evidence,
        Integer source_activity_count) {
}
