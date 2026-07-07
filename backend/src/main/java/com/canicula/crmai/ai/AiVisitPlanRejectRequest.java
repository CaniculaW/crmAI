package com.canicula.crmai.ai;

import jakarta.validation.constraints.Size;

public record AiVisitPlanRejectRequest(@Size(max = 512) String reason) {
}
