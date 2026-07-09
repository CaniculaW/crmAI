package com.canicula.crmai.ai.config;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.AuthService;
import com.canicula.crmai.auth.RequirePermission;
import com.canicula.crmai.auth.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiModelConfigController {

    private final AiModelConfigService aiModelConfigService;
    private final AuthService authService;
    private final AuditLogService auditLogService;

    AiModelConfigController(
            AiModelConfigService aiModelConfigService,
            AuthService authService,
            AuditLogService auditLogService) {
        this.aiModelConfigService = aiModelConfigService;
        this.authService = authService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("system.ai-config.manage")
    @GetMapping("/api/system/ai-model-configs")
    List<AiModelConfigResponse> list() {
        return aiModelConfigService.list();
    }

    @RequirePermission("system.ai-config.manage")
    @PostMapping("/api/system/ai-model-configs")
    AiModelConfigResponse create(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody AiModelConfigUpsertRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        AiModelConfigResponse response = aiModelConfigService.create(request, actorUserId);
        audit(actorUserId, "system.ai_config.create", response.id(), null, response, httpRequest);
        return response;
    }

    @RequirePermission("system.ai-config.manage")
    @PutMapping("/api/system/ai-model-configs/{configId}")
    AiModelConfigResponse update(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable Long configId,
            @Valid @RequestBody AiModelConfigUpsertRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        AiModelConfigResponse before = aiModelConfigService.find(configId);
        AiModelConfigResponse response = aiModelConfigService.update(configId, request, actorUserId);
        audit(actorUserId, "system.ai_config.update", configId, before, response, httpRequest);
        return response;
    }

    @RequirePermission("system.ai-config.manage")
    @PostMapping("/api/system/ai-model-configs/{configId}/test")
    AiModelConfigResponse test(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable Long configId,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        AiModelConfigResponse before = aiModelConfigService.find(configId);
        AiModelConfigResponse response = aiModelConfigService.testConnection(configId, actorUserId);
        audit(actorUserId, "system.ai_config.test", configId, before, response, httpRequest);
        return response;
    }

    private void audit(
            Long actorUserId,
            String actionCode,
            Long objectId,
            Object beforeData,
            Object afterData,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "system",
                actionCode,
                "sys_ai_model_config",
                objectId,
                beforeData,
                afterData,
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }
}
