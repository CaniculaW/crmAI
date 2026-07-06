package com.canicula.crmai.ai;

import com.canicula.crmai.account.AccountListFilter;
import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityListFilter;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.contact.ContactListFilter;
import com.canicula.crmai.contact.ContactResponse;
import com.canicula.crmai.contact.ContactService;
import com.canicula.crmai.contract.ContractListFilter;
import com.canicula.crmai.contract.ContractResponse;
import com.canicula.crmai.contract.ContractService;
import com.canicula.crmai.opportunity.OpportunityListFilter;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
import com.canicula.crmai.receivable.ReceivablePlanListFilter;
import com.canicula.crmai.receivable.ReceivablePlanResponse;
import com.canicula.crmai.receivable.ReceivablePlanService;
import com.canicula.crmai.solution.SolutionDocumentListFilter;
import com.canicula.crmai.solution.SolutionDocumentResponse;
import com.canicula.crmai.solution.SolutionDocumentService;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AiContextService {

    private final AccountService accountService;
    private final ContactService contactService;
    private final OpportunityService opportunityService;
    private final ActivityService activityService;
    private final SolutionDocumentService solutionDocumentService;
    private final ContractService contractService;
    private final ReceivablePlanService receivablePlanService;
    private final JdbcTemplate jdbcTemplate;

    AiContextService(
            AccountService accountService,
            ContactService contactService,
            OpportunityService opportunityService,
            ActivityService activityService,
            SolutionDocumentService solutionDocumentService,
            ContractService contractService,
            ReceivablePlanService receivablePlanService,
            JdbcTemplate jdbcTemplate) {
        this.accountService = accountService;
        this.contactService = contactService;
        this.opportunityService = opportunityService;
        this.activityService = activityService;
        this.solutionDocumentService = solutionDocumentService;
        this.contractService = contractService;
        this.receivablePlanService = receivablePlanService;
        this.jdbcTemplate = jdbcTemplate;
    }

    public AiContextSummaryResponse summary(Long userId) {
        Set<String> permissions = permissions(userId);
        List<AccountResponse> accounts = canRead(permissions, "account.read")
                ? accountService.readableList(
                                userId,
                                new AccountListFilter(null, null, null, null, null, null, null, null, null, null))
                        .stream()
                        .limit(8)
                        .toList()
                : List.of();
        List<OpportunityResponse> opportunities = canRead(permissions, "opportunity.read")
                ? opportunityService.readableList(
                                userId,
                                new OpportunityListFilter(null, null, null, null, null, null, null, null, null, null, null, null, null, true))
                        .stream()
                        .limit(8)
                        .toList()
                : List.of();
        List<ActivityResponse> recentActivities = canRead(permissions, "activity.read")
                ? activityService.readableList(
                                userId,
                                new ActivityListFilter(null, null, null, null, null, null, null, null, null, null, null, null, null))
                        .stream()
                        .limit(10)
                        .toList()
                : List.of();
        List<AiEvidenceItem> evidence = recentActivities.stream()
                .map(this::activityEvidence)
                .toList();
        return new AiContextSummaryResponse(accounts, opportunities, recentActivities, List.of(), evidence);
    }

    public AiAccountContextResponse accountContext(Long accountId, Long userId) {
        Set<String> permissions = permissions(userId);
        requirePermission(permissions, "account.read");
        AccountResponse account = accountService.readableDetail(accountId, userId);
        List<ContactResponse> contacts = canRead(permissions, "contact.read") ? contactsByAccount(accountId, userId) : List.of();
        List<OpportunityResponse> opportunities = canRead(permissions, "opportunity.read")
                ? opportunitiesByAccount(accountId, userId)
                : List.of();
        List<ActivityResponse> activities = canRead(permissions, "activity.read") ? activitiesByAccount(accountId, userId) : List.of();
        List<SolutionDocumentResponse> solutions = canRead(permissions, "solution.read") ? solutionsByAccount(accountId, userId) : List.of();
        List<ContractResponse> contracts = canRead(permissions, "contract.read") ? contractsByAccount(accountId, userId) : List.of();
        List<ReceivablePlanResponse> receivables = canRead(permissions, "receivable.read") ? receivablesByAccount(accountId, userId) : List.of();
        List<AiEvidenceItem> evidence = StreamBuilder.start(accountEvidence(account))
                .addAll(activities.stream().map(this::activityEvidence).toList())
                .build();
        return new AiAccountContextResponse(
                account,
                contacts,
                opportunities,
                activities,
                solutions,
                contracts,
                receivables,
                evidence);
    }

    public AiOpportunityContextResponse opportunityContext(Long opportunityId, Long userId) {
        Set<String> permissions = permissions(userId);
        requirePermission(permissions, "opportunity.read");
        requirePermission(permissions, "account.read");
        OpportunityResponse opportunity = opportunityService.readableDetail(opportunityId, userId);
        AccountResponse account = accountService.readableDetail(opportunity.account_id(), userId);
        List<ContactResponse> contacts = canRead(permissions, "contact.read") ? contactsByAccount(account.id(), userId) : List.of();
        List<ActivityResponse> activities = canRead(permissions, "activity.read") ? activitiesByOpportunity(opportunityId, userId) : List.of();
        List<SolutionDocumentResponse> solutions = canRead(permissions, "solution.read")
                ? solutionsByOpportunity(opportunityId, userId)
                : List.of();
        List<ContractResponse> contracts = canRead(permissions, "contract.read")
                ? contractsByOpportunity(opportunityId, userId)
                : List.of();
        List<ReceivablePlanResponse> receivables = canRead(permissions, "receivable.read")
                ? receivablesByOpportunity(opportunityId, userId)
                : List.of();
        List<AiEvidenceItem> evidence = StreamBuilder.start(opportunityEvidence(opportunity))
                .add(accountEvidence(account))
                .addAll(activities.stream().map(this::activityEvidence).toList())
                .build();
        return new AiOpportunityContextResponse(
                opportunity,
                account,
                contacts,
                activities,
                solutions,
                contracts,
                receivables,
                evidence);
    }

    private List<ContactResponse> contactsByAccount(Long accountId, Long userId) {
        return contactService.readableList(
                        userId,
                        new ContactListFilter(null, accountId, null, null, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<OpportunityResponse> opportunitiesByAccount(Long accountId, Long userId) {
        return opportunityService.readableList(
                        userId,
                        new OpportunityListFilter(null, accountId, null, null, null, null, null, null, null, null, null, null, null, false))
                .stream()
                .limit(20)
                .toList();
    }

    private List<ActivityResponse> activitiesByAccount(Long accountId, Long userId) {
        return activityService.readableList(
                        userId,
                        new ActivityListFilter(null, accountId, null, null, null, null, null, null, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<ActivityResponse> activitiesByOpportunity(Long opportunityId, Long userId) {
        return activityService.readableList(
                        userId,
                        new ActivityListFilter(null, null, opportunityId, null, null, null, null, null, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<SolutionDocumentResponse> solutionsByAccount(Long accountId, Long userId) {
        return solutionDocumentService.readableList(
                        userId,
                        new SolutionDocumentListFilter(null, accountId, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<SolutionDocumentResponse> solutionsByOpportunity(Long opportunityId, Long userId) {
        return solutionDocumentService.readableList(
                        userId,
                        new SolutionDocumentListFilter(null, null, opportunityId, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<ContractResponse> contractsByAccount(Long accountId, Long userId) {
        return contractService.readableList(
                        userId,
                        new ContractListFilter(null, accountId, null, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<ContractResponse> contractsByOpportunity(Long opportunityId, Long userId) {
        return contractService.readableList(
                        userId,
                        new ContractListFilter(null, null, opportunityId, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<ReceivablePlanResponse> receivablesByAccount(Long accountId, Long userId) {
        return receivablePlanService.readableList(
                        userId,
                        new ReceivablePlanListFilter(null, accountId, null, null, null, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private List<ReceivablePlanResponse> receivablesByOpportunity(Long opportunityId, Long userId) {
        return receivablePlanService.readableList(
                        userId,
                        new ReceivablePlanListFilter(null, null, opportunityId, null, null, null, null, null, null, null))
                .stream()
                .limit(20)
                .toList();
    }

    private AiEvidenceItem accountEvidence(AccountResponse account) {
        return new AiEvidenceItem(
                "account",
                account.id(),
                account.account_name(),
                firstText(account.background(), account.key_needs(), account.last_activity_summary(), account.remark()),
                account.last_activity_at(),
                "/accounts?account_id=" + account.id());
    }

    private AiEvidenceItem opportunityEvidence(OpportunityResponse opportunity) {
        return new AiEvidenceItem(
                "opportunity",
                opportunity.id(),
                opportunity.opportunity_name(),
                firstText(opportunity.current_progress(), opportunity.next_plan(), opportunity.potential_point(), opportunity.remark()),
                null,
                "/opportunities?opportunity_id=" + opportunity.id());
    }

    private AiEvidenceItem activityEvidence(ActivityResponse activity) {
        String summary = firstText(
                activity.conclusion(),
                activity.customer_feedback(),
                activity.communication_content(),
                activity.next_plan(),
                activity.risk_description());
        return new AiEvidenceItem(
                "activity",
                activity.id(),
                activity.subject(),
                summary,
                activity.activity_time(),
                "/activities?activity_id=" + activity.id());
    }

    private static String firstText(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private Set<String> permissions(Long userId) {
        return Set.copyOf(jdbcTemplate.queryForList(
                """
                select distinct p.permission_code
                from sys_permissions p
                join sys_role_permissions rp on rp.permission_id = p.id
                join sys_user_roles ur on ur.role_id = rp.role_id
                where ur.user_id = ?
                  and p.is_active = true
                """,
                String.class,
                userId));
    }

    private static boolean canRead(Set<String> permissions, String permissionCode) {
        return permissions.contains(permissionCode);
    }

    private static void requirePermission(Set<String> permissions, String permissionCode) {
        if (!canRead(permissions, permissionCode)) {
            throw new ForbiddenException("无权访问该资源");
        }
    }

    private static final class StreamBuilder {
        private final java.util.ArrayList<AiEvidenceItem> items = new java.util.ArrayList<>();

        private static StreamBuilder start(AiEvidenceItem item) {
            return new StreamBuilder().add(item);
        }

        private StreamBuilder add(AiEvidenceItem item) {
            items.add(item);
            return this;
        }

        private StreamBuilder addAll(List<AiEvidenceItem> evidenceItems) {
            items.addAll(evidenceItems);
            return this;
        }

        private List<AiEvidenceItem> build() {
            return List.copyOf(items);
        }
    }
}
