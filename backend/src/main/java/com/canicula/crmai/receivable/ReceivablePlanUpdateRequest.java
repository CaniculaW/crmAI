package com.canicula.crmai.receivable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReceivablePlanUpdateRequest(
        String plan_name,
        String plan_stage,
        OffsetDateTime planned_receivable_date,
        BigDecimal planned_amount,
        Long owner_user_id,
        String overdue_reason,
        String remark) {
}
