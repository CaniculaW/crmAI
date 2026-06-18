package com.canicula.crmai.audit;

import com.canicula.crmai.auth.RequirePermission;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuditLogController {

    private final AuditLogService auditLogService;

    AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @RequirePermission("system.audit.read")
    @GetMapping("/api/system/audit-logs")
    List<AuditLogResponse> list(
            @RequestParam(name = "module_code", required = false) String moduleCode,
            @RequestParam(name = "action_code", required = false) String actionCode,
            @RequestParam(name = "object_type", required = false) String objectType,
            @RequestParam(name = "object_id", required = false) Long objectId,
            @RequestParam(name = "actor_user_id", required = false) Long actorUserId,
            @RequestParam(name = "limit", required = false) Integer limit) {
        return auditLogService.list(moduleCode, actionCode, objectType, objectId, actorUserId, limit);
    }
}
