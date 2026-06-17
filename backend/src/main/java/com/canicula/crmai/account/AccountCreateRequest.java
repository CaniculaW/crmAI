package com.canicula.crmai.account;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AccountCreateRequest(
        Long parent_id,
        @NotBlank @Size(max = 255) String account_name,
        @Size(max = 128) String account_short_name,
        @NotBlank @Size(max = 64) String account_type,
        @Size(max = 32) String account_level,
        @NotBlank @Size(max = 32) String account_status,
        @Size(max = 64) String account_source,
        @Size(max = 128) String industry,
        @Size(max = 64) String region_province,
        @Size(max = 64) String region_city,
        @Size(max = 255) String address,
        @Size(max = 64) String relationship_status,
        @NotNull Long owner_department_id,
        @NotNull Long owner_user_id,
        String background,
        String key_needs,
        @Size(max = 512) String remark,
        @Valid List<AccountCollaboratorRequest> collaborators) {
}
