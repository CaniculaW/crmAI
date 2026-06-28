package com.canicula.crmai.solution;

import jakarta.validation.constraints.NotBlank;

public record SolutionDocumentVoidRequest(@NotBlank String void_reason) {
}
