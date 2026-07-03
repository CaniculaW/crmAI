package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardRiskSummary(
        String risk_type,
        String label,
        long count,
        BigDecimal amount,
        String highest_level,
        String drilldown_url) {
}
