package com.canicula.crmai.account;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
public class AccountController {

    private final AccountService accountService;
    private final AuditLogService auditLogService;

    AccountController(AccountService accountService, AuditLogService auditLogService) {
        this.accountService = accountService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("account.create")
    @PostMapping("/api/accounts")
    AccountResponse create(@Valid @RequestBody AccountCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        AccountResponse response = accountService.create(request, actorUserId);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "account",
                "account.create",
                "crm_account",
                response.id(),
                null,
                Map.of("account_name", response.account_name()),
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return response;
    }

    @RequirePermission("account.read")
    @GetMapping("/api/accounts")
    List<AccountResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_type", required = false) String accountType,
            @RequestParam(name = "account_level", required = false) String accountLevel,
            @RequestParam(name = "account_status", required = false) String accountStatus,
            @RequestParam(name = "account_source", required = false) String accountSource,
            @RequestParam(name = "industry", required = false) String industry,
            @RequestParam(name = "region_province", required = false) String regionProvince,
            @RequestParam(name = "region_city", required = false) String regionCity,
            @RequestParam(name = "owner_department_id", required = false) Long ownerDepartmentId,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            HttpServletRequest httpRequest) {
        AccountListFilter filter = new AccountListFilter(
                keyword,
                accountType,
                accountLevel,
                accountStatus,
                accountSource,
                industry,
                regionProvince,
                regionCity,
                ownerDepartmentId,
                ownerUserId);
        return accountService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("account.read")
    @GetMapping("/api/accounts/{accountId}")
    AccountResponse detail(@PathVariable Long accountId, HttpServletRequest httpRequest) {
        return accountService.readableDetail(accountId, currentUserId(httpRequest));
    }

    @RequirePermission("account.update")
    @PatchMapping("/api/accounts/{accountId}")
    AccountResponse update(
            @PathVariable Long accountId,
            @Valid @RequestBody AccountUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        AccountResponse response = accountService.update(accountId, request, actorUserId);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "account",
                "account.update",
                "crm_account",
                response.id(),
                null,
                Map.of("account_name", response.account_name()),
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return response;
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
