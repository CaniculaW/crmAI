package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardReceivableGapTrendPoint(
        String period,
        BigDecimal planned_amount,
        BigDecimal received_amount,
        BigDecimal gap_amount,
        long receivable_count) {
}
