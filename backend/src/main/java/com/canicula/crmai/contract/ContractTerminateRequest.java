package com.canicula.crmai.contract;

import jakarta.validation.constraints.NotBlank;

public record ContractTerminateRequest(@NotBlank String termination_reason) {
}
