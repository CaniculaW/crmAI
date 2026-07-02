package com.canicula.crmai.payment;

import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.contract.ContractResponse;
import com.canicula.crmai.contract.ContractService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
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
public class PaymentService {

    private static final List<String> EFFECTIVE_CONFIRMED_STATUSES =
            List.of("confirmed", "partially_reconciled", "reconciled");

    private final JdbcTemplate jdbcTemplate;
    private final ContractService contractService;

    PaymentService(JdbcTemplate jdbcTemplate, ContractService contractService) {
        this.jdbcTemplate = jdbcTemplate;
        this.contractService = contractService;
    }

    @Transactional
    public PaymentResponse create(PaymentCreateRequest request, Long actorUserId) {
        ContractResponse contract = readableContract(request.contract_id(), actorUserId);
        validatePlanBelongsToContract(request.receivable_plan_id(), contract.id());
        requireText(request.payment_name(), "到账名称不能为空");
        requireText(request.payment_method(), "到账方式不能为空");
        requirePositive(request.received_amount(), "到账金额必须大于0");
        if (request.received_at() == null) {
            throw new BusinessRuleException("到账时间不能为空");
        }
        if (request.owner_user_id() == null) {
            throw new BusinessRuleException("负责人不能为空");
        }
        Long paymentId = insertPayment(request, contract, actorUserId);
        return findById(paymentId);
    }

