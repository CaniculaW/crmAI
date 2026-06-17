package com.canicula.crmai.opportunity;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OpportunityListFilter(
        String keyword,
        Long account_id,
        String stage,
        String status,
        String level,
        String source,
        Long owner_user_id,
        Long owner_department_id,
        String risk_status,
        BigDecimal amount_min,
        BigDecimal amount_max,
        LocalDate expected_close_from,
        LocalDate expected_close_to,
        boolean default_following) {
}
