package com.canicula.crmai.invoice;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InvoiceIssueRequest(
        String invoice_code,
        String invoice_no,
        OffsetDateTime invoice_date,
        BigDecimal tax_rate,
        BigDecimal actual_invoice_amount) {
}
