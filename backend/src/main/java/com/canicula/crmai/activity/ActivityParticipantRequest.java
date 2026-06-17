package com.canicula.crmai.activity;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ActivityParticipantRequest(
        @NotNull Long user_id,
        @Size(max = 64) String participant_role) {
}
