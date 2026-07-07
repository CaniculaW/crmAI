package com.canicula.crmai.ai;

import java.util.List;

public record AiWeeklyPersonalSummary(
        String headline,
        List<String> highlights,
        List<String> risks,
        List<String> next_week_plan) {
}
