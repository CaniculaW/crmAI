package com.canicula.crmai.account;

public record AccountListFilter(
        String keyword,
        String account_type,
        String account_level,
        String account_status,
        String account_source,
        String industry,
        String region_province,
        String region_city,
        Long owner_department_id,
        Long owner_user_id) {
}
