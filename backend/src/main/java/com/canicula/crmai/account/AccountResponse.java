package com.canicula.crmai.account;

import java.time.OffsetDateTime;
import java.util.List;

public record AccountResponse(
        Long id,
        Long parent_id,
        String account_name,
        String account_short_name,
        String account_type,
        String account_level,
        String account_status,
        String account_source,
        String industry,
        String region_province,
        String region_city,
        String address,
        String relationship_status,
        Long owner_department_id,
        Long owner_user_id,
        String background,
        String key_needs,
        OffsetDateTime last_activity_at,
        String last_activity_summary,
        OffsetDateTime next_follow_up_at,
        String remark,
        List<AccountCollaboratorResponse> collaborators) {
}
