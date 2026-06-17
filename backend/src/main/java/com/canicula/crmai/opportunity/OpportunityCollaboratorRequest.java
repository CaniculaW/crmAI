package com.canicula.crmai.opportunity;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OpportunityCollaboratorRequest(
        @NotNull Long user_id,
        @Size(max = 64) String collaborator_role) {
}
