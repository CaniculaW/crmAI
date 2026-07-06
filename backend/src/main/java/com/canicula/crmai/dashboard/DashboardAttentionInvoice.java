package com.canicula.crmai.dashboard;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DashboardAttentionInvoice(
        Long invoice_id,
        String plan_name,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long owner_user_id,
        String invoice_status,
        BigDecimal planned_amount,
        BigDecimal actual_amount,
        OffsetDateTime planned_invoice_date,
        OffsetDateTime invoice_date,
        String reason,
        String drilldown_url) {
}
