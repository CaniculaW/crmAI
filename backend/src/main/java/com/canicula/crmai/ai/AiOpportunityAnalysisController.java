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
public class AiOpportunityAnalysisController {

    private final AiOpportunityAnalysisService aiOpportunityAnalysisService;

    AiOpportunityAnalysisController(AiOpportunityAnalysisService aiOpportunityAnalysisService) {
        this.aiOpportunityAnalysisService = aiOpportunityAnalysisService;
    }

    @RequirePermission("ai.opportunity.analyze")
    @PostMapping("/api/ai-opportunity-analyses/generate")
    AiOpportunityAnalysisResponse generate(
            @Valid @RequestBody AiOpportunityAnalysisGenerateRequest request,
            HttpServletRequest httpRequest) {
        return aiOpportunityAnalysisService.generate(request, currentUserId(httpRequest));
    }

    @RequirePermission("ai.opportunity.analyze")
    @GetMapping("/api/ai-opportunity-analyses")
    List<AiOpportunityAnalysisResponse> list(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            HttpServletRequest httpRequest) {
        return aiOpportunityAnalysisService.list(currentUserId(httpRequest), status, opportunityId);
    }

    @RequirePermission("ai.opportunity.analyze")
    @PostMapping("/api/ai-opportunity-analyses/{analysisId}/confirm")
    AiOpportunityAnalysisResponse confirm(@PathVariable Long analysisId, HttpServletRequest httpRequest) {
        return aiOpportunityAnalysisService.confirm(analysisId, currentUserId(httpRequest), traceId(httpRequest));
    }

    @RequirePermission("ai.opportunity.analyze")
    @PostMapping("/api/ai-opportunity-analyses/{analysisId}/reject")
    AiOpportunityAnalysisResponse reject(
            @PathVariable Long analysisId,
            @Valid @RequestBody AiOpportunityAnalysisRejectRequest request,
            HttpServletRequest httpRequest) {
        return aiOpportunityAnalysisService.reject(analysisId, currentUserId(httpRequest), request.reason(), traceId(httpRequest));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }

    private static String traceId(HttpServletRequest request) {
        return (String) request.getAttribute("crm.traceId");
    }
}
