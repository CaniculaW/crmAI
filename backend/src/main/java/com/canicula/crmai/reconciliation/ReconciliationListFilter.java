package com.canicula.crmai.reconciliation;

public record ReconciliationListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long invoice_id,
        Long payment_id,
        String reconciliation_status,
        Boolean active_only) {
}
