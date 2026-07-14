package com.canicula.crmai.contract;

import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ContractUpdateRequest(
        String contract_name,
        String contract_no,
        String contract_type,
        String contract_status,
        @Positive BigDecimal contract_amount,
        BigDecimal tax_rate,
        String our_signing_entity,
        String customer_signing_entity,
        Long owner_user_id,
        Long business_owner_id,
        OffsetDateTime signed_at,
        OffsetDateTime effective_at,
        OffsetDateTime ended_at,
        String payment_terms,
        String invoice_terms,
        String delivery_scope,
        String acceptance_criteria,
        String risk_level,
        String risk_description,
        String remark,
        String change_reason) {
}
