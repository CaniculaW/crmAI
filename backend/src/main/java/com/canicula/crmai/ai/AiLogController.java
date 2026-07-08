package com.canicula.crmai.ai;

import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiLogController {

    private final AiLogService aiLogService;

    AiLogController(AiLogService aiLogService) {
        this.aiLogService = aiLogService;
    }

    @RequirePermission("ai.log.read")
    @GetMapping("/api/ai-logs")
    List<AiLogResponse> list(
            @RequestParam(name = "event_type", required = false) String eventType,
            @RequestParam(name = "ai_module", required = false) String aiModule,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "object_type", required = false) String objectType,
            @RequestParam(name = "object_id", required = false) Long objectId,
            @RequestParam(name = "occurred_from", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime occurredFrom,
            @RequestParam(name = "occurred_to", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime occurredTo,
            @RequestParam(name = "limit", required = false) Integer limit,
            HttpServletRequest request) {
        return aiLogService.list(
                currentUserId(request),
                eventType,
                aiModule,
                status,
                objectType,
                objectId,
                occurredFrom,
                occurredTo,
                limit);
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
