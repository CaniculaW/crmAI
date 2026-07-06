package com.canicula.crmai.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long receivable_plan_id,
        String payment_name,
        String payment_status,
        OffsetDateTime received_at,
        BigDecimal received_amount,
        BigDecimal confirmed_amount,
        OffsetDateTime confirmed_at,
        Long confirmed_by,
        String payment_method,
        String payer_name,
        String receiving_account,
        String bank_flow_no,
        BigDecimal reconciled_amount,
        BigDecimal unreconciled_amount,
        String exception_type,
        String exception_reason,
        String exception_resolution,
        String refund_reason,
        OffsetDateTime refunded_at,
        Long refunded_by,
        Long owner_user_id,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
