package com.canicula.crmai.dashboard;

import java.time.LocalDate;

public record DashboardFunnelFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        String risk_status) {
}
