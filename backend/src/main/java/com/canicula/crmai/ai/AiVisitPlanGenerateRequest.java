package com.canicula.crmai.ai;

import jakarta.validation.constraints.NotNull;

public record AiVisitPlanGenerateRequest(@NotNull Long opportunity_id) {
}
