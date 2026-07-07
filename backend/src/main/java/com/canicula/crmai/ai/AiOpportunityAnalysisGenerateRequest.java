package com.canicula.crmai.ai;

import jakarta.validation.constraints.NotNull;

public record AiOpportunityAnalysisGenerateRequest(@NotNull Long opportunity_id) {
}
