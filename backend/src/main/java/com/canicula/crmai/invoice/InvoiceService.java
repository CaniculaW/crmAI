package com.canicula.crmai.invoice;

import com.canicula.crmai.api.BusinessRuleException;
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
public class InvoiceService {

    private final JdbcTemplate jdbcTemplate;
    private final ContractService contractService;

    InvoiceService(JdbcTemplate jdbcTemplate, ContractService contractService) {
        this.jdbcTemplate = jdbcTemplate;
        this.contractService = contractService;
    }

    @Transactional
    public InvoiceResponse create(InvoiceCreateRequest request, Long actorUserId) {
        ContractResponse contract = readableContract(request.contract_id(), actorUserId);
        requireText(request.plan_name(), "开票计划名称不能为空");
        requirePositive(request.planned_amount(), "计划开票金额必须大于0");
        requireText(request.invoice_type(), "发票类型不能为空");
        if (request.tax_rate() == null) {
            throw new BusinessRuleException("税率不能为空");
        }
        if (request.planned_invoice_date() == null) {
            throw new BusinessRuleException("计划开票日期不能为空");
        }
        if (request.owner_user_id() == null) {
            throw new BusinessRuleException("负责人不能为空");
        }
        Long invoiceId = insertInvoice(request, contract, actorUserId);
        return findById(invoiceId);
    }

