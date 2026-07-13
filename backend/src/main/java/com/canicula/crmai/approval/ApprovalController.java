package com.canicula.crmai.approval;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApprovalController {

    private final ApprovalService approvalService;
    private final AuditLogService auditLogService;

    ApprovalController(ApprovalService approvalService, AuditLogService auditLogService) {
        this.approvalService = approvalService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("approval.read")
    @GetMapping("/api/approvals/tasks")
    List<ApprovalTaskResponse> listTasks(
            @RequestParam String bucket,
            HttpServletRequest request) {
        return approvalService.listTasks(bucket, currentUserId(request));
    }

    @RequirePermission("approval.read")
    @GetMapping("/api/approvals/instances/{instanceId}")
    ApprovalInstanceDetailResponse findInstance(@PathVariable Long instanceId) {
        return approvalService.findInstanceDetail(instanceId);
    }

    @RequirePermission("approval.submit")
    @PostMapping("/api/approvals/instances")
    ApprovalInstanceResponse submit(
            @Valid @RequestBody ApprovalSubmitRequest submitRequest,
            HttpServletRequest request) {
        Long actorUserId = currentUserId(request);
        ApprovalInstanceResponse response = approvalService.submit(
                submitRequest.object_type(),
                submitRequest.object_id(),
                submitRequest.object_name(),
                actorUserId);
        audit(actorUserId, "approval.submit", response.id(), null, response, request);
        return response;
    }

    @RequirePermission("approval.approve")
    @PostMapping("/api/approvals/instances/{instanceId}/approve")
    ApprovalInstanceResponse approve(
            @PathVariable Long instanceId,
            @RequestBody(required = false) ApprovalDecisionRequest decisionRequest,
            HttpServletRequest request) {
        Long actorUserId = currentUserId(request);
        ApprovalInstanceResponse before = approvalService.findInstance(instanceId);
        String comment = decisionRequest == null ? null : decisionRequest.comment();
        ApprovalInstanceResponse response = approvalService.approve(instanceId, comment, actorUserId);
        audit(actorUserId, "approval.approve", instanceId, before, response, request);
        return response;
    }

    @RequirePermission("approval.approve")
    @PostMapping("/api/approvals/instances/{instanceId}/reject")
    ApprovalInstanceResponse reject(
            @PathVariable Long instanceId,
            @RequestBody(required = false) ApprovalDecisionRequest decisionRequest,
            HttpServletRequest request) {
        Long actorUserId = currentUserId(request);
        ApprovalInstanceResponse before = approvalService.findInstance(instanceId);
        String comment = decisionRequest == null ? null : decisionRequest.comment();
        ApprovalInstanceResponse response = approvalService.reject(instanceId, comment, actorUserId);
        audit(actorUserId, "approval.reject", instanceId, before, response, request);
        return response;
    }

    @RequirePermission("approval.read")
    @GetMapping("/api/approvals/object/{objectType}/{objectId}")
    ApprovalObjectStatusResponse findObjectStatus(
            @PathVariable String objectType,
            @PathVariable Long objectId) {
        return approvalService.findObjectStatus(objectType, objectId);
    }

    private void audit(
            Long actorUserId,
            String actionCode,
            Long instanceId,
            Object beforeData,
            Object afterData,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "approval",
                actionCode,
                "approval_instance",
                instanceId,
                beforeData,
                afterData,
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
