package com.canicula.crmai.contract;

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
public class ContractController {

    private final ContractService contractService;
    private final AuditLogService auditLogService;

    ContractController(ContractService contractService, AuditLogService auditLogService) {
        this.contractService = contractService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("contract.create")
    @PostMapping("/api/contracts")
    ContractResponse create(@Valid @RequestBody ContractCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContractResponse response = contractService.create(request, actorUserId);
        audit(actorUserId, "contract.create", response, httpRequest);
        return response;
    }

    @RequirePermission("contract.read")
    @GetMapping("/api/contracts")
    List<ContractResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "contract_type", required = false) String contractType,
            @RequestParam(name = "contract_status", required = false) String contractStatus,
            @RequestParam(name = "risk_level", required = false) String riskLevel,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            @RequestParam(name = "business_owner_id", required = false) Long businessOwnerId,
            HttpServletRequest httpRequest) {
        ContractListFilter filter = new ContractListFilter(
                keyword,
                accountId,
                opportunityId,
                contractType,
                contractStatus,
                riskLevel,
                ownerUserId,
                businessOwnerId);
        return contractService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("contract.read")
    @GetMapping("/api/contracts/{contractId}")
    ContractResponse detail(@PathVariable Long contractId, HttpServletRequest httpRequest) {
        return contractService.readableDetail(contractId, currentUserId(httpRequest));
    }

    @RequirePermission("contract.update")
    @PatchMapping("/api/contracts/{contractId}")
    ContractResponse update(
            @PathVariable Long contractId,
            @Valid @RequestBody ContractUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContractResponse response = contractService.update(contractId, request, actorUserId);
        audit(actorUserId, "contract.update", response, httpRequest);
        return response;
    }

    @RequirePermission("contract.update")
    @PostMapping("/api/contracts/{contractId}/submit-approval")
    ContractResponse submitApproval(
            @PathVariable Long contractId,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContractResponse response = contractService.submitApproval(contractId, actorUserId);
        audit(actorUserId, "contract.submit-approval", response, httpRequest);
        return response;
    }

    @RequirePermission("contract.terminate")
    @PostMapping("/api/contracts/{contractId}/terminate")
    ContractResponse terminate(
            @PathVariable Long contractId,
            @Valid @RequestBody ContractTerminateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContractResponse response = contractService.terminate(contractId, request, actorUserId);
        audit(actorUserId, "contract.terminate", response, httpRequest);
        return response;
    }

    @RequirePermission("contract.read")
    @GetMapping("/api/contracts/{contractId}/changes")
    List<ContractChangeResponse> changes(@PathVariable Long contractId, HttpServletRequest httpRequest) {
        return contractService.readableChanges(contractId, currentUserId(httpRequest));
    }

    @RequirePermission("contract.read")
    @GetMapping("/api/contracts/{contractId}/milestones")
    List<ContractMilestoneResponse> milestones(@PathVariable Long contractId, HttpServletRequest httpRequest) {
        return contractService.readableMilestones(contractId, currentUserId(httpRequest));
    }

    @RequirePermission("contract.milestone.manage")
    @PostMapping("/api/contracts/{contractId}/milestones")
    ContractMilestoneResponse createMilestone(
            @PathVariable Long contractId,
            @Valid @RequestBody ContractMilestoneCreateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContractMilestoneResponse response = contractService.createMilestone(contractId, request, actorUserId);
        auditMilestone(actorUserId, "contract.milestone.create", response, httpRequest);
        return response;
    }

    @RequirePermission("contract.milestone.manage")
    @PatchMapping("/api/contracts/{contractId}/milestones/{milestoneId}")
    ContractMilestoneResponse updateMilestone(
            @PathVariable Long contractId,
            @PathVariable Long milestoneId,
            @Valid @RequestBody ContractMilestoneUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContractMilestoneResponse response = contractService.updateMilestone(contractId, milestoneId, request, actorUserId);
        auditMilestone(actorUserId, "contract.milestone.update", response, httpRequest);
        return response;
    }

    private void audit(Long actorUserId, String actionCode, ContractResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "contract",
                actionCode,
                "crm_contract",
                response.id(),
                null,
                Map.of(
                        "contract_name", response.contract_name(),
                        "account_id", response.account_id()),
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private void auditMilestone(
            Long actorUserId,
            String actionCode,
            ContractMilestoneResponse response,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "contract",
                actionCode,
                "crm_contract_milestone",
                response.id(),
                null,
                Map.of(
                        "contract_id", response.contract_id(),
                        "milestone_name", response.milestone_name()),
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
