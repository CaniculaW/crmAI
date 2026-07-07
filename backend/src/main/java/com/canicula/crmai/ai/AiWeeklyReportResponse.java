package com.canicula.crmai.ai;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record AiWeeklyReportResponse(
        Long id,
        String status,
        LocalDate week_start_date,
        LocalDate week_end_date,
        AiWeeklyPersonalSummary personal_summary,
        List<AiOpportunityWeeklyProgress> opportunity_progress,
        List<AiEvidenceItem> evidence,
        Integer source_activity_count,
        List<Long> write_activity_ids,
        String rejection_reason,
        OffsetDateTime created_at,
        OffsetDateTime confirmed_at,
        OffsetDateTime rejected_at) {
}
