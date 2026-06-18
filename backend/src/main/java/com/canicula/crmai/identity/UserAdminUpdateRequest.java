package com.canicula.crmai.identity;

import jakarta.validation.constraints.Size;
import java.util.List;

public record UserAdminUpdateRequest(
        Long department_id,
        @Size(max = 128) String name,
        @Size(max = 32) String mobile,
        @Size(max = 255) String email,
        @Size(max = 64) String role_code,
        @Size(max = 32) String status,
        List<Long> role_ids) {
}
