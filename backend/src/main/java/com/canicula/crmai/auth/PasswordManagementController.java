package com.canicula.crmai.auth;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PasswordManagementController {

    private final AuthService authService;
    private final PasswordCredentialService passwordCredentialService;
    private final AuditLogService auditLogService;

    PasswordManagementController(
            AuthService authService,
            PasswordCredentialService passwordCredentialService,
            AuditLogService auditLogService) {
        this.authService = authService;
        this.passwordCredentialService = passwordCredentialService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/api/auth/change-password")
    Map<String, Boolean> changePassword(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        Long userId = authService.currentUserId(bearerToken(authorization));
        passwordCredentialService.changePassword(userId, request.old_password(), request.new_password());
        auditLogService.record(new AuditLogEntry(
                userId,
                "auth",
                "auth.password.change",
                "sys_user",
                userId,
                null,
                Map.of("password_changed", true),
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return Map.of("changed", true);
    }

    @RequirePermission("system.user.manage")
    @PostMapping("/api/auth/reset-password")
    Map<String, Boolean> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        passwordCredentialService.resetPassword(request.user_id(), request.new_password());
        auditLogService.record(new AuditLogEntry(
                null,
                "auth",
                "auth.password.reset",
                "sys_user",
                request.user_id(),
                null,
                Map.of("force_password_change", true),
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return Map.of("reset", true);
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }
}
