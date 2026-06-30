package com.canicula.crmai.receivable;

import java.time.OffsetDateTime;

public record ReceivablePlanListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String receivable_status,
        String plan_stage,
        Long owner_user_id,
        OffsetDateTime planned_from,
        OffsetDateTime planned_to,
        Boolean overdue_only) {
}
