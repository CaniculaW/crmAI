package com.canicula.crmai.reconciliation;

public record ReconciliationWorkbenchFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Boolean pending_only) {
}
