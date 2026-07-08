package com.canicula.crmai.auth;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class PermissionInterceptor implements HandlerInterceptor {

    private final AuthService authService;
    private final AuditLogService auditLogService;

    PermissionInterceptor(AuthService authService, AuditLogService auditLogService) {
        this.authService = authService;
        this.auditLogService = auditLogService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        RequirePermission requiredPermission = requiredPermission(handlerMethod);
        if (requiredPermission == null) {
            return true;
        }

        CurrentUserResponse currentUser = authService.currentUser(bearerToken(request.getHeader("Authorization")));
        if (!currentUser.permissions().contains(requiredPermission.value())) {
            recordPermissionDenied(currentUser.id(), requiredPermission.value(), request);
            throw new ForbiddenException("无权访问该资源");
        }
        request.setAttribute("crm.currentUserId", currentUser.id());
        return true;
    }

    private void recordPermissionDenied(Long actorUserId, String permissionCode, HttpServletRequest request) {
        try {
            auditLogService.record(new AuditLogEntry(
                    actorUserId,
                    moduleCode(permissionCode),
                    "permission.denied",
                    "permission",
                    null,
                    null,
                    Map.of(
                            "permission_code", permissionCode,
                            "path", request.getRequestURI(),
                            "method", request.getMethod()),
                    "failed",
                    "无权访问该资源",
                    request.getRemoteAddr(),
                    request.getHeader("User-Agent"),
                    traceId(request)));
        } catch (RuntimeException ignored) {
            // Permission denial must still return 403 even if audit persistence is unavailable.
        }
    }

    private static String moduleCode(String permissionCode) {
        int dotIndex = permissionCode.indexOf('.');
        return dotIndex > 0 ? permissionCode.substring(0, dotIndex) : "system";
    }

    private static RequirePermission requiredPermission(HandlerMethod handlerMethod) {
        RequirePermission methodPermission = handlerMethod.getMethodAnnotation(RequirePermission.class);
        if (methodPermission != null) {
            return methodPermission;
        }
        return handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }

    private static String traceId(HttpServletRequest request) {
        Object traceId = request.getAttribute("crm.traceId");
        if (traceId instanceof String value && !value.isBlank()) {
            return value;
        }
        String headerTraceId = request.getHeader("X-Trace-Id");
        return headerTraceId == null || headerTraceId.isBlank() ? null : headerTraceId;
    }
}
