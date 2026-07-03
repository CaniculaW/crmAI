package com.canicula.crmai.dashboard;

import java.math.BigDecimal;

public record DashboardForecastTrendPoint(
        String period,
        BigDecimal forecast_amount,
        BigDecimal weighted_forecast_amount,
        long count) {
}
