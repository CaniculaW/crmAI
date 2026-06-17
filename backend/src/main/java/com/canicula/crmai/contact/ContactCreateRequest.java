package com.canicula.crmai.contact;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record ContactCreateRequest(
        @NotNull Long account_id,
        @NotBlank @Size(max = 128) String name,
        @Size(max = 128) String department,
        @Size(max = 128) String title,
        @Size(max = 64) String mobile,
        @Size(max = 128) String email,
        @Size(max = 128) String wechat,
        @Size(max = 64) String contact_type,
        @Size(max = 64) String decision_influence,
        @Size(max = 64) String attitude,
        @Size(max = 64) String relationship_heat,
        @Size(max = 64) String importance_level,
        LocalDate birthday,
        LocalDate anniversary,
        @Size(max = 512) String last_communication_summary,
        @Size(max = 512) String next_action,
        @Size(max = 512) String remark,
        List<@Size(max = 64) String> project_roles) {
}
