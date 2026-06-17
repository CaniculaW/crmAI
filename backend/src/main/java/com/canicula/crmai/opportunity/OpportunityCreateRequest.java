package com.canicula.crmai.opportunity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record OpportunityCreateRequest(
        @NotNull Long account_id,
        @NotBlank @Size(max = 255) String opportunity_name,
        @NotBlank @Size(max = 64) String stage,
        @NotBlank @Size(max = 64) String status,
        @Size(max = 32) String level,
        @Size(max = 64) String source,
        String potential_point,
        BigDecimal estimated_budget_amount,
        BigDecimal estimated_contract_amount,
        LocalDate expected_close_date,
        @NotNull Long owner_department_id,
        @NotNull Long owner_user_id,
        @Size(max = 32) String risk_status,
        String current_progress,
        String next_plan,
        @Size(max = 512) String remark,
        List<OpportunityCollaboratorRequest> collaborators,
        List<OpportunityContactRelationRequest> contact_relations) {
}
