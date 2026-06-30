package com.canicula.crmai.payment;

public record PaymentExceptionRequest(
        String exception_type,
        String exception_reason,
        String exception_resolution) {
}
