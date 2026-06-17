package com.canicula.crmai.account;

import jakarta.validation.constraints.Size;

public record AccountUpdateRequest(
        @Size(max = 32) String account_level,
        @Size(max = 32) String account_status,
        @Size(max = 512) String remark) {
}
