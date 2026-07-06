package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardInvoiceGapTrendPoint(
        String period,
        BigDecimal planned_amount,
        BigDecimal invoiced_amount,
        BigDecimal gap_amount,
        long count) {
}
