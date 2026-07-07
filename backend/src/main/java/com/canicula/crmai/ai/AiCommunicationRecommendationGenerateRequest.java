package com.canicula.crmai.ai;

import jakarta.validation.constraints.NotNull;

public record AiCommunicationRecommendationGenerateRequest(
        @NotNull Long contact_id,
        @NotNull Long opportunity_id) {
}
