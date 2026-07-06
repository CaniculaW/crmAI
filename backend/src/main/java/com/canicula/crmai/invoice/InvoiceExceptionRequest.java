package com.canicula.crmai.invoice;

public record InvoiceExceptionRequest(
        String exception_type,
        String exception_reason,
        String exception_resolution) {
}
