package com.canicula.crmai.receivable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReceivablePlanResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String plan_name,
        String plan_stage,
        String receivable_status,
        OffsetDateTime planned_receivable_date,
        BigDecimal planned_amount,
        Long owner_user_id,
        String payment_terms_snapshot,
        String overdue_reason,
        String termination_reason,
        OffsetDateTime terminated_at,
        Long terminated_by,
        BigDecimal contract_amount,
        BigDecimal effective_invoiced_amount,
        BigDecimal confirmed_received_amount,
        BigDecimal unreceived_amount,
        BigDecimal unreconciled_payment_amount,
        Integer overdue_days,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
