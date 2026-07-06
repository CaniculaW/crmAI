package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardReceivableStatusItem(
        String status,
        String label,
        long count,
        BigDecimal planned_amount,
        BigDecimal received_amount,
        BigDecimal unreceived_amount,
        String drilldown_url) {
}
