package com.canicula.crmai.ai;

import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiWeeklyReportController {

    private final AiWeeklyReportService aiWeeklyReportService;

    AiWeeklyReportController(AiWeeklyReportService aiWeeklyReportService) {
        this.aiWeeklyReportService = aiWeeklyReportService;
    }

    @RequirePermission("ai.weekly.manage")
    @PostMapping("/api/ai-weekly-reports/generate")
    AiWeeklyReportResponse generate(
            @Valid @RequestBody AiWeeklyReportGenerateRequest request,
            HttpServletRequest httpRequest) {
        return aiWeeklyReportService.generate(request, currentUserId(httpRequest));
    }

    @RequirePermission("ai.weekly.manage")
    @GetMapping("/api/ai-weekly-reports")
    List<AiWeeklyReportResponse> list(
            @RequestParam(name = "status", required = false) String status,
            HttpServletRequest httpRequest) {
        return aiWeeklyReportService.list(currentUserId(httpRequest), status);
    }

    @RequirePermission("ai.weekly.manage")
    @PostMapping("/api/ai-weekly-reports/{reportId}/confirm")
    AiWeeklyReportResponse confirm(@PathVariable Long reportId, HttpServletRequest httpRequest) {
        return aiWeeklyReportService.confirm(reportId, currentUserId(httpRequest), traceId(httpRequest));
    }

    @RequirePermission("ai.weekly.manage")
    @PostMapping("/api/ai-weekly-reports/{reportId}/reject")
    AiWeeklyReportResponse reject(
            @PathVariable Long reportId,
            @Valid @RequestBody AiWeeklyReportRejectRequest request,
            HttpServletRequest httpRequest) {
        return aiWeeklyReportService.reject(reportId, currentUserId(httpRequest), request.reason(), traceId(httpRequest));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }

    private static String traceId(HttpServletRequest request) {
        return (String) request.getAttribute("crm.traceId");
    }
}
