package com.canicula.crmai.dashboard;

import java.time.LocalDate;

public record DashboardRiskFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        Long opportunity_id,
        String risk_type,
        String risk_level,
        String object_type,
        Boolean high_priority_only) {
}
