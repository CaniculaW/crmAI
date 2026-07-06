package com.canicula.crmai.payment;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
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
public class PaymentController {

    private final PaymentService paymentService;
    private final AuditLogService auditLogService;

    PaymentController(PaymentService paymentService, AuditLogService auditLogService) {
        this.paymentService = paymentService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("payment.create")
    @PostMapping("/api/payments")
    PaymentResponse create(@Valid @RequestBody PaymentCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        PaymentResponse response = paymentService.create(request, actorUserId);
        audit(actorUserId, "payment.create", response, httpRequest);
        return response;
    }

    @RequirePermission("payment.read")
    @GetMapping("/api/payments")
    List<PaymentResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contract_id", required = false) Long contractId,
            @RequestParam(name = "receivable_plan_id", required = false) Long receivablePlanId,
            @RequestParam(name = "payment_status", required = false) String paymentStatus,
            @RequestParam(name = "payment_method", required = false) String paymentMethod,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            @RequestParam(name = "received_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime receivedFrom,
            @RequestParam(name = "received_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime receivedTo,
            @RequestParam(name = "exception_only", required = false) Boolean exceptionOnly,
            HttpServletRequest httpRequest) {
        PaymentListFilter filter = new PaymentListFilter(
                keyword,
                accountId,
                opportunityId,
                contractId,
                receivablePlanId,
                paymentStatus,
                paymentMethod,
                ownerUserId,
                receivedFrom,
                receivedTo,
                exceptionOnly);
        return paymentService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("payment.read")
    @GetMapping("/api/payments/{paymentId}")
    PaymentResponse detail(@PathVariable Long paymentId, HttpServletRequest httpRequest) {
        return paymentService.readableDetail(paymentId, currentUserId(httpRequest));
    }

    @RequirePermission("payment.update")
    @PatchMapping("/api/payments/{paymentId}")
    PaymentResponse update(
            @PathVariable Long paymentId,
            @Valid @RequestBody PaymentUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        PaymentResponse response = paymentService.update(paymentId, request, actorUserId);
        audit(actorUserId, "payment.update", response, httpRequest);
        return response;
    }

    @RequirePermission("payment.confirm")
    @PostMapping("/api/payments/{paymentId}/confirm")
    PaymentResponse confirm(
            @PathVariable Long paymentId,
            @Valid @RequestBody PaymentConfirmRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        PaymentResponse response = paymentService.confirm(paymentId, request, actorUserId);
        audit(actorUserId, "payment.confirm", response, httpRequest);
        return response;
    }

    @RequirePermission("payment.exception")
    @PostMapping("/api/payments/{paymentId}/exception")
    PaymentResponse registerException(
            @PathVariable Long paymentId,
            @Valid @RequestBody PaymentExceptionRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        PaymentResponse response = paymentService.registerException(paymentId, request, actorUserId);
        audit(actorUserId, "payment.exception", response, httpRequest);
        return response;
    }

    @RequirePermission("payment.refund")
    @PostMapping("/api/payments/{paymentId}/refund")
    PaymentResponse refund(
            @PathVariable Long paymentId,
            @Valid @RequestBody PaymentRefundRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        PaymentResponse response = paymentService.refund(paymentId, request, actorUserId);
        audit(actorUserId, "payment.refund", response, httpRequest);
        return response;
    }

    private void audit(Long actorUserId, String actionCode, PaymentResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "payment",
                actionCode,
                "crm_payment",
                response.id(),
                null,
                Map.of(
                        "payment_name", response.payment_name(),
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
