package com.canicula.crmai.receivable;

import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.contract.ContractResponse;
import com.canicula.crmai.contract.ContractService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReceivablePlanService {

    private final JdbcTemplate jdbcTemplate;
    private final ContractService contractService;

    ReceivablePlanService(JdbcTemplate jdbcTemplate, ContractService contractService) {
        this.jdbcTemplate = jdbcTemplate;
        this.contractService = contractService;
    }

    @Transactional
    public ReceivablePlanResponse create(ReceivablePlanCreateRequest request, Long actorUserId) {
        ContractResponse contract = readableContract(request.contract_id(), actorUserId);
        requireText(request.plan_name(), "回款计划名称不能为空");
        requirePositive(request.planned_amount(), "计划回款金额必须大于0");
        if (request.planned_receivable_date() == null) {
            throw new BusinessRuleException("计划回款日期不能为空");
        }
        if (request.owner_user_id() == null) {
            throw new BusinessRuleException("负责人不能为空");
        }
        Long planId = insertPlan(request, contract, actorUserId);
        return findById(planId);
    }

    public List<ReceivablePlanResponse> readableList(Long actorUserId, ReceivablePlanListFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "contract_id", filter.contract_id());
        appendEqualsFilter(filters, parameters, "receivable_status", filter.receivable_status());
        appendEqualsFilter(filters, parameters, "plan_stage", filter.plan_stage());
        appendEqualsFilter(filters, parameters, "owner_user_id", filter.owner_user_id());
        appendDateRangeFilter(filters, parameters, "planned_receivable_date", ">=", filter.planned_from());
        appendDateRangeFilter(filters, parameters, "planned_receivable_date", "<=", filter.planned_to());
        if (Boolean.TRUE.equals(filter.overdue_only())) {
            filters.append("  and receivable_status not in ('received', 'terminated')\n");
            filters.append("  and planned_receivable_date < current_timestamp\n");
        }
        List<Long> planIds = jdbcTemplate.query(
                """
                select id
                from crm_receivable_plans
                where deleted_at is null
                  %s
                order by updated_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<ReceivablePlanResponse> readablePlans = new ArrayList<>();
        for (Long planId : planIds) {
            try {
                readablePlans.add(readableDetail(planId, actorUserId));
            } catch (IllegalArgumentException ignored) {
                // List queries hide rows outside linked contract data scope.
            }
        }
        return readablePlans;
    }

    public ReceivablePlanResponse readableDetail(Long planId, Long actorUserId) {
        ReceivablePlanResponse response = findById(planId);
        try {
            readableContract(response.contract_id(), actorUserId);
            return response;
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("回款计划不存在或无权访问");
        }
    }

    @Transactional
    public ReceivablePlanResponse update(Long planId, ReceivablePlanUpdateRequest request, Long actorUserId) {
        ReceivablePlanResponse current = readableDetail(planId, actorUserId);
        if ("terminated".equals(current.receivable_status())) {
            throw new BusinessRuleException("已终止回款计划不能修改");
        }
        if (request.planned_amount() != null) {
            requirePositive(request.planned_amount(), "计划回款金额必须大于0");
        }
        jdbcTemplate.update(
                """
                update crm_receivable_plans
                set plan_name = coalesce(?, plan_name),
                    plan_stage = coalesce(?, plan_stage),
                    planned_receivable_date = coalesce(?, planned_receivable_date),
                    planned_amount = coalesce(?, planned_amount),
                    owner_user_id = coalesce(?, owner_user_id),
                    overdue_reason = coalesce(?, overdue_reason),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                normalizeText(request.plan_name()),
                normalizeText(request.plan_stage()),
                request.planned_receivable_date(),
                request.planned_amount(),
                request.owner_user_id(),
                normalizeText(request.overdue_reason()),
                normalizeText(request.remark()),
                actorUserId,
                planId);
        return findById(planId);
    }

    @Transactional
    public ReceivablePlanResponse terminate(
            Long planId,
            ReceivablePlanTerminateRequest request,
            Long actorUserId) {
        ReceivablePlanResponse current = readableDetail(planId, actorUserId);
        if ("terminated".equals(current.receivable_status())) {
            throw new BusinessRuleException("回款计划已终止");
        }
        requireText(request.termination_reason(), "终止回款计划必须填写原因");
        jdbcTemplate.update(
                """
                update crm_receivable_plans
                set receivable_status = 'terminated',
                    termination_reason = ?,
                    terminated_at = current_timestamp,
                    terminated_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.termination_reason().trim(),
                actorUserId,
                actorUserId,
                planId);
        return findById(planId);
    }

    public List<ReceivableFollowUpResponse> readableFollowUps(Long planId, Long actorUserId) {
        readableDetail(planId, actorUserId);
        return jdbcTemplate.query(
                """
                select *
                from crm_receivable_follow_ups
                where receivable_plan_id = ?
                  and deleted_at is null
                order by follow_up_at desc, id desc
                """,
                (rs, rowNum) -> new ReceivableFollowUpResponse(
                        rs.getLong("id"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                        rs.getLong("contract_id"),
                        rs.getLong("receivable_plan_id"),
                        nullableOffsetDateTime(rs.getObject("follow_up_at")),
                        nullableLong(rs.getObject("follow_up_by"), rs.getLong("follow_up_by")),
                        rs.getString("follow_up_content"),
                        rs.getString("customer_feedback"),
                        rs.getString("next_action"),
                        nullableOffsetDateTime(rs.getObject("next_follow_up_at")),
                        rs.getString("remark"),
                        nullableOffsetDateTime(rs.getObject("created_at")),
                        nullableOffsetDateTime(rs.getObject("updated_at"))),
                planId);
    }

    @Transactional
    public ReceivableFollowUpResponse createFollowUp(
            Long planId,
            ReceivableFollowUpRequest request,
            Long actorUserId) {
        ReceivablePlanResponse plan = readableDetail(planId, actorUserId);
        requireText(request.follow_up_content(), "跟进内容不能为空");
        Long followUpId = insertFollowUp(plan, request, actorUserId);
        return findFollowUpById(followUpId);
    }

    private Long insertPlan(
            ReceivablePlanCreateRequest request,
            ContractResponse contract,
            Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_receivable_plans (
                        account_id, opportunity_id, contract_id, plan_name, plan_stage,
                        receivable_status, planned_receivable_date, planned_amount,
                        owner_user_id, payment_terms_snapshot, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, contract.account_id());
            statement.setObject(2, contract.opportunity_id());
            statement.setObject(3, contract.id());
            statement.setString(4, request.plan_name().trim());
            statement.setString(5, normalizeText(request.plan_stage()));
            statement.setObject(6, request.planned_receivable_date());
            statement.setObject(7, request.planned_amount());
            statement.setObject(8, request.owner_user_id());
            statement.setString(9, normalizeText(request.payment_terms_snapshot()));
            statement.setString(10, normalizeText(request.remark()));
            statement.setObject(11, actorUserId);
            statement.setObject(12, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private Long insertFollowUp(
            ReceivablePlanResponse plan,
            ReceivableFollowUpRequest request,
            Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_receivable_follow_ups (
                        account_id, opportunity_id, contract_id, receivable_plan_id,
                        follow_up_at, follow_up_by, follow_up_content, customer_feedback,
                        next_action, next_follow_up_at, remark
                    )
                    values (?, ?, ?, ?, coalesce(?, current_timestamp), ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, plan.account_id());
            statement.setObject(2, plan.opportunity_id());
            statement.setObject(3, plan.contract_id());
            statement.setObject(4, plan.id());
            statement.setObject(5, request.follow_up_at());
            statement.setObject(6, actorUserId);
            statement.setString(7, request.follow_up_content().trim());
            statement.setString(8, normalizeText(request.customer_feedback()));
            statement.setString(9, normalizeText(request.next_action()));
            statement.setObject(10, request.next_follow_up_at());
            statement.setString(11, normalizeText(request.remark()));
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private ReceivablePlanResponse findById(Long planId) {
        try {
            ReceivablePlanResponse base = jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_receivable_plans
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new ReceivablePlanResponse(
                            rs.getLong("id"),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getLong("contract_id"),
                            rs.getString("plan_name"),
                            rs.getString("plan_stage"),
                            rs.getString("receivable_status"),
                            nullableOffsetDateTime(rs.getObject("planned_receivable_date")),
                            rs.getBigDecimal("planned_amount"),
                            nullableLong(rs.getObject("owner_user_id"), rs.getLong("owner_user_id")),
                            rs.getString("payment_terms_snapshot"),
                            rs.getString("overdue_reason"),
                            rs.getString("termination_reason"),
                            nullableOffsetDateTime(rs.getObject("terminated_at")),
                            nullableLong(rs.getObject("terminated_by"), rs.getLong("terminated_by")),
                            BigDecimal.ZERO,
                            BigDecimal.ZERO,
                            BigDecimal.ZERO,
                            BigDecimal.ZERO,
                            BigDecimal.ZERO,
                            0,
                            rs.getString("remark"),
                            nullableOffsetDateTime(rs.getObject("created_at")),
                            nullableOffsetDateTime(rs.getObject("updated_at"))),
                    planId);
            return withAmountSummary(base);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("回款计划不存在或已删除");
        }
    }

    private ReceivableFollowUpResponse findFollowUpById(Long followUpId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_receivable_follow_ups
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new ReceivableFollowUpResponse(
                            rs.getLong("id"),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getLong("contract_id"),
                            rs.getLong("receivable_plan_id"),
                            nullableOffsetDateTime(rs.getObject("follow_up_at")),
                            nullableLong(rs.getObject("follow_up_by"), rs.getLong("follow_up_by")),
                            rs.getString("follow_up_content"),
                            rs.getString("customer_feedback"),
                            rs.getString("next_action"),
                            nullableOffsetDateTime(rs.getObject("next_follow_up_at")),
                            rs.getString("remark"),
                            nullableOffsetDateTime(rs.getObject("created_at")),
                            nullableOffsetDateTime(rs.getObject("updated_at"))),
                    followUpId);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("回款跟进不存在或已删除");
        }
    }

    private ReceivablePlanResponse withAmountSummary(ReceivablePlanResponse plan) {
        BigDecimal contractAmount = jdbcTemplate.queryForObject(
                "select contract_amount from crm_contracts where id = ?",
                BigDecimal.class,
                plan.contract_id());
        BigDecimal effectiveInvoicedAmount = effectiveInvoicedAmount(plan.contract_id());
        BigDecimal confirmedReceivedAmount = confirmedReceivedAmount(plan.id());
        BigDecimal unreceivedAmount = nullToZero(plan.planned_amount()).subtract(confirmedReceivedAmount);
        if (unreceivedAmount.compareTo(BigDecimal.ZERO) < 0) {
            unreceivedAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal unreconciledPaymentAmount = unreconciledPaymentAmount(plan.contract_id());
        return new ReceivablePlanResponse(
                plan.id(),
                plan.account_id(),
                plan.opportunity_id(),
                plan.contract_id(),
                plan.plan_name(),
                plan.plan_stage(),
                plan.receivable_status(),
                plan.planned_receivable_date(),
                plan.planned_amount(),
                plan.owner_user_id(),
                plan.payment_terms_snapshot(),
                plan.overdue_reason(),
                plan.termination_reason(),
                plan.terminated_at(),
                plan.terminated_by(),
                contractAmount,
                effectiveInvoicedAmount,
                confirmedReceivedAmount,
                unreceivedAmount,
                unreconciledPaymentAmount,
                overdueDays(plan),
                plan.remark(),
                plan.created_at(),
                plan.updated_at());
    }

    private ContractResponse readableContract(Long contractId, Long actorUserId) {
        if (contractId == null) {
            throw new BusinessRuleException("合同不能为空");
        }
        return contractService.readableDetail(contractId, actorUserId);
    }

    private BigDecimal effectiveInvoicedAmount(Long contractId) {
        BigDecimal total = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(actual_invoice_amount), 0)
                from crm_invoices
                where contract_id = ?
                  and deleted_at is null
                  and invoice_status in ('invoiced', 'signed')
                """,
                BigDecimal.class,
                contractId);
        return nullToZero(total);
    }

    private BigDecimal confirmedReceivedAmount(Long planId) {
        BigDecimal total = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(confirmed_amount), 0)
                from crm_payments
                where receivable_plan_id = ?
                  and deleted_at is null
                  and payment_status in ('confirmed', 'partially_reconciled', 'reconciled')
                """,
                BigDecimal.class,
                planId);
        return nullToZero(total);
    }

    private BigDecimal unreconciledPaymentAmount(Long contractId) {
        BigDecimal total = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(confirmed_amount - reconciled_amount), 0)
                from crm_payments
                where contract_id = ?
                  and deleted_at is null
                  and payment_status in ('confirmed', 'partially_reconciled', 'reconciled')
                """,
                BigDecimal.class,
                contractId);
        return nullToZero(total);
    }

    private static Integer overdueDays(ReceivablePlanResponse plan) {
        if (plan.planned_receivable_date() == null
                || List.of("received", "terminated").contains(plan.receivable_status())) {
            return 0;
        }
        LocalDate plannedDate = plan.planned_receivable_date().toLocalDate();
        LocalDate today = LocalDate.now();
        if (!plannedDate.isBefore(today)) {
            return 0;
        }
        return (int) java.time.temporal.ChronoUnit.DAYS.between(plannedDate, today);
    }

    private static void requirePositive(BigDecimal amount, String message) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException(message);
        }
    }

    private static void requireText(String value, String message) {
        if (!hasText(value)) {
            throw new BusinessRuleException(message);
        }
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append(
                """
                  and (
                      lower(plan_name) like ?
                      or lower(plan_stage) like ?
                      or lower(payment_terms_snapshot) like ?
                  )
                """);
        String keywordPattern = "%" + keyword.trim().toLowerCase() + "%";
        parameters.add(keywordPattern);
        parameters.add(keywordPattern);
        parameters.add(keywordPattern);
    }

    private static void appendEqualsFilter(
            StringBuilder sql,
            List<Object> parameters,
            String column,
            Object value) {
        if (value instanceof String textValue && !hasText(textValue)) {
            return;
        }
        if (value == null) {
            return;
        }
        sql.append("  and ").append(column).append(" = ?\n");
        parameters.add(value instanceof String textValue ? textValue.trim() : value);
    }

    private static void appendDateRangeFilter(
            StringBuilder sql,
            List<Object> parameters,
            String column,
            String operator,
            OffsetDateTime value) {
        if (value == null) {
            return;
        }
        sql.append("  and ").append(column).append(" ").append(operator).append(" ?\n");
        parameters.add(value);
    }

    private static OffsetDateTime nullableOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant().atOffset(OffsetDateTime.now().getOffset());
        }
        return null;
    }

    private static Long nullableLong(Object value, long longValue) {
        return value == null ? null : longValue;
    }

    private static BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : value;
    }

    private static String normalizeText(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
