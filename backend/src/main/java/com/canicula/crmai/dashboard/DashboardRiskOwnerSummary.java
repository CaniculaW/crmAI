package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardRiskOwnerSummary(
        Long owner_user_id,
        String owner_name,
        long count,
        BigDecimal amount,
        int highest_priority_score,
        String drilldown_url) {
}
