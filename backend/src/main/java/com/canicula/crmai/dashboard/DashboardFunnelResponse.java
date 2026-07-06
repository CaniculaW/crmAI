package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardFunnelResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardFunnelStage> stages,
        List<DashboardForecastTrendPoint> forecast_trend,
        List<DashboardAttentionOpportunity> attention_opportunities) {
}
