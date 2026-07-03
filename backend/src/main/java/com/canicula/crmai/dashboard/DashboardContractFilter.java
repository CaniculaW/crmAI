package com.canicula.crmai.dashboard;

import java.time.LocalDate;

public record DashboardContractFilter(
        LocalDate date_from,
        LocalDate date_to,
        Long department_id,
        Long owner_id,
        Long account_id,
        Long opportunity_id,
        String contract_status,
        String risk_level) {
}
