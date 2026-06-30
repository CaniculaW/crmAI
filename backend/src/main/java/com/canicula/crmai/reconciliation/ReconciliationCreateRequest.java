package com.canicula.crmai.reconciliation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReconciliationCreateRequest(
        Long invoice_id,
        Long payment_id,
        BigDecimal reconciled_amount,
        OffsetDateTime reconciled_at,
        String reconcile_note) {
}
