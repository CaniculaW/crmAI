package com.canicula.crmai.auth;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
        @NotBlank String old_password,
        @NotBlank String new_password) {
}
