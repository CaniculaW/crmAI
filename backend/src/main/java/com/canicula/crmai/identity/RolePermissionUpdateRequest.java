package com.canicula.crmai.identity;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RolePermissionUpdateRequest(
        @NotNull List<String> permission_codes) {
}
