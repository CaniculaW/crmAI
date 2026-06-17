package com.canicula.crmai.identity;

public record UserCreateRequest(
        Long departmentId,
        String name,
        String mobile,
        String email,
        String roleCode,
        String status) {
}
