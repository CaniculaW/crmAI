package com.canicula.crmai.receivable;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import com.canicula.crmai.payment.PaymentListFilter;
import com.canicula.crmai.payment.PaymentResponse;
import com.canicula.crmai.payment.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReceivablePlanController {

    private final ReceivablePlanService receivablePlanService;
    private final PaymentService paymentService;
    private final AuditLogService auditLogService;

    ReceivablePlanController(
            ReceivablePlanService receivablePlanService,
            PaymentService paymentService,
            AuditLogService auditLogService) {
        this.receivablePlanService = receivablePlanService;
        this.paymentService = paymentService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("receivable.create")
    @PostMapping("/api/receivable-plans")
    ReceivablePlanResponse create(
            @Valid @RequestBody ReceivablePlanCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReceivablePlanResponse response = receivablePlanService.create(request, actorUserId);
        audit(actorUserId, "receivable.create", response, httpRequest);
        return response;
    }

    @RequirePermission("receivable.read")
    @GetMapping("/api/receivable-plans")
    List<ReceivablePlanResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contract_id", required = false) Long contractId,
            @RequestParam(name = "receivable_status", required = false) String receivableStatus,
            @RequestParam(name = "plan_stage", required = false) String planStage,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            @RequestParam(name = "planned_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime plannedFrom,
            @RequestParam(name = "planned_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime plannedTo,
            @RequestParam(name = "overdue_only", required = false) Boolean overdueOnly,
            HttpServletRequest httpRequest) {
        ReceivablePlanListFilter filter = new ReceivablePlanListFilter(
                keyword,
                accountId,
                opportunityId,
                contractId,
                receivableStatus,
                planStage,
                ownerUserId,
                plannedFrom,
                plannedTo,
                overdueOnly);
        return receivablePlanService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("receivable.read")
    @GetMapping("/api/receivable-plans/{planId}")
    ReceivablePlanResponse detail(@PathVariable Long planId, HttpServletRequest httpRequest) {
        return receivablePlanService.readableDetail(planId, currentUserId(httpRequest));
    }

    @RequirePermission("receivable.update")
    @PatchMapping("/api/receivable-plans/{planId}")
    ReceivablePlanResponse update(
            @PathVariable Long planId,
            @Valid @RequestBody ReceivablePlanUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReceivablePlanResponse response = receivablePlanService.update(planId, request, actorUserId);
        audit(actorUserId, "receivable.update", response, httpRequest);
        return response;
    }

    @RequirePermission("receivable.terminate")
    @PostMapping("/api/receivable-plans/{planId}/terminate")
    ReceivablePlanResponse terminate(
            @PathVariable Long planId,
            @Valid @RequestBody ReceivablePlanTerminateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReceivablePlanResponse response = receivablePlanService.terminate(planId, request, actorUserId);
        audit(actorUserId, "receivable.terminate", response, httpRequest);
        return response;
    }

    @RequirePermission("receivable.read")
    @GetMapping("/api/receivable-plans/{planId}/payments")
    List<PaymentResponse> payments(@PathVariable Long planId, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReceivablePlanResponse plan = receivablePlanService.readableDetail(planId, actorUserId);
        return paymentService.readableList(actorUserId, new PaymentListFilter(
                null,
                plan.account_id(),
                plan.opportunity_id(),
                plan.contract_id(),
                plan.id(),
                null,
                null,
                null,
                null,
                null,
                null));
    }

    @RequirePermission("receivable.read")
    @GetMapping("/api/receivable-plans/{planId}/follow-ups")
    List<ReceivableFollowUpResponse> followUps(@PathVariable Long planId, HttpServletRequest httpRequest) {
        return receivablePlanService.readableFollowUps(planId, currentUserId(httpRequest));
    }

    @RequirePermission("receivable.follow_up")
    @PostMapping("/api/receivable-plans/{planId}/follow-ups")
    ReceivableFollowUpResponse createFollowUp(
            @PathVariable Long planId,
            @Valid @RequestBody ReceivableFollowUpRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ReceivableFollowUpResponse response = receivablePlanService.createFollowUp(planId, request, actorUserId);
        ReceivablePlanResponse plan = receivablePlanService.readableDetail(planId, actorUserId);
        audit(actorUserId, "receivable.follow_up", plan, httpRequest);
        return response;
    }

    private void audit(
            Long actorUserId,
            String actionCode,
            ReceivablePlanResponse response,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "receivable",
                actionCode,
                "crm_receivable_plan",
                response.id(),
                null,
                Map.of(
                        "plan_name", response.plan_name(),
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
