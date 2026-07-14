package com.canicula.crmai.solution;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SolutionDocumentController {

    private final SolutionDocumentService solutionDocumentService;
    private final AuditLogService auditLogService;

    SolutionDocumentController(
            SolutionDocumentService solutionDocumentService,
            AuditLogService auditLogService) {
        this.solutionDocumentService = solutionDocumentService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("solution.create")
    @PostMapping("/api/solutions")
    SolutionDocumentResponse create(
            @Valid @RequestBody SolutionDocumentCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        SolutionDocumentResponse response = solutionDocumentService.create(request, actorUserId);
        audit(actorUserId, "solution.create", response, httpRequest);
        return response;
    }

    @RequirePermission("solution.read")
    @GetMapping("/api/solutions")
    List<SolutionDocumentResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "document_type", required = false) String documentType,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "bid_self_check_result", required = false) String bidSelfCheckResult,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            HttpServletRequest httpRequest) {
        SolutionDocumentListFilter filter = new SolutionDocumentListFilter(
                keyword,
                accountId,
                opportunityId,
                documentType,
                status,
                bidSelfCheckResult,
                ownerUserId);
        return solutionDocumentService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("solution.read")
    @GetMapping("/api/solutions/{solutionId}")
    SolutionDocumentResponse detail(@PathVariable Long solutionId, HttpServletRequest httpRequest) {
        return solutionDocumentService.readableDetail(solutionId, currentUserId(httpRequest));
    }

    @RequirePermission("solution.update")
    @PatchMapping("/api/solutions/{solutionId}")
    SolutionDocumentResponse update(
            @PathVariable Long solutionId,
            @Valid @RequestBody SolutionDocumentUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        SolutionDocumentResponse response = solutionDocumentService.update(solutionId, request, actorUserId);
        audit(actorUserId, "solution.update", response, httpRequest);
        return response;
    }

    @RequirePermission("solution.update")
    @PostMapping("/api/solutions/{solutionId}/submit-approval")
    @Transactional
    SolutionDocumentResponse submitApproval(
            @PathVariable Long solutionId,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        SolutionDocumentService.ApprovalSubmission submission =
                solutionDocumentService.submitApproval(solutionId, actorUserId);
        SolutionDocumentResponse response = submission.after();
        audit(actorUserId, "solution.submit-approval", response, httpRequest);
        auditApprovalSubmit(actorUserId, submission.instanceId(), submission.before(), response, httpRequest);
        auditBusinessStatus(actorUserId, submission.before(), response, httpRequest);
        return response;
    }

    @RequirePermission("solution.void")
    @PostMapping("/api/solutions/{solutionId}/void")
    SolutionDocumentResponse voidDocument(
            @PathVariable Long solutionId,
            @Valid @RequestBody SolutionDocumentVoidRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        SolutionDocumentResponse response = solutionDocumentService.voidDocument(solutionId, request, actorUserId);
        audit(actorUserId, "solution.void", response, httpRequest);
        return response;
    }

    private void audit(
            Long actorUserId,
            String actionCode,
            SolutionDocumentResponse response,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "solution",
                actionCode,
                "crm_solution_document",
                response.id(),
                null,
                Map.of(
                        "document_name", response.document_name(),
                        "account_id", response.account_id(),
                        "opportunity_id", response.opportunity_id()),
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private void auditApprovalSubmit(
            Long actorUserId,
            long instanceId,
            SolutionDocumentResponse before,
            SolutionDocumentResponse after,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "approval",
                "approval.submit",
                "approval_instance",
                instanceId,
                null,
                Map.of(
                        "object_type", SolutionDocumentService.approvalObjectType(before),
                        "object_id", after.id(),
                        "object_name", after.document_name(),
                        "status", "pending"),
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private void auditBusinessStatus(
            Long actorUserId,
            SolutionDocumentResponse before,
            SolutionDocumentResponse after,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "approval",
                "approval.business-status.update",
                "crm_solution_document",
                after.id(),
                Map.of("status", before.status()),
                Map.of("status", after.status()),
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
