package com.canicula.crmai.activity;

import jakarta.validation.constraints.Size;
import java.util.List;

public record ActivityCompleteRequest(
        @Size(max = 64) String activity_result,
        String conclusion,
        String next_plan,
        String risk_description,
        List<String> risk_types) {
}
