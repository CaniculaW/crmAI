package com.canicula.crmai.identity;

public record DepartmentAdminResponse(
        Long id,
        Long parent_id,
        String code,
        String name,
        String region_code,
        String status) {
}
