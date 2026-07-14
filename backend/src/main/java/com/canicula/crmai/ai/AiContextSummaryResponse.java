package com.canicula.crmai.ai;

import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.dashboard.DashboardRiskItem;
import com.canicula.crmai.opportunity.OpportunityResponse;
import java.util.List;

public record AiContextSummaryResponse(
        String generation_mode,
        String generation_notice,
        List<AccountResponse> accounts,
        List<OpportunityResponse> opportunities,
        List<ActivityResponse> recent_activities,
        List<DashboardRiskItem> risk_signals,
        List<AiEvidenceItem> evidence) {
}
