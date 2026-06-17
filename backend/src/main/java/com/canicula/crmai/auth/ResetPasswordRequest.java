package com.canicula.crmai.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ResetPasswordRequest(
        @NotNull Long user_id,
        @NotBlank String new_password) {
}
