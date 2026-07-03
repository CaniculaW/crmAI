package com.canicula.crmai.dashboard;

import com.canicula.crmai.identity.DataPermissionColumns;
import com.canicula.crmai.identity.DataPermissionCondition;
import com.canicula.crmai.identity.DataPermissionService;
import java.math.BigDecimal;
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

    private static BigDecimal amount(BigDecimal amount) {
        return amount == null ? ZERO : amount;
    }

    private static Long nullableLong(Object value) {
        if (value == null) {
            return null;
        }
        return ((Number) value).longValue();
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
