package com.canicula.crmai.invoice;

import java.time.OffsetDateTime;

public record InvoiceSignRequest(
        OffsetDateTime signed_at,
        String signed_by_name,
        String sign_note) {
}
