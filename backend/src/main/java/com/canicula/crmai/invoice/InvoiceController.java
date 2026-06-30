package com.canicula.crmai.invoice;

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
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final AuditLogService auditLogService;

    InvoiceController(InvoiceService invoiceService, AuditLogService auditLogService) {
        this.invoiceService = invoiceService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("invoice.create")
    @PostMapping("/api/invoices")
    InvoiceResponse create(@Valid @RequestBody InvoiceCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        InvoiceResponse response = invoiceService.create(request, actorUserId);
        audit(actorUserId, "invoice.create", response, httpRequest);
        return response;
    }

    @RequirePermission("invoice.read")
    @GetMapping("/api/invoices")
    List<InvoiceResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contract_id", required = false) Long contractId,
            @RequestParam(name = "invoice_status", required = false) String invoiceStatus,
            @RequestParam(name = "invoice_type", required = false) String invoiceType,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            @RequestParam(name = "planned_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime plannedFrom,
            @RequestParam(name = "planned_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime plannedTo,
            @RequestParam(name = "invoice_date_from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime invoiceDateFrom,
            @RequestParam(name = "invoice_date_to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime invoiceDateTo,
            @RequestParam(name = "exception_only", required = false) Boolean exceptionOnly,
            HttpServletRequest httpRequest) {
        InvoiceListFilter filter = new InvoiceListFilter(
                keyword,
                accountId,
                opportunityId,
                contractId,
                invoiceStatus,
                invoiceType,
                ownerUserId,
                plannedFrom,
                plannedTo,
                invoiceDateFrom,
                invoiceDateTo,
                exceptionOnly);
        return invoiceService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("invoice.read")
    @GetMapping("/api/invoices/{invoiceId}")
    InvoiceResponse detail(@PathVariable Long invoiceId, HttpServletRequest httpRequest) {
        return invoiceService.readableDetail(invoiceId, currentUserId(httpRequest));
    }

    @RequirePermission("invoice.update")
    @PatchMapping("/api/invoices/{invoiceId}")
    InvoiceResponse update(
            @PathVariable Long invoiceId,
            @Valid @RequestBody InvoiceUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        InvoiceResponse response = invoiceService.update(invoiceId, request, actorUserId);
        audit(actorUserId, "invoice.update", response, httpRequest);
        return response;
    }

    @RequirePermission("invoice.apply")
    @PostMapping("/api/invoices/{invoiceId}/apply")
    InvoiceResponse apply(
            @PathVariable Long invoiceId,
            @Valid @RequestBody InvoiceApplyRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        InvoiceResponse response = invoiceService.apply(invoiceId, request, actorUserId);
        audit(actorUserId, "invoice.apply", response, httpRequest);
        return response;
    }

    @RequirePermission("invoice.issue")
    @PostMapping("/api/invoices/{invoiceId}/issue")
    InvoiceResponse issue(
            @PathVariable Long invoiceId,
            @Valid @RequestBody InvoiceIssueRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        InvoiceResponse response = invoiceService.issue(invoiceId, request, actorUserId);
        audit(actorUserId, "invoice.issue", response, httpRequest);
        return response;
    }

    @RequirePermission("invoice.sign")
    @PostMapping("/api/invoices/{invoiceId}/sign")
    InvoiceResponse sign(
            @PathVariable Long invoiceId,
            @Valid @RequestBody InvoiceSignRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        InvoiceResponse response = invoiceService.sign(invoiceId, request, actorUserId);
        audit(actorUserId, "invoice.sign", response, httpRequest);
        return response;
    }

    @RequirePermission("invoice.exception")
    @PostMapping("/api/invoices/{invoiceId}/exception")
    InvoiceResponse registerException(
            @PathVariable Long invoiceId,
            @Valid @RequestBody InvoiceExceptionRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        InvoiceResponse response = invoiceService.registerException(invoiceId, request, actorUserId);
        audit(actorUserId, "invoice.exception", response, httpRequest);
        return response;
    }

    @RequirePermission("invoice.void")
    @PostMapping("/api/invoices/{invoiceId}/void")
    InvoiceResponse voidInvoice(
            @PathVariable Long invoiceId,
            @Valid @RequestBody InvoiceVoidRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        InvoiceResponse response = invoiceService.voidInvoice(invoiceId, request, actorUserId);
        audit(actorUserId, "invoice.void", response, httpRequest);
        return response;
    }

    private void audit(Long actorUserId, String actionCode, InvoiceResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "invoice",
                actionCode,
                "crm_invoice",
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
