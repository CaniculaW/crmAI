package com.canicula.crmai.system;

public record DictionaryItemResponse(
        Long id,
        String item_code,
        String item_name,
        Integer sort_order,
        Boolean is_active) {
}
