package com.canicula.crmai.weekly;

import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WeeklyProgressController {

    private final WeeklyProgressService weeklyProgressService;

    WeeklyProgressController(WeeklyProgressService weeklyProgressService) {
        this.weeklyProgressService = weeklyProgressService;
    }

    @RequirePermission("weekly_progress.read")
    @GetMapping("/api/weekly-progress/opportunities")
    List<WeeklyProgressResponse> listByOpportunities(
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "week_start", required = false) LocalDate weekStart,
            @RequestParam(name = "week_end", required = false) LocalDate weekEnd,
            @RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "risk_only", required = false) Boolean riskOnly,
            HttpServletRequest httpRequest) {
        YearMonth parsedMonth = parseMonth(month);
        WeeklyProgressFilter filter = new WeeklyProgressFilter(
                opportunityId,
                ownerUserId,
                accountId,
                effectiveWeekStart(weekStart, parsedMonth),
                effectiveWeekEnd(weekEnd, parsedMonth),
                riskOnly);
        return weeklyProgressService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("weekly_progress.read")
    @GetMapping("/api/opportunities/{opportunityId}/weekly-progress")
    List<WeeklyProgressResponse> listByOpportunity(
            @PathVariable Long opportunityId,
            @RequestParam(name = "week_start", required = false) LocalDate weekStart,
            @RequestParam(name = "week_end", required = false) LocalDate weekEnd,
            HttpServletRequest httpRequest) {
        WeeklyProgressFilter filter = new WeeklyProgressFilter(
                opportunityId,
                null,
                null,
                weekStart,
                weekEnd,
                null);
        return weeklyProgressService.readableList(currentUserId(httpRequest), filter);
    }

    private static LocalDate effectiveWeekStart(LocalDate weekStart, YearMonth month) {
        if (weekStart != null || month == null) {
            return weekStart;
        }
        return month.atDay(1);
    }

    private static LocalDate effectiveWeekEnd(LocalDate weekEnd, YearMonth month) {
        if (weekEnd != null || month == null) {
            return weekEnd;
        }
        return month.atEndOfMonth();
    }

    private static YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return null;
        }
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("月份格式必须为YYYY-MM且月份有效", exception);
        }
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
