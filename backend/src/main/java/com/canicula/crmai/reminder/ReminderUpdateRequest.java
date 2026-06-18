package com.canicula.crmai.reminder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReminderUpdateRequest(
        @NotBlank @Size(max = 32) String status) {
}
