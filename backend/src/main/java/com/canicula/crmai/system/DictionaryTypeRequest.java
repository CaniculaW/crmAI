package com.canicula.crmai.system;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DictionaryTypeRequest(
        @NotBlank @Size(max = 64) String dict_code,
        @NotBlank @Size(max = 128) String dict_name,
        @Size(max = 512) String description) {
}
