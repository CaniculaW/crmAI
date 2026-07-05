package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardRiskWorkItem(
        String risk_type,
        String risk_label,
        String risk_level,
        String title,
        BigDecimal amount,
        String object_type,
        Long object_id,
        Long owner_user_id,
        String owner_name,
        Long account_id,
        String account_name,
        Long opportunity_id,
        int priority_score,
        String suggested_action,
        OffsetDateTime occurred_at,
        String drilldown_url) {
}
