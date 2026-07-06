package com.canicula.crmai.ai;

import jakarta.validation.constraints.Size;

public record AiDraftRejectRequest(@Size(max = 512) String reason) {
}
