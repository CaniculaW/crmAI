package com.canicula.crmai.invoice;

import java.time.OffsetDateTime;

public record InvoiceListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        String invoice_status,
        String invoice_type,
        Long owner_user_id,
        OffsetDateTime planned_from,
        OffsetDateTime planned_to,
        OffsetDateTime invoice_date_from,
        OffsetDateTime invoice_date_to,
        Boolean exception_only) {
}
