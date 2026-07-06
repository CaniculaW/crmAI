package com.canicula.crmai.contract;

import java.time.OffsetDateTime;

public record ContractMilestoneUpdateRequest(
        String milestone_name,
        String milestone_type,
        OffsetDateTime planned_at,
        OffsetDateTime actual_at,
        String status,
        String remark) {
}
