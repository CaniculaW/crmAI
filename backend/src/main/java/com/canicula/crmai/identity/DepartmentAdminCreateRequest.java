package com.canicula.crmai.identity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentAdminCreateRequest(
        Long parent_id,
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 128) String name,
        @Size(max = 64) String region_code,
        @Size(max = 32) String status) {
}
