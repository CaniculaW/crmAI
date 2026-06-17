package com.canicula.crmai.opportunity;

import jakarta.validation.constraints.Size;

public record OpportunityReopenRequest(
        @Size(max = 512) String reopen_reason) {
}
