package com.canicula.crmai.contract;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ContractResponse(
        Long id,
        Long tenant_id,
        Long account_id,
        Long opportunity_id,
        String contract_name,
        String contract_no,
        String contract_type,
        String contract_status,
        BigDecimal contract_amount,
        BigDecimal tax_rate,
        BigDecimal net_amount,
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
        String termination_reason,
        OffsetDateTime terminated_at,
        Long terminated_by,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
