package com.canicula.crmai.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardInvoiceResponse(
        Map<String, Object> filters,
        List<DashboardMetricCard> metric_cards,
        List<DashboardInvoiceStatusItem> status_distribution,
        List<DashboardInvoiceGapTrendPoint> gap_trend,
        List<DashboardInvoiceRiskSummary> risk_summary,
        List<DashboardAttentionInvoice> attention_invoices) {
}
