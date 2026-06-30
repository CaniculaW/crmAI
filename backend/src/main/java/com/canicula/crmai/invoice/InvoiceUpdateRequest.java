package com.canicula.crmai.invoice;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InvoiceUpdateRequest(
        String plan_name,
        OffsetDateTime planned_invoice_date,
        BigDecimal planned_amount,
        String invoice_type,
        BigDecimal tax_rate,
        Long owner_user_id,
        String remark) {
}
