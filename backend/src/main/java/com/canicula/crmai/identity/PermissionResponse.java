package com.canicula.crmai.identity;

public record PermissionResponse(
        Long id,
        String permission_code,
        String permission_name,
        String permission_type,
        String module_code) {
}
