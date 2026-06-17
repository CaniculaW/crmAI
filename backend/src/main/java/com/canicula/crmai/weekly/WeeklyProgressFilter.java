package com.canicula.crmai.weekly;

import java.time.LocalDate;

public record WeeklyProgressFilter(
        Long opportunity_id,
        Long owner_user_id,
        Long account_id,
        LocalDate week_start,
        LocalDate week_end,
        Boolean risk_only) {
}
