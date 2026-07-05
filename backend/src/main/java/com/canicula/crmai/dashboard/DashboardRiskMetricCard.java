package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardRiskMetricCard(
        String key,
        String label,
        BigDecimal value,
        String unit,
        String drilldown_url) {
}
