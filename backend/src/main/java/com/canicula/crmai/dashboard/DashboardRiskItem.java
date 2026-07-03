package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardRiskItem(
        String risk_type,
        String risk_level,
        String title,
        BigDecimal amount,
        String object_type,
        Long object_id,
        Long owner_user_id,
        Long account_id,
        Long opportunity_id,
        OffsetDateTime occurred_at,
        String drilldown_url) {
}
