package com.canicula.crmai.identity;

public record RoleCreateRequest(
        String code,
        String name,
        String description) {
}
