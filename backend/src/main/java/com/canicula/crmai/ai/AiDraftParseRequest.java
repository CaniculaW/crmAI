package com.canicula.crmai.ai;

import jakarta.validation.constraints.NotBlank;

public record AiDraftParseRequest(@NotBlank String source_text) {
}
