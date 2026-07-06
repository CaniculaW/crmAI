package com.canicula.crmai.contract;

public record ContractListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        String contract_type,
        String contract_status,
        String risk_level,
        Long owner_user_id,
        Long business_owner_id) {
}
