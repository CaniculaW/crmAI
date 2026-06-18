package com.canicula.crmai.identity;

import com.canicula.crmai.auth.RoleSummary;
import java.time.OffsetDateTime;
import java.util.List;

public record UserAdminResponse(
        Long id,
        Long department_id,
        String name,
        String mobile,
        String email,
        String role_code,
        String status,
        OffsetDateTime last_login_at,
        List<RoleSummary> roles) {
}
