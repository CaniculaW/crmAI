package com.canicula.crmai.payment;

import java.time.OffsetDateTime;

public record PaymentListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long receivable_plan_id,
        String payment_status,
        String payment_method,
        Long owner_user_id,
        OffsetDateTime received_from,
        OffsetDateTime received_to,
        Boolean exception_only) {
}
