package com.canicula.crmai.identity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UserAdminCreateRequest(
        @NotNull Long department_id,
        @NotBlank @Size(max = 128) String name,
        @Size(max = 32) String mobile,
        @Size(max = 255) String email,
        @Size(max = 64) String role_code,
        @Size(max = 32) String status,
        @NotBlank @Size(max = 255) String login_username,
        @NotBlank @Size(min = 8, max = 128) String initial_password,
        List<Long> role_ids) {
}
