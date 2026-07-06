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
public class AiDraftController {

    private final AiDraftService aiDraftService;

    AiDraftController(AiDraftService aiDraftService) {
        this.aiDraftService = aiDraftService;
    }

    @RequirePermission("ai.draft.manage")
    @PostMapping("/api/ai-drafts/parse")
    AiDraftParseResponse parse(@Valid @RequestBody AiDraftParseRequest request, HttpServletRequest httpRequest) {
        return aiDraftService.parse(request.source_text(), currentUserId(httpRequest));
    }

    @RequirePermission("ai.draft.manage")
    @GetMapping("/api/ai-drafts")
    List<AiDraftResponse> list(
            @RequestParam(name = "status", required = false) String status,
            HttpServletRequest httpRequest) {
        return aiDraftService.list(currentUserId(httpRequest), status);
    }

    @RequirePermission("ai.draft.manage")
    @PostMapping("/api/ai-drafts/{draftId}/confirm")
    AiDraftResponse confirm(@PathVariable Long draftId, HttpServletRequest httpRequest) {
        return aiDraftService.confirm(draftId, currentUserId(httpRequest), traceId(httpRequest));
    }

    @RequirePermission("ai.draft.manage")
    @PostMapping("/api/ai-drafts/{draftId}/reject")
    AiDraftResponse reject(
            @PathVariable Long draftId,
            @Valid @RequestBody AiDraftRejectRequest request,
            HttpServletRequest httpRequest) {
        return aiDraftService.reject(draftId, currentUserId(httpRequest), request.reason(), traceId(httpRequest));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }

    private static String traceId(HttpServletRequest request) {
        return (String) request.getAttribute("crm.traceId");
    }
}
