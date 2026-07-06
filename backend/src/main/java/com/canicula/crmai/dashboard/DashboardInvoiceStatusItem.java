package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardInvoiceStatusItem(
        String status,
        String label,
        long count,
        BigDecimal planned_amount,
        BigDecimal actual_amount,
        String drilldown_url) {
}
