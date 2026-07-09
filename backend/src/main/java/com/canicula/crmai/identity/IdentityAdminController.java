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
import org.springframework.web.bind.annotation.PostMapping;
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

    @RequirePermission("system.user.manage")
    @PostMapping("/api/system/users")
    UserAdminResponse createUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody UserAdminCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        UserAdminResponse created = identityService.createUserForAdmin(request);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "system",
                "system.user.create",
                "sys_user",
                created.id(),
                null,
                created,
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return created;
    }

    @RequirePermission("system.user.manage")
    @PutMapping("/api/system/users/{userId}")
    UserAdminResponse updateUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable Long userId,
            @Valid @RequestBody UserAdminUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        UserAdminResponse before = identityService.listUsers().stream()
                .filter(user -> user.id().equals(userId))
                .findFirst()
                .orElse(null);
        UserAdminResponse after = identityService.updateUserForAdmin(userId, request);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "system",
                "system.user.update",
                "sys_user",
                userId,
                before,
                after,
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return after;
    }

    @RequirePermission("system.user.manage")
    @GetMapping("/api/system/departments")
    List<DepartmentAdminResponse> listDepartments() {
        return identityService.listDepartments();
    }

    @RequirePermission("system.user.manage")
    @PostMapping("/api/system/departments")
    DepartmentAdminResponse createDepartment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody DepartmentAdminCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        DepartmentAdminResponse created = identityService.createDepartmentForAdmin(request);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "system",
                "system.department.create",
                "sys_department",
                created.id(),
                null,
                created,
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return created;
    }

    @RequirePermission("system.role.manage")
    @GetMapping("/api/system/roles")
    List<RoleAdminResponse> listRoles() {
        return identityService.listRoles();
    }

    @RequirePermission("system.role.manage")
    @PostMapping("/api/system/roles")
    RoleAdminResponse createRole(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody RoleCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        RoleAdminResponse created = identityService.createRoleForAdmin(request);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "system",
                "system.role.create",
                "sys_role",
                created.id(),
                null,
                created,
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return created;
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
