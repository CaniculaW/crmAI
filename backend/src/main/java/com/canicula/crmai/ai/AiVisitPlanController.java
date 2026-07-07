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
public class AiVisitPlanController {

    private final AiVisitPlanService aiVisitPlanService;

    AiVisitPlanController(AiVisitPlanService aiVisitPlanService) {
        this.aiVisitPlanService = aiVisitPlanService;
    }

    @RequirePermission("ai.visit.plan")
    @PostMapping("/api/ai-visit-plans/generate")
    AiVisitPlanResponse generate(
            @Valid @RequestBody AiVisitPlanGenerateRequest request,
            HttpServletRequest httpRequest) {
        return aiVisitPlanService.generate(request, currentUserId(httpRequest));
    }

    @RequirePermission("ai.visit.plan")
    @GetMapping("/api/ai-visit-plans")
    List<AiVisitPlanResponse> list(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            HttpServletRequest httpRequest) {
        return aiVisitPlanService.list(currentUserId(httpRequest), status, opportunityId);
    }

    @RequirePermission("ai.visit.plan")
    @PostMapping("/api/ai-visit-plans/{planId}/confirm")
    AiVisitPlanResponse confirm(@PathVariable Long planId, HttpServletRequest httpRequest) {
        return aiVisitPlanService.confirm(planId, currentUserId(httpRequest), traceId(httpRequest));
    }

    @RequirePermission("ai.visit.plan")
    @PostMapping("/api/ai-visit-plans/{planId}/reject")
    AiVisitPlanResponse reject(
            @PathVariable Long planId,
            @Valid @RequestBody AiVisitPlanRejectRequest request,
            HttpServletRequest httpRequest) {
        return aiVisitPlanService.reject(planId, currentUserId(httpRequest), request.reason(), traceId(httpRequest));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }

    private static String traceId(HttpServletRequest request) {
        return (String) request.getAttribute("crm.traceId");
    }
}
