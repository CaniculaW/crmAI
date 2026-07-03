package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardContractResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardContractStatusItem> status_distribution,
        List<DashboardContractMilestoneSummary> milestone_summary,
        List<DashboardContractChangeTrendPoint> change_trend,
        List<DashboardAttentionContract> attention_contracts) {
}
