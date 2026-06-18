package com.canicula.crmai.identity;

public record RolePermissionChange(
        RoleAdminResponse before,
        RoleAdminResponse after) {
}
