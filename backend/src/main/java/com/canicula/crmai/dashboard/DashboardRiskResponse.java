package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardRiskResponse(
        Map<String, Object> filters,
        List<DashboardRiskMetricCard> metric_cards,
        List<DashboardRiskSummary> risk_summary,
        List<DashboardRiskTrendPoint> risk_trend,
        List<DashboardRiskOwnerSummary> owner_ranking,
        List<DashboardRiskWorkItem> risk_items) {
}
