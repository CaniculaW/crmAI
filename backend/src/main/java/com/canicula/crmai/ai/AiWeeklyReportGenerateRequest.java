package com.canicula.crmai.ai;

import java.time.LocalDate;

public record AiWeeklyReportGenerateRequest(
        LocalDate week_start,
        LocalDate week_end) {
}
