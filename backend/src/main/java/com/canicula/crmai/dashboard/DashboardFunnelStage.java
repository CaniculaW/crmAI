package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardFunnelStage(
        String key,
        String label,
        long count,
        BigDecimal amount,
        BigDecimal weighted_amount,
        BigDecimal conversion_rate,
        String drilldown_url) {
}
