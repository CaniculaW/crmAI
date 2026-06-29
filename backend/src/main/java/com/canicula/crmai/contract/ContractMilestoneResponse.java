package com.canicula.crmai.contract;

import java.time.OffsetDateTime;

public record ContractMilestoneResponse(
        Long id,
        Long contract_id,
        String milestone_name,
        String milestone_type,
        OffsetDateTime planned_at,
        OffsetDateTime actual_at,
        String status,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
