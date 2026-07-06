package com.canicula.crmai.dashboard;

import java.time.LocalDate;

public record DashboardFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        Long opportunity_id) {
}