    public List<PaymentResponse> readableList(Long actorUserId, PaymentListFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "contract_id", filter.contract_id());
        appendEqualsFilter(filters, parameters, "receivable_plan_id", filter.receivable_plan_id());
        appendEqualsFilter(filters, parameters, "payment_status", filter.payment_status());
        appendEqualsFilter(filters, parameters, "payment_method", filter.payment_method());
        appendEqualsFilter(filters, parameters, "owner_user_id", filter.owner_user_id());
        appendDateRangeFilter(filters, parameters, "received_at", ">=", filter.received_from());
        appendDateRangeFilter(filters, parameters, "received_at", "<=", filter.received_to());
        if (Boolean.TRUE.equals(filter.exception_only())) {
            filters.append("  and payment_status = 'exception'\n");
        }
        List<Long> paymentIds = jdbcTemplate.query(
                """
                select id
                from crm_payments
                where deleted_at is null
                  %s
                order by updated_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<PaymentResponse> readablePayments = new ArrayList<>();
        for (Long paymentId : paymentIds) {
            try {
                readablePayments.add(readableDetail(paymentId, actorUserId));
            } catch (IllegalArgumentException | ForbiddenException ignored) {
                // List queries hide rows outside linked contract data scope.
            }
        }
        return readablePayments;
    }

    public PaymentResponse readableDetail(Long paymentId, Long actorUserId) {
        PaymentResponse response = findById(paymentId);
        try {
            readableContract(response.contract_id(), actorUserId);
            return response;
        } catch (IllegalArgumentException exception) {
            throw new ForbiddenException("到账流水不存在或无权访问");
        }
    }

    @Transactional
    public PaymentResponse update(Long paymentId, PaymentUpdateRequest request, Long actorUserId) {
        PaymentResponse current = readableDetail(paymentId, actorUserId);
        if (!List.of("registered", "exception").contains(current.payment_status())) {
            throw new BusinessRuleException("仅登记或异常状态的到账流水可编辑");
        }
        validatePlanBelongsToContract(request.receivable_plan_id(), current.contract_id());
        if (request.received_amount() != null) {
            requirePositive(request.received_amount(), "到账金额必须大于0");
        }
        jdbcTemplate.update(
                """
                update crm_payments
                set receivable_plan_id = coalesce(?, receivable_plan_id),
                    payment_name = coalesce(?, payment_name),
                    received_at = coalesce(?, received_at),
                    received_amount = coalesce(?, received_amount),
                    payment_method = coalesce(?, payment_method),
                    payer_name = coalesce(?, payer_name),
                    receiving_account = coalesce(?, receiving_account),
                    bank_flow_no = coalesce(?, bank_flow_no),
                    owner_user_id = coalesce(?, owner_user_id),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.receivable_plan_id(),
                normalizeText(request.payment_name()),
                request.received_at(),
                request.received_amount(),
                normalizeText(request.payment_method()),
                normalizeText(request.payer_name()),
                normalizeText(request.receiving_account()),
                normalizeText(request.bank_flow_no()),
                request.owner_user_id(),
                normalizeText(request.remark()),
                actorUserId,
                paymentId);
        return findById(paymentId);
    }

    @Transactional
    public PaymentResponse confirm(Long paymentId, PaymentConfirmRequest request, Long actorUserId) {
        PaymentResponse current = readableDetail(paymentId, actorUserId);
        if (!List.of("registered", "exception").contains(current.payment_status())) {
            throw new BusinessRuleException("当前到账状态不允许确认");
        }
        requirePositive(request.confirmed_amount(), "确认到账金额必须大于0");
        if (request.confirmed_amount().compareTo(current.received_amount()) > 0) {
            throw new BusinessRuleException("确认到账金额不能超过到账金额");
        }
        jdbcTemplate.update(
                """
                update crm_payments
                set payment_status = 'confirmed',
                    confirmed_amount = ?,
                    confirmed_at = coalesce(?, current_timestamp),
                    confirmed_by = ?,
                    exception_type = null,
                    exception_reason = null,
                    exception_resolution = null,
                    refund_reason = null,
                    refunded_at = null,
                    refunded_by = null,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.confirmed_amount(),
                request.confirmed_at(),
                actorUserId,
                actorUserId,
                paymentId);
        return findById(paymentId);
    }

    @Transactional
    public PaymentResponse registerException(
            Long paymentId,
            PaymentExceptionRequest request,
            Long actorUserId) {
        PaymentResponse current = readableDetail(paymentId, actorUserId);
        if ("refunded".equals(current.payment_status())) {
            throw new BusinessRuleException("已退款流水不能登记异常");
        }
        requireText(request.exception_type(), "异常类型不能为空");
        requireText(request.exception_reason(), "异常原因不能为空");
        jdbcTemplate.update(
                """
                update crm_payments
                set payment_status = 'exception',
                    exception_type = ?,
                    exception_reason = ?,
                    exception_resolution = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.exception_type().trim(),
                request.exception_reason().trim(),
                normalizeText(request.exception_resolution()),
                actorUserId,
                paymentId);
        return findById(paymentId);
    }

    @Transactional
    public PaymentResponse refund(Long paymentId, PaymentRefundRequest request, Long actorUserId) {
        PaymentResponse current = readableDetail(paymentId, actorUserId);
        if (!List.of("confirmed", "exception").contains(current.payment_status())) {
            throw new BusinessRuleException("仅已确认或异常到账流水可退款");
        }
        requireText(request.refund_reason(), "退款必须填写原因");
        jdbcTemplate.update(
                """
                update crm_payments
                set payment_status = 'refunded',
                    confirmed_amount = 0,
                    reconciled_amount = 0,
                    refund_reason = ?,
                    refunded_at = current_timestamp,
                    refunded_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.refund_reason().trim(),
                actorUserId,
                actorUserId,
                paymentId);
        return findById(paymentId);
    }

    private Long insertPayment(PaymentCreateRequest request, ContractResponse contract, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_payments (
                        account_id, opportunity_id, contract_id, receivable_plan_id,
                        payment_name, payment_status, received_at, received_amount,
                        payment_method, payer_name, receiving_account, bank_flow_no,
                        owner_user_id, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, 'registered', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, contract.account_id());
            statement.setObject(2, contract.opportunity_id());
            statement.setObject(3, contract.id());
            statement.setObject(4, request.receivable_plan_id());
            statement.setString(5, request.payment_name().trim());
            statement.setObject(6, request.received_at());
            statement.setObject(7, request.received_amount());
            statement.setString(8, request.payment_method().trim());
            statement.setString(9, normalizeText(request.payer_name()));
            statement.setString(10, normalizeText(request.receiving_account()));
            statement.setString(11, normalizeText(request.bank_flow_no()));
            statement.setObject(12, request.owner_user_id());
            statement.setString(13, normalizeText(request.remark()));
            statement.setObject(14, actorUserId);
            statement.setObject(15, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private PaymentResponse findById(Long paymentId) {
        try {
            PaymentResponse base = jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_payments
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new PaymentResponse(
                            rs.getLong("id"),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getLong("contract_id"),
                            nullableLong(rs.getObject("receivable_plan_id"), rs.getLong("receivable_plan_id")),
                            rs.getString("payment_name"),
                            rs.getString("payment_status"),
                            nullableOffsetDateTime(rs.getObject("received_at")),
                            rs.getBigDecimal("received_amount"),
                            rs.getBigDecimal("confirmed_amount"),
                            nullableOffsetDateTime(rs.getObject("confirmed_at")),
                            nullableLong(rs.getObject("confirmed_by"), rs.getLong("confirmed_by")),
                            rs.getString("payment_method"),
                            rs.getString("payer_name"),
                            rs.getString("receiving_account"),
                            rs.getString("bank_flow_no"),
                            rs.getBigDecimal("reconciled_amount"),
                            BigDecimal.ZERO,
                            rs.getString("exception_type"),
                            rs.getString("exception_reason"),
                            rs.getString("exception_resolution"),
                            rs.getString("refund_reason"),
                            nullableOffsetDateTime(rs.getObject("refunded_at")),
                            nullableLong(rs.getObject("refunded_by"), rs.getLong("refunded_by")),
                            nullableLong(rs.getObject("owner_user_id"), rs.getLong("owner_user_id")),
                            rs.getString("remark"),
                            nullableOffsetDateTime(rs.getObject("created_at")),
                            nullableOffsetDateTime(rs.getObject("updated_at"))),
                    paymentId);
            return withAmountSummary(base);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("到账流水不存在或已删除");
        }
    }

    private PaymentResponse withAmountSummary(PaymentResponse payment) {
        BigDecimal unreconciledAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (EFFECTIVE_CONFIRMED_STATUSES.contains(payment.payment_status())) {
            unreconciledAmount = nullToZero(payment.confirmed_amount()).subtract(nullToZero(payment.reconciled_amount()));
            if (unreconciledAmount.compareTo(BigDecimal.ZERO) < 0) {
                unreconciledAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }
        }
        return new PaymentResponse(
                payment.id(),
                payment.account_id(),
                payment.opportunity_id(),
                payment.contract_id(),
                payment.receivable_plan_id(),
                payment.payment_name(),
                payment.payment_status(),
                payment.received_at(),
                payment.received_amount(),
                payment.confirmed_amount(),
                payment.confirmed_at(),
                payment.confirmed_by(),
                payment.payment_method(),
                payment.payer_name(),
                payment.receiving_account(),
                payment.bank_flow_no(),
                payment.reconciled_amount(),
                unreconciledAmount,
                payment.exception_type(),
                payment.exception_reason(),
                payment.exception_resolution(),
                payment.refund_reason(),
                payment.refunded_at(),
                payment.refunded_by(),
                payment.owner_user_id(),
                payment.remark(),
                payment.created_at(),
                payment.updated_at());
    }

    private ContractResponse readableContract(Long contractId, Long actorUserId) {
        if (contractId == null) {
            throw new BusinessRuleException("合同不能为空");
        }
        return contractService.readableDetail(contractId, actorUserId);
    }

    private void validatePlanBelongsToContract(Long planId, Long contractId) {
        if (planId == null) {
            return;
        }
        try {
            Long planContractId = jdbcTemplate.queryForObject(
                    """
                    select contract_id
                    from crm_receivable_plans
                    where id = ?
                      and deleted_at is null
                    """,
                    Long.class,
                    planId);
            if (!Objects.equals(planContractId, contractId)) {
                throw new BusinessRuleException("到账流水必须关联同一合同下的回款计划");
            }
        } catch (EmptyResultDataAccessException exception) {
            throw new BusinessRuleException("回款计划不存在或已删除");
        }
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
                      lower(payment_name) like ?
                      or lower(payer_name) like ?
                      or lower(bank_flow_no) like ?
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
