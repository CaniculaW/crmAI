package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardMetricCard(
        String key,
        String label,
        BigDecimal value,
        String unit,
        String drilldown_url) {
}
