package com.canicula.crmai.system;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DictionaryItemRequest(
        @NotBlank @Size(max = 64) String item_code,
        @NotBlank @Size(max = 128) String item_name,
        Integer sort_order) {
}
