package com.canicula.crmai.reconciliation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReconciliationResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long invoice_id,
        Long payment_id,
        String invoice_no,
        String payment_name,
        String reconciliation_no,
        String reconciliation_status,
        BigDecimal reconciled_amount,
        OffsetDateTime reconciled_at,
        Long reconciled_by,
        String reconcile_note,
        String void_reason,
        OffsetDateTime voided_at,
        Long voided_by,
        BigDecimal invoice_amount,
        BigDecimal invoice_reconciled_amount,
        BigDecimal invoice_unreconciled_amount,
        BigDecimal payment_amount,
        BigDecimal payment_reconciled_amount,
        BigDecimal payment_unreconciled_amount,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
