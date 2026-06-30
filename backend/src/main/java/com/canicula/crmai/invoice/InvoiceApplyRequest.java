package com.canicula.crmai.invoice;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InvoiceApplyRequest(
        BigDecimal applied_amount,
        OffsetDateTime applied_at,
        String application_note) {
}
