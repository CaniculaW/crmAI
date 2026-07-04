package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardReceivableResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardReceivableStatusItem> status_distribution,
        List<DashboardReceivableGapTrendPoint> gap_trend,
        List<DashboardReconciliationSummary> reconciliation_summary,
        List<DashboardAttentionReceivable> attention_receivables) {
}
