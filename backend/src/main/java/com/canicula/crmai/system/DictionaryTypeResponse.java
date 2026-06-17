package com.canicula.crmai.system;

import java.util.List;

public record DictionaryTypeResponse(
        Long id,
        String dict_code,
        String dict_name,
        String description,
        Boolean is_active,
        List<DictionaryItemResponse> items) {
}
