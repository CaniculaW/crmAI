package com.canicula.crmai.auth;

import java.util.List;

public record CurrentUserResponse(
        Long id,
        String name,
        String email,
        List<RoleSummary> roles,
        List<String> permissions) {
}
