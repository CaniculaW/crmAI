package com.canicula.crmai.opportunity;

public record OpportunityContactRelationResponse(
        Long contact_id,
        String role_in_opportunity,
        boolean is_key_person) {
}
