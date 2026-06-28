package com.canicula.crmai.solution;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SolutionDocumentResponse(
        Long id,
        Long tenant_id,
        Long account_id,
        Long opportunity_id,
        String document_name,
        String document_type,
        String version_no,
        String status,
        Long owner_user_id,
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
        String void_reason,
        OffsetDateTime voided_at,
        Long voided_by,
        String remark) {
}
