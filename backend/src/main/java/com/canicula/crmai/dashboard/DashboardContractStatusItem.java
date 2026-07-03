package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardContractStatusItem(
        String status,
        String label,
        long count,
        BigDecimal amount,
        String drilldown_url) {
}
