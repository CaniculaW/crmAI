package com.canicula.crmai.ai;

import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiContextController {

    private final AiContextService aiContextService;

    AiContextController(AiContextService aiContextService) {
        this.aiContextService = aiContextService;
    }

    @RequirePermission("ai.context.read")
    @GetMapping("/api/ai-context/summary")
    AiContextSummaryResponse summary(HttpServletRequest request) {
        return aiContextService.summary(currentUserId(request));
    }

    @RequirePermission("ai.context.read")
    @GetMapping("/api/ai-context/accounts/{accountId}")
    AiAccountContextResponse accountContext(@PathVariable Long accountId, HttpServletRequest request) {
        return aiContextService.accountContext(accountId, currentUserId(request));
    }

    @RequirePermission("ai.context.read")
    @GetMapping("/api/ai-context/opportunities/{opportunityId}")
    AiOpportunityContextResponse opportunityContext(@PathVariable Long opportunityId, HttpServletRequest request) {
        return aiContextService.opportunityContext(opportunityId, currentUserId(request));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
