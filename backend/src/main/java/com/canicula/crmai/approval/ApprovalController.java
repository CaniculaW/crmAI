package com.canicula.crmai.approval;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.auth.AuthService;
import com.canicula.crmai.auth.CurrentUserResponse;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.auth.RequirePermission;
import com.canicula.crmai.auth.UnauthorizedException;
import com.canicula.crmai.contract.ContractResponse;
import com.canicula.crmai.contract.ContractService;
import com.canicula.crmai.solution.SolutionDocumentResponse;
import com.canicula.crmai.solution.SolutionDocumentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
public class ApprovalController {

    private final ApprovalService approvalService;
    private final AuditLogService auditLogService;
    private final AuthService authService;
    private final SolutionDocumentService solutionDocumentService;
    private final ContractService contractService;

    ApprovalController(
            ApprovalService approvalService,
            AuditLogService auditLogService,
            AuthService authService,
            SolutionDocumentService solutionDocumentService,
            ContractService contractService) {
        this.approvalService = approvalService;
        this.auditLogService = auditLogService;
        this.authService = authService;
        this.solutionDocumentService = solutionDocumentService;
        this.contractService = contractService;
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
    ApprovalInstanceDetailResponse findInstance(
            @PathVariable Long instanceId,
            HttpServletRequest request) {
        CurrentUserResponse currentUser = currentUser(request);
        boolean businessAccessAuthorized = false;
        if (!approvalService.canAccessInstance(instanceId, currentUser.id())) {
            ApprovalInstanceResponse instance = approvalService.findInstanceForAccess(instanceId);
            authorizeBusinessRead(instance.object_type(), instance.object_id(), currentUser);
            businessAccessAuthorized = true;
        }
        return approvalService.findInstanceDetail(
                instanceId,
                currentUser.id(),
                businessAccessAuthorized);
    }

    @RequirePermission("approval.submit")
    @PostMapping("/api/approvals/instances")
    @Transactional
    public ApprovalInstanceResponse submit(
            @Valid @RequestBody ApprovalSubmitRequest submitRequest,
            HttpServletRequest request) {
        CurrentUserResponse currentUser = currentUser(request);
        Long actorUserId = currentUser.id();
        CanonicalBusinessObject businessObject = authorizeSubmission(submitRequest, currentUser);
        ApprovalInstanceResponse response = approvalService.submit(
                businessObject.objectType(),
                businessObject.objectId(),
                businessObject.objectName(),
                actorUserId);
        audit(actorUserId, "approval.submit", response.id(), null, response, request);
        auditBusinessStatus(
                actorUserId,
                businessObject,
                businessObject.status(),
                approvalService.findBusinessStatus(response),
                request);
        return response;
    }

    @RequirePermission("approval.approve")
    @PostMapping("/api/approvals/instances/{instanceId}/approve")
    @Transactional
    public ApprovalInstanceResponse approve(
            @PathVariable Long instanceId,
            @RequestBody(required = false) ApprovalDecisionRequest decisionRequest,
            HttpServletRequest request) {
        Long actorUserId = currentUserId(request);
        ApprovalInstanceResponse before = approvalService.findInstance(instanceId);
        String businessStatusBefore = approvalService.findBusinessStatus(before);
        String comment = decisionRequest == null ? null : decisionRequest.comment();
        ApprovalInstanceResponse response = approvalService.approve(instanceId, comment, actorUserId);
        audit(actorUserId, "approval.approve", instanceId, before, response, request);
        auditBusinessStatus(
                actorUserId,
                businessObject(response, businessStatusBefore),
                businessStatusBefore,
                approvalService.findBusinessStatus(response),
                request);
        return response;
    }

    @RequirePermission("approval.approve")
    @PostMapping("/api/approvals/instances/{instanceId}/reject")
    @Transactional
    public ApprovalInstanceResponse reject(
            @PathVariable Long instanceId,
            @RequestBody(required = false) ApprovalDecisionRequest decisionRequest,
            HttpServletRequest request) {
        Long actorUserId = currentUserId(request);
        ApprovalInstanceResponse before = approvalService.findInstance(instanceId);
        String businessStatusBefore = approvalService.findBusinessStatus(before);
        String comment = decisionRequest == null ? null : decisionRequest.comment();
        ApprovalInstanceResponse response = approvalService.reject(instanceId, comment, actorUserId);
        audit(actorUserId, "approval.reject", instanceId, before, response, request);
        auditBusinessStatus(
                actorUserId,
                businessObject(response, businessStatusBefore),
                businessStatusBefore,
                approvalService.findBusinessStatus(response),
                request);
        return response;
    }

    @RequirePermission("approval.read")
    @GetMapping("/api/approvals/object/{objectType}/{objectId}")
    ApprovalObjectStatusResponse findObjectStatus(
            @PathVariable String objectType,
            @PathVariable Long objectId,
            HttpServletRequest request) {
        CurrentUserResponse currentUser = currentUser(request);
        boolean businessAccessAuthorized = false;
        if (!approvalService.canAccessObject(objectType, objectId, currentUser.id())) {
            authorizeBusinessRead(objectType, objectId, currentUser);
            businessAccessAuthorized = true;
        }
        return approvalService.findObjectStatus(
                objectType,
                objectId,
                currentUser.id(),
                businessAccessAuthorized);
    }

    private CanonicalBusinessObject authorizeSubmission(
            ApprovalSubmitRequest request,
            CurrentUserResponse currentUser) {
        String requestedType = normalizeObjectType(request.object_type());
        if ("contract".equals(requestedType)) {
            requirePermissions(currentUser, "contract.read", "contract.update");
            ContractResponse contract = contractService.readableDetail(request.object_id(), currentUser.id());
            requireSubmissionStatus(contract.contract_status(), Set.of("drafting", "draft", "rejected"));
            return new CanonicalBusinessObject(
                    "contract",
                    contract.id(),
                    contract.contract_name(),
                    contract.contract_status(),
                    "crm_contract");
        }
        if (!Set.of("quotation", "bid").contains(requestedType)) {
            throw new BusinessRuleException("不支持的审批对象类型");
        }
        requirePermissions(currentUser, "solution.read", "solution.update");
        SolutionDocumentResponse solution = solutionDocumentService.readableDetail(
                request.object_id(),
                currentUser.id());
        String actualType = solutionApprovalType(solution);
        if (!requestedType.equals(actualType)) {
            throw new BusinessRuleException("审批请求类型与业务对象类型不匹配");
        }
        requireSubmissionStatus(solution.status(), Set.of("draft", "drafting", "rejected"));
        return new CanonicalBusinessObject(
                actualType,
                solution.id(),
                solution.document_name(),
                solution.status(),
                "crm_solution_document");
    }

    private void authorizeBusinessRead(
            String objectType,
            Long objectId,
            CurrentUserResponse currentUser) {
        try {
            if ("contract".equals(objectType)) {
                requirePermissions(currentUser, "contract.read");
                contractService.readableDetail(objectId, currentUser.id());
                return;
            }
            if (!Set.of("quotation", "bid").contains(objectType)) {
                throw new ForbiddenException("审批记录不存在或无权访问");
            }
            requirePermissions(currentUser, "solution.read");
            SolutionDocumentResponse solution = solutionDocumentService.readableDetail(objectId, currentUser.id());
            if (!objectType.equals(solutionApprovalType(solution))) {
                throw new ForbiddenException("审批记录不存在或无权访问");
            }
        } catch (IllegalArgumentException | ForbiddenException exception) {
            throw new ForbiddenException("审批记录不存在或无权访问");
        }
    }

    private static void requirePermissions(CurrentUserResponse currentUser, String... permissionCodes) {
        for (String permissionCode : permissionCodes) {
            if (!currentUser.permissions().contains(permissionCode)) {
                throw new ForbiddenException("无权访问该业务对象");
            }
        }
    }

    private static void requireSubmissionStatus(String status, Set<String> allowedStatuses) {
        if (status == null || !allowedStatuses.contains(status.toLowerCase(Locale.ROOT))) {
            throw new BusinessRuleException("当前业务状态不允许提交审批");
        }
    }

    private static String normalizeObjectType(String objectType) {
        if (objectType == null) {
            return "";
        }
        return objectType.strip().toLowerCase(Locale.ROOT);
    }

    private static String solutionApprovalType(SolutionDocumentResponse solution) {
        String documentType = solution.document_type().strip().toLowerCase(Locale.ROOT);
        if (Set.of("bid_document", "bid").contains(documentType)) {
            return "bid";
        }
        if ("quotation".equals(documentType) || solution.quotation_amount() != null) {
            return "quotation";
        }
        return null;
    }

    private static CanonicalBusinessObject businessObject(
            ApprovalInstanceResponse instance,
            String status) {
        return new CanonicalBusinessObject(
                instance.object_type(),
                instance.object_id(),
                instance.object_name(),
                status,
                "contract".equals(instance.object_type())
                        ? "crm_contract"
                        : "crm_solution_document");
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

    private void auditBusinessStatus(
            Long actorUserId,
            CanonicalBusinessObject businessObject,
            String beforeStatus,
            String afterStatus,
            HttpServletRequest request) {
        if (beforeStatus.equals(afterStatus)) {
            return;
        }
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "approval",
                "approval.business-status.update",
                businessObject.auditObjectType(),
                businessObject.objectId(),
                Map.of("status", beforeStatus),
                Map.of("status", afterStatus),
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private CurrentUserResponse currentUser(HttpServletRequest request) {
        return authService.currentUser(bearerToken(request.getHeader("Authorization")));
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }

    private record CanonicalBusinessObject(
            String objectType,
            Long objectId,
            String objectName,
            String status,
            String auditObjectType) {
    }
}
