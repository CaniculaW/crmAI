package com.canicula.crmai.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentConfirmRequest(
        BigDecimal confirmed_amount,
        OffsetDateTime confirmed_at,
        String confirm_note) {
}
