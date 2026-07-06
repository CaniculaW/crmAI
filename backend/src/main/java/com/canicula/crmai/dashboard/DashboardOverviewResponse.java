package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardOverviewResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardBusinessFlowItem> business_flow,
        List<DashboardRiskSummary> risk_summary,
        List<DashboardRiskItem> top_risks) {
}
