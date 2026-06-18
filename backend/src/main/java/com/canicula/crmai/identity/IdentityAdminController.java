package com.canicula.crmai.identity;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IdentityAdminController {

    private final IdentityService identityService;
    private final AuthService authService;
    private final AuditLogService auditLogService;

    IdentityAdminController(
            IdentityService identityService,
            AuthService authService,
            AuditLogService auditLogService) {
        this.identityService = identityService;
        this.authService = authService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("system.user.manage")
    @GetMapping("/api/system/users")
    List<UserAdminResponse> listUsers() {
        return identityService.listUsers();
    }

    @RequirePermission("system.role.manage")
    @GetMapping("/api/system/roles")
    List<RoleAdminResponse> listRoles() {
        return identityService.listRoles();
    }

    @RequirePermission("system.role.manage")
    @GetMapping("/api/system/permissions")
    List<PermissionResponse> listPermissions() {
        return identityService.listPermissions();
    }

    @RequirePermission("system.role.manage")
    @PutMapping("/api/system/roles/{roleId}/permissions")
    RoleAdminResponse replaceRolePermissions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable Long roleId,
            @Valid @RequestBody RolePermissionUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        RolePermissionChange change = identityService.replaceRolePermissions(roleId, request.permission_codes());
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "system",
                "system.role.permissions.replace",
                "sys_role",
                roleId,
                change.before(),
                change.after(),
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return change.after();
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }
}
