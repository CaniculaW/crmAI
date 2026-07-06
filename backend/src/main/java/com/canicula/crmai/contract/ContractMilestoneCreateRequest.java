package com.canicula.crmai.contract;

import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

public record ContractMilestoneCreateRequest(
        @NotBlank String milestone_name,
        @NotBlank String milestone_type,
        OffsetDateTime planned_at,
        OffsetDateTime actual_at,
        @NotBlank String status,
        String remark) {
}
