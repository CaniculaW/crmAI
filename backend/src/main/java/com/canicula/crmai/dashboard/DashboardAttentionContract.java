package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardAttentionContract(
        Long contract_id,
        String contract_name,
        Long account_id,
        Long opportunity_id,
        Long owner_user_id,
        String contract_status,
        String risk_level,
        BigDecimal contract_amount,
        String next_milestone_name,
        OffsetDateTime next_milestone_planned_at,
        String reason,
        String drilldown_url) {
}
