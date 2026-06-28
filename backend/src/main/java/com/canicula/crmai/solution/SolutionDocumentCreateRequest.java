package com.canicula.crmai.solution;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SolutionDocumentCreateRequest(
        @NotNull Long account_id,
        @NotNull Long opportunity_id,
        @NotBlank String document_name,
        @NotBlank String document_type,
        @NotBlank String version_no,
        @NotBlank String status,
        @NotNull Long owner_user_id,
        String customer_requirement_summary,
        String technical_solution_summary,
        String stakeholder_strategy,
        BigDecimal quotation_amount,
        BigDecimal cost_amount,
        BigDecimal estimated_gross_margin_rate,
        String bid_self_check_result,
        String bid_risk_description,
        OffsetDateTime submitted_to_customer_at,
        String customer_feedback,
        String remark) {
}
