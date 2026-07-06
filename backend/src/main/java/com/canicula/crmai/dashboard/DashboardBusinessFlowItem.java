package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardBusinessFlowItem(
        String key,
        String label,
        BigDecimal amount,
        long count,
        long risk_count,
        String drilldown_url) {
}
