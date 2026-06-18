package com.canicula.crmai.reminder;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReminderController {

    private final ReminderService reminderService;
    private final AuditLogService auditLogService;

    ReminderController(ReminderService reminderService, AuditLogService auditLogService) {
        this.reminderService = reminderService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("reminder.read")
    @GetMapping("/api/reminders")
    List<ReminderResponse> list(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "overdue", required = false) Boolean overdue,
            @RequestParam(name = "object_type", required = false) String objectType,
            @RequestParam(name = "object_id", required = false) Long objectId,
            HttpServletRequest httpRequest) {
        ReminderFilter filter = new ReminderFilter(status, overdue, objectType, objectId);
        return reminderService.listMine(currentUserId(httpRequest), filter);
    }

    @RequirePermission("reminder.update")
    @PatchMapping("/api/reminders/{reminderId}")
    ReminderResponse update(
            @PathVariable Long reminderId,
            @Valid @RequestBody ReminderUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReminderResponse response = reminderService.updateStatus(reminderId, request, actorUserId);
        audit(actorUserId, response, httpRequest);
        return response;
    }

    private void audit(Long actorUserId, ReminderResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "reminder",
                "reminder.update",
                "crm_reminder",
                response.id(),
                null,
                Map.of(
                        "object_type", response.object_type(),
                        "object_id", response.object_id(),
                        "status", response.status()),
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
