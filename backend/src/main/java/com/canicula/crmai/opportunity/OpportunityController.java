package com.canicula.crmai.opportunity;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OpportunityController {

    private final OpportunityService opportunityService;
    private final AuditLogService auditLogService;

    OpportunityController(OpportunityService opportunityService, AuditLogService auditLogService) {
        this.opportunityService = opportunityService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("opportunity.create")
    @PostMapping("/api/opportunities")
    OpportunityResponse create(@Valid @RequestBody OpportunityCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        OpportunityResponse response = opportunityService.create(request, actorUserId);
        audit(actorUserId, "opportunity.create", response, httpRequest);
        return response;
    }

    @RequirePermission("opportunity.read")
    @GetMapping("/api/opportunities")
    List<OpportunityResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "stage", required = false) String stage,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "level", required = false) String level,
            @RequestParam(name = "source", required = false) String source,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            @RequestParam(name = "owner_department_id", required = false) Long ownerDepartmentId,
            @RequestParam(name = "risk_status", required = false) String riskStatus,
            @RequestParam(name = "amount_min", required = false) BigDecimal amountMin,
            @RequestParam(name = "amount_max", required = false) BigDecimal amountMax,
            @RequestParam(name = "expected_close_from", required = false) LocalDate expectedCloseFrom,
            @RequestParam(name = "expected_close_to", required = false) LocalDate expectedCloseTo,
            @RequestParam(name = "default_following", defaultValue = "false") boolean defaultFollowing,
            HttpServletRequest httpRequest) {
        OpportunityListFilter filter = new OpportunityListFilter(
                keyword,
                accountId,
                stage,
                status,
                level,
                source,
                ownerUserId,
                ownerDepartmentId,
                riskStatus,
                amountMin,
                amountMax,
                expectedCloseFrom,
                expectedCloseTo,
                defaultFollowing);
        return opportunityService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("opportunity.read")
    @GetMapping("/api/accounts/{accountId}/opportunities")
    List<OpportunityResponse> listByAccount(@PathVariable Long accountId, HttpServletRequest httpRequest) {
        OpportunityListFilter filter = new OpportunityListFilter(
                null, accountId, null, null, null, null, null, null, null, null, null, null, null, false);
        return opportunityService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("opportunity.read")
    @GetMapping("/api/opportunities/{opportunityId}")
    OpportunityResponse detail(@PathVariable Long opportunityId, HttpServletRequest httpRequest) {
        return opportunityService.readableDetail(opportunityId, currentUserId(httpRequest));
    }

    @RequirePermission("opportunity.update")
    @PatchMapping("/api/opportunities/{opportunityId}")
    OpportunityResponse update(
            @PathVariable Long opportunityId,
            @Valid @RequestBody OpportunityUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        OpportunityResponse response = opportunityService.update(opportunityId, request, actorUserId);
        audit(actorUserId, "opportunity.update", response, httpRequest);
        return response;
    }

    private void audit(Long actorUserId, String actionCode, OpportunityResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "opportunity",
                actionCode,
                "crm_opportunity",
                response.id(),
                null,
                Map.of("opportunity_name", response.opportunity_name(), "account_id", response.account_id()),
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
