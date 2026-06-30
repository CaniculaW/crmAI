package com.canicula.crmai.receivable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReceivablePlanCreateRequest(
        Long contract_id,
        String plan_name,
        String plan_stage,
        OffsetDateTime planned_receivable_date,
        BigDecimal planned_amount,
        Long owner_user_id,
        String payment_terms_snapshot,
        String remark) {
}
