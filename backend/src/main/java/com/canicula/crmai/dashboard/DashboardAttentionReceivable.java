package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardAttentionReceivable(
        String object_type,
        Long object_id,
        String title,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long owner_user_id,
        String status,
        BigDecimal amount,
        OffsetDateTime planned_at,
        OffsetDateTime occurred_at,
        String reason,
        String drilldown_url) {
}
