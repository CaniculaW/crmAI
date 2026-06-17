package com.canicula.crmai.opportunity;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OpportunityContactRelationRequest(
        @NotNull Long contact_id,
        @Size(max = 64) String role_in_opportunity,
        Boolean is_key_person) {
}
