package com.canicula.crmai.opportunity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record OpportunityResponse(
        Long id,
        Long account_id,
        String opportunity_name,
        String stage,
        String status,
        String level,
        String source,
        String potential_point,
        BigDecimal estimated_budget_amount,
        BigDecimal estimated_contract_amount,
        LocalDate expected_close_date,
        Long owner_department_id,
        Long owner_user_id,
        String risk_status,
        String current_progress,
        String next_plan,
        String remark,
        List<OpportunityCollaboratorResponse> collaborators,
        List<OpportunityContactRelationResponse> contact_relations) {
}
