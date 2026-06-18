package com.canicula.crmai.attachment;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AttachmentController {

    private final AttachmentService attachmentService;
    private final AuditLogService auditLogService;

    AttachmentController(AttachmentService attachmentService, AuditLogService auditLogService) {
        this.attachmentService = attachmentService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("attachment.create")
    @PostMapping("/api/attachments")
    AttachmentResponse create(@Valid @RequestBody AttachmentCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        AttachmentResponse response = attachmentService.create(request, actorUserId);
        audit(actorUserId, "attachment.create", response, httpRequest);
        return response;
    }

    @RequirePermission("attachment.read")
    @GetMapping("/api/attachments")
    List<AttachmentResponse> list(
            @RequestParam(name = "object_type") String objectType,
            @RequestParam(name = "object_id") Long objectId,
            HttpServletRequest httpRequest) {
        return attachmentService.listByObject(objectType, objectId, currentUserId(httpRequest));
    }

    @RequirePermission("attachment.delete")
    @DeleteMapping("/api/attachments/{attachmentId}")
    Map<String, Boolean> delete(@PathVariable Long attachmentId, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        AttachmentResponse response = attachmentService.delete(attachmentId, actorUserId);
        audit(actorUserId, "attachment.delete", response, httpRequest);
        return Map.of("deleted", true);
    }

    private void audit(Long actorUserId, String actionCode, AttachmentResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "attachment",
                actionCode,
                "crm_attachment",
                response.id(),
                null,
                Map.of(
                        "object_type", response.object_type(),
                        "object_id", response.object_id(),
                        "file_name", response.file_name()),
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
