package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record DashboardAttentionOpportunity(
        Long opportunity_id,
        String opportunity_name,
        Long account_id,
        Long owner_user_id,
        String stage,
        String risk_status,
        BigDecimal amount,
        LocalDate expected_close_date,
        OffsetDateTime last_activity_at,
        String reason,
        String drilldown_url) {
}
