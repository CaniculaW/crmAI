package com.canicula.crmai.invoice;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InvoiceCreateRequest(
        Long contract_id,
        String plan_name,
        OffsetDateTime planned_invoice_date,
        BigDecimal planned_amount,
        String invoice_type,
        BigDecimal tax_rate,
        Long owner_user_id,
        String invoice_terms_snapshot,
        String remark) {
}
