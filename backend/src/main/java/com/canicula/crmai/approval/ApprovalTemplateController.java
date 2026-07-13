package com.canicula.crmai.approval;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApprovalTemplateController {

    private final ApprovalService approvalService;
    private final AuditLogService auditLogService;

    ApprovalTemplateController(ApprovalService approvalService, AuditLogService auditLogService) {
        this.approvalService = approvalService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("approval.config.manage")
    @GetMapping("/api/approval-templates")
    List<ApprovalTemplateResponse> listTemplates() {
        return approvalService.listTemplates();
    }

    @RequirePermission("approval.config.manage")
    @PostMapping("/api/approval-templates")
    ApprovalTemplateResponse createTemplate(
            @Valid @RequestBody ApprovalTemplateCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ApprovalTemplateResponse previousDefault = Boolean.TRUE.equals(request.is_default())
                ? approvalService.findDefaultTemplate(request.object_type(), null)
                : null;
        ApprovalTemplateResponse response = approvalService.createTemplate(request, actorUserId);
        audit(
                actorUserId,
                "approval.template.create",
                "approval_template",
                response.id(),
                null,
                response,
                httpRequest);
        auditClearedDefault(previousDefault, actorUserId, httpRequest);
        return response;
    }

    @RequirePermission("approval.config.manage")
    @PatchMapping("/api/approval-templates/{templateId}")
    ApprovalTemplateResponse updateTemplate(
            @PathVariable Long templateId,
            @Valid @RequestBody ApprovalTemplateUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ApprovalTemplateResponse before = approvalService.findTemplate(templateId);
        ApprovalTemplateResponse previousDefault = Boolean.TRUE.equals(request.is_default())
                ? approvalService.findDefaultTemplate(before.object_type(), templateId)
                : null;
        ApprovalTemplateResponse response = approvalService.updateTemplate(templateId, request, actorUserId);
        audit(
                actorUserId,
                "approval.template.update",
                "approval_template",
                templateId,
                before,
                response,
                httpRequest);
        auditClearedDefault(previousDefault, actorUserId, httpRequest);
        return response;
    }

    @RequirePermission("approval.config.manage")
    @GetMapping("/api/approval-templates/{templateId}/nodes")
    List<ApprovalTemplateNodeResponse> listTemplateNodes(@PathVariable Long templateId) {
        return approvalService.listTemplateNodes(templateId);
    }

    @RequirePermission("approval.config.manage")
    @PostMapping("/api/approval-templates/{templateId}/nodes")
    ApprovalTemplateNodeResponse createTemplateNode(
            @PathVariable Long templateId,
            @Valid @RequestBody ApprovalTemplateNodeCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ApprovalTemplateNodeResponse response = approvalService.createTemplateNode(templateId, request);
        audit(
                actorUserId,
                "approval.template-node.create",
                "approval_template_node",
                response.id(),
                null,
                response,
                httpRequest);
        return response;
    }

    @RequirePermission("approval.config.manage")
    @PatchMapping("/api/approval-templates/{templateId}/nodes/{nodeId}")
    ApprovalTemplateNodeResponse updateTemplateNode(
            @PathVariable Long templateId,
            @PathVariable Long nodeId,
            @Valid @RequestBody ApprovalTemplateNodeUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ApprovalTemplateNodeResponse before = approvalService.findTemplateNode(templateId, nodeId);
        ApprovalTemplateNodeResponse response = approvalService.updateTemplateNode(templateId, nodeId, request);
        audit(
                actorUserId,
                "approval.template-node.update",
                "approval_template_node",
                nodeId,
                before,
                response,
                httpRequest);
        return response;
    }

    private void auditClearedDefault(
            ApprovalTemplateResponse previousDefault,
            Long actorUserId,
            HttpServletRequest request) {
        if (previousDefault == null) {
            return;
        }
        ApprovalTemplateResponse after = approvalService.findTemplate(previousDefault.id());
        if (!previousDefault.is_default() || after.is_default()) {
            return;
        }
        audit(
                actorUserId,
                "approval.template.update",
                "approval_template",
                previousDefault.id(),
                previousDefault,
                after,
                request);
    }

    private void audit(
            Long actorUserId,
            String actionCode,
            String objectType,
            Long objectId,
            Object beforeData,
            Object afterData,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "approval",
                actionCode,
                objectType,
                objectId,
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
