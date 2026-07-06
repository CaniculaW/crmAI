package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardInvoiceRiskSummary(
        String key,
        String label,
        long count,
        BigDecimal amount,
        String level,
        String drilldown_url) {
}
