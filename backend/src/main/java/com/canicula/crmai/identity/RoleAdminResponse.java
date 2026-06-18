package com.canicula.crmai.identity;

import java.util.List;

public record RoleAdminResponse(
        Long id,
        String code,
        String name,
        String description,
        List<String> permission_codes) {
}
