package com.canicula.crmai.activity;

import java.time.OffsetDateTime;

public record ActivityListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long owner_user_id,
        Long participant_user_id,
        String activity_type,
        String activity_status,
        String activity_result,
        String risk_type,
        OffsetDateTime activity_from,
        OffsetDateTime activity_to,
        Boolean overdue,
        Boolean include_in_weekly_progress) {
}
