package com.canicula.crmai.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentCreateRequest(
        Long contract_id,
        Long receivable_plan_id,
        String payment_name,
        OffsetDateTime received_at,
        BigDecimal received_amount,
        String payment_method,
        String payer_name,
        String receiving_account,
        String bank_flow_no,
        Long owner_user_id,
        String remark) {
}