    public List<InvoiceResponse> readableList(Long actorUserId, InvoiceListFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "contract_id", filter.contract_id());
        appendEqualsFilter(filters, parameters, "invoice_status", filter.invoice_status());
        appendEqualsFilter(filters, parameters, "invoice_type", filter.invoice_type());
        appendEqualsFilter(filters, parameters, "owner_user_id", filter.owner_user_id());
        appendDateRangeFilter(filters, parameters, "planned_invoice_date", ">=", filter.planned_from());
        appendDateRangeFilter(filters, parameters, "planned_invoice_date", "<=", filter.planned_to());
        appendDateRangeFilter(filters, parameters, "invoice_date", ">=", filter.invoice_date_from());
        appendDateRangeFilter(filters, parameters, "invoice_date", "<=", filter.invoice_date_to());
        if (Boolean.TRUE.equals(filter.exception_only())) {
            filters.append("  and invoice_status = 'exception'\n");
        }
        List<Long> invoiceIds = jdbcTemplate.query(
                """
                select id
                from crm_invoices
                where deleted_at is null
                  %s
                order by updated_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<InvoiceResponse> readableInvoices = new ArrayList<>();
        for (Long invoiceId : invoiceIds) {
            try {
                readableInvoices.add(readableDetail(invoiceId, actorUserId));
            } catch (IllegalArgumentException ignored) {
                // List queries hide rows outside linked contract data scope.
            }
        }
        return readableInvoices;
    }

    public InvoiceResponse readableDetail(Long invoiceId, Long actorUserId) {
        InvoiceResponse response = findById(invoiceId);
        try {
            readableContract(response.contract_id(), actorUserId);
            return response;
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("开票记录不存在或无权访问");
        }
    }

    @Transactional
    public InvoiceResponse update(Long invoiceId, InvoiceUpdateRequest request, Long actorUserId) {
        InvoiceResponse current = readableDetail(invoiceId, actorUserId);
        if (request.planned_amount() != null
                && List.of("invoiced", "signed", "voided").contains(current.invoice_status())) {
            throw new BusinessRuleException("已开票、已签收或已作废记录不能修改计划金额");
        }
        if (request.planned_amount() != null) {
            requirePositive(request.planned_amount(), "计划开票金额必须大于0");
        }
        BigDecimal effectiveAmount = request.planned_amount() == null
                ? current.planned_amount()
                : request.planned_amount();
        BigDecimal effectiveTaxRate = request.tax_rate() == null ? current.tax_rate() : request.tax_rate();
        AmountBreakdown breakdown = calculateAmount(effectiveAmount, effectiveTaxRate);
        jdbcTemplate.update(
                """
                update crm_invoices
                set plan_name = coalesce(?, plan_name),
                    planned_invoice_date = coalesce(?, planned_invoice_date),
                    planned_amount = coalesce(?, planned_amount),
                    invoice_type = coalesce(?, invoice_type),
                    tax_rate = coalesce(?, tax_rate),
                    net_amount = ?,
                    tax_amount = ?,
                    owner_user_id = coalesce(?, owner_user_id),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                normalizeText(request.plan_name()),
                request.planned_invoice_date(),
                request.planned_amount(),
                normalizeText(request.invoice_type()),
                request.tax_rate(),
                breakdown.netAmount(),
                breakdown.taxAmount(),
                request.owner_user_id(),
                normalizeText(request.remark()),
                actorUserId,
                invoiceId);
        return findById(invoiceId);
    }

    @Transactional
    public InvoiceResponse apply(Long invoiceId, InvoiceApplyRequest request, Long actorUserId) {
        InvoiceResponse current = readableDetail(invoiceId, actorUserId);
        requireStatus(current, "planned", "exception");
        requirePositive(request.applied_amount(), "申请开票金额必须大于0");
        jdbcTemplate.update(
                """
                update crm_invoices
                set invoice_status = 'applied',
                    applied_amount = ?,
                    applied_at = coalesce(?, current_timestamp),
                    applied_by = ?,
                    application_note = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.applied_amount(),
                request.applied_at(),
                actorUserId,
                normalizeText(request.application_note()),
                actorUserId,
                invoiceId);
        return findById(invoiceId);
    }

    @Transactional
    public InvoiceResponse issue(Long invoiceId, InvoiceIssueRequest request, Long actorUserId) {
        InvoiceResponse current = readableDetail(invoiceId, actorUserId);
        requireStatus(current, "applied");
        requireText(request.invoice_no(), "发票号码不能为空");
        if (request.invoice_date() == null) {
            throw new BusinessRuleException("开票日期不能为空");
        }
        if (request.tax_rate() == null) {
            throw new BusinessRuleException("税率不能为空");
        }
        requirePositive(request.actual_invoice_amount(), "实际开票金额必须大于0");
        ContractResponse contract = readableContract(current.contract_id(), actorUserId);
        validateIssueAmount(contract, invoiceId, request.actual_invoice_amount());
        AmountBreakdown breakdown = calculateAmount(request.actual_invoice_amount(), request.tax_rate());
        jdbcTemplate.update(
                """
                update crm_invoices
                set invoice_status = 'invoiced',
                    invoice_code = ?,
                    invoice_no = ?,
                    invoice_date = ?,
                    tax_rate = ?,
                    net_amount = ?,
                    tax_amount = ?,
                    actual_invoice_amount = ?,
                    exception_type = null,
                    exception_reason = null,
                    exception_resolution = null,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                normalizeText(request.invoice_code()),
                request.invoice_no().trim(),
                request.invoice_date(),
                request.tax_rate(),
                breakdown.netAmount(),
                breakdown.taxAmount(),
                request.actual_invoice_amount(),
                actorUserId,
                invoiceId);
        return findById(invoiceId);
    }

    @Transactional
    public InvoiceResponse sign(Long invoiceId, InvoiceSignRequest request, Long actorUserId) {
        InvoiceResponse current = readableDetail(invoiceId, actorUserId);
        requireStatus(current, "invoiced");
        if (!hasText(request.signed_by_name()) && !hasText(request.sign_note())) {
            throw new BusinessRuleException("签收人或签收说明至少填写一项");
        }
        jdbcTemplate.update(
                """
                update crm_invoices
                set invoice_status = 'signed',
                    signed_at = coalesce(?, current_timestamp),
                    signed_by_name = ?,
                    sign_note = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.signed_at(),
                normalizeText(request.signed_by_name()),
                normalizeText(request.sign_note()),
                actorUserId,
                invoiceId);
        return findById(invoiceId);
    }

    @Transactional
    public InvoiceResponse registerException(Long invoiceId, InvoiceExceptionRequest request, Long actorUserId) {
        InvoiceResponse current = readableDetail(invoiceId, actorUserId);
        if ("voided".equals(current.invoice_status())) {
            throw new BusinessRuleException("已作废发票不能登记异常");
        }
        requireText(request.exception_type(), "异常类型不能为空");
        requireText(request.exception_reason(), "异常原因不能为空");
        jdbcTemplate.update(
                """
                update crm_invoices
                set invoice_status = 'exception',
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
                invoiceId);
        return findById(invoiceId);
    }

    @Transactional
    public InvoiceResponse voidInvoice(Long invoiceId, InvoiceVoidRequest request, Long actorUserId) {
        InvoiceResponse current = readableDetail(invoiceId, actorUserId);
        requireStatus(current, "invoiced", "exception");
        requireText(request.void_reason(), "作废发票必须填写原因");
        jdbcTemplate.update(
                """
                update crm_invoices
                set invoice_status = 'voided',
                    void_reason = ?,
                    voided_at = current_timestamp,
                    voided_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.void_reason().trim(),
                actorUserId,
                actorUserId,
                invoiceId);
        return findById(invoiceId);
    }

    private ContractResponse readableContract(Long contractId, Long actorUserId) {
        if (contractId == null) {
            throw new BusinessRuleException("合同不能为空");
        }
        return contractService.readableDetail(contractId, actorUserId);
    }

    private Long insertInvoice(InvoiceCreateRequest request, ContractResponse contract, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        AmountBreakdown breakdown = calculateAmount(request.planned_amount(), request.tax_rate());
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_invoices (
                        account_id, opportunity_id, contract_id, plan_name, invoice_status,
                        invoice_type, planned_invoice_date, planned_amount, tax_rate,
                        net_amount, tax_amount, owner_user_id, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, contract.account_id());
            statement.setObject(2, contract.opportunity_id());
            statement.setObject(3, request.contract_id());
            statement.setString(4, request.plan_name().trim());
            statement.setString(5, request.invoice_type().trim());
            statement.setObject(6, request.planned_invoice_date());
            statement.setObject(7, request.planned_amount());
            statement.setObject(8, request.tax_rate());
            statement.setObject(9, breakdown.netAmount());
            statement.setObject(10, breakdown.taxAmount());
            statement.setObject(11, request.owner_user_id());
            statement.setString(12, normalizeText(request.remark()));
            statement.setObject(13, actorUserId);
            statement.setObject(14, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private InvoiceResponse findById(Long invoiceId) {
        try {
            InvoiceResponse base = jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_invoices
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new InvoiceResponse(
                            rs.getLong("id"),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getLong("contract_id"),
                            rs.getString("plan_name"),
                            rs.getString("invoice_status"),
                            rs.getString("invoice_type"),
                            nullableOffsetDateTime(rs.getObject("planned_invoice_date")),
                            rs.getBigDecimal("planned_amount"),
                            rs.getBigDecimal("applied_amount"),
                            nullableOffsetDateTime(rs.getObject("applied_at")),
                            nullableLong(rs.getObject("applied_by"), rs.getLong("applied_by")),
                            rs.getString("application_note"),
                            rs.getString("invoice_code"),
                            rs.getString("invoice_no"),
                            nullableOffsetDateTime(rs.getObject("invoice_date")),
                            rs.getBigDecimal("tax_rate"),
                            rs.getBigDecimal("net_amount"),
                            rs.getBigDecimal("tax_amount"),
                            rs.getBigDecimal("actual_invoice_amount"),
                            nullableOffsetDateTime(rs.getObject("signed_at")),
                            rs.getString("signed_by_name"),
                            rs.getString("sign_note"),
                            rs.getString("exception_type"),
                            rs.getString("exception_reason"),
                            rs.getString("exception_resolution"),
                            rs.getString("void_reason"),
                            nullableOffsetDateTime(rs.getObject("voided_at")),
                            nullableLong(rs.getObject("voided_by"), rs.getLong("voided_by")),
                            nullableLong(rs.getObject("owner_user_id"), rs.getLong("owner_user_id")),
                            BigDecimal.ZERO,
                            BigDecimal.ZERO,
                            BigDecimal.ZERO,
                            rs.getString("remark"),
                            nullableOffsetDateTime(rs.getObject("created_at")),
                            nullableOffsetDateTime(rs.getObject("updated_at"))),
                    invoiceId);
            return withAmountSummary(base);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("开票记录不存在或已删除");
        }
    }

    private InvoiceResponse withAmountSummary(InvoiceResponse invoice) {
        BigDecimal contractAmount = jdbcTemplate.queryForObject(
                "select contract_amount from crm_contracts where id = ?",
                BigDecimal.class,
                invoice.contract_id());
        BigDecimal effectiveInvoicedAmount = effectiveInvoicedAmount(invoice.contract_id(), null);
        BigDecimal remainingAmount = nullToZero(contractAmount).subtract(effectiveInvoicedAmount);
        return new InvoiceResponse(
                invoice.id(),
                invoice.account_id(),
                invoice.opportunity_id(),
                invoice.contract_id(),
                invoice.plan_name(),
                invoice.invoice_status(),
                invoice.invoice_type(),
                invoice.planned_invoice_date(),
                invoice.planned_amount(),
                invoice.applied_amount(),
                invoice.applied_at(),
                invoice.applied_by(),
                invoice.application_note(),
                invoice.invoice_code(),
                invoice.invoice_no(),
                invoice.invoice_date(),
                invoice.tax_rate(),
                invoice.net_amount(),
                invoice.tax_amount(),
                invoice.actual_invoice_amount(),
                invoice.signed_at(),
                invoice.signed_by_name(),
                invoice.sign_note(),
                invoice.exception_type(),
                invoice.exception_reason(),
                invoice.exception_resolution(),
                invoice.void_reason(),
                invoice.voided_at(),
                invoice.voided_by(),
                invoice.owner_user_id(),
                contractAmount,
                effectiveInvoicedAmount,
                remainingAmount,
                invoice.remark(),
                invoice.created_at(),
                invoice.updated_at());
    }

    private void validateIssueAmount(ContractResponse contract, Long invoiceId, BigDecimal actualInvoiceAmount) {
        BigDecimal effectiveTotal = effectiveInvoicedAmount(contract.id(), invoiceId).add(actualInvoiceAmount);
        if (effectiveTotal.compareTo(contract.contract_amount()) > 0) {
            throw new BusinessRuleException("累计有效开票金额不能超过合同金额");
        }
    }

    private BigDecimal effectiveInvoicedAmount(Long contractId, Long currentInvoiceId) {
        BigDecimal total = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(actual_invoice_amount), 0)
                from crm_invoices
                where contract_id = ?
                  and id <> ?
                  and deleted_at is null
                  and invoice_status in ('invoiced', 'signed')
                """,
                BigDecimal.class,
                contractId,
                currentInvoiceId == null ? -1L : currentInvoiceId);
        return nullToZero(total);
    }

    private static AmountBreakdown calculateAmount(BigDecimal amount, BigDecimal taxRate) {
        if (amount == null) {
            return new AmountBreakdown(null, null);
        }
        if (taxRate == null) {
            return new AmountBreakdown(amount, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }
        BigDecimal netAmount = amount.divide(BigDecimal.ONE.add(taxRate), 2, RoundingMode.HALF_UP);
        return new AmountBreakdown(netAmount, amount.subtract(netAmount).setScale(2, RoundingMode.HALF_UP));
    }

    private static void requireStatus(InvoiceResponse current, String... allowedStatuses) {
        for (String allowedStatus : allowedStatuses) {
            if (allowedStatus.equals(current.invoice_status())) {
                return;
            }
        }
        throw new BusinessRuleException("当前开票状态不允许执行该操作");
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
                      or lower(invoice_no) like ?
                      or lower(invoice_code) like ?
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

    private record AmountBreakdown(BigDecimal netAmount, BigDecimal taxAmount) {
    }
}
