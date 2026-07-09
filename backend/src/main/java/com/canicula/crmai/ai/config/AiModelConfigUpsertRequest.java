package com.canicula.crmai.ai.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiModelConfigUpsertRequest(
        @NotBlank @Size(max = 64) String provider,
        @NotBlank @Size(max = 512) String base_url,
        @NotBlank @Size(max = 128) String model_name,
        @Size(max = 2048) String api_key,
        Boolean enabled) {
}
