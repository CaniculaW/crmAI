package com.canicula.crmai.weekly;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record WeeklyProgressResponse(
        Long opportunity_id,
        Long account_id,
        Long owner_user_id,
        LocalDate week_start_date,
        LocalDate week_end_date,
        Long activity_count,
        OffsetDateTime latest_activity_at,
        List<WeeklyProgressItemResponse> progress_items) {
}
