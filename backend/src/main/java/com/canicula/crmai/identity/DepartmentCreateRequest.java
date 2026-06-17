package com.canicula.crmai.identity;

public record DepartmentCreateRequest(
        Long parentId,
        String code,
        String name,
        String regionCode,
        String status) {
}
