package com.canicula.crmai.system;

import jakarta.validation.constraints.Size;

public record DictionaryItemUpdateRequest(
        @Size(max = 128) String item_name,
        Integer sort_order,
        Boolean is_active) {
}
