package com.canicula.crmai.contact;

import java.time.OffsetDateTime;

public record ContactListFilter(
        String keyword,
        Long account_id,
        String contact_type,
        String attitude,
        String relationship_heat,
        String importance_level,
        String project_role,
        OffsetDateTime last_communication_from,
        OffsetDateTime last_communication_to) {
}
