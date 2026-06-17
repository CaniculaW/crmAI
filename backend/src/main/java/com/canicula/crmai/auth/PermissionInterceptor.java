package com.canicula.crmai.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class PermissionInterceptor implements HandlerInterceptor {

    private final AuthService authService;

    PermissionInterceptor(AuthService authService) {
        this.authService = authService;
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
            throw new ForbiddenException("无权访问该资源");
        }
        request.setAttribute("crm.currentUserId", currentUser.id());
        return true;
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
}
