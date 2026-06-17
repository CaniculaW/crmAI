package com.canicula.crmai.weekly;

import java.time.OffsetDateTime;

public record WeeklyProgressItemResponse(
        Long activity_id,
        String subject,
        OffsetDateTime activity_time,
        String conclusion,
        String next_plan,
        String risk_description,
        String activity_result) {
}
