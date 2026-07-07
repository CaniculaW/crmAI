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
public class AiCommunicationRecommendationController {

    private final AiCommunicationRecommendationService aiCommunicationRecommendationService;

    AiCommunicationRecommendationController(AiCommunicationRecommendationService aiCommunicationRecommendationService) {
        this.aiCommunicationRecommendationService = aiCommunicationRecommendationService;
    }

    @RequirePermission("ai.communication.recommend")
    @PostMapping("/api/ai-communication-recommendations/generate")
    AiCommunicationRecommendationResponse generate(
            @Valid @RequestBody AiCommunicationRecommendationGenerateRequest request,
            HttpServletRequest httpRequest) {
        return aiCommunicationRecommendationService.generate(request, currentUserId(httpRequest));
    }

    @RequirePermission("ai.communication.recommend")
    @GetMapping("/api/ai-communication-recommendations")
    List<AiCommunicationRecommendationResponse> list(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contact_id", required = false) Long contactId,
            HttpServletRequest httpRequest) {
        return aiCommunicationRecommendationService.list(currentUserId(httpRequest), status, opportunityId, contactId);
    }

    @RequirePermission("ai.communication.recommend")
    @PostMapping("/api/ai-communication-recommendations/{recommendationId}/confirm")
    AiCommunicationRecommendationResponse confirm(@PathVariable Long recommendationId, HttpServletRequest httpRequest) {
        return aiCommunicationRecommendationService.confirm(recommendationId, currentUserId(httpRequest), traceId(httpRequest));
    }

    @RequirePermission("ai.communication.recommend")
    @PostMapping("/api/ai-communication-recommendations/{recommendationId}/reject")
    AiCommunicationRecommendationResponse reject(
            @PathVariable Long recommendationId,
            @Valid @RequestBody AiCommunicationRecommendationRejectRequest request,
            HttpServletRequest httpRequest) {
        return aiCommunicationRecommendationService.reject(recommendationId, currentUserId(httpRequest), request.reason(), traceId(httpRequest));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }

    private static String traceId(HttpServletRequest request) {
        return (String) request.getAttribute("crm.traceId");
    }
}
