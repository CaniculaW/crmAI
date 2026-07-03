package com.canicula.crmai.dashboard;

import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DashboardController {

    private final DashboardService dashboardService;

    DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @RequirePermission("dashboard.read")
    @GetMapping("/api/dashboard/overview")
    DashboardOverviewResponse overview(
            @RequestParam(name = "date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateTo,
            @RequestParam(name = "department_id", required = false) Long departmentId,
            @RequestParam(name = "owner_id", required = false) Long ownerId,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            HttpServletRequest httpRequest) {
        return dashboardService.overview(
                currentUserId(httpRequest),
                new DashboardFilter(dateFrom, dateTo, departmentId, ownerId, accountId, opportunityId));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
