package com.canicula.crmai.contact;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record ContactResponse(
        Long id,
        Long account_id,
        String name,
        String department,
        String title,
        String mobile,
        String email,
        String wechat,
        String contact_type,
        String decision_influence,
        String attitude,
        String relationship_heat,
        String importance_level,
        LocalDate birthday,
        LocalDate anniversary,
        OffsetDateTime last_communication_at,
        String last_communication_summary,
        String next_action,
        Long owner_department_id,
        Long owner_user_id,
        String remark,
        List<String> project_roles) {
}
