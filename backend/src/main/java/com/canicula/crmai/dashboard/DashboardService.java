package com.canicula.crmai.dashboard;

import com.canicula.crmai.identity.DataPermissionColumns;
import com.canicula.crmai.identity.DataPermissionCondition;
import com.canicula.crmai.identity.DataPermissionService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private static final ZoneOffset DEFAULT_OFFSET = ZoneOffset.ofHours(8);
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal ONE = BigDecimal.ONE.setScale(2, RoundingMode.HALF_UP);
    private static final List<StageDefinition> STAGES = List.of(
            new StageDefinition("lead", "商业线索", new BigDecimal("0.10")),
            new StageDefinition("validation", "商业验证", new BigDecimal("0.20")),
            new StageDefinition("proposal", "商业方案", new BigDecimal("0.45")),
            new StageDefinition("solution", "方案确认", new BigDecimal("0.55")),
            new StageDefinition("negotiation", "商务谈判", new BigDecimal("0.70")),
            new StageDefinition("contract", "合同推进", new BigDecimal("0.90")),
            new StageDefinition("won", "商业成交", ONE));
    private static final List<ContractStatusDefinition> CONTRACT_STATUSES = List.of(
            new ContractStatusDefinition("drafting", "拟定中"),
            new ContractStatusDefinition("approving", "审批中"),
            new ContractStatusDefinition("pending_signature", "待签署"),
            new ContractStatusDefinition("performing", "执行中"),
            new ContractStatusDefinition("paused", "暂停中"),
            new ContractStatusDefinition("completed", "已完成"),
            new ContractStatusDefinition("terminated", "已终止"));
    private static final List<InvoiceStatusDefinition> INVOICE_STATUSES = List.of(
            new InvoiceStatusDefinition("planned", "计划中"),
            new InvoiceStatusDefinition("applied", "已申请"),
            new InvoiceStatusDefinition("invoiced", "已开票"),
            new InvoiceStatusDefinition("signed", "已签收"),
            new InvoiceStatusDefinition("exception", "异常"),
            new InvoiceStatusDefinition("voided", "已作废"));
    private static final DataPermissionColumns OPPORTUNITY_COLUMNS = new DataPermissionColumns(
            "o.owner_user_id",
            "o.owner_department_id",
            "exists (select 1 from crm_opportunity_collaborators oc where oc.opportunity_id = o.id and oc.user_id = ?)");
    private static final DataPermissionColumns CONTRACT_COLUMNS =
            new DataPermissionColumns("c.owner_user_id", "a.owner_department_id", null);
    private static final DataPermissionColumns INVOICE_COLUMNS =
            new DataPermissionColumns("i.owner_user_id", "a.owner_department_id", null);
    private static final DataPermissionColumns RECEIVABLE_COLUMNS =
            new DataPermissionColumns("rp.owner_user_id", "a.owner_department_id", null);
    private static final DataPermissionColumns PAYMENT_COLUMNS =
            new DataPermissionColumns("p.owner_user_id", "a.owner_department_id", null);
    private static final DataPermissionColumns RECONCILIATION_COLUMNS =
            new DataPermissionColumns("r.reconciled_by", "a.owner_department_id", null);

    private final JdbcTemplate jdbcTemplate;
    private final DataPermissionService dataPermissionService;

    DashboardService(JdbcTemplate jdbcTemplate, DataPermissionService dataPermissionService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataPermissionService = dataPermissionService;
    }

    public DashboardOverviewResponse overview(Long userId, DashboardFilter requestedFilter) {
        DashboardFilter filter = normalizeFilter(requestedFilter);
        DomainAccess opportunity = access(userId, "opportunity", "opportunity.read", OPPORTUNITY_COLUMNS);
        DomainAccess contract = access(userId, "contract", "contract.read", CONTRACT_COLUMNS);
        DomainAccess invoice = access(userId, "invoice", "invoice.read", INVOICE_COLUMNS);
        DomainAccess receivable = access(userId, "receivable", "receivable.read", RECEIVABLE_COLUMNS);
        DomainAccess payment = access(userId, "payment", "payment.read", PAYMENT_COLUMNS);
        DomainAccess reconciliation = access(userId, "reconciliation", "reconciliation.read", RECONCILIATION_COLUMNS);

        List<DashboardRiskSummary> riskSummary = riskSummary(
                filter,
                opportunity,
                contract,
                invoice,
                receivable,
                payment);
        long riskCount = riskSummary.stream().mapToLong(DashboardRiskSummary::count).sum();

        return new DashboardOverviewResponse(
                filterMap(filter),
                metricCards(filter, opportunity, contract, invoice, receivable, payment, riskCount),
                businessFlow(filter, opportunity, contract, invoice, receivable, reconciliation),
                riskSummary,
                topRisks(filter, opportunity, contract, invoice, receivable, payment));
    }

    public DashboardFunnelResponse funnel(Long userId, DashboardFunnelFilter requestedFilter) {
        DashboardFunnelFilter filter = normalizeFunnelFilter(requestedFilter);
        DomainAccess opportunity = access(userId, "opportunity", "opportunity.read", OPPORTUNITY_COLUMNS);
        List<FunnelOpportunityRow> opportunities = funnelOpportunities(filter, opportunity);
        return new DashboardFunnelResponse(
                funnelFilterMap(filter),
                funnelMetricCards(filter, opportunities),
                funnelStages(filter, opportunities),
                forecastTrend(opportunities),
                attentionOpportunities(opportunities));
    }

    public DashboardContractResponse contracts(Long userId, DashboardContractFilter requestedFilter) {
        DashboardContractFilter filter = normalizeContractFilter(requestedFilter);
        DomainAccess contract = access(userId, "contract", "contract.read", CONTRACT_COLUMNS);
        List<ContractDashboardRow> contracts = contractRows(filter, contract);
        List<ContractMilestoneDashboardRow> milestones = contractMilestones(filter, contract);
        List<ContractChangeDashboardRow> changes = contractChanges(filter, contract);
        return new DashboardContractResponse(
                contractFilterMap(filter),
                contractMetricCards(filter, contracts, milestones),
                contractStatusDistribution(filter, contracts),
                contractMilestoneSummary(filter, milestones),
                contractChangeTrend(changes),
                attentionContracts(contracts, milestones, changes));
    }

    public DashboardInvoiceResponse invoices(Long userId, DashboardInvoiceFilter requestedFilter) {
        DashboardInvoiceFilter filter = normalizeInvoiceFilter(requestedFilter);
        DomainAccess invoice = access(userId, "invoice", "invoice.read", INVOICE_COLUMNS);
        List<InvoiceDashboardRow> invoices = invoiceRows(filter, invoice);
        return new DashboardInvoiceResponse(
                invoiceFilterMap(filter),
                invoiceMetricCards(filter, invoices),
                invoiceStatusDistribution(filter, invoices),
                invoiceGapTrend(invoices),
                invoiceRiskSummary(filter, invoices),
                attentionInvoices(invoices));
    }

    private DashboardFilter normalizeFilter(DashboardFilter filter) {
        LocalDate today = LocalDate.now();
        LocalDate defaultFrom = today.withDayOfMonth(1);
        LocalDate defaultTo = today.with(TemporalAdjusters.lastDayOfMonth());
        LocalDate dateFrom = filter.date_from() == null ? defaultFrom : filter.date_from();
        LocalDate dateTo = filter.date_to() == null ? defaultTo : filter.date_to();
        return new DashboardFilter(
                dateFrom,
                dateTo,
                filter.department_id(),
                filter.owner_id(),
                filter.account_id(),
                filter.opportunity_id());
    }

    private DashboardFunnelFilter normalizeFunnelFilter(DashboardFunnelFilter filter) {
        LocalDate today = LocalDate.now();
        int quarterStartMonth = ((today.getMonthValue() - 1) / 3) * 3 + 1;
        LocalDate defaultFrom = LocalDate.of(today.getYear(), quarterStartMonth, 1);
        LocalDate defaultTo = defaultFrom.plusMonths(3).minusDays(1);
        LocalDate dateFrom = filter.date_from() == null ? defaultFrom : filter.date_from();
        LocalDate dateTo = filter.date_to() == null ? defaultTo : filter.date_to();
        return new DashboardFunnelFilter(
                dateFrom,
                dateTo,
                filter.department_id(),
                filter.owner_id(),
                filter.account_id(),
                filter.risk_status());
    }

    private DashboardContractFilter normalizeContractFilter(DashboardContractFilter filter) {
        LocalDate today = LocalDate.now();
        int quarterStartMonth = ((today.getMonthValue() - 1) / 3) * 3 + 1;
        LocalDate defaultFrom = LocalDate.of(today.getYear(), quarterStartMonth, 1);
        LocalDate defaultTo = defaultFrom.plusMonths(3).minusDays(1);
        LocalDate dateFrom = filter.date_from() == null ? defaultFrom : filter.date_from();
        LocalDate dateTo = filter.date_to() == null ? defaultTo : filter.date_to();
        return new DashboardContractFilter(
                dateFrom,
                dateTo,
                filter.department_id(),
                filter.owner_id(),
                filter.account_id(),
                filter.opportunity_id(),
                filter.contract_status(),
                filter.risk_level());
    }

    private DashboardInvoiceFilter normalizeInvoiceFilter(DashboardInvoiceFilter filter) {
        LocalDate today = LocalDate.now();
        int quarterStartMonth = ((today.getMonthValue() - 1) / 3) * 3 + 1;
        LocalDate defaultFrom = LocalDate.of(today.getYear(), quarterStartMonth, 1);
        LocalDate defaultTo = defaultFrom.plusMonths(3).minusDays(1);
        LocalDate dateFrom = filter.date_from() == null ? defaultFrom : filter.date_from();
        LocalDate dateTo = filter.date_to() == null ? defaultTo : filter.date_to();
        return new DashboardInvoiceFilter(
                dateFrom,
                dateTo,
                filter.department_id(),
                filter.owner_id(),
                filter.account_id(),
                filter.opportunity_id(),
                filter.contract_id(),
                filter.invoice_status(),
                filter.exception_only());
    }

    private Map<String, Object> filterMap(DashboardFilter filter) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("date_from", filter.date_from());
        filters.put("date_to", filter.date_to());
        filters.put("department_id", filter.department_id());
        filters.put("owner_id", filter.owner_id());
        filters.put("account_id", filter.account_id());
        filters.put("opportunity_id", filter.opportunity_id());
        return filters;
    }

    private Map<String, Object> funnelFilterMap(DashboardFunnelFilter filter) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("date_from", filter.date_from());
        filters.put("date_to", filter.date_to());
        filters.put("department_id", filter.department_id());
        filters.put("owner_id", filter.owner_id());
        filters.put("account_id", filter.account_id());
        filters.put("risk_status", filter.risk_status());
        return filters;
    }

    private Map<String, Object> contractFilterMap(DashboardContractFilter filter) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("date_from", filter.date_from());
        filters.put("date_to", filter.date_to());
        filters.put("department_id", filter.department_id());
        filters.put("owner_id", filter.owner_id());
        filters.put("account_id", filter.account_id());
        filters.put("opportunity_id", filter.opportunity_id());
        filters.put("contract_status", filter.contract_status());
        filters.put("risk_level", filter.risk_level());
        return filters;
    }

    private Map<String, Object> invoiceFilterMap(DashboardInvoiceFilter filter) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("date_from", filter.date_from());
        filters.put("date_to", filter.date_to());
        filters.put("department_id", filter.department_id());
        filters.put("owner_id", filter.owner_id());
        filters.put("account_id", filter.account_id());
        filters.put("opportunity_id", filter.opportunity_id());
        filters.put("contract_id", filter.contract_id());
        filters.put("invoice_status", filter.invoice_status());
        filters.put("exception_only", filter.exception_only());
        return filters;
    }

    private List<DashboardMetricCard> invoiceMetricCards(
            DashboardInvoiceFilter filter,
            List<InvoiceDashboardRow> invoices) {
        BigDecimal plannedAmount = invoices.stream()
                .map(InvoiceDashboardRow::plannedAmount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal appliedAmount = invoices.stream()
                .map(InvoiceDashboardRow::appliedAmount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal invoicedAmount = invoices.stream()
                .map(DashboardService::invoiceActualAmount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal signedAmount = invoices.stream()
                .filter(row -> "signed".equals(row.status()))
                .map(DashboardService::invoiceActualAmount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal gapAmount = invoices.stream()
                .map(row -> positiveGap(row.plannedAmount(), invoiceActualAmount(row)))
                .reduce(ZERO, BigDecimal::add);
        long exceptionCount = invoices.stream()
                .filter(row -> "exception".equals(row.status()))
                .count();
        return List.of(
                new DashboardMetricCard(
                        "planned_invoice_amount",
                        "计划开票金额",
                        plannedAmount,
                        "CNY",
                        "/invoices" + invoiceQueryString(filter)),
                new DashboardMetricCard(
                        "applied_invoice_amount",
                        "已申请金额",
                        appliedAmount,
                        "CNY",
                        "/invoices" + invoiceQueryString(filter) + "&invoice_status=applied"),
                new DashboardMetricCard(
                        "invoiced_amount",
                        "已开票金额",
                        invoicedAmount,
                        "CNY",
                        "/invoices" + invoiceQueryString(filter) + "&invoice_status=invoiced"),
                new DashboardMetricCard(
                        "signed_amount",
                        "已签收金额",
                        signedAmount,
                        "CNY",
                        "/invoices" + invoiceQueryString(filter) + "&invoice_status=signed"),
                new DashboardMetricCard(
                        "invoice_gap_amount",
                        "开票缺口金额",
                        gapAmount,
                        "CNY",
                        "/invoices" + invoiceQueryString(filter)),
                new DashboardMetricCard(
                        "exception_count",
                        "异常开票",
                        BigDecimal.valueOf(exceptionCount),
                        "count",
                        "/invoices" + invoiceQueryString(filter) + "&exception_only=true"));
    }

    private List<DashboardInvoiceStatusItem> invoiceStatusDistribution(
            DashboardInvoiceFilter filter,
            List<InvoiceDashboardRow> invoices) {
        Map<String, InvoiceStatusAccumulator> accumulators = new LinkedHashMap<>();
        INVOICE_STATUSES.forEach(status -> accumulators.put(status.key(), new InvoiceStatusAccumulator()));
        invoices.forEach(row -> accumulators.computeIfAbsent(row.status(), ignored -> new InvoiceStatusAccumulator())
                .add(row.plannedAmount(), invoiceActualAmount(row)));
        return accumulators.entrySet().stream()
                .map(entry -> new DashboardInvoiceStatusItem(
                        entry.getKey(),
                        invoiceStatusLabel(entry.getKey()),
                        entry.getValue().count(),
                        entry.getValue().plannedAmount(),
                        entry.getValue().actualAmount(),
                        "/invoices" + invoiceQueryString(filter) + "&invoice_status=" + entry.getKey()))
                .toList();
    }

    private List<DashboardInvoiceGapTrendPoint> invoiceGapTrend(List<InvoiceDashboardRow> invoices) {
        Map<String, InvoiceGapAccumulator> accumulators = new LinkedHashMap<>();
        invoices.stream()
                .filter(row -> row.plannedInvoiceDate() != null)
                .sorted(Comparator.comparing(InvoiceDashboardRow::plannedInvoiceDate))
                .forEach(row -> {
                    String period = "%04d-%02d".formatted(
                            row.plannedInvoiceDate().getYear(),
                            row.plannedInvoiceDate().getMonthValue());
                    accumulators.computeIfAbsent(period, ignored -> new InvoiceGapAccumulator())
                            .add(row.plannedAmount(), invoiceActualAmount(row));
                });
        return accumulators.entrySet().stream()
                .map(entry -> new DashboardInvoiceGapTrendPoint(
                        entry.getKey(),
                        entry.getValue().plannedAmount(),
                        entry.getValue().invoicedAmount(),
                        entry.getValue().gapAmount(),
                        entry.getValue().count()))
                .toList();
    }

    private List<DashboardInvoiceRiskSummary> invoiceRiskSummary(
            DashboardInvoiceFilter filter,
            List<InvoiceDashboardRow> invoices) {
        OffsetDateTime now = OffsetDateTime.now(DEFAULT_OFFSET);
        List<InvoiceDashboardRow> overdueUnissued = invoices.stream()
                .filter(row -> isOverdueUnissued(row, now))
                .toList();
        List<InvoiceDashboardRow> unsigned = invoices.stream()
                .filter(DashboardService::isUnsignedInvoice)
                .toList();
        List<InvoiceDashboardRow> exceptions = invoices.stream()
                .filter(row -> "exception".equals(row.status()))
                .toList();
        List<InvoiceDashboardRow> voided = invoices.stream()
                .filter(row -> "voided".equals(row.status()))
                .toList();
        return List.of(
                invoiceRisk("overdue_unissued", "逾期未开票", overdueUnissued, "high",
                        "/invoices" + invoiceQueryString(filter) + "&invoice_risk=overdue_unissued"),
                invoiceRisk("unsigned", "开票未签收", unsigned, "medium",
                        "/invoices" + invoiceQueryString(filter) + "&invoice_risk=unsigned"),
                invoiceRisk("exception", "异常开票", exceptions, "medium",
                        "/invoices" + invoiceQueryString(filter) + "&exception_only=true"),
                invoiceRisk("voided", "已作废", voided, "low",
                        "/invoices" + invoiceQueryString(filter) + "&invoice_status=voided"));
    }

    private static DashboardInvoiceRiskSummary invoiceRisk(
            String key,
            String label,
            List<InvoiceDashboardRow> rows,
            String levelWhenPresent,
            String drilldownUrl) {
        BigDecimal amount = rows.stream()
                .map(InvoiceDashboardRow::plannedAmount)
                .reduce(ZERO, BigDecimal::add);
        return new DashboardInvoiceRiskSummary(
                key,
                label,
                rows.size(),
                amount,
                rows.isEmpty() ? "none" : levelWhenPresent,
                drilldownUrl);
    }

    private List<DashboardAttentionInvoice> attentionInvoices(List<InvoiceDashboardRow> invoices) {
        OffsetDateTime now = OffsetDateTime.now(DEFAULT_OFFSET);
        return invoices.stream()
                .map(row -> attentionInvoice(row, now))
                .filter(item -> item.reason() != null)
                .sorted(Comparator.comparing(DashboardAttentionInvoice::planned_amount).reversed()
                        .thenComparing(DashboardAttentionInvoice::planned_invoice_date,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(8)
                .toList();
    }

    private DashboardAttentionInvoice attentionInvoice(InvoiceDashboardRow row, OffsetDateTime now) {
        String reason = null;
        if ("exception".equals(row.status())) {
            reason = "开票异常";
        } else if (isOverdueUnissued(row, now)) {
            reason = "逾期未开票";
        } else if (isUnsignedInvoice(row)) {
            reason = "开票未签收";
        } else if (row.plannedAmount().compareTo(new BigDecimal("100000")) >= 0
                && Set.of("planned", "applied").contains(row.status())) {
            reason = "大额待开票";
        }
        return new DashboardAttentionInvoice(
                row.id(),
                row.planName(),
                row.accountId(),
                row.opportunityId(),
                row.contractId(),
                row.ownerUserId(),
                row.status(),
                row.plannedAmount(),
                invoiceActualAmount(row),
                row.plannedInvoiceDate(),
                row.invoiceDate(),
                reason,
                "/invoices?invoice_id=" + row.id());
    }

    private List<DashboardMetricCard> contractMetricCards(
            DashboardContractFilter filter,
            List<ContractDashboardRow> contracts,
            List<ContractMilestoneDashboardRow> milestones) {
        BigDecimal contractAmount = contracts.stream()
                .map(ContractDashboardRow::amount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal performingAmount = contracts.stream()
                .filter(row -> "performing".equals(row.status()))
                .map(ContractDashboardRow::amount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal terminatedAmount = contracts.stream()
                .filter(row -> "terminated".equals(row.status()))
                .map(ContractDashboardRow::amount)
                .reduce(ZERO, BigDecimal::add);
        long highRiskCount = contracts.stream().filter(row -> isHighContractRisk(row.riskLevel())).count();
        OffsetDateTime now = OffsetDateTime.now(DEFAULT_OFFSET);
        long overdueCount = milestones.stream().filter(row -> isOverdueMilestone(row, now)).count();
        long dueSoonCount = milestones.stream().filter(row -> isDueSoonMilestone(row, now)).count();
        return List.of(
                new DashboardMetricCard(
                        "contract_amount",
                        "合同总额",
                        contractAmount,
                        "CNY",
                        "/contracts" + contractQueryString(filter)),
                new DashboardMetricCard(
                        "performing_amount",
                        "执行中金额",
                        performingAmount,
                        "CNY",
                        "/contracts" + contractQueryString(filter) + "&contract_status=performing"),
                new DashboardMetricCard(
                        "terminated_amount",
                        "已终止金额",
                        terminatedAmount,
                        "CNY",
                        "/contracts" + contractQueryString(filter) + "&contract_status=terminated"),
                new DashboardMetricCard(
                        "high_risk_count",
                        "高风险合同",
                        BigDecimal.valueOf(highRiskCount),
                        "count",
                        "/contracts" + contractQueryString(filter) + "&risk_level=high"),
                new DashboardMetricCard(
                        "overdue_milestone_count",
                        "逾期节点",
                        BigDecimal.valueOf(overdueCount),
                        "count",
                        "/contracts" + contractQueryString(filter) + "&milestone_status=overdue"),
                new DashboardMetricCard(
                        "due_soon_milestone_count",
                        "临近节点",
                        BigDecimal.valueOf(dueSoonCount),
                        "count",
                        "/contracts" + contractQueryString(filter) + "&milestone_due=soon"));
    }

    private List<DashboardContractStatusItem> contractStatusDistribution(
            DashboardContractFilter filter,
            List<ContractDashboardRow> contracts) {
        Map<String, ContractStatusAccumulator> accumulators = new LinkedHashMap<>();
        CONTRACT_STATUSES.forEach(status -> accumulators.put(status.key(), new ContractStatusAccumulator()));
        contracts.forEach(row -> accumulators.computeIfAbsent(row.status(), ignored -> new ContractStatusAccumulator())
                .add(row.amount()));
        return accumulators.entrySet().stream()
                .map(entry -> new DashboardContractStatusItem(
                        entry.getKey(),
                        contractStatusLabel(entry.getKey()),
                        entry.getValue().count(),
                        entry.getValue().amount(),
                        "/contracts" + contractQueryString(filter) + "&contract_status=" + entry.getKey()))
                .toList();
    }

    private List<DashboardContractMilestoneSummary> contractMilestoneSummary(
            DashboardContractFilter filter,
            List<ContractMilestoneDashboardRow> milestones) {
        OffsetDateTime now = OffsetDateTime.now(DEFAULT_OFFSET);
        long overdue = milestones.stream().filter(row -> isOverdueMilestone(row, now)).count();
        long dueSoon = milestones.stream().filter(row -> isDueSoonMilestone(row, now)).count();
        long open = milestones.stream().filter(row -> !isCompletedMilestone(row.status())).count();
        long completed = milestones.stream().filter(row -> isCompletedMilestone(row.status())).count();
        return List.of(
                new DashboardContractMilestoneSummary(
                        "overdue",
                        "逾期节点",
                        overdue,
                        "/contracts" + contractQueryString(filter) + "&milestone_status=overdue"),
                new DashboardContractMilestoneSummary(
                        "due_soon",
                        "30天内到期",
                        dueSoon,
                        "/contracts" + contractQueryString(filter) + "&milestone_due=soon"),
                new DashboardContractMilestoneSummary(
                        "open",
                        "未完成节点",
                        open,
                        "/contracts" + contractQueryString(filter) + "&milestone_open=true"),
                new DashboardContractMilestoneSummary(
                        "completed",
                        "已完成节点",
                        completed,
                        "/contracts" + contractQueryString(filter) + "&milestone_status=completed"));
    }

    private List<DashboardContractChangeTrendPoint> contractChangeTrend(List<ContractChangeDashboardRow> changes) {
        Map<String, Long> counts = new LinkedHashMap<>();
        changes.stream()
                .filter(row -> row.changedAt() != null)
                .sorted(Comparator.comparing(ContractChangeDashboardRow::changedAt))
                .forEach(row -> {
                    String period = "%04d-%02d".formatted(
                            row.changedAt().getYear(),
                            row.changedAt().getMonthValue());
                    counts.merge(period, 1L, Long::sum);
                });
        return counts.entrySet().stream()
                .map(entry -> new DashboardContractChangeTrendPoint(entry.getKey(), entry.getValue()))
                .toList();
    }

    private List<DashboardAttentionContract> attentionContracts(
            List<ContractDashboardRow> contracts,
            List<ContractMilestoneDashboardRow> milestones,
            List<ContractChangeDashboardRow> changes) {
        Map<Long, List<ContractMilestoneDashboardRow>> milestonesByContract = new LinkedHashMap<>();
        milestones.forEach(row -> milestonesByContract.computeIfAbsent(row.contractId(), ignored -> new ArrayList<>()).add(row));
        Map<Long, Long> changesByContract = new LinkedHashMap<>();
        changes.forEach(row -> changesByContract.merge(row.contractId(), 1L, Long::sum));
        OffsetDateTime now = OffsetDateTime.now(DEFAULT_OFFSET);
        return contracts.stream()
                .map(row -> attentionContract(row, milestonesByContract.getOrDefault(row.id(), List.of()),
                        changesByContract.getOrDefault(row.id(), 0L), now))
                .filter(item -> item.reason() != null)
                .sorted(Comparator.comparing(DashboardAttentionContract::contract_amount).reversed()
                        .thenComparing(DashboardAttentionContract::next_milestone_planned_at,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(8)
                .toList();
    }

    private DashboardAttentionContract attentionContract(
            ContractDashboardRow contract,
            List<ContractMilestoneDashboardRow> milestones,
            long changeCount,
            OffsetDateTime now) {
        ContractMilestoneDashboardRow nextMilestone = milestones.stream()
                .filter(row -> !isCompletedMilestone(row.status()))
                .min(Comparator.comparing(ContractMilestoneDashboardRow::plannedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
        String reason = null;
        if (milestones.stream().anyMatch(row -> isOverdueMilestone(row, now))) {
            reason = "节点逾期";
        } else if (isHighContractRisk(contract.riskLevel())) {
            reason = "高风险合同";
        } else if (changeCount > 0) {
            reason = "近期变更";
        } else if (milestones.stream().anyMatch(row -> isDueSoonMilestone(row, now))) {
            reason = "节点临近";
        }
        return new DashboardAttentionContract(
                contract.id(),
                contract.name(),
                contract.accountId(),
                contract.opportunityId(),
                contract.ownerUserId(),
                contract.status(),
                contract.riskLevel(),
                contract.amount(),
                nextMilestone == null ? null : nextMilestone.name(),
                nextMilestone == null ? null : nextMilestone.plannedAt(),
                reason,
                "/contracts?contract_id=" + contract.id());
    }

    private List<DashboardMetricCard> funnelMetricCards(
            DashboardFunnelFilter filter,
            List<FunnelOpportunityRow> opportunities) {
        BigDecimal forecastAmount = opportunities.stream()
                .map(FunnelOpportunityRow::amount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal weightedForecastAmount = opportunities.stream()
                .map(row -> weightedAmount(row.amount(), conversionRate(row)))
                .reduce(ZERO, BigDecimal::add);
        long activeCount = opportunities.stream().filter(DashboardService::isActiveOpportunity).count();
        long stalledCount = opportunities.stream().filter(DashboardService::isStalledOpportunity).count();
        long highRiskCount = opportunities.stream().filter(row -> isHighRisk(row.riskStatus())).count();
        return List.of(
                new DashboardMetricCard(
                        "forecast_amount",
                        "预测金额",
                        forecastAmount,
                        "CNY",
                        "/opportunities" + funnelQueryString(filter)),
                new DashboardMetricCard(
                        "weighted_forecast_amount",
                        "加权预测",
                        weightedForecastAmount,
                        "CNY",
                        "/opportunities" + funnelQueryString(filter)),
                new DashboardMetricCard(
                        "active_count",
                        "推进中商机",
                        BigDecimal.valueOf(activeCount),
                        "count",
                        "/opportunities" + funnelQueryString(filter)),
                new DashboardMetricCard(
                        "stalled_count",
                        "停滞商机",
                        BigDecimal.valueOf(stalledCount),
                        "count",
                        "/opportunities" + funnelQueryString(filter)),
                new DashboardMetricCard(
                        "high_risk_count",
                        "高风险商机",
                        BigDecimal.valueOf(highRiskCount),
                        "count",
                        "/opportunities" + funnelQueryString(filter)));
    }

    private List<DashboardFunnelStage> funnelStages(
            DashboardFunnelFilter filter,
            List<FunnelOpportunityRow> opportunities) {
        Map<String, StageAccumulator> accumulators = new LinkedHashMap<>();
        STAGES.forEach(stage -> accumulators.put(stage.key(), new StageAccumulator()));
        opportunities.forEach(row -> {
            StageDefinition stage = stageDefinition(row.stage());
            StageAccumulator accumulator = accumulators.get(stage.key());
            accumulator.add(row.amount(), weightedAmount(row.amount(), conversionRate(row)));
        });
        return STAGES.stream()
                .map(stage -> {
                    StageAccumulator accumulator = accumulators.get(stage.key());
                    return new DashboardFunnelStage(
                            stage.key(),
                            stage.label(),
                            accumulator.count(),
                            accumulator.amount(),
                            accumulator.weightedAmount(),
                            stage.defaultRate(),
                            "/opportunities" + funnelQueryString(filter) + "&stage=" + stage.key());
                })
                .toList();
    }

    private List<DashboardForecastTrendPoint> forecastTrend(List<FunnelOpportunityRow> opportunities) {
        Map<String, StageAccumulator> accumulators = new LinkedHashMap<>();
        opportunities.stream()
                .filter(row -> row.expectedCloseDate() != null)
                .sorted(Comparator.comparing(FunnelOpportunityRow::expectedCloseDate))
                .forEach(row -> {
                    String period = "%04d-%02d".formatted(
                            row.expectedCloseDate().getYear(),
                            row.expectedCloseDate().getMonthValue());
                    accumulators.computeIfAbsent(period, ignored -> new StageAccumulator())
                            .add(row.amount(), weightedAmount(row.amount(), conversionRate(row)));
                });
        return accumulators.entrySet().stream()
                .map(entry -> new DashboardForecastTrendPoint(
                        entry.getKey(),
                        entry.getValue().amount(),
                        entry.getValue().weightedAmount(),
                        entry.getValue().count()))
                .toList();
    }

    private List<DashboardAttentionOpportunity> attentionOpportunities(List<FunnelOpportunityRow> opportunities) {
        return opportunities.stream()
                .filter(row -> isStalledOpportunity(row) || isHighRisk(row.riskStatus()) || isClosingSoon(row))
                .sorted(Comparator.comparing(FunnelOpportunityRow::amount).reversed()
                        .thenComparing(FunnelOpportunityRow::expectedCloseDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(8)
                .map(row -> new DashboardAttentionOpportunity(
                        row.id(),
                        row.name(),
                        row.accountId(),
                        row.ownerUserId(),
                        row.stage(),
                        row.riskStatus(),
                        row.amount(),
                        row.expectedCloseDate(),
                        row.lastActivityAt(),
                        attentionReason(row),
                        "/opportunities?opportunity_id=" + row.id()))
                .toList();
    }

    private List<DashboardMetricCard> metricCards(
            DashboardFilter filter,
            DomainAccess opportunity,
            DomainAccess contract,
            DomainAccess invoice,
            DomainAccess receivable,
            DomainAccess payment,
            long riskCount) {
        BigDecimal forecastAmount = sumOpportunityForecast(filter, opportunity);
        BigDecimal contractAmount = sumContractAmount(filter, contract);
        BigDecimal invoicedAmount = sumInvoiceAmount(filter, invoice);
        BigDecimal receivedAmount = sumPaymentAmount(filter, payment);
        BigDecimal overdueAmount = sumReceivableOverdue(filter, receivable);
        return List.of(
                new DashboardMetricCard(
                        "forecast_amount",
                        "预测金额",
                        forecastAmount,
                        "CNY",
                        "/opportunities" + queryString(filter)),
                new DashboardMetricCard(
                        "contract_amount",
                        "合同金额",
                        contractAmount,
                        "CNY",
                        "/contracts" + queryString(filter)),
                new DashboardMetricCard(
                        "invoiced_amount",
                        "已开票金额",
                        invoicedAmount,
                        "CNY",
                        "/invoices" + queryString(filter)),
                new DashboardMetricCard(
                        "received_amount",
                        "已回款金额",
                        receivedAmount,
                        "CNY",
                        "/receivables" + queryString(filter)),
                new DashboardMetricCard(
                        "overdue_amount",
                        "逾期金额",
                        overdueAmount,
                        "CNY",
                        "/receivables" + queryString(filter)),
                new DashboardMetricCard(
                        "risk_count",
                        "风险数",
                        BigDecimal.valueOf(riskCount),
                        "count",
                        "/dashboard" + queryString(filter)));
    }

    private List<DashboardBusinessFlowItem> businessFlow(
            DashboardFilter filter,
            DomainAccess opportunity,
            DomainAccess contract,
            DomainAccess invoice,
            DomainAccess receivable,
            DomainAccess reconciliation) {
        FlowResult opportunityFlow = opportunityFlow(filter, opportunity);
        FlowResult contractFlow = contractFlow(filter, contract);
        FlowResult invoiceFlow = invoiceFlow(filter, invoice);
        FlowResult receivableFlow = receivableFlow(filter, receivable);
        FlowResult reconciliationFlow = reconciliationFlow(filter, reconciliation);
        return List.of(
                new DashboardBusinessFlowItem(
                        "opportunity",
                        "商机预测",
                        opportunityFlow.amount(),
                        opportunityFlow.count(),
                        opportunityFlow.riskCount(),
                        "/opportunities" + queryString(filter)),
                new DashboardBusinessFlowItem(
                        "contract",
                        "合同",
                        contractFlow.amount(),
                        contractFlow.count(),
                        contractFlow.riskCount(),
                        "/contracts" + queryString(filter)),
                new DashboardBusinessFlowItem(
                        "invoice",
                        "开票",
                        invoiceFlow.amount(),
                        invoiceFlow.count(),
                        invoiceFlow.riskCount(),
                        "/invoices" + queryString(filter)),
                new DashboardBusinessFlowItem(
                        "receivable",
                        "回款",
                        receivableFlow.amount(),
                        receivableFlow.count(),
                        receivableFlow.riskCount(),
                        "/receivables" + queryString(filter)),
                new DashboardBusinessFlowItem(
                        "reconciliation",
                        "核销",
                        reconciliationFlow.amount(),
                        reconciliationFlow.count(),
                        reconciliationFlow.riskCount(),
                        "/reconciliations" + queryString(filter)));
    }

    private List<DashboardRiskSummary> riskSummary(
            DashboardFilter filter,
            DomainAccess opportunity,
            DomainAccess contract,
            DomainAccess invoice,
            DomainAccess receivable,
            DomainAccess payment) {
        SummaryResult opportunityStalled = opportunityStalledSummary(filter, opportunity);
        SummaryResult contractMilestoneOverdue = contractMilestoneOverdueSummary(filter, contract);
        SummaryResult invoiceException = invoiceExceptionSummary(filter, invoice);
        SummaryResult receivableOverdue = receivableOverdueSummary(filter, receivable);
        SummaryResult unreconciledPayment = unreconciledPaymentSummary(filter, payment);
        return List.of(
                new DashboardRiskSummary(
                        "opportunity_stalled",
                        "商机停滞",
                        opportunityStalled.count(),
                        opportunityStalled.amount(),
                        opportunityStalled.highestLevel(),
                        "/opportunities" + queryString(filter)),
                new DashboardRiskSummary(
                        "contract_milestone_overdue",
                        "合同节点逾期",
                        contractMilestoneOverdue.count(),
                        contractMilestoneOverdue.amount(),
                        contractMilestoneOverdue.highestLevel(),
                        "/contracts" + queryString(filter)),
                new DashboardRiskSummary(
                        "invoice_exception",
                        "开票异常",
                        invoiceException.count(),
                        invoiceException.amount(),
                        invoiceException.highestLevel(),
                        "/invoices" + queryString(filter)),
                new DashboardRiskSummary(
                        "receivable_overdue",
                        "回款逾期",
                        receivableOverdue.count(),
                        receivableOverdue.amount(),
                        receivableOverdue.highestLevel(),
                        "/receivables" + queryString(filter)),
                new DashboardRiskSummary(
                        "unreconciled_payment",
                        "未核销回款",
                        unreconciledPayment.count(),
                        unreconciledPayment.amount(),
                        unreconciledPayment.highestLevel(),
                        "/reconciliations" + queryString(filter)));
    }

    private List<DashboardRiskItem> topRisks(
            DashboardFilter filter,
            DomainAccess opportunity,
            DomainAccess contract,
            DomainAccess invoice,
            DomainAccess receivable,
            DomainAccess payment) {
        List<DashboardRiskItem> risks = new ArrayList<>();
        risks.addAll(opportunityRiskItems(filter, opportunity));
        risks.addAll(contractRiskItems(filter, contract));
        risks.addAll(invoiceRiskItems(filter, invoice));
        risks.addAll(receivableRiskItems(filter, receivable));
        risks.addAll(paymentRiskItems(filter, payment));
        return risks.stream()
                .sorted(Comparator.comparing(DashboardRiskItem::amount, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed()
                        .thenComparing(DashboardRiskItem::occurred_at, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .toList();
    }

    private BigDecimal sumOpportunityForecast(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return ZERO;
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendDateFilter(filters, params, "o.expected_close_date", filter.date_from(), filter.date_to());
        appendOpportunityFilters(filters, params, filter);
        return sum("""
                select coalesce(sum(o.estimated_contract_amount), 0)
                from crm_opportunities o
                where o.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private BigDecimal sumContractAmount(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return ZERO;
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "c.signed_at", filter.date_from(), filter.date_to());
        appendContractFilters(filters, params, filter);
        return sum("""
                select coalesce(sum(c.contract_amount), 0)
                from crm_contracts c
                join crm_accounts a on a.id = c.account_id and a.deleted_at is null
                where c.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private BigDecimal sumInvoiceAmount(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return ZERO;
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "coalesce(i.invoice_date, i.planned_invoice_date)", filter.date_from(), filter.date_to());
        appendInvoiceFilters(filters, params, filter);
        return sum("""
                select coalesce(sum(coalesce(i.actual_invoice_amount, i.applied_amount, i.planned_amount)), 0)
                from crm_invoices i
                join crm_accounts a on a.id = i.account_id and a.deleted_at is null
                where i.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private BigDecimal sumPaymentAmount(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return ZERO;
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "p.received_at", filter.date_from(), filter.date_to());
        appendPaymentFilters(filters, params, filter);
        return sum("""
                select coalesce(sum(coalesce(nullif(p.confirmed_amount, 0), p.received_amount)), 0)
                from crm_payments p
                join crm_accounts a on a.id = p.account_id and a.deleted_at is null
                where p.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private BigDecimal sumReceivableOverdue(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return ZERO;
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "rp.planned_receivable_date", filter.date_from(), filter.date_to());
        appendReceivableFilters(filters, params, filter);
        return sum("""
                select coalesce(sum(rp.planned_amount), 0)
                from crm_receivable_plans rp
                join crm_accounts a on a.id = rp.account_id and a.deleted_at is null
                where rp.deleted_at is null
                  and rp.receivable_status = 'overdue'
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private FlowResult opportunityFlow(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return FlowResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendDateFilter(filters, params, "o.expected_close_date", filter.date_from(), filter.date_to());
        appendOpportunityFilters(filters, params, filter);
        return flow("""
                select coalesce(sum(o.estimated_contract_amount), 0) as amount,
                       count(*) as item_count,
                       sum(case when o.risk_status is not null and o.risk_status <> 'normal' then 1 else 0 end) as risk_count
                from crm_opportunities o
                where o.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private FlowResult contractFlow(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return FlowResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "c.signed_at", filter.date_from(), filter.date_to());
        appendContractFilters(filters, params, filter);
        return flow("""
                select coalesce(sum(c.contract_amount), 0) as amount,
                       count(*) as item_count,
                       sum(case when c.risk_level is not null and c.risk_level <> 'low' then 1 else 0 end) as risk_count
                from crm_contracts c
                join crm_accounts a on a.id = c.account_id and a.deleted_at is null
                where c.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private FlowResult invoiceFlow(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return FlowResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "coalesce(i.invoice_date, i.planned_invoice_date)", filter.date_from(), filter.date_to());
        appendInvoiceFilters(filters, params, filter);
        return flow("""
                select coalesce(sum(coalesce(i.actual_invoice_amount, i.applied_amount, i.planned_amount)), 0) as amount,
                       count(*) as item_count,
                       sum(case when i.invoice_status = 'exception' then 1 else 0 end) as risk_count
                from crm_invoices i
                join crm_accounts a on a.id = i.account_id and a.deleted_at is null
                where i.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private FlowResult receivableFlow(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return FlowResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "rp.planned_receivable_date", filter.date_from(), filter.date_to());
        appendReceivableFilters(filters, params, filter);
        return flow("""
                select coalesce(sum(rp.planned_amount), 0) as amount,
                       count(*) as item_count,
                       sum(case when rp.receivable_status = 'overdue' then 1 else 0 end) as risk_count
                from crm_receivable_plans rp
                join crm_accounts a on a.id = rp.account_id and a.deleted_at is null
                where rp.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private FlowResult reconciliationFlow(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return FlowResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "r.reconciled_at", filter.date_from(), filter.date_to());
        appendReconciliationFilters(filters, params, filter);
        return flow("""
                select coalesce(sum(r.reconciled_amount), 0) as amount,
                       count(*) as item_count,
                       sum(case when r.reconciliation_status <> 'active' then 1 else 0 end) as risk_count
                from crm_reconciliations r
                join crm_accounts a on a.id = r.account_id and a.deleted_at is null
                where r.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters), params);
    }

    private SummaryResult opportunityStalledSummary(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return SummaryResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendDateFilter(filters, params, "o.expected_close_date", filter.date_from(), filter.date_to());
        appendOpportunityFilters(filters, params, filter);
        return summary("""
                select count(*) as item_count, coalesce(sum(o.estimated_contract_amount), 0) as amount
                from crm_opportunities o
                where o.deleted_at is null
                  and o.risk_status is not null
                  and o.risk_status <> 'normal'
                  and %s
                  %s
                """.formatted(access.clause(), filters), params, "medium");
    }

    private SummaryResult contractMilestoneOverdueSummary(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return SummaryResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "m.planned_at", filter.date_from(), filter.date_to());
        appendContractFilters(filters, params, filter);
        return summary("""
                select count(*) as item_count, coalesce(sum(c.contract_amount), 0) as amount
                from crm_contract_milestones m
                join crm_contracts c on c.id = m.contract_id and c.deleted_at is null
                join crm_accounts a on a.id = c.account_id and a.deleted_at is null
                where m.deleted_at is null
                  and m.status = 'overdue'
                  and %s
                  %s
                """.formatted(access.clause(), filters), params, "high");
    }

    private SummaryResult invoiceExceptionSummary(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return SummaryResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "coalesce(i.invoice_date, i.planned_invoice_date)", filter.date_from(), filter.date_to());
        appendInvoiceFilters(filters, params, filter);
        return summary("""
                select count(*) as item_count, coalesce(sum(coalesce(i.actual_invoice_amount, i.applied_amount, i.planned_amount)), 0) as amount
                from crm_invoices i
                join crm_accounts a on a.id = i.account_id and a.deleted_at is null
                where i.deleted_at is null
                  and i.invoice_status = 'exception'
                  and %s
                  %s
                """.formatted(access.clause(), filters), params, "medium");
    }

    private SummaryResult receivableOverdueSummary(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return SummaryResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "rp.planned_receivable_date", filter.date_from(), filter.date_to());
        appendReceivableFilters(filters, params, filter);
        return summary("""
                select count(*) as item_count, coalesce(sum(rp.planned_amount), 0) as amount
                from crm_receivable_plans rp
                join crm_accounts a on a.id = rp.account_id and a.deleted_at is null
                where rp.deleted_at is null
                  and rp.receivable_status = 'overdue'
                  and %s
                  %s
                """.formatted(access.clause(), filters), params, "high");
    }

    private SummaryResult unreconciledPaymentSummary(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return SummaryResult.empty();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "p.received_at", filter.date_from(), filter.date_to());
        appendPaymentFilters(filters, params, filter);
        return summary("""
                select count(*) as item_count,
                       coalesce(sum(p.confirmed_amount - p.reconciled_amount), 0) as amount
                from crm_payments p
                join crm_accounts a on a.id = p.account_id and a.deleted_at is null
                where p.deleted_at is null
                  and p.confirmed_amount > p.reconciled_amount
                  and %s
                  %s
                """.formatted(access.clause(), filters), params, "medium");
    }

    private List<DashboardRiskItem> opportunityRiskItems(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendDateFilter(filters, params, "o.expected_close_date", filter.date_from(), filter.date_to());
        appendOpportunityFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select o.id, o.opportunity_name, o.estimated_contract_amount, o.owner_user_id, o.account_id,
                       o.id as opportunity_id, coalesce(o.last_activity_at, o.updated_at) as occurred_at
                from crm_opportunities o
                where o.deleted_at is null
                  and o.risk_status is not null
                  and o.risk_status <> 'normal'
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new DashboardRiskItem(
                        "opportunity_stalled",
                        "medium",
                        rs.getString("opportunity_name"),
                        amount(rs.getBigDecimal("estimated_contract_amount")),
                        "opportunity",
                        rs.getLong("id"),
                        rs.getLong("owner_user_id"),
                        rs.getLong("account_id"),
                        rs.getLong("opportunity_id"),
                        rs.getObject("occurred_at", OffsetDateTime.class),
                        "/opportunities?opportunity_id=" + rs.getLong("id")),
                params.toArray());
    }

    private List<DashboardRiskItem> contractRiskItems(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "m.planned_at", filter.date_from(), filter.date_to());
        appendContractFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select m.id, m.milestone_name, c.contract_amount, c.owner_user_id, c.account_id,
                       c.opportunity_id, m.planned_at as occurred_at
                from crm_contract_milestones m
                join crm_contracts c on c.id = m.contract_id and c.deleted_at is null
                join crm_accounts a on a.id = c.account_id and a.deleted_at is null
                where m.deleted_at is null
                  and m.status = 'overdue'
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new DashboardRiskItem(
                        "contract_milestone_overdue",
                        "high",
                        rs.getString("milestone_name"),
                        amount(rs.getBigDecimal("contract_amount")),
                        "contract_milestone",
                        rs.getLong("id"),
                        rs.getLong("owner_user_id"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id")),
                        rs.getObject("occurred_at", OffsetDateTime.class),
                        "/contracts"),
                params.toArray());
    }

    private List<DashboardRiskItem> invoiceRiskItems(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "coalesce(i.invoice_date, i.planned_invoice_date)", filter.date_from(), filter.date_to());
        appendInvoiceFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select i.id, i.plan_name, coalesce(i.actual_invoice_amount, i.applied_amount, i.planned_amount) as amount,
                       i.owner_user_id, i.account_id, i.opportunity_id,
                       coalesce(i.invoice_date, i.planned_invoice_date) as occurred_at
                from crm_invoices i
                join crm_accounts a on a.id = i.account_id and a.deleted_at is null
                where i.deleted_at is null
                  and i.invoice_status = 'exception'
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new DashboardRiskItem(
                        "invoice_exception",
                        "medium",
                        rs.getString("plan_name"),
                        amount(rs.getBigDecimal("amount")),
                        "invoice",
                        rs.getLong("id"),
                        rs.getLong("owner_user_id"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id")),
                        rs.getObject("occurred_at", OffsetDateTime.class),
                        "/invoices?invoice_id=" + rs.getLong("id")),
                params.toArray());
    }

    private List<DashboardRiskItem> receivableRiskItems(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "rp.planned_receivable_date", filter.date_from(), filter.date_to());
        appendReceivableFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select rp.id, rp.plan_name, rp.planned_amount, rp.owner_user_id, rp.account_id, rp.opportunity_id,
                       rp.planned_receivable_date as occurred_at
                from crm_receivable_plans rp
                join crm_accounts a on a.id = rp.account_id and a.deleted_at is null
                where rp.deleted_at is null
                  and rp.receivable_status = 'overdue'
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new DashboardRiskItem(
                        "receivable_overdue",
                        "high",
                        rs.getString("plan_name"),
                        amount(rs.getBigDecimal("planned_amount")),
                        "receivable_plan",
                        rs.getLong("id"),
                        rs.getLong("owner_user_id"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id")),
                        rs.getObject("occurred_at", OffsetDateTime.class),
                        "/receivables?receivable_plan_id=" + rs.getLong("id")),
                params.toArray());
    }

    private List<DashboardRiskItem> paymentRiskItems(DashboardFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "p.received_at", filter.date_from(), filter.date_to());
        appendPaymentFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select p.id, p.payment_name, (p.confirmed_amount - p.reconciled_amount) as amount,
                       p.owner_user_id, p.account_id, p.opportunity_id, p.received_at as occurred_at
                from crm_payments p
                join crm_accounts a on a.id = p.account_id and a.deleted_at is null
                where p.deleted_at is null
                  and p.confirmed_amount > p.reconciled_amount
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new DashboardRiskItem(
                        "unreconciled_payment",
                        "medium",
                        rs.getString("payment_name"),
                        amount(rs.getBigDecimal("amount")),
                        "payment",
                        rs.getLong("id"),
                        rs.getLong("owner_user_id"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id")),
                        rs.getObject("occurred_at", OffsetDateTime.class),
                        "/reconciliations?payment_id=" + rs.getLong("id")),
                params.toArray());
    }

    private List<FunnelOpportunityRow> funnelOpportunities(DashboardFunnelFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendDateFilter(filters, params, "o.expected_close_date", filter.date_from(), filter.date_to());
        appendFunnelOpportunityFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select o.id, o.opportunity_name, o.account_id, o.stage, o.status, o.risk_status,
                       o.estimated_contract_amount, o.win_rate, o.expected_close_date,
                       o.owner_user_id, o.close_type, coalesce(o.last_activity_at, o.updated_at) as last_activity_at
                from crm_opportunities o
                where o.deleted_at is null
                  and coalesce(o.status, '') not in ('lost', 'cancelled')
                  and coalesce(o.close_type, '') not in ('lost', 'cancelled')
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new FunnelOpportunityRow(
                        rs.getLong("id"),
                        rs.getString("opportunity_name"),
                        rs.getLong("account_id"),
                        rs.getLong("owner_user_id"),
                        rs.getString("stage"),
                        rs.getString("status"),
                        rs.getString("risk_status"),
                        amount(rs.getBigDecimal("estimated_contract_amount")),
                        rs.getBigDecimal("win_rate"),
                        rs.getObject("expected_close_date", LocalDate.class),
                        rs.getObject("last_activity_at", OffsetDateTime.class),
                        rs.getString("close_type")),
                params.toArray());
    }

    private List<ContractDashboardRow> contractRows(DashboardContractFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "coalesce(c.signed_at, c.created_at)", filter.date_from(), filter.date_to());
        appendContractDashboardFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select c.id, c.contract_name, c.account_id, c.opportunity_id, c.owner_user_id,
                       c.contract_status, c.risk_level, c.contract_amount, c.signed_at, c.created_at
                from crm_contracts c
                join crm_accounts a on a.id = c.account_id and a.deleted_at is null
                where c.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new ContractDashboardRow(
                        rs.getLong("id"),
                        rs.getString("contract_name"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id")),
                        rs.getLong("owner_user_id"),
                        rs.getString("contract_status"),
                        rs.getString("risk_level"),
                        amount(rs.getBigDecimal("contract_amount")),
                        rs.getObject("signed_at", OffsetDateTime.class),
                        rs.getObject("created_at", OffsetDateTime.class)),
                params.toArray());
    }

    private List<ContractMilestoneDashboardRow> contractMilestones(DashboardContractFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "coalesce(c.signed_at, c.created_at)", filter.date_from(), filter.date_to());
        appendContractDashboardFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select m.id, m.contract_id, m.milestone_name, m.status, m.planned_at, m.actual_at
                from crm_contract_milestones m
                join crm_contracts c on c.id = m.contract_id and c.deleted_at is null
                join crm_accounts a on a.id = c.account_id and a.deleted_at is null
                where m.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new ContractMilestoneDashboardRow(
                        rs.getLong("id"),
                        rs.getLong("contract_id"),
                        rs.getString("milestone_name"),
                        rs.getString("status"),
                        rs.getObject("planned_at", OffsetDateTime.class),
                        rs.getObject("actual_at", OffsetDateTime.class)),
                params.toArray());
    }

    private List<ContractChangeDashboardRow> contractChanges(DashboardContractFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "cc.changed_at", filter.date_from(), filter.date_to());
        appendContractDashboardFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select cc.id, cc.contract_id, cc.changed_at
                from crm_contract_changes cc
                join crm_contracts c on c.id = cc.contract_id and c.deleted_at is null
                join crm_accounts a on a.id = c.account_id and a.deleted_at is null
                where %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new ContractChangeDashboardRow(
                        rs.getLong("id"),
                        rs.getLong("contract_id"),
                        rs.getObject("changed_at", OffsetDateTime.class)),
                params.toArray());
    }

    private List<InvoiceDashboardRow> invoiceRows(DashboardInvoiceFilter filter, DomainAccess access) {
        if (!access.visible()) {
            return List.of();
        }
        List<Object> params = new ArrayList<>(access.parameters());
        StringBuilder filters = new StringBuilder();
        appendTimestampFilter(filters, params, "i.planned_invoice_date", filter.date_from(), filter.date_to());
        appendInvoiceDashboardFilters(filters, params, filter);
        return jdbcTemplate.query("""
                select i.id, i.plan_name, i.account_id, i.opportunity_id, i.contract_id, i.owner_user_id,
                       i.invoice_status, i.planned_amount, i.applied_amount, i.actual_invoice_amount,
                       i.planned_invoice_date, i.invoice_date, i.signed_at
                from crm_invoices i
                join crm_accounts a on a.id = i.account_id and a.deleted_at is null
                where i.deleted_at is null
                  and %s
                  %s
                """.formatted(access.clause(), filters),
                (rs, rowNum) -> new InvoiceDashboardRow(
                        rs.getLong("id"),
                        rs.getString("plan_name"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id")),
                        nullableLong(rs.getObject("contract_id")),
                        rs.getLong("owner_user_id"),
                        rs.getString("invoice_status"),
                        amount(rs.getBigDecimal("planned_amount")),
                        amount(rs.getBigDecimal("applied_amount")),
                        amount(rs.getBigDecimal("actual_invoice_amount")),
                        rs.getObject("planned_invoice_date", OffsetDateTime.class),
                        rs.getObject("invoice_date", OffsetDateTime.class),
                        rs.getObject("signed_at", OffsetDateTime.class)),
                params.toArray());
    }

    private static void appendContractDashboardFilters(
            StringBuilder sql,
            List<Object> params,
            DashboardContractFilter filter) {
        appendEquals(sql, params, "a.owner_department_id", filter.department_id());
        appendEquals(sql, params, "c.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "c.account_id", filter.account_id());
        appendEquals(sql, params, "c.opportunity_id", filter.opportunity_id());
        appendEquals(sql, params, "c.contract_status", filter.contract_status());
        appendEquals(sql, params, "c.risk_level", filter.risk_level());
    }

    private static void appendInvoiceDashboardFilters(
            StringBuilder sql,
            List<Object> params,
            DashboardInvoiceFilter filter) {
        appendEquals(sql, params, "a.owner_department_id", filter.department_id());
        appendEquals(sql, params, "i.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "i.account_id", filter.account_id());
        appendEquals(sql, params, "i.opportunity_id", filter.opportunity_id());
        appendEquals(sql, params, "i.contract_id", filter.contract_id());
        appendEquals(sql, params, "i.invoice_status", filter.invoice_status());
        if (Boolean.TRUE.equals(filter.exception_only())) {
            appendEquals(sql, params, "i.invoice_status", "exception");
        }
    }

    private static void appendFunnelOpportunityFilters(
            StringBuilder sql,
            List<Object> params,
            DashboardFunnelFilter filter) {
        appendEquals(sql, params, "o.owner_department_id", filter.department_id());
        appendEquals(sql, params, "o.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "o.account_id", filter.account_id());
        appendEquals(sql, params, "o.risk_status", filter.risk_status());
    }

    private static StageDefinition stageDefinition(String stage) {
        return STAGES.stream()
                .filter(item -> item.key().equals(stage))
                .findFirst()
                .orElse(STAGES.get(0));
    }

    private static BigDecimal conversionRate(FunnelOpportunityRow row) {
        if (row.winRate() == null || row.winRate().compareTo(ZERO) <= 0) {
            return stageDefinition(row.stage()).defaultRate();
        }
        if (row.winRate().compareTo(ONE) > 0) {
            return row.winRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        }
        return row.winRate();
    }

    private static BigDecimal weightedAmount(BigDecimal amount, BigDecimal rate) {
        return amount(amount).multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    private static boolean isActiveOpportunity(FunnelOpportunityRow row) {
        return !"won".equals(row.status()) && !"won".equals(row.closeType());
    }

    private static boolean isStalledOpportunity(FunnelOpportunityRow row) {
        OffsetDateTime lastActivityAt = row.lastActivityAt();
        return isActiveOpportunity(row)
                && lastActivityAt != null
                && lastActivityAt.isBefore(OffsetDateTime.now(DEFAULT_OFFSET).minusDays(14));
    }

    private static boolean isHighRisk(String riskStatus) {
        return Set.of("risk", "high_risk", "warning").contains(riskStatus);
    }

    private static boolean isClosingSoon(FunnelOpportunityRow row) {
        LocalDate expectedCloseDate = row.expectedCloseDate();
        return isActiveOpportunity(row)
                && expectedCloseDate != null
                && !expectedCloseDate.isBefore(LocalDate.now(DEFAULT_OFFSET))
                && !expectedCloseDate.isAfter(LocalDate.now(DEFAULT_OFFSET).plusDays(30));
    }

    private static String attentionReason(FunnelOpportunityRow row) {
        if (isStalledOpportunity(row)) {
            return "停滞超过14天";
        }
        if (isHighRisk(row.riskStatus())) {
            return "高风险商机";
        }
        return "临近预计成交日";
    }

    private static String contractStatusLabel(String status) {
        return CONTRACT_STATUSES.stream()
                .filter(item -> item.key().equals(status))
                .map(ContractStatusDefinition::label)
                .findFirst()
                .orElse(status);
    }

    private static String invoiceStatusLabel(String status) {
        return INVOICE_STATUSES.stream()
                .filter(item -> item.key().equals(status))
                .map(InvoiceStatusDefinition::label)
                .findFirst()
                .orElse(status);
    }

    private static BigDecimal invoiceActualAmount(InvoiceDashboardRow row) {
        if (Set.of("invoiced", "signed").contains(row.status())) {
            return row.actualAmount();
        }
        return ZERO;
    }

    private static BigDecimal positiveGap(BigDecimal plannedAmount, BigDecimal actualAmount) {
        BigDecimal gap = amount(plannedAmount).subtract(amount(actualAmount));
        return gap.compareTo(ZERO) > 0 ? gap : ZERO;
    }

    private static boolean isOverdueUnissued(InvoiceDashboardRow row, OffsetDateTime now) {
        return row.plannedInvoiceDate() != null
                && row.plannedInvoiceDate().isBefore(now)
                && !Set.of("invoiced", "signed", "voided").contains(row.status());
    }

    private static boolean isUnsignedInvoice(InvoiceDashboardRow row) {
        return "invoiced".equals(row.status()) && row.signedAt() == null;
    }

    private static boolean isHighContractRisk(String riskLevel) {
        return Set.of("high", "critical", "risk", "high_risk").contains(riskLevel);
    }

    private static boolean isCompletedMilestone(String status) {
        return Set.of("completed", "done", "cancelled", "voided").contains(status);
    }

    private static boolean isOverdueMilestone(ContractMilestoneDashboardRow milestone, OffsetDateTime now) {
        return "overdue".equals(milestone.status())
                || (milestone.plannedAt() != null
                && milestone.plannedAt().isBefore(now)
                && !isCompletedMilestone(milestone.status()));
    }

    private static boolean isDueSoonMilestone(ContractMilestoneDashboardRow milestone, OffsetDateTime now) {
        return milestone.plannedAt() != null
                && !milestone.plannedAt().isBefore(now)
                && milestone.plannedAt().isBefore(now.plusDays(30))
                && !isCompletedMilestone(milestone.status());
    }

    private DomainAccess access(
            Long userId,
            String moduleCode,
            String permissionCode,
            DataPermissionColumns columns) {
        if (!permissions(userId).contains(permissionCode)) {
            return DomainAccess.hidden();
        }
        DataPermissionCondition condition = dataPermissionService.buildCondition(userId, moduleCode, columns);
        return new DomainAccess(true, condition.clause(), condition.parameters());
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

    private BigDecimal sum(String sql, List<Object> params) {
        BigDecimal value = jdbcTemplate.queryForObject(sql, BigDecimal.class, params.toArray());
        return amount(value);
    }

    private FlowResult flow(String sql, List<Object> params) {
        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new FlowResult(
                amount(rs.getBigDecimal("amount")),
                rs.getLong("item_count"),
                rs.getLong("risk_count")), params.toArray());
    }

    private SummaryResult summary(String sql, List<Object> params, String levelWhenPresent) {
        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            long count = rs.getLong("item_count");
            return new SummaryResult(
                    count,
                    amount(rs.getBigDecimal("amount")),
                    count == 0 ? "none" : levelWhenPresent);
        }, params.toArray());
    }

    private static void appendOpportunityFilters(StringBuilder sql, List<Object> params, DashboardFilter filter) {
        appendEquals(sql, params, "o.owner_department_id", filter.department_id());
        appendEquals(sql, params, "o.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "o.account_id", filter.account_id());
        appendEquals(sql, params, "o.id", filter.opportunity_id());
    }

    private static void appendContractFilters(StringBuilder sql, List<Object> params, DashboardFilter filter) {
        appendEquals(sql, params, "a.owner_department_id", filter.department_id());
        appendEquals(sql, params, "c.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "c.account_id", filter.account_id());
        appendEquals(sql, params, "c.opportunity_id", filter.opportunity_id());
    }

    private static void appendInvoiceFilters(StringBuilder sql, List<Object> params, DashboardFilter filter) {
        appendEquals(sql, params, "a.owner_department_id", filter.department_id());
        appendEquals(sql, params, "i.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "i.account_id", filter.account_id());
        appendEquals(sql, params, "i.opportunity_id", filter.opportunity_id());
    }

    private static void appendReceivableFilters(StringBuilder sql, List<Object> params, DashboardFilter filter) {
        appendEquals(sql, params, "a.owner_department_id", filter.department_id());
        appendEquals(sql, params, "rp.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "rp.account_id", filter.account_id());
        appendEquals(sql, params, "rp.opportunity_id", filter.opportunity_id());
    }

    private static void appendPaymentFilters(StringBuilder sql, List<Object> params, DashboardFilter filter) {
        appendEquals(sql, params, "a.owner_department_id", filter.department_id());
        appendEquals(sql, params, "p.owner_user_id", filter.owner_id());
        appendEquals(sql, params, "p.account_id", filter.account_id());
        appendEquals(sql, params, "p.opportunity_id", filter.opportunity_id());
    }

    private static void appendReconciliationFilters(StringBuilder sql, List<Object> params, DashboardFilter filter) {
        appendEquals(sql, params, "a.owner_department_id", filter.department_id());
        appendEquals(sql, params, "r.reconciled_by", filter.owner_id());
        appendEquals(sql, params, "r.account_id", filter.account_id());
        appendEquals(sql, params, "r.opportunity_id", filter.opportunity_id());
    }

    private static void appendDateFilter(
            StringBuilder sql,
            List<Object> params,
            String column,
            LocalDate dateFrom,
            LocalDate dateTo) {
        sql.append("  and ").append(column).append(" >= ?\n");
        params.add(dateFrom);
        sql.append("  and ").append(column).append(" <= ?\n");
        params.add(dateTo);
    }

    private static void appendTimestampFilter(
            StringBuilder sql,
            List<Object> params,
            String column,
            LocalDate dateFrom,
            LocalDate dateTo) {
        sql.append("  and ").append(column).append(" >= ?\n");
        params.add(OffsetDateTime.of(dateFrom, LocalTime.MIN, DEFAULT_OFFSET));
        sql.append("  and ").append(column).append(" < ?\n");
        params.add(OffsetDateTime.of(dateTo.plusDays(1), LocalTime.MIN, DEFAULT_OFFSET));
    }

    private static void appendEquals(StringBuilder sql, List<Object> params, String column, Object value) {
        if (value == null) {
            return;
        }
        sql.append("  and ").append(column).append(" = ?\n");
        params.add(value);
    }

    private static String queryString(DashboardFilter filter) {
        List<String> parts = new ArrayList<>();
        parts.add("date_from=" + filter.date_from());
        parts.add("date_to=" + filter.date_to());
        if (filter.department_id() != null) {
            parts.add("department_id=" + filter.department_id());
        }
        if (filter.owner_id() != null) {
            parts.add("owner_id=" + filter.owner_id());
        }
        if (filter.account_id() != null) {
            parts.add("account_id=" + filter.account_id());
        }
        if (filter.opportunity_id() != null) {
            parts.add("opportunity_id=" + filter.opportunity_id());
        }
        return "?" + String.join("&", parts);
    }

    private static String funnelQueryString(DashboardFunnelFilter filter) {
        List<String> parts = new ArrayList<>();
        parts.add("date_from=" + filter.date_from());
        parts.add("date_to=" + filter.date_to());
        if (filter.department_id() != null) {
            parts.add("department_id=" + filter.department_id());
        }
        if (filter.owner_id() != null) {
            parts.add("owner_id=" + filter.owner_id());
        }
        if (filter.account_id() != null) {
            parts.add("account_id=" + filter.account_id());
        }
        if (filter.risk_status() != null) {
            parts.add("risk_status=" + filter.risk_status());
        }
        return "?" + String.join("&", parts);
    }

    private static String contractQueryString(DashboardContractFilter filter) {
        List<String> parts = new ArrayList<>();
        parts.add("date_from=" + filter.date_from());
        parts.add("date_to=" + filter.date_to());
        if (filter.department_id() != null) {
            parts.add("department_id=" + filter.department_id());
        }
        if (filter.owner_id() != null) {
            parts.add("owner_id=" + filter.owner_id());
        }
        if (filter.account_id() != null) {
            parts.add("account_id=" + filter.account_id());
        }
        if (filter.opportunity_id() != null) {
            parts.add("opportunity_id=" + filter.opportunity_id());
        }
        if (filter.contract_status() != null) {
            parts.add("contract_status=" + filter.contract_status());
        }
        if (filter.risk_level() != null) {
            parts.add("risk_level=" + filter.risk_level());
        }
        return "?" + String.join("&", parts);
    }

    private static String invoiceQueryString(DashboardInvoiceFilter filter) {
        List<String> parts = new ArrayList<>();
        parts.add("date_from=" + filter.date_from());
        parts.add("date_to=" + filter.date_to());
        if (filter.department_id() != null) {
            parts.add("department_id=" + filter.department_id());
        }
        if (filter.owner_id() != null) {
            parts.add("owner_id=" + filter.owner_id());
        }
        if (filter.account_id() != null) {
            parts.add("account_id=" + filter.account_id());
        }
        if (filter.opportunity_id() != null) {
            parts.add("opportunity_id=" + filter.opportunity_id());
        }
        if (filter.contract_id() != null) {
            parts.add("contract_id=" + filter.contract_id());
        }
        if (filter.invoice_status() != null) {
            parts.add("invoice_status=" + filter.invoice_status());
        }
        if (filter.exception_only() != null) {
            parts.add("exception_only=" + filter.exception_only());
        }
        return "?" + String.join("&", parts);
    }

    private static BigDecimal amount(BigDecimal amount) {
        return amount == null ? ZERO : amount;
    }

    private static Long nullableLong(Object value) {
        if (value == null) {
            return null;
        }
        return ((Number) value).longValue();
    }

    private record StageDefinition(String key, String label, BigDecimal defaultRate) {
    }

    private record ContractStatusDefinition(String key, String label) {
    }

    private record InvoiceStatusDefinition(String key, String label) {
    }

    private record FunnelOpportunityRow(
            Long id,
            String name,
            Long accountId,
            Long ownerUserId,
            String stage,
            String status,
            String riskStatus,
            BigDecimal amount,
            BigDecimal winRate,
            LocalDate expectedCloseDate,
            OffsetDateTime lastActivityAt,
            String closeType) {
    }

    private record ContractDashboardRow(
            Long id,
            String name,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String status,
            String riskLevel,
            BigDecimal amount,
            OffsetDateTime signedAt,
            OffsetDateTime createdAt) {
    }

    private record ContractMilestoneDashboardRow(
            Long id,
            Long contractId,
            String name,
            String status,
            OffsetDateTime plannedAt,
            OffsetDateTime actualAt) {
    }

    private record ContractChangeDashboardRow(Long id, Long contractId, OffsetDateTime changedAt) {
    }

    private record InvoiceDashboardRow(
            Long id,
            String planName,
            Long accountId,
            Long opportunityId,
            Long contractId,
            Long ownerUserId,
            String status,
            BigDecimal plannedAmount,
            BigDecimal appliedAmount,
            BigDecimal actualAmount,
            OffsetDateTime plannedInvoiceDate,
            OffsetDateTime invoiceDate,
            OffsetDateTime signedAt) {
    }

    private static final class StageAccumulator {
        private long count;
        private BigDecimal amount = ZERO;
        private BigDecimal weightedAmount = ZERO;

        void add(BigDecimal amountToAdd, BigDecimal weightedAmountToAdd) {
            count++;
            amount = amount.add(DashboardService.amount(amountToAdd));
            weightedAmount = weightedAmount.add(DashboardService.amount(weightedAmountToAdd));
        }

        long count() {
            return count;
        }

        BigDecimal amount() {
            return amount;
        }

        BigDecimal weightedAmount() {
            return weightedAmount;
        }
    }

    private static final class ContractStatusAccumulator {
        private long count;
        private BigDecimal amount = ZERO;

        void add(BigDecimal amountToAdd) {
            count++;
            amount = amount.add(DashboardService.amount(amountToAdd));
        }

        long count() {
            return count;
        }

        BigDecimal amount() {
            return amount;
        }
    }

    private static final class InvoiceStatusAccumulator {
        private long count;
        private BigDecimal plannedAmount = ZERO;
        private BigDecimal actualAmount = ZERO;

        void add(BigDecimal plannedAmountToAdd, BigDecimal actualAmountToAdd) {
            count++;
            plannedAmount = plannedAmount.add(DashboardService.amount(plannedAmountToAdd));
            actualAmount = actualAmount.add(DashboardService.amount(actualAmountToAdd));
        }

        long count() {
            return count;
        }

        BigDecimal plannedAmount() {
            return plannedAmount;
        }

        BigDecimal actualAmount() {
            return actualAmount;
        }
    }

    private static final class InvoiceGapAccumulator {
        private long count;
        private BigDecimal plannedAmount = ZERO;
        private BigDecimal invoicedAmount = ZERO;

        void add(BigDecimal plannedAmountToAdd, BigDecimal invoicedAmountToAdd) {
            count++;
            plannedAmount = plannedAmount.add(DashboardService.amount(plannedAmountToAdd));
            invoicedAmount = invoicedAmount.add(DashboardService.amount(invoicedAmountToAdd));
        }

        long count() {
            return count;
        }

        BigDecimal plannedAmount() {
            return plannedAmount;
        }

        BigDecimal invoicedAmount() {
            return invoicedAmount;
        }

        BigDecimal gapAmount() {
            return positiveGap(plannedAmount, invoicedAmount);
        }
    }

    private record DomainAccess(boolean visible, String clause, List<Object> parameters) {
        static DomainAccess hidden() {
            return new DomainAccess(false, "1 = 0", List.of());
        }
    }

    private record FlowResult(BigDecimal amount, long count, long riskCount) {
        static FlowResult empty() {
            return new FlowResult(ZERO, 0, 0);
        }
    }

    private record SummaryResult(long count, BigDecimal amount, String highestLevel) {
        static SummaryResult empty() {
            return new SummaryResult(0, ZERO, "none");
        }
    }
}
