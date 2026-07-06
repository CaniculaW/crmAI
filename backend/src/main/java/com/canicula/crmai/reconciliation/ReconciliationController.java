package com.canicula.crmai.reconciliation;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReconciliationController {

    private final ReconciliationService reconciliationService;
    private final AuditLogService auditLogService;

    ReconciliationController(ReconciliationService reconciliationService, AuditLogService auditLogService) {
        this.reconciliationService = reconciliationService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("reconciliation.read")
    @GetMapping("/api/reconciliations/workbench")
    ReconciliationWorkbenchResponse workbench(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contract_id", required = false) Long contractId,
            @RequestParam(name = "pending_only", required = false) Boolean pendingOnly,
            HttpServletRequest httpRequest) {
        return reconciliationService.workbench(
                currentUserId(httpRequest),
                new ReconciliationWorkbenchFilter(keyword, accountId, opportunityId, contractId, pendingOnly));
    }

    @RequirePermission("reconciliation.read")
    @GetMapping("/api/reconciliations")
    List<ReconciliationResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contract_id", required = false) Long contractId,
            @RequestParam(name = "invoice_id", required = false) Long invoiceId,
            @RequestParam(name = "payment_id", required = false) Long paymentId,
            @RequestParam(name = "reconciliation_status", required = false) String reconciliationStatus,
            @RequestParam(name = "active_only", required = false) Boolean activeOnly,
            HttpServletRequest httpRequest) {
        return reconciliationService.readableList(
                currentUserId(httpRequest),
                new ReconciliationListFilter(
                        keyword,
                        accountId,
                        opportunityId,
                        contractId,
                        invoiceId,
                        paymentId,
                        reconciliationStatus,
                        activeOnly));
    }

    @RequirePermission("reconciliation.read")
    @GetMapping("/api/reconciliations/{reconciliationId}")
    ReconciliationResponse detail(@PathVariable Long reconciliationId, HttpServletRequest httpRequest) {
        return reconciliationService.readableDetail(reconciliationId, currentUserId(httpRequest));
    }

    @RequirePermission("reconciliation.create")
    @PostMapping("/api/reconciliations")
    ReconciliationResponse create(
            @Valid @RequestBody ReconciliationCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReconciliationResponse response = reconciliationService.create(request, actorUserId);
        audit(actorUserId, "reconciliation.create", response, httpRequest);
        return response;
    }

    @RequirePermission("reconciliation.void")
    @PostMapping("/api/reconciliations/{reconciliationId}/void")
    ReconciliationResponse voidReconciliation(
            @PathVariable Long reconciliationId,
            @Valid @RequestBody ReconciliationVoidRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReconciliationResponse response = reconciliationService.voidReconciliation(reconciliationId, request, actorUserId);
        audit(actorUserId, "reconciliation.void", response, httpRequest);
        return response;
    }

    private void audit(Long actorUserId, String actionCode, ReconciliationResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "reconciliation",
                actionCode,
                "crm_reconciliation",
                response.id(),
                null,
                Map.of(
                        "reconciliation_no", response.reconciliation_no(),
                        "contract_id", response.contract_id()),
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
