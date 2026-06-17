package com.canicula.crmai.account;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AccountCollaboratorRequest(
        @NotNull Long user_id,
        @Size(max = 64) String collaborator_role) {
}
