package com.canicula.crmai.opportunity;

import jakarta.validation.constraints.Size;

public record OpportunityCloseRequest(
        @Size(max = 64) String close_type,
        @Size(max = 128) String close_reason,
        String close_description) {
}
