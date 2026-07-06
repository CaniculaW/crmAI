package com.canicula.crmai.contract;

import java.time.OffsetDateTime;

public record ContractChangeResponse(
        Long id,
        Long contract_id,
        String change_type,
        String before_value,
        String after_value,
        String change_reason,
        Long changed_by,
        OffsetDateTime changed_at) {
}
