package com.canicula.crmai.dashboard;

public record DashboardContractMilestoneSummary(
        String key,
        String label,
        long count,
        String drilldown_url) {
}
