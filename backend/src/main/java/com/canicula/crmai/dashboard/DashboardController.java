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

    @RequirePermission("dashboard.funnel.read")
    @GetMapping("/api/dashboard/funnel")
    DashboardFunnelResponse funnel(
            @RequestParam(name = "date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateTo,
            @RequestParam(name = "department_id", required = false) Long departmentId,
            @RequestParam(name = "owner_id", required = false) Long ownerId,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "risk_status", required = false) String riskStatus,
            HttpServletRequest httpRequest) {
        return dashboardService.funnel(
                currentUserId(httpRequest),
                new DashboardFunnelFilter(dateFrom, dateTo, departmentId, ownerId, accountId, riskStatus));
    }

    @RequirePermission("dashboard.contracts.read")
    @GetMapping("/api/dashboard/contracts")
    DashboardContractResponse contracts(
            @RequestParam(name = "date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateTo,
            @RequestParam(name = "department_id", required = false) Long departmentId,
            @RequestParam(name = "owner_id", required = false) Long ownerId,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contract_status", required = false) String contractStatus,
            @RequestParam(name = "risk_level", required = false) String riskLevel,
            HttpServletRequest httpRequest) {
        return dashboardService.contracts(
                currentUserId(httpRequest),
                new DashboardContractFilter(
                        dateFrom,
                        dateTo,
                        departmentId,
                        ownerId,
                        accountId,
                        opportunityId,
                        contractStatus,
                        riskLevel));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
