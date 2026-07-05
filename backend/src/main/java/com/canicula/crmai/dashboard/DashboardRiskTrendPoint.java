package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardRiskTrendPoint(
        String period,
        long count,
        BigDecimal amount,
        long high_count,
        String drilldown_url) {
}
