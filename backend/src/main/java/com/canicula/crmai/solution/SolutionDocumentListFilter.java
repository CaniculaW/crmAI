package com.canicula.crmai.solution;

public record SolutionDocumentListFilter(
        String keyword,
        Long account_id,
        Long opportunity_id,
        String document_type,
        String status,
        String bid_self_check_result,
        Long owner_user_id) {
}
